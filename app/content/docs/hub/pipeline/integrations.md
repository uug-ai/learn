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

> **Status — proposed.** The queue, envelope and completion mechanics described here are how the pipeline already works internally. The config-driven **stage registration** (the `workflows` values block and operation registry below) is the proposed addition that lets a *custom* operation join the pipeline without changing orchestrator code. Custom stages are **asynchronous only** in this design — there is no blocking "required" stage.
>
> This page is about how a worker *delivers* a result. For the complementary *receiving* side — one shared service that takes a result from either the API or the queue and runs the right sequence of actions for its kind — see [Ingest service](ingest-service/).

## When to add a stage

A stage is one of **two transports** for getting your data into the Hub. The other is an authenticated API push. They deliver the **same data** to the **same place**; they differ in *who triggers the work* and *where your code runs*.

- **API push** — your service `POST`s whenever it has data. Works on **every** deployment, needs no cluster access. The right starting point for most integrators. See [Extend](../../extend/).
- **In-pipeline stage (this page)** — the pipeline triggers your service automatically on every ingest / re-analysis, with queue-level delivery guarantees. Available on **self-hosted deployments** that can run custom stages.

Reach for a stage only when you control the deployment **and** want the capability to run automatically as a built-in step of every recording's analysis.

## Anatomy of a stage

A stage has exactly two runtime dependencies: the **message broker** (to receive events and hand results back) and the **database** (to read and write event metadata). There is no service-to-service HTTP and no shared in-process state — every hand-off goes through the broker. That loose coupling is what lets any stage scale, restart or be replaced without touching the rest of the pipeline.

{{< rete caption="A custom stage is a queue consumer: the analyser fans an event out to your stage's queue; your worker does its work and either writes its own collection or hands a result back to the analyser" alt="Custom pipeline stage placement" height="520" >}}
{
  "groups": [
    { "id": "hub",  "label": "Hub pipeline",            "x":   0, "y":  20, "w": 640, "h": 420 },
    { "id": "yours","label": "Your stage (integrator-owned)", "x": 700, "y": 20, "w": 360, "h": 420 }
  ],
  "nodes": [
    { "id": "broker",   "kind": "amqp",              "x":  40, "y": 180, "w": 220, "h": 130,
      "header": "BROKER", "title": "Message broker", "subtitle": "Kafka / AMQP \u00b7 per-stage queue" },
    { "id": "analysis", "kind": "pipeline-analysis", "x": 320, "y":  60, "w": 260, "h": 130,
      "header": "ORCHESTRATOR", "title": "Analyser", "subtitle": "Fans out \u00b7 tracks completion" },
    { "id": "store",    "kind": "storage",           "x": 320, "y": 300, "w": 260, "h": 110,
      "header": "DATABASE", "title": "Your collection", "subtitle": "Keyed by recording" },
    { "id": "worker",   "kind": "detection",         "x": 760, "y": 170, "w": 240, "h": 140,
      "header": "STAGE", "title": "Your worker", "subtitle": "Consume \u2192 process \u2192 hand back" }
  ],
  "connections": [
    { "from": "analysis", "to": "broker", "fromSide": "left",  "toSide": "top",   "label": "enqueue" },
    { "from": "broker",   "to": "worker", "fromSide": "right", "toSide": "left",  "kind": "thick", "label": "deliver event" },
    { "from": "worker",   "to": "broker", "fromSide": "bottom","toSide": "right", "kind": "dashed", "label": "hand back" },
    { "from": "worker",   "to": "store",  "fromSide": "left",  "toSide": "right", "label": "or self-write" }
  ]
}
{{< /rete >}}

## The message you receive

### Queue naming

The analyser enqueues each operation on its own queue, named by convention from the **operation name**:

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

