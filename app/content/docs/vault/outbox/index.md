---
title: "Outbox"
description: "Monitor durable integration delivery and retries."
lead: "Inspect the current pipeline backlog and recent delivery outcomes."
date: 2026-09-13T00:00:00+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 310
toc: true
---

Vault stores integration deliveries with the media row before acknowledging an
upload. The authenticated **Outbox** page shows the resulting durable delivery
backlog and refreshes every 10 seconds.

## Backlog status

- **Queued** is the total pending plus processing deliveries.
- **Pending** deliveries are waiting for their next attempt.
- **Processing** deliveries are currently leased by a worker.
- **Retrying** deliveries have already failed at least once.
- **Attempts** is the aggregate number of delivery attempts in the backlog.

The destination table groups the backlog by integration and topic. Select its
arrow action to inspect current pending and processing messages. Each compact
row shows status, media, device, and next-attempt time. Expand it to inspect the
recorded time, attempt count, last error, delivery ID, and event payload.

## Delivery outcomes

The 24-hour chart distinguishes:

- **Successful**: delivered on the first attempt.
- **Recovered**: delivered after one or more failed attempts.
- **Failed attempts**: retry attempts that failed, not permanently lost events.

Outcome history starts when the outbox-enabled Vault version is deployed; old
delivery results are not backfilled.

## Integration insights

Select the activity action beside an item on **Integrations** to open its
60-minute performance view. It shows the current queue and retry counts,
successful deliveries, delivered events per minute, average delivery latency,
and delivered-versus-failed attempt history. This page refreshes every 30
seconds.

## Troubleshooting

A growing pending or retrying count usually indicates broker connectivity,
credentials, destination configuration, or a disabled integration. Correct the
integration and enable it; the worker reloads the saved configuration and
continues retrying. Media with pending deliveries is excluded from automatic
retention cleanup.

Vault provides at-least-once delivery. Consumers should deduplicate or upsert by
their stable event identity because a process interruption can cause an already
accepted message to be sent again.