---
title: "Workflows"
description: "Design and chain nodes to customise the Hub pipeline."
lead: "Design and chain nodes to customise the Hub pipeline."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 304.5
toc: true
---

The [Pipeline]({{< relref "/docs/hub/pipeline" >}}) section describes the fixed chain of microservices that every recording flows through by default. **Workflows** build on top of that pipeline and let each user *customise* how their own events are routed, filtered and processed — without changing a single line of code or touching the platform configuration.

Where the pipeline is the same for everyone, a workflow is yours: pick the cameras you care about, decide which AI model should look at the frames, when it should be active and how often it should run.

## Why workflows?

The default Hub pipeline is intentionally opinionated: a recording arrives from an Agent, is classified, throttled and turned into a notification. That's a great starting point, but real deployments have very different needs:

- A retail store only needs people detection during opening hours.
- A logistics site wants vehicle detection on the parking camera, but a no-helmet model on the warehouse camera.
- A control room wants high-frequency anomaly detection on a few critical cameras, and a low-frequency throttle on the rest to keep costs down.
- A reception desk wants to chain models: first run person detection on the camera, and only when a person is found, pass those frames to face recognition — saving the heavier model from running on empty scenes.
- A parking lot wants to detect vehicles first, and only forward those frames to a heavier speed-estimation model — avoiding wasted inference on empty asphalt.

Workflows expose the pipeline's moving parts as a small, visual graph of nodes so a non-developer can express exactly that — per camera, per time window, per use-case.

## Concepts

A workflow is a directed graph of **nodes** connected through **ports** with **edges**. A *node* is the building element you drag onto the canvas — a device, a model or a filter. Every workflow has a name, an optional description, an enabled/disabled toggle and a freely arrangeable canvas of nodes.

### Nodes

Each node has one or more typed input/output ports and exposes its own configuration directly inside it. The current node library contains:

| Node | Role | Configuration |
|-------|------|----------------|
| **Device** | The source of events — a camera or sensor that feeds the workflow. | Pick one device from the dropdown (front door, parking, warehouse, …). |
| **ML Model** | A machine-learning model that processes incoming frames or events. | Pick one model: person/vehicle detection (YOLOv8), face recognition, anomaly detector, pose estimation, … |
| **Throttle** | Limits the rate of events flowing through the workflow. | Pick a rate: 1/5/10 fps, or 1 frame every 5/30/60 seconds. |
| **Active window** | Only lets events through when they fall inside a date/time window and on selected weekdays. | Pick a start & end datetime and tick the active weekdays (Mon–Sun). |

A device node has only outputs, a model node has only inputs, and the throttle/active-window nodes sit in between with one input and one output. This guarantees that a valid workflow always reads as **device → (filters) → model**.

### Edges

Edges connect an *output port* of one node to an *input port* of another. They define how events flow from a device, through any number of throttle and active-window nodes, into one or more models.

### Workflow status

A workflow can be **enabled** or **disabled** with a single switch in the list view. Disabled workflows are kept on the user's account but no longer dispatch events through the pipeline — handy for seasonal automations or while iterating on a design.

## The Workflows page

The **Workflows** page in Hub (`/workflows`) gives every user a personal collection of automations.

The page shows a searchable list of *My Workflows* with — for each entry — its enabled state, name, description and a summary of how many nodes and connections it contains. From there you can:

- **Add Workflow** — opens the workflow editor in a modal to design a brand-new flow from an empty canvas.
- **Edit** (pen icon) — re-opens an existing workflow in the editor.
- **Enable / disable** (slider) — toggles the workflow on or off without opening the editor.
- **Delete** (trash icon) — permanently removes the workflow after a confirmation prompt.

Use the search box at the top to filter the list by name when your collection grows.

## Building a workflow

Creating a workflow is a three-step process:

1. **Name it.** Click *Add Workflow* and give the workflow a clear name and (optionally) a description. The name is what you'll see back in the list and in pipeline logs.
2. **Drag in your nodes.** From the node library, drop a *Device*, an *ML Model* and as many *Throttle* / *Active window* nodes as you need onto the canvas. Configure each node in-place via its dropdown, datetime pickers or weekday selector.
3. **Wire them up.** Drag from a node's output port to another node's input port to create an edge. A typical workflow looks like:

   ```
   Device  ──►  Active window  ──►  Throttle  ──►  ML Model
   ```

When you're happy, hit *Save changes* (or *Add Workflow* for a new one) and flip the slider on. The workflow is now live and starts shaping how events from that device reach the rest of the Hub pipeline.

## Examples

A few starting points to give an idea of what's possible:

