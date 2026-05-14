---
title: "Pipeline"
description: "A series of microservices to bring the scale you are looking for."
lead: "A series of microservices to bring the scale you are looking for."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 304
toc: true
---
 
Hub processes every recording through a pipeline of small, focused microservices. As soon as a camera triggers an Agent, the resulting recording is pushed to Vault, an event lands on the message broker and Hub picks it up — kicking off a chain of services that enrich, classify and alert on that single event.

{{< rete caption="Pipelines to scale the processing." alt="Pipelines to scale the processing." height="500" >}}
{
  "groups": [
    { "id": "ingest",   "label": "Agent to Vault integration",  "x":   0, "y":   0, "w": 1180, "h": 220 },
    { "id": "pipeline", "label": "Hub Pipeline", "x":   0, "y": 240, "w": 1180, "h": 620 }
  ],
  "nodes": [
    { "id": "rabbitmq",  "kind": "amqp",    "x":   50, "y":  60, "w": 200, "h": 130,
      "header": "AMQP",   "title": "RabbitMQ", "subtitle": "Message broker" },
    { "id": "vault",     "kind": "vault",   "x":  270, "y":  60, "w": 200, "h": 130,
      "header": "STORE",  "title": "Vault",    "subtitle": "Integrate / Store" },
    { "id": "agent",     "kind": "agent",   "x":  490, "y":  60, "w": 200, "h": 130,
      "header": "RECORD", "title": "Agent",    "subtitle": "Motion / Record" },
    { "id": "camera",    "kind": "camera",  "x":  710, "y":  60, "w": 200, "h": 130,
      "header": "STREAM", "title": "Camera",   "subtitle": "RTSP / ONVIF source" },

    { "id": "monitor",      "kind": "pipeline-monitor",       "x":   50, "y": 300, "w": 200, "h": 130, "step": 1,
      "header": "PIPE SERVICE", "title": "Monitor",      "subtitle": "Rate limiting and security" },
    { "id": "sequence",     "kind": "pipeline-sequence",      "x":  270, "y": 300, "w": 200, "h": 130, "step": 2,
      "header": "PIPE SERVICE", "title": "Sequence",     "subtitle": "Media grouping" },
    { "id": "analysis",     "kind": "pipeline-analysis",      "x":  490, "y": 300, "w": 200, "h": 130, "step": 3,
      "header": "PIPE SERVICE", "title": "Analysis",     "subtitle": "Analysis Router" },
    { "id": "throttler",    "kind": "pipeline-threshold",     "x":  710, "y": 300, "w": 200, "h": 130, "step": 4,
      "header": "PIPE SERVICE", "title": "Throttler",    "subtitle": "Rate limiting" },
    { "id": "notification", "kind": "pipeline-notification",  "x":  930, "y": 300, "w": 200, "h": 130, "step": 5,
      "header": "PIPE SERVICE", "title": "Notification", "subtitle": "Trigger alerts" },

    { "id": "thumbnail",   "kind": "pipeline-thumbnail",     "x":   50, "y": 480, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "Thumbnail",      "subtitle": "Generate poster image" },
    { "id": "dominant",    "kind": "pipeline-dominantcolor", "x":  270, "y": 480, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "Dominant color", "subtitle": "Calculate top colors" },
    { "id": "sprite",      "kind": "pipeline-sprite",        "x":  490, "y": 480, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "Sprite",         "subtitle": "Video timelapse" },
    { "id": "classifier",  "kind": "pipeline-classifier",    "x":  710, "y": 480, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "Classification", "subtitle": "Object detection" },
    { "id": "counting",    "kind": "pipeline-counting",      "x":  930, "y": 480, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "Counting",       "subtitle": "Object counting" },

    { "id": "licenseplate", "kind": "pipeline-licenseplate", "x":  270, "y": 660, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "License plate", "subtitle": "OCR processing" },
    { "id": "nohelmet",     "kind": "pipeline-nohelmet",     "x":  490, "y": 660, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "No helmet",     "subtitle": "Safety detection" },
    { "id": "llm",          "kind": "pipeline-llm",          "x":  710, "y": 660, "w": 200, "h": 130,
      "header": "PIPE SERVICE", "title": "LLM",           "subtitle": "Large language model" }
  ],
  "connections": [
    { "from": "camera",   "to": "agent",    "fromSide": "left",  "toSide": "right" },
    { "from": "agent",    "to": "vault",    "fromSide": "left",  "toSide": "right" },
    { "from": "vault",    "to": "rabbitmq", "fromSide": "left",  "toSide": "right" },
    { "from": "rabbitmq", "to": "monitor",  "fromSide": "bottom", "toSide": "top" },

    { "from": "monitor",   "to": "sequence",     "fromSide": "right", "toSide": "left" },
    { "from": "sequence",  "to": "analysis",     "fromSide": "right", "toSide": "left" },
    { "from": "analysis",  "to": "throttler",    "fromSide": "right", "toSide": "left" },
    { "from": "throttler", "to": "notification", "fromSide": "right", "toSide": "left" },

    { "from": "analysis",  "to": "sprite",     "fromSide": "bottom", "toSide": "top" },
    { "from": "analysis",  "to": "thumbnail",  "fromSide": "bottom", "toSide": "top" },
    { "from": "analysis",  "to": "dominant",   "fromSide": "bottom", "toSide": "top" },
    { "from": "analysis",  "to": "classifier", "fromSide": "bottom", "toSide": "top" },
    { "from": "analysis",  "to": "counting",   "fromSide": "bottom", "toSide": "top" },

    { "from": "classifier", "to": "nohelmet", "fromSide": "bottom", "toSide": "top", "kind": "dashed" },
    { "from": "classifier", "to": "llm",      "fromSide": "bottom", "toSide": "top", "kind": "dashed" }
  ]
}
{{< /rete >}}

