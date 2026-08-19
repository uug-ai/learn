---
title: 'Set up HLS live view'
description: 'Configure firewall-friendly HLS and low-latency HLS live video between Kerberos Agents, Hub API and operator browsers.'
weight: 5
toc: true
---

{{< tutorial-header alt="Abstract HLS lettering on a dark background" >}}

HLS live view carries video over ordinary authenticated HTTPS. It needs no browser-to-Agent media path, ICE negotiation or TURN relay, which makes it the most predictable Kerberos live transport across corporate firewalls, VPNs and mobile networks.

Kerberos uses CMAF/fMP4 packaging and enables low-latency HLS (LL-HLS) by default. An Agent creates short-lived media parts only while someone is watching, uploads them to Hub API, and the browser follows a rolling playlist with `hls.js`.

{{< tutorial-meta time="~20 min" level="Beginner" stack="HLS · LL-HLS · Helm" prerequisites="A self-hosted Hub and connected Agent" >}}

{{< tutorial-panel tone="brand" icon="play" title="What you'll configure" >}}
By the end, you will have:

- HLS available or selected as the default Hub Live transport
- Agent-to-Hub live CMAF uploads over HTTPS
- Authenticated browser playback over the same HTTPS endpoint
- LL-HLS parts and idle prewarming enabled for faster startup
- Quality selection between camera main and sub streams
- Hub diagnostics for request, playlist and buffering phases
{{< /tutorial-panel >}}

## Understand the path

HLS separates control traffic from media traffic. The browser repeatedly requests a live session over MQTT. The Agent packages encoded camera frames into CMAF, uploads an init object and media parts to Hub API over HTTPS, then announces the ready session over MQTT. The browser fetches that session's playlist and media from Hub API with its bearer token.

{{< rete caption="HLS uses MQTT for viewer requests and session readiness. All media crosses the camera-site firewall as outbound HTTPS uploads and reaches the browser as authenticated HTTPS downloads." alt="Kerberos HLS path from camera through Agent and Hub API to browser" height="570" >}}
{
  "groups": [
    { "id": "edge", "label": "Camera site", "x": 0, "y": 20, "w": 410, "h": 520 },
    { "id": "hub", "label": "Kerberos Hub", "x": 490, "y": 20, "w": 330, "h": 520 },
    { "id": "operator", "label": "Operator network", "x": 900, "y": 20, "w": 320, "h": 520 }
  ],
  "nodes": [
    { "id": "camera", "kind": "camera", "x": 30, "y": 205, "w": 160, "h": 120,
      "header": "CAMERA", "title": "IP camera", "subtitle": "RTSP / H.264", "groupId": "edge" },
    { "id": "agent", "kind": "agent", "x": 220, "y": 195, "w": 160, "h": 140,
      "header": "AGENT", "title": "CMAF packager", "subtitle": "Init + parts + segments", "groupId": "edge" },
    { "id": "mqtt", "kind": "mqtt", "x": 535, "y": 70, "w": 240, "h": 120,
      "header": "MQTT", "title": "MQTT broker", "subtitle": "Request + ready", "groupId": "hub" },
    { "id": "api", "kind": "api", "x": 535, "y": 330, "w": 240, "h": 140,
      "header": "HUB API", "title": "Live HLS window", "subtitle": "Playlist + short-TTL media", "groupId": "hub" },
    { "id": "browser", "kind": "frontend", "x": 940, "y": 195, "w": 240, "h": 140,
      "header": "HUB FRONTEND", "title": "hls.js player", "subtitle": "Authenticated playback", "groupId": "operator" }
  ],
  "connections": [
    { "from": "camera", "to": "agent", "fromSide": "right", "toSide": "left", "label": "RTSP" },
    { "from": "browser", "to": "mqtt", "fromSide": "top", "toSide": "right", "label": "Request keepalive", "kind": "dashed" },
    { "from": "mqtt", "to": "agent", "fromSide": "left", "toSide": "top", "label": "request-hls-stream", "kind": "dashed" },
    { "from": "agent", "to": "api", "fromSide": "bottom", "toSide": "left", "label": "HTTPS CMAF upload", "animated": true },
    { "from": "agent", "to": "mqtt", "fromSide": "top", "toSide": "left", "label": "receive-hls-ready", "kind": "dashed" },
    { "from": "api", "to": "browser", "fromSide": "right", "toSide": "bottom", "label": "HTTPS playlist + media", "animated": true }
  ]
}
{{< /rete >}}

The Agent stops live uploads about eight seconds after the last viewer keepalive. With prewarming enabled, it keeps only a small encoded window in memory while idle and flushes it when the next viewer arrives; it does not continuously send idle video to Hub.

