---
podcast: prologue-how
title: "How it works"
description: "How Agent, Vault, Factory and Hub work together in the UUG ecosystem."
lead: "Record with Agent, store with Vault, manage Agents with Factory and bring it together in Hub."
date: 2020-10-06T08:48:57+00:00
lastmod: 2026-11-05T00:00:00+00:00
draft: false
images: []
menu:
  docs:
    parent: "prologue"
weight: 102
toc: true
---

The UUG ecosystem brings together four products for recording, storing, managing and working with video. Start with one camera and an Agent, then add the products your deployment needs. You do not have to install the whole ecosystem to get started.

## An overview

Each product has a distinct responsibility:

| Product | Role | When to add it |
| --- | --- | --- |
| [Agent](/docs/agent/first-things-first/) | Processes and records one camera stream, with its own web interface. | Start here to record and review a camera. |
| [Vault](/docs/vault/first-things-first/) | Receives recordings, stores them on your chosen storage providers and publishes events to integrations. | When you need central storage or want other applications to consume recordings. |
| [Factory](/docs/factory/first-things-first/) | Deploys and configures Agents on Kubernetes through a web interface. | When you want to manage a fleet of Agents on a cluster. |
| [Hub](/docs/hub/first-things-first/) | Provides a shared workspace for live view, recordings, alerts and access control across cameras and sites. | When people need a central view rather than separate Agent interfaces. |

The diagram shows a deployment using all four products. Factory manages the Agents; it is not part of the recording upload path. Agents send recordings to Vault, which stores them and notifies Hub through its configured integration.

{{< rete caption="The UUG ecosystem" alt="Cameras feed Agents, optionally managed by Factory. Vault persists recordings to object storage and sends recording events to Hub." height="540" >}}
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

These responsibilities let you choose where the components run: at the edge, in the cloud or across both. The right arrangement depends on camera connectivity, storage requirements and who needs access. See [Deployments](/docs/prologue/deployments/) for example architectures.

## The Agent

[Agent](/docs/agent/first-things-first/) connects to a camera stream you control and records on motion or continuously. Each Agent looks after one camera and provides its own interface for live view, recordings and settings.

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

The backend processes the stream and makes recordings. The frontend uses the API to let you review activity and configure the Agent. This makes an Agent useful on its own, without Factory, Vault or Hub.

You can run an Agent on a VM, a bare-metal machine, a Raspberry Pi or a Kubernetes cluster. With a container deployment, each camera has its own Agent container. Follow [Agent installation](/docs/agent/installation/) to choose a deployment method.

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

Separate Agent containers let you configure and restart one camera's recorder independently of the others. They can still share a host, network or storage, so plan capacity and availability for those shared dependencies.

## Scaling out Agents

Add a camera, add an Agent. A small deployment can use Docker or Docker Compose; a Kubernetes deployment can schedule Agents across a cluster. Choose based on your infrastructure and operating experience, not just the number of cameras.

{{< rete caption="One Agent per camera" alt="Four cameras each connect to their own Agent container. Run the Agents with Docker or Kubernetes, and optionally manage them through Factory on Kubernetes." height="620" >}}
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

## Factory: managing Agents on Kubernetes

[Factory](/docs/factory/first-things-first/) provides a web interface for deploying and configuring Agents on Kubernetes. It interacts with the Kubernetes API and creates a deployment for each Agent.

Administrators can add cameras, use ONVIF discovery and apply global settings instead of configuring every Agent separately. Factory manages how Agents run; the Agents still process streams and create recordings.

Factory is optional: you can run Agents without it. Its current scheduling engine is Kubernetes; do not assume it manages Docker or host-based Agents. See [Configuration & engines](/docs/factory/configuration-and-engines/) and [Factory installation](/docs/factory/installation/) for details.

## Storing data where you want

By default, an Agent keeps recordings on its own disk. For container deployments, plan persistent storage: recordings kept only in the container's writable layer will not survive container removal or replacement. Stopping a container is not the same as removing it.

[Vault](/docs/vault/first-things-first/) adds a central storage layer. Agents upload recordings to Vault, and Vault writes them to the storage providers you configure. Providers include Amazon S3, Azure Blob Storage, Google Cloud Storage, MinIO and Ceph. The storage can be at the edge or in the cloud; see [Storage providers](/docs/vault/providers/) for supported options.

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

Vault separates camera recording from storage and downstream processing. Configure a provider and an account in Vault, then [connect an Agent to Vault](/docs/agent/connect-to-vault/) using that account's credentials.

After storing a recording, Vault can publish an event to a configured [integration](/docs/vault/integrations/), such as Hub, Kafka, RabbitMQ or Amazon SQS. Those events let applications process recordings without moving that work into every Agent.

## Hub: a central workspace {#centralise-and-governance}

[Hub](/docs/hub/first-things-first/) brings cameras and recordings into one web application. Teams can organise Agents into sites and groups, watch live streams, find recordings, receive alerts and control access through roles.

In a deployment using your own Vault, its Hub integration sends recording events to the [Hub pipeline](/docs/hub/pipeline/). Hub uses the configured Vault connection to access recordings. Analytics and detections depend on the processing workflows you configure; Hub does not replace the Agents that record the camera streams.

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

The recording path is only part of the connection. Agents also [connect directly to Hub](/docs/agent/connect-to-hub/) for status, live view and camera control. Configuring that connection alone does not deliver recordings: persistence must be configured separately.

Factory and Hub serve different users and tasks: Factory deploys and configures Agents on Kubernetes, while Hub is the workspace for monitoring and reviewing video across the deployment. See [Hub installation](/docs/hub/installation/) for deployment options.

## Takeaways

Start with the responsibility you need to solve:

- **Record a camera:** follow [Agent getting started](/docs/agent/getting-started/).
- **Keep recordings on your own central storage:** [connect Agent to Vault](/docs/agent/connect-to-vault/).
- **Manage Agents on Kubernetes:** follow [Factory getting started](/docs/factory/getting-started/).
- **Give users a shared view:** follow [Hub getting started](/docs/hub/getting-started/) and [connect Agent to Hub](/docs/agent/connect-to-hub/).

Use the [deployment examples](/docs/prologue/deployments/) to choose how these products fit your environment. Grow the ecosystem around your requirements rather than installing everything at once.
