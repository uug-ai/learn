---
title: "Triggers"
description: "How a workflow is activated — automatically by the pipeline, or manually from a surface such as a case."
lead: "How a workflow is activated: automatically by the pipeline on every matching recording, or manually on demand from a case."
date: 2026-07-06T00:00:00+00:00
lastmod: 2026-07-06T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "workflows"
weight: 20
toc: true
---

{{< callout type="warning" >}}
This page describes on-demand (manual) workflow triggers. The **data model** —
the trigger list, a run's `origin`/`sourceRef` and its per-run `runId` — has
landed in `models`; the **launch path** that drives it (the engine, `hub-api`
and the frontend) is still being built, so parts below describe the design those
are being built towards.
{{< /callout >}}

## Two ways a workflow activates

Every [workflow](../) is a graph of stages, but *what makes it run* is its
**trigger**. There are two fundamentally different activation modes:

| Mode | Who starts it | Scope | Example |
|------|---------------|-------|---------|
| **Automatic** | The pipeline itself — analysis tees each classified recording to the engine. | Every recording that matches the trigger's device selection and time window. | Run loitering detection on the warehouse camera, Mon–Fri 18:00–06:00. |
| **Manual** | A user, from a surface in the Hub UI (a case, a media page, …). | Exactly the media the user selected, on demand. | On a case, press *Run* to send all selected recordings through a pose-detection workflow. |

Automatic is what Workflows ship with today. Manual triggering is the new mode
this page describes — the same engine and stages, but a run is opened because a
**user asked for it on specific media**. Both modes converge on the same queue,
engine and stages; only the *origin* of the run differs.

```mermaid
flowchart LR
    subgraph automatic["Automatic — pipeline-teed"]
        R["Recording"] --> AN["hub-pipeline-analysis"]
    end
    subgraph manual["Manual — user-launched"]
        U["User on a case"] --> API["hub-api"]
    end
    AN -->|"tees every match"| Q[["workflows queue"]]
    API -->|"fan out one seed<br/>per selected media"| Q
    Q --> ENG["Workflows engine"]
    ENG --> ST["Dispatch the run's stages"]
```

## The trigger model

A trigger's *mode* is a property of the trigger, so one workflow can be **both**
automatically scheduled and manually runnable. A workflow therefore carries a
**list** of triggers — each tagged with a type, and for manual ones the surfaces
that expose it.

```go
type WorkflowTrigger struct {
    Type WorkflowTriggerType // "automatic" | "manual"

    // automatic: which devices, and when — reusing the alert/videowall
    // device picker and weekly-schedule shapes (each entry carries its own
    // day, time segments and IANA timezone; weekday 0 = Sunday).
    Devices        []DeviceKey
    WeeklySchedule []*WeeklySchedule

    // manual: which surfaces show the "Run" control ("case", "media", …)
    Surfaces []WorkflowTriggerSurface
}

type Workflow struct {
    // …
    Triggers []WorkflowTrigger // a workflow can be both automatic and manual

    // Deprecated: the legacy single, automatic-only trigger. Kept so
    // workflows saved before Triggers existed still decode; NormalizeTriggers
    // folds it into Triggers so callers only reason about the list.
    Trigger *WorkflowTrigger
}
```

The model now carries a **list** of triggers, each tagged with a `Type` and —
for manual ones — the `Surfaces` that expose it, so both modes coexist on one
workflow. The original single `Trigger` is retained as a deprecated field for
backwards compatibility and folded into `Triggers` by `NormalizeTriggers`, so
new code only ever reads and writes the list. Automatic scoping reuses the same
`DeviceKey` selection and `WeeklySchedule` shapes as the alert/videowall
schedules, so the same device pickers, weekly-schedule editor and weekday/
timezone conventions apply.

**Definition vs. run.** The trigger type lives on the `Workflow` — authoring
metadata ("this can be run manually from a case"). How a *specific* run was opened
lives on the `WorkflowRun` as its **origin** (`automatic` / `manual`) plus a
`sourceRef` such as the case id. The engine uses the origin to skip automatic
gating for on-demand runs and to attribute them to their source.

