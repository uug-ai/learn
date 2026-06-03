---
title: "Extend"
description: "Bring your own producers, models and integrations into the Hub."
lead: "Bring your own producers, models and integrations into the Hub."
date: 2026-06-02T00:00:00+00:00
lastmod: 2026-06-03T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 306
toc: true
---

The **Extend** section groups the contracts you use to push your own data into the Hub — detections, classifications and other producer-side integrations that sit alongside the internal pipeline. Each one lets a producer you control contribute data to a recording without modifying the Hub itself.

## Two ways to get data in

Every extension contract can be fed through one of two transports. They deliver the **same data** to the **same place** — they differ only in *who triggers the work*, *where the producer runs*, and *which deployments can use them*.

| | **API push** *(available now)* | **In-pipeline stage** *(advanced, deployment-gated)* |
|---|---|---|
| Transport | Authenticated `POST` to the Hub API | A worker container running as a stage of the internal analysis pipeline |
| Who triggers it | Your service, whenever it has data | The pipeline, automatically on ingest / re-analysis |
| Where it runs | Your own infrastructure, anywhere | Inside (or attached to) the Kerberos cluster |
| Delivery | Synchronous request/response | Queue-backed (retries, ordering, backpressure) |
| Availability | **Any** deployment (cloud or self-hosted) | Self-hosted deployments that can run custom stages |
| Best for | Bring-your-own models, offline/batch jobs, annotation imports, corrections | Always-on detection that must be part of every recording's analysis |

For most integrators the **API push is the right starting point**: it works on every deployment, needs no cluster access, and lets you stand up your own producer immediately. The in-pipeline stage is an optimization for deployments that want a capability to run automatically as a built-in step.

{{< rete caption="Both transports feed the same contract: a producer's output is delivered either by your service POSTing to the Hub API, or by an in-pipeline stage worker — and both land in the same collection via the same shared data model" alt="API push and in-pipeline stage both writing the same store" height="460" >}}
{
  "groups": [
    { "id": "yours", "label": "Producer (you control)", "x":   0, "y":  20, "w": 360, "h": 360 },
    { "id": "hub",   "label": "Hub",                     "x": 460, "y":  20, "w": 600, "h": 360 }
  ],
  "nodes": [
    { "id": "producer", "kind": "model", "x": 40, "y": 160, "w": 260, "h": 120,
      "header": "PRODUCER", "title": "Your model / export", "subtitle": "Builds the run" },
    { "id": "api", "kind": "hub", "x": 500, "y": 50, "w": 280, "h": 120,
      "header": "METHOD A", "title": "POST /detections", "subtitle": "API push \u00b7 any deployment" },
    { "id": "stage", "kind": "pipeline-analysis", "x": 500, "y": 230, "w": 280, "h": 120,
      "header": "METHOD B", "title": "In-pipeline stage", "subtitle": "Queue-triggered \u00b7 gated" },
    { "id": "store", "kind": "storage", "x": 840, "y": 140, "w": 200, "h": 120,
      "header": "SHARED", "title": "Collection", "subtitle": "Same model \u00b7 same store" }
  ],
  "connections": [
    { "from": "producer", "to": "api", "fromSide": "right", "toSide": "left", "kind": "thick", "label": "push" },
    { "from": "producer", "to": "stage", "fromSide": "right", "toSide": "left", "kind": "dashed", "label": "or run inside" },
    { "from": "api", "to": "store", "fromSide": "right", "toSide": "left", "label": "store" },
    { "from": "stage", "to": "store", "fromSide": "right", "toSide": "left", "label": "store" }
  ]
}
{{< /rete >}}

## The contract is the stable part

What makes the two transports interchangeable is that the **data model is shared** — the same typed run (e.g. a detection run) is defined once in `@uug-ai/models` and consumed by both paths. The transport is just the envelope. Because of this:

- The code that *builds* your output (boxes, tracks, classifications) is identical regardless of method.
- Switching a producer from API push to an in-pipeline stage later changes only the **sink**, not the payload.
- The Hub validates, normalises and stores every contribution the same way no matter how it arrived.

So when these pages describe a contract, they describe the **data** first; the transport is a delivery choice layered on top.

## How these docs are organized

These pages are grouped **by capability** — *what* you are contributing — rather than by transport. Each capability page documents its data contract and notes which transports are available for it:

- **[Detections](detections/)** — third-party detection tracks (boxes per frame) for a recording, stored in the `detections` collection. *Available now via API push; in-pipeline stage planned.*

New capabilities slot in as sibling pages here; the two transports above apply to each.

## Choosing a method

- **Start with API push** if you're bringing your own model, running offline or batch jobs, importing from an annotation tool, or operating on a managed/cloud deployment. It's the universal door.
- **Consider an in-pipeline stage** only when you control the deployment *and* want the capability to run automatically as part of every recording's analysis, with queue-level delivery guarantees.
- You don't have to choose permanently: a deployment can use the API today and add an in-pipeline stage later as a second front door to the same collection.
