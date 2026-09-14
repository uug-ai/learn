---
title: "Media"
description: "Inspect, open and remove recordings stored through Vault."
lead: "Operate stored recordings from the paginated Media page."
date: 2026-09-13T00:00:00+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 307
toc: true
---

The authenticated **Media** page lists recording metadata from MongoDB and
loads rows with server-side pagination. Change **Rows per page** to control the
page size; changing it returns to the first page. **Refresh** reloads the current
page.

Each row identifies the recording, account, provider, camera, and recording
time. Open a recording to stream it through the account and provider associated
with that media row.

## Delete recordings

Select individual rows or use the header checkbox to select the current page.
Selections remain active while you move between pages. The action bar shows the
total number selected.

Select **Delete**, then type `DELETE` exactly to confirm. Vault deletes each
selected provider object and its MongoDB media row. The requests run
concurrently and the list refreshes after all requests finish.

Deletion is permanent. If only some items fail, successful items disappear and
the failed rows remain selected so you can inspect the error and retry. Common
causes include changed provider credentials, unavailable object storage, or an
account that no longer grants access to the provider.

Automatic age-based removal is configured separately through
[Retention and cleanup](/docs/vault/recycle/).