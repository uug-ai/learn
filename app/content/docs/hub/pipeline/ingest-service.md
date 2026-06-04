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

A result can reach the Hub two ways — an authenticated **API push** or an in-pipeline **queue message** — and today each path re-implements its own validation, normalisation and persistence. The **ingest service** collapses that into one transport-agnostic core: you send a result in **the same envelope you'd put on the queue**, and the service **routes it by kind** and runs **that kind's ordered sequence of actions**. The HTTP endpoint and the queue consumer become thin doors onto the same logic.

> **"Service" means a package, not a process.** There is **no new microservice, deployment, queue or network hop**. The ingest service is a shared library (`models/pkg/ingest`) compiled *into* both the hub-api and analyser binaries; each calls `Ingest(...)` in-process on its own request. "Service" here names a consistent code path, not a running component.

> **Status — proposed.** This page captures a design, not shipped behaviour. Today, detection results are ingested by the API only ([hub-api `PostDetections`](../../extend/detections/api/)), and the pipeline's per-operation result handling is a hardcoded `switch` in the analyser. The model below describes how those converge into a single shared service. It builds on the transport mechanics in [Integrations](integrations/) — read that first for how a worker *delivers* a result; this page is about how the platform *receives* one.

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

The unifying move: **`{operation, payload}` is the ingest core's input contract** — not necessarily the literal wire of every transport. Each *door* (the queue consumer, a general ingest API endpoint, the existing typed `/detections` endpoint) maps its own wire onto this shape before calling `Ingest`. The doors differ; the contract they feed does not.

| Field | Role |
|---|---|
| `operation` | the **kind** selector — the registry key the dispatcher routes on |
| `fileName` · `payload.fileName` | the **recording reference** — resolves *which* media the result attaches to |
| `payload` | the **typed result** (e.g. a `DetectionRun`-shaped body) |

**Two API doors, one core.** We keep the existing typed [`/detections`](../../extend/detections/api/) endpoint *alongside* a general ingest door — both are thin adapters over the same `Ingest`. The specific endpoint is a convenience alias: the **kind is implied by the route** (`detection`) and its body *is* the `payload` (`api.PostDetectionsRequest`), so it simply calls `Ingest(…, "detection", body)`. The general door accepts the full `{operation, payload}` envelope and selects the kind from `operation`. A new kind gets the general door for free; detection keeps its ergonomic typed endpoint. Nothing routes twice — each door resolves the kind once, then hands off.

