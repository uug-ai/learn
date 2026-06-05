---
title: "Ingest service"
description: "One transport-agnostic service that receives a result — from the API or the pipeline queue — and runs the right sequence of actions for its kind."
lead: "Send a result in the same envelope you'd put on the queue; the ingest service routes it by kind and runs that kind's ordered, idempotent actions — the same way whether it arrived over HTTP or the broker."
date: 2026-06-04T00:00:00+00:00
lastmod: 2026-06-04T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "pipeline"
weight: 20
toc: true
---

A result can reach the Hub two ways — an authenticated **API push** or an in-pipeline **queue message**. The **ingest service** gives both a single transport-agnostic core: you send a result in **the same envelope you'd put on the queue**, and the service **routes it by kind** and runs **that kind's ordered sequence of actions**. The HTTP endpoint and the queue consumer are thin doors onto the same logic, so neither re-implements validation, normalisation or persistence.

> **"Service" means a package, not a process.** There is **no separate microservice, deployment, queue or network hop**. The ingest service is a shared library (`models/pkg/ingest`) compiled *into* both the hub-api and analyser binaries; each calls `Ingest(...)` in-process on its own request. "Service" here names a consistent code path, not a running component.

> This page builds on the transport mechanics in [Integrations](integrations/) — read that first for how a worker *delivers* a result; this page is about how the platform *receives* one. The hub-api `/ingest` door and the typed [`/detections`](../../extend/detections/api/) endpoint both delegate to the same core, and the analyser routes its `detection`/`pose` queue completions through it via the pipeline adapter.

## The idea

> Send your data in the same structure you'd send to the broker. The service orders that data and triggers the correct actions — for example, **detection** data is both *inserted into its collection* **and** used to *adjust the region-selection on the corresponding media*. A future **ANPR** kind would run a similar but different sequence.

So "ingest" is not "store the thing". It is **"run the kind's action pipeline"**. Detection happens to be two actions; another kind might be one, or three, with different sinks.

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

- **Kind** — *what is this result?* `detection` vs `thumbnail` vs `sprite` vs `dominantcolor`. Different shapes, **different sinks**, different action sequences.
- **Task** — *which flavour within a kind?* Inside `detection`: `box` / `anpr` / `pose`. All produce a `DetectionRun`, share the same validation skeleton and the **same `detections` collection**.

```text
envelope ──▶ route by KIND ──▶ detection handler ──▶ route by TASK ──▶ box | anpr | pose
                           ├──▶ thumbnail handler
                           ├──▶ sprite handler
                           └──▶ dominantcolor handler
```

The kind dispatcher is a thin router over a **registry of handlers**. The task router lives *inside* the detection handler. This nesting matters because tasks share a contract (`DetectionRun`) while kinds do not.

## The envelope is the shared contract

The unifying move: **`{operation, payload}` is the ingest core's input contract** — not the literal wire of every transport. Each *door* maps its own wire onto this shape before calling `Ingest`: the queue consumer reads `PipelineEvent`, the general `/ingest` endpoint binds `api.IngestRequest`, and the typed `/detections` endpoint treats its whole body as the `payload`. The doors differ; the contract they feed does not.

| Field | Role | HTTP (`api.IngestRequest`) | Queue (`PipelineEvent`) |
|---|---|---|---|
| `operation` | the **kind** selector — the registry key the dispatcher routes on | `operation` | `operation` |
| recording ref | resolves *which* media the result attaches to | `mediaKey` / `analysisId` | `payload.fileName` + metadata |
| `payload` | the **typed result** (e.g. a `DetectionRun`-shaped body) | `payload` | `payload.result` |

**Two API doors, one core.** The typed [`/detections`](../../extend/detections/api/) endpoint sits *alongside* the general `/ingest` door — both are thin adapters over the same `Ingest`. The specific endpoint is a convenience alias: the **kind is implied by the route** (`detection`) and its body *is* the `payload` (`api.PostDetectionsRequest`), so it simply calls `Ingest(…, "detection", body)`. The general door binds the full `api.IngestRequest` envelope (`{operation, mediaKey | analysisId, payload}`) and selects the kind from `operation`. A new kind gets the general door for free; detection keeps its ergonomic typed endpoint. Nothing routes twice — each door resolves the kind once, then hands off.

> **`payload` is the result channel; `data` is not.** `PipelineEvent.Data` is a deprecated `map[string]interface{}` that on dispatch carries only storage credentials — the ingest core never reads a result from it. Over the queue, a producer's typed result travels in **`PipelinePayload.Result`** (a `json.RawMessage`); over HTTP it travels in **`IngestRequest.Payload`**. Both are the same kind-specific body, and the pipeline adapter feeds `Result` straight into `Ingest` exactly as the HTTP door feeds `Payload`. The generic `data.<operation>` enrich-in-place sink (see [Integrations](integrations/#enrich-in-place)) still exists for stages **without** an ingest handler; once a kind has a handler, its result travels as the typed `payload`/`result` and the handler owns the side-effect in place of a generic `$set data.<op>`.

