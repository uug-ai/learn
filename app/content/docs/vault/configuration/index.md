---
title: "Configuration"
description: ""
lead: ""
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 305
toc: true
---

After Vault starts, sign in to the administration UI and configure how Agents
authenticate, where recordings are stored, and where events are delivered.

The normal setup order is:

1. Add and validate one or more storage providers.
2. Add any optional event or forwarding integrations.
3. Create an enabled account and assign its providers and integrations.
4. Configure Agents with the account access key, secret, and Vault URL.

## 1. Providers

Storage providers are the foundation of Vault. Add AWS S3, Google Cloud
Storage, Azure Blob Storage, Storj, or MinIO credentials, then use **Validate**
to confirm Vault can reach the bucket or container.

Go ahead and [have a look at the provider page]({{< ref "/docs/vault/providers" >}}), there we explain how to add and configure specific providers.

## 2. Integrations

Integrations are optional. Add one when another service must receive an event or
when recordings should be forwarded to another Vault.

An integration produces an event with relevant information about the recording:

- Where is it stored,
- its filesize,
- metadata about where motion was detected, etc.

Vault supports Kafka, RabbitMQ, SQS, Kerberos Hub, and Vault-to-Vault
forwarding. Delivery is durable and at least once, so custom consumers should
handle duplicate events safely.

Go ahead and [have a look at the integrations page](/docs/vault/integrations), there we explain how to add and configure specific integrations.

## 3. Accounts

An account defines the credentials presented by Agents and API clients. It also
assigns storage providers, optional integrations, an upload directory policy,
and a retention day limit.

After creating and enabling the account, configure the Agent with its access key
and secret. Use the same account when an authorized client such as Kerberos Hub
must request media URLs from Vault.

Go ahead and [have a look at the accounts page](/docs/vault/accounts), there we explain how to add and configure specific accounts.

## Verify operation

Upload a recording from an Agent, then confirm:

1. **Cameras** shows the Agent and a recent heartbeat.
2. **Media** shows the recording under the expected account and provider.
3. **Outbox** remains clear or drains after each configured integration accepts
  its event.

Use [Retention and cleanup](/docs/vault/recycle/) to verify the account's day
limit before production ingestion.