- **People counting during opening hours.** *Device: Camera — Reception → Active window: Mon–Sat, 08:00–18:00 → ML Model: YOLOv8 — Person detection.*
- **Cost-optimised monitoring overnight.** *Device: Camera — Warehouse → Throttle: 1 frame every 30 seconds → ML Model: Anomaly detector.*
- **Vehicle speed estimation on the parking lot.** *Device: Camera — Parking lot → Throttle: 5 fps → ML Model: Speed estimator.*

## Relationship with the fixed pipeline

Workflows do not replace the Hub [Pipeline]({{< relref "/docs/hub/pipeline" >}}); they steer it. The pipeline microservices (sequence, analysis, throttler, notification, classifier, …) keep doing their job for every recording. What a workflow does is to declare, per user and per device, *which* of those services should run, *when* they should run and *with which* configuration — turning a one-size-fits-all pipeline into something each user can tailor to their own use-case.

## Bring your own processing

The nodes above are the **no-code** side of workflows. If you want a workflow to run *your own* service — a custom model, a speed estimator, any processing step, in any language — that is the **developer** side of the same system. A **stage** is a step in a workflow; you implement it as a **microservice**.

See **[Stages](stages/)** for the contract your microservice codes against: the queue it consumes, the `WorkflowRun` envelope it receives, how it hands a result back, and how to register the stage from the Helm chart so the engine routes recordings to it.

Your microservice hands its result back as a **block envelope** — a small JSON list of typed *blocks* (a detection, a marker, …), set on the run's `payload`. The **[Ingest](ingest/)** core is the shared layer on the platform side that receives it — from either the queue or the API — and runs the right actions for each block's type: validate it, store it, and trigger any follow-up side-effects.

A workflow does not have to wait for a recording to flow through the pipeline: **[Triggers](triggers/)** specs how a workflow is *activated* — automatically by analysis on every matching recording, or **manually** on demand from a surface such as a [case](../cases/), where a user runs a chosen workflow over the media they selected.

When something doesn't behave, **[Observability](observability/)** documents the structured log lines and distributed trace the workflows engine emits for every run — so a deployer can see why a recording did or did not reach a stage, and send us logs precise enough to act on.

## Defining a workflow in configuration

Everything above is authored **in the editor** — a personal, per-user workflow (`source: user`). A deployment can also ship workflows as **configuration**: `source: config` workflows defined in the Helm chart under `kerberoshub.workflows.definitions`. These are deployment-global, ops-managed and read-only in the API — the *same workflow object* (a name, an enabled toggle, triggers and a set of stages), expressed as chart values instead of canvas nodes.

