---
title: "Cases"
description: "Archiving media through the creation of a case."
lead: "Archiving media through the creation of a case."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 305
toc: true
---

By default, recordings are persisted for a limited amount of time. Within Hub you define a retention period per subscription and assign it to a user. The retention period can be set to 30, 60, 90 days or any custom value. It determines how many days of footage are visible to the end-user after login, and controls when the associated recordings metadata are removed from the database.

Cases are the mechanism in Hub to keep important recordings beyond that window. Creating a case copies its recordings from the current storage provider to a dedicated archive provider in Vault, which has its own (typically longer or non-expiring) retention period — for example, 3 years or more.

> **Note:** The current archiving feature is designed for individual recordings only. It is not suitable for bulk exports or archiving large volumes of data (e.g. terabytes). We are aware of this limitation and are actively working on a solution to support large-scale archiving and export in a future release.

## Introduction 

The cases page is reachable from the main sidebar, under **Cases**. It
lists every case in your account together with the recordings attached to it,
the assignee, and any labels.

{{< figure src="hub-cases-list.png" alt="The cases overview lists every case in your account." caption="The cases overview lists every case in your account." class="stretch">}}

Selecting a row expands the case in place so you can review the attached
recording, edit the title and description, manage labels, and add comments
without leaving the page.

{{< figure src="hub-cases-opened.png" alt="An expanded case shows the recording, details, and comments." caption="Open a case from the list to inspect the recording and follow up on it." class="stretch">}}

### Case statuses

Every case has one of three statuses, shown as an icon at the start of the
row in the overview:

- **Open** — the default status of a freshly-created case. Use it for cases
  that still require follow-up.
- **Approved** — the case has been reviewed and confirmed (for example a
  real incident).
- **Rejected** — the case has been reviewed and dismissed (for example a
  false alarm). The archived recordings remain available, but the case is
  marked as not relevant.

The status can be changed at any time from the action bar of the expanded
case or from the *Actions* menu of the dedicated case detail page (see
*Status transitions* below). The current status drives which buttons are
shown — for example, *Approve* disappears once the case is already
approved.

### Filtering and searching the overview

A filter bar sits above the list and lets you narrow the cases down:

{{< figure src="hub-cases-filter.png" alt="The cases overview filter bar with search and the Sites, Devices, Assignees, Labels and Status filters." caption="The filter bar above the cases overview lets you search and narrow down by site, device, assignee, label or status." class="stretch">}}

- **Search** — free-text search on the case title.
- **Sites / Devices** — restrict the list to cases whose recordings come
  from the selected sites or devices.
- **Assignees** — only show cases assigned to the selected users.
- **Labels** — only show cases tagged with at least one of the selected
  labels. Clicking a label on an expanded case applies the same filter.
- **Status** — switch between *All*, *Open*, *Approved* and *Rejected*
  (the default is *Open*).

The **Refresh** button in the page header reloads the list with the
current filters applied.

## Creating a case

Cases are always created from a recording. The fastest way is to start from
the **Recordings** page (`/media`) and create the case directly from the
recording you want to archive.

1. Open **Recordings** in the sidebar.
2. Click on a recording to open its **side panel** on the right.
3. In the panel header, open the **Actions** dropdown (top-right).
4. Choose **New case** to open the *New case* modal.

{{< figure src="hub-media-new-case.png" alt="The New case modal opened from the Actions menu of a recording's side panel." caption="The New case modal, opened from the Actions menu of a recording." class="stretch">}}

The modal has two tabs — **Details** and **Media** — and the following fields:

**Details**

- **Case name** *(required)* — a short, descriptive title for the case. This is
  the title shown in the cases overview and in any notification sent to
  assignees.
- **Notes** — free-form description used to capture context about why the
  recording is being archived (incident reference, observations, follow-up
  actions, …).

**Settings**

- **Retention date** *(optional)* — picks the date at which the case itself
  is automatically cleaned up from Hub. When left empty, Hub falls back to
  the default retention window (365 days from creation, configurable on the
  hub-api with the `DEFAULT_TASK_RETENTION_DAYS` env var). Picking a date
  here explicitly overrides that default — useful when a case needs to be
  preserved longer (for example for an ongoing legal hold) or, on the
  contrary, can be removed earlier than the account default.

  This field controls only the Hub-side case lifetime. The retention of
  the underlying archived recordings is governed separately by the Vault
  archive account (see *Configuration* below).
