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

Once you have set up Kerberos Vault successfully on your Kubernetes cluster, it is time to set it up and configure the different elements.

The steps we have to go through to get a functional Kerberos Vault are as following,

1. Mount and connect a storage provider,
2. implement and configure one or more integrations,
3. create an account, so Kerberos Vault can be consumed.

## Database and environment configuration

Providers, integrations, and accounts created in the administration UI are
stored in MongoDB. For declarative deployments, Vault can also load each
resource type from a JSON environment variable:

| Variable | Value |
| --- | --- |
| `VAULT_STORAGE_PROVIDERS` | JSON array of storage provider objects |
| `VAULT_INTEGRATIONS` | JSON array of integration objects |
| `VAULT_ACCOUNTS` | JSON array of account objects |

For example:

```bash
VAULT_STORAGE_PROVIDERS='[{"name":"archive","provider":"minio","host":"minio.minio.svc:9000","region":"us-east-1","bucket":"recordings","access_key":"example-key","secret":"example-secret","use_ssl":"false"}]'
VAULT_INTEGRATIONS='[{"name":"events","queue":"rabbitmq","broker":"amqp://rabbitmq.rabbitmq.svc:5672","topic":"recordings","username":"example-user","password":"example-password"}]'
VAULT_ACCOUNTS='[{"account":"camera-fleet","directory":"fleet","provider":"archive","access_key":"example-account-key","secret_access_key":"example-account-secret","limit":"30","queues":["events"]}]'
```

Use a secret manager or Kubernetes `Secret` for these values because provider
and integration objects can contain credentials. Do not store production JSON
in a ConfigMap or source control.

Vault applies the following rules:

- An environment definition overrides a MongoDB definition with the exact same
  `name`; it does not delete or modify the MongoDB document.
- Environment definitions appear grayed out in the Providers, Integrations, and
  Accounts pages. Their eye action opens a read-only details view with the source
  environment variable at the top and secret values masked. They cannot be edited
  or deleted through the UI or API.
- Accounts assign environment-defined providers and integrations by name using
  `provider`, `secondary_providers`, and `queues`.
- The configuration is loaded once during startup. Restart or redeploy Vault
  after changing either variable.
- Invalid JSON, duplicate names within one variable, unsupported types, or
  missing required fields prevent Vault from starting.
- An unset, empty, or `[]` value adds no environment definitions, leaving the
  existing MongoDB behavior unchanged.

Vault assigns stable IDs to environment definitions, so durable outbox retries
can resolve the same integration after a restart. Do not provide `id`, `type`,
or `environment` fields yourself. `enabled` defaults to the string `"true"`;
provider `use_ssl` defaults to `"false"`; and Vault forwarding `forward_type`
defaults to `"continuous"`.

### Storage provider fields

Every provider requires `name` and `provider`. Add the fields required by its
provider type:

| `provider` value | Required fields |
| --- | --- |
| `aws` | `bucket`, `region`, `access_key`, `secret` |
| `gcp` | `bucket`, `serviceKey` containing the service-account JSON |
| `minio` | `bucket`, `region`, `host`, `access_key`, `secret` |
| `storj` | `bucket`, `region`, `host`, `access_key`, `secret` |
| `azure` | `account_name`, `account_key`, `container_name` |

The optional `temporary`, `enabled`, and `use_ssl` values use the strings
`"true"` or `"false"`, matching the Vault API model. Ceph Object Gateway uses
the `minio` provider value and its S3-compatible endpoint.

### Integration fields

Every integration requires `name` and `queue`. Add the fields required by its
integration type:

| `queue` value | Required fields |
| --- | --- |
| `sqs` | `region`, `topic`; `access_key` and `secret` are optional when the AWS default credential chain is available |
| `kafka` | `broker`, `group`, `topic`, `username`, `password`, `mechanism`, `security` |
| `rabbitmq` | `broker`, `topic`, `username`, `password`; `exchange` is optional |
| `kerberoscloud` | `url`, `cloudkey` |
| `kerberosvault` | `vault_url`, `provider`, `access_key`, `secret` |

For a `kerberosvault` integration with `forward_type: "ondemand"`, also provide
the Kerberos Hub `url`, `cloudkey`, and `username`. The API retains the legacy
`kerberoscloud` and `kerberosvault` type values even though the interface calls
these integrations Kerberos Hub and Vault.

### Account fields

Every environment account requires `account`, `directory`, `provider`,
`access_key`, `secret_access_key`, and a positive `limit` string. Optional
`secondary_providers` and `queues` arrays contain provider and integration names.
`enabled` defaults to `"true"`.

An environment account overrides a MongoDB account with the same `account`
value. The environment credentials replace that account's stored credentials;
the shadowed database credentials no longer authenticate while the environment
definition is loaded.

## 1. Providers

Storage providers are the foundation of Kerberos Vault. As an administrator you bring your own cloud or edge storage, so there is no need to install a specific Kerberos Vault storage, we are open and integrate with others.

Go ahead and [have a look at the provider page]({{< ref "/docs/vault/providers" >}}), there we explain how to add and configure specific providers.

## 2. Integrations

Once you have successfully stored your recordings on a storage provider, it is time to do something with it. This is where integrations come into play. An integration is a way to make another third-party solution or custom workload aware that a recording was stored on a storage provider.

An integration produces an event with relevant information about the recording:

- Where is it stored,
- its filesize,
- metadata about where motion was detected, etc.

By connecting to an integration you will have to power to consume those message and build custom workflows through the programming languages you prefer, or connect [to existing systems such as Kerberos Hub](/docs/hub/first-things-first) for visualisation purposes.

Go ahead and [have a look at the integrations page](/docs/vault/integrations), there we explain how to add and configure specific integrations.

## 3. Accounts

You should now have a working storage provider that helps you to persist your recordings, and have an integration in place to produce and consume events. Now it is time to leverage those capabilities through the concept of accounts.

By creating an account you create a secure way of leveraging those capabilities by use authentication credentials; an access key and secret key. 

Once those credentials and relevant account has been created and enabled you can link it to your Agents to start forwarding their recordings into your Kerberos Vault installation. On the other hand those credentials can also be leveraged when connecting to Kerberos Hub, so it can read and request recordings from your Kerberos Vault; and underlying storage providers.

Go ahead and [have a look at the accounts page](/docs/vault/accounts), there we explain how to add and configure specific accounts.

## You're ready

If completed previous configurations, you are now ready to configure your Agents with our without Factory. Learn more here.
