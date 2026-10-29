---
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

{{< iso-figure figure="hub" alt="Isometric illustration of Kerberos Hub. Three cameras on a site are wired to an Agent, which sends each event to Hub. Hub's ingest, analyse and notify stages light up in turn, then the detection appears on the operators' videowall and as an alert on a phone." caption="How an event moves from a camera on site, through Hub, to the people watching." >}}

## How Agent works

1. **Connect a camera.** Configure the camera stream in your Agent. Each Agent looks after one camera, so you can start small and add more as your installation grows.
2. **Record at the edge.** Choose motion-based or continuous recording, adjust regions of interest and time windows, and keep recordings on the Agent's local disk. Use its web interface to watch live video and browse past events.
3. **Connect the wider platform.** Send recordings to [Kerberos Vault]({{< relref "/docs/vault" >}}) for storage on your own infrastructure, use [Kerberos Hub]({{< relref "/docs/hub" >}}) for a central view, or let [Factory]({{< relref "/docs/factory" >}}) deploy and configure many Agents on Kubernetes.

An Agent can run on its own. Its web interface and APIs let you configure and integrate it without installing the rest of the platform.

## Where to start

- [First things first]({{< relref "/docs/agent/first-things-first" >}}): what an Agent does and how it fits into the platform.
- [Getting started]({{< relref "/docs/agent/getting-started" >}}): a tour of live views, recordings and settings.
- [Installation]({{< relref "/docs/agent/installation" >}}): deploy your first Agent.