- **Notify assignees** — when enabled, the assignees you select below receive
  a notification as soon as the case is created.
- **Keep this case private** — restricts visibility of the case to its
  assignees only. Other users in the account will not see the case in the
  overview.

**Labels**

- **Labels** — pick one or more labels to categorise the case (for example
  *intrusion*, *false alarm*, *insurance*). Labels can be filtered on from
  the cases overview.

**Assignees**

- **Assignees** *(required)* — the users responsible for following up on the
  case. The current user is selected automatically; add or remove members as
  needed.

**Media**

The **Media** tab shows the recordings that will be attached to the case. When
the modal is opened from a recording's side panel, that recording is
pre-selected. You can review the preview and remove individual recordings
before creating the case.

Once all required fields are filled in and at least one recording is
attached, click **New case** in the bottom-right of the modal to create it.
The recording is then queued for archiving to the Vault archive provider you
configured below.

The same *New case* modal is also reachable from two other places: the
**Recordings** page header (for bulk creation from the active filters) and
the **Watchlist** (one-click *Add Case* on a notification). Both are
described below.

### Creating a case in bulk from the Recordings page

The single-recording flow above is convenient when you already know which
recording you want to archive. When the event of interest covers a longer
time window — or when you want to archive every recording from a given
device on a specific day — the **Recordings** page lets you create a case
in bulk from the active filters.

1. Open **Recordings** in the sidebar.
2. Pick a **date** in the date picker.
3. Optionally narrow down by **device** or **site** in the filter bar.
4. Drag the **timeline** at the bottom to the time window you want to
   archive (the *from* and *to* selection updates the URL — for example
   `/media?date=2026-05-07&from=1262&to=2574&devices=camera2`).
5. Click the **Create case** button in the page header (next to *Clear
   filter* and *Refresh*).

The same *New case* modal opens with every recording matching the active
filters pre-attached on the **Media** tab.

{{< figure src="hub-media-create-case-bulk.png" alt="The Create case modal opened from the Recordings page header with a date, device and time range pre-applied via the page filters." caption="The Create case modal opened from the Recordings page header. Every recording matching the active filters (date, device, time range) is attached to the new case in one go." class="stretch">}}

> **Note:** To keep cases manageable, the **Create case** button is
> disabled when 1000 or more recordings match the current filters.
> Refine the date, device or time range before retrying.

### Creating a case from the context overlay

Sometimes a single recording is not enough — you may want to archive the
moments leading up to and following an event. The **View Context** action,
also available from the **Actions** dropdown of a recording's side panel,
opens a wider time window of recordings around the selected one.

{{< figure src="hub-media-context.png" alt="The Context overlay shows recordings around the selected one on a timeline." caption="The Context overlay loads recordings before and after the selected one on a shared timeline." class="stretch">}}

In the overlay you can:

- Pan and zoom the **timeline** at the bottom to navigate the surrounding
  recordings.
- Use the **filters** (time offset, site, group) to broaden or narrow the
  set of recordings shown.
- Click **Create case** in the bottom-right of the overlay to open the same
  *New case* modal described above, pre-filled with the recordings currently
  in scope. The fields and validation rules are identical to the standard
  flow.

This is the recommended way to create a case when the event you want to
archive spans multiple recordings or you need extra context before and
after it.

### Adding a recording to an existing case

Instead of creating a brand-new case, you can attach a recording to a case
that already exists. From the same **Actions** dropdown of a recording's
side panel, choose **Add to case**.

{{< figure src="hub-media-add-to-case.png" alt="The Add to case modal lists all accessible cases so you can attach a recording to one." caption="The Add to case modal lists every case you have access to and lets you filter by site, device, assignee, label or status." class="stretch">}}

The modal lists every case you have access to. To find the right one, you
can:

- **Search** by case title in the search field at the top.
- Filter the list using the same dropdowns as the cases overview (sites,
  devices, assignees, labels, status).

Click a case in the list to select it (the row becomes highlighted), then
press **Add to case** in the bottom-right of the modal. The recording is
appended to the selected case and queued for archiving alongside the
recordings already attached to it.

