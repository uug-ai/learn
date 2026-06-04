---
title: "Pipeline"
description: "Delivering detection runs as an in-pipeline stage — the same DetectionRun, triggered automatically on analysis."
lead: "Deliver detection runs as a stage of the analysis pipeline — the same DetectionRun, into the same detections collection, triggered automatically."
date: 2026-06-04T00:00:00+00:00
lastmod: 2026-06-04T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "detections"
weight: 20
toc: true
---

The **in-pipeline stage** is the second transport for detections. Instead of your service posting runs over HTTP, a worker runs as a **stage of the analysis pipeline** and is triggered automatically as recordings are analysed. It produces the **same [`DetectionRun`](../#the-detection-run)** and stores it in the **same `detections` collection** as the [API push](../api/) — only the delivery differs.

This page covers **only what is detection-specific**. Everything about *how* a stage works — the queue, the event envelope, acknowledgement, deployment, completion tracking — is the same for every stage and lives on **[Pipeline → Integrations](../../../pipeline/integrations/)**. Read that first; this page is the detection-shaped slice on top of it.

## What's specific to detections

| Aspect | Value |
|---|---|
| **Operation name** | `detection` → queue `kcloud-detection-queue.fifo` |
| **Output contract** | a [`DetectionRun`](../#the-detection-run) — identical to the API body, minus the transport-only fields |
| **Sink** | **own collection**: write the run to `detections`, keyed by the recording (the recommended [own-collection sink](../../../pipeline/integrations/#own-collection-recommended)) |
| **Immutability** | runs are stored verbatim and never edited — same guarantee as the API path |

Because the sink is the `detections` collection — not a shared document — the orchestrator never interprets your run. Your stage **writes the run itself** and marks the operation resolved; no detection-specific handler is needed in the analyser.

## Building the run

The run your stage writes is the **same shape** as the API body, so the code that assembles boxes, tracks and `source` is identical regardless of transport. Every field — `source`, `coordinateSpace`, optional `media` and `categories`, the `tracks` of boxes, the geometry rules and the stored form — is documented once on the **[detection run contract](../#the-detection-run)**.

The only difference from the [API page](../api/) is the **transport-only** fields fall away: there is no HTTP target (`mediaKey` / `analysisId` come from the event the stage received) and no synchronous response — the stage writes directly and acknowledges the message.

## Gating which recordings run detection

A detection stage rarely needs to process **every** recording. The decision of *whether this recording should run detection* is a [per-recording route](../../../pipeline/integrations/#conditional-routing), made in the analysis router when an upstream operation resolves — for example, only running detection on recordings the classifier already flagged. Recordings that don't match are never enqueued to `kcloud-detection-queue.fifo`.

Detection stages are **[asynchronous](../../../pipeline/integrations/#completion-and-acknowledgement)** like every custom stage, so a recording that *doesn't* run detection never waits on it.

## Choosing this vs the API

Both transports write the same `DetectionRun` to the same collection; pick by *where your model runs* and *what triggers it*:

- **[API push](../api/)** — your model runs anywhere and posts when it has data. Works on **every** deployment; the right default.
- **In-pipeline stage** — you control the deployment and want detection to run automatically as part of analysis, with queue-level delivery.

You aren't locked in: a deployment can use the API today and add a stage later as a second front door to the same `detections` collection. See the [Methods comparison](../#methods) on the detections overview.
