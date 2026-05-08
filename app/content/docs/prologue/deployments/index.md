---
title: "Deployments"
description: "Kerberos.io deployments and examples"
lead: "Kerberos.io deployments and examples"
date: 2020-10-06T08:48:57+00:00
lastmod: 2020-10-06T08:48:57+00:00
draft: false
images: []
menu:
  docs:
    parent: "prologue"
weight: 103
toc: true
---

There is no good or bad deployment. All the architectual decisions you make, should focus on the goals of your project and what you or your customer would like to achieve.

In this section we will explain the most common use cases and best practices, which might help you to define the architecture that fit your needs.

> If this is the first page you visit, have a look at the [introduction page](/) before moving on.

## Where to start?

Starting something new is not easy, there is always a steep learning curve. While setting up the different Kerberos.io components, you might ask yourself:

- How should I deploy these so called, [Kerberos Agents](/agent/first-things-first/)?
- Do I setup a [Kerberos Vault](/vault/first-things-first/) next to my [Kerberos Agents](/agent/first-things-first/) or in a managed cloud?
- Can I self-host [Kerberos Hub](/hub/first-things-first/) or do I need to install it in managed cloud?
- And probably many more questions..

We will discuss some of the most common setups we have seen, however this doesn't mean that your setup will not work if it's not shown as identical in the sections below.

