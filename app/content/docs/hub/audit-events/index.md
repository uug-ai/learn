---
title: "Audit events"
description: "Review security, access, and configuration activity in Kerberos Hub."
lead: "Review who performed an action, what changed, and whether it succeeded."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-10-30T00:00:00+00:00
draft: false
images: []
tags: [Audit]
menu:
  hub:
    parent: "hub"
weight: 307
toc: true
podcast: hub-audit-events
---

The **Audit events** page provides a read-only history of security,
configuration, and data operations in the current organisation. Use it to
answer questions such as who changed a device, whether an authorisation check
succeeded, or which resource an action affected.

Open **Management > Audit events** in the Hub sidebar. The page is available at
`/audit` to organisation owners and administrators.

## Find an event

Audit events are shown newest first. Use the filters together to narrow the
feed:

- **Date range** limits the feed to inclusive calendar days.
- **Search** checks common event fields and known metadata.
- **Actor** identifies the user or service that initiated the action.
- **Action** narrows the feed to a named activity.
- **Target** finds activity for a resource identifier.
- **Operation** separates reads, writes, creates, deletes, and authentication.
- **Category** groups identity, data, and configuration activity.
- **Outcome** separates successful and failed operations.
- **Permission** finds authorisation checks for a specific permission.

Changing a filter returns to the first page. Use **Clear** to remove every
filter or **Refresh** to request the latest events without changing the current
filter set.

> [!TIP]
> Add a date range before running a broad text search. It produces a more
> focused result and reduces the amount of audit history the server must scan.

## Read the event table

Each row shows the event time, actor, action, operation and category, target,
and outcome. Long values are shortened in the table; hover over them to read
the complete value.

Select the details control at the end of a row to inspect the evidence captured
with the event. Depending on the action, this can include:

- the authorisation decision and evaluated permission;
- request information such as the source IP address and user agent;
- identifiers for the affected device, recording, alert, or user;
- structured metadata supplied by the action; and
- field-level changes for an update.

Background events may identify a service rather than a person and may not have
browser or IP evidence. Events without a resource display no target.

## Browse large result sets

The footer shows the visible result range and the total number of matching
events. Choose 25, 50, or 100 rows per page, or use the numbered, previous,
next, first, and last controls to move through the results.

Filtering and pagination happen on the server. The browser does not download
the complete audit history before displaying the table.

## Access and data handling

Only organisation owners and administrators can open the organisation-wide
audit feed. Other roles may generate events through their normal activity, but
they cannot use this page to inspect other actors.

Audit records are immutable in the Hub interface. The page does not provide
edit or delete actions. Sensitive values such as passwords, one-time codes, and
provider credentials are not stored as audit metadata.

Hub keeps audit events for `kerberoshub.cleanup.auditEventRetentionDays` days
(400 by default; `0` keeps them indefinitely). To keep them longer, or outside
Hub, export them to a destination.

## Export audit events

On a self-hosted Hub, the `hub-audit` service can forward every stored audit
event to external **destinations**: a SIEM or log platform over HTTPS
(`webhook`), or an immutable archive in an S3 bucket with Object Lock (`s3`).
Destinations are configured in the Hub Helm chart and apply to the whole
deployment. They don't replace the **Audit events** page, which keeps reading
from Hub's own database.

### Requirements

| Feature | Helm chart | `hub-audit` image |
| --- | --- | --- |
| Webhook destinations | 0.137.0 or later | Any release |
| S3 Object Lock destinations | 0.168.1 or later | v1.0.9 or later |
| `s3.allowUnlockedBucket` | 0.168.2 or later | v1.0.10 or later |

Before chart 0.168.4, the default `kerberoshub.audit.tag` was older than v1.0.9, so
set it explicitly when you use S3 destinations with an older chart.

Auditing is off by default. `audit.enabled: true` deploys `hub-audit` and turns
on audit publishing in every Hub service that supports it. Each service can opt
out with its own `audit.enabled: false`, for example
`kerberospipeline.notify.audit.enabled`.

