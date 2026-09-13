---
title: "Installation"
description: ""
lead: ""
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 302
toc: true
---

Vault is distributed as a container image. The same process serves the
web application and REST API and connects to MongoDB plus the object-storage
providers configured after login. Kubernetes is recommended for production;
the image can also run directly in Docker for development or a small deployment.

## Requirements

- A MongoDB-compatible database.
- Network access from Vault to each configured object-storage provider.
- Persistent object storage such as AWS S3, Google Cloud Storage, Azure Blob
  Storage, MinIO, or Storj.
- An ingress, load balancer, or published container port for the Vault HTTP
  service.

RabbitMQ, Kafka, SQS, MQTT, and Kerberos Hub are optional. They are required only
for the integrations that use them.

## Current deployment manifests

The maintained manifests live in the
[Kerberos.io deployment repository](https://github.com/kerberos-io/deployment).
The [Vault base](https://github.com/kerberos-io/deployment/tree/main/base/vault)
contains the Deployment, Service, MongoDB ConfigMap, and a focused README.

For Kubernetes, choose the guide that matches the environment:

- [Self-hosted Kubernetes](https://github.com/kerberos-io/deployment/blob/main/README.k8s.md)
- [MicroK8s with Kustomize](https://github.com/kerberos-io/deployment/blob/main/README.kustomize.md)
- [Managed Kubernetes](https://github.com/kerberos-io/deployment/blob/main/README.k8s-managed.md)

Do not use the legacy manifests under the Vault repository as a reference for a
new deployment; those examples install an older Vault release.

{{< figure src="vault-edge-cloud-deployments.svg" alt="Vault can be installed everywhere your Kubernetes cluster can be installed." caption="Vault can be installed everywhere your Kubernetes cluster can be installed." class="stretch">}}

## Managed Kubernetes

Managed Kubernetes services such as GKE, EKS, and AKS provide load balancers,
volumes, and native object storage. Use the managed deployment guide above and
configure the matching Vault storage provider after installation.

{{< figure src="vault-cloud-deployment.svg" alt="Bring your own storage using Vault" caption="Bring your own storage using Vault" class="stretch">}}

## Self-hosted Kubernetes

A self-hosted cluster can keep recording traffic and storage close to the
cameras. It must also provide its own ingress or load balancer, persistent
volumes for MongoDB, DNS, and object storage such as MinIO.

{{< figure src="vault-edge-deployment.svg" alt="Store your recordings at the edge with Vault" caption="Store your recordings at the edge with Vault" class="stretch">}}

## Essential configuration

Set `KERBEROS_LOGIN_USERNAME` and `KERBEROS_LOGIN_PASSWORD` before exposing the
service. The example base manifest uses `root` / `kerberos` only as demo values;
replace both in production. Configure MongoDB through `MONGODB_URI` or the
individual `MONGODB_*` settings.

Other current settings include:

- `VAULT_SIGNING`, `VAULT_PUBLIC_URL`, and `VAULT_URL_SIGNING_KEY` for media URLs.
- `DEFAULT_RETENTION_DAYS` for providers not claimed by an account.
- `VAULT_ID` and `MQTTURI` for on-demand Vault-to-Vault forwarding.
- `FORWARDING_CONCURRENCY_RATE` for forwarding worker concurrency.

After startup, open the Vault URL and configure providers, integrations, and
accounts in the UI. The API and Swagger UI are served from the same origin at
`/api` and `/swagger/index.html`.
