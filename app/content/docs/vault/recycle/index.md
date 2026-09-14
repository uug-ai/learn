---
title: "Retention and cleanup"
description: "How Vault removes expired recordings from object storage and MongoDB."
lead: "Configure account retention and the unclaimed-provider fallback."
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 310
toc: true
---

Vault runs media cleanup continuously inside the API process. No separate
Recycle container or Kubernetes Deployment is required.

## Recycling rules

Cleanup removes both the object in the storage provider and the corresponding
MongoDB media row. Provider errors leave the item in place so a later cleanup
pass can retry it.

### Account day limit

Every account requires a positive **Day limit**. Vault measures this interval
from the media upload timestamp, not from a timestamp embedded in its filename.
An empty, invalid, zero, or negative limit is treated as unsafe: Vault skips
cleanup for that account instead of deleting its recordings.

{{< figure src="vault-recycle.gif" alt="You can remove your recordings by specifying the day limit field." caption="You can remove your recordings by specifying the day limit field." class="stretch">}}

## Providers without an account

`DEFAULT_RETENTION_DAYS` controls cleanup for a provider that is not the primary
provider of any account. The default is 30 days. Set it to `0` to disable this
fallback sweep.

This fallback is important when using a provider for archive or attachment
storage. A lifecycle rule configured in the object store does not change Vault's
MongoDB cleanup policy.

## Operational behavior

- Cleanup checks for expired media every two minutes.
- Large backlogs are processed in bounded batches and continue quickly until
  the backlog drains.
- Media with pending integration outbox deliveries is excluded from cleanup so
  an integration outage cannot discard an undelivered event.
- Vault retention does not know about Hub cases, legal holds, or other external
  business rules. Coordinate those policies before enabling aggressive cleanup.

Use the Media page for deliberate operator deletion of selected files. Retention
cleanup is automatic and does not require the Vault UI to remain open.
