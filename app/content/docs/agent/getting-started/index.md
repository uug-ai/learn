---
podcast: agent-getting-started
title: "Getting Started"
description: "A tour of the Agent's web interface: dashboard, recordings and settings."
lead: "A tour of the Agent's web interface: dashboard, recordings and settings."
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

Once you've installed one or more Agents, you should have access to the Agent user interface. The interface allows you to interact with the Agent, and more specifically configure the camera stream, set up a cloud connection to [Vault](/docs/agent/connect-to-vault) or [Hub](/docs/agent/connect-to-hub), watch recordings and live views, etc.

Next to the UI, it is important to note that the Agent also ships numerous APIs that allow you to automate the configuration. The APIs are exposed as Swagger documentation, and can be used for configuration of Agent but also development of custom applications or business logic.

## Login page

Once you open a browser, and navigate to the Agent user app (see installation for the URL), you will land on the login page.

{{< figure src="login.gif" alt="After successful installation you should be able to access the login page." caption="After successful installation you should be able to access the login page." class="stretch">}}

The default username and password of the Agent app is:

- username: **root**
- password: **root**

> The username and password can be changed [by setting an environment variable](https://github.com/kerberos-io/agent#configure-with-environment-variables).

## Dashboard

On the dashboard page, you'll find a summary of the most relevant information and insights.

{{< figure src="dashboard.gif" alt="All relevant information on a single pane of glass" caption="All relevant information on a single pane of glass" class="stretch">}}

## Media

On the media page you'll find all your past and future recordings. It shows the recordings in a latest to oldest view and allows you to filter and browse through your recordings.

{{< figure src="media.gif" alt="All your recordings in a single place." caption="All your recordings in a single place." class="stretch">}}

## Settings

The settings page allows you to modify the Agent configuration. The settings are grouped in tabs:

- **Overview**: the camera name, timezone, offline mode and encryption.
- **Camera**: the main stream, the sub-stream and the ONVIF credentials. [Connect any IP camera to Agent](/tutorials/agent/connect-any-camera/) walks you through it.
- **Recording**: continuous or motion-based recording, the pre- and post-recording time and the maximum length of a recording.
- **Streaming**: the STUN/TURN servers and MQTT broker that [live view in Hub](/docs/hub/livestream) uses.
- **Conditions**: when and where the Agent records, such as time and regions of interest.
- **Persistence**: where recordings are uploaded, to [Vault](/docs/agent/connect-to-vault), [Hub](/docs/agent/connect-to-hub) or Dropbox, and the connection to Hub.

{{< figure src="settings.gif" alt="Configure your Agent." caption="Configure your Agent." class="stretch">}}
