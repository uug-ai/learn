---
title: "Check indexes"
description: ""
lead: ""
date: 2020-10-06T08:49:15+00:00
lastmod: 2020-10-06T08:49:15+00:00
draft: false
images: []
weight: 3

---

### Overview

Checks a destination MongoDB database for missing indexes against a recommended index set, reports differences, and optionally creates missing indexes.

```sh
kubectl apply -f jobs/check-indexes.yaml
```

### Prerequisites

- A reachable MongoDB instance with appropriate credentials.
- An index source file exported from a reference database (see below).

### Usage

Run in dry-run mode to preview changes:

```sh
go run main.go -action check-indexes \
  -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
  -mongodb-destination-database Kerberos \
  -collections "" \
  -index-version hub-08-12-2025 \
  -mode dry-run
```

Apply missing indexes in live mode:

```sh
go run main.go -action check-indexes \
  -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
  -mongodb-destination-database Kerberos \
  -collections organisation,cache,counting \
  -index-version hub-08-12-2025 \
  -mode live
```

### Arguments

- `-mongodb-uri`: MongoDB connection URI with credentials (required).
- `-mongodb-destination-database`: Destination database name to check (required).
- `-collections`: Comma-separated list of collections to include. Defaults to all when omitted.
- `-mode`: One of `dry-run` (no changes, report only) or `live` (create missing indexes).
- `-index-version`: Version key used to resolve the index source file containing the recommended indexes.

### Index Source File

You can find available index versions in the [indexes directory on GitHub](https://github.com/uug-ai/cli/tree/main/indexes). The source file should be a plain text dump of collection names followed by their index definitions from the reference database. To generate it, use the MongoDB shell:

```
use("Kerberos");

db.getCollectionNames().forEach(function(collectionName) {
  print(collectionName);
  printjson(db.getCollection(collectionName).getIndexes());
});
```

Example excerpt:

```
organisation
[ { v: 2, key: { _id: 1 }, name: '_id_' } ]
cache
[
  { v: 2, key: { _id: 1 }, name: '_id_' },
  { v: 2, key: { key: 1, expiry: 1 }, name: 'key_1_expiry_1' },
  { v: 2, key: { key: 1 }, name: 'key_1' }
]
counting
[
  { v: 2, key: { _id: 1 }, name: '_id_' },
  { v: 2, key: { user_id: 1, timestamp: 1 }, name: 'user_id_1_timestamp_1' },
  { v: 2, key: { timestamp: 1 }, name: 'timestamp_1' }
]
```

### How It Works

- Parses the index source file into a map of collections → index definitions.
- Fetches current indexes from the destination database.
- Compares by index `key` and `name` to find missing indexes.
- In `dry-run`, prints a report; in `live`, creates missing indexes where permitted.

### Output

- Missing indexes listed per collection.
- Status codes per operation (created, existing, skipped on error).
- Summary totals at the end in both modes.

### Notes

- Creating indexes may lock or impact performance; prefer running `live` during low traffic windows.
- Ensure roles permit `createIndex` on target collections.
- If `-collections` is omitted, all collections present in the source file are considered.
