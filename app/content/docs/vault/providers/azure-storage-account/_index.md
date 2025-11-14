---
title: "Azure Storage Account"
description: "Configure Azure Blob Storage as a storage provider for Kerberos Vault"
lead: "Learn how to integrate Azure Blob Storage with Kerberos Vault for enterprise-grade video recording storage"
date: 2020-10-06T08:49:31+00:00
lastmod: 2025-11-14T18:52:34+00:00
draft: false
---

## Introduction

[Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs/) is Microsoft's object storage solution for the cloud, optimized for storing massive amounts of unstructured data. It provides highly scalable, secure, and cost-effective storage for video recordings from Kerberos Vault.

### Key Features

- **Massive Scalability**: Store exabytes of data with automatic scaling
- **Multiple Access Tiers**: Hot, Cool, Cold, and Archive for cost optimization
- **High Availability**: Redundancy options including LRS, ZRS, GRS, and RA-GRS
- **Enterprise Security**: Azure AD integration, encryption, and advanced threat protection
- **S3 Compatible**: Supports S3-compatible API for seamless integration
- **Global Presence**: Available in 60+ Azure regions worldwide

### Use Cases for Kerberos Vault

Azure Blob Storage is ideal for:
- **Enterprise deployments**: Integration with existing Azure infrastructure
- **Hybrid cloud scenarios**: Combine on-premises and cloud storage
- **Compliance requirements**: Meet regulatory requirements with geo-redundancy
- **Large-scale operations**: Handle thousands of cameras with unlimited scaling
- **Cost optimization**: Tiered storage for different retention requirements

## Prerequisites

Before configuring Azure Blob Storage as a provider:

1. [An Azure account](https://portal.azure.com/) with an active subscription
2. [A Kerberos Vault installation](/vault/installation) in a Kubernetes cluster
3. Appropriate permissions to create storage accounts and containers
4. Azure CLI installed (optional, for command-line configuration)

## Setup Guide

### Step 1: Create an Azure Storage Account

1. Sign in to the [Azure Portal](https://portal.azure.com/)
2. Click **Create a resource** > **Storage** > **Storage account**
3. Configure the storage account basics:
   - **Subscription**: Select your Azure subscription
   - **Resource group**: Create new or select existing
   - **Storage account name**: Enter a globally unique name (3-24 lowercase letters and numbers)
   - **Region**: Choose the region closest to your deployment
   - **Performance**: 
     - **Standard**: General-purpose (HDD-backed)
     - **Premium**: High-performance (SSD-backed) - typically not needed for recordings
   - **Redundancy**: Select based on your availability requirements:
     - **LRS (Locally Redundant Storage)**: 3 copies in one datacenter (lowest cost)
     - **ZRS (Zone-Redundant Storage)**: 3 copies across availability zones
     - **GRS (Geo-Redundant Storage)**: 6 copies across two regions
     - **RA-GRS (Read-Access GRS)**: GRS with read access to secondary region

4. Click **Next: Advanced**
5. Configure advanced settings:
   - **Security**: Enable secure transfer (HTTPS) - recommended
   - **Blob access**: Leave public access disabled
   - **Hierarchical namespace**: Leave disabled (not needed for blob storage)
   - **Blob soft delete**: Enable for data protection (optional)
   - **Blob versioning**: Enable if you need version history (optional)

6. Click **Review + Create** and then **Create**

### Step 2: Create a Blob Container

After the storage account is created:

1. Navigate to your storage account in the Azure Portal
2. In the left menu, under **Data storage**, click **Containers**
3. Click **+ Container** at the top
4. Configure the container:
   - **Name**: Enter a name (e.g., `kerberos-recordings`)
   - **Public access level**: Select **Private** (no anonymous access)
5. Click **Create**

### Step 3: Get Storage Account Credentials

Kerberos Vault uses the S3-compatible API to connect to Azure Blob Storage. You'll need:

#### Option A: Using Access Keys (Simpler)

1. In your storage account, go to **Security + networking** > **Access keys**
2. Under **key1** or **key2**, click **Show** next to the key
3. Copy the following:
   - **Storage account name**: Your account name
   - **Key**: The access key value

#### Option B: Using Shared Access Signature (SAS) - More Secure

1. In your storage account, go to **Security + networking** > **Shared access signature**
2. Configure the SAS:
   - **Allowed services**: Check **Blob**
   - **Allowed resource types**: Check **Service**, **Container**, and **Object**
   - **Allowed permissions**: Check **Read**, **Write**, **Delete**, **List**, **Add**, **Create**
   - **Start and expiry date/time**: Set appropriate timeframe
   - **Allowed IP addresses**: Optionally restrict to your Kerberos Vault IPs
   - **Allowed protocols**: HTTPS only
3. Click **Generate SAS and connection string**
4. Copy the **SAS token** (starts with `?sv=`)

### Step 4: Configure S3-Compatible Endpoint

Azure Blob Storage supports S3-compatible API access. The endpoint format is:

```
https://<storage-account-name>.blob.core.windows.net
```

For S3 compatibility, you may need to use specific tools or SDKs that support Azure's S3-compatible layer.

**Note**: Azure's native S3 compatibility is limited. For best results, you can:
1. Use Azure Storage's native API (if Kerberos Vault supports it)
2. Use a compatibility layer like MinIO Gateway for Azure (**Deprecated**; see [MinIO Gateway Deprecation Notice](https://min.io/docs/minio/linux/reference/minio-gateway.html)).  
   > **Warning:** MinIO Gateway for Azure is deprecated and may not be available in newer MinIO versions. Refer to the [MinIO documentation](https://min.io/docs/minio/linux/reference/minio-gateway.html) for details and migration guidance.
3. Configure Azure with S3-compatible tools

### Step 5: Alternative - Set Up MinIO Gateway for Azure

For full S3 compatibility, you can deploy MinIO Gateway as a bridge:

```bash
# Set environment variables
export MINIO_ROOT_USER=<your-storage-account-name>
export MINIO_ROOT_PASSWORD=<your-storage-account-key>

# Run MinIO Gateway for Azure
minio gateway azure
```

Or deploy in Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio-azure-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio-gateway
  template:
    metadata:
      labels:
        app: minio-gateway
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args:
        - gateway
        - azure
        env:
        - name: MINIO_ROOT_USER
          value: "<storage-account-name>"
        - name: MINIO_ROOT_PASSWORD
          value: "<storage-account-key>"
        ports:
        - containerPort: 9000
---
apiVersion: v1
kind: Service
metadata:
  name: minio-gateway
spec:
  selector:
    app: minio-gateway
  ports:
  - port: 9000
    targetPort: 9000
```

## Integration with Kerberos Vault

### Direct Azure Blob Storage Configuration

If Kerberos Vault supports Azure Blob Storage natively:

1. Open the Kerberos Vault web interface
2. Navigate to **Providers** in the left menu
3. Click **+ Add Storage Provider**
4. Select **Azure Storage Account** from the list
5. Fill in the configuration:
   - **Provider name**: A descriptive name (e.g., "Azure Production Storage")
   - **Bucket name**: Your container name (e.g., `kerberos-recordings`)
   - **Region**: Your Azure region (e.g., `eastus`)
   - **Hostname**: `<storage-account-name>.blob.core.windows.net`
   - **Access Key**: Your storage account name
   - **Secret Access Key**: Your storage account access key or SAS token
6. Click **Validate** to test the connection
7. If successful, you'll see a green confirmation message
8. Click **Save** to add the provider

### Using MinIO Gateway Configuration

If using MinIO Gateway for S3 compatibility:

1. Open the Kerberos Vault web interface
2. Navigate to **Providers** in the left menu
3. Click **+ Add Storage Provider**
4. Select **MinIO** or **S3-Compatible** provider
5. Fill in the configuration:
   - **Provider name**: A descriptive name (e.g., "Azure via MinIO")
   - **Bucket name**: Your Azure container name
   - **Region**: Leave blank or specify region
   - **Hostname**: MinIO gateway hostname (e.g., `minio-gateway.default.svc.cluster.local:9000`)
   - **Access Key**: Your storage account name
   - **Secret Access Key**: Your storage account key
6. Click **Validate** to test the connection
7. Click **Save** to add the provider

## Configuration Options

### Access Tiers for Cost Optimization

Azure Blob Storage offers different access tiers:

1. **Hot tier**: Optimized for frequent access
   - Best for: Active recordings, recent videos
   - Highest storage cost, lowest access cost

2. **Cool tier**: Optimized for infrequent access (< 1/month)
   - Best for: Recordings 30-90 days old
   - Lower storage cost, higher access cost
   - Minimum storage duration: 30 days

3. **Cold tier**: Optimized for infrequent access (< 1/quarter)
   - Best for: Recordings 90-180 days old
   - Even lower storage cost
   - Minimum storage duration: 90 days

4. **Archive tier**: Optimized for long-term archival
   - Best for: Compliance recordings, yearly retention
   - Lowest storage cost, highest retrieval cost
   - Minimum storage duration: 180 days
   - Retrieval latency: hours

#### Configure Lifecycle Management

To automatically transition blobs between tiers:

1. In your storage account, go to **Data management** > **Lifecycle management**
2. Click **Add rule**
3. Configure rules, for example:
   - Move to Cool tier after 30 days
   - Move to Cold tier after 90 days
   - Move to Archive tier after 180 days
   - Delete after 365 days

Example rule JSON:

```json
{
  "rules": [
    {
      "enabled": true,
      "name": "RecordingLifecycle",
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"]
        },
        "actions": {
          "baseBlob": {
            "tierToCool": {
              "daysAfterModificationGreaterThan": 30
            },
            "tierToCold": {
              "daysAfterModificationGreaterThan": 90
            },
            "tierToArchive": {
              "daysAfterModificationGreaterThan": 180
            },
            "delete": {
              "daysAfterModificationGreaterThan": 365
            }
          }
        }
      }
    }
  ]
}
```

### Security Best Practices

1. **Use Azure AD authentication**: Configure managed identities when possible
2. **Enable soft delete**: Protect against accidental deletions (retention: 7-365 days)
3. **Enable blob versioning**: Keep version history for critical recordings
4. **Rotate access keys regularly**: Use Azure Key Vault for key management
5. **Use SAS with minimal permissions**: Limit access scope and duration
6. **Enable encryption**: 
   - Encryption at rest (enabled by default)
   - Customer-managed keys via Azure Key Vault (optional)
7. **Configure firewall rules**: Restrict access to specific IP ranges
8. **Enable Advanced Threat Protection**: Detect unusual access patterns
9. **Audit logging**: Enable Azure Monitor and Storage Analytics

### Network Security

Configure network access:

1. Go to **Security + networking** > **Networking**
2. Under **Firewalls and virtual networks**:
   - Select **Enabled from selected virtual networks and IP addresses**
   - Add your Kerberos Vault's virtual network or IP addresses
   - Enable trusted Microsoft services if needed
3. Consider using **Private endpoints** for secure, private connectivity

### Performance Optimization

- **Use Premium performance tier**: For high IOPS requirements
- **Enable large file shares**: For improved throughput
- **Use appropriate redundancy**: Balance cost and availability needs
- **Optimize blob block size**: Configure upload chunk sizes
- **Use Azure CDN**: For frequently accessed content
- **Monitor metrics**: Track IOPS, throughput, and latency

## Monitoring and Management

### Azure Monitor Integration

View storage metrics:

1. In your storage account, go to **Monitoring** > **Metrics**
2. Create charts for:
   - **Transactions**: Request count and success rate
   - **Ingress/Egress**: Data transferred in/out
   - **Availability**: Service uptime
   - **Latency**: E2E and server latency

### Set Up Alerts

Configure alerts for important events:

1. Go to **Monitoring** > **Alerts**
2. Click **+ Create** > **Alert rule**
3. Configure conditions:
   - High error rate
   - Unusual egress volume
   - Low availability
   - Storage capacity thresholds

### Storage Analytics

Enable detailed logging:

1. Go to **Monitoring** > **Diagnostic settings**
2. Click **Add diagnostic setting**
3. Select log categories:
   - StorageRead
   - StorageWrite
   - StorageDelete
4. Choose destination (Log Analytics, Storage Account, Event Hub)

## Pricing Considerations

Azure Blob Storage pricing includes:

- **Storage costs**: Based on tier and redundancy
- **Access operations**: Transaction costs vary by tier
- **Data transfer**: Egress charges for data leaving Azure
- **Additional features**: Versioning, soft delete, advanced threat protection

For detailed pricing, visit the [Azure Blob Storage Pricing page](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/).

### Cost Optimization Tips

1. Use lifecycle policies to transition to cheaper tiers
2. Choose appropriate redundancy level (don't over-provision)
3. Monitor and optimize egress costs
4. Use Azure Reserved Capacity for predictable workloads
5. Delete unnecessary blobs and versions
6. Use cool/cold tiers for infrequently accessed data
7. Consider Azure Front Door or CDN for global distribution

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify access key or SAS token is correct
- Check firewall rules and IP restrictions
- Ensure storage account allows HTTPS connections
- Verify the endpoint URL format is correct

**Access Denied**
- Confirm SAS token has not expired
- Check container permissions
- Verify network access rules
- Ensure the container exists

**Slow Upload Speeds**
- Use a storage account in the same region
- Check network latency and bandwidth
- Consider Premium performance tier
- Optimize upload block sizes
- Use Azure ExpressRoute for dedicated connectivity

**High Costs**
- Review storage tier usage
- Implement lifecycle management policies
- Monitor transaction costs
- Reduce unnecessary egress
- Use Azure Cost Management to analyze spending

**SAS Token Expired**
- Generate a new SAS token with extended expiry
- Consider using access keys for longer-term access
- Implement automatic token rotation

## Additional Resources

- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Azure Storage Security Guide](https://docs.microsoft.com/en-us/azure/storage/common/storage-security-guide)
- [Lifecycle Management Policies](https://docs.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview)
- [Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Best Practices](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction)
- [Performance and Scalability Checklist](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-performance-checklist)
- [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/) - Desktop app for managing storage
<!-- MinIO Gateway for Azure was deprecated in 2022. For S3 compatibility with Azure Blob Storage, consider using Azure Data Lake Storage Gen2 or review current Azure documentation for interoperability options. -->
