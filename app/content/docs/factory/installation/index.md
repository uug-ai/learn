---
title: "Installation"
description: ""
lead: ""
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  factory:
    parent: "factory"
weight: 302
toc: true
---

Kerberos Factory is shipped as a container image and is required to be installed inside a Kubernetes cluster. Kerberos Factory integrates with the Kubernetes API server to automatically provision Kerberos Agents on its behalf. This means that Kerberos Factory is out-of-scope if you are planning to use a `docker` or `docker compose` setup.

You can run Kerberos Factory wherever you can run a Kubernetes cluster, so it can run at the edge, or in the cloud. Although you might except that Kubernetes at the edge or Kubernetes in the cloud is the same installation, you will notice that there are a few differences.

When running a managed Kubernetes cluster, such as [GKE](https://cloud.google.com/kubernetes-engine), [EKS](https://aws.amazon.com/eks/) or  or [AKS](https://azure.microsoft.com/en-us/products/kubernetes-service/), you will have a wide range of superpowers such as a `LoadBalancer` service, automatic `Volume` creation, etc. The latter is something what is missing in an self-hosted deployment, where you will have to prepare the volumes yourself and install an edge load balancer like `MetalLB`.

{{< rete caption="Kerberos Factory can be installed everywhere your Kubernetes cluster can be installed." alt="Kerberos Factory can be installed everywhere your Kubernetes cluster can be installed." height="680" >}}
{
  "groups": [
    { "id": "edge",  "label": "Edge Kubernetes",    "x":   0, "y": 20, "w": 460, "h": 660 },
    { "id": "cloud", "label": "Managed Kubernetes", "x": 560, "y": 20, "w": 460, "h": 660 }
  ],
  "nodes": [
    { "id": "edge-factory", "kind": "factory", "x":  110, "y":  80, "w": 240, "h": 130,
      "header": "FACTORY", "title": "Factory", "subtitle": "Self-hosted", "badges": ["kubernetes"] },
    { "id": "edge-agent-1", "kind": "agent",   "x":  110, "y": 250, "w": 240, "h": 110,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Provisioned at edge" },
    { "id": "edge-agent-2", "kind": "agent",   "x":  110, "y": 390, "w": 240, "h": 110,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Provisioned at edge" },
    { "id": "edge-agent-3", "kind": "agent",   "x":  110, "y": 530, "w": 240, "h": 110,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Provisioned at edge" },
    { "id": "cloud-factory","kind": "factory", "x": 670, "y":  80, "w": 240, "h": 130,
      "header": "FACTORY", "title": "Factory", "subtitle": "Managed cloud",  "badges": ["kubernetes"] },
    { "id": "cloud-agent-1","kind": "agent",   "x": 670, "y": 250, "w": 240, "h": 110,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Provisioned in cloud" },
    { "id": "cloud-agent-2","kind": "agent",   "x": 670, "y": 390, "w": 240, "h": 110,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Provisioned in cloud" },
    { "id": "cloud-agent-3","kind": "agent",   "x": 670, "y": 530, "w": 240, "h": 110,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Provisioned in cloud" }
  ],
  "connections": [
    { "from": "edge-factory",  "to": "edge-agent-1",  "fromSide": "bottom", "toSide": "top", "label": "provisions" },
    { "from": "edge-factory",  "to": "edge-agent-2",  "fromSide": "bottom", "toSide": "top" },
    { "from": "edge-factory",  "to": "edge-agent-3",  "fromSide": "bottom", "toSide": "top" },
    { "from": "cloud-factory", "to": "cloud-agent-1", "fromSide": "bottom", "toSide": "top", "label": "provisions" },
    { "from": "cloud-factory", "to": "cloud-agent-2", "fromSide": "bottom", "toSide": "top" },
    { "from": "cloud-factory", "to": "cloud-agent-3", "fromSide": "bottom", "toSide": "top" }
  ]
}
{{< /rete >}}

## Managed Kubernetes

Installing Kerberos Factory in a managed Kubernetes cluster (Azure, GCP, AWS) is straight forward, as you create Kubernetes clusters in a few clicks, get access to public load balancers, volumes and more. Running Kerberos Factory in a managed Kubernetes cluster is just a matter of copy-pasting some configuration (yaml) files, and execution of `kubectl apply` commands.

> Install Kerberos Factory in a managed Kubernetes cluster by [following this step-by-step installation guide](https://github.com/kerberos-io/factory/tree/master/kubernetes#b-managed-kubernetes-1).

{{< rete caption="Kerberos Factory managed cluster" alt="Kerberos Factory managed cluster" height="540" >}}
{
  "groups": [
    { "id": "cloud", "label": "Managed Kubernetes (GKE / EKS / AKS)", "x": 0, "y": 20, "w": 1180, "h": 460 }
  ],
  "nodes": [
    { "id": "factory", "kind": "factory", "x":  40, "y":  80, "w": 240, "h": 150,
      "header": "FACTORY", "title": "Factory", "subtitle": "Orchestrates agents", "badges": ["kubernetes"] },
    { "id": "agent-1", "kind": "agent",   "x": 360, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream", "badges": ["kubernetes"] },
    { "id": "agent-2", "kind": "agent",   "x": 360, "y": 240, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream", "badges": ["kubernetes"] },
    { "id": "vault",   "kind": "vault",   "x": 680, "y":  80, "w": 240, "h": 150,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface", "badges": ["kubernetes"] },
    { "id": "object-storage", "kind": "storage", "x": 680, "y": 280, "w": 240, "h": 150,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "Cloud volumes",
      "badges": ["aws", "gcp", "azure"] }
  ],
  "connections": [
    { "from": "factory", "to": "agent-1", "fromSide": "right", "toSide": "left", "label": "provisions" },
    { "from": "factory", "to": "agent-2", "fromSide": "right", "toSide": "left", "label": "provisions" },
    { "from": "agent-1", "to": "vault",   "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "vault",   "fromSide": "right", "toSide": "left" },
    { "from": "vault",   "to": "object-storage", "fromSide": "bottom", "toSide": "top" }
  ]
}
{{< /rete >}}

## Self-hosted Kubernetes

No need to install Kerberos Factory on a Kubernetes Service Provider, it can be installed on your own Kubernetes cluster in your private cloud, or at the edge. The closer you bring Kerberos Vault to your video streams, and Kerberos Agents, the more benefits you will experience (low latency, low bandwidth, etc).

In contradiction to the Kubernetes Service Provider, there will be more work required. Setting up a Kubernetes Cluster, configure a load balancer, create persistent bolumes and claims.

> Install Kerberos Factory on a private cloud or at the edge by [following this step-by-step installation guide](https://github.com/kerberos-io/factory/tree/master/kubernetes#a-self-hosted-kubernetes-1).

{{< rete caption="Kerberos Factory self-hosted cluster" alt="Kerberos Factory self-hosted cluster" height="540" >}}
{
  "groups": [
    { "id": "edge", "label": "Self-hosted Kubernetes (edge / private cloud)", "x": 0, "y": 20, "w": 1320, "h": 520 }
  ],
  "nodes": [
    { "id": "cam-1", "kind": "camera", "x":  40, "y":  80, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 1", "subtitle": "RTSP://" },
    { "id": "cam-2", "kind": "camera", "x":  40, "y": 250, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 2", "subtitle": "RTSP://" },
    { "id": "cam-3", "kind": "camera", "x":  40, "y": 420, "w": 180, "h": 130,
      "header": "CAMERA", "title": "Camera 3", "subtitle": "RTSP://" },
    { "id": "factory", "kind": "factory", "x": 280, "y":  80, "w": 240, "h": 150,
      "header": "FACTORY", "title": "Factory", "subtitle": "Orchestrates agents", "badges": ["kubernetes"] },
    { "id": "agent-1", "kind": "agent",   "x": 580, "y":  80, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 1", "subtitle": "Process stream", "badges": ["kubernetes"] },
    { "id": "agent-2", "kind": "agent",   "x": 580, "y": 250, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 2", "subtitle": "Process stream", "badges": ["kubernetes"] },
    { "id": "agent-3", "kind": "agent",   "x": 580, "y": 420, "w": 240, "h": 130,
      "header": "AGENT", "title": "Agent 3", "subtitle": "Process stream", "badges": ["kubernetes"] },
    { "id": "vault",   "kind": "vault",   "x": 880, "y": 165, "w": 240, "h": 150,
      "header": "VAULT", "title": "Vault", "subtitle": "Storage interface", "badges": ["kubernetes"] },
    { "id": "object-storage", "kind": "storage", "x": 880, "y": 365, "w": 240, "h": 150,
      "header": "OBJECT STORAGE", "title": "Object Storage", "subtitle": "MinIO / Ceph",
      "badges": ["minio", "ceph"] }
  ],
  "connections": [
    { "from": "cam-1",   "to": "agent-1",   "fromSide": "right", "toSide": "left" },
    { "from": "cam-2",   "to": "agent-2",   "fromSide": "right", "toSide": "left" },
    { "from": "cam-3",   "to": "agent-3",   "fromSide": "right", "toSide": "left" },
    { "from": "factory", "to": "agent-1",   "fromSide": "right", "toSide": "left", "label": "provisions" },
    { "from": "factory", "to": "agent-2",   "fromSide": "right", "toSide": "left", "label": "provisions" },
    { "from": "factory", "to": "agent-3",   "fromSide": "right", "toSide": "left", "label": "provisions" },
    { "from": "agent-1", "to": "vault",     "fromSide": "right", "toSide": "left" },
    { "from": "agent-2", "to": "vault",     "fromSide": "right", "toSide": "left" },
    { "from": "agent-3", "to": "vault",     "fromSide": "right", "toSide": "left" },
    { "from": "vault",   "to": "object-storage", "fromSide": "bottom", "toSide": "top" }
  ]
}
{{< /rete >}}