## Before you start

You need:

- A self-hosted Hub whose API and frontend are available through HTTPS.
- A connected Agent with Hub URI, access key and private key configured.
- Live view enabled in the Agent camera configuration.
- MQTT connectivity between Hub frontend and Agent.
- Outbound HTTPS from the Agent to Hub API.
- An H.264 camera stream for reliable browser playback.

The Agent segmenter can package H.265, but browser HEVC support varies by operating system, browser and hardware. Use H.264 unless every target operator device has been validated with your exact stream.

## Configure Hub

{{% steps %}}

### Select HLS in Helm values

Set HLS as the default Live transport and expose it in the transport menu:

```yaml {filename="values.yaml"}
kerberoshub:
  frontend:
    features:
      liveview:
        liveStreamMode: "hls"
        hlsEnabled: "true"
        moqEnabled: "false"
```

`liveStreamMode` controls what the **Live** button opens. `hlsEnabled` keeps HLS selectable if another transport is the default. You can leave WebRTC or MoQ enabled alongside it and let operators switch per stream.

### Apply the Hub release

```bash
helm repo add kerberos https://charts.kerberos.io
helm repo update
helm upgrade hub kerberos/hub \
  --namespace kerberos-hub \
  --values values.yaml
kubectl -n kerberos-hub rollout status deployment/hub-api
kubectl -n kerberos-hub rollout status deployment/hub-frontend
```

Use your actual release, namespace and deployment names if they differ.

### Confirm frontend configuration

After the rollout, log out and back in or hard-refresh Hub. Open a camera and confirm **HLS** is available in the live transport menu and is selected by the main **Live** action.

{{% /steps %}}

## Configure the Agent

HLS uses the existing Hub identity rather than HLS-specific credentials. A containerized Agent needs the equivalent of:

```yaml
env:
  - name: AGENT_HUB_URI
    value: "https://api.hub.example.com"
  - name: AGENT_HUB_KEY
    valueFrom:
      secretKeyRef:
        name: agent-hub
        key: access-key
  - name: AGENT_HUB_PRIVATE_KEY
    valueFrom:
      secretKeyRef:
        name: agent-hub
        key: private-key
```

Factory-managed Agents already receive these values from their assigned Hub account. Also confirm the Agent is online and live view is enabled for the camera; its HLS producer exits when either condition is false.

### Keep the low-latency defaults

The current Agent enables both optimizations unless they are set to the exact string `false`:

| Agent variable | Default | Effect |
|---|---|---|
| `AGENT_LIVE_HLS_LOW_LATENCY` | Enabled | Publishes approximately 300 ms CMAF parts within approximately 2 s segments for 1-2 s target latency |
| `AGENT_LIVE_HLS_PREWARM` | Enabled | Keeps a one-segment in-memory window while idle for faster first frame |

No variables are required for the recommended setup. If your deployment templates prefer explicit intent, set both to `true`:

```yaml
env:
  - name: AGENT_LIVE_HLS_LOW_LATENCY
    value: "true"
  - name: AGENT_LIVE_HLS_PREWARM
    value: "true"
```

Disable low latency only to diagnose a client or proxy that mishandles LL-HLS parts. Disable prewarming only when minimizing idle CPU is more important than startup speed.

{{< tutorial-panel tone="neutral" icon="clipboard-check" title="Live HLS uses its own segmenter" >}}
Current Agents always write recordings as fragmented MP4. Live HLS independently packages camera frames into short-lived CMAF parts and segments for Hub, so no recording-format setting is needed for this tutorial.
{{< /tutorial-panel >}}

Restart the Agent after changing its environment and confirm startup logs report both features as enabled:

```bash
kubectl -n <agent-namespace> rollout restart deployment/<agent-deployment>
kubectl -n <agent-namespace> rollout status deployment/<agent-deployment>
kubectl -n <agent-namespace> logs deployment/<agent-deployment> \
  | grep -i 'live HLS'
```

Expected messages include:

```text
live HLS prewarm ENABLED
live HLS low-latency (LL-HLS) ENABLED
```

## Configure the network

HLS is friendly to stateful firewalls because the camera site accepts no new inbound connection:

| Source | Destination | Rule | Purpose |
|---|---|---|---|
| Agent | Hub API | Outbound TCP 443 | Upload init, parts and segments |
| Agent | MQTT broker | Outbound broker port | Receive viewer requests and announce readiness |
| Operator browser | Hub frontend/API | Outbound TCP 443 | UI, playlist and media playback |
| Operator browser | MQTT broker | Outbound broker WebSocket port | Send viewer keepalives and receive readiness |