### Creating a case from the Watchlist

The **Watchlist** is the inbox of notifications generated by your pipeline
(motion, intrusion, ANPR, …). Expanding a notification row reveals an
**Add Case** action that opens the *New case* modal pre-filled with the
recording the notification refers to — the fastest path to archive a
recording from an event you were notified about.

{{< figure src="hub-cases-create.png" alt="The Create case modal opened from a Watchlist notification." caption="The Create case modal opened from a Watchlist notification, pre-filled with the recording the notification refers to." class="stretch">}}

## Working with an open case

Selecting a row in the cases overview expands the case in place. The
expanded view is split in two columns: the **video column** on the left
plays the recordings attached to the case, and the **details column** on
the right groups the metadata, comments and additional files.

### Playlist and attachments

The details column has two tabs at the top:

- **Playlist** — lists every recording attached to the case. Selecting a
  row loads it in the player, and the *Autoplay next* toggle continues to
  the next recording when the current one ends. The three-dots menu on
  each row exposes per-recording actions:
  - **Open media detail** — opens the recording's full detail page.
  - **Edit video** — opens the face redaction editor on that recording
    (see the [face redaction documentation]({{< ref "/docs/hub/pipeline" >}})
    for details).
- **Attachments** — additional files attached to the case (PDF reports,
  photos, witness statements, exported clips, …). Files can be added by
  clicking the **Upload** button or by **dragging them onto the panel**.
  Once uploaded, every attachment can be renamed or deleted from the row's
  inline actions.

{{< figure src="hub-cases-attachments.png" alt="The Attachments tab of an open case with the drag-and-drop upload area and a list of attached files." caption="The Attachments tab lets you add supporting files to a case via drag-and-drop or the upload button." class="stretch">}}

### Details, labels, assignees and retention

The lower part of the details column gathers the case metadata:

- **Description** — the reporter (the user who created the case) can edit
  the description in place by clicking the pencil icon next to their name.
- **Labels** — labels can be added or removed using the pencil icon next to
  the labels row. Clicking a label filters the cases overview on it.
- **Assignees** — the list of users responsible for following up. The
  *notify assignees* toggle and the pencil icon are only shown to users
  allowed to manage the case (see *Permissions* below).
- **Visibility** — switches the case between *Public* (visible to all users
  in the account) and *Private* (visible to its assignees only). Same
  permission rules as the assignees.
- **Retention** — shows when the case will be automatically removed from
  Hub, based on the **Retention date** picked at creation or the
  `DEFAULT_TASK_RETENTION_DAYS` fallback (see *Creating a case* above).
  *No expiry set* is shown when the case is kept indefinitely.

### Comments

The **Comments** tab on the right of the *Details* tab keeps a chronological
log of the discussion around the case. Every assignee — and every user with
access to the case — can post a comment from the input at the bottom of the
tab.

### Permissions

Some controls on the expanded case are only available to specific users.
These checks mirror the same rules applied by the API:

- **Manage membership** — toggling the *visibility*, editing the
  *assignees* list and changing the *notify assignees* flag is restricted
  to the case's **reporter**, account **admins** and the account **owner**.
- **Delete the case** — the **Delete** button at the bottom of the open
  case is only shown to the case's **reporter**, account **admins** and the
  account **owner**.

Other users keep read-only access to the same information: they can play
the recordings, browse the attachments, read the description and post
comments, but cannot change the case's membership or delete it.

### Action bar and status transitions

The bottom of the expanded case exposes an action bar split in two halves:

**Left side — case-wide actions**

- **Delete** — removes the case (see *Permissions* above).
- **Download** — once the archiving job has completed, downloads a single
  compressed archive (`.zip`) containing every recording attached to the
  case.
- **Open sequence** — when the case was created from a sequence of
  recordings, jumps to the corresponding entry on the *Recordings* page.
- **Open detail** — opens the dedicated case detail page (see *Case detail
  page* below).

**Right side — status transitions**

- **Open case** — re-opens the case (visible when the case is currently
  *Approved* or *Rejected*).
- **Reject** — marks the case as *Rejected*.
- **Approve** — marks the case as *Approved*.

