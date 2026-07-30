---
title: "Blocks"
description: "The closed set of typed blocks a stage can hand back — what each block's type means, the data shape it carries, and where the platform stores it."
lead: "A block is one self-describing unit of a result: a type that says what it is, and a data body in that type's shape. These are the block types the ingest core knows how to store."
date: 2026-06-16T00:00:00+00:00
lastmod: 2026-06-16T00:00:00+00:00
draft: false
images: []
aliases:
  - /docs/hub/extend/
menu:
  hub:
    parent: "ingest"
    identifier: "blocks"
weight: 10
toc: true
---

A **block** is the smallest unit of a delegated result. Each one is a pair:

- **`type`** — what kind of result this is (`detection`, `marker`, …). The [ingest core](../) routes on it.
- **`data`** — the body in that type's own shape, the same typed payload the platform already validates.

A stage returns its result as a **block envelope** — an ordered list of blocks — and the ingest core decodes and stores each one independently. The envelope shape and how it is routed are covered in [Ingest](../); this section is the **catalogue of block types** and the `data` contract behind each.

## The block types

The core ships a small, closed set. A producer stamps each block's `type` with one of these:

| `type` | What it is | `data` shape | Stored as | Writable from |
|--------|------------|--------------|-----------|---------------|
| [`detection`](detection/) | A run of detection tracks/boxes (people, vehicles, faces, …). | `PostDetectionsRequest` | a `DetectionRun` in the `detections` collection, keyed by `(key, source.runId)` | API **and** pipeline |
| [`marker`](marker/) | A single timeline annotation — a labelled point or span on the recording. | `Marker` | a `Marker` in the `markers` collection, keyed by `(organisation, device, name, startTimestamp)` | pipeline only |
| [`media-patch`](media-patch/) | A partial update to one existing recording (description, star, tags). | `{ mediaId, …fields }` | an org-scoped `$set` on the `media` document identified by `mediaId` | pipeline only |

A block's `type` names the **result shape**, not the stage that produced it. A stage that finds bounding boxes emits a `detection` block whatever it is detecting, and one envelope may carry several blocks of different types.

## Type, not variant

The `type` names the *shape*, not the *flavour*. Variants that share a shape are the **same type**:

- Inside `detection`, `box` and `pose` both report an axis-aligned box per frame, share one contract (`PostDetectionsRequest`) and one `detections` collection — so they are the same block type.
- A result whose shape is genuinely different — a marker is a timeline annotation, not a box per frame — is its **own block type**.

So most new capabilities don't add a block type; they **recombine the existing ones**. A new type is only needed when the *shape* of the data is new, and it arrives as a new handler in the core.

## The contract is the stable part

A block type's `data` contract is defined once in `@uug-ai/models` and is the **same wherever the block comes from**. A `detection` block has the same body whether your microservice emits it as a [workflow stage](../../stages/) over the queue or your own service posts it to the [ingest API](../#over-the-api-post-ingest). The transport decides *who triggers the work* and *which deployments can use it*; it never changes the `data`. So each page below documents the **contract first** — the transport is a delivery choice layered on top.

## The contracts

- **[Detection](detection/)** — a run of detection tracks (a box per frame, per tracked object) for a recording, delivered as a `detection` block and stored in the `detections` collection. Emittable from a workflow stage **or** the ingest API.
- **[Marker](marker/)** — a labelled point or span on a recording's timeline (a licence-plate read, a point-of-sale transaction, an alert window), delivered as a `marker` block and stored in the `markers` collection. Emittable from a workflow stage only.
- **[Media patch](media-patch/)** — a partial update to an existing recording (a description, a star, extra tags), delivered as a `media-patch` block and applied in place to the `media` document. Emittable from a workflow stage only.