## Where it lives

Because the pipeline (`hub-pipeline-analysis`) must call this too, the routing **cannot** stay under hub-api's `internal/` — Go's `internal/` rule makes it un-importable. It moves to the shared `models` module that both apps already depend on. Split by dependency weight:

| Concern | Why | Home |
|---|---|---|
| **Routing** — validate, task-route, normalise, build the run | pure; needs only types already in `models` | **`models/pkg/ingest`** (infra-free) |
| **Persistence** — the `(Key, RunId)` upsert, region promotion | needs a live `*mongo` handle + context | each app's repo (or shared via the `database` repo) |
| **Auth / scope** — bearer user vs recording owner | genuinely differs per transport | each adapter |
| **Transport** — gin handler / queue consumer + ack | HTTP status vs ack/nack | each app |

Keeping `models/pkg/ingest` infra-free keeps it a fast, testable library while still giving **one** implementation of the routing. The package is named generally on purpose — it routes *every* kind, and detection is simply the first handler; structure it with no `models`-internal coupling so it can lift out into its own module later with a move, not a rewrite.

## A handler is an action pipeline

A handler is not `ingest → upsert`. It is an **ordered list of idempotent effects** sharing one context:

```go
type Action interface {
    Name() string
    Apply(ctx context.Context, scope Scope, target Target, run any) error
    RunFor(source Source) bool // gate an action by transport / trust
}

type Handler struct {
    Kind    string
    // Decode validates + normalises the raw payload into the typed run once,
    // up front, so every action operates on the same built value.
    Decode  func(scope Scope, target Target, payload json.RawMessage) (run any, report Report, err error)
    Actions []Action
}

var handlers = map[string]Handler{
    "detection": {
        Kind:    "detection",
        Decode:  decodeDetection,
        Actions: []Action{UpsertDetectionRun{}, PromoteTracksToRegions{}},
    },
    // "thumbnail": { ... }, "sprite": { ... } — migrated from the analyser switch later
}

// the ONE entry point both transports call:
func Ingest(ctx context.Context, scope Scope, target Target, kind string, payload json.RawMessage) (Report, error) {
    h, ok := handlers[kind]
    if !ok {
        return Report{}, fmt.Errorf("%w: %s", ErrUnknownKind, kind)
    }
    run, report, err := h.Decode(scope, target, payload)
    if err != nil {
        return report, err
    }
    for _, a := range h.Actions {
        if !a.RunFor(scope.Source) {
            continue
        }
        if err := a.Apply(ctx, scope, target, run); err != nil {
            return report, fmt.Errorf("ingest: action %q failed: %w", a.Name(), err)
        }
    }
    return report, nil
}
```

The dispatcher owns only shared plumbing (look up handler, decode once, run actions, map errors). Each action owns its own sink — which is essential, because the sinks genuinely differ (own collection vs enrich-in-place). The moment the dispatcher starts `switch`-ing on kind to do real work, it has become the hardcoded switch it was meant to replace.

## Two registries, two jobs

There are **two** registries that both key on the operation id, and conflating them is the easy mistake. They govern different ends of the journey:

| | Stage registry (config) | Ingest handlers (Go) |
|---|---|---|
| Lives in | `workflows` values / operation registry — see [Integrations](integrations/#registering-a-stage) | `models/pkg/ingest` `handlers` map |
| Governs | enqueue, queue name, allow-list, completion tracking (the **outbound** half) | the typed actions run on a **returned** result (the **inbound** half) |
| Needed for | **every** stage | only when the producer **delegates** persistence to the platform |
| Cost to add | a config edit | a code change + release |

**The core write is never optional — only its location moves.** A returned result is never just "tracked and dropped"; something is always written. The fork is *who writes it*:

- **Self-persist (own collection).** An in-cluster worker writes its own collection directly and just acks. The mandatory write still happens — in the worker. No ingest handler; the platform only records `resolvedoperations`.
- **Delegated persist (ingest handler).** The worker hands back a typed `payload` and the **handler** does the write. When a handler exists, its **first action is the mandatory persistence** (e.g. `UpsertDetectionRun`); it is never side-effect-only. Any further actions are the *optional* side-effects, and those are the only thing `RunFor(source)` gates.

So a stage with **no** ingest handler is not a stage with no effect — it is a **self-persisting** stage. The adapter routes a completion to `Ingest` **only when a handler is registered** for that kind; otherwise it's a self-persist / generic [`data.<op>`](integrations/#enrich-in-place) completion — recorded, not routed. Hitting `Ingest` for a handler-less kind would be the bug, not the absence of a handler.

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

ANPR (also box-based) could reuse action 1 with a *different* action 2 (e.g. record plate text; perhaps no auto-redact). **POSE** ships today by reusing detection's box contract — it registers as its own task but routes to the same `boxTask` validator/normaliser and the same two-action sequence, so a pose run stores as a `DetectionRun` with `task: "pose"`. A keypoint-native pose contract (geometry the box form can't hold) would be a later, separate task. Same router, different task entries — exactly the "similar but different sequence" the design targets.