Changing the status updates the icon on the row in the cases overview and
is recorded in the case activity log.

## Case detail page

In addition to the inline expanded view, every case also has a dedicated
detail page reachable at `/cases/<id>` (or via the **Open detail** button
in the action bar). It shows the same playlist, attachments, details and
comments, but in a full-page layout that is better suited to long
investigations and to sharing the URL with co-workers.

{{< figure src="hub-cases-detail.png" alt="The dedicated case detail page with the Actions menu open in the top-right." caption="The dedicated case detail page. The Actions menu in the top-right gathers every case-wide operation: reopen, approve, reject, open sequence, download, share and delete." class="stretch">}}

The page reuses the *Details* and *Comments* tabs from the inline view and
adds an **Actions** menu in the top-right of the page header. The menu
gathers every case-wide operation in one place:

- **Reopen** / **Approve** / **Reject** — same status transitions as the
  inline action bar.
- **Open sequence** — only shown when the case was created from a
  sequence.
- **Download video** — downloads the compressed archive of the case
  recordings (only shown once the archive is ready).
- **Share case** — opens the *Share case* modal described below.
- **Delete** — removes the case. Note that on the detail page **Delete is
  restricted to account admins and the account owner** — the case's
  reporter cannot delete from here, only from the inline action bar.

## Sharing a case

The **Share case** action on the case detail page opens a modal that lets
you invite external users (typically people without a Hub account, such as
law-enforcement officers or insurance agents) to review the case via a
time-limited link.

{{< figure src="hub-cases-share.png" alt="The Share case modal with an email input, expiry selector and the list of existing shares." caption="The Share case modal lets you invite external reviewers to a case via a time-limited link, and revoke any existing shares." class="stretch">}}

To create a new share:

1. Enter the **email address** of the person you want to give access to.
2. Pick an **expiry** for the link — *1 hour*, *24 hours* or *7 days*.
3. Click **Send invite**. Hub generates a unique share link
   (`/share/<token>`) and a one-time **verification code**, and emails
   both to the recipient. After clicking the link, the recipient must
   enter that code to open the case. The new share is added to the
   *Existing shares* list below.

The *Existing shares* section lists every active invitation with the
recipient's email and the expiry date. Clicking the trash icon on a row
revokes that share immediately — the link and verification code can no
longer be used to open the case.

> **Note:** Shared links only grant access to the case itself (recordings,
> attachments, description). They do not give the recipient access to the
> rest of your Hub account, and they require both the link and the
> verification code from the invite email to open the case.

## Configuration

To start using cases some configurations need to be enabled on Vault and Hub, before you can use it.

### Create archive storage provider in Vault

To use cases and the archiving process, an additional storage provider must be created in Vault.

{{< figure src="add-storage-provider.png" alt="Create a new storage provider for archiving in Vault." caption="Create a new storage provider for archiving in Vault." class="stretch">}}

To set the archiving retention period, a new Vault account must be created, since the retention period is defined at the account level. Recordings copied to the archive storage provider will inherit the retention period from this account.

{{< figure src="add-account.png" alt="Define a retention period in a new Vault account." caption="Define a retention period in a new Vault account." class="stretch">}}

### Define archive provider and account in Hub

Now that your Vault instance is configured for archiving, you need to tell Hub where to archive recordings — which provider and account to use. Open the [`values.yaml`](https://github.com/kerberos-io/helm-charts/blob/main/charts/hub/values.yaml#L136-L142) and locate the `kerberosvault` section. Here you will find the `archive` property.

    # We have a Vault component installed which contains all the
    # recordings. Vault is queried to retrieve the recordings
    # from the appropriate provider.
    kerberosvault:
    uri: "https://api.storage.yourdomain.com"
    accesskey: "xxx"
    secretkey: "xxx"
    provider: "a-provider"

    # Archiving is used when creating a case. The underlying recording of the case will be copied from its
    # existing provider to the below archived provider. Seperate credentials are used, as it makes possible to
    # specify another retention period.
    archive:
        accesskey: "xxx"
        secretkey: "xxx"
        provider: "an-archive-provider"

Set the `accesskey` and `secretkey` of your newly created Vault account, and specify the name of the archive `provider`. Then apply the updated helm chart.