`definitions` is the engine's **single routing source** (rendered to the `WORKFLOW_DEFINITIONS` env), a **map keyed by workflow name**. Each workflow is one key: an `enabled` toggle, its `triggers` and its `stages`. Every stage pairs with a **worker deployment** under `kerberoshub.services.<operation>` — the microservice that consumes the stage's queue (taken from `services.<operation>.queue`, never set on the stage). Those per-stage fields and the worker itself are the subject of [Stages](stages/#registering-a-stage). Because it's a map, one deployment can also define **several** workflows at once — each opens its own run over a recording and dispatches only its own stages — but a single workflow is the common case.

> **It's the engine switch, not the front-end one.** The workflows engine is off by default; set `kerberoshub.workflows.enabled: true` to run it. Don't confuse it with the unrelated `kerberoshub.…features.workflows.enabled` front-end feature flag.

**Workflow definition — `kerberoshub.workflows.definitions.<workflow>`**

| Field | Required | Value | What it does |
|---|---|---|---|
| `enabled` | yes | bool | Include this workflow. Off = the engine doesn't run it. |
| `triggers` | no | list | How a run **opens** — omit for one bare automatic trigger (every recording), or narrow by device/schedule. See [Triggers](triggers/). |
| `stages` | yes | list | The workflow's stage entries — each an `operation` plus its dispatch rule. The per-stage fields and the worker that runs them live in [Stages](stages/#registering-a-stage). |

(The chart renders each definition's `source` as `config` — a Helm-seeded, deployment-global, ops-managed workflow that is read-only in the API; you don't set it.)

### Example

A workflow and its worker in `values.yaml`, annotated with **every** value they accept — nothing here is required beyond a stage's `operation` inside an `enabled` workflow, so treat the rest as a lookup. `services.workflows` is the odd one out: it is the engine, so it has **no `enabled`** (the `workflows.enabled` master switch already gates it) and its `queue` is the engine's *inbound* queue — the one analysis tees runs onto — not a stage queue. Every other `services.<operation>` is a stage worker with its own `enabled` and its own queue. Defining **more** workflows is simply another `definitions` key: each opens its own independent run over a recording — one recording, one run per workflow.

```yaml
# values.yaml — every value a config workflow + its worker accept
kerberoshub:
  workflows:
    enabled: true
    definitions:
      full-workflow:                     # map key = workflow name (its identity)
        enabled: true                    # false ⇒ the whole workflow is skipped

        # triggers — how a run OPENS (passed through verbatim). Omit the whole
        # block for one bare automatic trigger (opens for every recording).
        triggers:
          - type: automatic              # automatic | manual
            devices:                     # limit to these cameras (omit = all)
              - { key: front-gate, name: "Front gate" }
            weeklySchedule:              # only within these windows (omit = always)
              - day: 1                   # 0=Sun … 6=Sat
                enabled: true
                timezone: "Europe/Brussels"
                segments:
                  - { start: 32400, end: 61200 }   # seconds since midnight (09:00–17:00)
          - type: manual                 # user-launched from a surface
            surfaces: [case, media]      # where the manual button appears: case | media

        # stages — the executable steps. Routing only; the queue is NOT set here.
        stages:
          - operation: speed             # unique within the workflow
            dispatch: conditional        # always (default) | conditional
            needsMode: all               # any (default) | all — how needs combine
            needs:                        # conditional stages only
              - operation: classify      # gate: wait until this op is on the run ("" = ungated)
                condition:               # omit ⇒ fire on the gate's presence alone
                  path: inputs.classify.details.*.classified   # absolute run path; * fans out arrays
                  op: eq                 # eq | ne | gt | gte | lt | lte | contains | in | exists
                  value: car             # operand (ignored for `exists`)

  services:
    # the engine (orchestrator) — no `enabled`; runs whenever workflows.enabled is true
    workflows:
      repository: ghcr.io/uug-ai/hub-workflows
      tag: "v1.0.0"
      queue: "hub-workflows-queue"       # the engine's OWN inbound queue (WORKFLOWS_QUEUE)
      replicas: 1
      logLevel: info
      resources:
        requests: { cpu: 10m, memory: 10Mi }

    # the stage worker — keyed by the stage's operation id
    speed:
      enabled: true                      # deploy the pod
      repository: ghcr.io/acme/speed
      tag: "v1.0.0"
      pullPolicy: IfNotPresent           # IfNotPresent | Always | Never
      queue: "hub-workflows-speed"       # engine dispatches here; worker consumes here
      replicas: 2
      logLevel: info                     # trace | debug | info | warn | error
      resources:
        requests: { cpu: 100m, memory: 128Mi }
        limits:   { cpu: "1",  memory: 512Mi }
      env:                               # extra env, verbatim (per-stage tuning)
        SPEED_THRESHOLD: "50"
      topologySpreadConstraints: []      # standard optional Deployment extras
      volumes: []
      volumeMounts: []
```

The stage's own fields (`operation`, `dispatch`, `needs`, `needsMode`) and the worker's deployment fields are documented in **[Stages](stages/#registering-a-stage)**; how a run *opens* from `triggers` is **[Triggers](triggers/)**.

## Glossary

A quick reference to the vocabulary used across Workflows. The terms split into what you wire on the **canvas** (no-code) and what runs **behind a custom stage** (developer).

**On the canvas**

| Term | Meaning |
|------|---------|
| **Workflow** | A directed graph that customises how one device's events are routed, filtered and processed — enabled or disabled per user. |
| **Node** | A building element you drag onto the canvas: a *Device*, *ML Model*, *Throttle* or *Active window*. See [Nodes](#nodes). |
| **Port** | A typed input/output connection point on a node. |
| **Edge** | A connection from one node's output port to another's input port — it defines how events flow. |

**Behind a custom stage**

| Term | Meaning |
|------|---------|
| **Stage** | A step in a workflow — built-in or your own. The *concept*. See [Stages](stages/). |
| **Operation** | A stage's unique *id*: the value the engine routes on, files its result under (`results.<operation>`) and that other stages gate on. Defaults to the stage name. See [Stages](stages/#registering-a-stage). |
| **Microservice** | The *implementation* of a stage: a service that consumes a message, does one job and returns a result, in any language. |
| **WorkflowRun** | The event a stage receives off the queue — the run it processes and hands a result back for. |
| **Block** | One typed unit of a result: a `type` (`detection`, `marker`, …) plus a `data` body in that type's shape. See [Blocks](ingest/blocks/). |
| **Block envelope** | The ordered list of blocks a microservice hands back, set on the run's `payload`. See [Ingest](ingest/). |
| **Ingest core** | The shared platform layer that receives the envelope and runs each block type's ordered, idempotent actions — validate, store, side-effects. |
| **Conditional routing** | Branching a workflow on an earlier stage's result, so a stage runs only when an upstream result matches. See [Conditional routing](stages/#conditional-routing). |

Two layers, two words: on the **canvas** you wire **nodes**; behind a **stage** a microservice returns **blocks**. They live in different parts of the system — *node* for the thing you drag, *block* for a stage's typed output — so there's no overlap to trip over.
