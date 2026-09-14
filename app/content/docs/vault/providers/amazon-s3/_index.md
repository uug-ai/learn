---
title: "Amazon S3"
description: "Configure Amazon S3 as a Vault storage provider."
lead: "Store recordings in an S3 bucket using IAM credentials."
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
---

## Prerequisites

Create an S3 bucket and an IAM access key with permission to read, write, list,
and delete objects in that bucket. Vault needs delete permission for manual
deletion and account retention cleanup.

## Configure Vault

1. Open **Storage Providers** in Vault.
2. Select **+ Add Storage Provider** and choose **Amazon Web Services: S3**.
3. Enter a unique provider name, the bucket name, and its AWS region.
4. Enter the IAM access key and secret access key.
5. Enable the provider and select **Validate**.
6. Add the provider after validation succeeds.

Vault connects to the standard `s3.amazonaws.com` endpoint. For another
S3-compatible service with a custom endpoint, use the MinIO provider instead.

Assign the provider to an [account](/docs/vault/accounts/) before connecting an
Agent. Provider lifecycle rules can transition storage classes, but Vault's own
deletion schedule is controlled by the account day limit.