```yaml
audit:
  enabled: true

kerberoshub:
  audit:
    tag: "v1.0.10"
    destinations:
      - id: primary-siem
        type: webhook
        enabled: true
        url: https://siem.example.com/api/audit
```

`hub-audit` reloads its destination list every `kerberoshub.audit.dispatchInterval`
(5 seconds by default). A changed destination list or a rotated Secret takes
effect once Kubernetes updates the mounted files, without a restart.

### How delivery works

- Each destination receives events in batches, oldest first. Its delivery position
  (checkpoint) is stored per destination `id` in Hub's database, so destinations
  never hold each other up.
- A batch counts as delivered when a webhook answers with a `2xx` status, or when
  an S3 upload completes. Then the checkpoint moves on.
- A failed batch is retried with exponential backoff. After `maxAttempts` failures,
  its events are written to the `audit_dispatch_dead_letters` collection and the
  checkpoint moves on. Those events never reach the destination, so keep
  `maxAttempts` high for an archive and watch the dead-letter collection.
- Delivery is **at least once**. A retry can resend events, so receivers should
  deduplicate (see the destination types below).
- `startAt` only applies the first time an `id` is used: `latest` starts with new
  events, `beginning` also sends all stored history. Removing a destination and
  adding it again with the same `id` resumes where it stopped. Use a new `id` to
  start over.
- Several `hub-audit` replicas can run. A lease per destination makes sure only
  one replica delivers to it at a time. Keep `kerberoshub.audit.leaseDuration` at
  least 30 seconds longer than any destination's `timeoutSeconds`.

Settings shared by both types:

| Setting | Value | Default |
| --- | --- | --- |
| `id` | Unique name: lowercase letters, digits and `-`, starting with a letter, at most 63 characters. Keeps the checkpoint, so don't rename it casually. | Required |
| `type` | `webhook` or `s3`. | `webhook` |
| `enabled` | `true` to deliver. A destination without `enabled: true` is skipped; its checkpoint is kept, so switching it back on resumes delivery. | `false` |
| `timeoutSeconds` | Timeout for one delivery, at most 60. | `10` |
| `batchSize` | Events per batch, at most 1000. | `100` |
| `maxAttempts` | Attempts before a batch is dead-lettered. | `10` |
| `startAt` | `latest` or `beginning`, only for a new `id`. | `latest` |
| `filters` | Only send matching events. The lists are `organisationIds`, `projectIds`, `actions`, `categories` and `outcomes` (`success`, `failure`). Every list is optional; an event must match all lists you set, and it matches a list when its value is one of the entries. With `projectIds`, events that belong to no project are never sent. | All events |

### Webhook destination

A webhook destination posts each batch as JSON to `url` (`http` or `https`):

```json
{
  "schemaVersion": 1,
  "destinationId": "primary-siem",
  "events": []
}
```

Every request carries an `Idempotency-Key` header,
`audit:<destination id>:<first event id>:<last event id>`. Use it to drop
resent batches. Add your own headers with `headers` (plain values) and
`secretHeaders` (values from a Kubernetes Secret). For a bearer token, use
`bearerTokenSecret`: its value is sent as `Authorization: Bearer <token>`.

```yaml
kerberoshub:
  audit:
    destinations:
      - id: primary-siem
        type: webhook
        enabled: true
        url: https://siem.example.com/api/audit
        timeoutSeconds: 10
        batchSize: 100
        maxAttempts: 10
        startAt: latest
        headers:
          X-Source: kerberos-hub
        bearerTokenSecret:
          name: audit-primary-siem
          key: token
        secretHeaders:
          X-Api-Key:
            secretName: audit-primary-siem
            secretKey: api-key
        filters:
          outcomes: [failure]
```

Secrets must exist in the Hub namespace. The chart mounts them as files into
`hub-audit`; their values never appear in the rendered ConfigMap.

### S3 Object Lock destination

An `s3` destination writes each batch as one gzipped NDJSON object (one event per
line) to:

