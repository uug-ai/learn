---
title: "Integrations"
description: "The developer side of Workflows — bring your own microservice into the Hub as a workflow stage that receives events, does work, and hands results back."
lead: "The developer side of Workflows: bring your own microservice into the Hub as a workflow stage — consume an event, do the work, and hand the result back, in any language."
date: 2026-06-04T00:00:00+00:00
lastmod: 2026-06-16T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "workflows"
weight: 10
toc: true
---

[Workflows](/docs/hub/workflows/) let you reshape the Hub pipeline without code — wire a device through a few filters into a model on a visual canvas. **Integrations** are the developer side of that same system: instead of choosing from the built-in blocks, you bring *your own* microservice in as a workflow stage. The engine is **open** — every built-in stage (classification, thumbnails, sprites) is just a service that consumes a message off a queue, does one job, and hands the result back — and your service plugs in the same way.

A **workflow stage** (an *integration*) is a worker the workflows engine triggers automatically for every recording: it **receives a run from a queue, does the work, and returns the result** — in whatever language suits the job, deployed and scaled on its own. Stages are **asynchronous**: they run alongside the built-in analysis and never block it.

This page is the **contract your worker codes against** — the queue it listens on, the message it receives, how it returns a result, and how the engine tracks it to completion. It is **capability-agnostic**: it never assumes *what* your stage does, so the same mechanism serves a licence-plate reader, a custom detector, or any other step. For a concrete capability built on it, see the pages under [Extend](../../extend/).

> **Status — rolling out.** The queue, envelope and completion mechanics here are already how the pipeline works internally. The config-driven **stage registration** (the `kerberoshub.workflows.stages` values block — see [Registering a stage](#registering-a-stage)) is the addition that lets a *custom* operation join without changing engine code — dispatched by the standalone **workflows engine** (`hub-workflows`), which runs alongside the **analysis service** and consumes the classify results it tees over. It is landing now for self-hosted deployments.
>
> This page covers how a worker *delivers* a result. For the complementary *receiving* side — one shared service that takes a result from either the API or the queue and runs the right actions for its kind — see [Ingest service](/docs/hub/pipeline/ingest-service/).

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
      "header": "PIPELINE", "title": "Analysis", "subtitle": "Built-ins · opens run", "groupId": "hub" },
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

## Registering a stage

You add a stage entirely in the chart's `values.yaml` — no engine code changes. A stage is **two halves that share one name** under `kerberoshub`, and both only take effect when the workflows engine is on (`kerberoshub.workflows.enabled: true`):

- the **workflow stage object** (`kerberoshub.workflows.stages.<name>`) — declares the stage and how the engine routes to it;
- the **service deployment** (`kerberoshub.services.<name>`) — deploys your worker.

Each half has its own `enabled`, so turn **both** on (plus the engine): routing with no worker queues messages nobody reads, and a worker with no routing never receives any.

The two blocks divide by concern. `kerberoshub.workflows` is the engine's **behaviour** — its `enabled` switch and the `stages` routing registry. `kerberoshub.services` holds the **deployments** of the whole workflows subsystem in one uniform shape: the engine itself (`services.workflows`, a chart default you don't normally touch) and one worker per stage (`services.<name>`). So adding a stage is always the same two edits — a routing entry under `workflows.stages`, and your worker under `services`.

```yaml
# values.yaml
kerberoshub:
  workflows:
    enabled: true                  # master switch: the workflows engine

    # ── the workflow stage object: declare + route ──────────────
    stages:
      anpr:                        # stage name (and default operation id)
        enabled: true              # route to this stage
        dispatch: conditional      # always | conditional
        # conditional only — see Conditional routing:
        needsMode: any             # any | all
        needs:
          - operation: classify
            condition: { path: inputs.classify.properties, op: contains, value: car }
        # kind: anpr               # only if you delegate persistence (see Sending a result back)

  # ── the deployments: the engine (chart default) + your worker ─
  services:
    # workflows: …                # the engine itself — a chart default; you don't set this here
    anpr:                          # same name as the stage object
      enabled: true                # deploy the worker
      repository: ghcr.io/acme/anpr
      tag: "v1.0.0"
      queue: "acme-anpr-jobs"      # the queue your worker consumes
      replicas: 1
      pullPolicy: IfNotPresent
      logLevel: info               # trace | debug | info | warn | error
      resources: {}
```

