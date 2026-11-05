---
title : "Prologue"
description: "The ecosystem of Agent, Factory, Vault and Hub, and how it grew from an open source recording project."
lead: "And so it began."
date: 2020-10-06T08:48:45+00:00
lastmod: 2020-10-06T08:48:45+00:00
draft: false
images: []
weight: 1
---

The ecosystem brings together four products, Agent, Factory, Vault and Hub, to deploy, monitor and scale video workflows across camera fleets. It grew out of **Kerberos.io**, the open source project where it all began.

## Where it started

The ecosystem started in 2014 with Kerberos.io, an open source project around a single application: the [Agent](/docs/agent/). An Agent connects to one IP camera, records its stream and detects what happens in front of it, on whichever machine you choose. The Agent is still open source today, and it is still the foundation of every deployment: one Agent per camera.

## From project to platform

As more people and organisations ran Agents, often hundreds or thousands at a time, they needed to deploy them, keep their recordings and watch over them in one place. Factory, Vault and Hub extend the open source Agent with fleet management, storage and a shared operator workspace.

## The platform

{{< iso-figure figure="ecosystem" alt="The ecosystem. Factory deploys an Agent for every camera; the Agents upload their recordings to Vault and send their events to Hub, and Hub plays recordings back from Vault. Each product links to its documentation." caption="Click a product to open its documentation." >}}

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
