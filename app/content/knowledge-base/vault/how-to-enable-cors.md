---
date: '2025-11-08T10:29:28Z'
title: 'How to enable CORS'
weight: 3
---

- My media is not loading in the day overview page on Hub
- How to do this.

### Answer

Enabling CORS on Vault depends on the storage provider you are using. Each cloud provider has its own method for configuring CORS:

- **GCP (Google Cloud Storage)**: Use `gsutil cors set` command or configure through Cloud Console
- **AWS (S3)**: Configure CORS rules in the bucket permissions settings
- **Azure (Blob Storage)**: Set CORS rules via Azure Portal or Azure CLI
- **MinIO**: Configure CORS using the MinIO client or API

Refer to your specific storage provider's documentation for detailed CORS configuration steps. 

### Related articles

- [Amazon S3](/docs/vault/providers/amazon-s3/)
- [Azure Storage Account](/docs/vault/providers/azure-storage-account/)
