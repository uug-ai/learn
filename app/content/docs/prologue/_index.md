---
title : "Prologue"
description: "Augment Vision, the company behind Kerberos.io, and how the platform grew from one open source Agent."
lead: "And so it began."
date: 2020-10-06T08:48:45+00:00
lastmod: 2020-10-06T08:48:45+00:00
draft: false
images: []
weight: 1
---

**Kerberos.io** is developed by **Augment Vision** (UUG.AI), the company behind the project. It started as a single open source application and has grown into a platform to deploy, monitor and scale video and vision AI, from one camera to thousands.

## Where it started

Kerberos.io began in 2014 as an open source project: the [Kerberos Agent](/docs/agent/). An Agent connects to one IP camera, records its stream and detects what happens in front of it, on whichever machine you choose. The Agent is still open source today, and it is still the foundation of every deployment: one Agent per camera.

## Who is behind it

As more people and organisations ran Agents, often hundreds or thousands at a time, they needed tools to deploy them, keep their recordings and watch over them in one place. Augment Vision now backs Kerberos.io: it maintains the open source Agent and builds the products that grow around it.

## The platform

{{< iso-figure figure="ecosystem" alt="The Kerberos.io platform. Factory deploys an Agent for every camera; the Agents upload their recordings to Vault and send their events to Hub, and Hub plays recordings back from Vault. Each product links to its documentation." caption="Click a product to open its documentation." >}}

- **[Agent](/docs/agent/)** records and analyses one camera stream, on the machine you choose.
- **[Factory](/docs/factory/)** deploys an Agent for every camera onto your Kubernetes cluster and manages them with shared settings.
- **[Vault](/docs/vault/)** stores recordings in your own storage, such as S3, Azure or Ceph, and makes them available for analysis.
- **[Hub](/docs/hub/)** brings it together for your operators: live view, playback, alerts and workflows.

Start with a single Agent and add Factory, Vault and Hub as your deployment grows. Each runs as containers on Docker or Kubernetes, on-premise, hybrid or in the cloud, and your recordings stay in storage you own.

## Where to go next

- [Quick start](/docs/prologue/quick-start/): run your first Agent.
- [How it works](/docs/prologue/how/): how the parts fit together.
- [Deployments](/docs/prologue/deployments/): architectures from a single camera to an enterprise landscape.
- [Mission](/docs/prologue/mission/): why the project exists.
