---
title: "Detections"
description: "Posting third-party detection tracks for a recording so they can be turned into redactions."
lead: "Posting third-party detection tracks for a recording so they can be turned into redactions."
date: 2026-06-02T00:00:00+00:00
lastmod: 2026-06-02T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 305
toc: true
---

A **detection run** is a self-contained bundle of tracks produced by a single source for a single recording. It answers one question — *"what did a detector see in this media?"* — and nothing more. A run never blurs anything on its own; it is candidate data the user can promote into a redaction.

Detections reach the Hub through a **standalone detection service**: your classifier hands it the boxes, and the service **`POST`s the run to the Hub API**, naming the target recording in the body. This is a REST contract, not a queue one — a single authenticated HTTP request with a synchronous result, no exchange to bind to. The API validates and normalises the payload, then stores it in a dedicated **`detections` collection keyed by the recording**, kept **separate** from the `faceRedaction` field the editor owns on the analysis. Bringing your own face-detection model is the primary use case: detect the boxes, let the service deliver them, review them in the editor, and copy the ones you want into the redaction.

## How it fits together

The detection service is a **standalone service**, not a new stage of the internal pipeline. Where the internal motion pipeline feeds the redaction editor over the queue, **a classifier** — the built-in detector or your own — feeds the **detection service**, which posts to the **Hub API** over REST — the Hub never pulls; the detection service always pushes. The editor never reads pipeline output directly: it loads **both** the recording's analysis (`faceRedaction` + motion tracks) and its detection runs (`GET /detections`) through the same Hub API, then copies the tracks it wants into `faceRedaction`. Both paths converge in the same editor, which is the only writer of `faceRedaction`.

The dashed `may trigger` arrow reflects orchestration, not the contract: the **built-in** detector typically runs as a pipeline stage off the back of `hub-pipeline-analysis`, so analysis kicks off classification on the same recording. That coupling is optional — `import` and third-party `model` producers post against an existing recording on their own schedule and never touch analysis at all.

{{< rete caption="Where detections fit: your classifier hands output to the standalone detection service, which POSTs to the Hub API; the editor reads detections back through the same API and copies tracks into the redaction" alt="Detection service placement in the pipeline" height="660" >}}
{
  "groups": [
    { "id": "internal", "label": "Internal analysis (queue-driven)",  "x":    0, "y":  20, "w": 340, "h": 220 },
    { "id": "ingest",   "label": "Detection ingestion (standalone)",  "x":    0, "y": 300, "w": 660, "h": 200 },
    { "id": "hub",      "label": "Hub",                                "x":  740, "y": 300, "w": 360, "h": 340 },
    { "id": "redact",   "label": "Redaction",                         "x": 1480, "y":  20, "w": 320, "h": 440 }
  ],
  "nodes": [
    { "id": "analysis", "kind": "pipeline-analysis", "x": 40, "y": 90, "w": 260, "h": 140,
      "header": "PIPELINE", "title": "hub-pipeline-analysis", "subtitle": "Motion analysis" },
    { "id": "model", "kind": "camera", "x": 40, "y": 330, "w": 240, "h": 140,
      "header": "DETECTOR", "title": "Classifier", "subtitle": "Built-in or custom" },
    { "id": "detsvc", "kind": "detection", "x": 360, "y": 330, "w": 260, "h": 140,
      "header": "STANDALONE", "title": "Detection service", "subtitle": "Ingests \u2192 posts the run" },
    { "id": "hubapi", "kind": "hub", "x": 780, "y": 330, "w": 280, "h": 140,
      "header": "HUB API", "title": "Hub API", "subtitle": "Serves /analysis \u00b7 /detections" },
    { "id": "detections", "kind": "storage", "x": 780, "y": 510, "w": 280, "h": 110,
      "header": "DETECTIONS", "title": "detections collection", "subtitle": "Keyed by recording" },
    { "id": "editor", "kind": "agent", "x": 1510, "y": 90, "w": 260, "h": 150,
      "header": "EDITOR", "title": "Redaction editor", "subtitle": "Promote \u2192 faceRedaction" },
    { "id": "redaction", "kind": "pipeline-redaction", "x": 1510, "y": 300, "w": 260, "h": 140,
      "header": "PIPELINE", "title": "hub-pipeline-redaction", "subtitle": "Apply the blur" }
  ],
  "connections": [
    { "from": "analysis", "to": "model", "fromSide": "bottom", "toSide": "top", "kind": "dashed", "label": "may trigger" },
    { "from": "analysis", "to": "hubapi", "fromSide": "right", "toSide": "top", "kind": "dashed", "label": "faceRedaction + motion" },
    { "from": "model", "to": "detsvc", "fromSide": "right", "toSide": "left", "label": "detections" },
    { "from": "detsvc", "to": "hubapi", "fromSide": "right", "toSide": "left", "kind": "thick", "label": "POST /detections" },
    { "from": "hubapi", "to": "detections", "fromSide": "bottom", "toSide": "top", "label": "store" },
    { "from": "hubapi", "to": "editor", "fromSide": "right", "toSide": "left", "kind": "dashed", "label": "GET analysis + detections" },
    { "from": "editor", "to": "redaction", "fromSide": "bottom", "toSide": "top", "kind": "thick", "label": "submit" }
  ]
}
{{< /rete >}}

