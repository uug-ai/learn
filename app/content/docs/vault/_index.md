---
title: "Vault"
description: "Keep every recording from your Agents in the storage you choose."
lead: "Keep every recording from your Agents in the storage you choose."
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-10-29T12:00:00+00:00
draft: false
images: []
weight: 6
---

Kerberos Vault is where the recordings from your Agents are kept. You bring your own storage: Vault puts each recording with the storage provider you choose, in the cloud or on site, and gives Hub and your own applications one place to find it.

{{< iso-figure figure="vault" alt="Isometric illustration of Kerberos Vault. Four Agents upload recordings to a vault. Each recording leaves the vault as a crate on a conveyor, and a crane drops it into the S3, Azure or Ceph bucket its account uses. Hub then reads a recording straight from its bucket." caption="How a recording moves from an Agent, through Vault, into your own storage and out to Hub." >}}

## How a recording moves through Vault

1. **From the Agent.** Each Agent uploads its recordings to Vault, using the credentials of a Vault [account]({{< relref "/docs/vault/accounts" >}}).
2. **Into your storage.** Vault stores the recording with the storage provider that account uses, for example Amazon S3, Azure Blob Storage, Google Cloud Storage or Ceph. You can attach several [providers]({{< relref "/docs/vault/providers" >}}), so different accounts can keep their recordings in different places.
3. **Out to Hub.** When someone opens a recording in Hub, Hub asks Vault for a signed link and plays the recording from the storage it was saved to. Depending on the provider's [URL signing]({{< relref "/docs/vault/api/signed-urls" >}}) setting, the recording comes straight from your storage or Vault streams it.

Vault can also tell other systems about each new recording through [integrations]({{< relref "/docs/vault/integrations" >}}), and [forward]({{< relref "/docs/vault/forwarding" >}}) selected recordings to another Vault, for example from a site to the cloud.

## Where to start

- [First things first]({{< relref "/docs/vault/first-things-first" >}}): why Vault exists and where it fits.
- [Getting started]({{< relref "/docs/vault/getting-started" >}}): set up your first Vault.
- [Providers]({{< relref "/docs/vault/providers" >}}): connect the storage you want to use.