```text
<prefix>/<destination id>/<yyyy>/<mm>/<dd>/<first event id>-<last event id>.ndjson.gz
```

The date is the UTC day of the batch's first event. A retried batch can produce
an object that overlaps an earlier one, so deduplicate on the event `id` when you
read the archive.

The archive is immutable because of the **bucket**, not because of Hub:

1. Create the bucket with versioning and Object Lock enabled.
2. Set a default retention in `COMPLIANCE` mode, for the period you have to keep
   audit records. Hub never sets retention per object.
3. Give `hub-audit` only `s3:PutObject` on the prefix and
   `s3:GetBucketObjectLockConfiguration` on the bucket. Don't grant delete,
   `s3:PutObjectRetention` or `s3:BypassGovernanceRetention`.

Before uploading, `hub-audit` reads the bucket's Object Lock configuration and
refuses to deliver unless it finds a compliance-mode default retention. A
misconfigured bucket makes delivery fail (and, after `maxAttempts`, dead-letter),
so events never land in deletable storage by accident. A verified configuration
is trusted for five minutes. Every upload carries a SHA-256 checksum.

```yaml
kerberoshub:
  audit:
    tag: "v1.0.10"
    destinations:
      - id: immutable-archive
        type: s3
        enabled: true
        timeoutSeconds: 30
        batchSize: 500
        maxAttempts: 100
        startAt: beginning
        s3:
          bucket: hub-audit-archive
          region: eu-west-1
          prefix: hub
        credentialsSecret:
          name: audit-immutable-archive
          accessKeyIdKey: access-key-id
          secretAccessKeyKey: secret-access-key
```

