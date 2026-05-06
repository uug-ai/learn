---
title: "Manage cases"
description: "Group recordings into investigable cases and follow them up with the right people."
lead: "Group recordings into investigable cases and follow them up with the right people."
date: 2026-05-06T00:00:00+00:00
lastmod: 2026-05-06T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    identifier: "manage-cases"
    name: "Manage cases"
    parent: "hub"
weight: 360
toc: true
---

A **case** in Kerberos Hub is a lightweight container around one or more
recordings that need follow-up: an incident worth investigating, footage that
needs to be exported and shared with a third party, or simply a clip that is
relevant enough to keep separate from the regular media stream.

Cases live next to your media so that operators can mark something for
processing without having to leave the recording they are reviewing.

## The cases overview

The cases overview is reachable from the main sidebar, under **Cases**. It
shows every case currently assigned to your account, together with the
recordings attached to it, the assignee, and any labels.

{{< figure src="hub-cases-list.png" alt="The cases overview lists every case in your account." caption="The cases overview lists every case in your account." class="stretch">}}

When no cases have been created yet, an empty-state placeholder invites you to
go to the media section and create your first case from a recording.

## Creating a case

Cases are always created from an existing recording. Open a notification in
the **Watchlist** (or any recording in the **Media** page), and press the
**Create case** action. A modal opens where you can pick the media to attach
and add a short title.

{{< figure src="hub-cases-create.png" alt="The Create case modal opened from a recording." caption="Create a new case directly from a recording." class="stretch">}}

After confirming, Kerberos Hub creates the case and shows a confirmation
banner with a direct link back to the cases overview.

{{< figure src="hub-cases-created.png" alt="Confirmation that a case was created for the recording." caption="A confirmation banner links back to the cases overview." class="stretch">}}

## Keeping the screenshots up to date

The screenshots on this page are produced by the Playwright scripts in
[`learn/playwright`](https://github.com/uug-ai/learn/tree/main/playwright).
Re-running the script logs in to a Hub instance, navigates to the cases page
and to the create-case flow, and overwrites the PNG files in this folder.

```bash
cd learn/playwright
npm install
npx playwright install chromium
cp .env.example .env   # fill in HUB_BASE_URL / HUB_USERNAME / HUB_PASSWORD
npm run cases
```

See the [README](https://github.com/uug-ai/learn/tree/main/playwright)
for the full list of available scripts and how to add new topics.
