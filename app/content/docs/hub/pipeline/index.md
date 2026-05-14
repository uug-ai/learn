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
 
Hub leverages a pipeline of microservices to execute specific tasks. Each time a recording is uploaded to Kerberos Vault, it will forward an event to Hub, which on its turn will activate a pipeline consisting of a series of  microservices.

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

Each microservice in the Hub pipeline will be responsible for a specific action or process. The pipeline acts as an event mesh, that sends messages from one microservice to the other in an asynchronous matter. Important to note is that it is possible to customize the pipeline and bring you own microservices inside the pipeline; using the programming languages you prefer.

# How it works

Each time a recording is being uploaded to Kerberos Vault, and event is sent to Hub, and a pipeline is started for that specific recording; and thus event. The pipeline will start sending messages towards to the different microservices in sequence and/or in parallel, depending on how the microservices and pipeline is configured. Once the pipeline is executed, and all related microservices are finished, the pipeline is done, and it will go in idle mode until the next event is received.

The distribution of messages is done through a Kafka broker and the concept of Kafka topics. Each microservice consume messages of its own Kafka topic. As soon as a microservice receives a message on its topic, it knows it has to do something, and execute the action he is responsible for. By having Kafka and the concept of topics we have a loosely coupled event architecture that we can easily extend with additional function and features (microservices).

The different kafka topics and microservices we have in place are.

- Orchestrator - `kcloud-event-queue`
- Monitoring - `kcloud-monitor-queue`
- Sequencer - `kcloud-sequence-queue`
- Analyser - `kcloud-analysis-queue`
- Thumbnail - `kcloud-thumbnail-queue`
- Sprite - `kcloud-sprite-queue`
- Dominant color - `kcloud-dominantcolor-queue`
- Throttler - `kcloud-throttler-queue`
- Notification - `kcloud-notification-queue`

## Orchestrator 

> kcloud-event-queue

A pipeline starts with the first microservice being executed, that is the event microservice, listening to the `kcloud-event-queue` topic. The event microservice is the dispatcher service that forwards messages back and forth. It reads the to be processed microservices, and forwards the message to the next microservice, so it can be consumed. Once the microservice is completed it will send the message back to the event microservice.

## Monitoring

> kcloud-monitor-queue

The first microservice in the pipeline is the monitoring microservice, this will verify a couple of things and store some metadata. It will keep track of

- the MB of data being stored,
- the latest event for each Kerberos Agent,
- if an account has to be disabled due to reaching its upload limit
- etc.

The monitoring microservice is like the name said, a monitoring step in the entire pipeline, it will keep track of some analytics that are useful to be shown in the Hub application.

## Sequencer

> kcloud-sequence-queue

This is where the magic happens. The sequencer is responsible for grouping recordings that belong to a close time window, it makes it possible to handle individual events as group of events, so that it can be more easily queried.

The sequencer microservice is build in such a way that it can group events, even if they are delayed, or the connection from the Kerberos Agent was interrupted for some time. The sequencer will be able to recover and properly sequence in whatever situation.

## Analyser

> kcloud-analysis-queue

As recordings are sequenced the analyser will take care of some post-processing. Additional computations and algorithms are being executed in parallel on the uploaded recordings such as:

- Dominant color
- thumbnail,
- machine learning and object tracking, etc.

Once the analyser is hit, it will send out several messages in parallel to the different microservices to compute the previously mentioned requests. As soon as results come in, asynchronously, the analysis step is completed, and the next microservice is triggered.

## Thumbnail

> kcloud-thumbnail-queue

The thumbnail microservice generates a poster image for each recording. It extracts a representative frame from the uploaded video and stores it as a still image, so the Hub UI can display a quick preview without loading the full recording. This makes browsing through large numbers of events much faster and gives operators an at-a-glance view of what each event looks like.

## Sprite

> kcloud-sprite-queue

The sprite microservice produces a video timelapse — a single image strip composed of frames sampled at regular intervals across the recording. This sprite is used to power the scrubbing preview in the Hub player, allowing users to hover the timeline and instantly see what is happening at any point in the recording without having to seek through the underlying video.

## Dominant color

> kcloud-dominantcolor-queue

The dominant color microservice analyses the recording and computes the most prevalent colors in the scene. The resulting palette is stored alongside the event metadata and used in the Hub UI to colour-code recordings, group them visually, and provide an additional dimension to filter and search on.

## Throttler

> kcloud-throttler-queue

Messages that reach the throttler microservice will go in a throttling function, that controls the number of events going out. The reason of throttling is to limit the number of message being sent to the next microservice. Easy said, it is a way to limit and protect it against a huge amount of incoming data.

Let's say you have a lot of recordings being generated at once, this would result in a lot of messages being generated. When this happens you do not want to send notifications or other actions for every single message, you rather have a single message for all of them. This is what the throttler is for.

## Notification

> kcloud-notification-queue

After the throttler has been executed, it's time to send out alerts and notifications which you have setup. Depending on your alert settings, the notification microservice will send out a specific notification to your selected channels.
