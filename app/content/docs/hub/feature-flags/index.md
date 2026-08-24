---
title: "Feature flags"
description: "Configure Hub user-interface features and understand related service switches."
lead: "Configure Hub user-interface features and understand related service switches."
date: 2026-08-24T00:00:00+00:00
lastmod: 2026-08-24T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 303.5
toc: true
---

Hub frontend feature flags control which pages, controls, and optional data sources are available to users. They do not grant permissions and they do not start backend services. Roles and resource authorization still apply after a feature is visible.

This page covers every product-facing boolean flag understood by the current Hub frontend and the related backend switches operators commonly need with them. Infrastructure toggles such as TLS, telemetry, ingress, persistence, and storage-provider settings remain in the Helm chart reference because they configure the deployment rather than a Hub product feature.

For Helm installations, set flags below `kerberoshub.frontend.features` in your values file. The chart renders them as environment variables for the frontend container, and its startup script writes them to `window.env`.

```yaml
kerberoshub:
  frontend:
    features:
      case:
        enabled: "true"
      videoEdits:
        enabled: "true"
      faceRedaction:
        enabled: "true"
        classifierTracksEnabled: "false"
```

Use quoted `"true"` and `"false"` values for frontend flags unless the chart field is documented as a native boolean.

## General and navigation

