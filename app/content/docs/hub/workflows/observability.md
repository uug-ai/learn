---
title: "Observability"
description: "How the workflows engine logs and traces a run — the structured log lines it emits, their fields and severities, and how to follow a single recording end-to-end so you can troubleshoot or send us accurate logs."
lead: "Follow a run end-to-end: the structured log lines the workflows engine emits, their fields and severities, and the distributed trace that ties them together — so a deployer can tell at a glance why a recording did or did not reach a stage."
date: 2026-06-24T00:00:00+00:00
lastmod: 2026-06-24T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "workflows"
weight: 30
toc: true
---

[Stages](/docs/hub/workflows/stages/) is the contract a microservice codes against; [Ingest](/docs/hub/workflows/ingest/) is how a result is stored. This page is for whoever **runs** the platform: it documents what the **workflows engine** (`hub-workflows`) writes to its logs and traces as it drives a run, so you can answer the questions that come up in practice — *did this recording open a run? did it reach a stage? why not? did a stage time out?* — and so the logs you forward to us are precise enough to act on.

The engine is deliberately chatty about its **routing decisions**: every run leaves a trace from the moment it opens to the moment it finalizes, even when it dispatches **no** stage at all. That is the case that used to be invisible ("a run was created but never reached a stage") and is now explicit.

## Where the logs come from

All of the lines below are emitted by the standalone **`hub-workflows`** engine — the service that consumes the classify hand-off, dispatches stages and tracks runs to completion. It is separate from your stage microservices, which log on their own (`services.<name>.logLevel`).

