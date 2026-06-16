---
title: "Ingest service"
description: "One transport-agnostic service that receives a result — from the API or the pipeline queue — and runs the right sequence of actions for its kind."
lead: "Send a result in the same envelope you'd put on the queue; the ingest service routes it by kind and runs that kind's ordered, idempotent actions — the same way whether it arrived over HTTP or the broker."
date: 2026-06-04T00:00:00+00:00
lastmod: 2026-06-12T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "pipeline"
weight: 20
toc: true
---

A result can reach the Hub two ways — an authenticated **API push** or an in-pipeline **queue message** — and each path used to re-implement its own validation, normalisation and persistence. The **ingest service** collapses that into one transport-agnostic core: you send a result in **the same envelope you'd put on the queue**, and the service **routes it by kind** and runs **that kind's ordered sequence of actions**. The HTTP door and the queue consumer become thin doors onto the same logic.

> **"Service" means a package, not a process.** There is **no new microservice, deployment, queue or network hop**. The ingest service is a shared library (`models/pkg/ingest`) compiled *into* both the hub-api and analyser binaries; each calls `Ingest(...)` in-process on its own request. "Service" here names a consistent code path, not a running component.

> **Status — shipped, still growing.** The core (`models/pkg/ingest`), its `detection` and `anpr` kinds, and both callers are live: hub-api's general `POST /ingest` door and the analyser's detection/pose result-handling both route through `Ingest(...)`. What's still rolling in is breadth, not the model — migrating the analyser's remaining built-in result handling (`thumbnail`, `sprite`, …) from its `switch` into handlers, and wiring the optional region-promotion sink. This page builds on the transport mechanics in [Workflows → Integrations](/docs/hub/workflows/integrations/) — read that first for how a worker *delivers* a result; this page is about how the platform *receives* one.

## The idea

> Send your data in the same structure you'd send to the broker. The service orders that data and triggers the correct actions — for example, **detection** data is *inserted into its collection* **and** (from the trusted pipeline) used to *adjust the region-selection on the corresponding media*. The **ANPR** kind runs a similar but different sequence: store the recognised plates, then surface each as a timeline marker.

So "ingest" is not "store the thing". It is **"run the kind's action pipeline"**. Detection and ANPR each happen to be two actions; another kind might be one, or three, with different sinks.

{{< rete caption="Both transports call the same in-process ingest package, which routes by kind and runs that kind's ordered actions — no separate service or network hop" alt="Unified ingest package" height="460" >}}
{
  "groups": [
    { "id": "in",   "label": "Transports (thin doors)", "x":   0, "y":  20, "w": 320, "h": 380 },
    { "id": "svc",  "label": "Ingest package (in-process, shared)",  "x": 380, "y":  20, "w": 300, "h": 380 },
    { "id": "out",  "label": "Actions / sinks",          "x": 740, "y":  20, "w": 340, "h": 380 }
  ],
  "nodes": [
    { "id": "api",    "kind": "vault",             "x":  40, "y":  70, "w": 240, "h": 120,
      "header": "HTTP", "title": "API push", "subtitle": "bearer user \u00b7 maps result\u2192status" },
    { "id": "queue",  "kind": "amqp",              "x":  40, "y": 240, "w": 240, "h": 120,
      "header": "BROKER", "title": "Queue consumer", "subtitle": "system identity \u00b7 ack / nack" },
    { "id": "ingest", "kind": "pipeline-analysis", "x": 410, "y": 150, "w": 240, "h": 130,
      "header": "PACKAGE", "title": "Ingest", "subtitle": "in-process · route by kind → run actions" },
    { "id": "coll",   "kind": "storage",           "x": 780, "y":  70, "w": 260, "h": 120,
      "header": "DATABASE", "title": "detections", "subtitle": "action 1 \u00b7 upsert by (Key, RunId)" },
    { "id": "region", "kind": "storage",           "x": 780, "y": 240, "w": 260, "h": 120,
      "header": "DATABASE", "title": "region selection", "subtitle": "action 2 \u00b7 promote Tracks" }
  ],
  "connections": [
    { "from": "api",    "to": "ingest", "fromSide": "right", "toSide": "left",  "kind": "thick",  "label": "envelope" },
    { "from": "queue",  "to": "ingest", "fromSide": "right", "toSide": "left",  "kind": "thick",  "label": "envelope" },
    { "from": "ingest", "to": "coll",   "fromSide": "right", "toSide": "left",  "label": "action 1" },
    { "from": "ingest", "to": "region", "fromSide": "right", "toSide": "left",  "kind": "dashed", "label": "action 2" }
  ]
}
{{< /rete >}}

