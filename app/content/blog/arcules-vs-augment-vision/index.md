---
title: 'Milestone Arcules vs UUG: managed simplicity or architectural control?'
description: 'Two approaches to modern video management: how Arcules and UUG compare on deployment, storage, analytics, resilience and operational responsibility.'
date: '2026-11-18'
lastmod: '2026-11-18'
authors:
  - name: Cedric Verstraeten
    link: https://github.com/cedricve
    image: https://github.com/cedricve.png
images: ['social.png']
category: 'Comparison'
tags: ['Architecture', 'VSaaS', 'Video management']
header: 'header-art.svg'
artworkAlt: 'Milestone Arcules versus UUG, with the official Milestone and UUG wordmarks on black.'
toc: true
aliases:
  - /tutorials/hub/arcules-vs-augment-vision/
---

A central dashboard, remote playback and alerts are no longer enough to distinguish a video platform. The more consequential questions sit underneath: who runs it, where recordings live, what happens when connectivity fails, and how easily video becomes part of a wider application.

**Milestone Arcules and UUG approach those questions from different starting points.** Arcules packages video management as a cloud service. UUG separates capture, storage, fleet management and the application layer into components that can be composed around a deployment.

Both approaches can serve distributed camera estates. The better fit depends less on the label "cloud" or "AI" than on which responsibilities an organisation wants to delegate, and which architectural decisions it needs to retain.

{{< tutorial-panel tone="brand" icon="switch-horizontal" title="The short version" >}}
**Arcules** is a strong candidate when a team wants cloud-managed video operations with supported edge hardware and less central platform administration.

**UUG** is a strong candidate when storage placement, component-level control and custom processing are central requirements, with a clear operator or service provider responsible for the chosen stack.
{{< /tutorial-panel >}}

This is a first-party comparison from the team behind UUG, based on the product documentation linked below. It is not an independent benchmark, a claim of feature parity, or a claim that either platform is universally cheaper. Arcules features depend on its subscription, hardware and deployment mode; UUG features depend on the deployed components and service offering.

## What is actually being compared?

