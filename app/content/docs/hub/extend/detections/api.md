---
title: "API"
description: "Posting detection runs to the Hub over HTTP — the full POST /detections contract."
lead: "Deliver a detection run to the Hub with a single authenticated POST /detections — available on every deployment."
date: 2026-06-03T00:00:00+00:00
lastmod: 2026-06-03T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "detections"
weight: 10
toc: true
---

The **API push** delivers a detection run to the Hub with a single authenticated `POST /detections`. The exchange is plain REST: one request, one synchronous response, no queue to bind to. It works on **every** deployment (cloud or self-hosted) and is the documented method today.

This page is the **transport** — how to put a run on the wire and what comes back: a quickstart, the `POST` framing, the synchronous response codes, and the REST surface. The run's **shape** — every field, the geometry rules, the stored form and the contract guarantees — is delivery-agnostic and lives on the **[detection run contract](../#the-detection-run)**.

## Getting started

A working integration needs five things: the **base URL**, a **token**, a **recording key**, the **`POST`**, and a way to **verify**. The field-by-field reference is below; this section is the on-ramp.

### Base URL and API version

All detection routes are mounted at the **root** of the Hub API host — `POST /detections`, not under an `/api` or `/analysis` prefix. Substitute your deployment's host for `https://<your-hub-host>` throughout (a local dev API listens on `http://localhost:8081`).

Pin the API version with the `Accept` header so the contract stays stable as the API evolves:

```http
Accept: application/json; version=2026-01-01
```

The header is optional — omitting it resolves to the latest version — but pinning it is recommended for production integrations so a future version can't change behaviour underneath you.

### 1. Authenticate

Detections require a **Bearer token** for a user with write access to the recording's organisation. Obtain one with `POST /login`; the token is returned at `data.token`.

```bash
curl -s https://<your-hub-host>/login \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json; version=2026-01-01' \
  -d '{ "username": "<user>", "password": "<password>" }'
# → { "data": { "token": "eyJhbGci..." }, ... }
```

Use that token as `Authorization: Bearer <token>` on every detection call. For an unattended service, mint a long-lived **access token** scoped to the organisation rather than embedding user credentials.

### 2. Find the recording key

The target is named **in the body** by `mediaKey` — the recording's stable **key**, the same string stored as `media.videoFile` / `analysis.key` (**not** the media document's `_id`). It's the identifier a recording is listed under in the Hub; reuse the exact value your recordings already expose. Alternatively, target by `analysisId` (the analysis document `_id`).

### 3. Post your first run

The smallest valid run: a target, a `source`, a coordinate space, and one track with one box.

```bash
curl -s https://<your-hub-host>/detections \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json; version=2026-01-01' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mediaKey": "camera-1_1700000000_recording",
    "schemaVersion": "1.0",
    "source": { "kind": "model", "name": "acme-face-v2", "version": "2.3.1", "runId": "01HF8C3K9X4Y6Q7Z2N8M5W3R1A" },
    "coordinateSpace": "normalized",
    "tracks": [
      { "id": "trk_001", "boxes": [ { "frame": 0, "x": 0.1, "y": 0.2, "w": 0.08, "h": 0.14 } ] }
    ]
  }'
```

A success returns `201 Created` (or `200 OK` if you re-posted the same `source.runId`) echoing the stored `runId` and any warnings. Because the write is idempotent on `runId`, retrying the exact call is always safe — it replaces rather than duplicates.

```json
{ "runId": "01HF8C3K9X4Y6Q7Z2N8M5W3R1A", "tracksStored": 1, "boxesStored": 1, "rejected": [], "warnings": [] }
```

You can post at **any time after the recording exists**; to correct a run later, re-post it with the **same `runId`**.

### 4. Verify

List the runs now attached to the recording, or fetch the one you just wrote:

```bash
curl -s "https://<your-hub-host>/detections?mediaKey=camera-1_1700000000_recording" \
  -H 'Accept: application/json; version=2026-01-01' \
  -H "Authorization: Bearer $TOKEN"
```