## Two routing axes (don't conflate them)

The single biggest design risk is merging two different "routings" into one switch. Keep them separate:

- **Kind** — *what is this result?* `detection` vs `anpr` vs (later) `thumbnail` / `sprite`. Different shapes, **different sinks**, different action sequences. Each kind is its own registered handler.
- **Task** — *which flavour within a kind?* Inside `detection`: `box` and `pose`. Both produce a `DetectionRun`, share the same validation skeleton and the **same `detections` collection** — pose reports its subject as a per-frame box, so it reuses the box task rather than being a separate kind.

```text
envelope ──▶ route by KIND ──┬─▶ detection handler ──▶ route by TASK ──▶ box | pose
                             ├─▶ anpr handler        (own anpr collection)
                             ├─▶ thumbnail handler   (later)
                             └─▶ sprite handler      (later)
```

The kind dispatcher is a thin router over a **registry of handlers**. The task router lives *inside* the detection handler. This nesting matters because tasks share a contract (`DetectionRun`) while kinds do not — and it is exactly why **ANPR is its own kind, not a detection task**: a plate read is recognised *text* with candidate reads, not a box, so it has its own `ANPRRun`, its own `anpr` collection and its own actions.

## The envelope is the shared contract

The unifying move: **`{operation, payload}` is the ingest core's input contract** — not necessarily the literal wire of every transport. Each *door* (the queue consumer, the general `POST /ingest` endpoint) maps its own wire onto this shape, resolves the recording it targets, and calls `Ingest`. The doors differ; the contract they feed does not.

Over HTTP this contract is `api.IngestRequest`:

| Field | Role |
|---|---|
| `operation` | the **kind** selector — the registry key the dispatcher routes on (e.g. `detection`) |
| `mediaKey` *or* `analysisId` | the **recording reference** — names *which* media the result attaches to (`mediaKey` wins if both are set) |
| `payload` | the **typed result** for that kind (e.g. an `api.PostDetectionsRequest` body for `detection`) |

**Two doors, one core — but only one delegates today.** The general `POST /ingest` door is the thin adapter over `Ingest`: it binds the `{operation, payload}` envelope, builds a `Scope`/`Target`, and routes by `operation`. The existing typed [`/detections`](../../extend/detections/api/) endpoint is kept **exactly as-is** alongside it — rather than have it call `Ingest`, the `/ingest` door **reuses the detections repository** (through a `DetectionStore` sink) so the battle-tested upsert, duplicate-key retry and region-search enrichment stay intact. So a new kind gets the general door for free; detection keeps its ergonomic typed endpoint; and the shared write lives in one place. Collapsing the typed endpoint onto `Ingest` too is possible later, but isn't needed.

