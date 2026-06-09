---
title: "Integrations"
description: "Plug your own microservice into the Hub pipeline — receive events, do work, and hand results back."
lead: "Plug your own microservice into the Hub pipeline as a stage: consume an event, do the work, and hand the result back — in any language."
date: 2026-06-04T00:00:00+00:00
lastmod: 2026-06-04T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "pipeline"
weight: 10
toc: true
---

The pipeline is **open**: every built-in service is just a queue consumer, and your own service is no different. An integration is a worker that **consumes an event from a queue, does its work, and hands a result back** — written in whatever language fits the job, deployed alongside the built-in stages, and scaled independently.

This page is the **mechanism**, shared by built-in *and* custom stages: the message you receive, how to return a result, how to deploy it, and how the orchestrator tracks it. It is **capability-agnostic** — it never assumes *what* your stage does. For a concrete contract delivered this way (the run shape, the collection, the op name), see the capability pages under [Extend](../../extend/) — for example [Detections → Pipeline](../../extend/detections/pipeline/).

> **Status — proposed.** The queue and envelope mechanics described here are how the pipeline already works internally. Custom-stage **orchestration** now lives in a standalone service, **hub-workflows**, which reads the stage registry (`PIPELINE_STAGE_REGISTRY`) and dispatches custom operations — so a custom operation can join the pipeline without changing the built-in `analysis` code. Custom stages are **asynchronous only** in this design — there is no blocking "required" stage.
>
> **Transitional reality.** The fixed `analysis` service still runs the built-in operations (`classify`, `thumby`, `dominantcolor`, …) and the classifier's own imperative follow-ups. What is new is that, when the **classify** result resolves, `analysis` **tees** a copy of the event to hub-workflows (queue `kcloud-workflows-queue`, gated by `WORKFLOWS_ENABLED`) **in parallel** with the normal throttler → notification tail — notification still fires. hub-workflows seeds a run, dispatches the registry's stages and tracks completion in its own `workflow_runs` collection. The analysis binary can still read a registry, but the shipped chart sets `PIPELINE_STAGE_REGISTRY` only on the hub-workflows Deployment, so in a deployed cluster hub-workflows is the dispatcher.
>
> This page is about how a worker *delivers* a result. For the complementary *receiving* side — one shared service that takes a result from either the API or the queue and runs the right sequence of actions for its kind — see [Ingest service](ingest-service/).

## When to add a stage

A stage is one of **two transports** for getting your data into the Hub. The other is an authenticated API push. They deliver the **same data** to the **same place**; they differ in *who triggers the work* and *where your code runs*.

- **API push** — your service `POST`s whenever it has data. Works on **every** deployment, needs no cluster access. The right starting point for most integrators. See [Extend](../../extend/).
- **In-pipeline stage (this page)** — the pipeline triggers your service automatically on every ingest / re-analysis, with queue-level delivery guarantees. Available on **self-hosted deployments** that can run custom stages.

Reach for a stage only when you control the deployment **and** want the capability to run automatically as a built-in step of every recording's analysis.

## Anatomy of a stage

A stage has exactly two runtime dependencies: the **message broker** (to receive events and hand results back) and the **database** (to read and write event metadata). There is no service-to-service HTTP and no shared in-process state — every hand-off goes through the broker. That loose coupling is what lets any stage scale, restart or be replaced without touching the rest of the pipeline.