## Named workflows and run identity

Manual (and repeated) runs rest on two capabilities, and both now exist on
`WorkflowRun` in the model:

- **Run a specific workflow.** A run carries the **`workflowId`** of the
  workflow whose stages it executes, rather than every globally-registered
  stage. The engine reads the authored workflow definitions and fans one
  recording out into a run per matching workflow, stamping each run's
  `workflowId` so it dispatches only that workflow's stages.
- **Give each run its own identity.** Each run carries a **`runId`** — the hex
  of its run-document id, projected onto the wire automatically (a producer only
  ever stamps the id) and echoed back by every stage — so the engine ties a
  stage's result to the right run. The media key stays on the run, but it is no
  longer the identity, so one recording can carry several runs at once.

With a per-run `runId`, one recording can carry several independent runs at once
— its automatic analysis run and any manually-triggered workflows, re-runs
included:

```mermaid
flowchart LR
    K["Recording k1"] --> RA["Automatic run<br/>origin: automatic"]
    K --> RB["Manual run · pose-workflow<br/>origin: manual · case-42"]
    K --> RC["Manual re-run · pose-workflow<br/>origin: manual · case-42"]
```

The media key stays on every run, so *"all runs for a recording"* is still a
simple lookup by key — it now returns the whole list, filterable by workflow,
origin or source case.

### What a run message carries

Whatever opened it, a run travels the whole workflow tail as **one**
`WorkflowRun` message (JSON on the queue, the same shape persisted as the run
document). These are the fields a reader can expect to see on the wire:

| Field | Meaning |
|-------|---------|
| `operation` | The message's role: `"event"` for the analysis hand-off that opens a run, or the stage id for a dispatch/result hop. |
| `runId` | The run's wire identity — the hex of its document id. Empty on the analysis hand-off (keyed by `key` until the engine opens it), set on every hop after. |
| `workflowId` / `workflowName` | Which workflow the run executes. Empty on the analysis hand-off (one recording tees a single `event`); the engine assigns them as it fans that event out into a run per matching workflow definition. |
| `origin` | How the run was opened: `automatic` (pipeline-teed) or `manual` (user-launched). |
| `sourceRef` | What a manual run was launched from — e.g. the case id — so siblings from one action group together. Empty for automatic runs. |
| `key` | The media key the run is about — its natural identity, copied from the recording at hand-off. |
| `traceId` | Continues the distributed trace across the tail. |
| `user` / `device` | Curated, secret-free account and recording context (org, storage block, device key/name). |
| `inputs` | The immutable start context, keyed by upstream operation (e.g. `classify` → the classification result). Set once at open. |
| `results` | Accumulated stage outputs, keyed by operation — each worker writes its result here on the way back. |
| `payload` | A delegated-ingest worker's block envelope (detection + marker blocks) for the platform to persist. Worker → engine only. |
| `storage` / `signedUrl` | Credentials / a signed URL to fetch the media, set only on the engine → worker dispatch hop. Never persisted. |

Credential-bearing fields (`storage`, `signedUrl`) and the curated projections
are wire-only and never land in run state; the run's stored progress (start/end,
dispatched/resolved operations) never appears on the queue.

## Manual trigger on a case

The first manual surface is the **case**. A user selects recordings on a
[case](../cases/), picks a workflow and presses *Run*. A run's natural unit is
one recording, so the trigger **fans out one `WorkflowRun` per selected media
key** — the same hand-off analysis makes automatically, just originated by the
user.

```mermaid
flowchart TD
    C["Case<br/>selected media: k1, k2, k3"]
    C -->|"POST /tasks/{id}/workflows<br/>{ workflowId, mediaKeys }"| API["hub-api"]
    API -->|"seed key = k1"| Q[["workflows queue"]]
    API -->|"seed key = k2"| Q
    API -->|"seed key = k3"| Q
    Q --> ENG["Workflows engine"]
    ENG -->|"open run · key k1"| S1["Dispatch workflow stages"]
    ENG -->|"open run · key k2"| S2["Dispatch workflow stages"]
    ENG -->|"open run · key k3"| S3["Dispatch workflow stages"]
```

