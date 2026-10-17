---
title: "Video wall"
description: "Create, arrange, and share a controlled live camera view in Kerberos Hub."
lead: "Give viewers access to selected cameras without exposing your entire Hub account."
date: 2026-10-17T00:00:00+00:00
lastmod: 2026-10-17T00:00:00+00:00
draft: false
images: []
tags: [Video wall, Live view]
menu:
  hub:
    parent: "hub"
weight: 304.5
toc: true
---

A **video wall** is a shareable live view of selected cameras. Use it for a
reception display, an operations screen, or a temporary monitoring link for
someone who should not have access to the rest of your Hub account.

## Introduction

Open **Video wall** in the Hub sidebar to reach `/videowall`. This is the
management page: create walls, choose their cameras, arrange the tiles, and
control when and how viewers can use them.

Opening a wall launches a separate viewer at `/wall/<link>`. The viewer shows
the cameras and controls configured for that wall, rather than the full Hub
navigation.

{{< figure src="hub-videowall-overview.png" alt="The video wall management page filtered to the All cameras demonstration wall." caption="Find a wall by name, review its camera scope and expiry, then open or edit it." class="stretch">}}

> [!IMPORTANT]
> A wall link grants access to live cameras. Treat it as an access credential,
> select only the cameras the recipient needs, and use a pass code and expiry
> for external or temporary access. Do not publish wall links in documentation
> or other public material.

## How it works

A wall stores its camera scope, layout, access settings, and optional schedule.
When a viewer opens its link, Hub checks whether the wall is active, within its
schedule, and unexpired, and requests its pass code if one is configured.

The camera selection can include individual devices, sites, and groups.
Selecting a site or group includes its devices; overlapping selections do not
create duplicate camera tiles. Review those memberships when access changes:
adding a device to a selected site or group can also make it part of the wall.

The tiles use the same stream components as
[Live view]({{< ref "/docs/hub/livestream" >}}). **Preview** uses lightweight
snapshots; **Live** uses the live transport available in your deployment.
A wall is not a recording archive or an evidence export. Use
[Recordings]({{< ref "/docs/hub/recordings" >}}) to investigate historical footage.

## Finding and managing walls

The overview separates walls into:

- **My Videowalls**: walls you created.
- **Assigned Videowalls**: walls created by someone else and assigned to you.
- **All Videowalls**: other walls visible to owners and administrators.

Search filters the lists by wall name. The sort selector offers name, active
status, and expiry ordering. Each row shows the wall's active status, name,
group and site counts, effective device count, expiry, and available controls.

Use the **eye** control or wall name to open the viewer in a new tab.
Use the **pencil** to edit a wall or the **trash** control to request deletion.
Deletion requires confirmation.

A wall with no expiry shows a dash in the expiry column. **Soon** identifies
an expiry within the next 72 hours; **Expired** identifies a link whose expiry
has passed. The overview disables opening an expired link. Edit its expiry
before distributing access again.

## Creating a video wall

Choose **Add videowall** to open the editor. When changing an existing wall,
use its pencil control. The same editor provides six tabs: **Videowall
Information**, **Devices**, **Layout**, **Permissions**, **Schedule**, and,
where allowed, **Share**.

Changes across these tabs are saved together with **Add videowall** or **Save**
at the bottom of the editor. **Cancel** closes the editor; if you have unsaved
changes, Hub asks whether to discard them.

### Videowall Information

{{< figure src="hub-videowall-information.png" alt="The video wall information tab with name, description, pass code, and selected-device summary." caption="The information tab identifies the wall and summarises its camera scope. Scroll down for expiry, activation, and display settings." class="stretch">}}

| Field | Behaviour |
| --- | --- |
| **Name** | Required. Choose a descriptive name that is not already used by another wall in the same scope. |
| **Description** | Required. Explain the purpose of the wall and its intended audience. |
| **Pass code** | Optional, up to 12 characters. Viewers of a protected link must enter it to open the wall. |
| **Link expiry date** | Optional. An unset expiry means there is no explicit link-expiration date. |
| **Videowall Active** | Enables or temporarily disables access without deleting the wall. |
| **Show filter** | Shows or hides the viewer's top filter and display-control bar. |
| **Default viewing mode** | Starts the wall in Preview or Live. Live is still limited by the wall's viewing permission. |

The **Permissions overview** summarises the selected groups, sites, and devices.
Use the **Devices** tab to change that selection.

> [!TIP]
> For an unattended display, select a clear layout and decide whether viewers
> need the top filter bar. For a temporary external viewer, configure a pass
> code, expiry, and restricted permissions before sharing the link.

### Devices

{{< figure src="hub-videowall-devices.png" alt="The Devices tab with group, site, and individual device assignments." caption="Choose cameras directly or include the devices belonging to selected groups and sites." class="stretch">}}

Use the group, site, and device pickers to define the wall's scope. Individual
devices already included through a site or group may appear locked or inherited.
Remove the parent selection to stop including its devices; unchecking an
individual device cannot undo inclusion through a selected site or group.

Check the effective camera list before sharing. A wall with no selected or
resolved devices has nothing to display, even if its name and description are
valid.

### Layout

{{< figure src="hub-videowall-layout.png" alt="The Layout tab with camera tile previews, tile-shape options, and column controls." caption="Arrange the shared layout in the editor, then save it for everyone who opens the wall." class="stretch">}}

Select cameras first, then use **Layout** to arrange them:

