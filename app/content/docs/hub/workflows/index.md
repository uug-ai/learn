---
title: "Workflows"
description: "Design and chain building blocks to customise the Hub pipeline."
lead: "Design and chain building blocks to customise the Hub pipeline."
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 304.5
toc: true
---

The [Pipeline]({{< relref "/docs/hub/pipeline" >}}) section describes the fixed chain of microservices that every recording flows through by default. **Workflows** build on top of that pipeline and let each user *customise* how their own events are routed, filtered and processed — without changing a single line of code or touching the platform configuration.

Where the pipeline is the same for everyone, a workflow is yours: pick the cameras you care about, decide which AI model should look at the frames, when it should be active and how often it should run.

## Why workflows?

The default Hub pipeline is intentionally opinionated: a recording arrives from an Agent, is classified, throttled and turned into a notification. That's a great starting point, but real deployments have very different needs:

- A retail store only needs people detection during opening hours.
- A logistics site wants license-plate recognition on the parking camera, but a no-helmet model on the warehouse camera.
- A control room wants high-frequency anomaly detection on a few critical cameras, and a low-frequency throttle on the rest to keep costs down.
- A reception desk wants to chain models: first run person detection on the camera, and only when a person is found, pass those frames to face recognition — saving the heavier model from running on empty scenes.
- A parking lot wants to detect vehicles first, and only forward those frames to the license-plate reader — avoiding wasted OCR runs on empty asphalt.

Workflows expose the building blocks of the pipeline as a small, visual graph so a non-developer can express exactly that — per camera, per time window, per use-case.

## Concepts

A workflow is a directed graph made of **blocks** (also called *nodes*) connected through **ports** with **edges**. Every workflow has a name, an optional description, an enabled/disabled toggle and a freely arrangeable canvas of blocks.

### Blocks

Each block has one or more typed input/output ports and exposes its own configuration directly inside the node. The current building-block library contains:

| Block | Role | Configuration |
|-------|------|----------------|
| **Device** | The source of events — a camera or sensor that feeds the workflow. | Pick one device from the dropdown (front door, parking, warehouse, …). |
| **ML Model** | A machine-learning model that processes incoming frames or events. | Pick one model: person/vehicle detection (YOLOv8), face recognition, license-plate reader, anomaly detector, … |
| **Throttle** | Limits the rate of events flowing through the workflow. | Pick a rate: 1/5/10 fps, or 1 frame every 5/30/60 seconds. |
| **Active window** | Only lets events through when they fall inside a date/time window and on selected weekdays. | Pick a start & end datetime and tick the active weekdays (Mon–Sun). |

A device block has only outputs, a model block has only inputs, and the throttle/active-window blocks sit in between with one input and one output. This guarantees that a valid workflow always reads as **device → (filters) → model**.

### Edges

Edges connect an *output port* of one block to an *input port* of another. They define how events flow from a device, through any number of throttle and active-window blocks, into one or more models.

An edge can also carry a **condition** — a simple predicate on the upstream block's result (for example *labels contains "person"*). The downstream block then only runs for events that match, which is what powers the *first detect a person, then run face recognition* style of chaining in the examples below. The edges are the source of truth for this routing: the orchestrator compiles each block's incoming edges into the conditions it evaluates at run time, so you never edit that wiring by hand — you draw it on the canvas.

### Workflow status

A workflow can be **enabled** or **disabled** with a single switch in the list view. Disabled workflows are kept on the user's account but no longer dispatch events through the pipeline — handy for seasonal automations or while iterating on a design.

## The Workflows page

The **Workflows** page in Hub (`/workflows`) gives every user a personal collection of automations.

The page shows a searchable list of *My Workflows* with — for each entry — its enabled state, name, description and a summary of how many blocks and connections it contains. From there you can:

- **Add Workflow** — opens the workflow editor in a modal to design a brand-new flow from an empty canvas.
- **Edit** (pen icon) — re-opens an existing workflow in the editor.
- **Enable / disable** (slider) — toggles the workflow on or off without opening the editor.
- **Delete** (trash icon) — permanently removes the workflow after a confirmation prompt.

Use the search box at the top to filter the list by name when your collection grows.

## Building a workflow

Creating a workflow is a three-step process:

1. **Name it.** Click *Add Workflow* and give the workflow a clear name and (optionally) a description. The name is what you'll see back in the list and in pipeline logs.
2. **Drag in your blocks.** From the block library, drop a *Device*, an *ML Model* and as many *Throttle* / *Active window* blocks as you need onto the canvas. Configure each block in-place via its dropdown, datetime pickers or weekday selector.
3. **Wire them up.** Drag from a block's output port to another block's input port to create an edge. A typical workflow looks like:

   ```
   Device  ──►  Active window  ──►  Throttle  ──►  ML Model
   ```

When you're happy, hit *Save changes* (or *Add Workflow* for a new one) and flip the slider on. The workflow is now live and starts shaping how events from that device reach the rest of the Hub pipeline.

## Examples

A few starting points to give an idea of what's possible:

- **People counting during opening hours.** *Device: Camera — Reception → Active window: Mon–Sat, 08:00–18:00 → ML Model: YOLOv8 — Person detection.*
- **Cost-optimised monitoring overnight.** *Device: Camera — Warehouse → Throttle: 1 frame every 30 seconds → ML Model: Anomaly detector.*
- **License-plate capture on the parking lot.** *Device: Camera — Parking lot → Throttle: 5 fps → ML Model: License-plate reader.*

## Relationship with the fixed pipeline

Workflows do not replace the Hub [Pipeline]({{< relref "/docs/hub/pipeline" >}}); they steer it. The pipeline microservices (sequence, analysis, throttler, notification, classifier, …) keep doing their job for every recording. What a workflow does is to declare, per user and per device, *which* of those services should run, *when* they should run and *with which* configuration — turning a one-size-fits-all pipeline into something each user can tailor to their own use-case.
