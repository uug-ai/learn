---
title: "Connect to Hub"
description: "Link an Agent to Kerberos Hub for a central overview, live view and alerts."
lead: "Link an Agent to Kerberos Hub for a central overview, live view and alerts."
date: 2026-10-31T00:00:00+00:00
lastmod: 2026-10-31T00:00:00+00:00
draft: false
images: []
weight: 206
toc: true
connects:
  - page: /docs/hub/configuration#assign-an-agent
    title: Assign an Agent
    why: Find the keys in Hub and assign the Agent to a site.
  - page: /docs/hub/livestream
    why: Watch the Agent live from Hub, over WebRTC, HLS or MQTT snapshots.
  - page: /docs/hub/notifications
    why: Get alerted when the Agent records something, or goes offline.
---

An Agent works on its own, but you have to open each Agent's web interface separately, usually from inside the local network. Connect it to [Kerberos Hub](/docs/hub/first-things-first) to see all your Agents in one place: their status, live view, recordings and alerts, from anywhere.

This page covers the Agent side of the connection. Where to find the keys, and how to organise Agents into sites and groups, is explained in the Hub docs.

## What the connection does

An Agent and Hub are connected in two separate ways. You can set up either one, but most installations use both:

| Connection | What it carries | Where you set it |
| --- | --- | --- |
| **Hub** | Heartbeats and status, live view, camera control (PTZ, ONVIF) and remote configuration, through Hub's API and an MQTT broker. | The **Hub** block |
| **Persistence** | The recordings themselves. | The **Persistence** block |

The Agent only ever makes outbound connections, so you don't need to open ports on the network where it runs.

## Before you start

From Hub you need:

- the **Hub API URL**, for example `https://api.hub.example.com`. The SaaS offering uses its own URL, which is the default;
- the **public key** and **private key** that link Agents to your Hub account. [Assign an Agent](/docs/hub/configuration#assign-an-agent) shows where Hub displays them;
- optionally, the ID of the **site** the Agent belongs to. See [Sites](/docs/hub/configuration#sites).

## Configure the Hub connection

Open the Agent's web interface and go to **Settings → Persistence**.

1. In the **Hub** block, fill in the **Hub API URL**, **Public key**, **Private key** and, optionally, **Site**.
2. Leave **Encryption** on, so all traffic between the Agent and Hub is encrypted.
3. Select **Verify Connection**, then save.

The Agent starts sending heartbeats, and shows up in Hub as soon as the first one arrives.

Live view and camera control also use the **MQTT** broker and the **STUN/TURN** servers under **Settings → Streaming**. The defaults point to the Kerberos-hosted services. For self-hosted Hub, use the broker and TURN server of your installation; [Live view](/docs/hub/livestream) explains how the pieces fit together, and [Set up WebRTC live view with TURN](/tutorials/hub/setup-webrtc-turn/) walks through running your own TURN server.

## Choose where recordings go

Hub doesn't receive recordings over the Hub connection. Choose how they reach Hub in the **Persistence** block:

- **Kerberos Hub**: the Agent uploads to the storage managed by Hub. Use this with the Hub SaaS offering.
- **Kerberos Vault**: the Agent uploads to your own Vault, and Vault passes each recording on to Hub. Use this with self-hosted Hub, or whenever recordings must stay on your own storage. Follow [Connect to Vault](/docs/agent/connect-to-vault), and make sure the **Directory** equals your Hub username.

## Configure with environment variables

| Variable | Setting |
| --- | --- |
| `AGENT_HUB_URI` | Hub API URL |
| `AGENT_HUB_KEY` | Public key |
| `AGENT_HUB_PRIVATE_KEY` | Private key |
| `AGENT_HUB_SITE` | Site |
| `AGENT_HUB_ENCRYPTION` | Encryption (`true` by default) |
| `AGENT_CLOUD` | Persistence: `s3` for Kerberos Hub, `kstorage` for Kerberos Vault |
| `AGENT_MQTT_URI`, `AGENT_MQTT_USERNAME`, `AGENT_MQTT_PASSWORD` | MQTT broker |
| `AGENT_STUN_URI`, `AGENT_TURN_URI`, `AGENT_TURN_USERNAME`, `AGENT_TURN_PASSWORD` | WebRTC servers for live view |

Every Agent connected to the same broker needs its own `AGENT_KEY`. The Agent uses it as its MQTT client ID, and two Agents with the same key keep disconnecting each other. The [Agent repository](https://github.com/kerberos-io/agent#configure-with-environment-variables) lists every variable.

## What you can do in Hub

Once connected, the Agent appears in Hub, where you can:

- watch it in [Live view](/docs/hub/livestream) and on videowalls,
- browse and search its [recordings](/docs/hub/recordings), with machine learning detections from the [pipeline](/docs/hub/pipeline),
- control a PTZ camera through [ONVIF](/docs/hub/onvif), once ONVIF is enabled in the Agent's camera settings,
- check a recording's signature with [MP4 verification](/docs/hub/mp4-verification),
- get [notifications](/docs/hub/notifications) when it records something or stops responding.

## Troubleshooting

- **The Agent doesn't appear in Hub.** Check the Hub API URL and both keys. Make sure the Agent isn't in offline mode (`AGENT_OFFLINE`), which blocks all outbound connections and hides the Hub block.
- **The Agent is online but live view doesn't start.** Check the MQTT broker, and the TURN server if the Agent is behind a strict firewall. See [Live view](/docs/hub/livestream).
- **The Agent is online but no recordings appear.** Check the **Persistence** block. With Vault, check the directory and Vault's Hub integration, as described in [Connect to Vault](/docs/agent/connect-to-vault#using-vault-together-with-hub).
