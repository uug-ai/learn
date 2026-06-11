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
> **Transitional reality.** The fixed `analysis` service still runs the built-in operations (`classify`, `thumby`, `dominantcolor`, …) and the classifier's own imperative follow-ups. What is new is that, when the **classify** result resolves, `analysis` sends a single **`WorkflowRun`** hand-off message to hub-workflows (queue `kcloud-workflows-queue`, gated by `WORKFLOWS_ENABLED`) **in parallel** with the normal throttler → notification tail — notification still fires. The hand-off is a self-contained run-open: it carries the curated account/device context and the **triggering operation's result** (`classify`) in its `inputs` bag — **not** a copy of the internal `PipelineEvent`, and **not** the other built-in results, which run in parallel and aren't guaranteed to have resolved yet. hub-workflows opens a run, dispatches the registry's stages and tracks completion in its own `workflow_runs` collection.
>
> This page is about how a worker *delivers* a result. For the complementary *receiving* side — one shared service that takes a result from either the API or the queue and runs the right sequence of actions for its kind — see [Ingest service](ingest-service/).

## When to add a stage

A stage is one of **two transports** for getting your data into the Hub. The other is an authenticated API push. They deliver the **same data** to the **same place**; they differ in *who triggers the work* and *where your code runs*.

- **API push** — your service `POST`s whenever it has data. Works on **every** deployment, needs no cluster access. The right starting point for most integrators. See [Extend](../../extend/).
- **In-pipeline stage (this page)** — the pipeline triggers your service automatically on every ingest / re-analysis, with queue-level delivery guarantees. Available on **self-hosted deployments** that can run custom stages.

Reach for a stage only when you control the deployment **and** want the capability to run automatically as a built-in step of every recording's analysis.

## Anatomy of a stage

A stage has exactly two runtime dependencies: the **message broker** (to receive events and hand results back) and the **database** (to read and write event metadata). There is no service-to-service HTTP and no shared in-process state — every hand-off goes through the broker. That loose coupling is what lets any stage scale, restart or be replaced without touching the rest of the pipeline.

{{< rete caption="On classify, analysis keeps running the normal tail (throttler → notification) and in parallel hands a single WorkflowRun to hub-workflows, which dispatches each registered stage onto its own queue; your worker(s) consume the run and hand a result back" alt="Custom pipeline stage placement" height="460" >}}
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
      "header": "PIPELINE", "title": "Analysis", "subtitle": "Built-ins \u00b7 opens run", "groupId": "hub" },
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

The queue your stage consumes is **declared in the chart** — the `queue:` field on the stage's `kerberoshub.workflows.stages.<id>` block. That value is authoritative: the chart renders the **same** string into the engine's stage registry (`PIPELINE_STAGE_REGISTRY`, how hub-workflows knows where to dispatch) **and** into your worker's Deployment, so the dispatcher and the consumer cannot drift.

```yaml
stages:
  detection:
    queue: "kcloud-detection-queue.fifo"   # the engine dispatches here; your worker consumes here
```

If you omit `queue`, the engine falls back to a name derived from the **operation**, by the same convention the built-in operations use:

```text
kcloud-<operation>-queue.fifo
```

Either way your stage consumes from exactly one queue, and the queue name is the only thing that binds the orchestrator to your worker — nothing else is shared. Set `queue` explicitly when you want a name that doesn't follow the operation convention (e.g. an externally-managed queue); otherwise leave it off and the default applies.

### Envelope

Every message on the workflow queues is **one type**: the **`models.WorkflowRun`** envelope (`models/pkg/models/workflowrun.go`) — the workflow subsystem's own message, distinct from the internal `models.PipelineEvent` the built-in pipeline forwards. The same object travels every hop, but **your worker only ever sees one of those hops**: the **engine → worker dispatch**. The orchestrator routes purely by `operation`; **everything else is context for your worker**.

```text
analysis ──WorkflowRun{operation:"event"}──────────────────────▶ engine   (opens the run — internal, you never see this)
engine   ──WorkflowRun{operation:<your-op>, storage, …}────────▶ YOUR WORKER   (the dispatch you receive)
your worker ──WorkflowRun{operation:<your-op>, results.<your-op>}▶ engine   (the result you return)
```

