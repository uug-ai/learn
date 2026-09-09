---
title: "Maps"
description: "Locate sites on the Hub map and correct their saved coordinates."
lead: "Locate sites on the Hub map and keep each site's position accurate."
date: 2026-09-09T00:00:00+00:00
lastmod: 2026-09-09T00:00:00+00:00
draft: false
images: []
tags: [Maps]
menu:
  hub:
    parent: "hub"
weight: 308
toc: true
---

Hub places sites on a map using the coordinates saved with each site address.
The map gives operators a geographic overview of their locations, while the
site editor provides a precise way to correct a pin when an address lookup is
not accurate enough.

Open **Sites** in the Hub sidebar to view the map. Select a site to open its
details and edit its location.

## Add a site location

When creating or editing a site, start typing in the **Address** field and
choose a result from the place suggestions. Hub stores both the formatted
address and its latitude and longitude.

You can also use your browser's current location. The browser must have
permission to access your position, and the Hub must be served from a secure
origin for geolocation to work outside local development.

> [!NOTE]
> The address field depends on the Google Maps JavaScript and Places APIs. A
> deployer must configure a browser API key before address suggestions and
> reverse geocoding are available. See [Installation]({{< ref "/docs/hub/installation" >}}#google-maps-and-address-search).

## Use the sites map

The Sites overview displays every accessible site with valid coordinates.
Nearby sites are grouped as you zoom out so that overlapping pins remain
readable. Hover over a group to fan out its sites, or zoom in to separate them.
At the highest zoom level each site is shown individually.

A site pin uses the site's initials and colour. The overview map is read-only:
dragging or clicking it does not change a site's location.

## Fine-tune a site position

Use the location editor when the selected address points to the wrong entrance,
building, or part of a larger property:

1. Open the site and select **Edit site**.
2. Choose a valid address if the site does not have coordinates yet.
3. Expand the location control below the address field.
4. Pan and zoom until the fixed centre pin marks the correct position, or enter
   valid latitude and longitude values.
5. Save the site.

Changing the pin updates only the coordinates. Hub preserves the formatted
address and its other address metadata. Use **Reset** before saving to restore
the coordinates from the most recently selected address.

## Map layers

Hub uses separate light and dark base-map tile URLs so the map follows the
active theme. Deployers can also add one transparent XYZ overlay, for example a
site plan, property boundary, or specialist map layer.

The overlay supports a tile URL, attribution, minimum and maximum zoom,
opacity, and an optional browser-visible API key. Keys used by browser map
layers must be public and restricted to trusted Hub origins. Providers that
require secret headers need a server-side proxy instead.

## Access

The map shows only sites available in the current account and project context.
Editing a position uses the same access rules as editing the site; seeing a pin
does not grant permission to change it.

## Troubleshooting

- **Address suggestions do not appear.** Confirm that the Maps JavaScript API
  and Places API are enabled and that the browser origin is allowed by the API
  key restrictions.
- **A site is absent from the map.** Edit the site and select a valid address so
  its latitude and longitude are saved.
- **The pin is close but not exact.** Use the location editor instead of
  changing the formatted address.
- **Map tiles are blank.** Check the configured tile URL, attribution, API-key
  restrictions, and browser console for blocked requests.
- **A custom overlay does not load.** Confirm that its URL is configured and
  that the tile provider permits requests from the Hub origin.