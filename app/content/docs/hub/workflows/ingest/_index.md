---
title: "Ingest"
description: "How a workflow stage hands a result back to the platform: a self-describing block envelope the shared ingest core routes — block by block — into platform-owned storage."
lead: "Return one envelope of typed blocks; the ingest core routes each block by its own type and runs that block's ordered, idempotent actions — the same whether the result arrived over the queue or the API."
date: 2026-06-04T00:00:00+00:00
lastmod: 2026-06-16T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "workflows"
    identifier: "ingest"
weight: 20
toc: true
---

A **stage** is a step in a workflow; you implement it as a **microservice**. [Stages](../stages/) covers how your microservice *connects* — the queue it consumes, the `WorkflowRun` envelope it receives, and how to register the stage. This page is the other half: **what your microservice hands back**, and what the platform does with it.

When a stage wants the platform to store its result — rather than running its own database — it returns a **block envelope**: a small, self-describing list of typed *blocks*. One shared **ingest core** (`ingest/pkg/ingest`) routes each block by its own type, runs that block type's ordered, idempotent actions, and writes it into the platform-owned collection. The same core runs whether the result arrived over the workflows queue (a pipeline stage) or the public API (`POST /ingest`) — only the trust level differs.

> **Ingest is a code path, not a service.** There is no separate microservice, deployment or network hop. The ingest core is a shared library compiled *into* the workflows engine and the hub-api binary; each calls `IngestBlocks(...)` in-process on its own request. "Ingest" names a single, consistent code path for *receiving* a result, not a running component.

## The block envelope

