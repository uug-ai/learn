---
title: "Hub"
description: "One place for all your Agents, sites, recordings and alerts."
lead: "One place for all your Agents, sites, recordings and alerts."
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-10-29T17:26:00+00:00
draft: false
podcast: hub-overview
images: []
weight: 7
sidebar:
  product: hub
  topicGroup: Topics
  introductoryPages:
    - first-things-first
    - getting-started
    - installation
---

Kerberos Hub is the web application that brings all your Agents, sites and recordings together in one place. Agents keep doing the recording at the edge, close to the cameras. Hub adds what a single Agent can't: one overview across every site, live views and videowalls, searchable recordings with machine learning detections, and alerts for the people who need them.

{{< iso-figure figure="hub" alt="Isometric illustration of Kerberos Hub. A person or a car moves in front of one of three cameras on a site and triggers it. Each camera is wired to its own Agent; the Agents run on one gateway machine, which sends each event to Hub. Hub's workflows, analyse and notify stages light up in turn, then the detection appears on the operators' videowall and as an alert on a phone." caption="How an event moves from a camera on site, through Hub, to the people watching. Click a camera or its Agent to send its event." >}}

## How an event moves through Hub

1. **On site.** Every camera has its own Agent; on a site with several cameras the Agents often run side by side on one gateway machine. A camera triggers its [Agent](/docs/agent), which records the event and uploads the recording to [Kerberos Vault](/docs/vault/first-things-first), so your footage stays on the storage you choose.
2. **In Hub.** Hub picks up the event and runs it through its [pipeline](/docs/hub/pipeline): it groups recordings into sequences, analyses them with machine learning (for example to detect a person or a vehicle) and decides whether anyone should be told. With [workflows](/docs/hub/workflows) you choose which cameras, models and time windows apply.
3. **For operators.** The result shows up where people work: on livestreams and videowalls, in the recordings overview, and as [notifications](/docs/hub/notifications) in the Watchlist or through channels such as email, Slack or webhooks.

Agents connect to Hub with your account's keys; [Connect to Hub](/docs/agent/connect-to-hub) in the Agent docs shows how.

Sign in using a password, 2FA, a passkey, or OIDC single sign-on; the [Authentication guide](/docs/hub/authentication) explains the options. Who sees what is managed per [organisation and project](/docs/hub/organisations), with roles for each member.

## Where to start

- [First things first](/docs/hub/first-things-first): why Hub exists and what it does.
- [Getting started](/docs/hub/getting-started): a tour of the main features.
- [Pipeline](/docs/hub/pipeline): the services every recording flows through.
