title: "Generate default labels"
description: ""
lead: ""
date: 2020-10-06T08:49:15+00:00
lastmod: 2020-10-06T08:49:15+00:00
draft: false
images: []
weight: 2

---

### Overview

Adds predefined or custom labels to existing users in a MongoDB database. Supports a preview (`dry-run`) mode to show proposed changes and a `live` mode to apply them.

### Prerequisites

- A reachable MongoDB instance with appropriate credentials.
- Optional: a comma-separated list of label names to add; when omitted, a predefined default set is used.
- Roles permitting read and update on user documents.

### Kubernetes

Run the tool as a Kubernetes Job using the provided template. The Job image wraps the CLI and accepts the same flags via environment variables.

You can find the .yaml template for this job in [this source file.](https://github.com/uug-ai/cli/blob/main/jobs/generate-default-labels-job.yaml)

```sh
kubectl apply -f jobs/generate-default-labels-job.yaml
```

### Usage

Run in dry-run mode to preview changes:

```sh
go run main.go -action generate-default-labels \
    -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
    -mongodb-source-database Kerberos \
    -label-names "person,vehicle,anomaly" \
    -mode dry-run
```

Apply labels in live mode:

```sh
go run main.go -action generate-default-labels \
    -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
    -mongodb-source-database Kerberos \
    -label-names "person,vehicle,anomaly" \
    -username alice \
    -mode live
```

### Arguments

- `-mongodb-uri`: MongoDB connection URI with credentials (optional if host/port are provided).
- `-mongodb-host`: MongoDB host (optional if URI is provided).
- `-mongodb-port`: MongoDB port (optional if URI is provided).
- `-mongodb-source-database`: Source database name containing user documents (required).
- `-mongodb-database-credentials`: Database credentials (optional).
- `-mongodb-username`: MongoDB username (optional).
- `-mongodb-password`: MongoDB password (optional).
- `-label-names`: Comma-separated list of labels to add. Uses predefined defaults when omitted.
- `-username`: Limit the operation to a single user (optional). When omitted, applies to all users.
- `-mode`: One of `dry-run` (no changes, report only) or `live` (apply updates).

### Default Labels

When `-label-names` is not provided, the tool falls back to a predefined set of starter labels built into the CLI. The exact set may evolve; use `dry-run` to confirm which labels will be proposed before applying.

### How It Works

- Resolves the target label set: provided via `-label-names` or default set.
- Fetches target users: all users or a single user when `-username` is set.
- Compares existing labels per user and identifies missing labels.
- In `dry-run`, prints a report of intended additions; in `live`, updates user documents to include missing labels (preserving existing labels and values).

### Output

- Proposed or applied label additions listed per user.
- Status codes per operation (added, existing, skipped on error).
- Summary totals at the end in both modes.

### Notes

- Applying labels may incur write load; prefer running `live` during low traffic windows.
- Operations are designed to be idempotent; existing labels are left unchanged.
- Use `-username` to validate on a single account before rolling out broadly.