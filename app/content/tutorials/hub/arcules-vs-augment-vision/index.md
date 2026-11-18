---
title: 'Milestone Arcules vs Augment Vision: compare the stacks'
description: 'Compare Arcules cloud video surveillance with the Augment Vision stack, then test camera onboarding, edge recording, cloud storage, alerts and outage recovery.'
date: '2026-11-18'
images: ['social.png']
weight: 3
toc: true
product: 'Hub'
level: 'Beginner'
duration: '25 min'
tags: ['Architecture', 'VSaaS', 'Deployment']
illustration: 'tutorial-hub-workflow-stage'
---

{{< tutorial-header alt="A recording passes through a modular video-processing workflow and produces a notification." >}}

Cloud video surveillance is not just a live-view screen. It is a choice about where recording happens, which services need an internet connection, who stores the footage, and who maintains the system.

This tutorial compares **[Milestone Arcules](https://www.milestonesys.com/products/arcules/)** with the **Augment Vision stack**, using Agent, Factory, Vault and Hub as its building blocks. You will map the architectures, connect a pilot camera, and test the same operational requirements on both.

{{< tutorial-meta time="~25 min reading; allow additional time for the pilot" level="Beginner" stack="Cloud video · Architecture" prerequisites="Access to a test camera and trial environments for both platforms" >}}

{{< tutorial-panel tone="brand" icon="clipboard-check" title="What you'll produce" >}}
- A component map explaining what you would deploy and operate
- A repeatable pilot for live view, recording, retrieval and alerts
- An acceptance checklist covering internet outages, access boundaries and evidence
- A decision based on deployment control, operational responsibility and complete cost
{{< /tutorial-panel >}}

## 1. Compare equivalent offerings

**Arcules is Milestone's cloud-based video surveillance as a service (VSaaS).** Its web and mobile applications provide central access to cameras, sites, recordings and alerts. It supports gateway-connected deployments and Camera to Cloud on supported cameras, with storage options that depend on the deployment.

Arcules is not the same product as **XProtect**, Milestone's separate VMS family. Milestone offers an Arcules/XProtect hybrid option, but XProtect editions, Smart Client and MIP SDK capabilities must not be presented as standard Arcules features.

**Augment Vision** here means the composed stack documented on this site:

| Component | Responsibility |
|---|---|
| [Agent](/docs/agent/first-things-first/) | Connect to and record one camera stream, with a local interface. |
| [Factory](/docs/factory/first-things-first/) | Deploy and configure a fleet of Agents on Kubernetes. |
| [Vault](/docs/vault/first-things-first/) | Receive recordings, persist them to configured storage, and publish integration events. |
| [Hub](/docs/hub/first-things-first/) | Bring devices, live view, recordings, alerts and workflows into a shared workspace. |

You do not need all four products for every deployment. One Agent can record independently; Factory becomes relevant when you want Kubernetes-based Agent management.

Choose the Augment Vision offering before comparing costs or responsibilities:

- **Hosted Hub:** establish what the provider manages, where recordings are stored, and which integrations and service commitments are included.
- **Self-hosted stack:** your team or service partner operates the deployed Hub, Vault, storage and supporting services.

Comparing a managed Arcules subscription with self-hosted software while excluding the latter's operating work is not a like-for-like comparison.

{{< callout type="important" >}}
This is an architecture and evaluation guide, not a feature-parity certification or a measured performance benchmark. Verify the proposed Arcules subscription, hardware, region and supported devices, and the exact Augment Vision components, versions and service agreement. Product availability and capabilities can change.
{{< /callout >}}

### A first-pass decision table

| Requirement | Arcules | Augment Vision |
|---|---|---|
| Service model | Cloud-managed VSaaS with web and mobile access. | Modular stack; distinguish hosted Hub from a self-hosted deployment. |
| Camera connection | Supported cameras through a gateway, or supported Camera to Cloud devices without a gateway. | One Agent per camera stream; validate RTSP and any required ONVIF, PTZ or audio functions. |
| Recording storage | Gateway-connected cloud or local storage modes; Camera to Cloud has its own edge/cloud options. | Agent local recording and configurable persistence; Vault provides a path to storage you control. |
| Multi-site operation | Central cloud interface for sites, devices, users and health. | Hub centralises sites and devices; Factory optionally manages Agents on Kubernetes. |
| Analytics and search | Built-in analytics, rules and investigation features; check availability for the chosen devices and plan. | Hub pipeline and workflow stages; check deployed workers and hosted-service availability. |
| Custom integration | Verify the supported Arcules integration or API and its entitlement. Do not assume XProtect interfaces apply. | Hub APIs and workflows, including custom workers in deployments that support them. |
| Updates and maintenance | Provider-managed cloud updates; clarify gateway, camera and site responsibilities. | Provider-managed scope for hosted services; your team owns self-hosted service lifecycle and dependencies. |
| Internet outage | Gateway recording and offline access are documented; behaviour depends on storage mode and capacity. | Agent can record locally; demonstrate buffering, later upload and central visibility for the chosen configuration. |

Both platforms support analytics and integration. The useful distinction is **where work runs, what you can control, and who operates each layer**, not "cloud VMS versus AI."

## 2. Draw the recording and management paths

### Arcules: distinguish gateway and Camera to Cloud

For **gateway-connected cameras**, separate two storage modes:

1. **Cloud storage / Pure Cloud:** video is buffered on the gateway and uploaded to cloud storage according to the recording configuration.
2. **Local storage / Edge Cloud:** video remains on the gateway while metadata is sent to the cloud. Playback uses the gateway; evidence selected for cases can be archived in the cloud.

For **Camera to Cloud**, supported cameras connect without a gateway. Milestone describes camera-side processing and SD-card recording, with optional cloud upload. Do not assume a camera supported through a gateway also supports Camera to Cloud.

Use the [gateway storage documentation](https://help.arcules.com/en/articles/3823787-video-storage-gateway-connected-devices) and [Camera to Cloud overview](https://www.milestonesys.com/articles/what-is-arcules-camera-to-cloud/) to confirm your proposed path.

Write down where raw video, metadata and exported evidence reside. **Cloud-managed does not necessarily mean every recording is stored in the cloud.**

### Augment Vision: separate capture, persistence and application layers

For a self-hosted Vault-based deployment, the recording path is **camera → Agent → Vault → configured storage**, with Vault publishing events to the configured Hub integration. Hub uses those events to make recordings available for review and processing.

Factory manages Agents; it does not relay recording uploads. Live view has its own media and signalling paths, separate from recording upload.

Follow [How it works](/docs/prologue/how/) for the component diagrams and [Deployments](/docs/prologue/deployments/) for placement options.

Identify where each Agent runs, how local data persists, which Vault and storage provider receive recordings, and who operates Hub's database, broker and processing services. For hosted Hub, obtain the corresponding service architecture rather than assuming it matches your self-hosted design.

{{< callout type="info" >}}
An Agent appearing online in Hub does not prove that recordings are reaching storage. The Hub connection carries status and control; persistence is configured separately. Test both.
{{< /callout >}}

## 3. Define one pilot before installing

Use a camera and scene you are authorised to record. Prefer a non-critical test camera, keep credentials private, and agree how pilot footage will be retained and removed.

Write down:

- Camera model, firmware, codec, resolution, frame rate and bitrate.
- Continuous or motion-based recording, retention period and pre/post-event requirements.
- Required audio, PTZ, digital inputs or other camera functions.
- Number of simultaneous viewers and the networks they will use.
- Required time to find and export an incident.
- Maximum acceptable live-view delay, recording gap and recovery time.
- Who may view, export and administer each camera or site.
- Permitted regions for video, metadata, backups and analytic processing.

Choose numerical acceptance thresholds **before** the test. For example, "retrieve an incident within two minutes" is testable; "easy to search" is not.

Use the same source profile, recording schedule, retention target and operator task. Prefer sequential tests: Arcules warns that another VMS can conflict with its camera configuration, and simultaneous use is not guaranteed. Use separate test cameras or obtain installer confirmation before attempting parallel consumers.

Compare storage policies deliberately: Arcules Edge Cloud versus continuous upload to a central Vault does not have the same WAN traffic profile. Record that architectural difference rather than treating it as a product-speed result.

## 4. Connect and record the same camera

### Path A: Arcules

Follow the current [Arcules Knowledge Base](https://help.arcules.com/) for your deployment:

1. Confirm the exact camera model and firmware against the supported-device information for **gateway** or **Camera to Cloud** use.
2. Prepare the tenant, site, subscription and required user permissions.
3. For a gateway deployment, install and register the supported gateway, connect the camera and select the agreed storage mode. For Camera to Cloud, follow the supported camera onboarding flow instead.
4. Configure the agreed stream profile, recording schedule and retention. Confirm that local capacity can meet the target.
5. Create a least-privilege operator account.
6. Verify live video, recorded playback and the configured storage destination in the web application.

Record the gateway or camera configuration, subscription and region used. Do not reuse XProtect installation instructions for Arcules.

Choose the storage mode when preparing the pilot. The gateway storage documentation warns that conversion to local storage cannot be reverted; do not experiment with that setting on an existing production gateway.

### Path B: Augment Vision

1. Follow [Connect any IP camera to Agent](/tutorials/agent/connect-any-camera/) and [Agent installation](/tutorials/agent/install/) to start one Agent with persistent storage and your own credentials.
2. Configure the same recording mode and stream profile used in the Arcules test. Verify a local recording before adding more services.
3. Prepare Hub using the [Hub quickstart](/docs/hub/quickstart/), or use your provisioned hosted environment.
4. Follow [Connect to Hub](/docs/agent/connect-to-hub/) to configure the Hub connection and assign the Agent.
5. Configure persistence separately. For the self-hosted Vault path, follow [Connect to Vault](/docs/agent/connect-to-vault/) and its Hub integration instructions. A hosted offering may instead provide Hub-managed persistence.
6. Open Hub and verify live view **and** playback of a recording uploaded after configuration.

An H.265 recording stream does not automatically imply browser live-view compatibility. If required, configure an H.264 sub-stream and validate the chosen [live-stream transport](/tutorials/hub/moq-vs-hls-vs-webrtc/).

Add Factory only if managing Agents on Kubernetes is part of the pilot. Do not introduce it merely to record one camera.

## 5. Run the same operator exercise

Create a harmless, recognisable event in the scene, such as an authorised person walking through the test area. Note its time and time zone.

Ask an operator to complete these tasks on each platform:

1. Open the correct camera's live view.
2. Find the event in recorded footage without being given its exact second.
3. Review the lead-up and aftermath, including any recording boundaries.
4. Export the required interval and play the exported file outside the platform.
5. Confirm that an unauthorised test account cannot view or export the same footage.

Record time taken, missing context, playback failures and administrator intervention. Distinguish a missing feature from one that exists but was not configured or included in the proposed offering.

### Add one alert or custom workflow

Start with a simple recording/event notification, then test the exact analytic use case you need:

- **Arcules:** configure the applicable rule and notification. Identify whether the signal comes from camera analytics, gateway processing or a cloud feature, and confirm the required hardware and entitlement.
- **Augment Vision:** configure the required [notifications](/docs/hub/notifications/). If the requirement needs custom processing, follow [Set up your own workflow stage](/tutorials/hub/custom-workflow-stage/) in a deployment that supports it, and verify its result on the recording.

Write down what actually triggered the alert. Motion, person detection and a person crossing a particular boundary are different requirements. A delivered message alone does not demonstrate that the intended condition was detected.

For any external processing, confirm which footage or metadata leaves the recording environment, who receives it and how long it is retained.

## 6. Disconnect the internet and test recovery

Run fault tests only in isolated pilot environments, with approval. Do not interrupt production recording to evaluate a product.

Arcules documents continued recording on a gateway during an internet outage and **Offline Gateway Access** for local live and recorded viewing. Cloud-storage gateways upload buffered video after reconnection; local-storage gateways retain it locally. Available history is limited by retention and disk capacity. See the [Arcules FAQ](https://help.arcules.com/en/articles/3823421-faq).

That does not establish identical behaviour for Camera to Cloud, nor does local recording guarantee that every cloud interface remains usable.

For Augment Vision, Agent local recording is separate from Hub connectivity. Demonstrate the configured upload retry behaviour, local capacity limits and later Hub visibility; do not assume unlimited buffering or a particular recovery time.

| Test | Evidence to collect on both platforms |
|---|---|
| Disconnect the camera, then reconnect it | Offline indication, alert timing, recording gap and recovery behaviour. |
| Disconnect the site WAN, leaving the local network running | Whether recording continues, how authorised users access it locally, and which central features stop working. |
| Restore the WAN after a measured outage | When new and buffered footage becomes accessible; upload backlog and bandwidth consumption. |
| Restart the gateway, Agent or its host | Recovery time, persisted configuration and the exact missing interval. |
| Approach the pilot's local storage limit | Retention/overwrite behaviour and visible warnings; do not fill production disks. |
| Interrupt a custom analytic worker, where used | Whether recording continues, how backlog is exposed and whether processing recovers. |

Test a WAN outage separately from camera power loss, edge-device failure and a cloud-service outage. They are different failure domains.

## 7. Check bandwidth, evidence and complete cost

### Size storage from the recording policy

For continuous recording at a constant average bitrate:

```text
Decimal GB per day = bitrate in Mb/s × 10.8
Raw retention GB = cameras × GB per day × retained days
```

For example, 16 cameras averaging 4 Mb/s for 30 days require approximately **20,736 GB (20.7 TB)** before replication, filesystem overhead, metadata, spare capacity or exports.

Uploading all those streams continuously would average **64 Mb/s of video payload** before protocol overhead or outage catch-up. Local-storage designs have different upload patterns, but still need bandwidth for metadata, remote playback and evidence.

Measure motion-recording duty cycle in the real scene. For both proposals, include playback traffic, export storage, backup costs and analytic processing, not just the camera bitrate.

### Verify evidence and data residency

Check export formats, timestamps, access auditing, sharing expiry, integrity verification and preservation beyond normal retention. Test the actual case/export workflow instead of equating ordinary playback with evidence management.

For Augment Vision, review [MP4 verification](/docs/hub/mp4-verification/). Configure your own signing keys where origin verification matters; a shared default key cannot establish which of your recorders produced a file.

For Arcules, confirm the applicable evidence retention, sharing and verification behaviour in the current offering. A visible watermark is not the same as a cryptographic signature.

Ask both providers or deployment owners where **video, metadata, exported evidence, backups and external analytic requests** reside. Local recording does not by itself mean that no data leaves the site.

No individual feature establishes a complete chain-of-custody process or legal compliance certification.

### Compare the complete operating cost

Request quotes against the same camera count, recording profile, retention, availability target, analytic workload and support period:

| Cost area | Include in the comparison |
|---|---|
| Subscription and licences | Arcules channels, storage plan and features; applicable Augment Vision component licences or hosted subscription. |
| Edge hardware | Gateway or supported camera/SD storage versus Agent compute, disks and replacement provision. |
| Central infrastructure | Included managed services versus self-hosted compute, storage, databases, brokers and backups. |
| Network and processing | WAN capacity, playback/egress, catch-up traffic and any external analytic charges. |
| People and support | Installation, integrations, upgrades, monitoring, recovery tests, operator training and support ownership. |

Agent being open source does **not** make every component, hosted service or support agreement free. Arcules being managed does **not** remove responsibility for cameras, site networking, account permissions and the agreed edge hardware.

## 8. Make the decision

**Prefer Arcules** when its tested cloud-managed workflows, supported camera/storage options and service agreement meet your needs, and reducing central platform administration is a priority.

**Prefer Augment Vision** when the pilot demonstrates that its component boundaries, storage placement and workflow integration model meet your needs, with a clear provider or internal owner for every service you deploy.

**Keep evaluating** if a must-have remains untested. Neither a cloud subscription nor a modular architecture automatically guarantees availability, privacy, lower cost or easier integration.

For every requirement, record **pass, fail or not tested**, the tested configuration, supporting evidence, cost and responsible owner.

If you intend to run both, treat coexistence as a separate project. Arcules warns about competing camera configurations and does not guarantee simultaneous use with another VMS; confirm a supported design rather than assuming parallel camera consumption works. This tutorial does not establish a native Arcules-to-Hub connector, automatic archive import or round-trip analytics integration. Milestone's documented Arcules/XProtect hybrid option is a different integration.

## Sources and next steps

Arcules references checked on **18 November 2026**; recheck the selected offering when deploying:

- [Milestone Arcules overview](https://www.milestonesys.com/products/arcules/): VSaaS, deployment options, management, analytics and investigation features.
- [Arcules gateway-connected video storage](https://help.arcules.com/en/articles/3823787-video-storage-gateway-connected-devices): cloud and local storage paths.
- [Arcules Camera to Cloud](https://www.milestonesys.com/articles/what-is-arcules-camera-to-cloud/): supported-camera architecture and edge/cloud responsibilities.
- [Arcules FAQ](https://help.arcules.com/en/articles/3823421-faq): gateway outage behaviour, offline access and retention limits.
- [Arcules Knowledge Base](https://help.arcules.com/): current setup and operating instructions.

For the Augment Vision pilot, continue with [How it works](/docs/prologue/how/), [Agent installation](/tutorials/agent/install/), [Hub quickstart](/docs/hub/quickstart/) and [custom workflow stages](/tutorials/hub/custom-workflow-stage/).
