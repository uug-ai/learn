---
title: "Audit events"
description: "Review security, access, and configuration activity in Kerberos Hub."
lead: "Review who performed an action, what changed, and whether it succeeded."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-09-09T00:00:00+00:00
draft: false
images: []
tags: [Audit]
menu:
  hub:
    parent: "hub"
weight: 307
toc: true
---

The **Audit events** page provides a read-only history of security,
configuration, and data operations in the current organisation. Use it to
answer questions such as who changed a device, whether an authorization check
succeeded, or which resource an action affected.

Open **Management > Audit events** in the Hub sidebar. The page is available at
`/audit` to organisation owners and administrators.

## Find an event

Audit events are shown newest first. Use the filters together to narrow the
feed:

- **Date range** limits the feed to inclusive calendar days.
- **Search** checks common event fields and known metadata.
- **Actor** identifies the user or service that initiated the action.
- **Action** narrows the feed to a named activity.
- **Target** finds activity for a resource identifier.
- **Operation** separates reads, writes, creates, deletes, and authentication.
- **Category** groups identity, data, and configuration activity.
- **Outcome** separates successful and failed operations.
- **Permission** finds authorization checks for a specific permission.

Changing a filter returns to the first page. Use **Clear** to remove every
filter or **Refresh** to request the latest events without changing the current
filter set.

> [!TIP]
> Add a date range before running a broad text search. It produces a more
> focused result and reduces the amount of audit history the server must scan.

## Read the event table

Each row shows the event time, actor, action, operation and category, target,
and outcome. Long values are shortened in the table; hover over them to read
the complete value.

Select the details control at the end of a row to inspect the evidence captured
with the event. Depending on the action, this can include:

- the authorization decision and evaluated permission;
- request information such as the source IP address and user agent;
- identifiers for the affected device, recording, alert, or user;
- structured metadata supplied by the action; and
- field-level changes for an update.

Background events may identify a service rather than a person and may not have
browser or IP evidence. Events without a resource display no target.

## Browse large result sets

The footer shows the visible result range and the total number of matching
events. Choose 25, 50, or 100 rows per page, or use the numbered, previous,
next, first, and last controls to move through the result.

Filtering and pagination happen on the server. The browser does not download
the complete audit history before displaying the table.

## Access and data handling

Only organisation owners and administrators can open the organisation-wide
audit feed. Other roles may generate events through their normal activity, but
they cannot use this page to inspect other actors.

Audit records are immutable in the Hub interface. The page does not provide
edit or delete actions. Sensitive values such as passwords, one-time codes, and
provider credentials are not stored as audit metadata.

## Troubleshooting

- **Audit events is missing from the sidebar.** Your account must be an
  organisation owner or administrator. Opening `/audit` directly does not
  bypass this requirement.
- **The feed is empty.** Clear the filters and confirm that the correct
  organisation is selected. Events are isolated by organisation.
- **An expected event cannot be found.** Broaden the date range and remove
  text filters one at a time. Automated health checks and routine list reads
  are not necessarily recorded as user-intent audit events.
- **A value is cut off.** Hover over the table value or expand the row to view
  the complete metadata.