Two stores, two jobs:

- **`detections` collection** — append-only provenance, one document per source run, keyed by the recording. The server stores it verbatim (after normalising coordinates) and never edits it. Detections are **immutable**: they record what a detector reported.
- **`faceRedaction`** — the user's curated redaction input on the analysis, exactly as it works today. The editor is the only writer. It is **mutable intent**: the user adds, deletes, smooths and reshapes boxes.

They are kept apart because they have different lifecycles. If incoming detections overwrote `faceRedaction`, every re-post would clobber the user's manual edits — so promotion is a **copy** the editor performs, never a server-side merge. Keeping them separate also means the analysis service never interprets third-party data, the original detector output stays auditable, the analysis document stays small no matter how many runs accumulate, and the user can re-derive a redaction from the source at any time.

## Multiple sources

The `detections` collection holds **one document per run**, so several detectors can contribute to the same recording without colliding:

```text
detections (for one recording key) = [
  { source: { name: "acme-face-v2",   ... }, tracks: [...] },
  { source: { name: "my-plate-model", ... }, tracks: [...] }
]
```

Each run is tagged with the `source` that produced it. Today the editor lets the user pick a run and copy from it; the server never merges or votes across runs. Keeping runs side by side leaves the door open to surface them as toggleable layers later, without changing the wire contract.

## Lifecycle of a detection run

End to end, a run travels from a classifier, through the standalone detection service, to a blurred export in seven steps. Where the diagram above shows *where* detections sit, this one follows a single run through its lifecycle.