So there is exactly **one message shape to handle**: a dispatch whose `operation` is your stage's name. The next section is that message in full.

#### The dispatch your worker receives

This is a complete, representative dispatch for a stage whose operation is `anpr`. **Every field below is present on the message your worker pulls off its queue** (optional fields are simply absent when empty):

```jsonc
{
  // ── routing & identity ────────────────────────────────────────────────
  "operation": "anpr",                       // your stage's name; echo it back unchanged
  "runId": "6630f1c2a4e3b201c8f9d4e7",       // the workflow run; echo it back so redelivery replaces
  "key": "1718…_967603_frontdoor_24.mp4",    // the recording's storage key — what you fetch, and the run's identity
  "traceId": "0af7651916cd43dd8448eb211c80319c", // OpenTelemetry trace id — propagate in your logs/spans

  // ── who & where (read-only context) ───────────────────────────────────
  "user": {
    "id": "5f8a1c2e7b3d4a0019c2e5f1",        // owning user
    "organisationId": "5f8a1c2e7b3d4a0019c2e5aa", // owning org — key your output by this for tenancy
    "storage": {                             // the account's vault/storage block (the override SOURCE)
      "uri": "https://vault.example.com",
      "access_key": "…", "secret_key": "…", "provider": "kstorage"
    }
  },
  "device": {
    "deviceKey": "967603",                   // the camera/source this recording came from
    "deviceName": "Front door",
    "provider": "kerberos-vault",            // where the media is served from
    "storageSolution": "kerberos-vault"      // where the media is stored
  },

  // ── the run's data (what upstream stages produced) ─────────────────────
  "inputs": {                                // immutable start context — ONLY the trigger
    "classify": { "properties": ["car", "person"], "objectCount": 2, "details": [ /* … */ ] }
  },
  "results": {                               // accumulated upstream stage outputs, keyed by operation
    "detection": { "status": "done" }
  },

  // ── how to fetch the media (credentials) ───────────────────────────────
  "storage": {                               // present ONLY on the dispatch to you; never echo it back
    "uri": "https://storage.example.com", "accessKey": "…", "secret": "…",
    "vaultOverrideUri": "https://vault.example.com",
    "vaultOverrideAccessKey": "…", "vaultOverrideSecret": "…", "vaultOverrideProvider": "kstorage"
  }
}
```

The four groups above — **identity**, **context**, **data**, **credentials** — are the whole contract. The field reference and per-group detail follow.

#### Field reference

