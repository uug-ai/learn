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

There are many situations where you may want to retain specific recordings for future inspection, or simply because an event is important. By archiving a recording, it is copied to a separate storage provider in Vault with a longer or non-expiring retention period — for example, 3 years or more.

Cases are the mechanism in Hub to trigger this archiving process. Once a case is created, the associated recording is copied from the current storage provider to the designated archive storage provider in Vault.

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

There are also two other entry points to the same modal:

- From the **Recordings** page header, the **Create case** button creates a
  case from the currently active filters (useful to attach multiple
  recordings at once).
- From the **Watchlist**, every notification row exposes an **Add Case**
  action that pre-fills the modal with the notification's recording.

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