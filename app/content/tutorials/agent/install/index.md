---
title: 'Install Agent'
description: 'Run your first Agent on Docker, Docker Compose, Kubernetes, Snap or as a static binary.'
weight: 1
toc: true
---

This tutorial walks you through installing an [Agent](https://github.com/kerberos-io/agent) — one container (or binary) per camera — and reaching its web UI for the first time.

By the end you will have:

1. A running Agent on your machine.
2. Access to the web UI on port `80`.
3. Optional: persisted configuration and recordings on disk.
4. Optional: a camera (RTSP) configured through environment variables.

## Prerequisites

Before you start, make sure you have:

- An **IP camera** that supports an RTSP H264 or H265 stream. USB / Raspberry Pi cameras can be used through the [`camera-to-rtsp`](https://github.com/kerberos-io/camera-to-rtsp) sidecar.
- A machine with one of the supported architectures: ARMv6, ARMv7, ARM64 or AMD64. Examples: Raspberry Pi, NVIDIA Jetson, Intel NUC, a VM, bare metal or a Kubernetes cluster.
- One of the following runtimes installed (depending on the option you pick below):
  - [Docker](https://docs.docker.com/get-docker/) (≥ 20.10)
  - [Docker Compose](https://docs.docker.com/compose/install/) (v2)
  - A Kubernetes cluster + `kubectl`
  - [Snap](https://snapcraft.io/docs/installing-snapd) on a Linux distro
- Port `80` available on the host (or pick another and adjust the commands).

> Not sure if your camera will work? The community maintains a list of acknowledged models in [issue #59](https://github.com/kerberos-io/agent/issues/59).

## Option 1 — Docker (quickstart)

The fastest way to get an Agent running is the public image on [Docker Hub](https://hub.docker.com/r/kerberos/agent):

```bash
docker run -p 80:80 --name mycamera -d --restart=always kerberos/agent:latest
```

Open [http://localhost](http://localhost) and log in with the default credentials:

- **Username:** `root`
- **Password:** `root`

> Change these credentials before exposing the agent to anything that isn't `localhost` (see [Configure with environment variables](#configure-with-environment-variables)).

If you intend to connect to a USB / Raspberry Pi camera through the [`camera-to-rtsp`](https://github.com/kerberos-io/camera-to-rtsp) sidecar, run the agent in the host network so it can reach the local RTSP stream:

```bash
docker run --network=host --name mycamera -d --restart=always kerberos/agent:latest
```

## Option 2 — Docker with persistent volumes

By default, configuration and recordings live inside the container. To persist them across recreations, mount two host directories:

```bash
mkdir -p agent/config agent/recordings
chmod -R 755 agent/
chown 100:101 agent/ -R   # required by the non-root user inside the container

docker run -p 80:80 --name mycamera \
  -v $(pwd)/agent/config:/home/agent/data/config \
  -v $(pwd)/agent/recordings:/home/agent/data/recordings \
  -d --restart=always kerberos/agent:latest
```

More details on permissions are in [issue #80](https://github.com/kerberos-io/agent/issues/80).

## Option 3 — Docker Compose (multiple cameras)

Create a `docker-compose.yaml` with one service per camera:

```yaml
services:
  frontdoor:
    image: kerberos/agent:latest
    restart: always
    ports:
      - "8080:80"
    environment:
      AGENT_NAME: frontdoor
      AGENT_TIMEZONE: Europe/Brussels
      AGENT_CAPTURE_IPCAMERA_RTSP: rtsp://user:pass@192.168.1.10/stream1
      AGENT_CAPTURE_CONTINUOUS: "true"
    volumes:
      - ./frontdoor/config:/home/agent/data/config
      - ./frontdoor/recordings:/home/agent/data/recordings

  garage:
    image: kerberos/agent:latest
    restart: always
    ports:
      - "8081:80"
    environment:
      AGENT_NAME: garage
      AGENT_TIMEZONE: Europe/Brussels
      AGENT_CAPTURE_IPCAMERA_RTSP: rtsp://user:pass@192.168.1.11/stream1
    volumes:
      - ./garage/config:/home/agent/data/config
      - ./garage/recordings:/home/agent/data/recordings
```

Start the stack:

```bash
docker compose up -d
```

Each camera is reachable on its own host port (`8080`, `8081`, ...).

## Option 4 — Kubernetes

For production or multi-node deployments, use the Kubernetes manifests provided in the [`deployments/kubernetes`](https://github.com/kerberos-io/agent/tree/master/deployments/kubernetes) folder of the agent repo.

A minimal `Deployment` + `Service` looks like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kerberos-agent-frontdoor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kerberos-agent-frontdoor
  template:
    metadata:
      labels:
        app: kerberos-agent-frontdoor
    spec:
      containers:
        - name: agent
          image: kerberos/agent:latest
          ports:
            - containerPort: 80
          env:
            - name: AGENT_NAME
              value: frontdoor
            - name: AGENT_CAPTURE_IPCAMERA_RTSP
              value: rtsp://user:pass@192.168.1.10/stream1
---
apiVersion: v1
kind: Service
metadata:
  name: kerberos-agent-frontdoor
spec:
  type: ClusterIP
  selector:
    app: kerberos-agent-frontdoor
  ports:
    - port: 80
      targetPort: 80
```

Apply it:

```bash
kubectl apply -f kerberos-agent.yaml
kubectl port-forward svc/kerberos-agent-frontdoor 8080:80
```

Then open [http://localhost:8080](http://localhost:8080).

For OpenShift, see the [Ansible playbook](https://github.com/kerberos-io/agent/tree/master/deployments/ansible-openshift). For infrastructure-as-code, see the [Terraform examples](https://github.com/kerberos-io/agent/tree/master/deployments/terraform).

## Option 5 — Snap (Linux)

On any Linux distro with `snapd`:

```bash
sudo snap install kerberosio
sudo kerberosio.agent -action=run -port=80
```

Configuration lives at `/var/snap/kerberosio/common`.

## Option 6 — Static binary

Each release publishes pre-built binaries on the [releases page](https://github.com/kerberos-io/agent/releases). Download the archive matching your OS / architecture, extract it, and run:

```bash
tar -xzf kerberos-agent-*.tar.gz
cd kerberos-agent
./main -action run -port 80
```

## Configure with environment variables

Most behaviour can be overridden through environment variables — handy for Compose, Kubernetes, Ansible, etc. A minimal example:

```bash
docker run -p 80:80 --name mycamera \
  -e AGENT_NAME=mycamera \
  -e AGENT_TIMEZONE=Europe/Brussels \
  -e AGENT_USERNAME=admin \
  -e AGENT_PASSWORD=change-me \
  -e AGENT_CAPTURE_IPCAMERA_RTSP=rtsp://user:pass@192.168.1.10/stream1 \
  -e AGENT_CAPTURE_CONTINUOUS=true \
  -d --restart=always kerberos/agent:latest
```

A few of the most common variables:

| Variable | Description | Default |
| --- | --- | --- |
| `AGENT_NAME` | Friendly name of the agent. | `agent` |
| `AGENT_USERNAME` / `AGENT_PASSWORD` | Web UI credentials. | `root` / `root` |
| `AGENT_TIMEZONE` | Timezone used for timestamps. | `Africa/Ceuta` |
| `AGENT_CAPTURE_IPCAMERA_RTSP` | Main RTSP stream of your camera. | *(empty)* |
| `AGENT_CAPTURE_IPCAMERA_SUB_RTSP` | Sub-stream used for live view (WebRTC). | *(empty)* |
| `AGENT_CAPTURE_CONTINUOUS` | `true` for continuous recording, `false` for motion-based. | `false` |
| `AGENT_CLOUD` | Cloud target: `s3` (Hub), `kstorage` (Vault) or `dropbox`. | `s3` |

The full list lives in the [Agent README](https://github.com/kerberos-io/agent#configure-with-environment-variables).

## Verify the installation

1. Open `http://<host>:80` in your browser.
2. Log in with the credentials above.
3. Open **Settings → Camera** and confirm your RTSP URL — the live preview should appear.
4. Trigger motion in front of the camera (or enable `AGENT_CAPTURE_CONTINUOUS=true`) and check **Recordings**.

## Troubleshooting

- **No live view / black screen:** verify the RTSP URL with `ffplay rtsp://...` from the same host. WebRTC requires H264 — H265 sub-streams will not preview.
- **Permission errors on the volume:** make sure the host directory is owned by `100:101` and is mode `755` (see [Option 2](#option-2--docker-with-persistent-volumes)).
- **Port `80` already in use:** map another host port, e.g. `-p 8080:80`.
- **Behind a firewall / NAT for live streaming:** review the `AGENT_STUN_URI`, `AGENT_TURN_URI`, `AGENT_TURN_USERNAME` and `AGENT_TURN_PASSWORD` variables.
- **Logs:** `docker logs -f mycamera` (or `kubectl logs -f deploy/...`).

## Next steps

- Connect this agent to **Hub** for centralized monitoring — see the upcoming [Hub tutorial](../../hub/).
- Forward recordings to **Vault** — see the upcoming [Vault tutorial](../../vault/).
- Review the in-depth [agent installation docs](/docs/agent/installation/) for advanced deployment patterns (Ansible, Terraform, Balena, ...).
