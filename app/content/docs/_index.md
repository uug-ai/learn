---
podcast: docs
title: "Documentation"
description: "What the documentation covers, who it is for and where to find what you need."
lead: "What the documentation covers, who it is for and where to find what you need."
date: 2020-10-06T08:48:57+00:00
lastmod: 2026-10-31T00:00:00+00:00
draft: false
images: []
menu:
  docs:
    parent: "prologue"
weight: 100
toc: true
# The Enterprise and Open source sections were removed; send their old addresses here.
aliases:
  - /docs/enterprise/
  - /docs/enterprise/first-things-first/
  - /docs/enterprise/welcome/
  - /docs/enterprise/self-signed/
  - /docs/enterprise/usecases/
  - /docs/open-source/
  - /docs/open-source/first-things-first/
---

Welcome to the documentation for [Agent](/docs/agent/), [Factory](/docs/factory/), [Vault](/docs/vault/) and [Hub](/docs/hub/). It covers everything you need to install the products, connect your cameras, configure them and run them at scale, whether you look after one camera or thousands across many sites.

## What you'll find here

The documentation has three goals:

- **Understand the platform.** What each product does, when you need it and how the products work together.
- **Get it running.** Installation and first configuration, at the edge, in the cloud or across both.
- **Operate and extend it.** Day-to-day features, security and access, APIs, integrations and automation.

It is written for the people who run the platform, the system administrators and DevOps engineers who install and maintain it, and the developers who integrate with it.

## Start here

New to the platform? The [Prologue](/docs/prologue/) explains where it comes from and gets you started.

{{< cards cols="3" >}}
  {{< card link="/docs/prologue/quick-start/" title="Quick Start" subtitle="Run your first Agent with Docker in a few minutes." icon="play" >}}
  {{< card link="/docs/prologue/how/" title="How it works" subtitle="How Agent, Factory, Vault and Hub fit together." icon="puzzle" >}}
  {{< card link="/docs/prologue/deployments/" title="Deployments" subtitle="Architectures from a single camera to many sites." icon="map" >}}
  {{< card link="/docs/prologue/glossary/" title="Glossary" subtitle="The terms you'll meet, from A to Z." icon="book-open" >}}
  {{< card link="/docs/prologue/mission/" title="Mission" subtitle="Why the platform exists and what we stand for." icon="flag" >}}
{{< /cards >}}

## The products

Each product has its own section. Start with **First things first** to learn what the product does, then follow its installation and configuration pages.

### Agent

The recording service that runs next to each camera: one Agent per camera stream, with motion or continuous recording and its own web interface. Open source, and the foundation of every deployment.

- [First things first](/docs/agent/first-things-first/): what an Agent does and why it is built this way
- [Installation](/docs/agent/installation/) and [Getting started](/docs/agent/getting-started/): deploy an Agent and find your way around its web interface and APIs
- [Connect to Vault](/docs/agent/connect-to-vault/) and [Connect to Hub](/docs/agent/connect-to-hub/): store recordings centrally and see every Agent in one place
- [License](/docs/agent/license/)

### Factory

The web application that deploys and manages an Agent for every camera on Kubernetes, with shared settings.

- [First things first](/docs/factory/first-things-first/): when and why to use Factory
- [Installation](/docs/factory/installation/), in the cloud or at the edge
- [Getting started](/docs/factory/getting-started/) and [Configuration & engines](/docs/factory/configuration-and-engines/): add cameras and control how Agents are configured and scheduled
- [License](/docs/factory/license/)

### Vault

The bring-your-own-storage layer: Agents upload recordings to Vault, which stores them on the storage you choose and makes them available to Hub and your own applications.

- [First things first](/docs/vault/first-things-first/), [Installation](/docs/vault/installation/) and [Configuration](/docs/vault/configuration/)
- [Providers](/docs/vault/providers/), [Accounts](/docs/vault/accounts/) and [Integrations](/docs/vault/integrations/): where recordings go, who may upload and who is told
- [Forwarding](/docs/vault/forwarding/): move recordings between Vaults, from the edge to the cloud
- [API](/docs/vault/api/), [Machine learning](/docs/vault/machine-learning/) and [License](/docs/vault/license/)

### Hub

The web application that brings all your Agents, sites and recordings together: one overview, live view, searchable recordings and alerts.

- [First things first](/docs/hub/first-things-first/), [Installation](/docs/hub/installation/) and [Configuration](/docs/hub/configuration/)
- Watching and reviewing: [Live view](/docs/hub/livestream/), [Recordings](/docs/hub/recordings/), [Cases](/docs/hub/cases/), [Analytics](/docs/hub/analytics/) and [Markers](/docs/hub/markers/)
- Alerting and processing: [Notifications](/docs/hub/notifications/), [Workflows](/docs/hub/workflows/), [Pipeline](/docs/hub/pipeline/) and [Media processing](/docs/hub/media-processing/)
- Sites and cameras: [Maps](/docs/hub/maps/), [Floor plans](/docs/hub/floor-plans/) and [ONVIF](/docs/hub/onvif/)
- People and access: [Organisations and projects](/docs/hub/organisations/), [Roles](/docs/hub/roles/), [Authentication](/docs/hub/authentication/), [SSO](/docs/hub/sso/) and [Audit events](/docs/hub/audit-events/)
- Running it: [Domains](/docs/hub/domains/), [Feature flags](/docs/hub/feature-flags/), [White-label](/docs/hub/whitelabel/), [Cleanup](/docs/hub/cleanup/), [MP4 verification](/docs/hub/mp4-verification/) and [License](/docs/hub/license/)

## Going further

- [MLOps](/docs/machinelearning/): run machine learning models on your video at scale, decoupled from the cameras.
- [CLI](/docs/cli/): command-line jobs for maintenance and migrations, run inside your cluster.

## Finding your way

- **Search** the whole site with the search box at the top, or press <kbd>Ctrl</kbd> <kbd>K</kbd>.
- The **sidebar** lists every section; within a page, **On this page** lists its headings.
- Unsure what a word means? The [Glossary](/docs/prologue/glossary/) explains it and links to the full page.

## Beyond the documentation

{{< cards cols="3" >}}
  {{< card link="/tutorials/" title="Tutorials" subtitle="Step-by-step walkthroughs to get hands-on with the products." icon="academic-cap" >}}
  {{< card link="/guides/" title="Guides" subtitle="In-depth how-tos for common tasks and workflows." icon="light-bulb" >}}
  {{< card link="/release-notes/" title="Release notes" subtitle="What changed in each platform release." icon="tag" >}}
  {{< card link="/blog/" title="Blog" subtitle="News, announcements and deep-dives from the team." icon="newspaper" >}}
  {{< card link="/designer/" title="Designer" subtitle="Draw your architecture with drag and drop." icon="template" >}}
  {{< card link="/support/" title="Support" subtitle="Get help from the team and the community." icon="support" >}}
{{< /cards >}}

## Help improve these pages

Spotted a mistake or something missing? Every page has a link to edit it on [GitHub](https://github.com/uug-ai/documentation). Suggestions are welcome.
