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

{{< iso-figure figure="ecosystem" alt="The platform's four products. Factory deploys an Agent for every camera; the Agents upload their recordings to Vault and send their events to Hub, and Hub plays recordings back from Vault. Each product links to its documentation." caption="Click a product to jump to its documentation." >}}

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

Each product has its own section. Start with its **First things first** page to learn what it does, then follow its installation and configuration pages.

- **[Agent](/docs/agent/)**: the recording service next to each camera, one Agent per camera stream. Open source, and the foundation of every deployment.
- **[Factory](/docs/factory/)**: deploys and manages an Agent for every camera on Kubernetes, with shared settings.
- **[Vault](/docs/vault/)**: stores recordings on the storage you choose and makes them available to Hub and your own applications.
- **[Hub](/docs/hub/)**: brings all your Agents, sites and recordings together, with live view, searchable recordings and alerts.

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