| Field (wire name) | Type | What it gives your worker |
|---|---|---|
| `operation` | string | Your stage's name — the same string you echo back on completion. (Internally the analysis → engine hand-off uses `event`, but **your worker never receives that message**; on every dispatch you get, this equals your operation.) |
| `runId` | string | The workflow run this dispatch belongs to. **Echo it back unchanged** so a redelivery replaces rather than duplicates. |
| `key` | string | The recording's storage key — the object your worker fetches with the `storage` credentials, and the run's identity. |
| `traceId` | string | OpenTelemetry trace id — propagate it in your logs/spans so your stage joins the recording's trace. |
| `user` | object | Curated **account context** for the recording's owner. See [`user` & `device` below](#user--device-the-curated-context). |
| `device` | object | Curated **recording source** (camera/provider). See [`user` & `device` below](#user--device-the-curated-context). |
| `inputs` | object | The run's **immutable start context**, keyed by operation — holds **only the triggering operation's result** (`inputs.classify`). See [`inputs` & `results` below](#inputs--results-the-runs-data). |
| `results` | object | The run's **accumulated upstream stage outputs**, keyed by operation (`results.detection`, …). See [`inputs` & `results` below](#inputs--results-the-runs-data). |
| `storage` | object | The **credentials** your worker needs to fetch the media — present **only** on the dispatch to you, never echoed back. See [`storage` below](#storage-the-fetch-credentials). |

#### `user` & `device` — the curated context

`user` (`models.WorkflowUser`) and `device` (`models.WorkflowDevice`) are the account and recording context analysis curates for the run, so your worker — and the engine's own vault resolution — has what it needs without re-querying the database. The account's **auth tokens, billing and other secrets are not included**; analysis projects only the fields below. Note that `user.storage` **does** carry the account's vault/storage credentials — it is the *source* the engine resolves the recording's location from — so treat it as sensitive even though the credentials you actually fetch with arrive in [`storage`](#storage-the-fetch-credentials).

| `user.<field>` | Meaning |
|---|---|
| `id` | The owning user id. |
| `organisationId` | The owning organisation — key your output by this for tenancy/RBAC. |
| `storage` | The account's vault/storage credentials block (`uri`, `access_key`, `secret_key`, `provider`) the engine uses to resolve *where* the recording lives. The override source, not your fetch credentials. |

| `device.<field>` | Meaning |
|---|---|
| `deviceKey` · `deviceName` | The camera/source the recording came from. |
| `provider` | Where the media is **served** from (video provider). |
| `storageSolution` | Where the media is **stored** (storage backend). |

> **`user` and `device` are read-only context.** They tell your worker *whose* recording this is and which backend it lives on. Echo them back unchanged, and note they are **not** matchable by conditions (see the callout under [`storage`](#storage-the-fetch-credentials)).

#### `inputs` & `results` — the run's data

`inputs` and `results` are the **structured home for the data a workflow run carries between its stages** — kept separate from the credentials in `storage` and the read-only context in `user`/`device`. Both are maps keyed by **operation name**, and each value is that operation's own result bag.

| Field | Meaning |
|---|---|
| `inputs` | The run's **immutable start context**. It holds **only the triggering operation's result** — `inputs.classify`, the one operation guaranteed to have resolved when the run opens. It does **not** change as the run progresses, and it never bundles the other built-ins (`thumbnail`, `sprite`, `dominantcolor`, …) — those run in parallel and aren't guaranteed to be ready, so they are deliberately left out to keep the start context deterministic. |
| `results` | The run's **accumulated stage outputs**. Each stage's output is added under its operation as it resolves, so by the time your stage is dispatched, `results` contains every upstream stage that has already completed for this run. Read what you depend on from here. |

> **What this means for you.** If your stage only needs the classifier's verdict, read `inputs.classify`. If it depends on another stage's output, that stage must run **upstream** of yours (gate yours with `dispatch: conditional` + `needs`) and you read it from `results.<that-op>` — never assume a non-`classify` key exists in `inputs`. For the exact shape of each operation's bag, see [Event & operation data shapes](event-data-shapes/).

#### `storage` — the fetch credentials

`storage` (`models.WorkflowStorage`) carries the credentials your worker uses to fetch the media. It is populated **only** on the dispatch from the engine to your worker, and you **clear it** on the result you route back:

| `storage.<field>` | Meaning |
|---|---|
| `uri` · `accessKey` · `secret` | The global Kerberos Storage credentials. |
| `vaultOverrideUri` · `vaultOverrideAccessKey` · `vaultOverrideSecret` · `vaultOverrideProvider` | Set when the recording lives on a per-account or per-site backend, so derived artifacts land alongside the recording. When present, prefer the override over the global credentials. |

The envelope is **opaque to the orchestrator for routing the dispatch itself** — it picks a worker by `operation`, never by inspecting the data to decide *where* a message goes. Credentials travel only in the structured `storage` field; the run's data travels in `inputs`/`results`.

> **Conditions match the run, never its credentials.** The fields above are the context your *worker* reads at runtime. A conditional stage's `condition` (`path`/`op`/`value`) is evaluated against the **whole run** — its `inputs.<op>`/`results.<op>` data **and** the curated `device`/`user` envelope and top-level identity scalars (`key`, `operation`, `runId`, `traceId`). What it can **never** reach is a secret: `storage` and `user.storage` are excluded from the matchable view. See [Conditional routing](#conditional-routing) and [Event & operation data shapes](event-data-shapes/).

### What you return

You don't build a new message — you **edit the dispatch you received** and publish it back to `kcloud-workflows-queue`:

1. **Keep** `operation`, `runId`, `key`, `traceId`, `user`, `device` exactly as received.
2. **Clear `storage`** — credentials are never echoed back.
3. **Return your output** in **one** of two channels, depending on who owns persistence:
   - **Self-persisting stage** (the default): your worker has already written its own collection. Put just the routing values downstream conditions branch on under your operation in `results` — i.e. `results.<your-op>`. It can be a minimal `{ "status": "done" }` marker; the engine only needs the operation to appear resolved.
   - **Delegated-ingest stage** (your stage declares a `kind`): hand the platform your **typed result body** in `payload` and leave `results` alone. The engine routes `payload` through the shared ingest core into the kind's platform-owned collection **and** mirrors its decoded form into `results.<your-op>` for routing — so you write the data once.

```jsonc
// Self-persisting stage — you wrote your own collection, you return routing values.
{
  "operation": "anpr",                       // unchanged
  "runId": "6630f1c2a4e3b201c8f9d4e7",       // unchanged — pairs the result with the run
  "key": "1718…_967603_frontdoor_24.mp4",    // unchanged
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "user": { /* unchanged */ },
  "device": { /* unchanged */ },
  "results": {
    "anpr": { "status": "done" }             // YOUR output — the body is yours to define
  }
  // note: no "storage" — cleared
}
```

```jsonc
// Delegated-ingest stage — the platform persists your typed body via its kind handler.
{
  "operation": "detection",                  // unchanged
  "runId": "6630f1c2a4e3b201c8f9d4e7",       // unchanged
  "key": "1718…_967603_frontdoor_24.mp4",    // unchanged
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "user": { /* unchanged */ },
  "device": { /* unchanged */ },
  "payload": { /* your typed body in the kind's contract shape */ }
  // note: no "storage" — cleared; no "results" — the engine fills it from payload
}
```

The engine records the resolution and fires any conditional stage that was waiting on your operation. Preserving `runId`/`key` is what lets a redelivery replace rather than duplicate. Pick **one** channel: `results` for a stage that owns its storage, `payload` for one that delegates persistence to a platform `kind` (see [Delegated ingest](#delegated-ingest)). `payload` is return-only and is never persisted on the run or forwarded to the next stage.

### Acknowledgement

The broker delivers at least once. Acknowledge a message only **after** the work is durably done (result written or handed back); on failure, let it nack so the broker can redeliver. Because redelivery is possible, **make your stage idempotent** — keying your output by the recording (and a stable run id) so a replay replaces rather than duplicates.

## Doing the work

Your worker is a stateless consumer: pull a run, fetch the media using the credentials in `storage`, compute, emit. It can be written in any language — the only contract is the queue it reads and how it returns a result. Keep it single-purpose; if you need a second capability, add a second stage.

## Sending a result back

A custom stage returns its output through one of **two channels**, and which one you use is the single most important design choice for your stage.

**Self-persist (the default).** Your worker writes its result to **its own collection, keyed by the recording**, and the rest of the Hub reads that collection directly. The orchestrator never interprets your data — it stays a dumb router. Alongside the write, your worker echoes a completion ack so the orchestrator can mark the operation resolved (see [Completion and acknowledgement](#completion-and-acknowledgement)): set your stage's output under your operation in the run's `results` bag (`results.<operation>`) — clearing `storage` — and publish the `WorkflowRun` back. The output bag can be a minimal "done" marker; the engine only needs the operation to appear resolved.

> **Why not write the shared `analysis` document?** Enriching the recording's shared analysis document in place is a **built-in-only** capability. The `analysis` service accepts results only for the operations it ships with (`classify`, `thumby`, `detection`, …), so a custom operation republished to `kcloud-analysis-queue` is dropped as unknown. Self-persisting stages own their own collection and ack to the orchestrator on `kcloud-workflows-queue`.

### Delegated ingest

A stage can instead **delegate persistence to the platform**: rather than writing a collection itself, its worker hands back a **typed result body** in `payload` and the engine stores it for you through the shared [Ingest service](ingest-service/). Use this when your result fits an existing platform contract (today: `detection` — the detection-run shape shared with the `/detections` API and the analyser) so it lands in the same collection, idempotently, regardless of which transport produced it.

Two things make a stage delegated-ingest:

1. **A `kind` on the stage** in the chart values (`kerberoshub.workflows.stages.<id>.kind: detection`). The `kind` names the ingest handler the engine routes through — it is **not** the same as the stage's `operation` (e.g. both a `detection` and a `pose` operation can route through kind `detection`).
2. **A Go handler for that `kind`** registered in `models/pkg/ingest`. The handler decodes, validates and upserts the body. A `kind` with no registered handler is treated as self-persist — the result is recorded into `results`, just not ingested.

On a delegated stage's result the worker sets `payload` (the typed body) and leaves `results` empty; the engine calls `ingest.Ingest(kind, payload)` to persist it, then mirrors the decoded body into `results.<operation>` so downstream conditions can still branch on it. `payload` is **return-only**: it is `bson:"-"` (never written to the run document) and the engine never copies it onto an outbound dispatch, so it travels worker → engine and no further.

## Registering a stage

A custom stage is defined **once**, under `kerberoshub.workflows.stages.<id>` in the chart values — the very block that deploys its worker. At render time the chart **assembles** every *enabled* stage into the hub-workflows **stage registry**: a JSON array projected into the orchestrator as a single environment variable, **`PIPELINE_STAGE_REGISTRY`**, on the `pipe-workflows` Deployment. Each stage's **operation id** is the string that binds the dispatch entry and the completion key, while its **`queue`** field names the queue the engine dispatches to (defaulting to `kcloud-<id>-queue.fifo` when omitted) — and because the registry entry and the worker's own queue are rendered from the **same** chart values, they cannot drift.

> **`kerberoshub.workflows`, not the front-end `workflows` flag.** The stage registry lives under `kerberoshub.workflows`, the values block for the hub-workflows engine. Don't confuse it with `kerberoshub.…features.workflows.enabled`, the unrelated front-end feature toggle.

> **Config registers a stage; it does not register a typed handler.** The registry governs the queue, dispatch and completion tracking. It is **all you need** for a self-persisting stage (one that writes its own collection and acks). A stage that instead *delegates* persistence to the platform — declaring a `kind` and handing back a `payload` for a typed side-effect on shared state — also needs a Go handler for that `kind` in `models/pkg/ingest`. The two must agree: a `kind` with no handler is recorded but not ingested. See [Delegated ingest](#delegated-ingest) and [Ingest service → Two registries, two jobs](ingest-service/#two-registries-two-jobs).

```yaml
# values.yaml
kerberoshub:
  workflows:
    enabled: true                    # runs the hub-workflows engine AND hands classify off to it
    queue: "kcloud-workflows-queue"  # WORKFLOWS_QUEUE — what the engine consumes
    # Each enabled stage below is assembled into PIPELINE_STAGE_REGISTRY for the
    # engine AND deployed as its own worker (pipe-<id>). Define the stage once;
    # routing and deployment both flow from this block.
    stages:
      detection:
        enabled: true
        operation: detection                 # defaults to the stage key if omitted
        kind: detection                       # delegated ingest: engine persists payload via the detection handler
        dispatch: always
        queue: "kcloud-detection-queue.fifo"  # the worker consumes this; also fed to the registry
        repository: ghcr.io/uug-ai/hub-detection
        tag: "v1.0.0"
      nohelmet:
        enabled: true
        dispatch: conditional
        needs:
          - operation: classify
            condition: { path: results.classify.properties, op: contains, value: person }
        queue: "kcloud-nohelmet-queue.fifo"
        repository: ghcr.io/uug-ai/hub-nohelmet
        tag: "v1.0.0"
```

Setting `enabled: true` on a stage does two things at once: it renders that stage's worker Deployment (`pipe-<id>`) **and** adds its descriptor to the generated registry, so the engine routes to it. With no stage enabled the registry is `[]` — the engine seeds runs and records results but dispatches nothing. (Enabling the engine itself, `kerberoshub.workflows.enabled: true`, also sets `WORKFLOWS_ENABLED` on `pipe-analysis`, so analysis starts handing the classify result off to the engine.)

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
    Needs     []StageDependency `json:"needs,omitempty"`    // fan-in needs (conditional stages)
    Kind      string            `json:"kind,omitempty"`     // ingest handler for delegated persistence (empty = self-persist)
    // … contract (params, inputs, outputs) and deployment fields omitted here …
}

// A conditional stage waits on one or more needs — its fan-in. Each need pairs
// an optional gate operation (which must be available on the run before the
// need is evaluated) with the predicate that must hold. Operation and Condition
// are decoupled: the predicate is evaluated against the whole run, so a need can
// gate on one operation yet match a different field (e.g. the recording's device).
type StageDependency struct {
    Operation string          `json:"operation,omitempty"` // readiness gate (empty = ungated, checked at open)
    Condition *StageCondition `json:"condition,omitempty"` // predicate over the run root (nil = unconditional)
}

type StageCondition struct {
    Path  string      `json:"path"`  // absolute dot-path into the run root (inputs.<op>, results.<op>, device, user, …)
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
- **Per-recording** — *should this particular recording go through the stage?* This decision can't always be made up front, because the deciding signal is often computed by an earlier stage. It is declared with `dispatch: conditional` plus a `needs` list — each entry an optional **gate operation** paired with an optional **condition** (an absolute predicate over the run).

A conditional stage is **not** enqueued when the run is seeded. Instead, the orchestrator re-evaluates its `needs` against the **whole run** every time the run progresses (at open, and on each upstream result) and — only on a match — enqueues the stage's queue (at most once per run). A need's `operation` is a **readiness gate**: its condition is only considered once that upstream is available on the run; an **empty** operation is ungated and checked from the moment the run opens (use it to branch on the recording's `device`/`user`/identity). A need with no `condition` matches as soon as its gate is available. Recordings that match no need never touch the stage.

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
            condition: { path: results.classify.properties, op: contains, value: person }
        queue: "kcloud-nohelmet-queue.fifo"
        repository: ghcr.io/uug-ai/hub-nohelmet
        tag: "v1.0.0"
```

Because `needs` is a **list**, a stage can fan in from several needs. By default (`needsMode: any`) it fires for the **first** need that matches; with `needsMode: all` it fires only once **every** need is satisfied (a join). The condition `op` is one of `eq`, `ne`, `contains`, `in`, `exists`, `gt`, `gte`, `lt`, `lte`.

> **What a condition can match — the run root, and the array caveat.** `path` is an **absolute, dot-separated lookup into the run**, starting at one of these roots:
>
> | Root | Holds | Example `path` |
> | --- | --- | --- |
> | `inputs.<op>` | the run's immutable start context (today just `classify`) | `inputs.classify.objectCount` |
> | `results.<op>` | an upstream stage's accumulated output | `results.anpr.plates` |
> | `device` | the recording source — `deviceKey`, `deviceName`, `provider`, `storageSolution` | `device.deviceKey` |
> | `user` | the owning account — `id`, `organisationId` only | `user.organisationId` |
> | `operation` `runId` `key` `traceId` | the run's top-level identity scalars | `key` |
>
> Credentials are **never** matchable: a path rooted at `storage` or at `user.storage` is rejected at boot. The lookup walks **string-keyed maps only** — it **cannot index into arrays** (no `results.classify.details.0.classified`, no wildcards). The `value` is compared by `op`: `eq`/`ne` against a scalar, `contains` against a string substring **or** a list's members, `in` against a list operand, `gt`/`gte`/`lt`/`lte` numerically. For the full per-operation contract, see [Event & operation data shapes](event-data-shapes/).
>
> For the **`classify`** result (under `inputs.classify` at open, or `results.classify`), the matchable fields are:
>
> | `<op>.<field>` | Shape | Use with |
> | --- | --- | --- |
> | `properties` | array of class strings for every detected object, e.g. `["car","car","pedestrian"]` | `contains` (label present), `in`, `exists` |
> | `objectCount` | integer count of detected objects | `eq`/`ne`/`gt`/`gte`/`lt`/`lte` |
> | `details` | array of per-object objects (each with `classified`, `distance`, `isStatic`, …) | **not directly matchable** — it's an array, so `path` can't reach `classified` inside it; use `properties` instead |
>
> `classify` is the operation analysis hands off to workflows, so it is the reliable one to gate on. Other operations (`counting`, `sprite`, …) are not dispatched as upstreams — see [Event & operation data shapes](event-data-shapes/).
>
> **To route on a detected class, match the `properties` array with `contains`** — e.g. fire a stage when any car is present:
>
> ```json
> { "operation": "classify", "condition": { "path": "results.classify.properties", "op": "contains", "value": "car" } }
> ```
>
> **To branch on the recording itself, gate on the envelope with an empty operation** — e.g. only run for one camera:
>
> ```json
> { "condition": { "path": "device.deviceKey", "op": "eq", "value": "front-gate" } }
> ```
>
> A `{ "path": "results.classify.label", "op": "eq", "value": "car" }` style condition will **never match**: there is no top-level `label`/`labels` field, and the per-object `classified` values live inside the `details` array, which `path` cannot traverse. Match `properties` instead. (Class strings come from the classifier's own vocabulary, e.g. `car`, `pedestrian`.)

> **`conditional` with no `needs` becomes `always`.** A conditional stage with no needs has nothing that could ever trigger it, so the engine treats it as an `always` stage (dispatched on every run) rather than rejecting the registry. A need with an **empty** `operation` is different — it is a real, ungated check on the run root, evaluated at open. Add at least one `needs` entry for a stage you actually want gated.

This is the declarative form of a pattern the built-in classifier already uses imperatively: when classification returns, `analysis` inspects the result and re-enqueues follow-up work for matched objects. The `needs` descriptor moves that decision out of Go and into config — re-evaluated by hub-workflows against the whole run as it progresses, from the moment it opens through each upstream result.

## Completion and acknowledgement

Every custom stage is **asynchronous**: the run never waits on it. hub-workflows seeds the run and dispatches its stages, and your stage's result lands whenever the worker finishes. (Blocking, "required" stages are intentionally out of scope in this design — there is no way for a custom stage to stall a run.)

Echo a **completion ack** once the work is durably done so the orchestrator can mark the operation resolved. Publish the `WorkflowRun` back to `kcloud-workflows-queue` with its `operation` set to your stage and your output in the channel your stage uses — `results.<operation>` for a self-persisting stage, or `payload` for a [delegated-ingest](#delegated-ingest) one; the engine records it on the run (`workflow_runs`) and uses it to evaluate any conditional fan-in (see [Conditional routing](#conditional-routing)). For an own-collection stage the result bag is just the "done" signal.

**Run finalization.** The engine tracks two tiers on every run — the operations it has *dispatched* and the ones that have *resolved*. When the resolved set covers the dispatched set (the run's frontier is empty — every stage it fired has come back), the engine stamps the run's `end` in `workflow_runs`. A run that opens without dispatching any stage finalizes immediately; one still waiting on a stage that never returns finalizes anyway after a **15-minute** safety timeout, so a crashed worker can't wedge a run open forever. Finalization is idempotent — a run already carrying an `end` is never re-stamped.

## Failure modes & gotchas

- **Queue with no consumer.** Enabling a stage deploys its worker alongside the registry entry, so the old register-but-forget-to-deploy drift is gone. Messages can still pile up on `kcloud-<id>-queue.fifo` if that worker is scaled to zero, crash-looping, or the stage's `queue` points at an externally-managed consumer that isn't running.
- **No completion ack.** A worker that writes its result but never echoes the run back to the orchestrator (`kcloud-workflows-queue`) leaves the operation unresolved on the run. Harmless to the run (stages are async), but it breaks provenance and lets a re-analysis repeat the work. Always ack.
- **Re-decode cost.** A stage that re-fetches and re-decodes the video pays that cost per recording; reuse data already in the run (`inputs`/`results`) or the database where you can.
- **Non-idempotent writes.** Redelivery will duplicate output unless you upsert on a stable key.

## Checklist

- [ ] Pick a unique **operation id** — it's the stage key and the completion key
- [ ] Set the stage's **`queue`** (or let it default to `kcloud-<id>-queue.fifo`) — your worker consumes the same value
- [ ] Define the stage under `kerberoshub.workflows.stages.<id>` with `enabled: true` and `dispatch: always` — one block deploys the worker and registers it
- [ ] Consume the **`WorkflowRun`**, resolve the recording from `key`, fetch media with the **storage credentials** in `storage`
- [ ] Write your result to your **own collection** keyed by the recording (self-persist), **or** declare a `kind` and return your typed body in `payload` for the platform to ingest ([delegated ingest](#delegated-ingest))
- [ ] **Idempotent** writes (upsert by recording + run id)
- [ ] Echo a **completion ack** to `kcloud-workflows-queue` (the orchestrator) with `operation` set
- [ ] (Optional) gate per-recording with `dispatch: conditional` + a `needs` list of `{ operation, condition }` upstreams