Each microservice in the Hub pipeline owns a single responsibility. Together they form an event mesh that passes messages from one service to the next asynchronously, so any step can scale, fail or be replaced independently. The pipeline is also open: you can drop in your own microservices, written in whatever language fits the job, and slot them in next to the built-in ones.

# How it works

When Vault stores a new recording, it publishes an event to the broker. Hub consumes that event and starts a pipeline run for it. From there messages flow through the services either sequentially (Monitor → Sequence → Analysis → Throttler → Notification) or in parallel (everything fanning out from Analysis), depending on the configuration. Once every service involved in the run has acknowledged its message, the pipeline goes idle until the next event arrives.

Message distribution is handled by a message broker — Kafka, AMQP/RabbitMQ, or any other supported broker — using queues (or topics, depending on the broker). Each service consumes from its own queue, does its work, and hands off to the next stage. This loose coupling is what makes the pipeline easy to extend: adding a new capability is just a matter of adding a new consumer on a new queue.

It's worth calling out explicitly: the microservices never talk to each other directly. All hand-offs go through the message broker, which routes messages from one service to the next. The only runtime dependencies a service has are the broker (to receive and forward messages) and the MongoDB database (to read and write event metadata). There is no service-to-service HTTP, no shared in-process state, and no hard ordering between services beyond what the orchestrator dictates — which is exactly what makes individual services trivial to scale, restart or replace without affecting the rest of the pipeline.

The default queues and the services that consume them are:

- Orchestrator - `kcloud-event-queue`
- Monitoring - `kcloud-monitor-queue`
- Sequencer - `kcloud-sequence-queue`
- Analyser - `kcloud-analysis-queue`
- Thumbnail - `kcloud-thumby-queue.fifo`
- Sprite - `kcloud-sprite-queue.fifo`
- Dominant color - `kcloud-dominantcolor-queue.fifo`
- Classification - `kcloud-classify-queue.fifo`
- Throttler - `kcloud-throttler-queue`
- Notification - `kcloud-notification-queue`

## Orchestrator

> kcloud-event-queue

The orchestrator is the entry point of every pipeline run. It listens on `kcloud-event-queue`, reads which services need to run for the incoming event, and dispatches the message to the next service in line. Each service hands its result back to the orchestrator, which then forwards the message to the following stage. In effect, the orchestrator is the conductor: it knows the order, keeps state, and decides what runs next.

## Monitoring

> kcloud-monitor-queue

The monitoring service is the first stage of the pipeline. It validates the incoming event and records the operational metadata Hub needs to keep track of an account's usage, such as:

- the volume of data being stored,
- the most recent event for each Agent,
- whether an account should be disabled because it has reached its upload limit,
- and other usage metrics surfaced in the Hub UI.

In short: it is the bookkeeping step that powers the analytics and quotas users see in the application.

## Sequencer

> kcloud-sequence-queue

The sequencer groups recordings that fall within a short time window so that a burst of related events can be treated as a single logical event. This makes downstream querying, alerting and UI rendering dramatically easier.

It is built to be resilient: even if recordings arrive late or an Agent's connection was briefly interrupted, the sequencer can still reconstruct the correct ordering and grouping after the fact.

## Analyser

> kcloud-analysis-queue

Once recordings are sequenced, the analyser orchestrates the post-processing stage. It fans out the event in parallel to the enrichment services — thumbnail, sprite, dominant color, classification, counting, and any custom services you've added. Each of those services runs independently and reports back asynchronously. As soon as the analysis stage as a whole completes, the pipeline continues to the next sequential step.

## Thumbnail

> kcloud-thumby-queue.fifo

The thumbnail service generates a poster image for each recording by extracting a representative frame from the video. The Hub UI uses these thumbnails to render fast, scannable previews so operators can browse large numbers of events without having to load any video.

## Sprite

> kcloud-sprite-queue.fifo

The sprite service builds a video timelapse — a single image strip composed of frames sampled at regular intervals across the recording. The Hub player uses this sprite to power its hover-to-scrub preview, so users can see what is happening at any point in the timeline without seeking through the underlying video.

## Dominant color

> kcloud-dominantcolor-queue.fifo

The dominant color service computes the most prevalent colors in a recording and stores the resulting palette alongside the event metadata. Hub uses these palettes to colour-code recordings, group them visually, and add another dimension to filter and search on.

## Classification

> kcloud-classify-queue.fifo

The classification service runs object detection on the recording and tags the event with the objects it identifies — people, vehicles, animals, and so on. These tags drive a lot of the downstream behaviour in Hub: filtering events, grouping recordings, and triggering alerts.

The classifier is open source ([github.com/uug-ai/hub-pipeline-classifier](https://github.com/uug-ai/hub-pipeline-classifier)) and explicitly designed to be extended. Because every service in the pipeline is just a queue consumer, you can fork the classifier — or write a new service from scratch in any language — point it at its own queue, and have the orchestrator route messages to it. That gives you a clean place to plug in custom application logic or your own machine-learning model and write the results back as event metadata, without touching anything else in the pipeline.

## Throttler

> kcloud-throttler-queue

The throttler limits how many events flow through to the next stage. When a sudden burst of recordings happens — for example a long motion event producing dozens of clips — you usually don't want a notification for every single one of them. The throttler collapses that traffic so downstream services receive a controlled stream instead of being flooded.

In practice, this means the notification stage gets a single coherent message for a burst of activity rather than one per recording.

## Notification

> kcloud-notification-queue

The notification service is the final stage of the pipeline. Based on the alert rules configured for the account, it dispatches notifications to the channels you've enabled — email, webhook, Slack, MQTT, and so on — for events that survived the throttler.
