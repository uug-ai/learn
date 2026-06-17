---
title: "Marker"
description: "The marker block contract: a labelled point or span on a recording's timeline — a licence-plate read, a transaction, an alert window — delivered by a workflow stage and stored in the markers collection."
lead: "A marker is one labelled span on a recording's timeline. A stage hands it back as a marker block; the ingest core stores it in the markers collection, keyed so the same annotation refreshes instead of duplicating."
date: 2026-06-16T00:00:00+00:00
lastmod: 2026-06-16T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "blocks"
weight: 20
toc: true
---

A **marker** is a single annotation on a recording's timeline — a labelled point or span that says *something happened here, and here is what it was*. Where a [detection](../detection/) is a run of geometric tracks (a box per frame), a marker is a higher-level, human-meaningful label on a stretch of time:

- a licence-plate read (`2-HCP-007`) from an ANPR stage,
- a point-of-sale transaction (`transaction_id`) lined up against the camera over the till,
- an alert window — "door forced", "loitering" — with a start, an end, and a description.

Markers are what the timeline and search surfaces read to let an operator jump straight to *the moment that matters* without scrubbing the whole recording.

## How a marker is delivered

A marker is the `data` body of a **`marker` block**. A workflow stage returns it inside its [block envelope](../../#the-block-envelope); the shared [ingest core](../../) validates it and writes it to the `markers` collection.

Unlike [`detection`](../detection/), the `marker` block type is **pipeline-only** — it can be emitted by an in-cluster [workflow stage](../../../stages/) over the queue, but **not** posted over the public ingest API. Because it arrives only over the trusted pipeline transport, the **organisation and device are taken from the run**, not from the body; your `data` supplies the annotation itself — its `name`, its timing, and its descriptive fields.

```json
{
  "type": "marker",
  "data": {
    "name": "2-HCP-007",
    "startTimestamp": 1752482068,
    "endTimestamp": 1752482079,
    "duration": 11,
    "description": "Licence plate detected at the north gate",
    "categories": [{ "name": "anpr" }],
    "tags": [{ "name": "entry" }],
    "events": [
      {
        "startTimestamp": 1752482068,
        "endTimestamp": 1752482079,
        "duration": 11,
        "name": "Plate read",
        "description": "Vehicle entered the gate"
      }
    ]
  }
}
```

## The marker contract

All timestamps are **seconds since the Unix epoch** (not frames, not milliseconds).

### Identity & timing

These fields are required, and together they form the marker's identity.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | The annotation's identifier — a licence plate (`2-HCP-007`), a transaction id, an alert label. Part of the upsert key. |
| `startTimestamp` | int64 (seconds) | When the span begins. Part of the upsert key. |
| `endTimestamp` | int64 (seconds) | When the span ends. |
| `duration` | int64 (seconds) | Length of the span (`endTimestamp − startTimestamp`). |

On the pipeline transport the platform supplies the **organisation** and **device** from the run, so you don't set `organisationId` or `deviceId` yourself — the stored marker is keyed by `(organisation, device, name, startTimestamp)`.

### Descriptive fields

All optional; they enrich how the marker reads and filters.

| Field | Type | Notes |
|-------|------|-------|
| `description` | string | Free-text description of the marker. |
| `categories` | `MarkerCategory[]` | Buckets the marker for filtering — each `{ "name": "security" }` (e.g. `anpr`, `alert`, `object`). |
| `tags` | `MarkerTag[]` | Lightweight labels — each `{ "name": "entry" }`. |
| `events` | `MarkerEvent[]` | Sub-spans within the marker (see below). |
| `metadata.comments` | object | Operator comments attached to the marker. |

### Events

A marker can carry an ordered list of **events** — finer-grained spans inside the marker's window, each with its own timing and label. An ANPR marker might hold a single "Plate read" event; an alert marker might hold "Motion detected" then "Door opened".

| Field | Type | Notes |
|-------|------|-------|
| `startTimestamp` | int64 (seconds) | When the event begins. |
| `endTimestamp` | int64 (seconds) | When the event ends. |
| `duration` | int64 (seconds) | Length of the event. |
| `name` | string | Event label, e.g. `Motion Detected`, `Sound Detected`. |
| `description` | string | Free-text description of the event. |
| `tags` | string[] | Labels for the event, e.g. `["urgent", "review-needed"]`. |

## Write semantics (upsert by identity)

Delivery is **at-least-once**, so the write is an **idempotent upsert** keyed by `(organisation, device, name, startTimestamp)`. Re-emitting the same annotation — the same plate, at the same start, on the same camera — **refreshes** the existing marker rather than creating a duplicate. To record a *different* moment, change the `name` or the `startTimestamp`.

## Out of scope

- **Runtime-derived metadata** (`atRuntimeMetadata`, the marker/tag/event time ranges) is computed by the platform for the timeline UI — a producer does not set it.
- **System fields** — `id`, `synchronize` and `audit` are managed by the platform.
- **Geometry.** A marker labels *time*, not *space*. If you need a box per frame, emit a [`detection`](../detection/) block instead; the two can travel in the same envelope.

## See also

- [Blocks](../) — the full catalogue of block types and how a block envelope is shaped.
- [Detection](../detection/) — the other built-in block type: geometric tracks rather than timeline labels.
- [Ingest](../../) — how the core routes a block envelope and the trust model behind the pipeline-only rule.
- [Stages](../../../stages/) — how a microservice connects and hands a result back.