{{< rete caption="Lifecycle of a detection run — from your classifier, through the standalone detection service, to a blurred export" alt="Detection run lifecycle" height="660" >}}
{
  "groups": [
    { "id": "producer", "label": "Classifier",                     "x":    0, "y": 20, "w": 300, "h": 630 },
    { "id": "service",  "label": "Detection service (standalone)", "x":  340, "y": 20, "w": 320, "h": 630 },
    { "id": "hub",      "label": "Hub API (synchronous)",          "x":  700, "y": 20, "w": 440, "h": 630 },
    { "id": "user",     "label": "User action",                    "x": 1180, "y": 20, "w": 340, "h": 630 }
  ],
  "nodes": [
    { "id": "model", "kind": "camera", "x": 40, "y": 300, "w": 220, "h": 150,
      "header": "DETECTOR", "title": "Classifier", "subtitle": "Emits detection boxes" },
    { "id": "detsvc", "kind": "detection", "x": 400, "y": 300, "w": 240, "h": 150,
      "header": "STANDALONE", "title": "Detection service", "subtitle": "Assemble \u2192 post the run" },
    { "id": "hubapi", "kind": "hub", "x": 780, "y": 90, "w": 280, "h": 150,
      "header": "HUB API", "title": "Validate + normalise", "subtitle": "Resolve recording key" },
    { "id": "detections", "kind": "storage", "x": 780, "y": 300, "w": 280, "h": 150,
      "header": "DETECTIONS", "title": "detections collection", "subtitle": "Upsert by (key, runId)" },
    { "id": "search", "kind": "storage", "x": 780, "y": 510, "w": 280, "h": 120,
      "header": "REGION SEARCH", "title": "sequences + media", "subtitle": "Best-effort centroids" },
    { "id": "editor", "kind": "agent", "x": 1220, "y": 300, "w": 260, "h": 150,
      "header": "EDITOR", "title": "Promote tracks", "subtitle": "Copy \u2192 faceRedaction" },
    { "id": "redaction", "kind": "pipeline-redaction", "x": 1220, "y": 510, "w": 260, "h": 120,
      "header": "PIPELINE", "title": "hub-pipeline-redaction", "subtitle": "Apply the blur" }
  ],
  "connections": [
    { "from": "model", "to": "detsvc", "fromSide": "right", "toSide": "left", "label": "detections" },
    { "from": "detsvc", "to": "hubapi", "fromSide": "right", "toSide": "left", "kind": "thick", "label": "POST /detections" },
    { "from": "hubapi", "to": "detsvc", "fromSide": "left", "toSide": "top", "kind": "dashed", "label": "201 / 207" },
    { "from": "hubapi", "to": "detections", "fromSide": "bottom", "toSide": "top", "label": "store" },
    { "from": "detections", "to": "search", "fromSide": "bottom", "toSide": "top", "kind": "dashed", "label": "enrich" },
    { "from": "hubapi", "to": "editor", "fromSide": "right", "toSide": "left", "label": "GET /detections" },
    { "from": "editor", "to": "redaction", "fromSide": "bottom", "toSide": "top", "kind": "thick", "label": "submit" }
  ]
}
{{< /rete >}}

1. **Produce.** The classifier runs over an existing recording and emits boxes. It hands them to the **detection service**, which assembles one run: a `source` (with a stable `runId`), the boxes as `tracks[]`, and the target (`mediaId` or `analysisId`). Coordinates go out as `"pixel"` or `"normalized"`.
2. **Post.** The detection service sends a single authenticated `POST /detections` carrying the run. The Hub side is synchronous REST — there is no queue to bind to and the result comes back in the response.
3. **Validate + normalise.** The server checks `schemaVersion`, requires a target, and validates every box. Pixel boxes are normalised to `[0,1]` using `media.width/height`; `{x1,y1,x2,y2}` is converted to the editor's `TrackBox` form. Slightly-out boxes are clamped, out-of-frame boxes are rejected and listed, soft mismatches become warnings.
4. **Resolve the recording.** The target id is resolved to the recording's stable `key` (and its start time, denormalised into `recordingTimestamp` so cleanup expires the run on the recording's retention clock). An unknown or inaccessible target ends here with `404`.
5. **Store + enrich.** The normalised run is **upserted by `(key, source.runId)`** into the `detections` collection — same `runId` replaces, new `runId` adds a sibling. `faceRedaction` is never touched. The box centers are then best-effort `$addToSet`-pushed into both region-search paths (`sequences.images.$.regionCoordinates` and `media.metadata.classifications.centroids`) so the detection is spatially discoverable.
6. **Respond.** The caller gets a synchronous result: `201` stored, `200` replaced, `207` stored-with-rejections, or a `4xx`. Because the write is idempotent on `runId`, retries are safe.
7. **Promote + redact.** Later, in the editor, the user lists the recording's runs (`GET /detections?mediaId=…`), picks one, and **copies** chosen tracks into `analysis.data.faceRedaction[]`. That copy is a snapshot — re-posting the source run afterward never clobbers it. Submitting the redaction hands off to **`hub-pipeline-redaction`**, which performs the actual blur. The server never auto-promotes; this final step is always an explicit user action.

## The endpoint

```
POST /detections
Content-Type: application/json
Authorization: Bearer <token>
```

The target recording is named **in the body** — supply either `mediaId` (the recording/media key) or `analysisId` (the analysis document id). When both are present `mediaId` wins. The caller must have write access to the recording's organisation.

