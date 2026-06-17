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

Every extension contract is delivered the same way — as a **typed block** handed to the [ingest service](../workflows/ingest-service/), which validates it and writes it to the right collection. What differs is *how that block reaches the Hub*: emitted by a workflow stage, or posted over the ingest API. Same data, same place — they differ only in *who triggers the work*, *where the producer runs*, and *which deployments can use them*.

| | **Ingest API** *(any deployment)* | **Workflow stage** *(self-hosted)* |
|---|---|---|
| Transport | Authenticated `POST` of a block to the ingest endpoint | A microservice running as a stage of the analysis pipeline |
| Who triggers it | Your service, whenever it has data | The pipeline, automatically on ingest / re-analysis |
| Where it runs | Your own infrastructure, anywhere | Inside (or attached to) the Kerberos cluster |
| Delivery | Synchronous request/response | Queue-backed (retries, ordering, backpressure) |
| Availability | **Any** deployment (cloud or self-hosted) | Self-hosted deployments that can run custom stages |
| Best for | Bring-your-own models, offline/batch jobs, annotation imports, corrections | Always-on capability that must be part of every recording's analysis |

For most integrators the **ingest API is the right starting point**: it works on every deployment, needs no cluster access, and lets you stand up your own producer immediately. A workflow stage is the option for deployments that want a capability to run automatically as a built-in step.

{{< rete caption="Both paths feed the same contract: a producer's output is delivered either by your service posting a block to the ingest API, or by a workflow stage on the queue — and both land in the same collection via the same shared data model" alt="Ingest API and workflow stage both writing the same store" height="460" >}}
{
  "groups": [
    { "id": "yours", "label": "Producer (you control)", "x":   0, "y":  20, "w": 360, "h": 360 },
    { "id": "hub",   "label": "Hub",                     "x": 460, "y":  20, "w": 600, "h": 360 }
  ],
  "nodes": [
    { "id": "producer", "kind": "model", "x": 40, "y": 160, "w": 260, "h": 120,
      "header": "PRODUCER", "title": "Your model / export", "subtitle": "Builds the run" },
    { "id": "api", "kind": "hub", "x": 500, "y": 50, "w": 280, "h": 120,
      "header": "METHOD A", "title": "Ingest API", "subtitle": "POST a block \u00b7 any deployment" },
    { "id": "stage", "kind": "pipeline-analysis", "x": 500, "y": 230, "w": 280, "h": 120,
      "header": "METHOD B", "title": "Workflow stage", "subtitle": "Queue-triggered \u00b7 gated" },
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

What makes the two paths interchangeable is that the **data model is shared** — the same typed block (e.g. a detection run) is defined once in `@uug-ai/models` and consumed by both. The transport is just the envelope. Because of this:

- The code that *builds* your output (boxes, tracks, classifications) is identical regardless of path.
- Switching a producer from the ingest API to a workflow stage later changes only how the block is delivered, not the payload.
- The Hub validates, normalises and stores every contribution the same way no matter how it arrived.

So when these pages describe a contract, they describe the **data** first; the transport is a delivery choice layered on top.

## How these docs are organized

These pages are grouped **by capability** — *what* you are contributing — rather than by transport. Each capability page documents its data contract — the `data` body of its block type — and the two delivery paths above apply to all of them:

- **[Detections](detections/)** — third-party detection tracks (boxes per frame) for a recording, delivered as a `detection` block and stored in the `detections` collection.

New capabilities slot in as sibling pages here; the two paths above apply to each.

## Choosing a method

- **Start with the ingest API** if you're bringing your own model, running offline or batch jobs, importing from an annotation tool, or operating on a managed/cloud deployment. It's the universal door.
- **Consider a workflow stage** only when you control the deployment *and* want the capability to run automatically as part of every recording's analysis, with queue-level delivery guarantees.
- You don't have to choose permanently: a deployment can use the API today and add a workflow stage later as a second front door to the same collection.
