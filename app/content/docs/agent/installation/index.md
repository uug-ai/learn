---
podcast: agent-installation
title: "Installation"
description: "Run Agents everywhere"
lead: "Run Agents everywhere"
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-11-04T00:00:00+00:00
draft: false
images: []
menu:
  agent:
    parent: "agent"
weight: 202
toc: true
---

## Overview

As described before, an Agent is a container, which can be deployed in various ways and with automation tools such as Docker, Docker Compose, Kubernetes and the list goes on. To simplify your life we have come up with concrete and working examples of deployments to help you speed up your Kerberos.io journey.

We have documented the different deployment models in the [Agent GitHub repository](https://github.com/kerberos-io/agent/tree/master/deployments). There you'll learn how to deploy using:

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

By default your Agents will store all their configuration and recordings inside the container. To help you automate and have more consistent data governance, you can [attach volumes](https://github.com/kerberos-io/agent#configure-and-persist-with-volume-mounts) to configure and persist data of your Agents, and/or configure each Agent [through environment variables](https://github.com/kerberos-io/agent#configure-with-environment-variables).

## Container image migration: HTTP port 8080

The hardened image update in [kerberos-io/agent#350](https://github.com/kerberos-io/agent/pull/350) is **forthcoming, not a published release**. Currently published images listen internally on port `80`; the [Quick Start](/docs/prologue/quick-start/) and [Install Agent](/tutorials/agent/install/) commands still target those images. Do not change their container port without also selecting an image that contains the update.

The production Dockerfile at [revision e3acd64](https://github.com/kerberos-io/agent/blob/e3acd64a57a787c028bb56bf2a9bceccae3de889/Dockerfile) sets `AGENT_PORT=8080` and exposes TCP `8080`. Once that image is available, select its exact release tag or digest and update the **container side** of each mapping. The host-facing port and browser URL can stay unchanged:

| Deployment | Published image (internal `80`) | Forthcoming image (internal `8080`) |
| --- | --- | --- |
| Docker, host port 80 | `-p 80:80` | `-p 80:8080` |
| Docker, host port 8080 | `-p 8080:80` | `-p 8080:8080` |
| Compose, first camera | `"8080:80"` | `"8080:8080"` |
| Compose, second camera | `"8081:80"` | `"8081:8080"` |
| Kubernetes container | `containerPort: 80` | `containerPort: 8080` |
| Kubernetes Service | `port: 80`, `targetPort: 80` | `port: 80`, `targetPort: 8080` |
| Direct in-container HTTP endpoint | `http://localhost:80/health` | `http://localhost:8080/health` |

Keep the Kubernetes Service's public `port: 80` if clients already use it. A Service port-forward such as `kubectl port-forward svc/kerberos-agent-frontdoor 8080:80` then stays unchanged; a direct Pod port-forward must instead target `8080`. Update HTTP readiness/liveness probe ports and any reverse proxy that connects directly to the container. The health path is `/health`, not `/healthz`.

Docker host networking ignores `-p`: with the forthcoming default, open `http://<host>:8080` and update direct health checks accordingly. Check existing `AGENT_PORT` overrides as well; the actual listener, mappings and probes must agree. Changing the host-side mapping alone does not change the Agent listener.

The built-in health check uses exec-form `/home/agent/main -action healthcheck`, not shell or curl. It probes localhost `/health` on the resolved port with a five-second timeout, bypasses proxies, rejects redirects and validates the Agent JSON response; Docker allows ten seconds for the command. This is HTTP liveness, not proof that the camera, MQTT or Hub is ready. No new Prometheus metrics listener is added.

This migration applies to the production image only. The separate `kerberos/agent-dev` image, standalone binary and Snap defaults are unchanged. No hardened release digest or signature is available yet.

### Runtime and writable storage

The update uses a digest-pinned Go `1.26.10` multi-stage build and a final `scratch` image populated with an assembled Debian/glibc runtime. Agent still requires CGO, FFmpeg/ffprobe, dynamic media libraries and plugins, certificates and runtime data; `scratch` does **not** mean this is a static, library-free image. Package-manager executables and build tools are not part of the final runtime; update it by rebuilding and replacing the image.

The forthcoming image runs with fixed numeric `USER 999:999`, without bundled file capabilities or setuid/setgid programs. HTTP on port `8080` needs no `NET_BIND_SERVICE`; Docker deployments can use `--cap-drop=ALL --security-opt=no-new-privileges:true`. Do not use `--privileged` for ordinary IP cameras.

Only `/home/agent/data/` (configuration, recordings and upload state) needs application writes. The home directory, binary and `www/` UI assets remain root-owned and non-writable by UID `999`; demo mode no longer rewrites UI assets. Existing mounts under `/home/agent/data/` are retained. Grant UID/GID `999:999` access only to the mounted data directories, not the entire application tree.

Temporary files need writable `/tmp` and `/var/tmp`. Disposable caches use `XDG_CACHE_HOME=/tmp/agent-cache`, owned by `999:999` with mode `0700`; recreate that directory with the same ownership and permissions when mounting fresh storage over `/tmp`. A read-only root filesystem requires initialized writable data and temporary mounts. Empty bind mounts hide packaged data, so initialize them before use; Docker named volumes populate packaged contents on first use. The [updated Kubernetes volume example](https://github.com/kerberos-io/agent/blob/e3acd64a57a787c028bb56bf2a9bceccae3de889/deployments/kubernetes/deployment-agent-volume.yml) uses an init container to initialize data and the cache while preserving the existing PVC layout.

Numeric `USER 999:999` does not automatically inherit supplementary `video` group membership. If deliberately passing a video device to Agent, add the actual host device GID explicitly (for GID `44`: Docker `--group-add 44`, Compose `group_add: ["44"]`, or Kubernetes `supplementalGroups: [44]`). Ordinary IP cameras do not need this; USB/Raspberry Pi cameras still use the separate RTSP sidecar.

`/bin/sh`, PTY support and basic shell utilities remain for remote-terminal functionality; curl is absent. Remote-terminal shell support is a **pending policy exception**, not an approved waiver or evidence that the full [image-hardening baseline](/guides/security/image-hardening/) is satisfied. This update does not establish CIS compliance, vulnerability-free images, or the availability of scan reports or signatures.

## Next steps

- Tour the web interface in [Getting started](/docs/agent/getting-started).
- [Connect to Vault](/docs/agent/connect-to-vault) to store recordings on storage you control.
- [Connect to Hub](/docs/agent/connect-to-hub) to see all your Agents, live views and alerts in one place.
