---
title: "First things first"
description: "A revolutionary design to scale your video analytics and video surveillance landscape."
lead: "A revolutionary design to scale your video analytics and video surveillance landscape."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  factory:
    parent: "factory"
weight: 300
toc: true
---

[![Scale your video landscape with Factory
](youtube-factory-kerberosio.png)](https://www.youtube.com/watch?v=uMv_6cubq6I "Scale your video landscape with Factory")

<br/>

Factory brings the Agent to another level. The Agent can be deployed anywhere you want, it can run as a binary, Docker container and inside a Kubernetes cluster. The latter is where Factory shines, it is a UI that allows you to deploy and configure your Agents into your Kubernetes cluster more easily.

{{< figure src="introduction-enterprise.svg" alt="Kerberos Enterprise Suite contains Agent, Factory, Kerberos Vault and Kerberos Hub." caption="Kerberos Enterprise Suite contains Agent, Factory, Kerberos Vault and Kerberos Hub." class="stretch">}}

## Factory in a nutshell

Factory is a front-end that consumes and interacts with the Kubernetes API. It schedules Agents as Kubernetes resource, and more specific `deployments`. For every camera stream an Agent is created as a Kubernetes deployment.

Through the front-end an administrator can configure or add more Agents to the cluster. The administrator has the ability to interact with the Agent through one or more configuration screens, to tune and optimize the Agent.

### ONVIF discovery

Factory allows you to scan the local network and create Agents for every discovered camera. Once discovered, Factory will create a Kubernetes deployment for every Agent.

### Global settings

Instead of tuning all your Agent, Factory allows you to set up global settings which are inherited by all your Agents.

### Configuration storage and engines

Factory is flexible in *where it keeps its configuration* and *how it runs your agents*. You can store the factory's configuration in MongoDB, in plain JSON files, or in Kubernetes ConfigMaps and Secrets — the last two let your agents receive their configuration as environment variables, with no database required. Today agents are scheduled on Kubernetes, with a Docker and a host engine on the roadmap.

Learn more on the [Configuration & engines](/factory/configuration-and-engines) page.
