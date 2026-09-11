---
title: "Google Cloud Storage"
description: "Configure Google Cloud Storage as a storage provider for Kerberos Vault"
lead: "Learn how to integrate Google Cloud Storage with Kerberos Vault for scalable and cost-effective video recording storage"
date: 2020-10-06T08:49:31+00:00
lastmod: 2025-11-14T18:52:34+00:00
draft: false
---

## Introduction

[Google Cloud Storage (GCS)](https://cloud.google.com/storage) is a unified object storage solution from Google Cloud Platform that offers world-wide storage and retrieval of any amount of data at any time. GCS is designed for durability, availability, and scalability, making it an excellent choice for storing video recordings from Kerberos Vault.

### Key Features

- **Scalability**: Automatically scales to handle any amount of data
- **Global Availability**: Multiple storage classes and global edge caching
- **Cost-Effective**: Tiered storage options (Standard, Nearline, Coldline, Archive)
- **High Durability**: 99.999999999% (11 nines) annual durability
- **Security**: Encryption at rest and in transit, IAM integration
- **S3 Compatible**: Supports S3-compatible API through interoperability mode

### Use Cases for Kerberos Vault

Google Cloud Storage is ideal for:
- **Cloud-based deployments**: Centralized storage for recordings from distributed agents
- **Long-term archival**: Cost-effective storage with lifecycle management
- **Hybrid deployments**: Combining edge and cloud storage strategies
- **Global operations**: Multi-region availability for worldwide deployments

## Prerequisites

Before configuring Google Cloud Storage as a provider:

1. [A Google Cloud Platform account](https://console.cloud.google.com/)
2. [A Kerberos Vault installation](/docs/vault/installation) in a Kubernetes cluster
3. A GCP project with billing enabled
4. Appropriate IAM permissions to create buckets and service accounts

## Setup Guide

### Step 1: Create a Google Cloud Storage Bucket

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **Cloud Storage** > **Buckets**
3. Click **Create Bucket**
4. Configure your bucket:
   - **Name**: Choose a globally unique name (e.g., `kerberos-vault-recordings`)
   - **Location type**: Choose based on your needs:
     - **Region**: Single region for lowest latency
     - **Dual-region**: Two specific regions for high availability
     - **Multi-region**: Large geographic area for global access
   - **Storage class**: Select based on access patterns:
     - **Standard**: Frequently accessed data
     - **Nearline**: Accessed less than once per month
     - **Coldline**: Accessed less than once per quarter
     - **Archive**: Long-term archival, accessed less than once per year
   - **Access control**: Choose **Uniform** for simplified permissions
   - **Protection tools**: Enable versioning if needed for data protection
5. Click **Create**

### Step 2: Create a Service Account

To allow Kerberos Vault to access your bucket, create a service account with appropriate permissions:

1. In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Provide a name (e.g., `kerberos-vault-storage`) and description
4. Click **Create and Continue**
5. Grant the following role:
   - **Storage Object Admin** (for full read/write access)
   - Or **Storage Object Creator** (for write-only access)
6. Click **Continue** and then **Done**

### Step 3: Create Service Account Keys

1. In the Service Accounts list, click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** as the key type
5. Click **Create**
6. The JSON key file will be downloaded automatically - **keep this file secure**

### Step 4: Enable Interoperability for S3 Compatibility

Kerberos Vault uses S3-compatible API to interact with GCS:

1. In the Google Cloud Console, go to **Cloud Storage** > **Settings**
2. Click on the **Interoperability** tab
3. If not already enabled, click **Enable interoperability access**
4. Under **Service account HMAC**, select your service account from the dropdown
5. Click **Create a key for a service account**
6. Note down the **Access Key** and **Secret** - you'll need these for Kerberos Vault configuration

Alternatively, you can use the `gsutil` command:

```bash
# Set default project
gcloud config set project YOUR_PROJECT_ID

# Create HMAC key for service account
gsutil hmac create SERVICE_ACCOUNT_EMAIL
```

### Step 5: Configure Bucket Permissions

Ensure the service account has the necessary permissions on the bucket:

1. Go to **Cloud Storage** > **Buckets** and select your bucket
2. Click on the **Permissions** tab
3. Verify that your service account is listed with appropriate roles
4. If not, click **Grant Access** and add:
   - **Principal**: Your service account email
   - **Role**: Storage Object Admin

## Integration with Kerberos Vault

Now you're ready to configure Google Cloud Storage as a provider in Kerberos Vault:

1. Open the Kerberos Vault web interface
2. Navigate to **Providers** in the left menu
3. Click **+ Add Storage Provider**
4. Select **Google Cloud Storage** from the list
5. Fill in the configuration:
   - **Provider name**: A descriptive name (e.g., "GCS Production")
   - **Bucket name**: The name of your GCS bucket (e.g., `kerberos-vault-recordings`)
   - **Region**: Leave blank or specify the region (e.g., `us-central1`)
   - **Hostname**: Use `storage.googleapis.com` for global endpoint
   - **Access Key**: The HMAC Access Key from Step 4
   - **Secret Access Key**: The HMAC Secret from Step 4
6. Click **Validate** to test the connection
7. If successful, you'll see a green confirmation message
8. Click **Save** to add the provider

## Configuration Options

### Storage Classes and Lifecycle Management

To optimize costs, configure lifecycle rules in your GCS bucket:

1. Go to your bucket in the Cloud Console
2. Click on the **Lifecycle** tab
3. Click **Add a rule**
4. Configure rules such as:
   - Move to Nearline storage after 30 days
   - Move to Coldline storage after 90 days
   - Delete objects older than 365 days

Example lifecycle configuration:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
```

### Security Best Practices

1. **Use IAM conditions**: Restrict service account access with IAM conditions
2. **Enable bucket versioning**: Protect against accidental deletions
3. **Rotate HMAC keys regularly**: Create new keys and delete old ones periodically
4. **Use VPC Service Controls**: Restrict access to specific networks (Enterprise feature)
5. **Enable audit logging**: Track all access to your recordings
6. **Encrypt with customer-managed keys**: Use Cloud KMS for additional encryption control

### Performance Optimization

- **Use regional buckets**: For lowest latency, store data in the same region as your compute
- **Multi-region buckets**: For global access and high availability
- **Enable request logging**: Monitor access patterns and optimize accordingly
- **Use signed URLs**: For secure, temporary access to recordings

## Monitoring and Management

### View Storage Metrics

1. In the Cloud Console, go to **Cloud Storage** > **Buckets**
2. Select your bucket
3. View metrics such as:
   - Total storage size
   - Number of objects
   - Request rates
   - Egress bandwidth

### Set Up Alerts

Configure alerts for storage usage:

1. Go to **Monitoring** > **Alerting**
2. Create a new alert policy
3. Add conditions for:
   - Storage size thresholds
   - Request rate anomalies
   - Error rates

## Pricing Considerations

Google Cloud Storage pricing is based on:

- **Storage costs**: Varies by storage class and region
- **Network egress**: Data transfer out of GCS
- **Operations**: API requests (Class A and Class B operations)
- **Retrieval fees**: For Nearline, Coldline, and Archive classes

For detailed pricing, visit the [Google Cloud Storage Pricing page](https://cloud.google.com/storage/pricing).

### Cost Optimization Tips

1. Use lifecycle management to transition to cheaper storage classes
2. Choose the right storage class for your access patterns
3. Enable object versioning only if needed
4. Monitor and optimize egress costs
5. Use Cloud CDN for frequently accessed content

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify HMAC keys are correct and active
- Ensure service account has proper permissions
- Check that interoperability is enabled
- Verify network connectivity to `storage.googleapis.com`

**Access Denied**
- Confirm service account has Storage Object Admin role
- Check bucket-level IAM permissions
- Verify the bucket name is correct

**Slow Upload Speeds**
- Use a bucket in the same region as Kerberos Vault
- Check network bandwidth and latency
- Consider using Cloud Interconnect for dedicated connectivity

**High Costs**
- Review storage class usage
- Implement lifecycle policies
- Monitor and reduce unnecessary egress
- Use Cloud Storage Insights to analyze usage patterns

## Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [GCS Best Practices](https://cloud.google.com/storage/docs/best-practices)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [HMAC Keys for S3 Compatibility](https://cloud.google.com/storage/docs/authentication/hmackeys)
- [IAM Permissions Reference](https://cloud.google.com/storage/docs/access-control/iam-permissions)
- [Lifecycle Management Guide](https://cloud.google.com/storage/docs/lifecycle)