The run also surfaces as a selectable **layer** in the recording's editor, labelled by `source.name`.

That's the whole loop — **authenticate → name the recording → `POST` the run → verify**. The rest of this page is the precise contract for each field, the validation rules, and the stored shape.

## Lifecycle of a detection run

End to end, a run travels from your detection service into the `detections` collection in six steps. Where the [overview diagram](../#how-it-fits-together) shows *where* detections sit, this one follows a single run through its lifecycle.

{{< rete caption="Lifecycle of a detection run — from your detection service into the detections collection" alt="Detection run lifecycle" height="660" >}}
{
  "groups": [
    { "id": "service", "label": "Detection service (integrator-owned)", "x":   0, "y": 20, "w": 320, "h": 630 },
    { "id": "hub",     "label": "Hub API (synchronous)",                "x": 360, "y": 20, "w": 440, "h": 630 }
  ],
  "nodes": [
    { "id": "detsvc", "kind": "detection", "x": 40, "y": 300, "w": 240, "h": 150,
      "header": "INTEGRATOR", "title": "Detection service", "subtitle": "Assemble \u2192 post the run" },
    { "id": "hubapi", "kind": "hub", "x": 440, "y": 90, "w": 280, "h": 150,
      "header": "HUB API", "title": "Validate + normalise", "subtitle": "Resolve recording key" },
    { "id": "detections", "kind": "storage", "x": 440, "y": 300, "w": 280, "h": 150,
      "header": "DETECTIONS", "title": "detections collection", "subtitle": "Upsert by (key, runId)" },
    { "id": "search", "kind": "storage", "x": 440, "y": 510, "w": 280, "h": 120,
      "header": "REGION SEARCH", "title": "media.metadata.classifications", "subtitle": "Best-effort centroids" }
  ],
  "connections": [
    { "from": "detsvc", "to": "hubapi", "fromSide": "right", "toSide": "left", "kind": "thick", "label": "POST /detections" },
    { "from": "hubapi", "to": "detsvc", "fromSide": "left", "toSide": "top", "kind": "dashed", "label": "201 / 207" },
    { "from": "hubapi", "to": "detections", "fromSide": "bottom", "toSide": "top", "label": "store" },
    { "from": "detections", "to": "search", "fromSide": "bottom", "toSide": "top", "kind": "dashed", "label": "enrich" }
  ]
}
{{< /rete >}}

1. **Assemble.** Your detection service collects the boxes it wants to submit and builds one run: a `source` (with a stable `runId`), the boxes as `tracks[]`, and the target (`mediaKey` or `analysisId`). Coordinates go out as `"pixel"` or `"normalized"`.
2. **Post.** The detection service sends a single authenticated `POST /detections` carrying the run. The Hub side is synchronous REST — there is no queue to bind to and the result comes back in the response.
3. **Validate + normalise.** The server checks `schemaVersion`, requires a target, and validates every box. Pixel boxes are normalised to `[0,1]` using `media.width/height`; `{x1,y1,x2,y2}` is converted to the canonical `TrackBox` form. Slightly-out boxes are clamped, out-of-frame boxes are rejected and listed, soft mismatches become warnings.
4. **Resolve the recording.** The target id is resolved to the recording's stable `key` (and its start time, denormalised into `recordingTimestamp` so cleanup expires the run on the recording's retention clock). An unknown or inaccessible target ends here with `404`.
5. **Store + enrich.** The normalised run is **upserted by `(key, source.runId)`** into the `detections` collection — same `runId` replaces, new `runId` adds a sibling. The box centers are then best-effort `$addToSet`-pushed into `media.metadata.classifications.centroids` so the detection is spatially discoverable through region search.
6. **Respond.** The caller gets a synchronous result: `201` stored, `200` replaced, `207` stored-with-rejections, or a `4xx`. Because the write is idempotent on `runId`, retries are safe.

