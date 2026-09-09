---
title: "Markers"
description: "Find significant moments and open their linked recordings in Kerberos Hub."
lead: "Use named timeline events to move from analysis results to the exact moment in a recording."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-09-09T00:00:00+00:00
draft: false
images: []
tags: [Markers]
menu:
  hub:
    parent: "hub"
weight: 311
toc: true
---

A marker identifies a meaningful point or span on a recording timeline. A
workflow can create a marker for events such as a number-plate read, a detected
object, or a period of activity, then attach categories, events, tags, metadata,
and links to detection tracks.

When marker analysis is enabled, open **Analysis > Markers** or visit
`/analytics/markers`. Markers also appear on the
[Recordings]({{< ref "/docs/hub/recordings" >}}) overview and detail pages.

> [!NOTE] Feature flag
> The dedicated marker analysis page requires `FEATURE_MARKERS_ENABLED=true`.
> Recording filters for marker names, categories, events, and tags have their
> own feature settings. See
> [Feature flags]({{< ref "/docs/hub/feature-flags" >}}#media-filters).

## Find a marker

The marker analysis page supports server-side filtering and pagination. Narrow
the result by date, device, category, marker name or number plate, and sort
order. Results are newest first by default.

Each compact row shows the marker time, name, categories, device, confidence,
and a details action. Selecting a row opens a detail drawer without leaving the
analysis page.

The drawer can include:

- the marker's time span and classification information;
- categories, events, and tags;
- workflow-supplied metadata, comments, and audit information;
- stable marker and recording identifiers; and
- a player for the first linked recording.

The player seeks to the marker's offset within the recording. Use the drawer
action to open the complete recording detail page.

## Use markers on recordings

Recording cards show up to five marker icons and summarize additional markers
with an overflow count. Select an icon to start playback at that marker. Hover
states can highlight the marker's time range on the recording timeline.

The recording detail view lists each marker occurrence with its categories,
events, and tags. Some markers also reference detection tracks. When those
references are available, enable the marker overlay to draw the associated
boxes over the video. Multiple marker overlays can be compared at once.

## How markers are created

Markers are processing results, not manual bookmarks. Workflow stages and
analysis services create them through the Hub ingest contract. The stage
provides the marker name, timestamps, optional taxonomy fields, and any linked
detection references; Hub stores the result and updates the recording's bounded
summary for fast display and filtering.

For the technical result format, see the
[marker block contract]({{< ref "/docs/hub/workflows/ingest/blocks/marker" >}}).

## Access and limits

Marker visibility follows access to the linked recording and its project. The
dedicated analysis route also requires access to Analytics. There is no separate
frontend permission for manually creating or editing markers because the
current interface treats them as workflow results.

Recording cards show a compact subset, and each recording keeps a bounded marker
summary for display. Use the marker analysis page when you need to search the
authoritative history rather than relying on one card's summary.

## Troubleshooting

- **Markers is missing from Analysis.** Enable the markers feature and confirm
  that your role can access Analytics.
- **The page is empty.** Broaden the date and device filters, then confirm that
  a workflow has emitted marker results for accessible recordings.
- **A recording has a marker name but no occurrence details.** Older processing
  paths may have stored only flat filter values. Newer marker results include
  timestamps and metadata.
- **No detection overlay is available.** The marker must contain a valid link to
  a detection run and track. Markers without detection references can still
  seek playback and display metadata.
- **The overlay timing looks imprecise.** Hub uses exact video sample timing
  when available and falls back to the recording frame rate otherwise.