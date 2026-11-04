---
podcast: cli-check-indexes
title: "Check indexes"
description: "Check versioned MongoDB index contracts and create missing indexes with the CLI."
lead: ""
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-11-04T00:00:00+00:00
draft: false
images: []
weight: 3

---

## Overview

Checks a destination MongoDB database for missing indexes against a recommended index set, reports differences, and optionally creates missing indexes.

For a complete dry-run, apply and verification walkthrough, including Secret-backed Kubernetes Jobs, see [Apply MongoDB indexes with the CLI](/tutorials/hub/apply-mongodb-indexes/).

## Prerequisites

- A reachable MongoDB instance with appropriate credentials.
- A versioned index specification included in the CLI checkout or image, or a reviewed reference export using supported options (see below).

## Kubernetes

Run the checker as a Kubernetes Job using the provided template. The image accepts the same command-line flags. To supply credentials from a Secret, map the Secret to an environment variable and explicitly reference it in the container arguments; see the [Kubernetes walkthrough](/tutorials/hub/apply-mongodb-indexes/#run-the-same-workflow-in-kubernetes).

You can find the .yaml template for this job in [`jobs/check-indexes.yaml`](https://github.com/uug-ai/cli/blob/main/jobs/check-indexes.yaml) on GitHub.

```sh
kubectl apply -f jobs/check-indexes.yaml
```

## Usage

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

Keep the URI, database, collections and version identical to the reviewed dry run; change only `-mode`.

```sh
go run main.go -action check-indexes \
  -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
  -mongodb-destination-database Kerberos \
  -collections "" \
  -index-version hub-08-12-2025 \
  -mode live
```

## Arguments

- `-mongodb-uri`: MongoDB connection URI. Prompts when omitted; an empty response defaults to `mongodb://localhost:27017`.
- `-mongodb-destination-database`: Destination database name. Prompts when omitted; an empty response defaults to `Kerberos`.
- `-collections`: Comma-separated list of collections to include. Pass `""` explicitly to select all collections in the specification; omitting the flag prompts for input.
- `-mode`: One of `dry-run` (no changes, report only) or `live` (create missing indexes without confirmation). Prompts when omitted, with `dry-run` as the prompt default.
- `-index-version`: Filename stem resolved as `indexes/<version>.txt` relative to the working directory. Do not include the directory or extension. If omitted or empty, currently defaults to `hub-08-12-2025`, not the latest available file.

Supply every flag explicitly for a non-interactive Job.

## Index Source File

You can find available index versions in the [indexes directory on GitHub](https://github.com/uug-ai/cli/tree/main/indexes). Select the baseline and any feature-specific contracts required by your application release, and confirm they exist in the CLI version you run.

The source file is a plain text dump of collection names followed by their index definitions from the reference database. To generate a reference export, use the MongoDB shell:

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

The checker supports ordered keys, `unique` and `partialFilterExpression`. Other exported options, including `sparse`, TTL (`expireAfterSeconds`) and `collation`, are not compared or applied. Do not treat an arbitrary export as a fully supported schema: have indexes requiring those options installed and verified separately through an approved MongoDB procedure.

## How It Works

- Parses the index source file into a map of collections → index definitions.
- Fetches current indexes from the destination database.
- Compares ordered index keys, uniqueness and partial filter expressions to find missing indexes. Names do not need to match for an equivalent definition to count as present.
- In `dry-run`, prints a report; in `live`, creates missing indexes where permitted.
- Leaves extra or conflicting indexes in place; it does not drop, rename or replace them.

## Output

- Missing indexes listed per collection.
- Missing definitions include their name, ordered keys, uniqueness and partial filter.
- When indexes are missing, a summary prints `missing_total` and the selected mode.
- Live creation prints `[ok] created ...` or `[error] create ...` for each attempt.
- When no indexes are missing, prints `[ok] all canonical indexes present across checked collections.`

## Notes

- Creating indexes may lock or impact performance; prefer running `live` during low traffic windows.
- Ensure roles permit `createIndex` on target collections.
- Pass `-collections ""` to explicitly select every collection in the source file.
- Re-run the same scope in `dry-run` after applying. Inspect all logs for errors and skipped collections: individual lookup or creation failures do not necessarily cause a non-zero exit, and `[done]` or a Kubernetes `Complete` status does not establish success.