If your result must be merged into a **shared** document (e.g. a field on the recording's analysis), your worker republishes the event with its `operation` set and the result in `data`. The analyser persists it generically:

```text
$set        data.<operation> = <your result>
$addToSet   resolvedoperations = <operation>
```

So the result is recorded against the analysis and the operation is marked resolved **with no orchestrator code** — until you need a typed side-effect on the shared document, which is the one case that warrants a handler in the analysis router. That typed handler is the [Ingest service](ingest-service/) path: the result then travels as the typed `payload` and the handler owns the side-effect, instead of the generic `data.<operation>` bag used here. `data.<operation>` is the handler-less default; `payload` + a handler is the typed upgrade for a kind that needs one.

> The difference between the sinks is only *who reads the result* — your collection, or the shared analysis document. Either way the operation is recorded the same way: through the completion ack.

## Registering a stage

Stages are grouped into named **workflows**. Each stage is described once, as an entry under a workflow's `stages` list whose **key is the operation id**. One flag — `enabled` — both renders the Deployment *and* registers the operation, so the worker and the orchestrator can never drift apart. The workflow `name` simply labels the group (shown in the UI, toggled as a unit); **operation ids stay globally unique** across every workflow — they are what binds the queue, dispatch and resolution.

> **Config registers a stage; it does not register a typed handler.** This values block is the *stage registry* — it governs the queue, dispatch and completion tracking. It is **all you need** for a self-persisting stage (one that writes its own collection and acks). A stage that instead *delegates* persistence to the platform — handing back a `payload` for a typed side-effect on shared state — also needs a Go handler in `models/pkg/ingest`. See [Ingest service → Two registries, two jobs](ingest-service/#two-registries-two-jobs).

```yaml
# values.yaml
workflows:
  - name: anpr                     # names a group of stages run together
    stages:
      - detection:                 # key = operation id = queue suffix
          enabled: true            # renders the Deployment AND registers the operation

          # --- deployment (Helm-only; the orchestrator never sees these) ---
          repository: ghcr.io/acme/hub-pipeline-detection
          tag: "1.0.0"
          replicas: 1
          pullPolicy: IfNotPresent
          logLevel: info
          resources: {}
          env: []
          volumes: []

          # --- dispatch (projected to the orchestrator) ---
          dispatch: always         # always | conditional
          needs: ""                # upstream operation that triggers it (conditional only)
          condition: {}            # predicate on the upstream result (conditional only)
```

The chart renders a normal `pipe-<operation>` Deployment, gated to pipeline deployments exactly like the built-in stages:

```yaml
# templates/workflows/pipe-detection.yaml (abridged)
{{- if or (eq .Values.mode "all") (eq .Values.mode "pipeline") -}}
# ...image, broker + Mongo env wired from the same values block...
{{- end -}}
```

### The operation registry

For every **enabled** stage, the chart also projects the *routing-relevant* fields into a single artifact the orchestrator reads at boot (an env var or mounted ConfigMap):

```json
[
  { "operation": "detection", "dispatch": "always" },
  { "operation": "nohelmet",  "dispatch": "conditional",
    "needs": "classify", "condition": { "path": "labels", "op": "contains", "value": "person" } }
]
```

```go
type StageDescriptor struct {
    Operation string          `json:"operation"`           // unique — binds queue, dispatch and resolution
    Dispatch  string          `json:"dispatch"`            // "always" | "conditional"
    Needs     string          `json:"needs,omitempty"`     // upstream op that triggers a conditional stage
    Condition *StageCondition `json:"condition,omitempty"` // structured predicate (no free-form expressions)
}

type StageCondition struct {
    Path  string `json:"path"`  // field in the upstream op's result
    Op    string `json:"op"`    // eq | ne | contains | exists | gt | lt
    Value any    `json:"value"`
}
```

The registry is the **flattened union of every workflow's stages** — the `name` groups are organisational only; what the orchestrator consumes is the list of operations. It folds that into its dispatch as a **separate, non-gating tier** — registry stages become **workflow operations**, kept apart from the built-in async operations so the built-in dispatch is never touched, and enqueued to `kcloud-<operation>-queue.fifo` at the start of each analysis:

```go
for _, s := range registry {
    if s.Dispatch == "always" {
        // a dedicated tier — NOT AsyncOperations — so built-ins stay untouched
        analysis.WorkflowOperations = append(analysis.WorkflowOperations, s.Operation)
    }
    // conditional stages are enqueued reactively — see Conditional routing
}
```

Like the built-in async operations, workflow operations are **non-gating**: a custom stage can never stall a run. See [Ingest service → Pipeline tracking](ingest-service/#pipeline-tracking-workflow-operations--the-allow-list) for how the same registry doubles as the **allow-list** that validates enqueue and resolution.

Because the **operation id** is the stage key, it is the single string shared by the queue, the dispatch entry and the completion key — they cannot drift. A stage the orchestrator knows about but no worker consumes can't happen: the same `enabled` flag produces both sides.

**Minimal stage.** The smallest useful stage is just `enabled` + the deployment fields + `dispatch: always`. `needs` / `condition` are purely additive — you can add conditional routing later without changing the object's shape.

## Conditional routing

Two kinds of "conditional" exist, and they live in different places:

- **Per-deployment** — *is this stage present at all?* Controlled by `enabled` in the stage's values block.
- **Per-recording** — *should this particular recording go through the stage?* This decision can't be made up front, because the deciding signal often isn't computed yet. It is declared with `dispatch: conditional` plus a `needs` (the upstream operation) and a `condition` (a predicate on that operation's result).

A conditional stage is **not** enqueued at analysis start. Instead, when the `needs` operation resolves, the orchestrator evaluates `condition` against its result and — only on a match — enqueues the stage's queue. Recordings that don't match never touch the stage.

```yaml
workflows:
  - name: ppe
    stages:
      - nohelmet:
          enabled: true
          dispatch: conditional
          needs: classify
          condition: { path: labels, op: contains, value: person }   # only recordings the classifier flagged as containing a person
```

This is the declarative form of a pattern the built-in classifier already uses imperatively: when classification returns, the analyser inspects the result and re-enqueues follow-up work for matched objects. The `needs` / `condition` descriptor moves that decision out of Go and into config.

## Completion and acknowledgement

Every custom stage is **asynchronous**: the run never waits on it. The analyser continues as soon as its own built-in steps are satisfied, and your stage's result lands whenever the worker finishes. (Blocking, "required" stages are intentionally out of scope in this design — there is no way for a custom stage to stall a run.)

Whichever [sink](#sending-a-result-back) you use, your worker should echo a **completion ack** back to `kcloud-analysis-queue` with its `operation` set once the work is durably done. The analyser records it generically (`$addToSet resolvedoperations`), which keeps the run's provenance complete and stops a re-analysis from redoing the work. The ack carries no payload for an own-collection stage — it is just the signal that the operation resolved. A run that never hears back from a stage still completes on the existing rules (with a 15-minute safety timeout as a backstop), so a crashed worker can't wedge the pipeline.

## Failure modes & gotchas

- **Queue with no consumer.** An operation registered but not deployed would pile messages up — which is exactly why a single `enabled` flag drives both the Deployment and the registry entry. Don't register an operation from anywhere else.
- **No completion ack.** A worker that writes its result but never echoes back to `kcloud-analysis-queue` leaves the operation absent from `resolvedoperations`. Harmless to the run (stages are async), but it breaks provenance and lets a re-analysis repeat the work. Always ack.
- **Re-decode cost.** A stage that re-fetches and re-decodes the video pays that cost per recording; reuse data already in the envelope or the database where you can.
- **Non-idempotent writes.** Redelivery will duplicate output unless you upsert on a stable key.

## Checklist

- [ ] Pick a unique **operation id** — it's the stage key, the queue suffix (`kcloud-<id>-queue.fifo`) and the completion key
- [ ] Add the stage as an entry under a workflow's `stages` list with `enabled: true`, the deployment fields and `dispatch: always`
- [ ] Consume the **envelope**, resolve the recording from `fileName`, fetch media with the **storage credentials** in `data`
- [ ] Pick a **sink** — own collection (recommended) or enrich-in-place
- [ ] **Idempotent** writes (upsert by recording + run id)
- [ ] Echo a **completion ack** to `kcloud-analysis-queue` with `operation` set
- [ ] (Optional) gate per-recording with `dispatch: conditional` + `needs` + `condition`
