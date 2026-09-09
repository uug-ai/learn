---
title: "Floor plans"
description: "Place cameras on site floor plans in Kerberos Hub."
lead: "Upload a floor plan and place site cameras where they are installed."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-09-09T00:00:00+00:00
draft: false
images: []
tags: [Floor plans]
menu:
  hub:
    parent: "hub"
weight: 309
toc: true
---

Floor plans provide an indoor view of a site. Upload a building plan, place the
site's cameras on it, and use their position and field of view to understand
which areas each device covers.

Floor plans are managed from a site's detail page rather than from a separate
top-level route.

> [!NOTE] Feature flag
> Floor-plan controls are available when the deployment enables the Floor plans
> feature. See [Feature flags]({{< ref "/docs/hub/feature-flags" >}}) for the
> deployment's current frontend settings.

## Create a floor plan

1. Open **Sites** and select a site.
2. Open the floor-plan section and choose **Add floor plan**.
3. Enter a name that is unique within the site.
4. Select a PNG or JPEG image no larger than 10 MiB.
5. Save the floor plan.

Use a clean, correctly oriented plan with enough resolution to distinguish
rooms, entrances, and corridors. The image is fitted inside the available
canvas without stretching its aspect ratio. Portrait plans remain centred
rather than increasing the page height indefinitely.

## Place cameras

Add a device from the current site to the plan, then move its marker to the
camera's installed position. Adjust its direction and field of view when those
controls are available, and save the placement.

Placements use relative image coordinates, so their positions remain stable as
the browser or plan canvas changes size. A device can appear only once on the
same floor plan and must belong to that site.

Removing a placement removes only the marker from the plan. It does not delete
or disconnect the device.

## Edit or replace a plan

You can rename an existing floor plan or replace its image. A name-only update
keeps the current image and placements. When replacing an image, review every
camera position afterward because the new plan may use a different crop,
orientation, or aspect ratio.

Deleting a floor plan also removes its saved placements. It does not delete the
devices. Images stored externally are cleaned up asynchronously, so storage
removal can complete shortly after the plan disappears from Hub.

## Image storage

New images are uploaded as files. Depending on the deployment, Hub stores the
asset in Vault and returns a temporary signed URL, or keeps a legacy inline
image. Both formats remain readable, so existing floor plans do not require a
data migration.

External image providers must allow cross-origin image requests from the Hub
address. The floor-plan canvas cannot display a remote image when its storage
provider blocks that origin.

## Access

Floor plans inherit access from their site. Users see plans and devices only for
sites available in their current account and project context. Management
actions use the site's existing edit permissions.

## Troubleshooting

- **The image is rejected.** Use a PNG or JPEG no larger than 10 MiB.
- **The image uploads but the canvas is blank.** Check the Vault or object-store
  CORS policy and confirm that it permits the Hub origin.
- **A device cannot be added.** Confirm that it belongs to the current site and
  is not already placed on this floor plan.
- **Markers moved after replacing the image.** Reposition them against the new
  image; placements cannot infer changes in crop or orientation.
- **A deleted image remains in storage briefly.** External asset cleanup runs
  asynchronously and retries transient storage failures.