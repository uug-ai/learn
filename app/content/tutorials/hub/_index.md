---
title: 'Hub'
weight: 3
toc: false
---

Hands-on tutorials for [Hub](https://github.com/kerberos-io/hub) — the central pane of glass to monitor and manage all your Agents and sites.

## Tutorials

- [Set up your own workflow stage](custom-workflow-stage/) — bring your own microservice into the Hub as a workflow stage, end to end: register it in the Helm chart, receive recordings, and ingest results back. Object detection serves as the worked example.
- [Choose a live-stream transport: MoQ vs HLS vs WebRTC](moq-vs-hls-vs-webrtc/) — compare latency, fan-out, firewall compatibility, browser support and two-way media, then validate the choice on your own network.
- [Deploy a MoQ relay on Kubernetes](deploy-moq-relay-kubernetes/) — expose a TLS-enabled relay over UDP 443, then connect the Hub Helm chart and MoQ-capable Agents to it.
- [Set up WebRTC live view with TURN](setup-webrtc-turn/) — deploy an external TURN path, configure Hub and Agents, then verify direct and forced-relay ICE connections.
- [Set up HLS live view](setup-hls-live-view/) — enable firewall-friendly HLS and LL-HLS, validate authenticated CMAF playback, and troubleshoot each startup phase.

### Coming soon

- Install Hub (self-hosted)
- Connect an Agent to Hub
- Onboard your first site and users