## `POST /detections`

`POST /detections` is the single contract your detection service implements. One request carries one detection run for one recording; everything in this section describes either the wire format or how the server reacts to it.

```http
POST /detections HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>
```

- **Auth.** Bearer token belonging to a user with write access to the recording's organisation.
- **Target.** The recording is named **in the body** (`mediaKey` or `analysisId`) — never in the URL.
- **Idempotency key.** `source.runId` — re-posting the same run replaces, a new `runId` inserts a sibling. See [write semantics](../#write-semantics-upsert-by-runid).
- **Body cap.** 32 MiB; larger requests fail with `413` before parsing. See [Size](#size).
- **Result.** Synchronous. See [Responses](#responses) for the full status table.

### Minimal request

The smallest payload the server accepts is the one shown in the [Getting started](#getting-started) quickstart: a target, a `source`, a coordinate space, and one track with one box. Anything beyond this — `categories`, `media`, per-box `confidence`, multi-frame tracks — is documented below but optional for the contract to succeed.

### Request body

The body is a single **detection run** plus the target identifier. The run's shape — `source`, `coordinateSpace`, optional `media` and `categories`, and the `tracks` of boxes — is identical across delivery methods and is documented field-by-field on the **[detection run contract](../#the-detection-run)** (including [Source](../#source), [Media](../#media), [Categories](../#categories), [Tracks](../#tracks), [Track boxes](../#track-boxes), [write semantics](../#write-semantics-upsert-by-runid) and the [stored shape](../#how-a-run-is-stored)).

```jsonc
{
  "mediaKey":         "camera-1_1700000000_...",  // recording key; or use analysisId
  "schemaVersion":   "1.0",
  "source":          { /* provenance */ },
  "coordinateSpace": "pixel",                     // or "normalized"
  "media":           { /* required for pixel */ },
  "categories":      [ /* optional */ ],
  "tracks":          [ /* one or more */ ]
}
```

The only delivery-specific rules: the request must name a target (`mediaKey` **or** `analysisId`) and a supported `schemaVersion`, or it is rejected with `400` before anything is stored.

## `GET` and `DELETE /detections`

The stored runs are addressable as a REST resource so the editor can list them and a producer can drop a stale one.

```http
GET    /detections?mediaKey={recordingKey}   # list every run for a recording (oldest first)
GET    /detections/{runId}                  # fetch a single run by source.runId
DELETE /detections/{runId}                  # remove a single run by source.runId
```

All three are organisation-scoped: a caller only ever sees or deletes runs their organisation owns.

| Status | Meaning |
|---|---|
| `200 OK` | List returned (possibly empty), run fetched, or run deleted. |
| `400 Bad Request` | `GET /detections` without `mediaKey`, or a missing `runId`. |
| `404 Not Found` | No run with that `runId` exists for the caller (`GET`/`DELETE` by id). |

## Responses

Applies to `POST /detections`. The call is synchronous, so validation results come back in the response — there is no DLQ and no out-of-band event.

| Status | Meaning |
|---|---|
| `201 Created` | Run stored. Body echoes the assigned `source.runId` and any per-box warnings/rejections. |
| `200 OK` | The upsert replaced an existing run with the same `source.runId`. |
| `207 Multi-Status` | Run stored, but some boxes were rejected (e.g. out of frame). The body lists each rejected box with a reason. The run is still usable. |
| `400 Bad Request` | Malformed JSON, no `mediaKey`/`analysisId`, `schemaVersion` major mismatch, a track with no boxes, or **every** box invalid. Nothing is stored. |
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

## Example request

```
POST /detections
```

```json
{
  "mediaKey":         "camera-1_1700000000_recording",
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

## Contract guarantees & scope

The cross-transport promises a producer can build against — coordinate handling, idempotency, store separation, schema evolution — and what is intentionally **not** covered are listed once on the contract page: see [Contract guarantees](../#contract-guarantees) and [Out of scope](../#out-of-scope).