1. Choose **1, 2, 3, or 4 columns**.
2. Set **Tile shape** to **16:9**, **4:3**, or **1:1**.
3. Drag a tile using its grip to change the order.
4. Drag its corner handle to make it span more columns or rows.
5. Save the wall to persist the arrangement.

Tile spans are measured in grid cells. A larger tile can emphasise an entrance
or another important camera while keeping secondary views smaller. Walls saved
before tile shape was introduced use 16:9 by default.

The layout editor can show live camera previews, so unavailable devices may
appear offline while you arrange them. Layout editing does not repair a device
connection or change its recording settings.

### Permissions

{{< figure src="hub-videowall-permissions.png" alt="The Permissions tab showing live-view, pan-tilt-zoom, and input-output access levels." caption="Give viewers only the live-view and device-control capabilities they need." class="stretch">}}

The wall has three capability settings:

| Setting | Available access levels |
| --- | --- |
| **Live view** | No permissions; Preview only; Preview and Live. |
| **Pan/Tilt - Zoom** | No permissions; Zoom; Pan and Tilt; PTZ; PTZ and presets. |
| **Input/output** | No permissions; permission to trigger input/output. |

These settings govern the capabilities offered through the wall. Device
support and configuration still matter: granting PTZ cannot make a fixed camera
move, and input/output controls require a device with the corresponding
capability.

If viewing is limited to Preview, choosing Live as the default does not bypass
that restriction.

### Schedule

{{< figure src="hub-videowall-schedule.png" alt="The Schedule tab with time ranges for each day of the week." caption="Restrict the wall to weekly access windows, or leave the schedule untouched for continuous availability." class="stretch">}}

Use the weekly sliders to select the time ranges during which the wall may be
opened. Leaving the schedule untouched keeps it always available. Once a
schedule is configured, a day with no selected ranges denies access on that
day.

Check the schedule's configured timezone as well as the day and time ranges
when investigating an access problem. The schedule applies to authenticated
and external viewers alike.

Active status, schedule, and expiry are independent: a wall must pass all
three checks. Extending the expiry does not override an inactive wall or an
out-of-hours schedule.

### Share

{{< figure src="hub-videowall-share.png" alt="The Share tab with an Assign users picker." caption="Assign the wall to Hub users so they can find it in their Assigned Videowalls list." class="stretch">}}

Use **Assign users** to select the Hub users who should see the wall in their
assigned list. This is different from distributing its standalone viewer link.
The Share tab is not available to editors, who cannot change user assignments.

After saving, open the wall from the overview and distribute its viewer URL
privately when external access is intended. Send any pass code through an
appropriate separate channel. Do not assume that assignment alone makes an
otherwise unprotected viewer link private.

Changes to a pass code or expiry can update the generated link. Reopen the wall
from the overview after changing access settings and distribute the current URL
rather than reusing a previously copied one.

## Using the standalone viewer

Opening a wall launches a camera grid without the Hub sidebar. If a pass code
is configured, enter it first. A deployment with encrypted streams may also
require an encryption passphrase; this is separate from the wall's pass code.

When **Show filter** is enabled, the top bar provides:

- Search by camera name and filters for site, device, and status.
- **Preview / Live** switching within the permitted access level.
- Tile-shape and grid-column controls.
- A connection indicator and a theme switch.

Camera controls depend on the configured permissions and device capabilities.
The connection indicator reports the viewer's broker connection, not a
guarantee that every camera is online or that every live transport is working.

Viewers can drag or resize tiles for their own session. These adjustments do
**not** overwrite the shared layout. To change the arrangement for everyone,
return to the authenticated editor's **Layout** tab and save the wall.

> [!NOTE]
> A wall only exposes its configured camera scope. It does not provide the
> general Hub account navigation, recording search, case management, or device
> administration.

## Roles and access

Access to the management page requires the relevant page permission.
Within that page:

| Role | Management behaviour |
| --- | --- |
| **Owner / Admin** | Can manage walls visible within their authorised scope, including walls created by other users. |
| **Editor** | Can create and manage their own walls, but cannot change user assignments. |
| **Guest** | Read-only; can open walls available to them, but cannot create, edit, or delete walls. |

Other non-administrator roles can manage their own walls where permitted.
Being assigned to another user's wall does not by itself grant edit or delete
access. See [Roles]({{< ref "/docs/hub/roles" >}}) for account permissions.

Disabling or deleting a wall removes future access through that wall; it does
not delete the cameras or their recordings.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| A wall does not appear | Clear the name search, check the active organisation/project and your page permissions, and confirm any user assignment. |
| Add, edit, delete, or Share is missing | Check your role, whether you created the wall, and whether user assignment is permitted. |
| Saving fails | Supply a non-empty name and description, use a unique name, keep the pass code within 12 characters, and inspect the displayed error. |
| The link is expired | Edit the expiry, save, and reopen the wall from the overview to obtain the current link. |
| The viewer says inactive or outside scheduled hours | Enable the wall and check the weekly ranges and schedule timezone. Expiry alone does not control these checks. |
| No cameras appear | Review Devices, inherited site/group membership, viewing permissions, and the wall's resolved camera scope. |
| Preview works but Live does not | Confirm that Preview and Live are allowed, then check the configured live transport and network connectivity. |
| PTZ or input/output is unavailable | Check the wall permissions as well as device support and configuration. |
| Viewer filters are missing | Enable Show filter in the wall's information settings and save. |
| A layout change disappears | Viewer adjustments are session-only. Make shared changes in the authenticated Layout tab and save. |

See [Live view]({{< ref "/docs/hub/livestream" >}}) for transport configuration
and stream troubleshooting.