Each seed carries the workflow to run, `origin: "manual"` and the case id
alongside the usual media key, signed URL and device context — reusing the
existing case-media enqueue pattern. Every run reports progress independently,
and its results — detection and marker [blocks](ingest/blocks/) — are mirrored
back onto the recording just like an automatic run's, so they appear on the
timeline and in the case.

The case "Run workflow" control is simply the list of workflows whose triggers
are manual and include the `case` surface, so adding one is a data change, not
code.

## Aggregating across recordings

{{< callout type="info" >}}
Forward-looking. This is a sketch of how workflows will reason across recordings;
the aggregation layer below is **not built yet**.
{{< /callout >}}

A run's unit is one recording, but some questions span several — *is someone
loitering across the last few clips from this camera?* The recordings that belong
together are the ones from the **same device**, in time order, so a run already
carries what's needed to find its neighbours: `Device.DeviceKey` and
`RecordingTimestamp`.

Rather than chain each run to the literal "previous" one (fragile with
out-of-order or delayed clips), consecutive recordings within a window share a
**`deviceSeriesId`** — `(deviceKey, org, time-bucket)`. This is the automatic,
temporal twin of the `sourceRef` that groups a manual case batch: a case groups
runs a user picked, a series groups runs from a camera over time.

State moves forward through the run's **`Inputs`**. When the engine opens a run
in a series, it folds a bounded, one-hop summary of the predecessor under a
dedicated key so a stage can compare "this clip" against "last clip" without
losing provenance:

```yaml
inputs:
  classify:            # this recording's own result
    detections: [...]
  previous:            # carried from the prior run in the series
    recordingKey: k4
    dwellByZone: { entrance: 42s }
```

```mermaid
flowchart LR
    P["Run · k4<br/>series S · settled"] -->|"summary → inputs.previous"| N["Run · k5<br/>series S"]
    N -->|"summary → inputs.previous"| M["Run · k6<br/>series S"]
```

Two rules keep this safe:

- **One hop, bounded.** Carry the predecessor's *summary* (dwell accumulators,
  presence intervals, re-id vectors), not raw detections and not the whole
  history — otherwise each run snowballs the entire series.
- **Populated by the engine, gated by the window.** `Inputs` is otherwise minted
  by the sender, but the predecessor lookup belongs to the engine, which owns the
  run collection. It only folds in a predecessor that is **settled** and inside
  the series window; a gap starts a fresh series.

True aggregation *stages* — one run whose input is many sibling runs — remain
deferred; this carry-forward is the lighter first step that covers running
detections like loitering.

## Where definitions live

Workflows have two layers:

| Layer | What it is | Owned by |
|-------|-----------|----------|
| **Stage catalog** | The available stages (`WorkflowStage`: image, queue, resources) — each maps to a deployed worker. | Ops (Helm) |
| **Workflow definitions** | Which stages run, wired and triggered how (`Workflow`). | Users (frontend), plus optional built-ins seeded at deploy |

A workflow is a graph over the deployed stage catalog — users compose existing
stages, they don't add new worker images. A built-in such as a `cases-workflow`
that runs pose detection is just a `Workflow` document seeded at deploy time, so
ops-provided and user-authored workflows run through the same path.

## Glossary

| Term | Meaning |
|------|---------|
| **Trigger** | What activates a workflow — `automatic` (pipeline-teed) or `manual` (user-launched from a surface). |
| **Surface** | Where a manual trigger appears in the UI (`case`, `media`, …). |
| **Origin** | How a specific run was opened (`automatic` / `manual`), with a `sourceRef` such as a case id. |
| **runId** | A run's identity, echoed by every stage so results find their run; lets one recording have many runs. |
| **Series (deviceSeriesId)** | Consecutive recordings from one device within a time window, grouped so a run can carry state forward from the previous one. |
