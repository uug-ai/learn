title: "Vault to Hub migration"
description: ""
lead: ""
date: 2020-10-06T08:49:15+00:00
lastmod: 2020-10-06T08:49:15+00:00
draft: false
images: []
weight: 1

---

### Overview

Migrates data from a Vault database to a Hub database. Supports `dry-run` to validate the plan and `live` to execute the migration.

### Prerequisites

- Reachable MongoDB instances (Vault source and Hub destination) with appropriate credentials.
- Queue integration configured and reachable (e.g., RabbitMQ) when piping events to the Hub pipeline.
- A target username and time window defining the migration scope.

### Kubernetes

Run the migration as a Kubernetes Job using the provided template. The Job image wraps the CLI and accepts the same flags via environment variables.

You can find the .yaml template for this job in [this source file.](https://github.com/uug-ai/cli/blob/main/jobs/vault-to-hub-migration-job.yaml)

```sh
kubectl apply -f jobs/vault-to-hub-migration-job.yaml
```

### Usage

Run in dry-run mode to validate the plan:

```sh
go run main.go -action vault-to-hub-migration \
      -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
      -mongodb-source-database KerberosStorage \
      -mongodb-destination-database Kerberos \
      -queue rabbitmq-default \
      -username alice \
      -start-timestamp "2024-04-01T08:47:40" \
      -end-timestamp "2025-04-06T17:41:00" \
      -timezone UTC \
      -pipeline "monitor,sequence" \
      -batch-size 100 \
      -batch-delay 1000 \
      -mode dry-run
```

Execute the migration in live mode:

```sh
go run main.go -action vault-to-hub-migration \
      -mongodb-uri "mongodb+srv://user:pass@cluster/?retryWrites=true&w=majority" \
      -mongodb-source-database KerberosStorage \
      -mongodb-destination-database Kerberos \
      -queue rabbitmq-default \
      -username alice \
      -start-timestamp "2024-04-01T08:47:40" \
      -end-timestamp "2025-04-06T17:41:00" \
      -timezone UTC \
      -pipeline "monitor,sequence,analysis" \
      -batch-size 100 \
      -batch-delay 1000 \
      -mode live
```

### Arguments

- `-mongodb-uri`: MongoDB connection URI with credentials (optional if host/port are provided).
- `-mongodb-host`: MongoDB host (optional if URI is provided).
- `-mongodb-port`: MongoDB port (optional if URI is provided).
- `-mongodb-source-database`: Source (Vault) database name (required).
- `-mongodb-destination-database`: Destination (Hub) database name (required).
- `-mongodb-database-credentials`: Database credentials (optional).
- `-mongodb-username`: MongoDB username (optional).
- `-mongodb-password`: MongoDB password (optional).
- `-username`: Username to filter data (required).
- `-queue`: Integration used to transfer events to the Hub pipeline (e.g., RabbitMQ).
- `-start-timestamp`: Start timestamp for filtering data (required).
- `-end-timestamp`: End timestamp for filtering data (required).
- `-timezone`: Timezone for converting timestamps (optional, default `UTC`).
- `-pipeline`: Pipeline stages to execute (optional, default `monitor,sequence`).
- `-batch-size`: Size of each batch (optional, default `10`).
- `-batch-delay`: Delay between batches in milliseconds (optional, default `1000`).
- `-mode`: One of `dry-run` (no changes, report only) or `live` (execute migration).

### How It Works

- Resolves the time window and converts timestamps using `-timezone`.
- Scans Vault for user-scoped events/media within the window.
- Transforms and enqueues events to the Hub pipeline via `-queue`.
- Persists migrated data into the Hub destination database, respecting configured pipeline stages.
- In `dry-run`, prints a detailed plan and counts; in `live`, executes the migration with batching and delays.

### Output

- Configuration header showing key parameters.
- Progress meters for delta calculation and media transfer.
- Per-stage summaries and totals.
- A final summary with success and skip/error counts.

### Notes

- Prefer running `live` during low traffic windows to reduce impact.
- Validate with a short time window and a single user before broader runs.
- Ensure appropriate roles/permissions on both source and destination databases and access to the queue integration.
      2024/12/12 09:38:26   | xxxxxxxx/1733990683_6-967003_gb-frontdoor_200-200-400-400_177_769.mp4                 | 1966309         | 1733990701      | lQtymLrehWpHkTavfcNTFgwfDMoSfg      |