{{< rete caption="The Kerberos.io solution stack" alt="The Kerberos.io solution stack" height="540" >}}
{
  "groups": [
    { "id": "capture",     "label": "Camera processing",  "x":    0, "y": 20, "w": 460, "h": 460 },
    { "id": "persistence", "label": "Persistence",        "x":  560, "y": 20, "w": 320, "h": 460 },
    { "id": "analyse",     "label": "Analyse and monitor","x":  980, "y": 20, "w": 320, "h": 460 }
  ],
  "nodes": [
    { "id": "cam-1", "kind": "camera", "x":  40, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x":  40, "y": 290, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "agent-1", "kind": "agent", "x": 240, "y":  70, "w": 200, "h": 150,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream", "badges": ["docker", "linux", "raspberrypi", "kubernetes"] },
    { "id": "agent-2", "kind": "agent", "x": 240, "y": 280, "w": 200, "h": 150,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream", "badges": ["docker", "linux", "raspberrypi", "kubernetes"] },
    { "id": "vault", "kind": "vault", "x": 600, "y":  80, "w": 240, "h": 150,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface", "badges": ["kubernetes"] },
    { "id": "object-storage", "kind": "storage", "x": 600, "y": 290, "w": 240, "h": 150,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud / Edge",
      "badges": ["minio", "ceph", "aws", "gcp", "azure"] },
    { "id": "hub", "kind": "hub", "x": 1020, "y": 185, "w": 240, "h": 150,
      "header": "HUB", "title": "Hub", "subtitle": "Monitor and analyse", "badges": ["kubernetes"] }
  ],
  "connections": [
    { "from": "cam-1", "to": "agent-1", "fromSide": "right", "toSide": "left" },
    { "from": "cam-2", "to": "agent-2", "fromSide": "right", "toSide": "left" },
    { "from": "agent-1", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "vault", "to": "object-storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "vault", "to": "hub", "fromSide": "right", "toSide": "left" }
  ]
}
{{< /rete >}}

## Basic setup

If you are starting with a basic deployment - for example for your home - then you probably prefer to have it rather simple. In this case you can host one or more [Kerberos Agents](/agent/first-things-first) on a compute of choice, in the network you desire.

{{< rete caption="Basic setup: cameras connected directly to Kerberos Agents at the edge" alt="Basic Kerberos setup" height="540" >}}
{
  "groups": [
    { "id": "edge", "label": "Edge", "x": 0, "y": 20, "w": 880, "h": 760 }
  ],
  "nodes": [
    { "id": "cam-1", "kind": "camera", "x":  40, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x":  40, "y": 250, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "cam-3", "kind": "camera", "x":  40, "y": 420, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP://" },
    { "id": "cam-4", "kind": "camera", "x":  40, "y": 590, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 4", "subtitle": "RTSP://" },
    { "id": "agent-1", "kind": "agent", "x": 580, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream" },
    { "id": "agent-2", "kind": "agent", "x": 580, "y": 250, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream" },
    { "id": "agent-3", "kind": "agent", "x": 580, "y": 420, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream" },
    { "id": "agent-4", "kind": "agent", "x": 580, "y": 590, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 4", "subtitle": "Process stream" }
  ],
  "connections": [
    { "from": "cam-1", "to": "agent-1", "fromSide": "right", "toSide": "left" },
    { "from": "cam-2", "to": "agent-2", "fromSide": "right", "toSide": "left" },
    { "from": "cam-3", "to": "agent-3", "fromSide": "right", "toSide": "left" },
    { "from": "cam-4", "to": "agent-4", "fromSide": "right", "toSide": "left" }
  ]
}
{{< /rete >}}

In a home setup you'll probably rely on [`docker`](https://github.com/kerberos-io/agent/tree/master/deployments/docker#1-running-a-single-container) or [`a binary`](https://github.com/kerberos-io/agent/tree/master/deployments/snap) instead of [`kubernetes`](https://github.com/kerberos-io/agent/tree/master/deployments/kubernetes), mainly because of simplicity. However nothing is stopping you utilise Kubernetes for your local deployment.

## Extended setup

[Kerberos Agents](/agent/first-things-first) store recordings on the host system. You might want to have a more elegant and centralised storage setup. Run [Kerberos Vault](/vault/first-things-first/) next to your
[Kerberos Agents](/agent/first-things-first) and connect to an edge or cloud storage system such as S3, Minio, etc.

{{< rete caption="Extended setup: a Kerberos Vault at the edge centralises storage for the agents" alt="Extended Kerberos setup" height="540" >}}
{
  "groups": [
    { "id": "edge", "label": "Edge", "x": 0, "y": 20, "w": 1400, "h": 760 }
  ],
  "nodes": [
    { "id": "cam-1", "kind": "camera", "x":  40, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x":  40, "y": 250, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "cam-3", "kind": "camera", "x":  40, "y": 420, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP://" },
    { "id": "cam-4", "kind": "camera", "x":  40, "y": 590, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 4", "subtitle": "RTSP://" },
    { "id": "agent-1", "kind": "agent", "x": 460, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream" },
    { "id": "agent-2", "kind": "agent", "x": 460, "y": 250, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream" },
    { "id": "agent-3", "kind": "agent", "x": 460, "y": 420, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream" },
    { "id": "agent-4", "kind": "agent", "x": 460, "y": 590, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 4", "subtitle": "Process stream" },
    { "id": "edge-vault", "kind": "vault", "x": 800, "y": 325, "w": 240, "h": 130,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface" },
    { "id": "object-storage", "kind": "storage", "x": 1120, "y": 325, "w": 240, "h": 130,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud / Edge" }
  ],
  "connections": [
    { "from": "cam-1", "to": "agent-1", "fromSide": "right", "toSide": "left" },
    { "from": "cam-2", "to": "agent-2", "fromSide": "right", "toSide": "left" },
    { "from": "cam-3", "to": "agent-3", "fromSide": "right", "toSide": "left" },
    { "from": "cam-4", "to": "agent-4", "fromSide": "right", "toSide": "left" },
    { "from": "agent-1", "to": "edge-vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "edge-vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-3", "to": "edge-vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-4", "to": "edge-vault", "fromSide": "right", "toSide": "left" },
    { "from": "edge-vault", "to": "object-storage", "fromSide": "right", "toSide": "left" }
  ]
}
{{< /rete >}}

Similar to the basic installation, Kerberos Vault can be installed through [`docker`](https://github.com/kerberos-io/vault/tree/master/docker) and [`kubernetes`](https://github.com/kerberos-io/vault/tree/master/kubernetes). In this setup, [Kerberos Agents](/agent/first-things-first) are installed on a compute at the edge, next to a [Kerberos Vault](/vault/first-things-first/).

The advantage with [Kerberos Vault](/vault/first-things-first/) is that even if it's deployed at the edge, you can still target a cloud storage system like S3, GCP Storage, etc. Next to that the main advantage is speed, you typically setup an [Kerberos Agents](/agent/first-things-first) within 5 minutes, and a [Kerberos Vault](/vault/first-things-first/) installation within 30 minutes using `docker compose`.

When leveraging [Kubernetes](https://github.com/kerberos-io/vault/tree/master/kubernetes) it might take you a bit more time, as you'll need to create the relevant Kubernetes resources in the cluster.

## Hybrid setup

One of the most common setups is a hybrid setup, where you install the majority of the components in a managed cloud or your own private cloud.

The huge benefit of this approach is that your [Kerberos Agents](/agent/first-things-first) are installed next to the camera infrastructure, and ideally in the same network. This will bring latency and data transfer to a minimum.

{{< rete caption="Hybrid setup: Kerberos Agents at the edge connect to a Kerberos Vault and Kerberos Hub running in the cloud" alt="Hybrid Kerberos setup" height="540" >}}
{
  "groups": [
    { "id": "cloud", "label": "Cloud", "x":   0, "y": 20, "w": 360, "h": 760 },
    { "id": "edge",  "label": "Edge",  "x": 460, "y": 20, "w": 940, "h": 760 }
  ],
  "nodes": [
    { "id": "hub", "kind": "hub", "x":  60, "y":  80, "w": 240, "h": 130,
      "header": "HUB", "title": "Hub", "subtitle": "Monitor and analyse" },
    { "id": "cloud-vault", "kind": "vault", "x":  60, "y": 325, "w": 240, "h": 130,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface" },
    { "id": "object-storage", "kind": "storage", "x":  60, "y": 570, "w": 240, "h": 130,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud Storage" },
    { "id": "cam-1", "kind": "camera", "x":  980, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x":  980, "y": 250, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "cam-3", "kind": "camera", "x":  980, "y": 420, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP://" },
    { "id": "cam-4", "kind": "camera", "x":  980, "y": 590, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 4", "subtitle": "RTSP://" },
    { "id": "agent-1", "kind": "agent", "x": 500, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream" },
    { "id": "agent-2", "kind": "agent", "x": 500, "y": 250, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream" },
    { "id": "agent-3", "kind": "agent", "x": 500, "y": 420, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream" },
    { "id": "agent-4", "kind": "agent", "x": 500, "y": 590, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 4", "subtitle": "Process stream" }
  ],
  "connections": [
    { "from": "cloud-vault", "to": "hub", "fromSide": "top", "toSide": "bottom" },
    { "from": "cloud-vault", "to": "object-storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "cam-1", "to": "agent-1", "fromSide": "left", "toSide": "right" },
    { "from": "cam-2", "to": "agent-2", "fromSide": "left", "toSide": "right" },
    { "from": "cam-3", "to": "agent-3", "fromSide": "left", "toSide": "right" },
    { "from": "cam-4", "to": "agent-4", "fromSide": "left", "toSide": "right" },
    { "from": "agent-1", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-2", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-3", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-4", "to": "cloud-vault", "fromSide": "left", "toSide": "right" }
  ]
}
{{< /rete >}}

The [Kerberos Vault](/vault/first-things-first/) is installed in the cloud together with some scalable cloud storage. The [Kerberos Hub](/hub/first-things-first/) is installed in the same or other cloud as the [Kerberos Vault](/vault/first-things-first/).

The benefit of this deployment is that you only need to install [Kerberos Vault](/vault/first-things-first/) and [Kerberos Hub](/hub/first-things-first/) once. Most of the work is setting up the [Kerberos Agents](/agent/first-things-first) at your customers and/or sites.

Another benefit is low latency and bandwidth consumption, as we have compute running at the edge for the [Kerberos Agents](/agent/first-things-first). Only data (recordings) that are relevant will be send over the network to [Kerberos Vault](/vault/first-things-first/). A possible disadvantage of this setup is that you will require some hardware at the site, although the maintenance is low it does come with a cost; have a look at [Cloud setup](/prologue/deployments/#cloud-setup) instead.

## Cloud setup

With this setup we are moving from a Hybrid setup to a complete Cloud approach. As described before, it might be a challenge to host hardware at the edge, as you or your customers don't want to invest in additional hardware. Therefore it might be an option to move your [Kerberos Agents](/agent/first-things-first) to the cloud, and leverage a secure connection between the cameras at the edge, and the [Kerberos Agents](/agent/first-things-first) in the cloud.

{{< rete caption="Cloud setup: only the cameras stay at the edge, every other component runs in the cloud over a secure VPN" alt="Cloud Kerberos setup" height="540" >}}
{
  "groups": [
    { "id": "cloud", "label": "Cloud", "x":   0, "y": 20, "w": 940, "h": 760 },
    { "id": "edge",  "label": "Edge",  "x": 1040, "y": 20, "w": 280, "h": 760 }
  ],
  "nodes": [
    { "id": "hub", "kind": "hub", "x":  60, "y":  80, "w": 240, "h": 130,
      "header": "HUB", "title": "Hub", "subtitle": "Monitor and analyse" },
    { "id": "cloud-vault", "kind": "vault", "x":  60, "y": 325, "w": 240, "h": 130,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface" },
    { "id": "object-storage", "kind": "storage", "x":  60, "y": 570, "w": 240, "h": 130,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud Storage" },
    { "id": "agent-1", "kind": "agent", "x": 580, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream" },
    { "id": "agent-2", "kind": "agent", "x": 580, "y": 250, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream" },
    { "id": "agent-3", "kind": "agent", "x": 580, "y": 420, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream" },
    { "id": "agent-4", "kind": "agent", "x": 580, "y": 590, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 4", "subtitle": "Process stream" },
    { "id": "cam-1", "kind": "camera", "x": 1080, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x": 1080, "y": 250, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "cam-3", "kind": "camera", "x": 1080, "y": 420, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP://" },
    { "id": "cam-4", "kind": "camera", "x": 1080, "y": 590, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 4", "subtitle": "RTSP://" }
  ],
  "connections": [
    { "from": "cloud-vault", "to": "hub", "fromSide": "top", "toSide": "bottom" },
    { "from": "cloud-vault", "to": "object-storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "agent-1", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-2", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-3", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-4", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "cam-1", "to": "agent-1", "fromSide": "left", "toSide": "right", "kind": "thick", "label": "VPN" },
    { "from": "cam-2", "to": "agent-2", "fromSide": "left", "toSide": "right", "kind": "thick", "label": "VPN" },
    { "from": "cam-3", "to": "agent-3", "fromSide": "left", "toSide": "right", "kind": "thick", "label": "VPN" },
    { "from": "cam-4", "to": "agent-4", "fromSide": "left", "toSide": "right", "kind": "thick", "label": "VPN" }
  ]
}
{{< /rete >}}

The main advantage is here, is that you'll avoid any extra hardware costs on site. On the otherhand you'll need a secure connection, which might already be available, to setup a remote connection between the camera streams at the edge and the [Kerberos Agents](/agent/first-things-first) in the cloud.

A noticable disadvantage is that a continuous stream of data is send over the network for each camera stream. Which might become more expensive than buying the additional hardware at the edge. Build up a usecase, of what setup makes sense for which customer.

> In the end you might go with a mixed hybrid and cloud setup depending on the use case and customer requirements.

## SAAS setup

As described above you might mix a Hybrid and Cloud setup, in the end you decide where to host your [Kerberos Agents](/agent/first-things-first). Within the SAAS setup, you'll utilise our [Kerberos Hub SAAS](/hub/first-things-first/) edition, and connect your [Kerberos Agents](/agent/first-things-first) and [Kerberos Vault](/vault/first-things-first/).

{{< rete caption="SAAS setup: Kerberos Hub is operated by us, while you keep ownership of the cameras, agents and vault" alt="SAAS Kerberos setup" height="540" >}}
{
  "groups": [
    { "id": "saas",        "label": "SAAS (managed)", "x":    0, "y":  20, "w": 320, "h": 760 },
    { "id": "cloud-vault-grp", "label": "Cloud",      "x":  420, "y":  20, "w": 320, "h": 760 },
    { "id": "cloud-edge",  "label": "Cloud",          "x":  840, "y":  20, "w": 700, "h": 370 },
    { "id": "edge",        "label": "Edge",           "x":  840, "y": 410, "w": 700, "h": 370 }
  ],
  "nodes": [
    { "id": "hub", "kind": "hub", "x":  40, "y": 325, "w": 240, "h": 130,
      "header": "HUB", "title": "Hub", "subtitle": "Monitor and analyse" },
    { "id": "cloud-vault", "kind": "vault", "x": 460, "y": 325, "w": 240, "h": 130,
      "header": "VAULT", "title": "Vault", "subtitle": "Cloud Storage" },
    { "id": "agent-1", "kind": "agent", "x": 880, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream" },
    { "id": "agent-2", "kind": "agent", "x": 880, "y": 230, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream" },
    { "id": "agent-3", "kind": "agent", "x": 880, "y": 470, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream" },
    { "id": "agent-4", "kind": "agent", "x": 880, "y": 620, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 4", "subtitle": "Process stream" },
    { "id": "cam-1", "kind": "camera", "x": 1300, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x": 1300, "y": 230, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "cam-3", "kind": "camera", "x": 1300, "y": 470, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP://" },
    { "id": "cam-4", "kind": "camera", "x": 1300, "y": 620, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 4", "subtitle": "RTSP://" }
  ],
  "connections": [
    { "from": "cloud-vault", "to": "hub", "fromSide": "left", "toSide": "right" },
    { "from": "agent-1", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-2", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-3", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-4", "to": "cloud-vault", "fromSide": "left", "toSide": "right" },
    { "from": "cam-1", "to": "agent-1", "fromSide": "left", "toSide": "right" },
    { "from": "cam-2", "to": "agent-2", "fromSide": "left", "toSide": "right" },
    { "from": "cam-3", "to": "agent-3", "fromSide": "left", "toSide": "right" },
    { "from": "cam-4", "to": "agent-4", "fromSide": "left", "toSide": "right" }
  ]
}
{{< /rete >}}

The main advantage of this setup is that you have full control over your [Kerberos Agents](/agent/first-things-first) and [Kerberos Vault](/vault/first-things-first/), but consult the Kerberos.io team for visualizing your video landscape through [our Kerberos Hub SAAS](/hub/first-things-first/) edition.

This means that you, and only you, own the data and at the same time doesn't have to maintain, install and configure [Kerberos Hub](/hub/first-things-first/).

## Chained setup

If you need more and better redundancy then the Chained setup might be of interest. In this setup we move data (recordings) from one [Kerberos Vault](/vault/first-things-first/) to another [Kerberos Vault](/vault/first-things-first/).

{{< rete caption="Kerberos Vault chaining" alt="Kerberos Vault chaining" height="640" >}}
{
  "groups": [
    { "id": "cloud", "label": "Cloud", "x":   0, "y": 20, "w": 320, "h": 700 },
    { "id": "edge",  "label": "Edge",  "x": 420, "y": 20, "w": 720, "h": 700 }
  ],
  "nodes": [
    { "id": "hub", "kind": "hub", "x":  40, "y":  80, "w": 240, "h": 130,
      "header": "HUB", "title": "Hub", "subtitle": "Monitor and analyse" },
    { "id": "cloud-vault", "kind": "vault", "x":  40, "y": 290, "w": 240, "h": 130,
      "header": "VAULT TARGET", "title": "Vault", "subtitle": "Cloud" },
    { "id": "cloud-storage", "kind": "storage", "x":  40, "y": 500, "w": 240, "h": 130,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud" },
    { "id": "edge-vault", "kind": "vault", "x": 460, "y": 290, "w": 240, "h": 130,
      "header": "VAULT SOURCE", "title": "Vault", "subtitle": "Edge" },
    { "id": "edge-storage", "kind": "storage", "x": 460, "y": 500, "w": 240, "h": 130,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Edge" },
    { "id": "agent-1", "kind": "agent", "x": 860, "y":  80, "w": 260, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream" },
    { "id": "agent-2", "kind": "agent", "x": 860, "y": 290, "w": 260, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream" },
    { "id": "agent-3", "kind": "agent", "x": 860, "y": 500, "w": 260, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream" }
  ],
  "connections": [
    { "from": "cloud-vault", "to": "hub", "fromSide": "top", "toSide": "bottom" },
    { "from": "cloud-vault", "to": "cloud-storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "edge-vault", "to": "edge-storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "edge-vault", "to": "cloud-vault", "fromSide": "left", "toSide": "right", "kind": "thick", "label": "Forwarding" },
    { "from": "agent-1", "to": "edge-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-2", "to": "edge-vault", "fromSide": "left", "toSide": "right" },
    { "from": "agent-3", "to": "edge-vault", "fromSide": "left", "toSide": "right" }
  ]
}
{{< /rete >}}

The advantage of [chaining (or forwarding)](/vault/forwarding/) is that you create a cache between two environments. Shown on the architecture above data is first stored at an edge [Kerberos Vault](/vault/first-things-first/), and synchronised with a cloud [Kerberos Vault](/vault/first-things-first/). When the connection goes down between the two [Kerberos Vaults](/vault/first-things-first/), the data will still be stored in the edge [Kerberos Vault](/vault/first-things-first/), and synced to the cloud [Kerberos Vault](/vault/first-things-first/) once the connection is back up.

Another advantage is that [chaining (or forwarding)](/vault/forwarding/) can be configured in different modes, whereas the previously mentioned advantage is illustrating `continuous` forwarding, it's also possible to have `ondemand` forwarding. In the latter, the user or administrators can decide programmatically or through our [Kerberos Hub](/hub/first-things-first/) which recordings needs to be synchronised to the cloud [Kerberos Vault](/vault/first-things-first/). This allows us to only send the information we prefer to our cloud [Kerberos Vault](/vault/first-things-first/).
