---
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

As outlined on the [introduction page](/) and [mission statement](/prologue/mission/), Kerberos.io has a clear vision and roadmap: to help anyone, anywhere, build a video management platform that fits their needs. In this section we describe the building blocks of the platform and illustrate how they complement each other to form an [ideal deployment model](/prologue/deployments/).

## An overview

A typical video management solution involves three core responsibilities: processing camera streams, persisting recordings and analysing the resulting data. Rather than bundling these into a single monolithic product, as many vendors do, we have separated each responsibility into a dedicated component: [Agents](/agent/first-things-first/), [Factory](/factory/first-things-first/), [Vault](/vault/first-things-first/) and [Hub](/hub/first-things-first/).

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
    { "id": "vault", "kind": "vault", "x": 600, "y":  70, "w": 240, "h": 150,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface", "badges": ["kubernetes"] },
    { "id": "object-storage", "kind": "storage", "x": 600, "y": 280, "w": 240, "h": 150,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud / Edge",
      "badges": ["minio", "ceph", "aws", "gcp", "azure"] },
    { "id": "hub", "kind": "hub", "x": 1020, "y": 175, "w": 240, "h": 150,
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

Thanks to this modular approach, each part of the Kerberos.io stack can be scaled and deployed independently. You can run some components on-premise and others in a cloud provider, or any combination in between. It also means you only install what you need: start small and grow over time as your requirements evolve.

## The Agent

At the foundation of every Kerberos.io deployment sits one or more [Agents](/agent/first-things-first/). Agents can be installed [in a variety of ways](https://github.com/kerberos-io/agent#how-to-run-and-deploy-a-kerberos-agent) and run on the compute of your choice — virtual machine, bare metal, Kubernetes cluster or otherwise — connected to the camera streams you control.

{{< rete caption="An Agent consists of both a backend and a frontend." alt="An Agent consists of both a backend and a frontend." height="380" >}}
{
  "groups": [
    { "id": "agent", "label": "Agent", "x": 300, "y": 20, "w": 420, "h": 340 }
  ],
  "nodes": [
    { "id": "user", "kind": "default", "x":  40, "y": 145, "w": 200, "h": 110,
      "header": "USER", "title": "Browser", "subtitle": "Web UI" },
    { "id": "frontend", "kind": "agent", "x": 340, "y":  70, "w": 340, "h": 110,
      "header": "AGENT", "title": "Frontend", "subtitle": "User interface" },
    { "id": "backend", "kind": "agent", "x": 340, "y": 210, "w": 340, "h": 110,
      "header": "AGENT", "title": "Backend", "subtitle": "API & video processing" },
    { "id": "camera", "kind": "camera", "x": 780, "y": 145, "w": 200, "h": 110,
      "header": "CAMERA", "title": "Camera", "subtitle": "RTSP://" }
  ],
  "connections": [
    { "from": "user", "to": "frontend", "fromSide": "right", "toSide": "left" },
    { "from": "frontend", "to": "backend", "fromSide": "bottom", "toSide": "top" },
    { "from": "camera", "to": "backend", "fromSide": "left", "toSide": "right" }
  ]
}
{{< /rete >}}

Each Agent is responsible for a single camera and has two roles: it serves as a user interface (frontend) and as an API server (backend). The backend processes the video stream, applies computer vision techniques, records footage and triggers configured actions such as webhooks. The frontend allows users to review recordings and adjust the Agent's configuration.

An Agent is shipped as a single container that bundles all required dependencies and libraries. One container is deployed per camera.

{{< figure src="introduction-kerberos-io.svg" alt="An Agent monitoring a single camera stream." caption="An Agent monitoring a single camera stream." class="stretch">}}

This design provides full isolation: if one Agent fails, no other Agent or camera is affected. It also makes the system straightforward to scale.

## Scaling out Agents

Starting with a handful of Agents is straightforward, and scaling out is just as simple. The [different deployment models](https://github.com/kerberos-io/agent#how-to-run-and-deploy-a-kerberos-agent) we document let you grow your Kerberos.io setup at your own pace.

{{< figure src="scaling-out.svg" alt="Scaling out Agents is straightforward." caption="Scaling out Agents is straightforward." class="stretch">}}

[Selecting the right deployment](https://github.com/kerberos-io/agent#how-to-run-and-deploy-a-kerberos-agent) depends on your scenario. There is no single best option — your choice should reflect your preferences and operational experience. A few examples:

- If you are not yet comfortable with `kubernetes` and only have a dozen cameras, `docker compose` is often a better fit.

- If you operate hundreds of cameras and expect that number to keep growing, you will benefit from the elasticity that `kubernetes` provides out of the box.

- If you would rather let non-technical users manage the video landscape, [Factory](/factory/first-things-first/) is a strong choice.

Whichever option you start with, you can always migrate later — only the runtime hosting the Agent containers changes.

## Storing data where you want

Agents are responsible for storing recordings and triggering events. By default, recordings are kept inside the Agent container, which means they are lost if the container stops. Fortunately, [several techniques are available](https://github.com/kerberos-io/agent#configure-and-persist-with-volume-mounts) to persist the data outside the container without any loss.

For most setups — and especially as your video landscape grows — it is more convenient to rely on a central, scalable storage system such as Ceph, MinIO, or cloud object storage like S3. This is where Vault comes in.

{{< figure src="agents-to-vault.svg" alt="Bring your own storage using Vault" caption="Bring your own storage using Vault" class="stretch">}}

[Vault](/vault/first-things-first/) acts as an interface between your Agents and your storage system. It receives recordings from the Agents and persists them to the storage backend you have configured. Decoupling Agents from storage through Vault means you can swap the underlying storage system at any time, without reconfiguring every Agent.

In addition to persisting data, [Vault](/vault/first-things-first/) also acts as an event producer. Whenever a recording is successfully stored, Vault publishes a message to the configured [integration](/vault/integrations/) — for example Kafka, RabbitMQ or SQS.

## Centralisation and governance

Scaling [Agents](/agent/first-things-first/) and pairing them with a flexible, scalable storage layer through [Vault](/vault/first-things-first/) provides a solid foundation. However, simply storing data delivers little value on its own.

The real value emerges when that data is turned into insights for stakeholders, governed properly, and combined with live information.

{{< figure src="introduction-hub.svg" alt="Vault connected to Hub." caption="Vault connected to Hub." class="stretch">}}

[Hub](/hub/first-things-first/) is our answer. It is a highly scalable platform that connects stakeholders to sites and groups of cameras, and provides all the capabilities you would expect: live streaming, object detection, fine-grained access control, alerts and more.

[Hub](/hub/first-things-first/) is built on top of Kubernetes and, like every other component, can be deployed wherever you choose. It is composed of a set of microservices that scale independently to meet demand, and relies on proven open source components such as Kafka, RabbitMQ and SQS for high-throughput messaging.

## Takeaways

Kerberos.io is a modular platform: you only install the components you need, when you need them. There is no requirement to set up a complex system upfront. Each component runs on its own and exposes open, extensible APIs. Our recommendation is to start small with a few [Agents](/agent/first-things-first/), and introduce additional components such as [Vault](/vault/first-things-first/) and [Hub](/hub/first-things-first/) as your use case grows.

For inspiration on how to combine these components, have a look at the [deployments page](/prologue/deployments/) where we walk through several common architectures.