- **Format** — structured **JSON**, one object per line, written to **stdout** (collect it with your platform's normal pod-log pipeline; `kubectl logs deploy/hub-workflows`).
- **Verbosity** — the `LOG_LEVEL` environment variable. Recognised values are **`error`** and **`debug`**; anything else (including unset) means **`info`**. `info` shows the full run lifecycle and routing outcomes plus all warnings and errors; `debug` adds the per-stage condition explanations; `error` suppresses everything but failures.
- **Levels you'll see** — logrus writes the level as `"level":"info"`, `"warning"` or `"error"`. **Faults are emitted at `warning` or `error`**, healthy lifecycle and routing at `info`, so you can alert on severity alone without parsing message text.

## Anatomy of a log line

Every lifecycle and fault line carries a consistent set of **correlation fields** so you can pivot from one line to the whole run. A started line looks like:

```json
{
  "level": "info",
  "msg": "workflow run started",
  "time": "2026-06-24T08:30:01Z",
  "traceId": "8f3a1c2b4d5e6f70",
  "organisationId": "64f0a1b2c3d4e5f600112233",
  "fileName": "front-gate/2026/06/12/08-30-00.mp4",
  "mediaKey": "front-gate/2026/06/12/08-30-00.mp4"
}
```

| Field | When present | What it is |
|---|---|---|
| `msg` | always | The stable, greppable line identity — match on this exact string. |
| `level` | always | `info` (healthy) / `warning` / `error` (faults). |
| `traceId` | always | The distributed-trace id — the **same** id your stage receives on the `WorkflowRun` and the one to give us. Ties every line of one recording together across services. |
| `mediaKey` | always | The recording reference (media key) the run is about. The primary key to grep a single recording. `fileName` mirrors it. |
| `organisationId` | always | The owning organisation — scope when triaging a single tenant. |
| `runId` | once the run is loaded | The run's database id (`workflow_runs._id`) — on dispatch, routing, completion and ingest lines. |
| `operation` | stage / routing / ingest lines | The stage's operation id (e.g. `speed`). |
| `reason` | routing & ingest-failure lines | Why a decision went the way it did (e.g. `permanent persistence rejection, dropping`, `empty media key`). |
| `error` | error lines | The underlying error message. |

> Every line in this document — the lifecycle, the routing decisions **and** the ingest/persistence failures — carries these correlation fields as structured keys (`traceId`, `mediaKey`, `organisationId`, and `runId` once the run is loaded). You can filter the entire life of one recording on `mediaKey` or `traceId` alone and group faults by `operation`/`reason`; you never have to parse values out of the message text.

## The run lifecycle (info)

A healthy run emits these, in order — they are your "happy path" trace. Seeing `started` then `completed` with **no** `stage dispatched` in between is the signature of *a run created but never reached a stage*.

| `msg` | Meaning | Extra fields |
|---|---|---|
| `workflow run started` | A new run document was seeded for this recording. | — |
| `workflow stage dispatched` | A stage was published to its queue — the run reached a stage. One per dispatched stage. | `operation`, `queue`, `runId` |
| `workflow upstream operation resolved` | A stage's result came back and was recorded on the run. | `operation` |
| `workflow run completed` | The run was finalized cleanly — every dispatched stage resolved. | `runId`, `dispatchedStages`, `resolvedStages`, `timedOut` (`false`) |

`dispatchedStages` / `resolvedStages` on the completion line let you confirm at a glance how much the run did: `dispatchedStages: 0` is the explicit *never reached a stage* outcome.

## Routing decisions (info & debug)

When a result lands (or a run opens), the engine re-evaluates the **conditional** stages and says what it decided. Every line carries `mediaKey`, `runId` and the rest of the correlation fields:

| Level | `msg` | Meaning | Extra fields |
|---|---|---|---|
| `info` | `workflow conditional stages matched` | At least one conditional stage's rule held and is being dispatched. | `matchedOperations`, `runId` |
| `info` | `workflow no conditional stages matched` | Nothing matched — the result advanced the run without opening a new stage. The `availableOperations` field is the readiness gate: it lists exactly which upstream results were present when the decision was made, so you can see *why* a `needs` gate didn't open. | `availableOperations`, `runId` |
| `debug` | `workflow conditional stage routing decision` | Per-stage explanation — `matched` (bool) plus a `reason` naming which `need` passed or failed and the actual value seen. Turn on `LOG_LEVEL=debug` when a `conditional` stage isn't firing and you need to know which predicate is the blocker. | `operation`, `matched`, `reason`, `runId` |
| `debug` | `workflow stage dispatch skipped` | The stage was already queued for this run; the engine never dispatches a stage twice (`reason: already dispatched (fire-once)`). | `operation`, `reason`, `runId` |

> Troubleshooting a stage that **never fires**: set `LOG_LEVEL=debug` and read its `workflow conditional stage routing decision` line — `matched: false` with the `reason` naming the failing `need` and the value it saw, which is almost always a path/value mismatch in the [condition](/docs/hub/workflows/stages/#the-condition-object) or an upstream that wasn't in `availableOperations` yet.

## Faults — warnings & errors

These are the lines to **alert on** and the ones most useful to send us. All carry the correlation fields above; the `error` field holds the underlying cause.

| Level | `msg` | What happened / what to check |
|---|---|---|
| `warning` | `workflow run timed out with stages outstanding` | The watchdog finalized a run because a dispatched stage **never returned** (a stuck or crashed microservice). `dispatchedStages` > `resolvedStages`; `unresolvedStages` is the count abandoned. Check that the named stage's microservice is up and acking. |
| `warning` | `workflow event dropped` | An inbound message was discarded before it could open or advance a run. `reason` says why (e.g. `empty media key`); `operation` is the message's op. A steady stream means a malformed upstream producer. |
| `error` | `workflow stage dispatch failed` | The engine could **not** enqueue a stage — the run never reached it. `operation` names the stage; `error` is the cause (queue publish error, or the dispatch payload failed to marshal). Check broker connectivity and the stage's `queue`. |
| `error` | `workflow stage dispatched but recording it failed` | The stage **was** published, but the engine couldn't record it on the run's dispatched tier. The worker will still run; the run's bookkeeping may be slightly off. Usually a transient database blip. |
| `error` | `HandleNewRun: failed to load workflow run` / `… failed to insert workflow run` | The engine couldn't read or seed the run document — a database problem. The run did not open. |
| `error` | `finalizeIfComplete: failed to stamp run end` | The engine couldn't mark a run finished. The run stays open; the watchdog will retry on a later message. |

### Result-persistence (ingest) failures

When a stage hands back a [block envelope](/docs/hub/workflows/ingest/blocks/), the engine persists it through the shared ingest core. These lines carry the full correlation fields plus `operation`; the error cases use a `reason` field to distinguish the failure site, so you alert on `msg`+`level` and group by `reason`:

| Level | `msg` | `reason` / fields | What happened |
|---|---|---|---|
| `error` | `workflow stage result ingest failed` | `reason: transient persistence failure, retrying` (+ `operation`, `error`) | A sink write failed transiently — the message is **re-queued** (idempotent, so safe). Repeated lines for one recording mean a sink is down. |
| `error` | `workflow stage result ingest failed` | `reason: permanent persistence rejection, dropping` | A deterministic rejection (schema/validator or duplicate key) — the block is **dropped**, not retried. This is real data loss for that block; fix the block's shape. |
| `error` | `workflow stage result ingest failed` | `reason: malformed block envelope` | The stage's result body didn't parse as a block envelope — a bug in the stage's output. Recorded without ingest. |
| `error` | `workflow stage result ingest failed` | `reason: could not load run, retrying` | The engine couldn't reload the run for its retention clock — a transient database blip; **re-queued**. |
| `warning` | `workflow stage result dropped` | `operation`, `error` | An unknown/forbidden block type or a validation failure — recorded without ingest, not retried. |
| `warning` | `workflow stage result ingest warning` | `operation`, `detail` | The ingest core stored the envelope but flagged a non-fatal warning. |

## Reading a run end-to-end

Pick the recording's **`mediaKey`** (or its **`traceId`**) and filter the engine logs on it; the lifecycle reads as a short story. A few signatures:

**Healthy run with a conditional stage**
```text
workflow run started
workflow conditional stages matched              matchedOperations=[speed] runId=…
workflow stage dispatched                        operation=speed queue=hub-workflows-speed runId=…
workflow upstream operation resolved             operation=speed
workflow run completed                           dispatchedStages=1 resolvedStages=1 timedOut=false
```

**Created but never reached a stage** (the previously-invisible case)
```text
workflow run started
workflow no conditional stages matched           availableOperations=[classify] runId=…
workflow run completed                           dispatchedStages=0 resolvedStages=0 timedOut=false
```
→ Working as designed *if* no stage's rule matched this recording; if you expected one to, switch to `LOG_LEVEL=debug` and read the `workflow conditional stage routing decision` line (`matched: false`) and its `reason`.

**Stuck / crashed stage**
```text
workflow run started
workflow stage dispatched            operation=speed …
workflow run timed out with stages outstanding   dispatchedStages=1 resolvedStages=0 unresolvedStages=1
```
→ The `speed` microservice received the run but never routed it back. Check that pod.

## Distributed tracing

The engine participates in **OpenTelemetry** tracing under the service name `hub-workflows`. For every message it **continues the trace** carried on the run's `traceId` and opens a span tagged with the `operation` and `fileName`, so a single recording's spans line up across the analysis service, the engine and your stages in your tracing backend.

The same `traceId` is on the `WorkflowRun` your stage receives. **Propagate it** on your stage's own logs and spans (see the [`traceId` field](/docs/hub/workflows/stages/#the-workflow-run)) and the whole run — pipeline → engine → your microservice — stays correlatable under one id. If the tracing backend is unreachable the engine logs `failed to connect to tracing backend` (at startup) or `tracing failed for event` (per message) and **keeps processing** — tracing is best-effort and never blocks a run.

## Metrics

The engine exposes Prometheus metrics on **`:8080/metrics`** — the hook your monitoring scrapes. Alongside the engine's queue **processing time** (`<queue>_processing_time`), it exports lifecycle and **fault counters** so you can alert on rates and ratios across the fleet without parsing logs:

| Metric | Type | What it counts |
|---|---|---|
| `workflow_runs_started_total` | counter | Runs opened (a run document was seeded). |
| `workflow_runs_completed_total` | counter | Runs finalized cleanly (every dispatched stage resolved). |
| `workflow_runs_timed_out_total` | counter | Runs the watchdog forced shut with a stage still outstanding (a stage never returned). |
| `workflow_runs_no_stage_total` | counter | Runs that finalized **without ever dispatching a stage** (created but never reached a stage). A subset of `…completed_total`. |
| `workflow_stages_dispatched_total` | counter | Stages successfully published to their queue. |
| `workflow_stage_dispatch_failures_total` | counter | Stage dispatch attempts that failed (the stage never reached its worker). |
| `workflow_stage_ingest_failures_total` | counter (`reason`) | Stage-result ingest failures, labelled `reason` = `transient_persistence` \| `permanent_rejection` \| `malformed_envelope` \| `run_load`. |
| `workflow_stage_ingest_dropped_total` | counter | Stage-result blocks dropped for a non-retryable reason (unknown/forbidden type or validation failure). |
| `workflow_events_dropped_total` | counter | Inbound messages discarded before they could open or advance a run. |

Useful signals to alert on: a rising `workflow_runs_timed_out_total` (stuck stages), any `workflow_stage_ingest_failures_total{reason="permanent_rejection"}` (real data loss), and a high `workflow_runs_no_stage_total / workflow_runs_completed_total` ratio (recordings opening runs but matching no stage). Each counter has a one-to-one structured log line above, so a metric spike points straight at the lines to read.

## Retries & dead-lettering

A run whose result can't be persisted is re-queued rather than lost, but the loop is **bounded** so a permanently-failing stage can't grow the queue forever:

- `WORKFLOWS_MAX_RETRIES` (default **5**) caps how many times one run is re-queued; past the cap it is sent to the **dead-letter queue**.
- Retries are delayed by a fixed backoff (5s) and a malformed message body (not a `WorkflowRun`) is dead-lettered immediately.

If runs are disappearing, check the dead-letter queue and the `workflow stage result ingest failed` lines (`reason: transient persistence failure, retrying`) — a recording that retries up to the cap and then stops is being dead-lettered.

## Sending us accurate logs

When you open an issue, the single most useful thing is the engine's **JSON log lines for the affected recording**, unredacted of the correlation fields:

1. Find the recording's **`mediaKey`** (or `traceId`).
2. Grep the `hub-workflows` logs for it and include the **whole** run — `started` through `completed`/`timed out`.
3. Include any `warning`/`error` lines (they carry the `error` field with the root cause).
4. If a `conditional` stage isn't firing, re-run with `LOG_LEVEL=debug` and include the `workflow conditional stage routing decision` lines (`matched: true`/`false` with their `reason`) for that stage.
5. Note the `traceId` so we can line it up with the analysis service and your stage.

That set lets us reconstruct exactly what the engine decided and why, without guessing.