{{< rete caption="On classify, analysis keeps running the normal tail (throttler → notification) and in parallel tees the result to hub-workflows, which dispatches each registered stage onto its own queue; your worker(s) consume the event and hand a result back" alt="Custom pipeline stage placement" height="460" >}}
{
  "groups": [
    { "id": "hub",   "label": "Hub pipeline",        "x":   0, "y":   0, "w": 980, "h": 460 },
    { "id": "yours", "label": "Workflow (example)",  "x":   0, "y": 540, "w": 980, "h": 260 }
  ],
  "nodes": [
    { "id": "throttler",    "kind": "pipeline-monitor",       "x": 360, "y":  40, "w": 240, "h": 110,
      "header": "PIPELINE", "title": "Throttler", "subtitle": "hub-pipeline-throttler", "groupId": "hub" },
    { "id": "notification", "kind": "pipeline-notification",  "x": 700, "y":  40, "w": 240, "h": 110,
      "header": "PIPELINE", "title": "Notification", "subtitle": "hub-pipeline-notification", "groupId": "hub" },
    { "id": "analysis",     "kind": "pipeline-analysis",      "x":  40, "y": 180, "w": 240, "h": 100,
      "header": "PIPELINE", "title": "Analysis", "subtitle": "Built-ins \u00b7 tees classify", "groupId": "hub" },
    { "id": "workflows",    "kind": "hub",                    "x": 360, "y": 320, "w": 240, "h": 110,
      "header": "ORCHESTRATOR", "title": "Workflows", "subtitle": "Hub-Workflows", "groupId": "hub" },
    { "id": "worker",       "kind": "detection",              "x":  90, "y": 600, "w": 210, "h": 130,
      "header": "STAGE", "title": "Pose detection", "subtitle": "your worker", "groupId": "yours" },
    { "id": "licenseplate", "kind": "pipeline-licenseplate",  "x": 385, "y": 600, "w": 210, "h": 130,
      "header": "STAGE", "title": "License plate", "subtitle": "kcloud-licenseplate-queue.fifo", "groupId": "yours" },
    { "id": "llm",          "kind": "pipeline-llm",           "x": 680, "y": 600, "w": 210, "h": 130,
      "header": "STAGE", "title": "LLM summary", "subtitle": "kcloud-llm-queue.fifo", "groupId": "yours" }
  ],
  "connections": [
    { "from": "analysis",  "to": "throttler",    "fromSide": "right", "toSide": "left" },
    { "from": "throttler", "to": "notification", "fromSide": "right", "toSide": "left" },
    { "from": "analysis",  "to": "workflows",    "fromSide": "right", "toSide": "left", "label": "on classify" },
    { "from": "workflows", "to": "worker",       "fromSide": "bottom", "toSide": "top", "label": "dispatch" },
    { "from": "workflows", "to": "licenseplate", "fromSide": "bottom", "toSide": "top" },
    { "from": "workflows", "to": "llm",          "fromSide": "bottom", "toSide": "top" }
  ]
}
{{< /rete >}}

## The message you receive

### Queue naming

hub-workflows enqueues each custom operation on its own queue, named by convention from the **operation name** (the built-in operations are enqueued the same way by `analysis`):

```text
kcloud-<operation>-queue.fifo
```

Your stage consumes from exactly one queue — pick a unique operation name (e.g. `detection`) and your queue is `kcloud-detection-queue.fifo`. The name is the only thing that binds the orchestrator to your worker; nothing else is shared.

### Envelope

Every event carries the same envelope. The fields your stage reads are:

| Field (wire name) | Meaning |
|---|---|
| `operation` | The operation name — equals your stage's name on the inbound message, and the key you echo back on completion. |
| `fileName` · `payload.fileName` | The **recording reference**. Resolve *which* recording the event is about from here — it is **not** in `data`. |
| `data` | A string-keyed bag. On dispatch it carries the **storage credentials** (`storage_uri`, `storage_access_key`, `storage_secret`) your worker needs to fetch the media; on the way back it carries your result for the enrich-in-place sink. |
| `events` | The stage trail (the Go field is `Stages`). Leave it intact unless you are explicitly re-targeting. |

The envelope is **opaque to the orchestrator** — it routes by `operation`, never by inspecting `data`. Your worker is the only thing that interprets its own payload. (`data` is a legacy bag the platform is gradually replacing with typed per-stage structures; treat it as the transport for credentials and results, not a place to stash state.)

### Acknowledgement

The broker delivers at least once. Acknowledge a message only **after** the work is durably done (result written or handed back); on failure, let it nack so the broker can redeliver. Because redelivery is possible, **make your stage idempotent** — keying your output by the recording (and a stable run id) so a replay replaces rather than duplicates.

## Doing the work

Your worker is a stateless consumer: pull an event, fetch the media using the credentials in `data`, compute, emit. It can be written in any language — the only contract is the queue it reads and how it returns a result. Keep it single-purpose; if you need a second capability, add a second stage.

## Sending a result back

