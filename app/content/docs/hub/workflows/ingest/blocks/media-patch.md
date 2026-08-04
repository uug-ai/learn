---
title: "Media patch"
description: "The media-patch block contract: a partial update to a single media document — a description, a star, extra tags — delivered by a workflow stage and applied in place to the media collection."
lead: "A media-patch enriches an existing recording. A stage hands back the media id plus the fields to change; the ingest core validates them against a fixed allow-list and applies an organisation-scoped update to the media document."
date: 2026-07-30T00:00:00+00:00
lastmod: 2026-08-04T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "blocks"
weight: 30
toc: true
---

A **media-patch** is a partial update to a single recording. Where a [detection](../detection/) creates a run of tracks and a [marker](../marker/) creates a timeline annotation, a media-patch **changes fields on a media document that already exists** — it enriches the recording itself:

- a **description** an analysis stage produced for the clip,
- a **star** flag an alerting stage set on a recording worth keeping,
- extra **tags** that classify the recording for search.

It is the block a stage emits when its job is *"take this recording and add what I learned to it"* rather than *"attach a new object to it"*.

## How a media-patch is delivered

A media-patch is the `data` body of a **`media-patch` block**. A workflow stage returns it inside its [block envelope](../../#the-block-envelope); the shared [ingest core](../../) validates it and applies the change to the `media` collection.

The `data` body is **flat**: a reserved `mediaId` names the recording to update, and every other key is a field to set.

```json
{
  "type": "media-patch",
  "data": {
    "mediaId": "665f1c9b2a4e8f0012ab34cd",
    "description": "Two vehicles entered the north gate",
    "star": true,
    "tagNames": ["anpr", "entry"]
  }
}
```

## The media-patch contract

### Target (`mediaId`)

| Field | Type | Notes |
|-------|------|-------|
| `mediaId` | string | **Required.** The media document's `_id` (a 24-character hex ObjectID). It selects the recording to update; it is never itself written. |

The **organisation is taken from the persisted workflow run**, not from the block body or the stage worker's returned user projection. The update is always scoped to that non-empty organisation, so a stage cannot re-scope its result. A `mediaId` that resolves to a recording in another organisation (or to no recording at all) is rejected as a permanent, non-retryable ingest failure and is not mirrored into workflow results.

### Fields to patch (allow-list)

Every key other than `mediaId` is a field to set. Only the fields below are patchable; any other key **rejects the block**. This closed list is deliberate — identity and access-control fields (`id`, `organisationId`, `deviceId`, `siteId`, `groupId`) can never be changed by a patch, so a block can never re-scope a recording or overwrite its ownership.

| Field | Type | Applied to | Notes |
|-------|------|------------|-------|
| `description` | string | `metadata.description` | Free-text description of the recording. |
| `star` | bool | `star` | Flags the recording as starred. |
| `tagNames` | string[] | `tagNames` | Tags used to classify and filter the recording. |
| `eventNames` | string[] | `eventNames` | Event labels attached to the recording. |
| `markerNames` | string[] | `markerNames` | Marker names attached to the recording. |

At least one field is required — a block with only a `mediaId` and nothing to set is rejected. A block may set at most 32 fields.

Values are validated before any block in the envelope is written. `null` and values of the wrong JSON type are rejected; clear a description with `""` and clear a name array with `[]`.

## Write semantics (idempotent `$set`)

Delivery is **at-least-once**, so the write is an idempotent `$set`: it sets the named fields to the named values on the target media document. Re-emitting the same patch sets the same values again — a harmless no-op — so a redelivery never corrupts the recording. A patch **replaces** each field it names; it does not merge into arrays. To change a field, send its new full value.

## Writable from

A media-patch is **pipeline only** — it is emitted by a [workflow stage](../../../stages/) that has already resolved which recording to enrich. It is not accepted over the [ingest API](../../#over-the-api-post-ingest): patching an arbitrary recording by id is a trusted, in-cluster operation.

## Out of scope

- **Creating a recording.** A media-patch only updates a document that already exists; a `mediaId` that matches nothing is rejected and not advertised as persisted. Ingest a recording through its own upload path first.
- **Identity & RBAC fields** (`id`, `organisationId`, `deviceId`, `siteId`, `groupId`) are never patchable.
- **System fields** — `audit`, `atRuntimeMetadata` and other platform-managed fields are not exposed to a patch.

## See also

- [Blocks](../) — the full catalogue of block types and how a block envelope is shaped.
- [Detection](../detection/) — a run of geometric tracks rather than a field update.
- [Marker](../marker/) — a timeline annotation rather than a field update.
- [Ingest](../../) — how the core routes a block envelope.
- [Stages](../../../stages/) — how a microservice connects and hands a result back.
