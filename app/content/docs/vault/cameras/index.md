---
title: "Cameras"
description: "Monitor cameras that have reported to Vault and remove stale entries."
lead: "Review connectivity, heartbeat age and Agent version."
date: 2026-09-13T00:00:00+00:00
lastmod: 2026-09-13T00:00:00+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 308
toc: true
---

The authenticated **Cameras** page lists Agents that have reported device
analytics to Vault. Use the name filter to find a camera. The table shows its
online state, latest heartbeat age, and Agent version.

Vault considers a camera online when its latest heartbeat is less than three
minutes old. A camera with no heartbeat displays **Never**.

## Remove stale cameras

Only offline cameras can be deleted. Online cameras have disabled selection
controls to prevent accidental removal of an active device.

For one camera, select its **Delete** action and enter the camera name shown in
the confirmation dialog. For bulk deletion, select offline cameras on one or
more pages, select **Delete**, and type `DELETE` exactly. Selection can persist
across the client-side pages; the select-all checkbox applies only to offline
cameras on the current page.

Deleting a camera removes its device record. It does not delete that camera's
stored recordings. Use the [Media page](/docs/vault/media/) or retention policy
for recording removal.