---
podcast: factory
title: "Factory"
description: "Deploy, configure and maintain your Agents from one place."
lead: "Deploy, configure and maintain your Agents from one place."
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-10-29T11:43:28+00:00
draft: false
images: []
weight: 5
sidebar:
  product: factory
  topicGroup: Topics
  introductoryPages:
    - first-things-first
    - getting-started
    - installation
---

Factory is the web application for deploying and managing [Kerberos Agents]({{< relref "/docs/agent" >}}) on Kubernetes. Instead of creating and maintaining every Agent by hand, you add camera streams, apply shared settings and manage deployments from one interface. The Agents keep doing the recording; Factory helps you run them as your camera estate grows.

{{< iso-figure figure="factory" alt="Isometric illustration of Kerberos Factory. Four cameras of different kinds stand on a site. Factory finds each camera in turn and builds that camera's own Agent; a press stamps the global settings onto it and a conveyor takes it to one of three cluster nodes. There the Agent runs as a pod and the camera's stream runs to it." caption="How Factory gives every camera its own Agent and runs it on your cluster." >}}

## How Factory manages your Agents

1. **Connect your cluster.** Run Factory in the Kubernetes cluster where you want to manage Agents. Its interface gives you an overview of the Agents, nodes and pods in that cluster.
2. **Add your cameras.** Enter a camera stream or discover cameras through ONVIF. Factory creates a Kubernetes deployment for each Agent and lets you tune its recording, streaming and storage settings.
3. **Maintain the fleet.** Apply global settings, adjust individual Agents, upgrade or restart deployments, and follow their logs from the same interface.

The [Configuration & engines]({{< relref "/docs/factory/configuration-and-engines" >}}) guide explains where Factory stores its settings and how it schedules Agents.

## Where to start

- [First things first]({{< relref "/docs/factory/first-things-first" >}}): why Factory exists and what it manages.
- [Getting started]({{< relref "/docs/factory/getting-started" >}}): a tour of cameras, cluster resources and configuration.
- [Installation]({{< relref "/docs/factory/installation" >}}): deploy Factory in your environment.
