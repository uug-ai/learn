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
    { "from": "analysis",  "to": "throttler",    "fromSide": "right", "toSide": "left", "kind": "solid" },
    { "from": "throttler", "to": "notification", "fromSide": "right", "toSide": "left", "kind": "solid" },
    { "from": "analysis",  "to": "workflows",    "fromSide": "right", "toSide": "left", "kind": "solid", "label": "on classify" },
    { "from": "workflows", "to": "worker",       "fromSide": "bottom", "toSide": "top", "kind": "solid", "label": "dispatch" },
    { "from": "workflows", "to": "licenseplate", "fromSide": "bottom", "toSide": "top", "kind": "solid", "label": "dispatch" },
    { "from": "workflows", "to": "llm",          "fromSide": "bottom", "toSide": "top", "kind": "solid", "label": "dispatch" }
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
| `data` | A string-keyed bag. On dispatch it carries the **storage credentials** (`storage_uri`, `storage_access_key`, `storage_secret`) your worker needs to fetch the media. |
| `events` | The stage trail (the Go field is `Stages`). Leave it intact unless you are explicitly re-targeting. |

The envelope is **opaque to the orchestrator** — it routes by `operation`, never by inspecting `data`. Your worker is the only thing that interprets its own payload. (`data` is a legacy bag the platform is gradually replacing with typed per-stage structures; treat it as the transport for credentials and results, not a place to stash state.)

### Acknowledgement

The broker delivers at least once. Acknowledge a message only **after** the work is durably done (result written or handed back); on failure, let it nack so the broker can redeliver. Because redelivery is possible, **make your stage idempotent** — keying your output by the recording (and a stable run id) so a replay replaces rather than duplicates.

## Doing the work

Your worker is a stateless consumer: pull an event, fetch the media using the credentials in `data`, compute, emit. It can be written in any language — the only contract is the queue it reads and how it returns a result. Keep it single-purpose; if you need a second capability, add a second stage.

## Sending a result back

