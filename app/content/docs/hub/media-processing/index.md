---
title: "Media processing"
description: "Understand how Hub turns uploaded video into searchable and actionable media."
lead: "Follow a recording from upload through previews, analysis, workflows, and delivery."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-09-09T00:00:00+00:00
draft: false
images: []
tags: [Media processing]
menu:
  hub:
    parent: "hub"
weight: 313
toc: true
---

Media processing turns an uploaded video into a recording that operators can
find, preview, analyse, and use in an investigation. Several independent workers
contribute metadata and derived assets, so a recording can become playable
before every preview or analysis result is ready.

This page explains the user-visible lifecycle. See
[Pipeline]({{< ref "/docs/hub/pipeline" >}}) for the legacy service topology and
[Workflows]({{< ref "/docs/hub/workflows" >}}) for configurable processing stages.

## Processing lifecycle

### 1. Upload and intake

An Agent uploads a recording to Vault and submits an event to Hub. Intake
validates account limits, resolves the device and ownership context, and adds the
metadata required by later stages.

### 2. Registration and previews

The sequence stage registers the recording and its available date so it can
appear in [Recordings]({{< ref "/docs/hub/recordings" >}}). Other workers can
then generate:

- a thumbnail for cards and notification previews;
- a sprite sheet for timeline scrubbing;
- duration, dimensions, frame rate, and other media metadata; and
- representative colours used by visual analysis.

These outputs are independent. A missing thumbnail does not necessarily mean
the original recording failed to upload.

### 3. Analysis

Enabled analysis stages can classify objects, produce detection tracks, count
crossings, measure activity in regions, or create other structured results.
Those results feed Analytics, recording overlays, markers, alerts, and downstream
workflows.

Analysis runs only when its service and configuration are enabled. Existing
recordings are not automatically reprocessed merely because a new model or stage
is deployed.

### 4. Workflows

The workflow engine coordinates configurable stages and records each run's
status. A stage can emit detections, markers, or media updates, and a later stage
can depend on an earlier result. Workflows may start automatically from incoming
media or manually from a recording.

The workflow path and the legacy event pipeline coexist. The event pipeline
still handles core recording intake and established processing services;
workflows provide explicit runs and configurable stage orchestration.

### 5. Actions and delivery

Processing results can trigger notifications, produce redacted media, or create
exports. These operations are asynchronous. Hub records queued, processing,
completed, or failed state where the feature exposes status, while workers fetch
the source media and publish their results.

## What operators see

The recording usually appears first, followed by derived information as workers
finish. Refresh the detail view when a thumbnail, sprite, detection, or workflow
result is still pending. Starting the same workflow repeatedly can create
separate runs; check existing status before retrying.

## Access and retention

Every stage must preserve the recording's organisation and project scope.
Operators see only media available to their current access context, and manual
workflow actions can require additional permissions.

Derived data remains tied to the source recording's lifecycle unless a feature,
such as a case archive, creates a separately managed copy. See
[Cleanup]({{< ref "/docs/hub/cleanup" >}}) for retention enforcement.

## Troubleshooting

- **The recording does not appear.** Confirm that the upload completed and that
  intake and sequence workers are running for the expected queue.
- **The recording plays but has no thumbnail or timeline preview.** Check the
  thumbnail and sprite workers. Their failure does not remove the source video.
- **No detections or markers appear.** Confirm that the relevant analysis or
  workflow stage is enabled and that its run completed successfully.
- **A workflow remains queued.** Check the stage worker, queue binding, and
  dead-letter queue before starting a duplicate run.
- **A result appears in the wrong scope or not at all.** Verify that ownership
  fields are preserved between the upload event, workflow run, and result.