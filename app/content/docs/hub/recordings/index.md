---
title: "Recordings"
description: "Find, review, organize, and process recordings in Kerberos Hub."
lead: "Find the footage that matters and move from playback to investigation."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-09-09T00:00:00+00:00
draft: false
images: []
tags: [Recordings]
menu:
  hub:
    parent: "hub"
weight: 310
toc: true
---

The **Recordings** page is the main archive for footage uploaded to Kerberos
Hub. Use it to find recordings by time, location, device, or analysis result;
review video and metadata; and continue an investigation through markers,
cases, sharing, or on-demand workflows.

Open **Recordings** in the Hub sidebar. The overview is available at `/media`,
and selecting a recording opens its detail page.

## Find recordings

The control bar applies filters to the complete result set rather than only the
items currently visible. Depending on the enabled features, you can filter by:

- **Date** and time range;
- **Sites**, **groups**, and **devices**;
- object classifications;
- marker **categories**, **names**, **events**, and **tags**;
- region;
- starred status; and
- newest-first or oldest-first order.

Active filters replace their leading icon with a clear control. Clearing a
category also clears marker selections that depend on it. The available dates
in the calendar come from recording dates indexed by the processing pipeline.

> [!TIP]
> Begin with the date and site or device, then add analysis filters. This keeps
> broad marker or classification searches focused on the footage you need.

## Browse and play footage

Recordings appear in a paginated grid. Each item can include a thumbnail,
duration, device, timestamp, analysis badges, and marker icons. Select a card to
play it; open its detail view when you need the complete metadata and related
analysis.

When a sprite sheet is available, moving across the timeline previews frames
without repeatedly loading the video. Playback controls include seeking,
playback speed, volume, and fullscreen.

Use the synchronised player to compare footage from several cameras on one
timeline. It is most useful after narrowing the date and device filters to the
incident window.

## Work with a recording

The available actions depend on your permissions and deployment features:

- **Star** important footage so it can be found quickly later.
- **Edit the description** to add searchable investigation context.
- **Download or share** footage when your role permits external access.
- **Create a case** from one or more selected recordings. A single bulk action
  can add up to 1,000 recordings.
- **Run a workflow** to request additional detection or processing.

Creating a case preserves selected evidence beyond normal recording retention.
See [Cases]({{< ref "/docs/hub/cases" >}}) for assignment, archiving, sharing,
and export behavior.

## Review analysis and markers

The detail view brings the recording and its derived information together.
Available sections can include classifications, counting results, heatmaps,
workflow state, and markers.

Marker icons on a recording identify named moments or spans. Select one to seek
to its start time. When a marker links to a detection track, Hub can draw its
boxes over the video and align them with playback. See
[Markers]({{< ref "/docs/hub/markers" >}}) for the marker analysis view and filter behavior.

## Access and retention

Results are scoped to the devices, sites, organisation, and project available
to the signed-in user. Downloading, sharing, editing descriptions, running
workflows, and creating cases can require additional role permissions even when
the recording itself is visible.

Ordinary recordings remain subject to the deployment's retention policy. Add
important evidence to a case when it must be retained under the archive
provider's policy. See [Cleanup]({{< ref "/docs/hub/cleanup" >}}) for the
retention service.

## Feature configuration

Deployers can independently expose recording actions and filters, including
case creation, descriptions, sites, groups, devices, classifications, regions,
marker fields, starred recordings, and the synchronised player. The default
view and fallback frame rate are also configurable. See
[Feature flags]({{< ref "/docs/hub/feature-flags" >}}#media-filters) for the current settings.

## Troubleshooting

- **A day is unavailable in the calendar.** Hub has no indexed recording date
  for the current scope. Confirm that the device uploaded footage and that the
  sequence stage processed it.
- **Thumbnails or timeline previews are missing.** The recording can still be
  playable while thumbnail or sprite processing is delayed. Check the related
  processing workers.
- **A filter is missing.** Its frontend feature flag may be disabled for this
  deployment.
- **A marker or classification appears on one view but not another.** Older
  recordings may contain legacy analysis summaries without newer per-occurrence
  detail. Reprocessing is not required for playback, but richer overlays depend
  on the newer result data.
- **An action is unavailable.** Confirm both the relevant feature flag and your
  role permissions.