| Helm value | Container environment variable | Default | Effect |
| --- | --- | --- | --- |
| `kerberoshub.frontend.features.splashScreen.enabled` | `FEATURE_SPLASH_SCREEN_ENABLED` | `"true"` | Shows the pre-bootstrap splash screen. |
| `kerberoshub.frontend.features.darkModeEnabled` | See [known exposure gaps](#known-exposure-gaps) | `"true"` | Shows the dark-mode toggle. |
| `kerberoshub.frontend.features.case.enabled` | `FEATURE_CASE_ENABLED` | `"true"` | Enables case-management navigation, routes, and case actions. |
| `kerberoshub.frontend.features.workflows.enabled` | `FEATURE_WORKFLOWS_ENABLED` | `"false"` | Enables workflow pages and navigation. This does not start the workflow engine. |
| `kerberoshub.frontend.features.floorplan.enabled` | `FEATURE_FLOORPLAN_ENABLED` | `"true"` | Enables floor-plan functionality in the frontend. |
| `kerberoshub.frontend.features.i18n.enabled` | `FEATURE_I18N_ENABLED` | `"true"` | Shows the language switcher. When disabled, Hub always uses `i18n.defaultLanguage`. |
| `kerberoshub.frontend.features.devices.hideAgent` | `FEATURE_DEVICES_HIDE_AGENT` | `"false"` | Hides the Add Agent control on the Devices page when set to `"true"`. |

## Organisations and projects

The organisation and project flags form a hierarchy:

1. When `organisations.enabled` is explicitly `"true"` or `"false"`, it controls the complete organisation feature family, including projects.
2. When `organisations.enabled` is empty, organisation child flags apply independently and `projects.enabled` becomes the project-group switch.
3. When both group flags are empty, the individual project child flags apply.

| Helm value | Container environment variable | Default | Effect |
| --- | --- | --- | --- |
| `kerberoshub.frontend.features.organisations.enabled` | `FEATURE_ORGANISATIONS_ENABLED` | `""` | Optional umbrella for organisation and project controls. |
| `kerberoshub.frontend.features.organisations.switcherEnabled` | `FEATURE_ORGANISATION_SWITCHER_ENABLED` | `"false"` | Makes the current organisation selector interactive. Disabled mode still shows the active organisation as context. |
| `kerberoshub.frontend.features.organisations.creationEnabled` | `FEATURE_ORGANISATION_CREATION_ENABLED` | `"false"` | Shows organisation creation inside the switcher; requires the switcher. |
| `kerberoshub.frontend.features.organisations.settingsEnabled` | `FEATURE_ORGANISATION_SETTINGS_ENABLED` | `"false"` | Allows eligible administrators and owners to open organisation settings. |
| `kerberoshub.frontend.features.projects.enabled` | `FEATURE_PROJECTS_ENABLED` | `""` | Project-group switch used when the organisation umbrella is unset. |
| `kerberoshub.frontend.features.projects.switcherEnabled` | `FEATURE_PROJECT_SWITCHER_ENABLED` | `"false"` | Shows the project selector beneath the organisation context. |
| `kerberoshub.frontend.features.projects.creationEnabled` | `FEATURE_PROJECT_CREATION_ENABLED` | `"false"` | Enables project creation when that UI is available. |
| `kerberoshub.frontend.features.projects.settingsEnabled` | `FEATURE_PROJECT_SETTINGS_ENABLED` | `"false"` | Enables project settings when that UI is available. |

## Live view

| Helm value | Container environment variable | Default | Effect |
| --- | --- | --- | --- |
| `kerberoshub.frontend.features.liveview.hlsEnabled` | `FEATURE_HLS_ENABLED` | `"true"` | Offers HLS as a LIVE transport. Disabling it removes HLS from transport selection. |
| `kerberoshub.frontend.features.liveview.moqEnabled` | `FEATURE_MOQ_ENABLED` | `"false"` | Offers Media over QUIC (MoQ) as a LIVE transport. A relay URL and compatible Agent are also required. |

`liveStreamMode`, `defaultStreamMode`, `paginationMode`, `pageSize`, and `maxStreams` configure behavior but are not on/off feature flags. See the chart values for those settings.

## Video editing and face redaction

| Helm value | Container environment variable | Default | Effect |
| --- | --- | --- | --- |
| `kerberoshub.frontend.features.videoEdits.enabled` | `FEATURE_VIDEO_EDITS_ENABLED` | `"false"` | Umbrella for in-app video editing tools, including face redaction. |
| `kerberoshub.frontend.features.faceRedaction.enabled` | `FEATURE_FACE_REDACTION_ENABLED` | `"false"` | Enables the face-redaction tool. `videoEdits.enabled` must also expose the edit surface. |
| `kerberoshub.frontend.features.faceRedaction.classifierTracksEnabled` | `FEATURE_FACE_REDACTION_CLASSIFIER_TRACKS_ENABLED` | `"true"` | Makes legacy classifier/analysis tracks available as a redaction starting point. When disabled, saved edits, detection runs, manual box drawing, and submission remain available. |

These flags expose frontend controls only. Rendering redacted recordings still requires the redaction workflow and worker to be configured.

## Media filters

All media filter flags default to `"true"`. Disabling one removes that filter control; it does not delete or change existing data.

| Helm value | Container environment variable | Effect |
| --- | --- | --- |
| `kerberoshub.frontend.features.media.filter.date.enabled` | `FEATURE_MEDIA_FILTER_DATE_ENABLED` | Date filtering. |
| `kerberoshub.frontend.features.media.filter.sites.enabled` | `FEATURE_MEDIA_FILTER_SITES_ENABLED` | Site filtering. |
| `kerberoshub.frontend.features.media.filter.groups.enabled` | `FEATURE_MEDIA_FILTER_GROUPS_ENABLED` | Group filtering. |
| `kerberoshub.frontend.features.media.filter.devices.enabled` | `FEATURE_MEDIA_FILTER_DEVICES_ENABLED` | Device filtering. |
| `kerberoshub.frontend.features.media.filter.objectDetection.enabled` | `FEATURE_MEDIA_FILTER_OBJECT_DETECTION_ENABLED` | Object-detection filtering. |
| `kerberoshub.frontend.features.media.filter.star.enabled` | `FEATURE_MEDIA_FILTER_STAR_ENABLED` | Starred-recording filtering. |
| `kerberoshub.frontend.features.media.filter.region.enabled` | `FEATURE_MEDIA_FILTER_REGION_ENABLED` | Region filtering. |
| `kerberoshub.frontend.features.media.filter.sort.enabled` | `FEATURE_MEDIA_FILTER_SORT_ENABLED` | Sort controls. |
| `kerberoshub.frontend.features.media.filter.category.enabled` | `FEATURE_MEDIA_FILTER_CATEGORIES_ENABLED` | Marker category filtering. |
| `kerberoshub.frontend.features.media.filter.markers.enabled` | `FEATURE_MEDIA_FILTER_MARKERS_ENABLED` | Marker filtering. |
| `kerberoshub.frontend.features.media.filter.events.enabled` | `FEATURE_MEDIA_FILTER_EVENTS_ENABLED` | Event filtering. |
| `kerberoshub.frontend.features.media.filter.tags.enabled` | `FEATURE_MEDIA_FILTER_TAGS_ENABLED` | Tag filtering. |

`media.filter.defaultView` selects the initial media view and is not a boolean feature flag.

## Runtime-only frontend flags

The frontend understands the following environment variables, but the current Hub chart does not expose matching values in `kerberoshub.frontend.features`. They require custom deployment wiring until chart support is added.

| Container environment variable | Frontend default | Effect |
| --- | --- | --- |
| `FEATURE_MARKERS_ENABLED` | `false` | Enables the marker analytics page and navigation. |
| `FEATURE_MEDIA_CREATE_CASE_ENABLED` | `true` | Enables creating a case from selected media; case management must also be enabled. |
| `FEATURE_MEDIA_DESCRIPTION_ENABLED` | `true` | Enables recording descriptions. |

`OPENAI_ENABLED` is supplied by the chart's top-level `openai.enabled` value. It enables frontend semantic-search integration and requires the corresponding backend configuration.

## Backend and deployment switches

These switches are related to features but are not frontend flags:

| Helm value | Default | Effect |
| --- | --- | --- |
| `kerberoshub.workflows.enabled` | `false` | Deploys/enables the workflow engine and tees eligible analysis events to it. This is separate from `frontend.features.workflows.enabled`. |
| `kerberoshub.services.<operation>.enabled` | varies | Deploys an optional workflow stage worker. The workflow engine and a matching workflow definition are also required. |
| `kerberoshub.support.enabled` | `false` | Enables the Hub support integration. |
| `kerberoshub.oauth2Proxy.enabled` | `false` | Enables the Hub OAuth2 proxy. |
| `admin.oauth2Proxy.enabled` | `false` | Enables the Admin OAuth2 proxy. |
| `openai.enabled` | `false` | Enables OpenAI-backed integration and supplies `OPENAI_ENABLED` to the frontend. |

Some components use replica counts rather than an `enabled` flag; setting replicas to zero disables those deployments.

## Known exposure gaps

- The frontend consumes `FEATURE_DARK_MODE_ENABLED`, while the current chart template emits `FEATURE_DARK_MODE`. Until those names are aligned, `kerberoshub.frontend.features.darkModeEnabled` does not reliably control the frontend through the standard chart.
- Runtime-only flags listed above are valid frontend inputs but are not currently mapped by the Hub chart.
- A visible control never replaces backend authorization. Users still need the required role, permissions, organisation membership, and project scope.

## Applying changes

After changing Helm values, upgrade the release and allow the frontend pod to restart so its startup script regenerates `env.js`.

```bash
helm upgrade hub kerberos/hub \
  --namespace kerberos-hub \
  --reuse-values \
  --set-string kerberoshub.frontend.features.faceRedaction.classifierTracksEnabled=false
```

For GitOps installations, commit the value change to the environment repository instead of running `helm upgrade` directly.
