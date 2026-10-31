---
title: "ONVIF"
description: "Communicate with your Agents through MQTT and ONVIF."
lead: "Communicate with your Agents through MQTT and ONVIF."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 306
toc: true
podcast: hub-onvif
---

When adding and deploying your Agents you have [the option to enable ONVIF](/docs/factory/getting-started/#adding-a-new-deployment) integration. Once enabled and connected properly to your camera using ONVIF, you can leverage specific functions and features of the camera, such as PTZ, Streaming Profiles, etc. Which features are available depends on the camera you are using, and [which ONVIF profiles](https://www.onvif.org/profiles) are supported.

You can also enable ONVIF for a single Agent, under **ONVIF** in the Agent's camera settings. When [connecting your Agents to Kerberos Hub](/docs/agent/connect-to-hub), you can start leveraging those capabilities. This means that certain ONVIF actions are forwarded from Kerberos Hub to the (edge deployed) Agents. The forwarding is happening through the MQTT bidirectional connection you have set up. In other words, this setup allows you to control your cameras from the internet without needing any port forwarding or special network sessions.

![MQTT Kerberos Hub architecture](mqtt-kerberos-hub.svg)

## PTZ

One of the key elements of ONVIF is the ability to control PTZ or use and configure presets, without using the built-in controls and application of the camera provider. By leveraging the ONVIF protocol, providers such as Kerberos.io can leverage capabilities such as PTZ in its own application and user interface. 

This brings several advantages, such as a unified experience independent of the camera brand, which usually end up in more scalable and well designed user interfaces. At least that's what our mission is at Kerberos.io.

When browsing to the livestream page of a specific camera or groups of cameras, you will see some of the PTZ functions visualised. Using the pan-tilt control, you can move the camera from left to right, top to bottom or the other way around. By pressing the centre button, you will move the camera to its centre location.

![PTZ on Kerberos Hub](ptz.gif)

A couple more features will be added shortly and are scheduled on our roadmap, such as Zoom out and Zoom in control, and the ability to set/get preset PTZ positions.