Allow long-lived WebSockets through load balancers and reverse proxies. Ensure proxies pass authorization headers and do not apply long cache lifetimes to `/storage/live/`; Hub owns the rolling playlist and short media TTL.

For a standard authenticated stream, the browser loads:

```text
GET /storage/live/<device>/<session>/index.m3u8
GET /storage/live/<device>/<session>/<part-or-segment-name>
Authorization: Bearer <access-token>
```

Never expose these paths through an unauthenticated static file service. Hub verifies that the signed-in user owns the device before serving live media.

## Verify the stream

1. Open Hub, choose a camera, select **Live**, then choose **HLS** if it is not already active.
2. Hover the live status indicator and watch the phases advance:

| Phase | What it proves |
|---|---|
| `Requesting stream` | Browser is publishing MQTT viewer keepalives |
| `Loading playlist` | Agent uploaded initial media and announced a session ID |
| `Buffering segments` | Browser fetched the authenticated playlist and is loading CMAF media |
| `Connected` | The video element is rendering real frames |

3. Open browser developer tools and filter the Network panel for `m3u8`, `m4s` or `storage/live`.
4. Confirm the playlist returns `200`, contains `#EXT-X-PART` in LL-HLS mode, and subsequent media requests remain successful.
5. Follow Agent and Hub API logs while reconnecting:

```bash
kubectl -n <agent-namespace> logs deployment/<agent-deployment> \
  --follow | grep -i 'live HLS'
kubectl -n kerberos-hub logs deployment/hub-api \
  --follow | grep -i -E 'storage/live|live hls'
```

The Agent should log a prewarmed session, activate uploads for the viewer, and announce the session after its first part or segment lands. Closing the viewer should stop uploads after the keepalive timeout.

## Verify quality selection

If the camera has both main and sub streams configured, change the HLS quality control between **High** and **Low**. Each change requests a fresh session because resolution and codec initialization belong to that session.

- **High** selects the camera main stream.
- **Low** selects the camera sub stream.
- **Auto** lets the Agent apply its configured stream-selection policy.

Use H.264 for both streams. A lower-resolution sub stream is useful on constrained uplinks because each active viewer causes the Agent to upload one selected live rendition to Hub.

## Measure latency and load

LL-HLS targets approximately 1-2 seconds glass-to-glass under healthy conditions. Whole-segment HLS is normally around 4-6 seconds because the player buffers multiple approximately 2-second segments. Actual latency also includes the camera GOP, Agent upload, Hub response time and browser buffer.

When sizing the deployment, account for:

- One Agent-to-Hub upload per active camera session, not per browser.
- Hub-to-browser egress for every viewer.
- Short-lived live objects and playlist requests in Hub API.
- Camera bitrate and keyframe interval. Long GOPs slow un-prewarmed startup and recovery.

## Troubleshoot common failures

| Symptom | Check |
|---|---|
| Stuck on `Requesting stream` | MQTT WebSocket/broker path, Agent online state and live-view setting |
| Stuck on `Loading playlist` | Agent Hub URI/key, outbound HTTPS, Hub API upload logs and camera keyframes |
| Playlist returns `401` or `403` | Browser session, bearer token and device ownership |
| Playlist briefly returns `404` | Session readiness/TTL timing; the player retries before requesting a fresh session |
| Playlist loads but media fails | Reverse-proxy routing for every `/storage/live/...` object and authorization header forwarding |
| Long startup delay | Prewarm log state, keyframe interval and Agent upload latency |
| Latency is 4-6 seconds | LL-HLS was disabled or `#EXT-X-PART` is absent from the playlist |
| H.265 stream is blank | Browser HEVC support; switch camera main/sub stream to H.264 |
| Stream repeatedly restarts | Agent-to-Hub upload stability, object TTL, proxy buffering and camera timestamp continuity |
| High works but Low fails | Sub-stream URL, codec, dimensions and keyframe production |

If HLS works while WebRTC fails, the likely fault is ICE/TURN or direct UDP rather than camera capture. Continue with [Set up WebRTC live view with TURN](/tutorials/hub/setup-webrtc-turn/) to add the lower-latency interactive path, or read [Choose a live-stream transport: MoQ vs HLS vs WebRTC](/tutorials/hub/moq-vs-hls-vs-webrtc/) to compare the tradeoffs.

{{< tutorial-panel tone="success" icon="badge-check" title="HLS live view is ready" >}}
Hub now requests live sessions over MQTT, Agents upload LL-HLS media over outbound HTTPS only while viewers are active, and browsers play authenticated CMAF from Hub API without ICE or TURN.
{{< /tutorial-panel >}}