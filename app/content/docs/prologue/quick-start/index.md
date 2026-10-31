---
title: "Quick Start"
description: "Run your first Agent in a few minutes, see your camera live, then grow into the full platform."
lead: "Run your first Agent in a few minutes, see your camera live, then grow into the full platform."
date: 2020-11-16T13:59:39+01:00
lastmod: 2026-10-31T00:00:00+00:00
draft: false
images: []
menu:
  docs:
    parent: "prologue"
weight: 101
toc: true
---

Every Augment Vision deployment starts with an [Agent](/docs/agent/): one per camera, recording its stream and detecting what happens in front of it. This page gets a first Agent running with Docker in a few minutes. From there you can add Vault, Hub and Factory as your deployment grows.

## Before you start

- An **IP camera** with an RTSP stream in H264 or H265, and its RTSP URL (for example `rtsp://user:pass@192.168.1.10/stream1`). Not sure it works? See [Connect any IP camera to Agent](/tutorials/agent/connect-any-camera/).
- A machine with an **ARM64 or AMD64** processor, such as a Raspberry Pi, an Intel NUC, a VM or a server, with [Docker](https://docs.docker.com/get-docker/) 20.10 or newer.
- Port `80` free on that machine, or another port you map instead.

## 1. Start an Agent

Run the public image with your camera's RTSP URL and your own login:

```bash
docker run -p 80:80 --name mycamera -d --restart=always \
  -e AGENT_NAME=mycamera \
  -e AGENT_USERNAME=admin \
  -e AGENT_PASSWORD=change-me \
  -e AGENT_CAPTURE_IPCAMERA_RTSP=rtsp://user:pass@192.168.1.10/stream1 \
  kerberos/agent:latest
```

Replace the RTSP URL, and pick a password other than `change-me`. Without `AGENT_USERNAME` and `AGENT_PASSWORD`, the login is `root` / `root`; change it before the Agent is reachable from anywhere but your own machine.

## 2. Open the web UI

Open [http://localhost](http://localhost), or `http://<machine-ip>` from another computer, and log in with the username and password you set.

## 3. See your camera and its recordings

1. The **Dashboard** shows the camera live. Live view needs an H264 stream; if your main stream is H265, add its H264 sub-stream with `-e AGENT_CAPTURE_IPCAMERA_SUB_RTSP=...`.
2. Move in front of the camera, then open **Recordings**: the Agent records when it detects motion. To record all the time instead, add `-e AGENT_CAPTURE_CONTINUOUS=true`.

Your camera settings can also be changed later under **Settings → Camera**.

## 4. Grow into the platform

{{< cards cols="2" >}}
  {{< card link="/docs/agent/connect-to-vault/" title="Keep recordings in your own storage" subtitle="Connect the Agent to Vault, which stores recordings in S3, Azure, Ceph or other storage you control." icon="database" >}}
  {{< card link="/docs/agent/connect-to-hub/" title="Watch every camera in one place" subtitle="Connect the Agent to Hub for live view, playback, alerts and workflows across all your sites." icon="desktop-computer" >}}
  {{< card link="/docs/factory/first-things-first/" title="Run an Agent for every camera" subtitle="Let Factory deploy and manage an Agent per camera on your Kubernetes cluster." icon="server" >}}
  {{< card link="/tutorials/agent/install/" title="More ways to install" subtitle="Persistent volumes, Docker Compose for several cameras, Kubernetes, Snap or a static binary." icon="terminal" >}}
{{< /cards >}}

## If something doesn't work

- **No live view:** check the RTSP URL from the same machine with `ffplay rtsp://...`, and make sure the live stream is H264.
- **Port 80 is in use:** map another port, for example `-p 8080:80`, and open `http://localhost:8080`.
- **Anything else:** read the Agent's log with `docker logs -f mycamera`.
