---
title: "Hub"
description: "One place for all your Agents, sites, recordings and alerts."
lead: "One place for all your Agents, sites, recordings and alerts."
date: 2020-10-06T08:49:15+00:00
lastmod: 2026-10-28T12:00:00+00:00
draft: false
podcast: hub-overview
images: []
weight: 7
---

Kerberos Hub is the web application that brings all your Agents, sites and recordings together in one place. Agents keep doing the recording at the edge, close to the cameras. Hub adds what a single Agent can't: one overview across every site, live views and videowalls, searchable recordings with machine learning detections, and alerts for the people who need them.

{{< iso-figure figure="hub" alt="Isometric illustration of Kerberos Hub. Three cameras on a site are wired to an Agent, which sends each event to Hub. Hub's ingest, analyse and notify stages light up in turn, then the detection appears on the operators' videowall and as an alert on a phone." caption="How an event moves from a camera on site, through Hub, to the people watching." >}}

## How an event moves through Hub

1. **On site.** A camera triggers its Agent. The Agent records the event and uploads the recording to [Kerberos Vault]({{< relref "/docs/vault/first-things-first" >}}), so your footage stays on the storage you choose.
2. **In Hub.** Hub picks up the event and runs it through its [pipeline]({{< relref "/docs/hub/pipeline" >}}): it groups recordings into sequences, analyses them with machine learning (for example to detect a person or a vehicle) and decides whether anyone should be told. With [workflows]({{< relref "/docs/hub/workflows" >}}) you choose which cameras, models and time windows apply.
3. **For operators.** The result shows up where people work: on livestreams and videowalls, in the recordings overview, and as [notifications]({{< relref "/docs/hub/notifications" >}}) in the Watchlist or through channels such as email, Slack or webhooks.

Who sees what is managed per [organisation and project]({{< relref "/docs/hub/organisations" >}}), with roles for each member.

## Where to start

- [First things first]({{< relref "/docs/hub/first-things-first" >}}): why Hub exists and what it does.
- [Getting started]({{< relref "/docs/hub/getting-started" >}}): a tour of the main features.
- [Pipeline]({{< relref "/docs/hub/pipeline" >}}): the services every recording flows through.
