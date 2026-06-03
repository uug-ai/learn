---
title: "Detections"
description: "Posting third-party detection tracks for a recording and storing them in the detections collection."
lead: "Posting third-party detection tracks for a recording and storing them in the detections collection."
date: 2026-06-02T00:00:00+00:00
lastmod: 2026-06-03T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "extend"
weight: 310
toc: true
---

A **detection run** is a self-contained bundle of tracks produced by a single source for a single recording. It answers one question — *"what was detected in this media?"* — and nothing more. It is candidate data stored verbatim for later retrieval.

Each run is delivered to the Hub naming the target recording, validated and normalised, then stored in a dedicated **`detections` collection keyed by the recording**. How a producer obtains its boxes (a model, an annotation tool, a third-party export) is outside the contract; what matters is the shape of the run and the recording it targets.

The contract has two halves:

- A recording already exists in the Hub, addressed by `mediaKey` (the recording **key** — `media.videoFile` / `analysis.key`, not the media `_id`) or `analysisId` (the analysis document `_id`) and (optionally) described by its media properties — width, height, fps, frame count.
- The producer returns one run, carrying a `source`, a coordinate space, optional `media` and `categories`, and one or more `tracks` of boxes.

## Methods

A detection run can reach the Hub through one of two transports. They deliver the **same `DetectionRun`** to the **same `detections` collection** — they differ only in *who triggers the work* and *where the producer runs*. (See the [Extend overview](../) for the general comparison.)

- **[API push](api/) — *available now.*** Your service posts each run with a single authenticated `POST /detections`. Works on **every** deployment (cloud or self-hosted), needs no cluster access, and is the right starting point for bring-your-own models, batch jobs, annotation imports and corrections. **This is the documented method today** — start on the [API page](api/).
- **In-pipeline stage — *added later.*** A worker that runs detection automatically as a stage of the internal analysis pipeline, queue-triggered on ingest / re-analysis. It writes the **same** `DetectionRun` to the **same** collection, so the data contract below is identical; only the delivery differs. This page will gain a dedicated **pipeline** section once that stage ships.

Because the data model is shared, the code that *builds* your run is identical regardless of method — switching a producer from API push to an in-pipeline stage later changes only the **sink**, not the payload.

## How it fits together

The `detections` collection is **append-only provenance**: one document per source run, keyed by the recording. The server stores it verbatim (after normalising coordinates) and never edits it. Detections are **immutable** — they record what a producer reported, nothing more.

Keeping detections in their own collection means the rest of the Hub never interprets third-party data, the original producer output stays auditable, and other documents (analysis, media) stay small no matter how many runs accumulate.

{{< rete caption="Where detections fit: any producer hands output to your detection service, which delivers the run to the Hub; the Hub validates, normalises and stores each run in the detections collection" alt="Detection service placement" height="500" >}}
{
  "groups": [
    { "id": "ingest", "label": "Detection ingestion (integrator-owned)", "x":   0, "y":  20, "w": 660, "h": 220 },
    { "id": "hub",    "label": "Hub",                                    "x": 740, "y":  20, "w": 360, "h": 380 }
  ],
  "nodes": [
    { "id": "producer", "kind": "camera", "x": 40, "y": 60, "w": 240, "h": 140,
      "header": "PRODUCER", "title": "Boxes source", "subtitle": "Model / tracker / import" },
    { "id": "detsvc", "kind": "detection", "x": 360, "y": 60, "w": 260, "h": 140,
      "header": "INTEGRATOR", "title": "Detection service", "subtitle": "Assembles \u2192 delivers the run" },
    { "id": "hubapi", "kind": "hub", "x": 780, "y": 60, "w": 280, "h": 140,
      "header": "HUB", "title": "Validate \u00b7 normalise", "subtitle": "Resolve recording key" },
    { "id": "detections", "kind": "storage", "x": 780, "y": 250, "w": 280, "h": 130,
      "header": "DETECTIONS", "title": "detections collection", "subtitle": "Keyed by recording" }
  ],
  "connections": [
    { "from": "producer", "to": "detsvc", "fromSide": "right", "toSide": "left", "label": "boxes" },
    { "from": "detsvc", "to": "hubapi", "fromSide": "right", "toSide": "left", "kind": "thick", "label": "deliver run" },
    { "from": "hubapi", "to": "detections", "fromSide": "bottom", "toSide": "top", "label": "store" }
  ]
}
{{< /rete >}}

## Multiple sources

The `detections` collection holds **one document per run**, so several producers can contribute to the same recording without colliding:

```text
detections (for one recording key) = [
  { source: { name: "acme-face-v2",   ... }, tracks: [...] },
  { source: { name: "my-plate-model", ... }, tracks: [...] }
]
```

Each run is tagged with the `source` that produced it. The server never merges or votes across runs. Keeping runs side by side leaves the door open to surface them as toggleable layers later, without changing the wire contract.

## The detection run

Whichever method delivers it, a detection run has the **same shape**. This is the contract your producer builds against — identical whether the run is pushed over the API or emitted by a future in-pipeline stage. A [delivery method](#methods) only chooses how this run reaches the Hub; everything below describes the run itself.

A single detection run is the target identifier plus the run body. Each field is detailed in its own subsection underneath.

```jsonc
{
  "mediaKey":         "camera-1_1700000000_...",  // recording key; or use analysisId
  "analysisId":      "65a1b2c3d4e5f60001234567", // alternative target
  "task":            "detection",                // optional discriminator
  "schemaVersion":   "1.0",
  "source":          { /* see Source */ },
  "coordinateSpace": "pixel",          // or "normalized"
  "media":           { /* see Media */ },
  "categories":      [ /* optional */ ],
  "tracks":          [ /* see Tracks */ ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `mediaKey` | string | conditional | The recording **key** — the stable string stored as `media.videoFile` and `analysis.key` (**not** the media document's `_id`). Resolved against `analysis.key`. Provide this **or** `analysisId`. Missing both is a rejected run (`400 detections_target_missing` over the API). |
| `analysisId` | string | conditional | Targets the recording via its analysis document `_id` (an ObjectID hex). Ignored when `mediaKey` is set. |
| `task` | string (≤ 64) | no | Forward-compatibility discriminator for the run kind. Defaults to `"detection"`. |
| `schemaVersion` | string (semver) | yes | Currently `"1.0"`. A major mismatch is rejected; minor mismatches succeed with a warning. |
| `source` | object | yes | See [Source](#source). |
| `coordinateSpace` | enum | yes | `"pixel"` or `"normalized"`. Server converts to `"normalized"` on write. |
| `media` | object | conditional | Required when `coordinateSpace == "pixel"`. Recommended otherwise as a sanity check. |
| `categories` | array | no | The producer's class taxonomy. Stored verbatim. |
| `tracks` | array | yes | At least one track, max 5 000 per run. |

### Source

Provenance for the run. Three `kind`s are first-class:

- `pipeline` — produced by an internal Kerberos pipeline microservice.
- `model` — produced by a detection or tracking model run by an integrator.
- `import` — produced by a manual upload or annotation tool export (e.g. CVAT, Label Studio).

```json
{
  "kind":            "model",
  "name":            "acme-face-v2",
  "version":         "2.3.1",
  "runId":           "01HF8C3K9X4Y6Q7Z2N8M5W3R1A",
  "inputWidth":      640,
  "inputHeight":     640,
  "scoreThreshold":  0.25,
  "nmsIou":          0.45,
  "rotationApplied": true
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | enum | yes | `pipeline` \| `model` \| `import`. |
| `name` | string (≤ 64) | yes | Identifies the producer. Used as the layer label in the editor. |
| `version` | string (≤ 32) | yes | Free-form (semver, git SHA, etc.). |
| `runId` | string (≤ 40) | recommended | ULID/UUID. The natural key the upsert matches on. Server generates one if absent, but supplying a stable `runId` is what makes re-deliveries idempotent. |
| `inputWidth` / `inputHeight` | int > 0 | no | Model input resolution. Reproducibility hint. |
| `scoreThreshold` | float `0..1` | no | Cutoff already applied by the producer before sending. |
| `nmsIou` | float `0..1` | no | NMS IoU threshold the producer used. |
| `rotationApplied` | bool | no | Default `true`. Indicates whether boxes are against the rotated/oriented frame. |

### Media

Describes the source media the boxes were authored against. Required when `coordinateSpace == "pixel"` so the server can normalise; optional otherwise, where (together with `fps`/`frameCount`) it drives the non-fatal consistency [warnings](api/#warnings) returned on delivery.

```json
{ "width": 1920, "height": 1080, "fps": 25, "frameCount": 7500, "rotation": 0 }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `width` | int > 0 | required for `pixel` | Oriented frame width. |
| `height` | int > 0 | required for `pixel` | Oriented frame height. |
| `fps` | number > 0 | no | When supplied alongside per-box `timestampMs`, the server validates `|timestampMs − frame * 1000 / fps| ≤ 1000 / fps`. Mismatches emit a `TIMESTAMP_FRAME_MISMATCH` warning but do not reject the box. |
| `frameCount` | int ≥ 0 | no | Used to range-check `frame` values. A box whose `frame ≥ frameCount` is still stored but contributes a `FRAME_OUT_OF_RANGE` warning. |
| `rotation` | int | no | `0` \| `90` \| `180` \| `270` — documentation only. |

### Categories

Optional producer taxonomy. The server stores entries verbatim and does not enforce a global class set.

```json
[
  { "id": 0, "name": "face" },
  { "id": 1, "name": "license_plate", "alias": "plate" }
]
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | int ≥ 0 | yes | Referenced by track/box `classId`. |
| `name` | string (≤ 64) | yes | Canonical class name. |
| `alias` | string (≤ 64) | no | Display alias. Not used for matching. |

### Write semantics (upsert by `runId`)

There is one write behaviour and no `mode` field: the Hub **upserts the run keyed by `(recording key, source.runId)`**. A matching `runId` **replaces** that run atomically (a unique index makes concurrent re-deliveries safe); a new `runId` is **inserted** alongside the recording's existing runs. It only ever touches the `detections` collection.

Send a stable `source.runId` per logical run so retries are idempotent. Omit it and the server generates one, but then a retry can't be de-duplicated and adds a second run.

### Tracks

A **track** represents one subject (a face, a license plate, a person) followed across multiple frames. Its fields are listed below.

```json
{
  "id":            "trk_007",
  "label":         "face",
  "classId":       0,
  "confidence":    0.91,
  "color":         "#FF8800",
  "shape":         "rect",
  "deletedFrames": [],
  "meta":          {},
  "boxes":         [ ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (≤ 64) | yes | Unique within the run. Accepted as int and coerced to string. |
| `label` | string | no | Default label for every box in the track. A per-box `label`, when set, overrides this. |
| `classId` | int | no | Default `categories[].id` for every box. A per-box `classId`, when set, overrides this. |
| `confidence` | float `0..1` | no | Per-track summary score (e.g. mean over boxes). |
| `color` | string `#RRGGBB` | no | UI hint. |
| `shape` | enum | no | `"rect"` (default); `"polygon"` and `"rle"` reserved for future shapes. |
| `deletedFrames` | array of int64 | no | Frame indices to skip when rendering this track. |
| `meta` | object | no | Free-form producer attributes (e.g. `{ "occluded": true }`). Max 4 KB serialised. |
| `boxes` | array | yes | ≥ 1 entry (an empty array is rejected), max 100 000 per track, sorted by `frame` ascending. Repeating a `frame` within a track keeps the **last** box and emits a `DUPLICATE_FRAME` warning. |

### Track boxes

A **box** is one detection of the subject at one frame.

```json
{
  "frame":       7,
  "timestampMs": 280,
  "x": 0.10, "y": 0.20, "w": 0.08, "h": 0.14,
  "confidence":  0.93,
  "label":       "face",
  "classId":     0,
  "edited":      false,
  "smoothed":    false,
  "meta":        {}
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `frame` | int64 ≥ 0 | yes | Frame index in the source media. |
| `timestampMs` | int64 ≥ 0 | recommended | Survives transcodes; preferred over `frame` for cross-encoding alignment. |
| `x`, `y` | number | conditional | **Top-left** corner of the box, in `coordinateSpace` units. Required together with `w`, `h` unless the legacy `{x1, y1, x2, y2}` form is supplied. |
| `w`, `h` | number > 0 | conditional | Width / height in `coordinateSpace` units. Send `{x, y, w, h}` **or** `{x1, y1, x2, y2}`. |
| `x1`, `y1`, `x2`, `y2` | number | conditional | Legacy top-left / bottom-right corner form. Accepted as an alternative to `{x, y, w, h}` and converted to it on write (`w = x2 − x1`, `h = y2 − y1`). |
| `confidence` | float `0..1` | no | Per-box detection score. Preserved on the stored box so a run can be re-thresholded or audited later. |
| `label` / `classId` | string / int | no | Override the per-track values for this frame. Both are preserved on the stored box. |
| `polygon` | `[[x,y,...]]` | no | Required when `track.shape = "polygon"` (reserved). `(x, y, w, h)` must still be supplied as the polygon's axis-aligned bounding box. |
| `keypoints` | `[[x,y,visibility]]` | no | COCO-style keypoints (reserved). |
| `edited` | bool | no | Marks user-modified boxes. |
| `smoothed` | bool | no | Marks smoothed/interpolated boxes. |
| `meta` | object | no | Free-form per-box attributes. |

#### Box geometry rules

- `(x, y)` is the **top-left** corner of the box — not the centre. This matches COCO, MediaPipe, CVAT, Roboflow and DeepStream.
- For pixel coordinates, supply the values in source-frame pixels and include `media.width/height` so the server can normalise.
- For normalized coordinates, every value satisfies `0 ≤ x, y, x+w, y+h ≤ 1` (with a 0.01 tolerance for float rounding). A box within that tolerance is **clamped** to `[0, 1]` on write; a box beyond it is rejected and reported back.
- The server also accepts the legacy `{x1, y1, x2, y2}` corner form. On write it is converted as `x = x1, y = y1, w = x2 − x1, h = y2 − y1`.

## How a run is stored

The run is stored in a dedicated **`detections` collection keyed by the recording** — **not** embedded on the analysis document — the same way no matter which method delivered it.

- **Collection.** Each run is one document in `detections`, carrying the recording `key`, the owning organisation, the `source`, the normalised `tracks`, and audit fields.
- **Keyed by the recording.** Documents are addressed by the recording `key` (the stable identity that survives re-analysis), so a recording accumulates runs without ever bloating its analysis document. A unique `(key, source.runId)` index guarantees one document per run and makes the upsert atomic.
- **On disk.** Coordinates are always `"normalized"` and boxes are stored in normalized `TrackBox` form. The producer's originals are preserved for audit (`originalCoordinateSpace`, `originalBoxForm`), as are per-box `confidence`, `classId` and `label`.
- **Audit fields.** The server sets `createdAt` once on insert and `updatedAt` on every write (epoch millis), and defaults `task` to `"detection"`. It also denormalises the recording's start time into `recordingTimestamp` so a run is expired by cleanup on the same retention clock as its recording rather than by its (possibly much later) delivery time.

### Search enrichment

Storing a run feeds the recording's detection boxes into the media-side region-search index, so detection-sourced objects are findable without reading the `detections` collection:

- **Centroids.** Each track's box centers are projected into the `100×100` space the spatial query uses (`(x1+x2)/2, (y1+y2)/2`, scaled). A long track is compressed to at most 10 centroids and written to `media.metadata.classifications.centroids` (the field the media-document region query reads), one entry per track keyed by its label (or `object` when unlabeled).
- **Spatial only — no facet.** Only region-search geometry is written. The entry's `key` is never surfaced as a classification chip or filter; the real facet field (`classificationSummary`) is intentionally left untouched, and no timeline markers are created, so detections stay spatially discoverable without masquerading as motion classifications.
- **Additive and best-effort.** The write uses `$addToSet`, so it never clobbers analysis-derived points and a re-delivered run contributes the same points idempotently. The enrichment is best-effort: if it fails, the run is still stored and the call still succeeds.

## Contract guarantees

These are properties Kerberos Hub commits to maintaining across minor versions of the schema. Build integrations against them, regardless of delivery method.

1. **Coordinate space.** Producers may send `"pixel"` or `"normalized"`. The server always stores `"normalized"` and preserves the original in `originalCoordinateSpace`.
2. **Box geometry.** Producers may send `{x, y, w, h}` (preferred) or `{x1, y1, x2, y2}`. Stored in normalized `TrackBox` shape.
3. **Separation of stores.** Detections are written only to the `detections` collection. The server stores them verbatim and never mutates other documents.
4. **Idempotency.** A run is upserted on `(recording key, source.runId)`. A stable `runId` makes any retry safe.
5. **Runs are independent.** A run is keyed by `source.runId`; re-delivering that id replaces the run, a new id adds another. Runs from different sources coexist and the server never merges them.
6. **No cross-run merging.** Track ids are scoped to their run; merging is a UI concern.
7. **Per-box validation.** A run with some invalid boxes is accepted and the rejections are returned. A run is rejected whole only when every box is invalid.
8. **Schema evolution.** New optional fields may appear in any minor version. Producers must ignore unknown fields. Breaking changes ship under a new `schemaVersion` major.

## Out of scope

The following are intentionally **not** covered by this contract:

- **Per-frame ingest without tracks.** Producers without a tracker should still send tracks, not loose boxes — a single-box track is fine.
- **Live / streaming detections.** Real-time producers publish onto the existing per-frame Kerberos queues used by the live UI, not these methods. Only finalised runs are accepted here.
- **Cross-source merging or voting.** Surfaced as selectable layers downstream; never combined on the server.
- **Per-box mutation.** A run is the atomic unit — re-deliver the run (same `runId`) to update it.

---

Ready to integrate? See the **[API method](api/)** for how to deliver a run over HTTP — authentication, the `POST /detections` call, the synchronous responses, and a copy-pasteable quickstart.