> **Caveat — `payload` is the result channel; `data` is not.** `PipelineEvent.Data` is a deprecated `map[string]interface{}` and on dispatch carries only storage credentials. The ingest core reads the typed result from **`payload`** (`PipelineEvent.Payload.Result` on the queue), never from the legacy `data` bag. The generic `data.<operation>` enrich-in-place sink (see [Integrations](/docs/hub/workflows/integrations/#enrich-in-place)) still exists for stages **without** an ingest handler; once a kind has a handler, its result travels as the typed `payload` and the handler owns the side-effect in place of a generic `$set data.<op>`.

## Where it lives

Because the pipeline (`hub-pipeline-analysis`) calls this too, the routing **cannot** live under hub-api's `internal/` — Go's `internal/` rule makes it un-importable. It lives in the shared `models` module that both apps already depend on, split by dependency weight:

| Concern | Why | Home |
|---|---|---|
| **Routing** — validate, task-route, normalise, build the run | pure; needs only types already in `models` | **`models/pkg/ingest`** (infra-free) |
| **Persistence** — the `(Key, RunId)` upsert, region promotion, marker upsert | needs a live `*mongo` handle + context | each app's repo, injected as a **sink** on `Scope` |
| **Auth / scope** — bearer user vs recording owner | genuinely differs per transport | each adapter |
| **Transport** — gin handler / queue consumer + ack | HTTP status vs ack/nack | each app |

Keeping `models/pkg/ingest` infra-free keeps it a fast, testable library while still giving **one** implementation of the routing: the package declares the persistence steps as **sink interfaces** (`DetectionStore`, `RegionPromoter`, `ANPRStore`, `MarkerStore`) and each app supplies the concrete Mongo implementation on the `Scope` it passes in. The package routes *every* kind — detection and anpr are simply the first handlers — and has no `models`-internal coupling, so it can lift out into its own module later with a move, not a rewrite.

## A handler is an action pipeline

A handler is not `ingest → upsert`. It is a **decode step plus an ordered list of idempotent effects** sharing one context:

```go
type Action interface {
    Name() string
    Apply(ctx context.Context, scope Scope, target Target, run any) error
    RunFor(source Source) bool // gate an action by transport / trust
}

// A handler decodes the payload once (validate + task-route + normalise) into a
// typed run, then runs its ordered actions against that run.
type Handler struct {
    Kind    string
    Decode  func(scope Scope, target Target, payload json.RawMessage) (run any, report Report, err error)
    Actions []Action
}

var handlers = map[string]Handler{
    detectionHandler.Kind: detectionHandler, // UpsertDetectionRun, PromoteTracksToRegions
    anprHandler.Kind:      anprHandler,      // UpsertANPRRun, CreateANPRMarkers
    // "thumbnail", "sprite" — migrated from the analyser switch later
}

// the ONE entry point every caller uses:
func Ingest(ctx context.Context, scope Scope, target Target, kind string, payload json.RawMessage) (Report, error) {
    h, ok := handlers[kind]
    if !ok {
        return Report{}, fmt.Errorf("%w: %s", ErrUnknownKind, kind)
    }
    run, report, err := h.Decode(scope, target, payload) // decode ONCE
    if err != nil {
        return report, err
    }
    for _, a := range h.Actions {
        if !a.RunFor(scope.Source) { // skip side-effects this transport isn't trusted for
            continue
        }
        if err := a.Apply(ctx, scope, target, run); err != nil {
            return report, fmt.Errorf("ingest: action %q failed: %w", a.Name(), err)
        }
    }
    return report, nil
}
```

The dispatcher decodes once, then owns only shared plumbing (look up handler, run actions, map errors). Each action owns its own sink — essential, because the sinks genuinely differ (own collection vs enrich-in-place). The decoded, typed `run` is what every action consumes; the moment the dispatcher starts `switch`-ing on kind to do real work, it has become the hardcoded switch it was meant to replace.

The per-request context an action needs travels on the **`Scope`** (the `Source` transport/trust axis plus the sink interfaces the app wired) and the **`Target`** (the resolved recording: `Key`, `OrganisationId`, and the denormalised `DeviceId` / `RecordingTimestamp` used for retention-aware cleanup). Each handler returns a kind-agnostic `Report` (the run id, warnings, and a kind-specific `Detail.Summary()` for logs).

## Two registries, two jobs

There are **two** registries that both key on the operation id, and conflating them is the easy mistake. They govern different ends of the journey:

| | Stage registry (config) | Ingest handlers (Go) |
|---|---|---|
| Lives in | `workflows` values / operation registry — see [Integrations](/docs/hub/workflows/integrations/#registering-a-stage) | `models/pkg/ingest` `handlers` map |
| Governs | enqueue, queue name, allow-list, completion tracking (the **outbound** half) | the typed actions run on a **returned** result (the **inbound** half) |
| Needed for | **every** stage | only when the producer **delegates** persistence to the platform |
| Cost to add | a config edit | a code change + release |

**The core write is never optional — only its location moves.** A returned result is never just "tracked and dropped"; something is always written. The fork is *who writes it*:

- **Self-persist (own collection).** An in-cluster worker writes its own collection directly and just acks. The mandatory write still happens — in the worker. No ingest handler; the platform only records `resolvedoperations`.
- **Delegated persist (ingest handler).** The worker hands back a typed `payload` and the **handler** does the write. When a handler exists, its **first action is the mandatory persistence** (e.g. `UpsertDetectionRun`); it is never side-effect-only. Any further actions are the *optional* side-effects, and those are the only thing `RunFor(source)` gates.

So a stage with **no** ingest handler is not a stage with no effect — it is a **self-persisting** stage. The adapter routes a completion to `Ingest` **only when a handler is registered** for that kind; otherwise it's a self-persist / generic [`data.<op>`](/docs/hub/workflows/integrations/#enrich-in-place) completion — recorded, not routed. Hitting `Ingest` for a handler-less kind would be the bug, not the absence of a handler.

### Who persists vs which transport

"Self-persist vs delegated" is **not** the same line as "pipeline vs API" — they're independent axes:

| Axis | Values | Driven by |
|---|---|---|
| Who writes the core | self-persist / delegated | does the producer have DB access — an **API** client never does, so API is **always** delegated |
| Optional side-effects | run / skip | trust of the **source** (`RunFor`) — *this* is the real pipeline-vs-API difference |
| Completion ack | ack / none | is a dispatched op waiting (pipeline yes; a standalone API push no) |

API push is therefore always **delegated** (an HTTP client can't write Mongo); an in-cluster pipeline stage may self-persist **or** delegate. When the *same* delegated handler is invoked from both transports, the **core write is identical** — only the `RunFor`-gated side-effects (e.g. promoting to redaction regions) and the ack differ. The transport never changes *what* is persisted; it changes *which optional effects* run and *whether anything is waiting*.

## Detection — the reference kind

Detection's two-action sequence is not hypothetical; the [models](../../../) are shaped for it. In `analysis.go`:

- `DetectionRun.Tracks` is `[]FaceRedactionTrack` — the **same type** as `FaceRedaction.Tracks`.
- The model comment says it outright: *"Tracks reuse FaceRedactionTrack so promoting a run into a redaction is a direct copy."*
- `Analysis` carries both `FaceRedaction []FaceRedaction` and `Regions []Region` — the "region selection".

So:

1. **`UpsertDetectionRun`** — upsert the `DetectionRun` into the `detections` collection, keyed by `(Key, Source.RunId)`.
2. **`PromoteTracksToRegions`** — copy the run's `Tracks` onto the corresponding media's `FaceRedaction` / `Regions` (a near-direct copy by design).

**POSE** reuses this exact sequence: a pose producer reports its subject as a per-frame box, so it is a *task* inside the detection kind (it routes through the box task and is stored as a `DetectionRun`), not a separate kind. **ANPR**, by contrast, is its **own kind** — a plate read is recognised *text*, not a box — with its own `ANPRRun`, its own `anpr` collection and its own two actions: `UpsertANPRRun` then the trusted-only `CreateANPRMarkers` (one timeline marker per recognised plate). Same router, different action lists — exactly the "similar but different sequence" the design targets.

### Task sub-registry within detection

Inside the detection handler, the `Task` discriminator selects the validator / normaliser:

```go
type TaskHandler interface {
    Validate(req api.PostDetectionsRequest) error
    Normalize(req api.PostDetectionsRequest) (models.DetectionRun, Report)
}

var taskRegistry = map[string]TaskHandler{
    models.DetectionTask: boxTask{}, // "detection" (default / box)
    "pose":               boxTask{}, // pose emits the same box contract
}
```

Both tasks share the bounding-box contract (`api.PostDetectionsRequest`), so they route to the same `boxTask` and store a `DetectionRun`. A task that later needs a different geometry contract gets its own handler here without touching either transport — and a result whose shape isn't a box at all (recognised text, embeddings, …) is a new *kind*, not a task.

## The two adapters

| Concern | API door (hub-api) | Pipeline adapter (analyser) |
|---|---|---|
| Input | `MaxBytesReader` + `ShouldBindJSON` of `api.IngestRequest` | consume message → build the kind's payload from `event.Payload.Result` |
| Target | `mediaKey` / `analysisId` from the envelope | recording key + device + timestamp from the media (`event` / `media`) |
| Identity / source | authenticated bearer user → `SourceAPI` | recording's owner, resolved from the media (no token) → `SourcePipeline` |
| Sinks wired | `DetectionStore` only (no promoter → no auto-redact) | `DetectionStore` only (promotion is a separate, user-driven flow) |
| Output | map `Report`/error → HTTP status (201/200/207/400/404) | log the `Report`; record completion on the analysis |

Both build the **same typed payload** that the shared `models/pkg/api` types define (e.g. `api.PostDetectionsRequest`), so there is no DTO duplication; the difference is the `Source` they stamp on the `Scope` (which gates the trusted-only actions) and how they report the result. The analyser's `ProcessDetection` handles the `detection` and `pose` operations by delegating to `Ingest` as `SourcePipeline`.

**API push: standalone or status update.** An API push that is *not* fulfilling a pipeline-dispatched operation is **standalone** — the run is stored and nothing is waiting on it; the rest of the Hub reads the collection directly. Only when a result *fulfils a dispatched operation* does the pipeline record it against the analysis so `resolvedOperations` reflects it. The shared ingest call is identical either way — the caller alone decides whether anything is waiting, because it alone knows whether a run dispatched the work.

## Pipeline tracking

When a result arrives over the **queue** (not the API), the platform also has to *track* that the dispatched operation completed.

**Resolution reuses the existing tier.** There is **no separate `workflowOperations` list** — completion is recorded on the analysis's existing `resolvedOperations` with an idempotent `$addToSet resolvedoperations`. Because it's `$addToSet`, a redelivered result is a no-op; and because custom/async stages are **non-gating** (completion is bounded by `requiredOperations` plus a backstop timeout), a *missing* record can't wedge the run. Resolution is provenance, not a barrier.

**The stage registry is the allow-list.** Which operations may be dispatched (and to which queue) is governed by the workflows engine's enabled-stage registry — the `kerberoshub.workflows.stages` block described in [Integrations](/docs/hub/workflows/integrations/#registering-a-stage). The derived queue name is `kcloud-<id>-queue.fifo`; the registry is the source of truth for what is allowed to run. (Hardening the analyser's own dispatch to reject any operation *not* in the registry — which would catch latent queue-name drift such as the hardcoded `classify → kcloud-thumby-queue`, missing its `.fifo` — is a worthwhile follow-up; the registry already gives the exact allow-list to check against.)

> **Idempotency lives in the action, not the list.** `resolvedOperations` tracks *that* an operation completed (at-most-once recording). It does **not** make the side-effect idempotent — that has to be the action's own keyed upsert (`(Key, RunId)` for detection/anpr runs, a stable identity for markers) so a redelivery replaces rather than duplicates.

## Consistency & idempotency

This is the genuinely hard part — not the routing.

- **At-least-once delivery.** The broker can redeliver, so a handler's whole action sequence can re-run. Every action must be **idempotent**: upsert the run by `(Key, RunId)`; make region promotion *replace* a run's contribution keyed by `RunId` rather than append. A replay then becomes a no-op.
- **Multi-document writes.** Action 1 writes `detections`; action 2 mutates the analysis doc. Idempotent keyed actions make a partial apply self-healing on retry — preferable to a distributed transaction. A Mongo session transaction (same cluster) is the fallback if two effects must ever be truly atomic.
  - **Known limitation (accepted for now).** The queue path self-heals on redelivery, but the API path is a *single request with no redelivery* — a crash between the two writes leaves a partial apply with nothing to retry it. Revisit with a session transaction or a reconcile pass; not a blocker today.
- **Per-source gating.** An external API push auto-mutating a media's redaction regions is a **policy** decision, not just routing. The `RunFor(source)` predicate lets the same kind run a fuller sequence internally (pipeline) than externally (untrusted producer) — e.g. external posts store the run but don't auto-promote to redaction.

## What's shipped vs still rolling in

| Piece | Status |
|---|---|
| Shared `models/pkg/ingest` routing package (kind dispatcher) | **shipped** |
| `detection` kind — validate / task-route / normalise / upsert by `(Key, RunId)` | **shipped** (box + pose tasks) |
| `anpr` kind — own `ANPRRun` / `anpr` collection / marker side-effect | **shipped** |
| `RunFor` per-source action gating (API delegated; trusted side-effects pipeline-only) | **shipped** |
| General `POST /ingest` door (`api.IngestRequest`) reusing the detections repo via a sink | **shipped** |
| Analyser delegates `detection` / `pose` result handling to `Ingest` | **shipped** |
| `DetectionRun.Tracks` reuses `FaceRedactionTrack` (promotion-ready) | **shipped** in `models` |
| `PromoteTracksToRegions` wired to a live `RegionPromoter` sink | **not yet** — the action exists and is pipeline-gated, but no promoter is wired, so it currently no-ops |
| Migrating the analyser's `thumbnail` / `sprite` result handling into handlers | **not yet** — still in the analyser's `switch` |
| Hardening dispatch with a registry allow-list (reject unknown ops / queue-name drift) | **not yet** — registry governs dispatch; the explicit reject-check is a follow-up |

## Remaining work

The model is in place; what's left is breadth and a few hardening passes:

1. **Wire a live `RegionPromoter`** so `PromoteTracksToRegions` stops no-opping — turning pipeline-sourced tracks into real redaction regions on the media (still `RunFor`-gated to the trusted pipeline).
2. **Migrate the analyser's remaining built-in result handling** (`thumbnail`, `sprite`, …) from its hardcoded `switch` into ingest handlers, so every result type shares one routing core.
3. **Harden dispatch with the stage registry as an allow-list** — reject operations not in the registry and close latent queue-name drift (e.g. the hardcoded `classify → kcloud-thumby-queue`, missing its `.fifo`).
4. *(Optional)* **Collapse the typed `/detections` endpoint onto `Ingest`** once the general door has fully proven out — today it deliberately stays as-is so the battle-tested write path is untouched.

## See also

- [Workflows → Integrations](/docs/hub/workflows/integrations/) — how a worker *delivers* a result (transport, queues, completion ack).
- [Detections → Pipeline](../../extend/detections/pipeline/) — the detection capability delivered as a stage.
- [Detections → API](../../extend/detections/api/) — the same detection contract over HTTP.
