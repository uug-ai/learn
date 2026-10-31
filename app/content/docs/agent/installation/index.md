---
podcast: agent-installation
title: "Installation"
description: "Run Agents everywhere"
lead: "Run Agents everywhere"
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  agent:
    parent: "agent"
weight: 202
toc: true
---

## Overview

As described before an Agent is a container, which can be deployed through various ways and automation tools such as Docker, Docker Compose, Kubernetes and the list goes on. To simplify your life we have come up with concrete and working examples of deployments to help you speed up your Kerberos.io journey.

We have documented the different deployment models in the [Agent GitHub repository](https://github.com/kerberos-io/agent/tree/master/deployments). There you'll learn and find how to deploy using:

- [Static binary](https://github.com/kerberos-io/agent/tree/master/deployments#0-static-binary)
- [Docker](https://github.com/kerberos-io/agent/tree/master/deployments#1-docker)
- [Docker Compose](https://github.com/kerberos-io/agent/tree/master/deployments#2-docker-compose)
- [Kubernetes](https://github.com/kerberos-io/agent/tree/master/deployments#3-kubernetes)
- [Red Hat OpenShift with Ansible](https://github.com/kerberos-io/agent/tree/master/deployments#4-red-hat-ansible-and-openshift)
- [Terraform](https://github.com/kerberos-io/agent/tree/master/deployments#6-terraform)
- [Salt](https://github.com/kerberos-io/agent/tree/master/deployments#7-salt)
- [Balena](https://github.com/kerberos-io/agent/tree/master/deployments#8-balena)
- [Snap](https://github.com/kerberos-io/agent/tree/master/deployments#9-snap)

For a step-by-step walkthrough of Docker, Docker Compose, Kubernetes, Snap and the static binary, follow the [Install Agent](/tutorials/agent/install/) tutorial. To deploy and configure many Agents on Kubernetes from a single interface, use [Factory](/docs/factory/first-things-first).

By default your Agents will store all their configuration and recordings inside the container. To help you automate and have a more consistent data governance, you can [attach volumes](https://github.com/kerberos-io/agent#configure-and-persist-with-volume-mounts) to configure and persist data of your Agents, and/or configure each Agent [through environment variables](https://github.com/kerberos-io/agent#configure-with-environment-variables).

## Next steps

- Tour the web interface in [Getting started](/docs/agent/getting-started).
- [Connect to Vault](/docs/agent/connect-to-vault) to store recordings on storage you control.
- [Connect to Hub](/docs/agent/connect-to-hub) to see all your Agents, live views and alerts in one place.