### Request body

A single detection run plus the target identifier.

```jsonc
{
  "mediaId":         "camera-1_1700000000_...",  // recording key; or use analysisId
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
| `mediaId` | string | conditional | The recording/media key. Provide this **or** `analysisId`. Missing both is rejected with `400 detections_target_missing`. |
| `analysisId` | string | conditional | Targets the recording via its analysis id. Ignored when `mediaId` is set. |
| `task` | string (≤ 64) | no | Forward-compatibility discriminator for the run kind. Defaults to `"detection"`. |
| `schemaVersion` | string (semver) | yes | Currently `"1.0"`. A major mismatch is rejected with `400 unsupported_schema_version`; minor mismatches succeed with a warning in the response. |
| `source` | object | yes | See [Source](#source). |
| `coordinateSpace` | enum | yes | `"pixel"` or `"normalized"`. Server converts to `"normalized"` on write. |
| `media` | object | conditional | Required when `coordinateSpace == "pixel"`. Recommended otherwise as a sanity check. |
| `categories` | array | no | The producer's class taxonomy. Stored verbatim. |
| `tracks` | array | yes | At least one track, max 5 000 per run. |

### Source

Provenance for the run. Three `kind`s are first-class:

- `pipeline` — produced by an internal Kerberos pipeline microservice.
- `model` — produced by an external detection / tracking model (the bring-your-own case).
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
| `runId` | string (≤ 40) | recommended | ULID/UUID. The natural key the upsert matches on. Server generates one if absent, but supplying a stable `runId` is what makes re-posts idempotent. |
| `inputWidth` / `inputHeight` | int > 0 | no | Model input resolution. Reproducibility hint. |
| `scoreThreshold` | float `0..1` | no | Cutoff already applied by the producer before sending. |
| `nmsIou` | float `0..1` | no | NMS IoU threshold the producer used. |
| `rotationApplied` | bool | no | Default `true`. Indicates whether boxes are against the rotated/oriented frame. |

### Media

Describes the source media the boxes were authored against. Required when `coordinateSpace == "pixel"` so the server can normalise; optional otherwise, where (together with `fps`/`frameCount`) it drives the non-fatal consistency warnings described below.

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

There is one write behaviour and no `mode` field: the endpoint **upserts the run keyed by `(recording key, source.runId)`**. A matching `runId` **replaces** that run atomically (a unique index makes concurrent re-posts safe); a new `runId` is **inserted** alongside the recording's existing runs. It only ever touches the `detections` collection — **never** `faceRedaction`.

Send a stable `source.runId` per logical run so retries are idempotent. Omit it and the server generates one, but then a retry can't be de-duplicated and adds a second run.

> **Already-promoted tracks are safe.** Copying a run into `faceRedaction` snapshots the tracks at copy time, so replacing the source run afterwards never touches the redaction built from it.

### Tracks

A **track** represents one subject (a face, a license plate, a person) followed across multiple frames. Its shape mirrors `FaceRedactionTrack` so promoting a run into a redaction is a direct copy.

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
| `boxes` | array | yes | ≥ 1 entry (an empty array is rejected with `400`), max 100 000 per track, sorted by `frame` ascending. Repeating a `frame` within a track keeps the **last** box and emits a `DUPLICATE_FRAME` warning. |

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
- For normalized coordinates, every value satisfies `0 ≤ x, y, x+w, y+h ≤ 1` (with a 0.01 tolerance for float rounding). A box within that tolerance is **clamped** to `[0, 1]` on write; a box beyond it is rejected and reported in the response.
- The server also accepts the legacy `{x1, y1, x2, y2}` form already used internally by `hub-pipeline-analysis` and the redaction editor's `TrackBox`. On write it is converted as `x = x1, y = y1, w = x2 − x1, h = y2 − y1`.

## Storage in the detections collection

The run is stored in a dedicated **`detections` collection keyed by the recording** — **not** embedded on the analysis document.

- **Collection.** Each run is one document in `detections`, carrying the recording `key`, the owning organisation, the `source`, the normalised `tracks`, and audit fields. `analysis.data.faceRedaction` is unchanged and stays on the analysis.
- **Keyed by the recording.** Documents are addressed by the recording `key` (the stable identity that survives re-analysis), so a recording accumulates runs without ever bloating its analysis document. A unique `(key, source.runId)` index guarantees one document per run and makes the upsert atomic.
- **On disk.** Coordinates are always `"normalized"` and boxes are stored in the editor's `TrackBox` form, so a promoted run drops straight into `faceRedaction`. The producer's originals are preserved for audit (`originalCoordinateSpace`, `originalBoxForm`), as are per-box `confidence`, `classId` and `label`.
- **Audit fields.** The server sets `createdAt` once on insert and `updatedAt` on every write (epoch millis), and defaults `task` to `"detection"`. It also denormalises the recording's start time into `recordingTimestamp` so a run is expired by cleanup on the same retention clock as its recording rather than by its (possibly much later) post time.

### Search enrichment

Storing a run feeds the recording's detection boxes into the two spatial region-search indexes, so detection-sourced objects are findable without reading the `detections` collection:

- **Sequences path (legacy fetch).** Each track's box centers are projected into the `100×100` space the spatial query uses (`(x1+x2)/2, (y1+y2)/2`, scaled) and `$addToSet`-pushed onto the recording's sequence image (`sequences.images.$.regionCoordinates`). A long track is compressed to at most 10 centroids.
- **Media path (modern list + chart).** The same compressed centroids are written to `media.metadata.classifications.centroids` (the field the media-document region query reads), one entry per track keyed by its label (or `object` when unlabeled).
- **Spatial only — no facet.** Only region-search geometry is written. The media-side entry's key is never surfaced as a classification chip or filter; the real facet fields (`sequences.images.properties` / `classificationSummary`) are intentionally left untouched, and no timeline markers are created, so detections stay spatially discoverable without masquerading as motion classifications.
- **Additive and best-effort.** Both writes use `$addToSet`, so they never clobber analysis-derived points and a re-posted run contributes the same points idempotently. The enrichment is best-effort: if it fails, the run is still stored and the call still succeeds.

## Reading and deleting runs

The stored runs are addressable as a REST resource so the editor can list them and a producer can drop a stale one.

```
GET    /detections?mediaId={recordingKey}   — list every run for a recording (oldest first)
GET    /detections/{runId}                  — fetch a single run by source.runId
DELETE /detections/{runId}                  — remove a single run by source.runId
```

All three are organisation-scoped: a caller only ever sees or deletes runs their organisation owns.

| Status | Meaning |
|---|---|
| `200 OK` | List returned (possibly empty), run fetched, or run deleted. |
| `400 Bad Request` | `GET /detections` without `mediaId`, or a missing `runId`. |
| `404 Not Found` | No run with that `runId` exists for the caller (`GET`/`DELETE` by id). |

## Responses

The call is synchronous, so validation results come back in the response — there is no DLQ and no out-of-band event.

| Status | Meaning |
|---|---|
| `201 Created` | Run stored. Body echoes the assigned `source.runId` and any per-box warnings/rejections. |
| `200 OK` | The upsert replaced an existing run with the same `source.runId`. |
| `207 Multi-Status` | Run stored, but some boxes were rejected (e.g. out of frame). The body lists each rejected box with a reason. The run is still usable. |
| `400 Bad Request` | Malformed JSON, no `mediaId`/`analysisId`, `schemaVersion` major mismatch, a track with no boxes, or **every** box invalid. Nothing is stored. |
| `404 Not Found` | The target recording does not exist or the caller cannot access it. |
| `413 Payload Too Large` | Body exceeds the request size limit (see [Size](#size)). |

### Example response (partial rejection)

```json
{
  "runId": "01HF8C3K9X4Y6Q7Z2N8M5W3R1A",
  "tracksStored": 1,
  "boxesStored": 2,
  "rejected": [
    { "trackId": "trk_007", "frame": 16, "reason": "box_out_of_frame" }
  ],
  "warnings": []
}
```

### Per-box validation

A run containing some invalid boxes is accepted (`207`); the rejections are returned in `rejected[]`. A run is rejected as a whole (`400`) only when **every** box is invalid. This mirrors the "store what's good, report what's not" behaviour producers expect.

### Warnings

Warnings are non-fatal: the run is stored and the offending boxes are kept. They surface producer mistakes that would otherwise be silent. Each is aggregated as a single `warnings[]` entry with a count:

| Warning | Cause |
|---|---|
| `TIMESTAMP_FRAME_MISMATCH` | `timestampMs` disagrees with `frame * 1000 / fps` beyond one frame (needs `media.fps`). |
| `FRAME_OUT_OF_RANGE` | A box `frame` is `≥ media.frameCount`. |
| `DUPLICATE_FRAME` | A track carried more than one box for the same `frame`; the last one was kept. |

### Size

The request body is capped at **32 MiB**; a larger body is rejected with `413 Payload Too Large` before it is parsed. There is no chunking protocol: a run that exceeds the cap must be split into multiple `POST`s, each with its own `source.runId`, which appear as sibling runs from the same `source.name`. In normalized form, the cap comfortably holds a 5 000-track run, so this rarely binds.

## Example request (bring-your-own model)

```
POST /detections
```

```json
{
  "mediaId":         "camera-1_1700000000_recording",
  "schemaVersion":   "1.0",
  "source":          { "kind": "model", "name": "acme-face-v2", "version": "2.3.1", "runId": "01HF8C3K9X4Y6Q7Z2N8M5W3R1A" },
  "coordinateSpace": "pixel",
  "media":           { "width": 1920, "height": 1080, "fps": 25, "frameCount": 7500 },
  "tracks": [
    {
      "id":    "trk_007",
      "label": "face",
      "boxes": [
        { "frame": 0,  "x1": 192, "y1": 216, "x2": 346, "y2": 367 },
        { "frame": 8,  "x1": 230, "y1": 227, "x2": 384, "y2": 378 },
        { "frame": 16, "x1": 269, "y1": 238, "x2": 422, "y2": 389 }
      ]
    }
  ]
}
```

## Contract guarantees

These are properties Kerberos Hub commits to maintaining across minor versions of the schema. Build integrations against them.

1. **Coordinate space.** Producers may send `"pixel"` or `"normalized"`. The server always stores `"normalized"` and preserves the original in `originalCoordinateSpace`.
2. **Box geometry.** Producers may send `{x, y, w, h}` (preferred) or `{x1, y1, x2, y2}`. Stored in the editor's `TrackBox` shape so promotion is a copy.
3. **Separation of stores.** Detections are written only to the `detections` collection. `faceRedaction` on the analysis is changed only by the editor. The server never auto-promotes.
4. **Idempotency.** The endpoint upserts on `(recording key, source.runId)`. A stable `runId` makes any retry safe.
5. **Runs are independent.** A run is keyed by `source.runId`; re-posting that id replaces the run, a new id adds another. Runs from different sources coexist and the server never merges them.
6. **No cross-run merging.** Track ids are scoped to their run; merging is a UI concern.
7. **Per-box validation.** A run with some invalid boxes is accepted (`207`) and the rejections are returned. A run is rejected whole (`400`) only when every box is invalid.
8. **Schema evolution.** New optional fields may appear in any minor version. Producers must ignore unknown fields. Breaking changes ship under a new `schemaVersion` major.

## Out of scope

The following are intentionally **not** covered by this contract:

- **Auto-redaction.** Posting detections never blurs anything. Promotion into `faceRedaction` and submission is always an explicit user action.
- **Per-frame ingest without tracks.** Producers without a tracker cannot drive the redaction workflow meaningfully — send tracks, not loose boxes.
- **Live / streaming detections.** Real-time producers publish onto the existing per-frame Kerberos queues used by the live UI, not this endpoint. Only finalised runs land here.
- **Cross-source merging or voting.** Surfaced as selectable layers in the editor; never combined on the server.
- **Per-box mutation.** A run is the atomic unit on the wire — re-post the run (same `runId`) to update it, then re-promote if needed.
