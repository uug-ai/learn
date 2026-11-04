---
podcast: prologue-how
title: "How it works"
description: "From zero to a myriad of cameras"
lead: "From zero to a myriad of cameras"
date: 2020-10-06T08:48:57+00:00
lastmod: 2022-12-14T22:37:57+00:00
draft: false
images: ["camera.png"]
menu:
  docs:
    parent: "prologue"
weight: 102
toc: true
---

As described on the [introduction page](/docs/) and [mission statement](/docs/prologue/mission/), Kerberos.io has a strong vision and roadmap to help anyone on this planet to set up a video management platform to fit their needs. In this section we'll describe the different building blocks and illustrate how they complement and enrich each other, to build up an [ideal deployment model](/docs/prologue/deployments/).

## An overview

As shown below there are 3 critical steps in setting up a video management solution: camera processing, persisting recordings and analysing. Instead of building a single solution, which many other vendors have built, which covers those 3 functions, we have divided and conquered each role and responsibility in a stand-alone solution: [Agents](/docs/agent/first-things-first/), [Factory](/docs/factory/first-things-first/), [Vault](/docs/vault/first-things-first/) and [Hub](/docs/hub/first-things-first/).

{{< rete caption="The Kerberos.io solution stack" alt="Cameras feed Agents, optionally managed by Factory. Vault persists recordings to object storage and sends events to Hub for analysis." height="540" >}}
{
  "groups": [
    { "id": "capture", "label": "1. Camera processing - edge / cloud", "x": 0, "y": 20, "w": 540, "h": 520 },
    { "id": "persistence", "label": "2. Persistence - edge / cloud", "x": 620, "y": 20, "w": 300, "h": 520 },
    { "id": "analysis", "label": "3. Analyse - edge / cloud", "x": 1000, "y": 20, "w": 300, "h": 520 }
  ],
  "nodes": [
    { "id": "camera-1", "kind": "camera", "x": 30, "y": 230, "w": 180, "h": 120,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP stream" },
    { "id": "camera-2", "kind": "camera", "x": 30, "y": 390, "w": 180, "h": 120,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP stream" },
    { "id": "factory", "kind": "factory", "x": 280, "y": 60, "w": 230, "h": 130,
      "header": "ORCHESTRATE", "title": "Factory", "subtitle": "Manage on Kubernetes" },
    { "id": "agent-1", "kind": "agent", "x": 280, "y": 230, "w": 230, "h": 120,
      "header": "RECORD", "title": "Agent 1", "subtitle": "Process one camera" },
    { "id": "agent-2", "kind": "agent", "x": 280, "y": 390, "w": 230, "h": 120,
      "header": "RECORD", "title": "Agent 2", "subtitle": "Process one camera" },
    { "id": "vault", "kind": "vault", "x": 650, "y": 230, "w": 240, "h": 120,
      "header": "STORE", "title": "Vault", "subtitle": "Store and integrate" },
    { "id": "storage", "kind": "storage", "x": 650, "y": 390, "w": 240, "h": 120,
      "header": "OBJECT STORAGE", "title": "Storage backend", "subtitle": "Cloud / edge" },
    { "id": "hub", "kind": "hub", "x": 1030, "y": 230, "w": 240, "h": 120,
      "header": "ANALYSE", "title": "Hub", "subtitle": "Monitor and analyse" }
  ],
  "connections": [
    { "from": "camera-1", "to": "agent-1", "fromSide": "right", "toSide": "left" },
    { "from": "camera-2", "to": "agent-2", "fromSide": "right", "toSide": "left" },
    { "from": "factory", "to": "agent-1", "fromSide": "bottom", "toSide": "top", "kind": "dashed" },
    { "from": "factory", "to": "agent-2", "fromSide": "right", "toSide": "right", "offset": 40, "kind": "dashed" },
    { "from": "agent-1", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "vault", "to": "storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "vault", "to": "hub", "fromSide": "right", "toSide": "left", "label": "Events" }
  ]
}
{{< /rete >}}

Due to this approach the Kerberos.io solution stack can be scaled and deployed independently. This means you can deploy specific parts on-premise and other parts on a cloud provider, or the other way around. Next to that it also allows you to only install what you need: start small and grow over time when your business requires it.

## The Agent

At the foundation of any Kerberos.io deployment you'll find one or more [Agents](/docs/agent/first-things-first/). These Agents are installed [through various possibilities](https://github.com/kerberos-io/agent#how-to-run-and-deploy-a-kerberos-agent) and are deployed to a compute - VM, baremetal, Kubernetes cluster or other - of choice and connected to camera streams you control.

{{< rete caption="An Agent consists of both a backend and frontend." alt="A single Agent container contains an API server that processes its camera stream and a user interface that communicates with the API." height="320" >}}
{
  "groups": [
    { "id": "agent-container", "label": "Agent container - edge / cloud", "x": 270, "y": 20, "w": 560, "h": 240 }
  ],
  "nodes": [
    { "id": "camera", "kind": "camera", "x": 0, "y": 65, "w": 180, "h": 150,
      "header": "CAMERA", "title": "Camera", "subtitle": "RTSP stream" },
    { "id": "backend", "kind": "agent", "x": 300, "y": 65, "w": 220, "h": 150,
      "header": "BACKEND", "title": "API server", "subtitle": "Process and record" },
    { "id": "frontend", "kind": "frontend", "x": 580, "y": 65, "w": 220, "h": 150,
      "header": "FRONTEND", "title": "User interface", "subtitle": "Review and configure" }
  ],
  "connections": [
    { "from": "camera", "to": "backend", "fromSide": "right", "toSide": "left", "label": "RTSP" },
    { "from": "frontend", "to": "backend", "fromSide": "left", "toSide": "right", "label": "API" }
  ]
}
{{< /rete >}}

The Agent is responsible for a single camera. It is a piece of software which has two responsibilities: it acts as a user interface (frontend) and an API server (backend). The API processes the video stream, applies computer vision techniques, makes recordings and takes desired actions, e.g. a webhook. On the other hand, the user interface allows a user to review recordings and configure specific settings for the API.

The Agent itself is bundled in a single container, which includes all the dependencies and libraries required to have it running. For each camera, an Agent container will be created.

{{< rete caption="An Agent is monitoring a single camera stream." alt="One camera streams to one Agent container, deployed on Linux, Docker, Raspberry Pi or Kubernetes at the edge or in the cloud." height="380" >}}
{
  "groups": [
    { "id": "compute", "label": "Compute of your choice - edge / cloud", "x": 300, "y": 20, "w": 340, "h": 300 }
  ],
  "nodes": [
    { "id": "camera", "kind": "camera", "x": 0, "y": 70, "w": 200, "h": 200,
      "header": "CAMERA", "title": "Camera", "subtitle": "One RTSP stream" },
    { "id": "agent", "kind": "agent", "x": 340, "y": 70, "w": 260, "h": 200,
      "header": "RECORD", "title": "Agent", "subtitle": "One isolated container",
      "badges": ["linux", "docker", "raspberrypi", "kubernetes"] }
  ],
  "connections": [
    { "from": "camera", "to": "agent", "fromSide": "right", "toSide": "left", "label": "RTSP" }
  ]
}
{{< /rete >}}

The appealing thing with this approach is that you'll experience complete isolation. If one Agent goes down, it will not affect any other Agent (or camera). It also makes it elegant to scale.

## Scaling out Agents

Starting with a few Agents is straightforward, and scaling your Agents is not a complex task at all. You can benefit [from the different deployment models](https://github.com/kerberos-io/agent#how-to-run-and-deploy-a-kerberos-agent) we have documented, to start exploring and scaling your Kerberos.io configuration.

{{< rete caption="Scaling out your Agents is not a complex task." alt="Four cameras each connect to their own isolated Agent container. Scale with Docker or Kubernetes, or manage the Agents through Factory." height="620" >}}
{
  "groups": [
    { "id": "cameras", "label": "Cameras", "x": 0, "y": 20, "w": 260, "h": 640 },
    { "id": "agents", "label": "Agent containers - edge / cloud", "x": 380, "y": 20, "w": 340, "h": 640 }
  ],
  "nodes": [
    { "id": "camera-1", "kind": "camera", "x": 30, "y": 60, "w": 200, "h": 120,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP stream" },
    { "id": "camera-2", "kind": "camera", "x": 30, "y": 210, "w": 200, "h": 120,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP stream" },
    { "id": "camera-3", "kind": "camera", "x": 30, "y": 360, "w": 200, "h": 120,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP stream" },
    { "id": "camera-4", "kind": "camera", "x": 30, "y": 510, "w": 200, "h": 120,
      "header": "CAMERA", "title": "Camera 4", "subtitle": "RTSP stream" },
    { "id": "agent-1", "kind": "agent", "x": 420, "y": 60, "w": 260, "h": 120,
      "header": "RECORD", "title": "Agent 1", "subtitle": "Camera 1 only" },
    { "id": "agent-2", "kind": "agent", "x": 420, "y": 210, "w": 260, "h": 120,
      "header": "RECORD", "title": "Agent 2", "subtitle": "Camera 2 only" },
    { "id": "agent-3", "kind": "agent", "x": 420, "y": 360, "w": 260, "h": 120,
      "header": "RECORD", "title": "Agent 3", "subtitle": "Camera 3 only" },
    { "id": "agent-4", "kind": "agent", "x": 420, "y": 510, "w": 260, "h": 120,
      "header": "RECORD", "title": "Agent 4", "subtitle": "Camera 4 only" }
  ],
  "connections": [
    { "from": "camera-1", "to": "agent-1", "fromSide": "right", "toSide": "left" },
    { "from": "camera-2", "to": "agent-2", "fromSide": "right", "toSide": "left" },
    { "from": "camera-3", "to": "agent-3", "fromSide": "right", "toSide": "left" },
    { "from": "camera-4", "to": "agent-4", "fromSide": "right", "toSide": "left" }
  ]
}
{{< /rete >}}

Depending on your scenario [you choose one deployment over the other](https://github.com/kerberos-io/agent#how-to-run-and-deploy-a-kerberos-agent). There is no golden rule for the best deployment; you should move forward with your preference and experience. A few examples:

- If you are not into `kubernetes`, and you have only a dozen cameras, it might be more suitable to utilise `docker compose`.

- On the other hand if you have hundreds of cameras, and plan to install more over the next months and years, you will benefit from the elasticity `kubernetes` provides to you out of the box.

- If you would rather have non-technical users managing a video landscape, then [Factory](/docs/factory/first-things-first/) might be a good choice.

Whatever you choose, you can always migrate from one option to the other; it's just the engine on which the Agent containers are running that is updated.

## Storing data where you want

Agents are responsible for storing recordings and triggering events. By default all recordings are stored within the Agent container. This means that if the container stops, all your data will be lost. Luckily [there are a couple of techniques to persist](https://github.com/kerberos-io/agent#configure-and-persist-with-volume-mounts) the data outside the container, without losing any information.

In most cases, especially with a growing video landscape, it's more convenient to have a central storage system in place that scales, like Ceph, MinIO, or cloud storage like S3 and other blob storage. This is exactly where Vault comes into the picture.

{{< rete caption="Bring your own storage using Vault" alt="Multiple Agents upload recordings to Vault, which writes to your object storage and publishes recording events to a configured integration." height="540" >}}
{
  "groups": [
    { "id": "agents", "label": "Agent containers - edge / cloud", "x": 0, "y": 20, "w": 280, "h": 500 },
    { "id": "storage-services", "label": "Storage and integrations - edge / cloud", "x": 400, "y": 20, "w": 640, "h": 500 }
  ],
  "nodes": [
    { "id": "agent-1", "kind": "agent", "x": 30, "y": 60, "w": 220, "h": 120,
      "header": "RECORD", "title": "Agent 1", "subtitle": "Camera recordings" },
    { "id": "agent-2", "kind": "agent", "x": 30, "y": 210, "w": 220, "h": 120,
      "header": "RECORD", "title": "Agent 2", "subtitle": "Camera recordings" },
    { "id": "agent-3", "kind": "agent", "x": 30, "y": 360, "w": 220, "h": 120,
      "header": "RECORD", "title": "Agent 3", "subtitle": "Camera recordings" },
    { "id": "vault", "kind": "vault", "x": 430, "y": 210, "w": 240, "h": 120,
      "header": "STORE", "title": "Vault", "subtitle": "Receive recordings" },
    { "id": "storage", "kind": "storage", "x": 740, "y": 60, "w": 270, "h": 200,
      "header": "OBJECT STORAGE", "title": "Your storage", "subtitle": "Cloud / edge",
      "badges": ["minio", "ceph", "aws", "gcp", "azure"] },
    { "id": "integration", "kind": "amqp", "x": 740, "y": 340, "w": 270, "h": 140,
      "header": "INTEGRATION", "title": "Recording events", "subtitle": "Kafka / RabbitMQ / SQS" }
  ],
  "connections": [
    { "from": "agent-1", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "vault", "fromSide": "right", "toSide": "left", "label": "Upload" },
    { "from": "agent-3", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "vault", "to": "storage", "fromSide": "right", "toSide": "left", "label": "Store" },
    { "from": "vault", "to": "integration", "fromSide": "right", "toSide": "left", "label": "Events" }
  ]
}
{{< /rete >}}

[Vault](/docs/vault/first-things-first/) acts as an interface between your Agents and your storage system. It is responsible for receiving recordings from your Agents, and storing them in the storage system you've configured. By decoupling your Agents from [Vault](/docs/vault/first-things-first/), you can switch the underlying storage system on the fly, without having to reconfigure all your Agents.

Next to persisting your data in your storage system, [Vault](/docs/vault/first-things-first/) also acts as an event producer. Each time a recording is successfully stored in your storage system, it will send a message to the configured [Integration](/docs/vault/integrations/), such as Kafka, RabbitMQ, SQS, etc.

## Centralise and governance

Scaling your [Agents](/docs/agent/first-things-first/) and having a scalable and flexible storage system with [Vault](/docs/vault/first-things-first/) is a strong foundation. However, data that is just stored in your storage system doesn't bring any value.

Utilising that data to give your stakeholders insights through analytics, providing them with decent data governance and combining it with live data is where the magic starts.

{{< rete caption="Vault connected to Hub." alt="Agents upload recordings to Vault. Vault stores them in object storage and sends recording events to Hub for monitoring, analytics and governance." height="540" >}}
{
  "groups": [
    { "id": "agents", "label": "Agents - edge / cloud", "x": 0, "y": 20, "w": 280, "h": 350 },
    { "id": "persistence", "label": "Persistence - edge / cloud", "x": 400, "y": 20, "w": 320, "h": 520 },
    { "id": "analysis", "label": "Analyse - edge / cloud", "x": 840, "y": 20, "w": 320, "h": 350 }
  ],
  "nodes": [
    { "id": "agent-1", "kind": "agent", "x": 30, "y": 60, "w": 220, "h": 120,
      "header": "RECORD", "title": "Agent 1", "subtitle": "Camera recordings" },
    { "id": "agent-2", "kind": "agent", "x": 30, "y": 220, "w": 220, "h": 120,
      "header": "RECORD", "title": "Agent 2", "subtitle": "Camera recordings" },
    { "id": "vault", "kind": "vault", "x": 440, "y": 140, "w": 240, "h": 120,
      "header": "STORE", "title": "Vault", "subtitle": "Store and integrate" },
    { "id": "storage", "kind": "storage", "x": 430, "y": 310, "w": 260, "h": 200,
      "header": "OBJECT STORAGE", "title": "Your storage", "subtitle": "Cloud / edge",
      "badges": ["minio", "ceph", "aws", "gcp", "azure"] },
    { "id": "hub", "kind": "hub", "x": 870, "y": 100, "w": 260, "h": 200,
      "header": "ANALYSE", "title": "Hub", "subtitle": "Monitor and govern",
      "badges": ["kubernetes"] }
  ],
  "connections": [
    { "from": "agent-1", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "vault", "fromSide": "right", "toSide": "left" },
    { "from": "vault", "to": "storage", "fromSide": "bottom", "toSide": "top" },
    { "from": "vault", "to": "hub", "fromSide": "right", "toSide": "left", "label": "Events" }
  ]
}
{{< /rete >}}

[Hub](/docs/hub/first-things-first/) is our answer. It's a highly scalable platform to connect stakeholders to sites and groups of cameras. It comes with all the features you would imagine: live streaming, object detection, fine-grained user access, alerts and more.

[Hub](/docs/hub/first-things-first/) is built on top of Kubernetes and can be deployed, just like all the other components, where you want. It's composed of a series of microservices that can independently scale towards any demand, and utilises Open Source components such as Kafka, RabbitMQ, SQS, and others for high throughput messaging.

## Takeaways

Kerberos.io comes with different components which you only install when required; there is no need to set up a sophisticated system from the beginning. Each component works on its own and is open and extensible through APIs. Our vision is to start small, with just a few [Agents](/docs/agent/first-things-first/), scaling up and introducing more components such as [Vault](/docs/vault/first-things-first/) and [Hub](/docs/hub/first-things-first/) when required for your use case.

If you need some help on possible deployments, have [a look at the deployment page](/docs/prologue/deployments/) where we illustrate some examples.