**Workflow stage object — `kerberoshub.workflows.stages.<name>`**

| Field | Required | Value | What you use it for |
|---|---|---|---|
| `enabled` | yes | bool | Route to the stage. Off = the engine doesn't know it exists. |
| `operation` | no | string | The stage's **operation id** — the key your result is filed under (`results.<operation>`) and that other stages depend on. Defaults to the stage name; set it only to differ from the key. |
| `dispatch` | no | `always` \| `conditional` | `always` (default) runs on every recording; `conditional` runs only when the recording matches — see [Conditional routing](#conditional-routing). |
| `needs` | conditional only | list | The match rule — see [Conditional routing](#conditional-routing). |
| `needsMode` | no | `any` \| `all` | How multiple `needs` combine — `any` (default) or `all`. |
| `kind` | no | string | Set **only** if your worker hands its result back for the platform to store; the value names the ingest handler (e.g. `anpr`). Leave it unset when your worker writes its own collection. See [Sending a result back](#sending-a-result-back). |

**Service deployment — `kerberoshub.services.<name>`**

A normal worker Deployment, keyed to the same name as the stage object. (The workflows engine itself is deployed from this same block as `services.workflows` — the one `services` entry with no matching stage, and a chart default you don't normally touch.)

| Field | Required | Value | What you use it for |
|---|---|---|---|
| `enabled` | yes | bool | Deploy the worker pod. Off = nothing runs. |
| `repository` | yes | string | Your worker's container image. |
| `tag` | yes | string | Image tag. |
| `queue` | yes | string | The queue your worker consumes; the engine dispatches to this exact name. See [Queue naming](#queue-naming). |
| `replicas` | no | int | Pod count. |
| `pullPolicy` | no | `IfNotPresent` \| `Always` \| … | Image pull policy. |
| `logLevel` | no | `trace`…`error` | Worker log verbosity. |
| `resources` | no | object | Standard pod requests/limits. |
| `topologySpreadConstraints`, `volumes`, `volumeMounts` | no | list | Standard optional Deployment extras. |

> **It's the engine switch, not the front-end one.** `kerberoshub.workflows.enabled` toggles the **workflows engine** that dispatches stages. Don't confuse it with the unrelated `kerberoshub.…features.workflows.enabled` front-end feature flag.

**Minimal stage.** The smallest live stage is `enabled: true` on both halves, the image + `queue` on the deployment, and `dispatch: always`. Everything else is additive — you can switch to conditional routing later without touching the rest.

## Conditional routing

By default (`dispatch: always`) a stage runs on **every** recording. Set `dispatch: conditional` to run it only on recordings that match a rule you declare in the stage object — handy when the deciding signal (e.g. *the classifier saw a car*) isn't known until the run is already underway. A conditional stage is never queued up front; the engine re-checks it as the run progresses and fires it the moment the rule holds. Recordings that never match never touch the stage.

The rule is a list of **`needs`** combined by **`needsMode`**:

```yaml
stages:
  anpr:
    enabled: true
    dispatch: conditional
    needsMode: any                 # any (default) | all
    needs:
      - operation: classify        # GATE — wait until this op is on the run
        condition:                 # PREDICATE — tested once the gate is ready
          path: inputs.classify.properties
          op: contains
          value: car
```

- **`operation`** — the **gate**: an upstream operation id whose result must be present on the run before this need is checked (e.g. `classify`, or another stage's id). Leave it **empty** to check the run with no gate — for `device` / `user` / identity rules that are known the moment the run opens.
- **`condition`** — the **predicate** tested once the gate is ready. Omit it to fire on the gate alone (i.e. "as soon as `classify` is present").
- **`needsMode`** — with more than one need: `any` (default) fires on the **first** satisfied need (OR); `all` fires only when **every** need is satisfied (AND — a join).

```yaml
# only on one camera, and only when a car was seen — both must hold
needsMode: all
needs:
  - operation: classify
    condition: { path: inputs.classify.properties, op: contains, value: car }
  - operation:                     # no gate — checked the moment the run opens
    condition: { path: device.deviceKey, op: eq, value: device02 }
```

### The condition object

A condition is `{ path, op, value }`.

**`path`** — a dot-path **relative to the `WorkflowRun`** your stage receives (the [envelope](#envelope)). It walks objects only and **cannot index into an array**. Valid roots:

| Root | Example | Notes |
|---|---|---|
| `inputs.<op>.<field>` | `inputs.classify.properties` | An upstream result. `classify` is always present (the trigger); its fields are `properties`, `objectCount`, `details` (`details` is an array — not reachable). |
| `results.<op>.<field>` | `results.anpr.plates` | A finished stage's output. Fields of your own custom operations are accepted as-is. |
| `device.<field>` | `device.deviceKey` | One of `deviceKey`, `deviceName`, `provider`, `storageSolution`. |
| `user.<field>` | `user.organisationId` | One of `id`, `organisationId`. |
| scalar | `key`, `operation`, `runId`, `traceId` | Top-level identity values (not traversable). |

Credentials (`storage`, `user.storage`) are deliberately **not** matchable.

**`op`** and **`value`** — the comparison and its operand:

| `op` | `value` | Matches when |
|---|---|---|
| `exists` | *(none)* | the `path` resolves to anything. |
| `eq` | scalar | the value equals `value` (numbers compared numerically). |
| `ne` | scalar | the value differs, or the `path` is absent. |
| `contains` | scalar | the value is an **array containing** `value`, **or** a **string containing** `value`. |
| `in` | list | the value **is one of** the entries in `value`. |
| `gt` / `gte` / `lt` / `lte` | number | the value is numerically `>` / `>=` / `<` / `<=` `value`. |

> `contains` and `in` are mirror images: use `contains` when the run holds a **list** and you test for a member (`inputs.classify.properties contains car`); use `in` when the run holds a **single value** and you test it against a set (`device.deviceKey in [device01, device02]`).

The engine validates every condition path at boot and refuses to start on an unknown one — a typo fails fast instead of silently never firing.

## How your worker connects

The chart deploys your worker from `kerberoshub.services.<name>` and injects a fixed set of environment variables — the **connection contract**. Whatever language your worker is in, it reads these to reach the broker, find its queues, and fetch media; nothing else is wired for it.

| Variable | Example | What it is |
|---|---|---|
| `QUEUE_SYSTEM` | `RABBITMQ` | The broker driver to connect with (the deployment's `queueProvider`). |
| `RABBITMQ_HOST` | `rabbitmq.rabbitmq:5672` | Broker address — with `RABBITMQ_EXCHANGE`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` completing the connection. |
| `<NAME>_QUEUE` | `ANPR_QUEUE` | The queue you **consume** dispatched runs from. The variable name is your stage's key upper-cased (hyphens become underscores — `my-stage` → `MY_STAGE_QUEUE`); its value is `services.<name>.queue`. See [Queue naming](#queue-naming). |
| `WORKFLOWS_QUEUE` | `kcloud-workflows-queue` | The engine queue you **publish the finished run** back to. See [Sending a result back](#sending-a-result-back). |
| `KERBEROS_STORAGE_URI` | `https://api.vault.example.com` | Global media-storage endpoint — with `KERBEROS_STORAGE_ACCESS_KEY` and `KERBEROS_STORAGE_SECRET`. Per-recording overrides also travel on each run's `storage`; prefer those when present. |
| `LOG_LEVEL` | `info` | Worker log verbosity (`services.<name>.logLevel`). |

Two things to note:

- **No datastore by default.** The stage-worker contract is broker + queues + media storage; the chart injects no database connection. A delegated stage hands its result back over `WORKFLOWS_QUEUE` for the platform to persist, while a stage that writes its [own collection](#sending-a-result-back) brings its own datastore access.
- **Deploying outside the chart.** To run the worker yourself, leave `services.<name>.enabled` off (so the chart deploys no pod) but keep the stage under `workflows.stages` so the engine still routes to it; then wire these same variables into your own deployment. The consume and return queue names are the only hard requirement.

## The message you receive

### Queue naming

Your worker consumes from **one** queue, and **you choose its name**. The source of truth is the `queue` value on your stage's deployment in the Helm chart — `kerberoshub.services.<name>.queue`:

```yaml
kerberoshub:
  services:
    anpr:
      queue: "acme-anpr-jobs"   # ← anything you want; your worker consumes this exact name
```

The engine reads that **same** value from the stage registry and dispatches there, so the only rule is that the two agree — the queue is the one thing that binds the engine to your worker. The name is an arbitrary string your broker accepts (`acme-anpr-jobs`, `lpr.requests`, `team7-detector`); it does **not** have to follow the platform's `kcloud-…` convention.

If you omit `queue`, the engine falls back to a derived default, `kcloud-<operation>-queue.fifo` — so the convention is just that fallback, not the source of truth. Queue names are literal strings: the default deployment runs RabbitMQ, so a `.fifo` suffix is only part of a name, not an SQS feature.

### Envelope

Your worker does **not** receive the pipeline's internal `PipelineEvent`. The engine dispatches a single, self-contained **`models.WorkflowRun`** as JSON: the run's identity, the read-only context your worker needs, and the credentials to fetch the media. Model your worker's input type on this — every field below is present on the inbound dispatch, and nothing else is:

```json
{
  "operation": "anpr",
  "runId": "665f1b2c3d4e5f6071829304",
  "key": "front-gate/2026/06/12/08-30-00.mp4",
  "traceId": "8f3a1c2b4d5e6f70",
  "user": {
    "organisationId": "64f0a1b2c3d4e5f600112233",
    "storage": { "uri": "s3://kerberos-vault", "access_key": "AKIA…", "provider": "kerberos-vault", "secret_key": "…" }
  },
  "device": {
    "deviceKey": "front-gate",
    "deviceName": "Front Gate",
    "provider": "kerberos-vault",
    "storageSolution": "vault"
  },
  "inputs": {
    "classify": {
      "properties": ["car", "person"],
      "objectCount": 2,
      "details": [{ "classified": "car", "distance": 142.6, "isStatic": false }]
    }
  },
  "results": {},
  "storage": {
    "uri": "s3://kerberos-storage",
    "accessKey": "AKIA…",
    "secret": "…",
    "vaultOverrideUri": "s3://tenant-bucket",
    "vaultOverrideAccessKey": "AKIA…",
    "vaultOverrideSecret": "…",
    "vaultOverrideProvider": "kerberos-vault"
  }
}
```

**Top-level fields**

| Field | Type | What it is |
|---|---|---|
| `operation` | string | Your stage's **operation id** (the name you registered, e.g. `anpr`). It is also the key you file your result under on the way back (`results.<operation>`). |
| `runId` | string | The run's unique id. Use it as your **idempotency key** — a redelivery carries the same `runId`. |
| `key` | string | The **recording reference** (media key) the run is about. Resolve *which* recording to fetch from this. |
| `traceId` | string | Distributed-trace id; propagate it on your logs/spans so the run stays traceable end-to-end. |
| `user` | object | Curated, secret-free **account context** — see below. |
| `device` | object | The recording's **device context** — see below. |
| `inputs` | object | The run's **immutable start context**, keyed by the upstream operation that produced it — see below. Read-only. |
| `results` | object | **Accumulated upstream stage outputs**, keyed by operation (e.g. `results.detection`). Empty if your stage runs first. Read-only inbound; on return, `results.<operation>` carries your result — filled by the engine from your `payload` (delegated) or set by you (own collection). |
| `storage` | object | The **credentials to fetch the media** — see below. Present **only** on the inbound dispatch; clear it before returning the run. |

> `payload`, `workflowId` and `workflowName` are **not** sent inbound. `payload` is the channel *you* fill on the way back (delegated-ingest stages only); `workflowId` / `workflowName` are engine-internal.

**`user` — account context**

| Field | Type | What it is |
|---|---|---|
| `user.organisationId` | string | The organisation that owns the recording. The run, and everything derived from it, is scoped to this id — scope your own writes to it too. |
| `user.storage` | object | The account's storage block, carried so the *engine* can resolve a per-recording vault override. You normally don't need it — fetch media with the top-level `storage`. |
| `user.storage.uri` | string | Account storage endpoint. |
| `user.storage.access_key` | string | Account storage access key. |
| `user.storage.provider` | string | Account storage provider. |
| `user.storage.secret_key` | string | Account storage secret. |

(`user.storage` uses **snake_case** keys — it is the account `Storage` block. The media-fetch `storage` below uses camelCase.)

**`device` — recording context**

| Field | Type | What it is |
|---|---|---|
| `device.deviceKey` | string | Stable id of the camera/device the recording came from. |
| `device.deviceName` | string | Human-readable device name (for logs/labels). |
| `device.provider` | string | Where the media is **served** from (the media `VideoProvider`). |
| `device.storageSolution` | string | Where the media is **stored** (the media `StorageSolution`). |

**`inputs.classify` — the trigger result**

`inputs` is keyed by upstream operation. Every run opens from the classifier, so `inputs.classify` is always present — it is the classification result that triggered the run:

| Field | Type | What it is |
|---|---|---|
| `inputs.classify.properties` | string[] | Flat list of the detected class strings, e.g. `["car","person"]`. Gate on it with `contains` / `in` / `exists`. |
| `inputs.classify.objectCount` | int | Number of detected objects. Gate on it numerically (`gt` / `gte` / `lt` / `lte` / `eq`). |
| `inputs.classify.details` | object[] | Per-object detail — each entry carries `classified` (the class), `distance`, `isStatic` and trajectory/frame geometry. It is an **array**, so a condition `path` can't index into it: read it in worker code, but gate on `properties` / `objectCount`. |

**`storage` — media-fetch credentials**

The credentials your worker uses to fetch the recording. The base trio is always set; the `vaultOverride*` quartet appears when the recording lives on its own (per-tenant) backend — **prefer the override when present**, otherwise use the base.

| Field | Type | What it is |
|---|---|---|
| `storage.uri` | string | Base storage endpoint. |
| `storage.accessKey` | string | Base storage access key. |
| `storage.secret` | string | Base storage secret. |
| `storage.vaultOverrideUri` | string | Per-recording override endpoint (when set). |
| `storage.vaultOverrideAccessKey` | string | Override access key. |
| `storage.vaultOverrideSecret` | string | Override secret. |
| `storage.vaultOverrideProvider` | string | Override provider. |

`inputs` and `results` are your **read-only upstream context** — the same bags the condition matcher evaluates `needs` against. The engine routes purely by `operation` and the registry; it never inspects your output to decide where the run goes.

### Acknowledgement

The broker delivers at least once. Acknowledge a message only **after** the work is durably done (result written or routed back); on failure, let it nack so the broker can redeliver. Because redelivery is possible, **make your stage idempotent** — key your output by the recording (`key`) and the run (`runId`) so a replay replaces rather than duplicates.

## Doing the work

Your worker is a stateless consumer: pull a run, fetch the media with the credentials in `storage`, compute, route the result back. It can be written in any language that can speak the broker and the `WorkflowRun` JSON — the only contract is the queue it reads and the run it returns. Reuse the context already on the run (`inputs` / `results`) rather than re-fetching it. Keep it single-purpose; if you need a second capability, add a second stage.

## Sending a result back

You return the **same `WorkflowRun` you received** — echo `runId`, `key`, `traceId` and `user` so the engine can locate and scope the run — with `storage` cleared and your result in **exactly one** channel. Publish it back to the engine's queue (`WORKFLOWS_QUEUE`, default `kcloud-workflows-queue`); the engine records the operation resolved and fires any conditional stage that was waiting on it.

There are **two sinks**. Default to letting the platform persist your result — hand it back and an ingest handler stores it, so your worker needs no datastore of its own. A stage that produces genuinely *new* data can instead own its storage and write its own collection.

### Enrich in place

The **default sink**: declare an ingest **`kind`** on the stage and hand the typed body back in `payload` — e.g. a `PostDetectionsRequest` for `kind: detection`, a `PostANPRRequest` for `kind: anpr`. The engine runs that kind's [Ingest service](/docs/hub/pipeline/ingest-service/) actions against the run's own recording and mirrors the decoded result into `results` so downstream conditions can read it. Because the engine owns the write, your worker needs no database access. Set `payload` **or** `results[operation]`, never both. (A *built-in* analysis stage without a `kind` instead falls back to a generic `$set data.<operation>` on the analysis document — the handler-less default; a registry-driven workflow stage always uses `results` / `payload`.)

### Own collection

For genuinely *new, standalone* data — detections, descriptions, embeddings — a stage can write its **own collection, keyed by the recording**, and set only its routing values under `results.<operation>` on the returned run (leave `payload` empty). The platform just records the resolution; your worker owns the write, and so brings its own datastore access. This is how [detections](../../extend/detections/) deliver their runs — see that page for a worked example.

> The difference between the sinks is only *who writes the result* — the engine through an ingest `kind`, or your worker into its own collection. Either way the engine marks the operation resolved when your run comes back.

## Completion and acknowledgement

Every custom stage is **asynchronous**: nothing blocks on it. The analysis service's built-in pipeline continues independently, the workflows engine tracks the stage's run on its own, and your stage's result lands whenever the worker finishes. (Blocking, "required" stages are intentionally out of scope in this design — there is no way for a custom stage to stall a run.)

Whichever [sink](#sending-a-result-back) you use, your worker routes the run back to the workflows engine — its `WORKFLOWS_QUEUE` — once the work is durably done. The engine records the operation on the run (`$addToSet resolvedoperations`), which keeps the run's provenance complete and stops a re-run from redoing the work. An own-collection stage's returned run carries just its routing values under `results.<operation>`; a delegated stage carries the typed `payload`. A run that never hears back from a stage still completes on the engine's own rules (with a safety timeout as a backstop), so a crashed worker can't wedge the pipeline.

## Failure modes & gotchas

- **Routing without a worker (or vice-versa).** The two `enabled` flags are independent: routing (`workflows.stages.<name>.enabled`) with no worker queues messages no one consumes; a worker (`services.<name>.enabled`) with no routing never receives any. Keep them enabled together — they share the stage name, so they always address the same queue.
- **No completion ack.** A worker that writes its result but never echoes back to the workflows engine (`WORKFLOWS_QUEUE`) leaves the operation absent from `resolvedoperations`. Harmless to the run (stages are async), but it breaks provenance and lets a re-run repeat the work. Always ack.
- **Re-decode cost.** A stage that re-fetches and re-decodes the video pays that cost per recording; reuse data already in the envelope or the database where you can.
- **Non-idempotent writes.** Redelivery will duplicate output unless you upsert on a stable key.

## Checklist

- [ ] Pick a unique **operation id** — it's the routing key, the result key (`results.<id>`) and the completion key (the queue is whatever you set in `services.<id>.queue`)
- [ ] Add **routing** under `kerberoshub.workflows.stages.<id>` (`enabled: true`, `dispatch: always`) and **deployment** under `kerberoshub.services.<id>` (`enabled: true`, image + `queue`)
- [ ] Make sure the **workflows engine** is enabled (`kerberoshub.workflows.enabled`)
- [ ] Consume the dispatched **`WorkflowRun`**, resolve the recording from `key`, fetch media with the credentials in `storage`
- [ ] Read upstream context from `inputs` / `results` instead of re-fetching it
- [ ] Pick a **sink** — enrich in place (set `payload` + a `kind`, the default) or your own collection (set `results.<id>`)
- [ ] **Idempotent** writes (upsert by `key` + `runId`)
- [ ] Route the run back to the workflows engine (`WORKFLOWS_QUEUE`) with `storage` cleared and your result in one channel
- [ ] (Optional) gate per-recording with `dispatch: conditional` + `needs` + `needsMode`
