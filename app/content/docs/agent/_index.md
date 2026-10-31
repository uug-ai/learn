---
podcast: agent
title: "Agent"
description: "Record and manage a camera stream, right where it runs."
lead: "Record and manage a camera stream, right where it runs."
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-10-29T11:43:28+00:00
draft: false
images: []
weight: 4
sidebar:
  product: agent
  topicGroup: Topics
  introductoryPages:
    - first-things-first
    - getting-started
    - installation
---

Kerberos Agent is the recording service that runs next to, or on, your camera. Each Agent handles one camera stream, records motion or continuous footage, and gives you a web interface for live views, recordings and settings. Start with a single Agent and add the other Kerberos products when you need central management, shared storage or an overview across sites.

{{< iso-figure figure="agent-link" alt="Isometric illustration of Kerberos Agent. A camera streams RTSP to the machine that runs its Agent. The camera turns through bullet, dome, PTZ and turret models, and the machine through a Raspberry Pi, a mini PC with Docker, a laptop with Docker and a server with Kubernetes." caption="One Agent per camera stream, on whichever camera and machine you choose." >}}

## How Agent works

1. **Connect a camera.** Configure the camera stream in your Agent. Each Agent looks after one camera, so you can start small and add more as your installation grows.
2. **Record at the edge.** Choose motion-based or continuous recording, adjust regions of interest and time windows, and keep recordings on the Agent's local disk. Use its web interface to watch live video and browse past events.
3. **Connect the wider platform.** Send recordings to [Kerberos Vault](/docs/vault) for storage on your own infrastructure, use [Kerberos Hub](/docs/hub) for a central view, or let [Factory](/docs/factory) deploy and configure many Agents on Kubernetes.

An Agent can run on its own. Its web interface and APIs let you configure and integrate it without installing the rest of the platform. When you're ready, [Connect to Vault](/docs/agent/connect-to-vault) and [Connect to Hub](/docs/agent/connect-to-hub) explain how to link it.

## Where to start

- [First things first](/docs/agent/first-things-first): what an Agent does and how it fits into the platform.
- [Getting started](/docs/agent/getting-started): a tour of live views, recordings and settings.
- [Installation](/docs/agent/installation): deploy your first Agent.