### Task sub-registry within detection

Inside the detection handler, the `Task` discriminator selects the validator / normaliser:

```go
type TaskHandler interface {
    Validate(req api.PostDetectionsRequest) error
    Normalize(req api.PostDetectionsRequest) (models.DetectionRun, Report)
}

var taskRegistry = map[string]TaskHandler{
    models.DetectionTask: boxTask{}, // "detection" (default / box)
    "pose":               boxTask{}, // pose producer emits the detection contract
    // "anpr": anprTask{}, // box-based, but its own action 2
}
```

Both `detection` and `pose` share the box validator today; `anpr` arrives as a new entry, and a keypoint-native pose would too (selecting a `DetectionRun.Payload json.RawMessage` for geometry the box contract can't hold). Neither transport changes when a task is added.

## The two adapters collapse onto it

| Concern | API adapter (hub-api) | Pipeline adapter (analyser) |
|---|---|---|
| Input | `MaxBytesReader` + bind `api.IngestRequest` | read `event.Payload.Result` (`json.RawMessage`) |
| Target | `mediaKey` / `analysisId` from the envelope | recording key + metadata from the event |
| Identity | authenticated bearer user | recording's owner, resolved from the media (no token) |
| Source | `SourceAPI` (untrusted — store-only) | `SourcePipeline` (trusted — full sequence eligible) |
| Output | map `Report`/error → HTTP status (201/200/207/400/404) | log report; ack on success, nack on failure |

Both adapters hand the same opaque `payload` (a `json.RawMessage` carrying the detection contract) to the same `Ingest`, so neither duplicates the validate/normalise/upsert logic. The pipeline adapter supplies a Mongo-backed `DetectionStore` and **no** `RegionPromoter`, so it stores the run without auto-promoting redaction regions — the same store-only outcome the API door produces, reached by a different lever (the API gates promotion off via `SourceAPI`; the pipeline simply wires no promoter).

**API push: standalone or status update.** An API push that is *not* fulfilling a pipeline-dispatched operation is **standalone** — it writes its own collection and sends no ack; nothing is waiting on it, and the rest of the Hub reads the collection directly. Only when a detection *fulfils a dispatched operation* does the adapter echo a completion ack so `resolvedoperations` reflects it. The shared ingest call is identical either way — the adapter alone decides whether to ack, because it alone knows whether a run dispatched the work.

## Admission control: only known operations are ingested

A result arriving over the queue is only ingested if its `operation` is recognised — a built-in op or a registered custom stage (`isKnownOperation` → `registry.Active().Has`). An unknown, drifted, or removed worker's result is **log-and-dropped before any action runs**, so it can never inflate `resolvedoperations` or persist arbitrary `data.<op>` keys. The orchestrator's separate `workflowOperations` tier and the enqueue side of this registry are dispatch concerns — see [Integrations → The operation registry](integrations/#the-operation-registry).

> **Idempotency lives in the action, not the registry.** Recognising an operation only decides *whether* to ingest it; it does **not** make the side-effect idempotent. That has to be the action's own keyed upsert (`(Key, RunId)` for detections, `(media, operation)` for enrich-in-place) so a redelivery replaces rather than duplicates.

## Consistency & idempotency

This is the genuinely hard part — not the routing.

- **At-least-once delivery.** The broker can redeliver, so a handler's whole action sequence can re-run. Every action must be **idempotent**: upsert the run by `(Key, RunId)`; make region promotion *replace* a run's contribution keyed by `RunId` rather than append. A replay then becomes a no-op.
- **Multi-document writes.** Action 1 writes `detections`; action 2 mutates the analysis doc. Idempotent keyed actions make a partial apply self-healing on retry — preferable to a distributed transaction. A Mongo session transaction (same cluster) is the fallback if two effects must ever be truly atomic.
  - **Known limitation (accepted for now).** The queue path self-heals on redelivery, but the API path is a *single request with no redelivery* — a crash between the two writes leaves a partial apply with nothing to retry it. Revisit with a session transaction or a reconcile pass; not a blocker today.
- **Per-source gating.** An external API push auto-mutating a media's redaction regions is a **policy** decision, not just routing. The `RunFor(source)` predicate lets the same kind run a fuller sequence internally (pipeline) than externally (untrusted producer) — e.g. external posts store the run but don't auto-promote to redaction. Promotion is doubly contingent: an action runs only if `RunFor` admits the source **and** a `RegionPromoter` is wired into the scope; with no promoter, `PromoteTracksToRegions` is a no-op rather than an error, which is how a store-only adapter opts out of promotion.

## See also

- [Integrations](integrations/) — how a worker *delivers* a result (transport, queues, completion ack).
- [Detections → Pipeline](../../extend/detections/pipeline/) — the detection capability delivered as a stage.
- [Detections → API](../../extend/detections/api/) — the same detection contract over HTTP.
