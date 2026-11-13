---
title: "Quickstart"
description: "Run an Agent for one camera with Docker or Kubernetes and check that it is recording."
draft: false
weight: 203
toc: true
---

Run one Agent for one camera with either Docker or Kubernetes. Both examples use `kerberos/agent:v3.14.1`, the latest [Agent release](https://github.com/kerberos-io/agent/releases). For every other deployment option, see [Installation](/docs/agent/installation).

**Before you start:** have an IP camera with an RTSP (or RTSPS) H264 or H265 stream, and its RTSP URL. Test it from the same host with `ffplay rtsp://...` if you can. You also need an AMD64 or ARM64 machine with Docker, or a Kubernetes cluster with `kubectl` configured.

## Docker

Create a private configuration file:

```bash
mkdir agent-quickstart
cd agent-quickstart
umask 077
cat > agent.env <<'EOF'
AGENT_NAME=frontdoor
AGENT_TIMEZONE=Europe/Brussels
AGENT_USERNAME=agent-admin
AGENT_PASSWORD=REPLACE_WITH_A_STRONG_LOGIN_PASSWORD
AGENT_CAPTURE_IPCAMERA_RTSP=REPLACE_WITH_YOUR_CAMERA_RTSP_URL
AGENT_CAPTURE_CONTINUOUS=true
EOF
```

Replace both `REPLACE_WITH_...` values before continuing. Without `AGENT_USERNAME` and `AGENT_PASSWORD`, the Agent falls back to `root` / `root`. `AGENT_CAPTURE_CONTINUOUS=true` records all the time, so you see recordings straight away; set it to `false` for motion-based recording.

Create directories for configuration and recordings, owned by the container's non-root user (`999`), so they survive a container recreate:

```bash
mkdir -p config recordings
sudo chown -R 999:999 config recordings

docker run -d --name frontdoor --restart=always \
  --env-file ./agent.env \
  --publish 127.0.0.1:8080:80 \
  -v "$(pwd)/config:/home/agent/data/config" \
  -v "$(pwd)/recordings:/home/agent/data/recordings" \
  kerberos/agent:v3.14.1

docker logs frontdoor
curl --fail http://localhost:8080/health
```

Open [http://localhost:8080](http://localhost:8080) and sign in with the login you configured. A `healthy` response means the Agent's HTTP service is running; the response also reports separately whether the camera stream is connected. If the live view stays black, check the RTSP URL and the logs. Live view in the browser needs an H264 stream.

To run more cameras, start one Agent per camera with its own name, host port and directories, or use the [Docker Compose example](/tutorials/agent/install/#option-3--docker-compose-multiple-cameras).

## Kubernetes

Save this manifest as `agent.yaml`. It creates a namespace, a Secret with the login and camera URL, one Agent and a Service:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kerberos-agent
---
apiVersion: v1
kind: Secret
metadata:
  name: frontdoor
  namespace: kerberos-agent
stringData:
  AGENT_USERNAME: agent-admin
  AGENT_PASSWORD: REPLACE_WITH_A_STRONG_LOGIN_PASSWORD
  AGENT_CAPTURE_IPCAMERA_RTSP: REPLACE_WITH_YOUR_CAMERA_RTSP_URL
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontdoor
  namespace: kerberos-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontdoor
  template:
    metadata:
      labels:
        app: frontdoor
    spec:
      containers:
        - name: agent
          image: kerberos/agent:v3.14.1
          ports:
            - containerPort: 80
          env:
            - name: AGENT_NAME
              value: frontdoor
            - name: AGENT_TIMEZONE
              value: Europe/Brussels
            - name: AGENT_CAPTURE_CONTINUOUS
              value: "true"
          envFrom:
            - secretRef:
                name: frontdoor
---
apiVersion: v1
kind: Service
metadata:
  name: frontdoor
  namespace: kerberos-agent
spec:
  type: ClusterIP
  selector:
    app: frontdoor
  ports:
    - port: 80
      targetPort: 80
```

Replace both `REPLACE_WITH_...` values, then apply it:

```bash
kubectl apply -f agent.yaml
kubectl rollout status deployment/frontdoor -n kerberos-agent --timeout=300s
kubectl logs -n kerberos-agent deploy/frontdoor
kubectl port-forward -n kerberos-agent svc/frontdoor 8080:80
```

Leave port-forward running. In another terminal, confirm health:

```bash
curl --fail http://localhost:8080/health
```

Open [http://localhost:8080](http://localhost:8080) and sign in with your configured login. This minimal example keeps configuration and recordings inside the pod, so they are lost when the pod is replaced. Mount volumes at `/home/agent/data/config` and `/home/agent/data/recordings`, or upload recordings to Vault (below), before relying on it. To deploy and configure many Agents on Kubernetes from one interface, use [Factory](/docs/factory/quickstart).

## Check your first recording

In the Agent, open **Settings → Camera** and confirm the RTSP URL, then go back to the **Dashboard**: the live view should appear. With continuous recording on, new files appear under **Recordings** within a minute or so.

Next, [connect to Vault](/docs/agent/connect-to-vault) to store recordings on storage you control, or [connect to Hub](/docs/agent/connect-to-hub) to see all your Agents in one place. Read [Getting started](/docs/agent/getting-started) for a tour of the web interface.

Keep files containing credentials out of Git. The loopback port and port-forward above are for local access only; put the Agent behind HTTPS before exposing it to other networks.
