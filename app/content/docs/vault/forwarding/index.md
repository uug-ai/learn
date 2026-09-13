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
    { "id": "cloud", "label": "Cloud", "x":   0, "y": 20, "w": 320, "h": 540 },
    { "id": "edge",  "label": "Edge",  "x": 420, "y": 20, "w": 720, "h": 540 }
  ],
  "nodes": [
    { "id": "cloud-vault", "kind": "vault", "x":  40, "y": 320, "w": 240, "h": 150,
      "header": "VAULT TARGET", "title": "Vault", "subtitle": "Cloud Storage",
      "badges": ["aws", "gcp", "azure", "kubernetes"] },
    { "id": "hub", "kind": "hub", "x":  40, "y": 110, "w": 240, "h": 150,
      "header": "HUB", "title": "Hub", "subtitle": "Monitor and analyse", "badges": ["kubernetes"] },
    { "id": "edge-vault", "kind": "vault", "x": 460, "y": 320, "w": 240, "h": 150,
      "header": "VAULT SOURCE", "title": "Vault", "subtitle": "Edge Storage",
      "badges": ["minio", "kubernetes"] },
    { "id": "agent-1", "kind": "agent", "x": 860, "y":  60, "w": 260, "h": 150,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream", "badges": ["docker", "linux", "raspberrypi", "kubernetes"] },
    { "id": "agent-2", "kind": "agent", "x": 860, "y": 235, "w": 260, "h": 150,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream", "badges": ["docker", "linux", "raspberrypi", "kubernetes"] },
    { "id": "agent-3", "kind": "agent", "x": 860, "y": 410, "w": 260, "h": 150,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream", "badges": ["docker", "linux", "raspberrypi", "kubernetes"] }
  ],
  "connections": [
    { "from": "cloud-vault", "to": "hub", "fromSide": "top", "toSide": "bottom" },
    { "from": "edge-vault", "to": "cloud-vault", "fromSide": "left", "toSide": "right", "kind": "thick", "label": "Forwarding" },
    { "from": "agent-1", "to": "edge-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-2", "to": "edge-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-3", "to": "edge-vault", "fromSide": "left", "toSide": "right" }
  ]
}
{{< /rete >}}

Forwarding can be configured in two modes: continuous forwarding and on-demand recording.

## Continuous forwarding

Every recording uploaded through an account with the integration is marked for
forwarding. A background worker streams it to the configured destination Vault
and records completion on the source media row.

## On demand forwarding

Recordings remain in the source Vault. Vault sends recording metadata to Hub,
where the item appears as **Recording available on demand**. When a Hub user
requests the recording, Hub publishes a `forward-recordings` command over MQTT
with the exact source media ID. The source Vault then marks that media for the
same forwarding worker used by continuous mode.

On-demand publication sends recording metadata only. It does not transfer media
bytes before Hub requests the recording.

## Configuration

Go to the integrations page, and click (+ Add Integration). Select the Kerberos Vault option, and choose on-demand or continuous forwarding.

Provide:

- **URL**: the destination Vault API URL.
- **Provider**: the destination provider name.
- **Access key** and **Secret access key**: credentials for a destination Vault
  account assigned to that provider.

For on-demand mode, also provide the Hub URL, Hub public key, and Hub username.

{{< figure src="vault-forwarding.gif" alt="Two forwarding modes continuous and on demand." caption="Two forwarding modes continuous and on demand." class="stretch">}}

After saving the integration, assign it to the source
[account](/docs/vault/accounts/). Only recordings uploaded through an account
that lists the integration are eligible for forwarding.

{{< figure src="vault-activate-forward.gif" alt="Enable the integration for your account." caption="Enable the integration for your account." class="stretch">}}

## On-demand runtime settings

Set these variables on the source Vault:

- `VAULT_ID`: a stable identifier shared by all replicas of the same logical
  Vault. Configure it explicitly; the generated fallback changes after restart.
- `MQTTURI`: the MQTT broker connection string used for Hub commands.
- `FORWARDING_CONCURRENCY_RATE`: positive worker concurrency, default `20`.

The Hub public key determines the subscription topic. Vault accepts only a
version `1.0` `forward-recordings` command addressed to its own `VAULT_ID` and
containing exact `source_media_id` values. Duplicate MQTT delivery is safe:
pending, active, and completed rows are not queued twice.

The current runtime starts only the first enabled on-demand integration. Keep a
single enabled on-demand integration per source Vault.

## Delivery behavior

Forwarding uses resumable TUS uploads when supported and falls back to the
legacy whole-file upload endpoint. Failed transfers remain pending and are
retried. `FORWARDING_CONCURRENCY_RATE` applies to continuous and on-demand
workloads.

On-demand MQTT identifies what to copy; it does not contain storage credentials.
Protect the broker, Hub key, and destination Vault credentials, and keep
`VAULT_ID` stable across upgrades and replica restarts.
