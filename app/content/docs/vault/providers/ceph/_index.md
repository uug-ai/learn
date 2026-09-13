---
title: "Ceph"
description: "Connect Vault to Ceph Object Gateway through its S3-compatible API."
lead: "Use Ceph RADOS Gateway as private-cloud or edge object storage."
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
images: []
toc: true
---

[Ceph Object Gateway](https://docs.ceph.com/en/latest/radosgw/) exposes an
S3-compatible API backed by a Ceph storage cluster. Vault connects to that API
through its **Minio** provider type. There is no separate **Ceph** option in the
Vault provider selector.

## Prerequisites

Before configuring Vault:

1. Deploy Ceph Object Gateway and make its S3 endpoint reachable from the Vault
	API container.
2. Create a bucket for Vault recordings.
3. Create an S3 user and access-key pair.
4. Grant that user permission to list the bucket and upload, read, and delete
	its objects. Resumable uploads also require multipart-upload permissions.
5. Note the S3 region exposed by the gateway. This is commonly `default`, but
	it must match the region configured by your Ceph zonegroup.

Refer to the [Ceph Object Gateway S3 API documentation](https://docs.ceph.com/en/latest/radosgw/s3/)
for user, bucket, and policy administration.

## Configure Vault

1. Open **Storage Providers** in Vault.
2. Select **+ Add Storage Provider**.
3. Choose **Minio** as the provider type.
4. Enter a unique provider name, such as `Ceph edge storage`.
5. Enter the existing Ceph bucket name.
6. Enter the Ceph Object Gateway region.
7. Enter the gateway endpoint as `host:port`, without an `http://` or
	`https://` prefix. For example: `rook-ceph-rgw.ceph.svc.cluster.local:80`.
8. Enter the S3 access key and secret access key created for Vault.
9. Enable **SSL** when the endpoint uses HTTPS.
10. Enable the provider, select **Validate**, and save it after validation
	 succeeds.

Assign the saved provider to an [account](/docs/vault/accounts/) before an Agent
uploads recordings through it.

## Networking and TLS

The endpoint is resolved from the Vault API container, not from the browser.
Use a Kubernetes service DNS name for an in-cluster gateway or a routable DNS
name for an external gateway.

When SSL is enabled, the certificate must be valid for the configured hostname
and trusted by the Vault container. Do not include a URL scheme or path in the
**Hostname** field.

## Troubleshooting

**Validation cannot connect**

- Verify the endpoint and port from the Vault API container.
- Check service, ingress, firewall, and network-policy rules.
- Confirm the **SSL** toggle matches the gateway protocol.

**Access denied**

- Confirm the bucket exists and the access key belongs to the intended Ceph
  user.
- Verify the user can list the bucket and read, upload, and delete objects.
- Include multipart-upload permissions for resumable TUS uploads.

**Signature mismatch**

- Use the S3 region configured by the Ceph zonegroup.
- Enter only `host:port` in **Hostname**.
- Check that a proxy does not rewrite the request host before it reaches the
  gateway.

**Resumable upload fails**

- Confirm multipart uploads are enabled and permitted on the bucket.
- Check Ceph Object Gateway logs for rejected multipart operations.
- Verify that proxies preserve the TUS request method and upload headers.
