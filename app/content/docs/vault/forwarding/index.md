---
title: "Forwarding"
description: ""
lead: ""
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 309
toc: true
---

Multiple Kerberos Vaults can be installed in your video landscape. You may have Kerberos Vaults at the edge and/or in a cloud environment, connected to edge and/or cloud storage providers.

Kerberos Vaults can be chained and configured in forwarding mode. This configuration makes it possible to enable offline capabilities and keep the majority of your recordings at the edge. Only a subset of your recordings will be transferred from the edge to the cloud by requesting a forward from Kerberos Hub or building your own forwarding application code.

{{< rete caption="Synchronise recordings between multiple Kerberos Vault" alt="Synchronise recordings between multiple Kerberos Vault" height="520" >}}
{
  "groups": [
    { "id": "edge",  "label": "Edge",  "x":   0, "y": 20, "w": 320, "h": 460 },
    { "id": "cloud", "label": "Cloud", "x": 420, "y": 20, "w": 540, "h": 460 }
  ],
  "nodes": [
    { "id": "edge-vault",   "kind": "vault",   "x":  40, "y": 200, "w": 240, "h": 110,
      "header": "VAULT SOURCE", "title": "Edge Vault",  "subtitle": "On-prem recordings" },
    { "id": "cloud-vault",  "kind": "hub",     "x": 460, "y": 280, "w": 240, "h": 130,
      "header": "VAULT TARGET", "title": "Cloud Vault", "subtitle": "Forwarding sink" },
    { "id": "sink-1", "kind": "carrier", "x": 740, "y": 100, "w": 180, "h": 64,
      "header": "CARRIER", "title": "SINK 1" },
    { "id": "sink-2", "kind": "carrier", "x": 740, "y": 190, "w": 180, "h": 64,
      "header": "CARRIER", "title": "SINK 2" },
    { "id": "sink-3", "kind": "carrier", "x": 740, "y": 280, "w": 180, "h": 64,
      "header": "CARRIER", "title": "SINK 3" },
    { "id": "sink-4", "kind": "carrier", "x": 740, "y": 370, "w": 180, "h": 64,
      "header": "CARRIER", "title": "SINK 4" }
  ],
  "connections": [
    { "from": "edge-vault",  "to": "cloud-vault", "kind": "thick" },
    { "from": "cloud-vault", "to": "sink-1" },
    { "from": "cloud-vault", "to": "sink-2" },
    { "from": "cloud-vault", "to": "sink-3" },
    { "from": "cloud-vault", "to": "sink-4" }
  ]
}
{{< /rete >}}

Forwarding can be configured in two modes: continuous forwarding and on-demand recording.

## Continuous forwarding

All recordings from your edge Kerberos Vault will be replicated to a Kerberos Vault in the cloud. While forwarding, edge computing such as machine learning, can be executed in parallel.

## On demand forwarding

Recordings are stored at the edge, and only a subset is forwarded to a Kerberos Vault in the cloud. You can specify the forwarding rules using custom code.

## Configuration

Go to the integrations page, and click (+ Add Integration). Select the Kerberos Vault option, and choose on-demand or continuous forwarding.

Define the account credentials of the remote Kerberos Vault, to which you are forwarding recordings. If not yet created make sure an account is set up with a valid storage provider.

{{< figure src="vault-forwarding.gif" alt="Two forwarding modes continuous and on demand." caption="Two forwarding modes continuous and on demand." class="stretch">}}

Once the integration is created, you still need to activate the integration for a specific account on the account page. Every recording that's now being uploaded through your account will be stored in the local storage provider, and depending on the use case will be forwarded to the remote storage provider.

{{< figure src="vault-activate-forward.gif" alt="Enable the integration for your account." caption="Enable the integration for your account." class="stretch">}}

## Examples

Two examples of on demand forwarding:

1. A machine learning filter: recordings are stored in a Kerberos Vault at the edge, and are processed by a machine learning model. Every time the machine learning model finds a match, e.g. a pedestrian detected, it will forward the recording to Kerberos Vault in a cloud environment. By doing this you will send limited recordings (storage) into the cloud.

2. An on demand request through Kerberos Hub: From Kerberos Hub a user can initiate a request for forwarding. By default, no recordings are forwarded from your Kerberos Vault at the edge to your Kerberos Vault in the cloud. However, you can enable the thumbnail option to send thumbnails to Kerberos Hub. Only when an end user requests one or more recordings, the forwarding will start for the requested recordings.