There are **two sinks**. The choice decides *where your result data lands* — but in **both** cases your worker echoes a completion ack so the orchestrator can mark the operation resolved (see [Completion and acknowledgement](#completion-and-acknowledgement)).

### Own collection (recommended)

Your worker writes its result to **its own collection, keyed by the recording**, and the rest of the Hub reads that collection directly. The orchestrator never interprets your data — it stays a dumb router. This is the cleanest option for anything that is *new* data (detections, descriptions, embeddings). The completion ack you send back carries no payload — it is purely the "done" signal.

### Enrich in place

If your result must be merged into a **shared** document (e.g. a field on the recording's analysis), your worker republishes the event with its `operation` set and the result in `data`. The `analysis` service persists it generically:

```text
$set        data.<operation> = <your result>
$addToSet   resolvedoperations = <operation>
```

So the result is recorded against the analysis and the operation is marked resolved **with no orchestrator code** — until you need a typed side-effect on the shared document, which is the one case that warrants a handler in the analysis router. That typed handler is the [Ingest service](ingest-service/) path: the result then travels as the typed `payload` and the handler owns the side-effect, instead of the generic `data.<operation>` bag used here. `data.<operation>` is the handler-less default; `payload` + a handler is the typed upgrade for a kind that needs one.

> The difference between the sinks is only *who reads the result* — your collection, or the shared analysis document. Either way the operation is recorded the same way: through the completion ack.

## Registering a stage

A custom operation is registered by adding a **stage descriptor** to the hub-workflows **stage registry** — a JSON array set once under `kerberoshub.workflows.stageRegistry` and projected verbatim into the orchestrator as a single environment variable, **`PIPELINE_STAGE_REGISTRY`**, on the `pipe-workflows` Deployment. Each descriptor's **operation id** is the one string that binds the queue (`kcloud-<id>-queue.fifo`), the dispatch entry and the completion key — they cannot drift.

> **`kerberoshub.workflows`, not the front-end `workflows` flag.** The stage registry lives under `kerberoshub.workflows`, the values block for the hub-workflows engine. Don't confuse it with `kerberoshub.…features.workflows.enabled`, the unrelated front-end feature toggle.

> **Config registers a stage; it does not register a typed handler.** The registry governs the queue, dispatch and completion tracking. It is **all you need** for a self-persisting stage (one that writes its own collection and acks). A stage that instead *delegates* persistence to the platform — handing back a `payload` for a typed side-effect on shared state — also needs a Go handler in `models/pkg/ingest`. See [Ingest service → Two registries, two jobs](ingest-service/#two-registries-two-jobs).

```yaml
# values.yaml
kerberoshub:
  workflows:
    enabled: true                    # runs the hub-workflows engine AND tees classify to it
    queue: "kcloud-workflows-queue"  # WORKFLOWS_QUEUE — what the engine consumes
    # PIPELINE_STAGE_REGISTRY — the custom operations the engine may dispatch.
    # A JSON array of stage descriptors; "[]" (default) = a safe no-op engine.
    stageRegistry: |
      [
        { "operation": "detection", "dispatch": "always" },
        { "operation": "nohelmet",  "dispatch": "conditional",
          "needs": [
            { "operation": "classify",
              "condition": { "path": "labels", "op": "contains", "value": "person" } }
          ] }
      ]
```

Setting `enabled: true` does two things at once: it renders the `pipe-workflows` Deployment **and** sets `WORKFLOWS_ENABLED` on `pipe-analysis`, so analysis starts teeing the classify result to the engine. An empty registry (`"[]"`) is valid — the engine then seeds runs and records results but dispatches nothing.

### The operation registry

The orchestrator reads `PIPELINE_STAGE_REGISTRY` once at boot — there is **no ConfigMap, mount or extra API call**; the registry travels with the pod spec, so a `helm upgrade` that changes a stage rolls hub-workflows automatically and the new value is in effect the moment the pod restarts. The chart injects the `stageRegistry` value verbatim next to the engine's existing env:

```yaml
# templates/kerberos-pipeline/pipe-workflows.yaml — on the engine's env: list
        - name: PIPELINE_STAGE_REGISTRY
          value: {{ .Values.kerberoshub.workflows.stageRegistry | quote }}
```

The descriptors the orchestrator parses are the **routing slice of the shared `models.WorkflowStage`** type, so the registry can never drift from the engine's own model:

```go
// from models/pkg/models — only the routing fields are shown here
type WorkflowStage struct {
    Operation string            `json:"operation"`          // unique — binds queue, dispatch and resolution
    Dispatch  Dispatch          `json:"dispatch,omitempty"` // "always" (default) | "conditional"
    Needs     []StageDependency `json:"needs,omitempty"`    // upstream fan-in (conditional stages)
    // … contract (params, inputs, outputs) and deployment fields omitted here …
}

// A conditional stage waits on one or more upstreams. Each dependency pairs an
// upstream operation with the predicate that must match its result — so a stage
// can fan in from several upstreams, each gated by its own condition.
type StageDependency struct {
    Operation string          `json:"operation"`           // upstream op that can trigger this stage
    Condition *StageCondition `json:"condition,omitempty"` // predicate on that upstream's result (nil = unconditional)
}

type StageCondition struct {
    Path  string      `json:"path"`  // dot-path into the upstream op's result
    Op    ConditionOp `json:"op"`    // eq | ne | contains | in | exists | gt | gte | lt | lte
    Value any         `json:"value"` // operand (ignored for exists)
}
```

`Dispatch` and `ConditionOp` are **named string enums** in the model — the permitted values (`always`/`conditional`; the operators above) live in the type, not just a comment — but on the wire they are plain strings, so a hand-written registry entry stays readable JSON.

At boot hub-workflows parses `PIPELINE_STAGE_REGISTRY` once and keeps the slice for the life of the process — a malformed array **fails fast** (the pod won't start), and an empty or unset variable simply means no custom stages. For every event it then seeds a **workflow run**, dispatches the `always` stages immediately to `kcloud-<operation>-queue.fifo`, and holds the `conditional` ones for reactive dispatch. Workflow operations are **non-gating** — a custom stage can never stall a run.

The same registry doubles as the **allow-list** that validates enqueue and resolution, so an operation the orchestrator never registered can neither be dispatched nor resolved.

**Minimal stage.** The smallest useful descriptor is `{ "operation": "<id>", "dispatch": "always" }` plus a separately-deployed worker. `needs` is purely additive — you can add conditional routing later without changing the descriptor's shape.

## Conditional routing

Two kinds of "conditional" exist, and they live in different places:

- **Per-deployment** — *is this stage present at all?* Controlled by `enabled` in the stage's values block.
- **Per-recording** — *should this particular recording go through the stage?* This decision can't be made up front, because the deciding signal often isn't computed yet. It is declared with `dispatch: conditional` plus a `needs` list — each entry an upstream **operation** paired with an optional **condition** (a predicate on that operation's result).

A conditional stage is **not** enqueued when the run is seeded. Instead, whenever any listed upstream resolves, the orchestrator evaluates that dependency's `condition` against its result and — only on a match — enqueues the stage's queue. A dependency with no `condition` matches as soon as its upstream resolves. Recordings that match no dependency never touch the stage.

```yaml
# values.yaml — same stageRegistry array as "Registering a stage", with a needs list
kerberoshub:
  workflows:
    stageRegistry: |
      [
        { "operation": "nohelmet", "dispatch": "conditional",
          "needs": [
            { "operation": "classify",
              "condition": { "path": "labels", "op": "contains", "value": "person" } }
          ] }
      ]
```

Because `needs` is a **list**, a stage can fan in from several upstreams — each gated by its own condition — and fires for the first dependency that matches. The condition `op` is one of `eq`, `ne`, `contains`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`.

This is the declarative form of a pattern the built-in classifier already uses imperatively: when classification returns, `analysis` inspects the result and re-enqueues follow-up work for matched objects. The `needs` descriptor moves that decision out of Go and into config — evaluated by hub-workflows when the teed classify result (and any later results it tracks) arrives.

## Completion and acknowledgement

Every custom stage is **asynchronous**: the run never waits on it. hub-workflows seeds the run and dispatches its stages, and your stage's result lands whenever the worker finishes. (Blocking, "required" stages are intentionally out of scope in this design — there is no way for a custom stage to stall a run.)

Echo a **completion ack** once the work is durably done so the orchestrator can mark the operation resolved. For a stage tracked by hub-workflows, publish the result back to `kcloud-workflows-queue` with its `operation` set; the engine records it on the run (`workflow_runs`) and uses it to evaluate any conditional fan-in (see [Conditional routing](#conditional-routing)). If your stage also enriches the **shared analysis document** in place, republish to `kcloud-analysis-queue` as in [Sending a result back](#sending-a-result-back) — `analysis` records it generically (`$addToSet resolvedoperations`). The ack carries no payload for an own-collection stage — it is just the signal that the operation resolved. A run that never hears back from a stage still completes on the existing rules (with a 15-minute safety timeout as a backstop), so a crashed worker can't wedge the pipeline.

## Failure modes & gotchas

- **Queue with no consumer.** An operation registered but with no worker draining its queue piles messages up. The registry only routes — it does not deploy the worker — so always register a stage and deploy its worker together.
- **No completion ack.** A worker that writes its result but never echoes back to the orchestrator (`kcloud-workflows-queue`) leaves the operation unresolved on the run. Harmless to the run (stages are async), but it breaks provenance and lets a re-analysis repeat the work. Always ack.
- **Re-decode cost.** A stage that re-fetches and re-decodes the video pays that cost per recording; reuse data already in the envelope or the database where you can.
- **Non-idempotent writes.** Redelivery will duplicate output unless you upsert on a stable key.

## Checklist

- [ ] Pick a unique **operation id** — it's the descriptor key, the queue suffix (`kcloud-<id>-queue.fifo`) and the completion key
- [ ] Add a descriptor to `kerberoshub.workflows.stageRegistry` with `dispatch: always`, and deploy the stage's worker separately
- [ ] Consume the **envelope**, resolve the recording from `fileName`, fetch media with the **storage credentials** in `data`
- [ ] Pick a **sink** — own collection (recommended) or enrich-in-place
- [ ] **Idempotent** writes (upsert by recording + run id)
- [ ] Echo a **completion ack** to `kcloud-workflows-queue` (the orchestrator) with `operation` set
- [ ] (Optional) gate per-recording with `dispatch: conditional` + a `needs` list of `{ operation, condition }` upstreams
