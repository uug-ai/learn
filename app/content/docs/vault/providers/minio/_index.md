---
title: "MinIO"
description: "Configure MinIO or another S3-compatible endpoint as a Vault storage provider."
lead: "Use an edge or private-cloud object store for Vault recordings."
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
---

## Prerequisites

Create a bucket and an access-key pair in MinIO. The credentials need permission
to upload, read, list, and delete objects in the bucket.

## Configure Vault

1. Open **Storage Providers** in Vault.
2. Select **+ Add Storage Provider** and choose **Minio**.
3. Enter a unique provider name and the bucket name.
4. Enter the MinIO region. Use the region configured by your MinIO deployment;
	use a value such as `us-east-1` when no custom region is configured.
5. Enter the endpoint as `host:port`, without an `http://` or `https://` prefix.
6. Enter the access key and secret access key.
7. Enable **SSL** when the endpoint uses HTTPS.
8. Enable the provider, select **Validate**, and add it after validation succeeds.

The endpoint must be reachable from the Vault API container. In Kubernetes this
is normally the MinIO service DNS name, for example
`minio.minio-tenant.svc.cluster.local:9000`.

Assign the provider to an [account](/docs/vault/accounts/) before connecting an
Agent.