Your worker writes its result to **its own collection, keyed by the recording**, and the rest of the Hub reads that collection directly. The orchestrator never interprets your data — it stays a dumb router. This is the shape for everything a custom stage produces (detections, descriptions, embeddings). Alongside the write, your worker echoes a completion ack so the orchestrator can mark the operation resolved (see [Completion and acknowledgement](#completion-and-acknowledgement)); the ack carries no payload — it is purely the "done" signal.

> **Why not write the shared `analysis` document?** Enriching the recording's shared analysis document in place is a **built-in-only** capability. The `analysis` service accepts results only for the operations it ships with (`classify`, `thumby`, `detection`, …), so a custom operation republished to `kcloud-analysis-queue` is dropped as unknown. Custom stages own their own collection and ack to the orchestrator on `kcloud-workflows-queue`. (The typed [Ingest service](ingest-service/) path — a `payload` plus a Go handler — is likewise a platform/built-in mechanism, not a custom-stage sink.)

## Registering a stage

A custom stage is defined **once**, under `kerberoshub.workflows.stages.<id>` in the chart values — the very block that deploys its worker. At render time the chart **assembles** every *enabled* stage into the hub-workflows **stage registry**: a JSON array projected into the orchestrator as a single environment variable, **`PIPELINE_STAGE_REGISTRY`**, on the `pipe-workflows` Deployment. Each stage's **operation id** is the one string that binds the queue (`kcloud-<id>-queue.fifo`), the dispatch entry and the completion key — and because the engine's registry entry and the worker's own queue are rendered from the **same** values, they cannot drift.

> **`kerberoshub.workflows`, not the front-end `workflows` flag.** The stage registry lives under `kerberoshub.workflows`, the values block for the hub-workflows engine. Don't confuse it with `kerberoshub.…features.workflows.enabled`, the unrelated front-end feature toggle.

> **Config registers a stage; it does not register a typed handler.** The registry governs the queue, dispatch and completion tracking. It is **all you need** for a self-persisting stage (one that writes its own collection and acks). A stage that instead *delegates* persistence to the platform — handing back a `payload` for a typed side-effect on shared state — also needs a Go handler in `models/pkg/ingest`. See [Ingest service → Two registries, two jobs](ingest-service/#two-registries-two-jobs).

```yaml
# values.yaml
kerberoshub:
  workflows:
    enabled: true                    # runs the hub-workflows engine AND tees classify to it
    queue: "kcloud-workflows-queue"  # WORKFLOWS_QUEUE — what the engine consumes
    # Each enabled stage below is assembled into PIPELINE_STAGE_REGISTRY for the
    # engine AND deployed as its own worker (pipe-<id>). Define the stage once;
    # routing and deployment both flow from this block.
    stages:
      detection:
        enabled: true
        operation: detection                 # defaults to the stage key if omitted
        dispatch: always
        queue: "kcloud-detection-queue.fifo"  # the worker consumes this; also fed to the registry
        repository: ghcr.io/uug-ai/hub-detection
        tag: "v1.0.0"
      nohelmet:
        enabled: true
        dispatch: conditional
        needs:
          - operation: classify
            condition: { path: properties, op: contains, value: person }
        queue: "kcloud-nohelmet-queue.fifo"
        repository: ghcr.io/uug-ai/hub-nohelmet
        tag: "v1.0.0"
```

Setting `enabled: true` on a stage does two things at once: it renders that stage's worker Deployment (`pipe-<id>`) **and** adds its descriptor to the generated registry, so the engine routes to it. With no stage enabled the registry is `[]` — the engine seeds runs and records results but dispatches nothing. (Enabling the engine itself, `kerberoshub.workflows.enabled: true`, also sets `WORKFLOWS_ENABLED` on `pipe-analysis`, so analysis starts teeing the classify result to the engine.)

### The operation registry

The orchestrator reads `PIPELINE_STAGE_REGISTRY` once at boot — there is **no ConfigMap, mount or extra API call**; the registry travels with the pod spec, so a `helm upgrade` that changes a stage rolls hub-workflows automatically and the new value is in effect the moment the pod restarts. The chart **assembles** the registry from the enabled stages with a template helper (`_workflows-helpers.tpl`) and injects the result next to the engine's existing env:

```yaml
# templates/kerberos-pipeline/pipe-workflows.yaml — on the engine's env: list
        - name: PIPELINE_STAGE_REGISTRY
          value: {{ include "kerberoshub.workflows.stageRegistry" . | quote }}
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

**Minimal stage.** The smallest useful stage is `enabled: true` with `dispatch: always` (the `operation` defaults to the stage key) plus the worker's `repository`/`tag`. `needs` is purely additive — you can add conditional routing later without changing the stage's shape.

## Conditional routing

Two kinds of "conditional" exist, and they live in different places:

- **Per-deployment** — *is this stage present at all?* Controlled by `enabled` in the stage's values block.
- **Per-recording** — *should this particular recording go through the stage?* This decision can't be made up front, because the deciding signal often isn't computed yet. It is declared with `dispatch: conditional` plus a `needs` list — each entry an upstream **operation** paired with an optional **condition** (a predicate on that operation's result).

A conditional stage is **not** enqueued when the run is seeded. Instead, whenever any listed upstream resolves, the orchestrator evaluates that dependency's `condition` against its result and — only on a match — enqueues the stage's queue. A dependency with no `condition` matches as soon as its upstream resolves. Recordings that match no dependency never touch the stage.

```yaml
# values.yaml — one stage block, same as "Registering a stage", with a needs list
kerberoshub:
  workflows:
    stages:
      nohelmet:
        enabled: true
        dispatch: conditional
        needs:
          - operation: classify
            condition: { path: properties, op: contains, value: person }
        queue: "kcloud-nohelmet-queue.fifo"
        repository: ghcr.io/uug-ai/hub-nohelmet
        tag: "v1.0.0"
```

Because `needs` is a **list**, a stage can fan in from several upstreams — each gated by its own condition — and fires for the first dependency that matches. The condition `op` is one of `eq`, `ne`, `contains`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`.

> **What a condition can match — and the array caveat.** `path` is a **dot-separated lookup into string-keyed maps only**; it **cannot index into arrays** (no `details.0.classified`, no wildcards). The `value` is compared by `op`: `eq`/`ne` against a scalar, `contains` against a string substring **or** a list's members, `in` against a list operand, `gt`/`gte`/`lt`/`lte` numerically. So which `path` you can use depends entirely on the **shape of the upstream operation's result** — the raw `data` that operation forwards.
>
> For the **`classify`** result the fields available at the top level are:
>
> | `path` | Shape | Use with |
> | --- | --- | --- |
> | `properties` | array of class strings for every detected object, e.g. `["car","car","pedestrian"]` | `contains` (label present) |
> | `objectCount` | number of detected objects | `eq` / `gt` / `gte` / `lt` / `lte` |
> | `details` | array of per-object objects (each with `classified`, `distance`, `isStatic`, …) | **not directly matchable** — it's an array, so `path` can't reach `classified` inside it; use `properties` instead |
>
> **To route on a detected class, match the `properties` array with `contains`** — e.g. fire a stage when any car is present:
>
> ```json
> { "operation": "classify", "condition": { "path": "properties", "op": "contains", "value": "car" } }
> ```
>
> A `{ "path": "label", "op": "eq", "value": "car" }` style condition will **never match** a classify result: there is no top-level `label`/`labels` field, and the per-object `classified` values live inside the `details` array, which `path` cannot traverse. Match `properties` instead. (Class strings come from the classifier's own vocabulary, e.g. `car`, `pedestrian`.)

> **`conditional` with no `needs` becomes `always`.** A conditional stage with no upstream dependencies has nothing that could ever trigger it, so the engine treats it as an `always` stage (dispatched on every run) rather than rejecting the registry. Add at least one `needs` entry for a stage you actually want gated.

This is the declarative form of a pattern the built-in classifier already uses imperatively: when classification returns, `analysis` inspects the result and re-enqueues follow-up work for matched objects. The `needs` descriptor moves that decision out of Go and into config — evaluated by hub-workflows when the teed classify result (and any later results it tracks) arrives.

## Completion and acknowledgement

Every custom stage is **asynchronous**: the run never waits on it. hub-workflows seeds the run and dispatches its stages, and your stage's result lands whenever the worker finishes. (Blocking, "required" stages are intentionally out of scope in this design — there is no way for a custom stage to stall a run.)

Echo a **completion ack** once the work is durably done so the orchestrator can mark the operation resolved. Publish the result back to `kcloud-workflows-queue` with its `operation` set; the engine records it on the run (`workflow_runs`) and uses it to evaluate any conditional fan-in (see [Conditional routing](#conditional-routing)). The ack carries no payload for an own-collection stage — it is just the signal that the operation resolved. A run that never hears back from a stage still completes on the existing rules (with a 15-minute safety timeout as a backstop), so a crashed worker can't wedge the pipeline.

## Failure modes & gotchas

- **Queue with no consumer.** Enabling a stage deploys its worker alongside the registry entry, so the old register-but-forget-to-deploy drift is gone. Messages can still pile up on `kcloud-<id>-queue.fifo` if that worker is scaled to zero, crash-looping, or the stage's `queue` points at an externally-managed consumer that isn't running.
- **No completion ack.** A worker that writes its result but never echoes back to the orchestrator (`kcloud-workflows-queue`) leaves the operation unresolved on the run. Harmless to the run (stages are async), but it breaks provenance and lets a re-analysis repeat the work. Always ack.
- **Re-decode cost.** A stage that re-fetches and re-decodes the video pays that cost per recording; reuse data already in the envelope or the database where you can.
- **Non-idempotent writes.** Redelivery will duplicate output unless you upsert on a stable key.

## Checklist

- [ ] Pick a unique **operation id** — it's the stage key, the queue suffix (`kcloud-<id>-queue.fifo`) and the completion key
- [ ] Define the stage under `kerberoshub.workflows.stages.<id>` with `enabled: true` and `dispatch: always` — one block deploys the worker and registers it
- [ ] Consume the **envelope**, resolve the recording from `fileName`, fetch media with the **storage credentials** in `data`
- [ ] Write your result to your **own collection**, keyed by the recording
- [ ] **Idempotent** writes (upsert by recording + run id)
- [ ] Echo a **completion ack** to `kcloud-workflows-queue` (the orchestrator) with `operation` set
- [ ] (Optional) gate per-recording with `dispatch: conditional` + a `needs` list of `{ operation, condition }` upstreams
