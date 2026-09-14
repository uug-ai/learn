---
title: "Vault"
description: ""
lead: "Bring your own object storage, receive recordings, and deliver durable events to downstream systems."
date: 2020-10-06T08:49:15+00:00
lastmod: 2020-10-06T08:49:15+00:00
draft: false
images: []
weight: 6
---

Vault stores recordings from Kerberos Agents in object storage that
you control. Its Go API and React administration UI run as one service backed
by MongoDB.

Vault supports AWS S3, Google Cloud Storage, Azure Blob Storage, MinIO, and
Storj. Accounts connect Agent credentials to one or more configured providers
and optional Kafka, RabbitMQ, SQS, Kerberos Hub, or Vault-forwarding
integrations.

Start with [Installation](/docs/vault/installation/) and
[Configuration](/docs/vault/configuration/). Operators can then use:

- [Media](/docs/vault/media/) to inspect and remove recordings.
- [Cameras](/docs/vault/cameras/) to monitor Agent heartbeats and remove stale
	device entries.
- [Outbox](/docs/vault/outbox/) to inspect durable integration delivery and
	retries.
- [API](/docs/vault/api/) and Swagger at `/swagger/index.html` for automation.