**[Arcules](https://www.milestonesys.com/products/arcules/)** is Milestone's cloud-based video surveillance as a service (VSaaS). It brings sites, cameras, recordings, users and alerts into web and mobile applications. Supported deployment models include gateway-connected cameras and Camera to Cloud devices.

Arcules is not **XProtect**, Milestone's separate VMS family. Milestone offers an Arcules/XProtect hybrid option, but XProtect editions, Smart Client and MIP SDK capabilities should not be assumed to be standard Arcules capabilities.

{{< figure src="arcules-views.webp" link="arcules-views.webp" alt="Arcules Views application showing four camera feeds and saved-view navigation" caption="Arcules Views, as shown in the [Arcules Knowledge Base](https://help.arcules.com/en/articles/2042903-views). Screenshot rights remain with their owner." class="blog-product-image" loading="lazy" width="1916" height="910" >}}

Select any application screenshot to view it at full size. These documentation examples are not a matched test deployment; interfaces vary by version and configuration.

**UUG** is the stack built around four responsibilities:

| Component | Role in the stack |
|---|---|
| [Agent](/docs/agent/first-things-first/) | Connects to and records one camera stream, with a local interface. |
| [Vault](/docs/vault/first-things-first/) | Receives recordings, persists them to configured storage and publishes integration events. |
| [Factory](/docs/factory/first-things-first/) | Deploys and configures Agents on Kubernetes. |
| [Hub](/docs/hub/first-things-first/) | Provides the shared workspace for devices, live view, recordings, alerts and workflows. |

{{< figure src="/docs/hub/analytics/hub-analytics-overview.png" link="/docs/hub/analytics/hub-analytics-overview.png" alt="UUG Hub application showing its analytics dashboard with device availability, counting and region metrics" caption="UUG Hub's analytics dashboard, showing device availability, counting and region metrics in an example deployment. Application screenshot from the [Hub analytics guide](/docs/hub/analytics/)." class="blog-product-image" loading="lazy" width="1450" height="750" >}}

These are building blocks, not four mandatory installations for every camera. Agent works independently; Factory becomes relevant for Kubernetes-based fleet management. Hosted Hub and a self-hosted stack also have different responsibility boundaries.

Commercially, Arcules combines the application and vendor-operated cloud service in a subscription. With UUG, costs and operating responsibilities depend on whether the deployment is hosted or self-managed.

## The comparison at a glance

| Dimension | Milestone Arcules | UUG |
|---|---|---|
| Starting point | A managed cloud video service. | A modular video platform with hosted and self-hosted options. |
| Camera connection | Supported cameras through a gateway, or supported Camera to Cloud devices without one. | An Agent per camera stream, with optional Factory-based fleet management. |
| Recording storage | Gateway cloud/local storage modes, plus Camera to Cloud edge/cloud options. | Local Agent recording and configured persistence, including Vault-backed storage. |
| Central operations | Cloud interface for sites, devices, users, health and investigations. | Hub provides central operations; responsibility for its services depends on the offering. |
| AI and model choice | Built-in analytics, rules and supported integrations; availability depends on the solution. | Bring your own AI models through custom workflow stages, with conditional processing and supported results returned to Hub. |
| Outage behaviour | Documented gateway recording and offline access, subject to retention and capacity. | Local Agent recording; persistence, retry and recovery depend on configuration. |
| Platform maintenance | Provider-managed cloud updates; site hardware and networking still need owners. | Provider-managed scope for hosted services, or team-managed services when self-hosted. |
| Main purchasing question | Does the supported service meet the operational requirements? | Does the chosen composition meet the requirements, and who will run it? |

## Managed simplicity versus component-level control

Arcules' main appeal is the service boundary. A customer consumes a centrally managed video application rather than assembling and maintaining its central software services. For organisations with many small locations and limited IT staff at each site, that can be a substantial advantage.

It does not eliminate infrastructure. Cameras, network switches, connectivity and, where used, gateways and local storage still exist. The benefit is moving much of the central platform lifecycle to the provider, not making every operational dependency disappear.

UUG makes the component boundaries more explicit. Capture runs in Agent; Vault handles persistence and integrations; Hub provides central application features; Factory manages Agents on Kubernetes. In a self-hosted deployment, those boundaries allow placement and lifecycle decisions to be made separately.

The trade-off is ownership. Running containers does not make database backups, broker capacity, storage monitoring or upgrade coordination someone else's problem. Hosted Hub can move some of that responsibility to a provider, but the exact scope needs to be established rather than inferred from the architecture.

**The practical difference is which decisions the organisation wants to own.** A managed service can reduce operational work; a composable stack can offer more control over how the system is assembled. Neither advantage is free of constraints.

{{< rete height="620" alt="Responsibility boundaries: Arcules manages the cloud application behind a site gateway; a self-hosted UUG operator runs Agent, Vault, Hub and optional Factory." caption="Two operating models, not equivalent deployments. This Arcules example uses a gateway; the UUG example is self-hosted and Vault-based. Factory manages Agents rather than forwarding recordings. Storage paths are detailed below." >}}
{
  "groups": [
    { "id": "site", "label": "Arcules: customer site", "x": 0, "y": 0, "w": 620, "h": 240 },
    { "id": "service", "label": "Arcules: managed cloud", "x": 660, "y": 0, "w": 340, "h": 240 },
    { "id": "selfhosted", "label": "UUG: self-hosted operator responsibility", "x": 0, "y": 280, "w": 1000, "h": 430 }
  ],
  "nodes": [
    { "id": "camera", "kind": "camera", "x": 30, "y": 80, "w": 220, "h": 120, "header": "CAPTURE", "title": "Cameras", "subtitle": "Supported models and streams" },
    { "id": "gateway", "kind": "agent", "x": 350, "y": 80, "w": 220, "h": 120, "header": "SITE HARDWARE", "title": "Gateway", "subtitle": "Connectivity and local disk" },
    { "id": "arcules", "kind": "hub", "x": 710, "y": 80, "w": 240, "h": 120, "header": "PROVIDER-MANAGED", "title": "Arcules service", "subtitle": "Cloud application lifecycle" },
    { "id": "factory", "kind": "factory", "x": 30, "y": 350, "w": 220, "h": 120, "header": "OPTIONAL MANAGEMENT", "title": "Factory", "subtitle": "Agent fleet on Kubernetes" },
    { "id": "agent", "kind": "agent", "x": 30, "y": 550, "w": 220, "h": 120, "header": "CAPTURE", "title": "Agent", "subtitle": "One camera stream" },
    { "id": "vault", "kind": "vault", "x": 350, "y": 550, "w": 220, "h": 120, "header": "PERSISTENCE", "title": "Vault", "subtitle": "Storage and integrations" },
    { "id": "hub", "kind": "hub", "x": 710, "y": 550, "w": 240, "h": 120, "header": "APPLICATION", "title": "Hub", "subtitle": "Devices, alerts and workflows" }
  ],
  "connections": [
    { "from": "camera", "to": "gateway", "label": "video" },
    { "from": "gateway", "to": "arcules", "label": "data" },
    { "from": "factory", "to": "agent", "fromSide": "bottom", "toSide": "top", "kind": "dashed", "label": "manage" },
    { "from": "agent", "to": "vault", "label": "recordings" },
    { "from": "vault", "to": "hub", "kind": "dashed", "label": "events" }
  ]
}
{{< /rete >}}

## Camera compatibility is more than a protocol checkbox

Arcules supports existing cameras through its gateway model and offers gateway-free connectivity for supported Camera to Cloud devices. The supported-device list for one path is not a guarantee of support for the other.

With UUG, Agent connects to a camera stream. RTSP availability is a starting point, but it does not establish that every camera function will work. ONVIF, PTZ, audio, codecs and browser playback have their own compatibility considerations.

For either platform, the meaningful unit of compatibility is **camera model, firmware, stream profile and required function**. "It displays video" is not equivalent to verified audio recording, reliable event handling, remote PTZ or the required export behaviour.

Arcules' [Camera to Cloud documentation](https://www.milestonesys.com/articles/what-is-arcules-camera-to-cloud/) describes supported Axis and i-PRO devices. The [Agent camera guide](/tutorials/agent/connect-any-camera/) describes the corresponding stream-based connection model.

## Cloud-managed does not mean cloud-only storage

Arcules offers more than one recording path. For gateway-connected devices:

- **Cloud storage / Pure Cloud:** video is buffered on the gateway and uploaded to cloud storage according to the recording configuration.
- **Local storage / Edge Cloud:** video remains on the gateway while metadata is sent to the cloud. Remote playback retrieves video through the cloud, and footage selected for cases can be archived there.

For **Camera to Cloud**, supported cameras record to SD storage and can optionally upload video to the cloud, while metadata supports cloud management, search and access.

This makes "Arcules stores everything in the cloud" an inaccurate generalisation. The chosen storage mode changes bandwidth use, failure dependencies and where footage remains available.

In a self-hosted, Vault-based UUG deployment, the recording path is **camera → Agent → Vault → configured storage**, with events published to the Hub integration. Factory is a management component, not a hop in the recording upload path. Live view also has separate media and signalling paths.

Vault's role is useful when an organisation needs control over its recording storage. But storage flexibility is not an automatic data-residency guarantee. Hub metadata, backups, exported evidence and external analytic requests must also be considered. A hosted offering needs its own assessment of these boundaries.

The useful comparison is therefore **the complete data path**, not simply "cloud versus edge."

{{< rete height="640" alt="Four recording paths: Arcules Pure Cloud buffers locally and uploads video; Edge Cloud keeps video on the gateway; Camera to Cloud uses camera SD storage with optional upload; UUG can upload Agent recordings through Vault to configured storage." caption="Storage placement changes the data path. These are separate deployment choices, not features assumed to be active together. Case archives, metadata, live view and backups require their own assessment." >}}
{
  "groups": [
    { "id": "pure", "label": "Arcules: Pure Cloud", "x": 0, "y": 0, "w": 1000, "h": 190 },
    { "id": "edge", "label": "Arcules: Edge Cloud", "x": 0, "y": 220, "w": 1000, "h": 190 },
    { "id": "ctc", "label": "Arcules: Camera to Cloud", "x": 0, "y": 440, "w": 1000, "h": 190 },
    { "id": "augment", "label": "UUG: Vault-based recording path", "x": 0, "y": 660, "w": 1000, "h": 190 }
  ],
  "nodes": [
    { "id": "pure-gateway", "kind": "agent", "x": 30, "y": 55, "w": 260, "h": 110, "header": "ON SITE", "title": "Camera + gateway", "subtitle": "Local recording buffer" },
    { "id": "pure-cloud", "kind": "storage", "x": 710, "y": 55, "w": 260, "h": 110, "header": "IN THE CLOUD", "title": "Arcules storage", "subtitle": "Uploaded recordings" },
    { "id": "edge-gateway", "kind": "storage", "x": 30, "y": 275, "w": 260, "h": 110, "header": "ON SITE", "title": "Gateway disk", "subtitle": "Video remains here" },
    { "id": "edge-cloud", "kind": "hub", "x": 710, "y": 275, "w": 260, "h": 110, "header": "IN THE CLOUD", "title": "Arcules service", "subtitle": "Metadata and remote access" },
    { "id": "ctc-camera", "kind": "camera", "x": 30, "y": 495, "w": 260, "h": 110, "header": "SUPPORTED CAMERA", "title": "Camera SD storage", "subtitle": "Edge recording" },
    { "id": "ctc-cloud", "kind": "hub", "x": 710, "y": 495, "w": 260, "h": 110, "header": "IN THE CLOUD", "title": "Arcules service", "subtitle": "Metadata; optional video" },
    { "id": "agent", "kind": "agent", "x": 30, "y": 715, "w": 230, "h": 110, "header": "CAPTURE", "title": "Agent", "subtitle": "Local recordings" },
    { "id": "vault", "kind": "vault", "x": 365, "y": 715, "w": 230, "h": 110, "header": "PERSISTENCE", "title": "Vault", "subtitle": "Upload endpoint" },
    { "id": "storage", "kind": "storage", "x": 710, "y": 715, "w": 260, "h": 110, "header": "CHOSEN BACKEND", "title": "Configured storage", "subtitle": "Placement is deployment-specific" }
  ],
  "connections": [
    { "from": "pure-gateway", "to": "pure-cloud", "label": "upload video" },
    { "from": "edge-gateway", "to": "edge-cloud", "kind": "dashed", "label": "metadata; video on request" },
    { "from": "ctc-camera", "to": "ctc-cloud", "kind": "dashed", "label": "metadata; optional video upload" },
    { "from": "agent", "to": "vault", "label": "upload" },
    { "from": "vault", "to": "storage", "label": "persist" }
  ]
}
{{< /rete >}}

## AI: packaged analytics versus custom-model workflows

Both platforms support analytics. Arcules advertises analytics, rules, investigation tools and integrations within its managed experience. The relevant question is whether the specific capability is supported by the proposed cameras, deployment and subscription.

**UUG's key AI differentiator is that your own models can become part of the video workflow.** [Hub workflows](/docs/hub/workflows/) connect recordings to processing stages and bring their outputs back into the application. The choice is not limited to enabling a predefined analytic: a team can integrate a specialist model it trained, an existing inference service or a vision-language model.

### What custom AI looks like in UUG

- **Bring your own models.** A model runs behind a [custom stage](/docs/hub/workflows/stages/) implemented as a worker, in Python, Go, Node.js or another suitable language. The worker can run inference itself or call a model-serving endpoint; Hub does not train the model or execute uploaded weights in the browser.
- **Chain AI stages.** Camera, site and schedule conditions select relevant recordings. Results from one stage can determine whether a later stage runs, so a specialist model need not process every clip.
- **Choose where inference runs.** Internal workers can run alongside a self-hosted Hub. [External stages](/docs/hub/workflows/external-stages/) connect customer-managed workers through RabbitMQ or HTTPS and return results through an authenticated callback. This allows inference infrastructure to be managed separately from the video application.
- **Bring results back into Hub.** Supported [result blocks](/docs/hub/workflows/ingest/blocks/) include detections, timeline markers and recording metadata updates such as descriptions. Stage outputs can also supply routing values for subsequent processing, rather than ending as an isolated notification in another system.

For example, a warehouse workflow could select recordings containing people, send them to a custom **PPE detector**, then attach a timeline marker to footage that needs review. Another worker could use a **vision-language model** to add a scene description. These are examples of applications a team can build, not a claim that every specialist model is included or prevalidated.

{{< figure src="/docs/hub/workflows/images/hub-workflow-designer.png" link="/docs/hub/workflows/images/hub-workflow-designer.png" alt="UUG Hub workflow designer application showing Recording classified connected to Forward to my system" caption="An example in UUG Hub's workflow designer: a recording event connected to the external-worker forwarder. The custom model runs in the connected service. [Source: External stages guide](/docs/hub/workflows/external-stages/)." class="blog-product-image" loading="lazy" width="1944" height="1328" >}}

Production workflow registration currently follows Helm deployment configuration; the visual designer is not yet the established production deployment path. The workflows engine and required workers must be enabled, as must the forwarder for external execution. Hosted availability depends on the service scope.

The practical trade-off is **packaged analytics versus control over the AI processing itself**. Arcules can be attractive when its supported analytics already solve the task. UUG is particularly relevant when the requirement is to embed an organisation's own models and connect their outputs to recording review and business processes. That control includes responsibility for model quality, inference capacity, retries, monitoring and support; it is not evidence that a custom model is automatically more accurate.

## Resilience depends on where the failure occurs

The strongest distinction is not "cloud systems stop recording" versus "edge systems keep working." Both statements hide the recording topology.

Arcules documents continued recording on a gateway during an internet outage, with **Offline Gateway Access** for local live and recorded viewing. Cloud-storage gateways upload buffered video after reconnection; local-storage gateways retain it locally. Available history is bounded by retention and disk capacity. This gateway behaviour should not be assumed to describe every Camera to Cloud scenario.

Agent can record locally independently of Hub connectivity. In a wider UUG deployment, local disk capacity, upload retry behaviour, persistence availability and subsequent Hub visibility determine how useful that independence is during an outage.

A WAN failure, camera power loss, edge-device failure and central-service outage are different failure domains. Local recording does not keep every cloud feature available, and central redundancy cannot recover footage a powered-off camera never produced.

Neither Kubernetes replicas nor a managed subscription alone establishes the required recovery time. The proposed architecture and service agreement must account for the actual failure.

{{< rete height="460" alt="A WAN outage interrupts remote service paths, but a powered Arcules gateway or Agent with working local storage can continue local recording. This does not cover camera, power or disk failure." caption="The failure boundary matters. This gateway example is Arcules Pure Cloud, not every Camera to Cloud scenario. For Agent, upload recovery and later Hub visibility depend on the deployment. Local recording still requires a working camera, power, network and disk." >}}
{
  "groups": [
    { "id": "local", "label": "Site: local recording dependencies still apply", "x": 0, "y": 0, "w": 620, "h": 500 },
    { "id": "remote", "label": "Remote services", "x": 660, "y": 0, "w": 340, "h": 500 }
  ],
  "nodes": [
    { "id": "gateway", "kind": "agent", "x": 30, "y": 90, "w": 240, "h": 120, "header": "ARCULES PURE CLOUD", "title": "Gateway buffer", "subtitle": "Local recording can continue" },
    { "id": "agent", "kind": "agent", "x": 30, "y": 330, "w": 240, "h": 120, "header": "UUG", "title": "Agent local disk", "subtitle": "Local recording can continue" },
    { "id": "wan", "kind": "default", "x": 350, "y": 210, "w": 220, "h": 120, "header": "FAILURE BOUNDARY", "title": "WAN unavailable", "subtitle": "Remote paths interrupted" },
    { "id": "remote", "kind": "hub", "x": 710, "y": 210, "w": 240, "h": 120, "header": "OFF SITE", "title": "Remote platform", "subtitle": "Not reachable over this WAN" }
  ],
  "connections": [
    { "from": "gateway", "to": "wan", "kind": "dashed", "label": "upload paused" },
    { "from": "agent", "to": "wan", "kind": "dashed", "label": "remote sync paused" },
    { "from": "wan", "to": "remote", "kind": "dashed", "label": "no WAN path" }
  ]
}
{{< /rete >}}

## Operators and evidence still matter

Architecture is only part of the decision. Arcules provides remote live and recorded viewing, central management, alerts and investigation features. Hub provides a shared environment for live view, recordings, notifications, cases and workflows. Similar feature names are not proof of identical operator experiences.

The day-to-day distinction lies in how easily a team can move from an event to the right footage, review its context and share an appropriate export. Access boundaries across sites, user permissions, timestamp handling and the recipient's ability to play the export are consequential details.

{{< figure src="/images/blog/uug-hub-recordings.webp" link="/images/blog/uug-hub-recordings.webp" alt="UUG Hub application showing the recording browser with camera thumbnails and filter controls" caption="UUG Hub's recording browser. Application screenshot from the [Hub recordings guide](/docs/hub/recordings/), illustrating one deployment rather than an equivalent Arcules configuration." class="blog-product-image" loading="lazy" width="2900" height="1500" >}}

Evidence requirements deserve their own treatment. UUG's [MP4 verification](/docs/hub/mp4-verification/) concerns recording integrity; origin verification requires appropriate signing keys rather than reliance on a shared default. For Arcules, retention and sharing behaviour should be confirmed for the current case/export offering.

A watermark is not a cryptographic signature. A signature is not a complete chain-of-custody process. Neither feature, on its own, establishes legal compliance.

## Cost follows the architecture, not the headline price

An Arcules proposal should be evaluated as a service with its channel, storage, hardware, feature and support terms. A UUG proposal should distinguish component licences or subscriptions, hosted-service scope and any infrastructure operated by the customer.

The complete cost includes:

- Edge gateways or Agent compute, local disks and replacement provision.
- Central compute, recording storage, metadata services and backups where not included.
- WAN capacity, remote playback, exports and recovery traffic after an outage.
- Analytics, integration development and external processing services.
- Monitoring, upgrades, restoration tests, operator training and support ownership.

Storage placement can matter as much as price per channel. Sixteen cameras averaging 4 Mb/s produce approximately **20.7 TB of video over 30 days** of continuous recording, before overhead and replication. Uploading all of those streams averages **64 Mb/s of video payload**, before protocol overhead or catch-up traffic.

An edge-storage design has a different traffic profile from continuous central upload. That is an architectural difference, not evidence that one product is inherently faster or cheaper.

Agent being open source does not make the entire UUG offering free. Arcules being managed does not remove every site-level operating cost.

## Which approach fits which organisation?

**Arcules is a compelling fit when the priority is a managed video service:** central web/mobile operations, supported deployment options and less responsibility for maintaining the central application platform. Its suitability rests on the supported offering meeting the camera, storage, integration and operational requirements.

**UUG is a compelling fit when the video architecture and AI processing need to be adaptable:** independently placed components, control over recording persistence, or workflows that embed custom AI models and return their results to Hub. Its suitability rests on a clear operating model, whether internal, partner-managed or hosted.

For an organisation whose main question is "How do we run video surveillance with less platform administration?", Arcules' service model may be the stronger starting point. For one asking "How do we make video part of our own infrastructure and workflows?", UUG's component model may be more relevant.

There is no need to invent a universal winner. The defensible choice is the one whose supported architecture, responsibilities and commercial terms match the organisation's actual requirements.

Coexistence is a separate integration question. Arcules warns that simultaneous camera use with another VMS can cause configuration conflicts and is not guaranteed. This comparison does not imply a native Arcules-to-Hub connector, automatic archive migration or round-trip analytics integration. Milestone's documented Arcules/XProtect hybrid option is a different integration.

## Sources and scope

Arcules references checked on **18 November 2026**:

- [Milestone Arcules overview](https://www.milestonesys.com/products/arcules/): service model, deployment options and advertised capabilities.
- [Gateway-connected video storage](https://help.arcules.com/en/articles/3823787-video-storage-gateway-connected-devices): cloud and local storage paths.
- [Camera to Cloud](https://www.milestonesys.com/articles/what-is-arcules-camera-to-cloud/): supported-camera architecture and edge/cloud responsibilities.
- [Arcules FAQ](https://help.arcules.com/en/articles/3823421-faq): gateway outage behaviour, offline access, evidence and coexistence caveats.

UUG architecture and capabilities are described in [How it works](/docs/prologue/how/), [Deployments](/docs/prologue/deployments/), [Agent's Hub connection](/docs/agent/connect-to-hub/) and [Hub workflows](/docs/hub/workflows/). Confirm current product and service terms before procurement.
