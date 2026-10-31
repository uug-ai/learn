---
title: "Notifications"
description: "Review alerts in the Watchlist and deliver them through configured channels."
lead: "Turn matching events into an operator inbox and timely outbound messages."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-10-30T00:00:00+00:00
draft: false
images: []
tags: [Notifications]
menu:
  hub:
    parent: "hub"
weight: 312
toc: true
podcast: hub-notifications
---

Notifications connect detection and device events to people. An alert defines
which events matter, the **Watchlist** gives each recipient an inbox inside Hub,
and channels can deliver matching events to external services.

Open **Watchlist** in the Hub sidebar or visit `/watchlist` to review your
notifications. Owners and administrators configure alert rules and channels
under **Integrations**.

## How a notification is created

1. A recording or device event enters the Hub processing pipeline.
2. An enabled alert evaluates its time range, devices, classifications, regions,
   or other configured conditions.
3. A matching alert creates a notification for its recipients.
4. The notification worker sends the event through the channels selected by the
   alert.
5. Recipients can review the event and linked recording in the Watchlist.

The Watchlist and outbound delivery are related but distinct. A notification can
be visible in Hub even when an external channel fails, and an alert without any
selected recipients or channels may have nowhere to deliver its result.

## Use the Watchlist

The Watchlist displays recent notifications newest first. Use search,
classification, device, and read-state filters to narrow the list. Expanding a
row reveals the event details and its linked recording when media is available.

Unread items are visually distinct. Mark an individual notification as read, or
use **Read all** to clear the unread state for the current inbox. Hub checks for
new events in the background after the first page loads.

From a notification you can review the triggering footage and, when case
creation is enabled, start a case with that recording already selected. See
[Cases](/docs/hub/cases) for the evidence workflow.

## Configure alerts

An alert combines matching conditions with recipients and channels. Generic
alerts cover common detection, offline-device, and high-upload scenarios.
Custom alerts provide more detailed event conditions where supported by the
deployment.

When configuring an alert:

- select only the sites or devices that should contribute events;
- verify that classification names match the values produced by the active
  analysis model;
- set the active time range deliberately; and
- select at least one recipient or outbound channel for the intended delivery.

The generic device alert sends one notification per camera that goes offline,
loses its camera stream, comes back online or gets its camera stream back. The
message names the change, for example "back online, but the camera stream is
not connected" for a camera that returns from offline without its stream.
Switch on **Group notifications** in its panel to receive one notification when
several cameras change status at the same time, with the cameras listed by
change and by site and group. Changes are then held for about 20 seconds (one
scan of the device monitor, one minute by default, before `hub-monitor-device`
v1.4.10) to collect the other cameras of the same outage. Grouping applies to
email, Slack, Telegram, Pushover,
Pushbullet, SMS and Alexa; webhooks and IFTTT keep receiving one notification
per camera, unchanged, so existing integrations keep working. See
[White-label](/docs/hub/whitelabel) for the grouped email template.

Alert management is restricted to users with the relevant administrative page
permission. See [Configuration](/docs/hub/configuration#alerts)
for the existing alert setup reference.

## Configure channels

Channels describe external destinations such as email, webhooks, Slack, MQTT,
or other integrations enabled by the deployment. Each alert can target one or
more channels.

Test a channel after changing its credentials or endpoint. For webhooks, confirm
that the destination accepts the Hub request and returns a successful response.
Keep provider secrets in deployment configuration rather than documentation or
alert names.

## Access and retention

The Watchlist is available to authenticated users and shows notifications for
the signed-in recipient. Managing organisation-wide alerts and channels requires
the corresponding administrative permissions.

Notifications remain subject to the deployment's data-retention policy. A
Watchlist entry is not an evidence archive; create a case when footage must be
preserved beyond ordinary retention.

## Troubleshooting

- **No Watchlist item appears.** Confirm that the alert is enabled, its device
  and time conditions match, and the signed-in user is a recipient.
- **The item appears but no external message arrives.** Test the selected
  channel and inspect its endpoint, credentials, and delivery logs.
- **A classification alert does not match.** Classification values currently
  require an exact match with the values emitted by the configured model.
- **The thumbnail is missing.** Notification text can arrive before thumbnail
  processing completes, or the deployment's thumbnail storage may be
  unavailable. Open the linked recording to verify the media itself.
- **An old queued event was skipped.** Deployments can reject stale
  notifications before outbound delivery to avoid sending obsolete alerts.