---
podcast: prologue-glossary
title: "Glossary"
description: "The terms you'll meet across the Augment Vision docs, from A to Z."
lead: "The terms you'll meet across the Augment Vision docs, from A to Z."
date: 2020-10-06T08:48:57+00:00
lastmod: 2026-10-31T00:00:00+00:00
draft: false
images: []
menu:
  docs:
    parent: "prologue"
weight: 103
toc: true
glossary: true
---

The words you'll meet across Agent, Factory, Vault and Hub, from A to Z. Each term links to the page that explains it in full.

<div class="learn-glossary-search"><label for="glossary-search" class="learn-sr-only">Search the glossary</label><input id="glossary-search" type="search" placeholder="Search the glossary" autocomplete="off" spellcheck="false"><p id="glossary-search-status" role="status" aria-live="polite"></p></div>

<nav class="learn-glossary-index" aria-label="Glossary letters"><a href="#a">A</a><a href="#b">B</a><a href="#c">C</a><a href="#d">D</a><a href="#e">E</a><a href="#f">F</a><a href="#g">G</a><a href="#h">H</a><a href="#i">I</a><span aria-hidden="true">J</span><a href="#k">K</a><a href="#l">L</a><a href="#m">M</a><a href="#n">N</a><a href="#o">O</a><a href="#p">P</a><span aria-hidden="true">Q</span><a href="#r">R</a><a href="#s">S</a><a href="#t">T</a><span aria-hidden="true">U</span><a href="#v">V</a><a href="#w">W</a><span aria-hidden="true">X</span><span aria-hidden="true">Y</span><span aria-hidden="true">Z</span></nav>

## A