| `s3` setting | Value |
| --- | --- |
| `bucket` | Bucket name. Required. |
| `region` | Bucket region. Required, also for S3-compatible stores; see [S3 providers](#s3-providers) for the value to use. |
| `prefix` | Optional key prefix. |
| `endpoint` | Base URL of an S3-compatible store, including `https://` or `http://`, without the bucket name. Leave empty for AWS S3. |
| `forcePathStyle` | `true` for stores that need path-style URLs (`<endpoint>/<bucket>/<key>`). |
| `allowUnlockedBucket` | `true` skips the Object Lock check. See below. |

**Credentials.** With `credentialsSecret`, the access key and secret key are read
from that Secret (keys `access-key-id` and `secret-access-key` unless you set
`accessKeyIdKey` and `secretAccessKeyKey`), and rotated keys are picked up within
a minute. Without it, `hub-audit` uses the pod's AWS identity: the default AWS
chain, such as an instance profile, or IRSA through a ServiceAccount of its own.
That only works for AWS S3; every other store needs `credentialsSecret`.

```yaml
kerberoshub:
  audit:
    serviceAccount:
      create: true
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/hub-audit-archive
```

With `create: false` and a `name`, an existing ServiceAccount is used instead.
Without either, `hub-audit` runs as `kerberoshub.serviceAccount` like the other
Hub services.

**Stores without Object Lock.** Some S3-compatible stores, such as Garage, don't
support Object Lock, so the check above always fails. Set
`s3.allowUnlockedBucket: true` to deliver to them anyway. Batches are still
uploaded with checksums, but nothing stops them from being deleted, so the archive
is **not** immutable; `hub-audit` logs a warning for such a destination. Use it
for a copy or a test, not for an archive that must be tamper-proof.

```yaml
s3:
  bucket: hub-audit
  region: garage
  endpoint: http://garage.storage.svc:3900
  forcePathStyle: true
  allowUnlockedBucket: true
```

### S3 providers

Any store with the S3 API works. For an immutable archive, it must support Object
Lock in `COMPLIANCE` mode.

| Store | Object Lock | `region` | `endpoint` | `forcePathStyle` |
| --- | --- | --- | --- | --- |
| AWS S3 | Yes | Bucket region, for example `eu-west-1` | Leave empty | `false` |
| Wasabi | Yes | Bucket region, for example `eu-central-1` | `https://s3.<region>.wasabisys.com` | `false` |
| Backblaze B2 | Yes | Region from the bucket's S3 endpoint, for example `eu-central-003` | `https://s3.<region>.backblazeb2.com` | `false` |
| Ceph Object Gateway (RGW) | Yes | Any value, for example `default` | Your gateway URL | `true`, unless bucket subdomains resolve |
| MinIO | Yes | `us-east-1`, unless the server sets another region | Your MinIO URL | `true` |
| Garage | No: needs `allowUnlockedBucket` | Garage's `s3_region`, often `garage` | Your Garage S3 URL (port `3900` by default) | `true` |

Give `hub-audit` its own key with the least access the store allows. It only
uploads objects and, without `allowUnlockedBucket`, reads the bucket's Object Lock
configuration:

- **AWS S3, Wasabi, MinIO, Ceph:** a user or policy that allows
  `s3:PutObject` on the prefix and `s3:GetBucketObjectLockConfiguration` on the
  bucket.
- **Backblaze B2:** an application key restricted to the bucket that can write
  files and read the bucket's retention settings.
- **Garage:** a key with write access to the bucket
  (`garage bucket allow --write <bucket> --key <key>`).

Create the bucket with Object Lock from the start: on most stores, including
MinIO (`mc mb --with-lock`) and Ceph, it can't be turned on later.

On a self-hosted store, `COMPLIANCE` mode blocks deletion through the S3 API, but
whoever runs the store can still remove data underneath it. For example, Ceph
administrators can with `radosgw-admin`. If the archive must also be protected
from your own administrators, use a hosted store.

Every upload carries an `x-amz-checksum-sha256` header. Stores that don't check
it, such as Ceph before v20, ignore it. Before you rely on a store, deliver a
test batch to a bucket with a short retention and read it back.

### Read an exported archive

Each object is a gzipped file with one JSON audit event per line, so standard
tools can read it:

```bash
aws s3 cp s3://hub-audit-archive/hub/immutable-archive/2026/10/30/ ./audit --recursive
gunzip -c ./audit/*.ndjson.gz | jq -s 'unique_by(.id) | sort_by(.id)'
```

For an S3-compatible store, add `--endpoint-url <endpoint>`.

### Monitor delivery

`hub-audit` exposes Prometheus metrics, scraped through a `ServiceMonitor` when
`kerberoshub.audit.serviceMonitor.enabled` is `true` (the default). Use
`hub_audit_dispatcher_config_reload_failures_total` to catch an invalid
destination list and `hub_audit_dispatcher_configured_destinations` to confirm the
number of destinations loaded. `hub_audit_dispatcher_cycles_total` counts
delivery cycles per `destination`, with `result` set to `success` or `error`; a
rising `error` count shows which destination is failing. Check
`audit_dispatch_dead_letters` for batches that gave up, and the `hub-audit` logs
for the reason a destination fails.

## Troubleshooting

- **Audit events is missing from the sidebar.** Your account must be an
  organisation owner or administrator. Opening `/audit` directly does not
  bypass this requirement.
- **The feed is empty.** Clear the filters and confirm that the correct
  organisation is selected. Events are isolated by organisation.
- **An expected event cannot be found.** Broaden the date range and remove
  text filters one at a time. Automated health checks and routine list reads
  are not necessarily recorded as user-intent audit events.
- **A value is cut off.** Hover over the table value or expand the row to view
  the complete metadata.
- **A destination receives nothing.** Check that it has `enabled: true`, that
  `audit.enabled` is `true`, and that its `filters` match the events you expect.
  A new destination with `startAt: latest` only receives events created after it
  was first loaded.
- **An S3 destination keeps failing.** The `hub-audit` logs give the reason. The
  usual cause is a bucket without Object Lock or with a `GOVERNANCE` default
  retention: switch it to `COMPLIANCE`, or set `s3.allowUnlockedBucket: true` for
  a store that has no Object Lock. Batches that exhausted `maxAttempts` are in
  `audit_dispatch_dead_letters` and are not resent automatically.