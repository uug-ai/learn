---
podcast: vault
title: "Vault"
description: "Store recordings on your own infrastructure and connect them to your applications."
lead: "Store recordings on your own infrastructure and connect them to your applications."
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-10-29T11:43:28+00:00
draft: false
images: []
weight: 6
sidebar:
  product: vault
  topicGroup: Topics
  introductoryPages:
    - first-things-first
    - getting-started
    - installation
---

Kerberos Vault is the bring-your-own-storage layer for your recordings. [Agents]({{< relref "/docs/agent" >}}) upload footage to Vault, which stores it on the providers you choose, at the edge or in the cloud. Vault also connects those recordings to [Kerberos Hub]({{< relref "/docs/hub" >}}) and your own applications through events, integrations and APIs.

{{< iso-figure figure="vault" alt="Isometric illustration of Kerberos Vault. Four Agents upload recordings to a vault. Each recording leaves the vault as a crate on a conveyor, and a crane drops it into the S3, Azure or Ceph bucket its account uses. Hub then reads a recording straight from its bucket." caption="How a recording moves from an Agent, through Vault, into your own storage and out to Hub." >}}

## How recordings move through Vault

1. **Choose your storage.** Configure a [provider]({{< relref "/docs/vault/providers" >}}) such as S3, Google Cloud Storage, Storj, MinIO or Ceph. Keep your recordings on your own infrastructure, in a cloud environment, or across both.
2. **Connect your Agents.** Create an [account]({{< relref "/docs/vault/accounts" >}}) with credentials and a storage provider, then configure your Agents to upload recordings to Vault. Accounts also control settings such as retention.
3. **Use your recordings.** Configure [integrations]({{< relref "/docs/vault/integrations" >}}) to notify Hub or your own consumers when footage arrives. With [forwarding]({{< relref "/docs/vault/forwarding" >}}), you can keep recordings at the edge and send selected footage to another Vault.

The [API]({{< relref "/docs/vault/api" >}}) gives your applications access to Vault's storage and integration capabilities without tying them to a particular user interface.

## Where to start

- [First things first]({{< relref "/docs/vault/first-things-first" >}}): why Vault exists and how its storage and integrations fit together.
- [Getting started]({{< relref "/docs/vault/getting-started" >}}): a tour of providers, integrations and accounts.
- [Installation]({{< relref "/docs/vault/installation" >}}): deploy Vault on your infrastructure.