<span id="account"></span>Account
: Credentials an Agent or application uses to upload to and read from [Vault](#vault). Each account is linked to the storage providers and integrations it may use. [Read more](/docs/vault/accounts/).

<span id="agent"></span>Agent
: The Kerberos Agent: the recording service that runs next to, or on, a camera. Each Agent handles one camera stream, records on motion or continuously, and has its own web interface for live view, recordings and settings. It is open source under the MIT license and the foundation of every deployment. [Read more](/docs/agent/).

<span id="alert"></span>Alert
: A rule in [Hub](#hub) that decides which detection and device events matter. Matching events land in each recipient's [watchlist](#watchlist) and can be sent to external channels. [Read more](/docs/hub/notifications/).

<span id="anpr"></span>ANPR
: Automatic number-plate recognition. A [workflow stage](#stage) that reads the plate of every vehicle in a recording and returns the plates as [detections](#detection) and one [marker](#marker) per vehicle. [Read more](/docs/hub/workflows/anpr/).

<span id="archive-provider"></span>Archive provider
: A dedicated [storage provider](#provider) in Vault where [cases](#case) keep recordings beyond the [retention period](#retention-period). [Read more](/docs/hub/cases/).

<span id="audit-events"></span>Audit events
: A read-only history in Hub of security, configuration and data operations in an [organisation](#organisation): who changed what, and whether an authorisation check succeeded. [Read more](/docs/hub/audit-events/).

<span id="augment-vision"></span>Augment Vision
: The company (UUG.AI) behind the platform: a single control layer to deploy, monitor and scale vision AI across camera fleets, built from Agent, Factory, Vault and Hub. It grew out of the open source [Kerberos.io](#kerberosio) project. [Read more](/docs/prologue/).

## B

<span id="block"></span>Block
: The smallest unit of a [stage's](#stage) result, such as a [detection](#detection), a [marker](#marker) or a [media patch](#media-patch). A stage returns its blocks in a block envelope, which [ingest](#ingest) stores. [Read more](/docs/hub/workflows/ingest/blocks/).

<span id="bring-your-own-storage"></span>Bring your own storage
: Keeping recordings on storage you choose and control, at the edge or in the cloud, by configuring [storage providers](#provider) in [Vault](#vault). [Read more](/docs/vault/providers/).

## C

<span id="case"></span>Case
: Keeps important recordings beyond the [retention period](#retention-period) by copying them to an [archive provider](#archive-provider). [Read more](/docs/hub/cases/).

<span id="chaining"></span>Chaining
: See [Forwarding](#forwarding).

<span id="cli"></span>CLI
: Command-line tools for specific automations, run as Kubernetes Jobs inside your cluster: checking database indexes, generating default labels and migrating Vault data to Hub. [Read more](/docs/cli/).

<span id="continuous-recording"></span>Continuous recording
: An Agent recording mode that records all the time, instead of only on motion. See also [Motion recording](#motion-recording). [Read more](/docs/agent/).

<span id="coturn"></span>coturn
: An open source [TURN](#turn) server, used to relay [WebRTC](#webrtc) live view when the Agent and the browser cannot connect directly. [Read more](/tutorials/hub/setup-webrtc-turn/).

## D

<span id="detection"></span>Detection
: A run of tracks, a box per frame, produced by one source for one recording. It answers "what was detected in this media?" and is stored as a [block](#block). [Read more](/docs/hub/workflows/ingest/blocks/detection/).

<span id="domain"></span>Domain
: A multi-tenancy layer in Hub on top of user accounts, to give several customers or companies their own space on one platform. [Read more](/docs/hub/domains/).

## E

<span id="edge"></span>Edge
: On site, close to the cameras, as opposed to in the cloud. Agents record at the edge; Factory and Vault can be installed at the edge or in the cloud. [Read more](/docs/vault/installation-edge/).

<span id="external-stage"></span>External stage
: A [workflow stage](#stage) that runs in your own environment instead of beside Hub. Hub reaches it through the workflow forwarder, over your RabbitMQ broker or an HTTPS endpoint. [Read more](/docs/hub/workflows/external-stages/).

## F

<span id="factory"></span>Factory
: The web application that deploys and manages an [Agent](#agent) for every camera on Kubernetes, with shared settings, instead of creating each Agent by hand. [Read more](/docs/factory/).

<span id="feature-flag"></span>Feature flag
: A switch in Hub that controls which pages, controls and optional data sources users see. Feature flags do not grant permissions; [roles](#role) still apply. [Read more](/docs/hub/feature-flags/).

<span id="floor-plan"></span>Floor plan
: An indoor view of a [site](#site): a building plan with the site's cameras placed on it, showing which areas each camera covers. [Read more](/docs/hub/floor-plans/).

<span id="forwarding"></span>Forwarding
: Connecting two [Vaults](#vault), also called chaining: a source Vault forwards recordings to a remote Vault, continuously or on demand. It lets you keep most recordings at the [edge](#edge) and move only what you need to the cloud. [Read more](/docs/vault/forwarding/).

## G

<span id="gateway"></span>Gateway
: A machine on a [site](#site) where several Agents run side by side, one per camera. [Read more](/docs/hub/).

<span id="group"></span>Group
: A set of cameras in Hub, used next to [sites](#site) to organise Agents and to delegate access to other users. [Read more](/docs/agent/connect-to-hub/).

## H

<span id="hls"></span>HLS
: HTTP Live Streaming. A [live view](#live-view) transport that carries video over ordinary HTTPS, with low-latency HLS (LL-HLS) enabled by default. It is the most predictable option across corporate firewalls, VPNs and mobile networks. [Read more](/tutorials/hub/setup-hls-live-view/).

<span id="hub"></span>Hub
: The Kerberos Hub web application that brings all your Agents, sites and recordings together: one overview across every site, live views and videowalls, searchable recordings with machine learning detections, and alerts. [Read more](/docs/hub/).

## I

<span id="ingest"></span>Ingest
: How a [stage's](#stage) result is stored: the stage returns a block envelope, and the shared ingest core routes and stores each [block](#block). [Read more](/docs/hub/workflows/ingest/).

<span id="integration"></span>Integration
: A connection that [Vault](#vault) notifies each time it stores a recording, such as a message queue, so other applications can act on new recordings. [Read more](/docs/vault/integrations/).

## K

<span id="kerberosio"></span>Kerberos.io
: The open source project, started in 2014 around the [Agent](#agent), that Augment Vision's platform grew out of. The products keep its name, as in Kerberos Agent, Kerberos Vault and Kerberos Hub. [Read more](/docs/).

## L

<span id="live-view"></span>Live view
: Watching cameras live in the browser. In Hub every connected Agent is a tile on the Live view page, streamed over [WebRTC](#webrtc), [HLS](#hls) or [MoQ](#moq). [Read more](/docs/hub/livestream/).

## M

<span id="main-stream"></span>Main stream
: A camera's full-quality stream, which the Agent records. See also [Sub-stream](#sub-stream). [Read more](/tutorials/agent/connect-any-camera/).

<span id="marker"></span>Marker
: A labelled point or span on a recording's timeline, such as a number-plate read or a period of activity, so operators can jump straight to the moment that matters. [Read more](/docs/hub/markers/).

<span id="media-patch"></span>Media patch
: A [block](#block) that updates fields of a recording that already exists, to add what a [stage](#stage) learned about it. [Read more](/docs/hub/workflows/ingest/blocks/media-patch/).

<span id="media-processing"></span>Media processing
: Everything that turns an uploaded video into a recording operators can find, preview, analyse and use in an investigation. [Read more](/docs/hub/media-processing/).

<span id="mlops"></span>MLOps
: Running machine learning models on video at scale. The platform decouples video streams from CPU and GPU workloads through video chunks, queues and event messaging. [Read more](/docs/machinelearning/).

<span id="moq"></span>MoQ
: Media over QUIC. A low-latency [live view](#live-view) transport: the Agent publishes each camera to a MoQ relay, and browsers subscribe to it without a direct connection to the Agent. [Read more](/tutorials/hub/deploy-moq-relay-kubernetes/).

<span id="motion-recording"></span>Motion recording
: The default Agent recording mode: a recording starts when the Agent detects motion. See also [Continuous recording](#continuous-recording). [Read more](/docs/agent/).

<span id="mp4-verification"></span>MP4 verification
: Proving a recording was not altered: the Agent signs every MP4 when it closes it, and anyone with the public key can verify it offline. [Read more](/docs/hub/mp4-verification/).

## N

<span id="notification-channel"></span>Notification channel
: A destination outside Hub, such as a messaging service, that receives events matching an [alert](#alert). [Read more](/docs/hub/notifications/).

## O

<span id="onvif"></span>ONVIF
: A camera standard that gives access to features such as [PTZ](#ptz) and streaming profiles. You can enable it per Agent or when adding cameras in Factory. [Read more](/docs/hub/onvif/).

<span id="organisation"></span>Organisation
: The tenant boundary in Hub for shared resources. A user can belong to several organisations with one login. See also [Project](#project) and [Workspace](#workspace). [Read more](/docs/hub/organisations/).

## P

<span id="pipeline"></span>Pipeline
: The fixed chain of microservices that processes every recording in Hub, enriching, classifying and alerting on each event. [Workflows](#workflow) build on top of it. [Read more](/docs/hub/pipeline/).

<span id="project"></span>Project
: A separation of operational resources inside an [organisation](#organisation). [Read more](/docs/hub/organisations/).

<span id="provider"></span>Provider
: A storage provider: the storage where [Vault](#vault) keeps recordings, such as Amazon S3, Azure Storage, Google Cloud Storage, MinIO or Ceph. A Vault can use several. [Read more](/docs/vault/providers/).

<span id="ptz"></span>PTZ
: Pan, tilt and zoom: a camera whose view can be moved and zoomed remotely, through [ONVIF](#onvif). [Read more](/docs/hub/onvif/).

## R

<span id="recording"></span>Recording
: A video file, a fragmented MP4, that an Agent writes for an event or a stretch of time. In Hub you find and review recordings on the Recordings page. [Read more](/docs/hub/recordings/).

<span id="recycle"></span>Recycle
: The Vault service that removes recordings by rules, so disks don't fill up and storage costs stay under control. [Read more](/docs/vault/recycle/).

<span id="retention-period"></span>Retention period
: How many days of recordings stay visible in Hub before they are cleaned up. It is set per subscription, for example 30, 60 or 90 days. Use a [case](#case) to keep recordings longer. [Read more](/docs/hub/cases/).

<span id="role"></span>Role
: What a Hub user can do: owner, admin, editor or guest. The owner has the highest access and can create users and delegate cameras to them. [Read more](/docs/hub/roles/).

<span id="rtsp"></span>RTSP
: The protocol IP cameras use to stream video. An Agent connects to a camera through its RTSP URL, for H264 or H265 video. [Read more](/tutorials/agent/connect-any-camera/).

## S

<span id="signed-url"></span>Signed URL
: A temporary, time-limited link to a recording or other asset stored by Vault, obtained through the Vault API. [Read more](/docs/vault/api/signed-urls/).

<span id="site"></span>Site
: A physical location with cameras, shown on the Hub map and optionally on [floor plans](#floor-plan). Agents are organised into sites and [groups](#group). [Read more](/docs/hub/maps/).

<span id="sso"></span>SSO
: Single sign-on. Hub supports it through OpenID Connect (OIDC), so users sign in with the identity provider your organisation already uses. [Read more](/docs/hub/sso/).

<span id="stage"></span>Stage
: A workflow stage: one step in a [workflow](#workflow), implemented as a microservice. Hub ships built-in stages, and you can add your own. [Read more](/docs/hub/workflows/stages/).

<span id="sub-stream"></span>Sub-stream
: A camera's lower-resolution stream, used for [live view](#live-view). WebRTC live view needs it in H264. See also [Main stream](#main-stream). [Read more](/tutorials/agent/connect-any-camera/).

## T

<span id="trigger"></span>Trigger
: What makes a [workflow](#workflow) run: automatically for each new recording, or manually when a user asks for it on specific media. [Read more](/docs/hub/workflows/triggers/).

<span id="turn"></span>TURN
: A relay server for [WebRTC](#webrtc). When firewalls or NAT block a direct connection between the Agent and the browser, the video is relayed through TURN, for example [coturn](#coturn). [Read more](/tutorials/hub/setup-webrtc-turn/).

## V

<span id="vault"></span>Vault
: Kerberos Vault: the bring-your-own-storage layer for recordings. Agents upload to Vault, which stores recordings on the [providers](#provider) you choose and connects them to Hub and your own applications through events, integrations and APIs. [Read more](/docs/vault/).

<span id="videowall"></span>Videowall
: A Hub view that shows many live streams side by side, for operators who watch several cameras at once. [Read more](/docs/hub/livestream/).

## W

<span id="watchlist"></span>Watchlist
: Each user's inbox of notifications in Hub, filled by the [alerts](#alert) they receive. [Read more](/docs/hub/notifications/).

<span id="webrtc"></span>WebRTC
: The most interactive [live view](#live-view) transport: low-latency H264 video, camera audio and two-way talk. It prefers a direct Agent-to-browser connection and falls back to a [TURN](#turn) relay. [Read more](/tutorials/hub/setup-webrtc-turn/).

<span id="white-label"></span>White-label
: Styling Hub with your own branding through a custom stylesheet and icons. [Read more](/docs/hub/whitelabel/).

<span id="workflow"></span>Workflow
: An organisation's own processing on top of the [pipeline](#pipeline): a graph of [stages](#stage) that decides which cameras, models and schedules apply, configured on a visual canvas. [Read more](/docs/hub/workflows/).

<span id="workspace"></span>Workspace
: The [organisation](#organisation) and [project](#project) pair selected for a session in Hub. [Read more](/docs/hub/organisations/).
