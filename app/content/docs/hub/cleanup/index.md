---
title: "Cleanup"
description: "Automated subscription-based retention cleanup for Kerberos Hub data."
lead: "Use hub-cleanup to enforce retention by subscription plan and keep Hub storage predictable."
date: 2026-04-07T00:00:00+00:00
lastmod: 2026-04-07T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 306
toc: true
---

[![Go Version](https://img.shields.io/badge/Go-1.24.12%2B-blue.svg)](https://go.dev/)

The `hub-cleanup` service is a background worker that enforces retention policies for Kerberos Hub data. It continuously scans MongoDB for data that exceeded retention and removes it safely.

## What it does

- Applies retention per user from Stripe subscription plans (`settings.plan.<name>.dayLimit`).
- Deletes data across all Hub user-linked collections.
- Supports safe simulation with dry-run mode.
- Runs in bounded batches with timeouts and retries.
- Schedules each user with `cleanup.next_scan_at` for predictable load.
- Exposes Prometheus metrics for deleted media and marker documents.
- Ensures critical cleanup indexes at startup.
- Optionally runs a global orphan-cleanup pass.

## Managed collections

Collections scoped by **user** (`user_id` / `userid`):

`sequences`, `analysis`, `notifications`, `heatmap`, `counting`

Collections scoped by **organisation** (`organisationId`):

`media`, `markers`, `marker_options`, `marker_option_ranges`, `marker_category_options`, `event_options`, `event_option_ranges`, `tag_options`, `tag_option_ranges`

## Installation

Build from a checked-out `hub-cleanup` source tree:

```bash
git clone https://github.com/uug-ai/hub-cleanup.git
cd hub-cleanup
go mod download
go build -o hub-cleanup .
```

### Docker

Build the image from the repository root (where `Dockerfile` is located):

```bash
docker build -t hub-cleanup .
```

## Runtime modes

- `MODE=serve`: runs continuously.
- `MODE=dry-run`: simulates deletions without writes.
- `MODE=version`: prints binary version and exits.

Mode precedence: use `MODE` as the primary runtime selector. `DRY_RUN` is a legacy compatibility toggle. If `MODE=dry-run` is set, the service always runs cleanup in dry-run regardless of the `DRY_RUN` value. If `MODE=serve` and `DRY_RUN=true`, the service still uses the continuous serve loop and metrics server, but cleanup mutations are disabled. Prefer setting `MODE` explicitly and leaving `DRY_RUN` unset.

## Quick start

Run all commands below from the `hub-cleanup` repository root:

```bash
git clone https://github.com/uug-ai/hub-cleanup.git
cd hub-cleanup
```

### Dry-run (safe simulation)

```bash
MODE=dry-run \
MONGODB_URI="mongodb://user:pass@localhost:27017" \
MONGODB_DATABASE_CLOUD="Kerberos" \
go run .
```

### Continuous service

```bash
MODE=serve \
RUN_INTERVAL_MINUTES=10 \
MONGODB_URI="mongodb://user:pass@localhost:27017" \
MONGODB_DATABASE_CLOUD="Kerberos" \
go run .
```

### Container run

```bash
docker run --rm \
  -e MODE=serve \
  -e MONGODB_URI="mongodb://user:pass@mongo:27017" \
  -e MONGODB_DATABASE_CLOUD=Kerberos \
  -e PROMETHEUS_ADDRESS=:8080 \
  -p 8080:8080 \
  hub-cleanup
```

The container exposes Prometheus metrics on `:8080` when `PROMETHEUS_ADDRESS=:8080`.

## Core behavior

### Retention strategy

- Active subscription with configured `dayLimit`: delete only data older than that limit.
- Active subscription without `dayLimit`: skip deletion for that user.
- Inactive, expired, missing subscription, or subscription lookup error: delete all managed data for that user.

### Scheduling model

Each user has `cleanup.next_scan_at` in `users`. Only due users are loaded (`next_scan_at <= now`) and processed oldest first.

Users created before `cleanup.next_scan_at` existed are also picked up on a legacy path when the field is missing or `null`, so they can be processed during the first rollout.

After processing:

- Active users are rescheduled with `ACTIVE_USER_RESCAN_HOURS`.
- Inactive users are rescheduled with `INACTIVE_USER_RESCAN_HOURS`.

In `dry-run`, state is never written, so due users remain due on every run.

In live runs, the service writes scheduling state under the `cleanup` key:

| Field | Description |
|---|---|
| `cleanup.next_scan_at` | Unix timestamp for the next scheduled scan. |
| `cleanup.last_scan_at` | Unix timestamp of the most recent scan. |
| `cleanup.subscription_state` | `"active"`, `"inactive"`, or `"subscription-error"` based on the last lookup. |
| `cleanup.last_upload_at` | Unix timestamp of the user's latest upload, when a latest upload timestamp is available. |

These fields are useful for debugging scheduling via `mongosh`.

### Deletion safety

- Query returns `_id` only, then deletion uses explicit `_id: { $in: [...] }`.
- Read operations use `READ_TIMEOUT_SECONDS`.
- Delete batches use `DELETE_TIMEOUT_SECONDS` and retry up to 3 times on timeout.
- `dry-run` counts matching documents and never mutates data.

## Environment variables

### MongoDB connection

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | Full MongoDB URI, preferred when set. | `""` |
| `MONGODB_HOST` | Host used when no full URI is provided. | `""` |
| `MONGODB_DATABASE_CLOUD` | Kerberos Hub database name. | `"Kerberos"` |
| `MONGODB_DATABASE_CREDENTIALS` | Auth source database. | `""` |
| `MONGODB_AUTHENTICATION_MECHANISM` | Auth mechanism (`SCRAM-SHA-256`, `MONGODB-AWS`, etc.). | `""` |
| `MONGODB_REPLICASET` | Replica set name (host-based config). | `""` |
| `MONGODB_USERNAME` | MongoDB username. | `""` |
| `MONGODB_PASSWORD` | MongoDB password. | `""` |

### Runtime

| Variable | Description | Default |
|---|---|---|
| `MODE` | `serve`, `dry-run`, or `version`. | `"serve"` |
| `CLEANUP_USERNAMES` | Optional comma-separated usernames to process. When set, only those users are loaded. | `""` |
| `RUN_INTERVAL_MINUTES` | Sleep between cycles. | `"10"` |
| `DRY_RUN` | Simulate cleanup without writes. | `"false"` |
| `DEBUG` | Verbose logging. | `"false"` |
| `PROMETHEUS_ADDRESS` | Metrics endpoint bind address. | `":8080"` |

### Cleanup tuning

| Variable | Description | Default |
|---|---|---|
| `BATCH_SIZE` | Document IDs per delete batch. | `"250"` |
| `USER_BATCH_SIZE` | Users processed per inner loop batch. | `"100"` |
| `MAX_USERS_PER_RUN` | Max due users per live run; must be `>= USER_BATCH_SIZE`. Defaults to `USER_BATCH_SIZE` when unset. | `USER_BATCH_SIZE` |
| `PROGRESS_EVERY` | Log progress every N users. | `"100"` |
| `REPORT_INCLUDE_STATS` | Include per-user stats in summary. | `"false"` |
| `ACTIVE_USER_RESCAN_HOURS` | Rescan interval for active users. | `"6"` |
| `INACTIVE_USER_RESCAN_HOURS` | Rescan interval for inactive users. | `"24"` |
| `READ_TIMEOUT_SECONDS` | Timeout for reads/find/counts. | `"30"` |
| `DELETE_TIMEOUT_SECONDS` | Timeout for delete batches (with retries). | `"120"` |

### Global pass (orphan cleanup)

The global pass is optional and disabled by default. It runs after per-user cleanup and removes documents older than `MAX_DAYS` across managed collections regardless of ownership.

| Variable | Description | Default |
|---|---|---|
| `GLOBAL_PASS_ENABLED` | Enable global pass. | `"false"` |
| `GLOBAL_PASS_INTERVAL_HOURS` | Minimum hours between global passes. `0` = every cycle. On first rollout, the global pass can run immediately when enabled because no previous run state exists yet. | `"0"` |
| `GLOBAL_PASS_DELETE_BUDGET` | Max documents deleted by global pass per run. `0` = unlimited. | `"0"` |
| `MAX_DAYS` | Hard age floor in days for global pass. | `"365"` |

## Example `.env`

```env
MODE=serve
RUN_INTERVAL_MINUTES=10
MONGODB_URI=mongodb://user:pass@mongodb:27017
MONGODB_DATABASE_CLOUD=Kerberos
PROMETHEUS_ADDRESS=:8080
BATCH_SIZE=250
USER_BATCH_SIZE=100
MAX_USERS_PER_RUN=100
PROGRESS_EVERY=100
ACTIVE_USER_RESCAN_HOURS=6
INACTIVE_USER_RESCAN_HOURS=24
READ_TIMEOUT_SECONDS=30
DELETE_TIMEOUT_SECONDS=120
GLOBAL_PASS_ENABLED=false
GLOBAL_PASS_INTERVAL_HOURS=0
GLOBAL_PASS_DELETE_BUDGET=0
REPORT_INCLUDE_STATS=false
DRY_RUN=false
DEBUG=false
MAX_DAYS=365
```

## Metrics

In `MODE=serve`, Prometheus metrics are exposed on `PROMETHEUS_ADDRESS`:

```text
http://localhost:8080/metrics
```

### Available counters

| Metric | Labels | Description |
|---|---|---|
| `hub_cleanup_media_deleted_total` | `user_id`, `username` | Total media documents deleted. |
| `hub_cleanup_markers_deleted_total` | `user_id`, `username` | Total marker documents deleted. |

## Validation and error handling

- Invalid integer/boolean config values fall back to safe defaults.
- Non-positive batch and interval values are normalized.
- Startup includes MongoDB ping verification.
- Subscription lookup errors are isolated at user-level and reported.
- Non-timeout delete errors abort the current collection pass.

## Preflight checklist

Before the first live (`MODE=serve`) rollout:

1. Verify you are targeting the correct MongoDB cluster and `MONGODB_DATABASE_CLOUD`.
2. Confirm a recent backup/snapshot exists for all managed collections.
3. Run `MODE=dry-run` and review projected deletion counts.
4. Start with conservative `BATCH_SIZE` and timeout values.
5. Verify Prometheus scraping of `/metrics` before enabling continuous runs.

## Verify and test

```bash
go test ./...
```

```bash
go test -cover ./...
```

## Recommended rollout

1. Start with `MODE=dry-run` and verify projected deletions.
2. Set conservative `BATCH_SIZE` and timeout values.
3. Move to `MODE=serve` and monitor logs plus Prometheus.
4. Enable global pass only when orphaned historical data exists.

## License

MIT License.