> **Caveat — `payload` is the result channel; `data` is not.** Today `PipelineEvent.Data` is a deprecated `map[string]interface{}` and on dispatch carries only storage credentials. The ingest core reads the typed result from **`payload`**, never from the legacy `data` bag. The generic `data.<operation>` enrich-in-place sink (see [Integrations](integrations/#enrich-in-place)) still exists for stages **without** an ingest handler; once a kind has a handler, its result travels as the typed `payload` and the handler owns the side-effect in place of a generic `$set data.<op>`.

## Where it lives

Because the pipeline (`hub-pipeline-analysis`) must call this too, the routing **cannot** stay under hub-api's `internal/` — Go's `internal/` rule makes it un-importable. It moves to the shared `models` module that both apps already depend on. Split by dependency weight:

| Concern | Why | Home |
|---|---|---|
| **Routing** — validate, task-route, normalise, build the run | pure; needs only types already in `models` | **`models/pkg/ingest`** (new, infra-free) |
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
    Actions []Action
}

var handlers = map[string]Handler{
    "detection": {
        Kind:    "detection",
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
    for _, a := range h.Actions {
        if !a.RunFor(scope.Source) {
            continue
        }
        if err := a.Apply(ctx, scope, target, payload); err != nil {
            return Report{}, err
        }
    }
    return report, nil
}
```

The dispatcher owns only shared plumbing (look up handler, run actions, map errors). Each action owns its own validation **and its own sink** — which is essential, because the sinks genuinely differ (own collection vs enrich-in-place). The moment the dispatcher starts `switch`-ing on kind to do real work, it has become the hardcoded switch it was meant to replace.

## Detection — the reference kind

Detection's two-action sequence is not hypothetical; the [models](../../../) are shaped for it. In `analysis.go`:

- `DetectionRun.Tracks` is `[]FaceRedactionTrack` — the **same type** as `FaceRedaction.Tracks`.
- The model comment says it outright: *"Tracks reuse FaceRedactionTrack so promoting a run into a redaction is a direct copy."*
- `Analysis` carries both `FaceRedaction []FaceRedaction` and `Regions []Region` — the "region selection".

So:

1. **`UpsertDetectionRun`** — upsert the `DetectionRun` into the `detections` collection, keyed by `(Key, Source.RunId)`.
2. **`PromoteTracksToRegions`** — copy the run's `Tracks` onto the corresponding media's `FaceRedaction` / `Regions` (a near-direct copy by design).

ANPR (also box-based) could reuse action 1 with a *different* action 2 (e.g. record plate text; perhaps no auto-redact). POSE (keypoints, not boxes) would need a different contract and a different sequence entirely. Same router, different action lists — exactly the "similar but different sequence" the design targets.

### Task sub-registry within detection

Inside the detection handler, the `Task` discriminator selects the validator / normaliser:

```go
type TaskHandler interface {
    Validate(req api.PostDetectionsRequest) error
    Normalize(req api.PostDetectionsRequest) (models.DetectionRun, Report)
}

var taskRegistry = map[string]TaskHandler{
    models.DetectionTask: boxTask{},  // today's validateDetections + normalizeDetections
    // "anpr": anprTask{}, "pose": poseTask{},
}
```

`box` is box-only today; `anpr`/`pose` arrive as new entries (and, for `pose`, a `DetectionRun.Payload json.RawMessage` selected by `Task` for geometry the box contract can't hold). Neither transport changes when a task is added.

## The two adapters collapse onto it

| Concern | API adapter (hub-api) | Pipeline adapter (analyser/worker) |
|---|---|---|
| Input | `MaxBytesReader` + `ShouldBindJSON` | consume message → build the same `api.PostDetectionsRequest` |
| Target | `mediaKey` / `analysisId` from body | recording key from the event (`fileName`) |
| Identity | authenticated bearer user | recording's owner, resolved from the media (no token) |
| Output | map `Report`/error → HTTP status (201/200/207/400/404) | ack on success, nack on failure; echo completion |

Because `api.PostDetectionsRequest` lives in shared `models/pkg/api`, the pipeline worker constructs the **exact same input type** — no DTO duplication. The only real refactor friction is generalising the repository's `user` parameter to an explicit `Scope` (the pipeline path has no bearer token).

**API push: standalone or status update.** An API push that is *not* fulfilling a pipeline-dispatched operation is **standalone** — it writes its own collection and sends no ack; nothing is waiting on it, and the rest of the Hub reads the collection directly. Only when a detection *fulfils a dispatched operation* does the adapter echo a completion ack so `resolvedoperations` reflects it. The shared ingest call is identical either way — the adapter alone decides whether to ack, because it alone knows whether a run dispatched the work.

## Pipeline tracking: workflow operations & the allow-list

When a result arrives over the **queue** (not the API), the orchestrator also has to *track* it. Three rules keep that safe.

**A separate `workflowOperations` tier.** Registry-driven custom stages get their own list on the analysis, alongside the built-in `asyncOperations` / `requiredOperations` / `resolvedOperations`:

```go
analysis.WorkflowOperations = []string{} // custom/registry stages only — built-ins stay in AsyncOperations
```

The built-in dispatch (`thumby`, `dominantcolor`, …) is untouched; only registered stages land here. Like async operations, `workflowOperations` are **non-gating** — a workflow stage can never stall a run.

**Safe resolution.** A worker signals completion by echoing an ack with its `operation` set; the orchestrator records it with the existing idempotent update — `$set data.<op>` + `$addToSet resolvedoperations`. Because it's `$addToSet`, a redelivered ack is a no-op; and because workflow operations don't gate completion, a *missing* ack can't wedge the run (the 15-minute backstop already bounds it). Resolution is provenance, not a barrier.

**The registry is the allow-list.** The enabled-stage registry doubles as the set of permitted operations. Validate at the two ends that currently drift freely:

- **Enqueue:** only emit `kcloud-<id>-queue.fifo` for an `id` in the registry.
- **Resolve:** only `$addToSet resolvedoperations` when `operation` is in the registry; log-and-drop unknowns.

This closes the queue-name drift class outright — including the live `classify → kcloud-thumby-queue` bug (missing `.fifo`), which an exact allow-list would reject. The list stays correct automatically because it *is* the `enabled`-driven registry keys: no worker, no entry.

> **Idempotency lives in the action, not the list.** `resolvedoperations` tracks *that* an operation completed (at-most-once recording). It does **not** make the side-effect idempotent — that has to be the action's own keyed upsert (`(Key, RunId)` for detections, `(media, operation)` for enrich-in-place) so a redelivery replaces rather than duplicates.

## Consistency & idempotency

This is the genuinely hard part — not the routing.

- **At-least-once delivery.** The broker can redeliver, so a handler's whole action sequence can re-run. Every action must be **idempotent**: upsert the run by `(Key, RunId)`; make region promotion *replace* a run's contribution keyed by `RunId` rather than append. A replay then becomes a no-op.
- **Multi-document writes.** Action 1 writes `detections`; action 2 mutates the analysis doc. Idempotent keyed actions make a partial apply self-healing on retry — preferable to a distributed transaction. A Mongo session transaction (same cluster) is the fallback if two effects must ever be truly atomic.
  - **Known limitation (accepted for now).** The queue path self-heals on redelivery, but the API path is a *single request with no redelivery* — a crash between the two writes leaves a partial apply with nothing to retry it. Revisit with a session transaction or a reconcile pass; not a blocker today.
- **Per-source gating.** An external API push auto-mutating a media's redaction regions is a **policy** decision, not just routing. The `RunFor(source)` predicate lets the same kind run a fuller sequence internally (pipeline) than externally (untrusted producer) — e.g. external posts store the run but don't auto-promote to redaction.

## What's real today vs proposed

| Piece | Status |
|---|---|
| Detection validate / normalise / upsert | **exists** — in hub-api `PostDetections`, but under `internal/` (not shareable) |
| `DetectionRun.Tracks` reuses `FaceRedactionTrack` (promotion-ready) | **exists** in `models` |
| Per-operation result handling in the pipeline | **exists** as a hardcoded `switch` in the analyser |
| Region-promotion as an automatic ingest action | **proposed** — the API stores the run only today |
| Shared `models/pkg/ingest` routing package | **proposed** |
| Kind dispatcher + task sub-registry | **proposed** |
| Separate `workflowOperations` tier | **proposed** — built-ins use `asyncOperations` today |
| Registry-as-allow-list (enqueue + resolve validation) | **proposed** — queue names are unguarded today |
| `RunFor` per-source action gating | **proposed** |

## Suggested build order

Bottom-up, so nothing speculative ships and the box path stays provably unchanged:

1. Create **`models/pkg/ingest`** with the box `TaskHandler` (lift validate/normalise, return typed errors instead of HTTP constants).
2. Wire hub-api's `PostDetections` to delegate to it — box task only, `PromoteTracksToRegions` behind a `RunFor` gate that's off, so behaviour is identical.
3. Add the **queue adapter** in the analyser that builds the same request and calls `Ingest` — detection over the pipeline — plus the `workflowOperations` tier and registry **allow-list** validation at enqueue and resolve.
4. Flip `PromoteTracksToRegions` on (internally first via `RunFor`).
5. Generalise to a **kind dispatcher**, migrating the analyser's `thumbnail`/`sprite` switch arms into handlers as a follow-up.
6. Add **ANPR** (new task + action), then **POSE** (new task + `Payload` contract extension) as the model proves out.

## See also

- [Integrations](integrations/) — how a worker *delivers* a result (transport, queues, completion ack).
- [Detections → Pipeline](../../extend/detections/pipeline/) — the detection capability delivered as a stage.
- [Detections → API](../../extend/detections/api/) — the same detection contract over HTTP.