A delegated-ingest microservice returns its result as a `BlockEnvelope`, set on the `payload` field of the `WorkflowRun` it routes back (see [Stages → Sending a result back](/docs/hub/workflows/stages/#sending-a-result-back)):

```json
{
  "schema": "1.0",
  "blocks": [
    { "type": "detection", "data": { "...": "a PostDetectionsRequest" } },
    { "type": "marker",    "data": { "...": "a Marker" } }
  ]
}
```

- **`blocks`** is an ordered list; each **block** is one self-describing unit of the result.
- **`type`** selects the handler — it names *what kind of result this is*, and the ingest core routes on it.
- **`data`** is that block type's own body — the **same typed payload the platform's typed endpoints already validate** (a `detection` block's `data` is a `PostDetectionsRequest`; a `marker` block's `data` is a `Marker`).
- **`schema`** (optional, per-envelope and per-block) lets a producer version its payload.

The envelope replaces the single typed body the old per-kind entry point took, so **one result can carry several, heterogeneous blocks** — for example a detection plus a couple of timeline markers — and each is decoded and persisted independently. The same `type` may appear more than once, so each block must carry its own stable identity (e.g. a distinct detection `source.runId`).

## Block types

The core ships a small, closed set of block types — `detection` and `marker` today. A producer stamps each block's `type` with one of them, and that `type` names the **result shape**, not the stage that produced it: a stage that finds bounding boxes emits a `detection` block whatever it is detecting, and one envelope may carry several blocks of different types.

The full catalogue — each type's `data` contract, where it is stored, and which transports may emit it — lives under **[Blocks](blocks/)**.

## How the platform processes an envelope

{{< rete caption="A stage's result is a block envelope; the shared ingest core routes each block by its own type into the platform-owned collection — no separate service or network hop." alt="Block envelope routed by the ingest core" height="440" >}}
{
  "groups": [
    { "id": "src",  "label": "Stage",                             "x":   0, "y": 20, "w": 300, "h": 380 },
    { "id": "core", "label": "Shared ingest core (in-process)",   "x": 360, "y": 20, "w": 300, "h": 380 },
    { "id": "out",  "label": "Platform-owned collections",        "x": 720, "y": 20, "w": 330, "h": 380 }
  ],
  "nodes": [
    { "id": "env",    "kind": "amqp",              "x":  30, "y": 150, "w": 240, "h": 130,
      "header": "RESULT", "title": "BlockEnvelope", "subtitle": "[ detection, marker, \u2026 ]" },
    { "id": "ingest", "kind": "pipeline-analysis", "x": 390, "y": 150, "w": 240, "h": 130,
      "header": "PACKAGE", "title": "IngestBlocks", "subtitle": "route each block by its type" },
    { "id": "det",    "kind": "storage",           "x": 760, "y":  70, "w": 250, "h": 120,
      "header": "DATABASE", "title": "detections", "subtitle": "detection block \u2192 DetectionRun" },
    { "id": "mark",   "kind": "storage",           "x": 760, "y": 240, "w": 250, "h": 120,
      "header": "DATABASE", "title": "markers", "subtitle": "marker block \u2192 Marker" }
  ],
  "connections": [
    { "from": "env",    "to": "ingest", "fromSide": "right", "toSide": "left", "kind": "thick", "label": "payload" },
    { "from": "ingest", "to": "det",    "fromSide": "right", "toSide": "left", "label": "detection" },
    { "from": "ingest", "to": "mark",   "fromSide": "right", "toSide": "left", "label": "marker" }
  ]
}
{{< /rete >}}

Every envelope flows through one entry point, `IngestBlocks`, which is deliberately **all-or-nothing at the front door**:

1. **Pre-pass — validate the whole envelope first.** Before *any* write, the core checks the block count is within the cap (64 per envelope), verifies that **every** block's `type` is registered and permitted from this source, and decodes each body through its kind-specific validator. An unknown, forbidden, or malformed block rejects the **entire** envelope before side effects begin.
2. **Apply the decoded blocks in order.** Once every body has decoded successfully, the core runs each block type's **ordered actions** against its typed value. The first action is always the mandatory persistence — the keyed upsert; any later actions are optional side-effects. Writes are idempotent but are not one cross-collection transaction, so a later sink failure may follow an earlier successful write and trigger a safe redelivery.
3. **Report per block.** Each block yields a small report — its run id, a one-line summary, any warnings — which the caller logs.

How a failure is classified decides whether the caller retries — see [Idempotency & retry](#idempotency--retry).

## Two routing axes

Routing happens on two independent axes; keeping them separate is what keeps the core simple:

- **Block `type` — what this result is.** *What is this result?* `detection` vs `marker`. Different shapes, different collections, different action sequences. Routed by the handler registry on `type`.
- **Task — a flavour within a type.** *Which variant of this shape?* Inside `detection`, `box` and `pose` both report an axis-aligned box per frame, share one contract (`PostDetectionsRequest`) and one `detections` collection, so they route to the same handler. A result whose shape is genuinely different — a marker is a timeline annotation, not a box — is its **own block type**, not a task.

## Trust: the source allow-list

The same envelope can arrive from two transports, and they are **not** equally trusted:

- **`pipeline`** — an in-cluster stage handing a result back over the workflows queue. Trusted: the full action sequence runs.
- **`api`** — an authenticated external `POST /ingest`. Always *delegated* (an HTTP client cannot write the database itself) and *untrusted*: the mandatory write runs, but trusted-only side-effects are gated off.

Two controls enforce that boundary:

- **Per-block-type allow-list.** Each block type declares which sources may emit it. The default is **pipeline-only**, so a new block type is never accidentally writable over the public API until it explicitly opts in. `detection` allows both API and pipeline; `marker` is pipeline-only.
- **Per-action gating.** Within a handler, the mandatory persistence runs for every source, while a trusted-only side-effect — for example promoting a detection's tracks onto the recording's redaction regions — runs only for `pipeline`. So the *same* detection block from the API stores its run but skips the privileged effect.

## Idempotency & retry

Delivery is **at-least-once**: the broker can redeliver, and the same envelope may be applied more than once. Every action is therefore **idempotent** — a keyed upsert (`detection` by `(key, source.runId)`, `marker` by `(organisation, device, name, startTimestamp)`) — so a replay refreshes rather than duplicates.

That makes the failure classification safe:

- **Persistence failure → retryable.** A transient sink/database write error is tagged `ErrPersist`. On the queue path the engine **re-queues** the message so the durable write is retried; the idempotent upserts make redelivery a refresh, never a duplicate. Because each block's write is idempotent, even a *mid-envelope* failure is safe to retry whole — re-applying the blocks that already landed simply refreshes them.
- **Decode / validation / forbidden block → non-retryable.** A malformed envelope, an unknown or forbidden block type, or a body that fails validation cannot be fixed by redelivery. The result is **recorded without ingest** and the message is acked — a bad envelope never poisons the queue.

## Delegated or self-persisting

Returning a block envelope is the **delegated** option: the platform owns the write. It is the right choice when your result maps onto an existing block type and you would rather not run a database — your microservice needs no database access at all.

The alternative is **self-persisting**: your microservice writes its own collection and hands back only its routing values under `results[<operation>]`, so conditions and downstream stages can still read it. Then `payload` stays empty.

A microservice picks exactly one — **never both**. See [Stages → Sending a result back](/docs/hub/workflows/stages/#sending-a-result-back) for where each sits in the result contract:

- **Delegated / enrich in place** → return a block envelope *(this page)*.
- **Self-persisting / own collection** → write your collection, return `results[operation]`.

## Two transports, one core

The same package sits behind both transports; only the adapter around it differs.

### Over the workflows queue (pipeline stages)

The workflows engine wires the core to the run it already owns:

- The **target** is the run's *own* recording — its `key`, organisation and device, plus the recording timestamp persisted when the run opened, so a derived artifact expires on the recording's retention clock rather than the post time. A `data` body that carries its own recording reference (e.g. a `PostDetectionsRequest` `mediaKey`) is **ignored** on the queue path; the run decides the target.
- After a successful ingest the engine **mirrors the blocks into `results[<operation>]`, grouped by block type** (`results.<operation>.detections`, `…markers`, one array per type that occurred) so the stage resolves and any conditional stage waiting on it can fire. The block bodies are decoded, so a downstream condition can branch on what the stage produced — including element-wise with a `*` wildcard (`results.<operation>.detections.*.score`). See [Matching inside arrays](/docs/hub/workflows/stages/#matching-inside-arrays).

### Over the API (`POST /ingest`)

The public endpoint is the same core behind an HTTP door. It takes a single `{operation, payload, mediaKey | analysisId}`, wraps it as a **one-block** envelope (`type = operation`, `data = payload`), resolves the target from `mediaKey`/`analysisId`, stamps the source as `api` (so trusted side-effects gate off), and maps the per-block report to an HTTP status — one block in, one block report out.

## Where it lives

The core is `ingest/pkg/ingest`, a deliberately **infra-free** library: it depends only on the model types and on the **sink interfaces** it declares (`DetectionStore`, `MarkerStore`, `RegionPromoter`). Each app supplies the concrete Mongo implementation when it builds the `Scope` it passes in, so the routing has one implementation while persistence stays in each app's repository layer. Adding a block type is a new handler plus its ordered actions — the dispatcher never grows a case.

## See also

- [Blocks](blocks/) — the catalogue of block types and the `data` contract behind each.
- [Stages](../stages/) — how your microservice connects, the `WorkflowRun` contract it codes against, and registering a stage.
- [Detection](blocks/detection/) — the `detection` block's `data` contract: tracks, boxes, coordinate spaces and how a run is stored.
