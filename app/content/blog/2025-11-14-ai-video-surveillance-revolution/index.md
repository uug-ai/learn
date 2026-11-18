---
podcast: blog-2025-11-14-ai-video-surveillance-revolution
title: 'AI in video surveillance: from recording footage to understanding it'
description: 'Most surveillance video is recorded, stored and never watched. AI turns that footage into events people can search, count and act on. What the technology does well today, where it still falls short, where processing should run, and the legal limits that apply in Europe.'
header: 'header-art.svg'
artworkAlt: 'Abstract artwork: rows of video frames resolve into detection boxes, then into glowing events on timelines.'
date: 2025-11-14
lastmod: 2026-11-18
authors:
  - name: Cedric Verstraeten
    link: https://github.com/cedricve
    image: https://github.com/cedricve.png
tags:
  - AI
  - Video Analytics
  - Surveillance
  - Computer Vision
  - Security
toc: true
excludeSearch: false
---

Video surveillance has a strange economics. Cameras are cheap, storage keeps getting cheaper, and most organisations now record far more footage than anyone will ever look at. What stays scarce is attention: the time of a person who can watch, interpret and act.

**AI matters in surveillance because it moves part of that attention into software.** It does not replace the operator. It changes the operator's job from watching screens to reviewing a short list of things that might matter.

{{< tutorial-panel tone="brand" icon="light-bulb" title="The short version" >}}
**What AI does well:** turning video into structured events (a person in a zone, a vehicle crossing a line, a plate read) that can be counted, searched and used to trigger alerts. It works best on clearly defined tasks, under conditions similar to the footage the model was trained on.

**Where it falls short:** night, weather, glare, unusual camera angles and rare events. A vendor's accuracy figure says little about your own site, so test on your own footage.

**Where it should run:** at the edge when you need low latency or want video to stay on site; centrally when you need heavier models, search across sites or a single place to manage everything. Most deployments end up using both.

**What the law says:** in the EU, some uses are banned outright under the AI Act, and the GDPR applies to everything else. Privacy has to be designed in from the start, not added later.
{{< /tutorial-panel >}}

## The bottleneck is attention, not cameras

Commonly cited estimates put the number of surveillance cameras worldwide at over a billion. The exact figure matters less than the pattern behind it: each new camera adds hours of footage every day, while the number of people available to watch it stays the same.

Control-room research has long shown that an operator's ability to notice events drops with time spent watching and with the number of screens in view. In practice, much recorded footage is only opened after something has gone wrong, if at all. Recording becomes evidence for later rather than a way to see what is happening now.

That leaves three familiar problems:

- **Incidents are noticed late**, often only when someone reports them.
- **Investigations are slow**, because finding a ten-second event in a day of footage from a dozen cameras means scrubbing timelines by hand.
- **The footage holds information nobody uses**: how a space is used, when it is busy, where people wait or queue.

AI does not solve all three in the same way, so it helps to be precise about what it actually does.

## What AI actually does with video

Most "AI video analytics" breaks down into a small set of computer vision tasks. Each one turns pixels into structured data that software can reason about.

| Task | What it produces | Typical use |
|---|---|---|
| Object detection and classification | Boxes labelled *person*, *car*, *truck*, *bicycle*, with a confidence score | Filtering motion alerts down to the ones that involve people or vehicles |
| Tracking | The path of each object across frames | Counting, dwell time, distinguishing one visitor from ten |
| Line crossing and counting | Entries, exits and directions | Occupancy, footfall, traffic flow |
| Region activity | How long and how often objects spend time in an area | Loitering, queues, restricted zones |
| Licence plate recognition | Plate text and the time it was seen | Access control, parking, vehicle investigations |
| Specialised detectors | PPE, smoke, fallen person, and similar | Site safety and compliance |
| Redaction | A copy of the video with faces or people blurred | Sharing footage without exposing bystanders |

Two things follow from this list. First, the output is **metadata**, not judgement. A model can tell you that a person stood near a door for four minutes; it cannot tell you whether that is suspicious. That decision depends on context, which is why rules, schedules and human review still matter.

Second, the tasks that work reliably are **narrow and well defined**. "Detect vehicles in this lane" is a solved problem in good conditions. "Detect suspicious behaviour" is not one task but a vague category, and systems that claim to handle it generally produce a lot of false alarms.

## Search is the most underrated gain

Real-time alerts get the attention, but for many organisations the largest practical benefit is **search**.

Once every recording carries metadata (which objects appear, which lines were crossed, which zones were occupied), finding footage becomes a query rather than a playback session. "All vehicles at the loading dock between 22:00 and 06:00 last week" takes seconds instead of an afternoon.

Vision-language models push this further. They can describe a scene in plain language and match a written query against recordings, so an operator can search for "a person carrying a ladder" without anyone having built a ladder detector. The technology is useful and improving quickly, but it has limits: results are ranked by how likely they are to match, not guaranteed, and the models are heavy enough that they usually run centrally rather than on the camera. Treat them as a way to narrow down the footage to review, not as proof that something did or did not happen.

## Fewer, better alerts

An alert that is wrong most of the time is worse than no alert: operators learn to ignore it. The value of AI in alerting comes less from detecting more and more from **discarding what does not matter**.

Effective setups usually combine:

- **Object filters**, so a swaying tree, a passing headlight or a cat does not trigger an alert meant for people.
- **Zones and lines** drawn per camera, so only the relevant part of the image counts.
- **Schedules**, because a person in the warehouse at 14:00 is normal and at 03:00 is not.
- **Thresholds on time or count**, so a single frame does not trigger an alert but sustained presence does.
- **A human verification step** before anything with consequences happens: dispatching a guard, calling the police, or flagging a person.

Measure an alerting setup by how many of its alerts an operator actually acts on, not by how much it detects.

## Edge, cloud or both

Where analysis runs is an architectural decision with consequences for cost, privacy and resilience.

| | At the edge (camera, recorder or on-site server) | Centrally (data centre or cloud) |
|---|---|---|
| Latency | Lowest, with no network round trip | Depends on uplink and queueing |
| Bandwidth | Only events and selected clips leave the site | Video has to be uploaded first |
| Privacy | Raw video can stay on site | Video leaves the site and must be protected in transit and at rest |
| Model size | Limited by on-site hardware | Large models, including vision-language models, are practical |
| Cross-site search and reporting | Hard without central metadata | Natural |
| Resilience | Keeps working when the link is down | Depends on connectivity |
| Operations | Hardware spread across many sites | One place to update and monitor |

A common pattern is to run lightweight detection close to the camera, send only events and relevant recordings onward, and run heavier analysis and search centrally. The right split depends on how many sites you have, how much uplink they get, and how strictly video must stay on premises.

## What AI still gets wrong

AI video analytics is reliable enough to depend on for many tasks, but only within limits worth stating plainly:

- **Conditions change accuracy.** Night-time infrared, rain, snow, low sun, dirty lenses and compression artefacts all reduce detection quality.
- **Camera placement matters as much as the model.** A camera mounted high and far away gives a model too few pixels per person to work with; one pointed into the sun gives it silhouettes.
- **Published accuracy figures rarely transfer.** Benchmarks measure performance on curated datasets. Your car park at dusk is not in them.
- **Rare events are hard by definition.** There is little training data for the incidents people care about most.
- **Bias is a real risk** for anything that classifies people by appearance. The further a system moves from "is there a person" towards "who or what kind of person is this", the more care, testing and legal scrutiny it needs.

The practical answer is to run a pilot on your own cameras, label a sample of the results, and count false positives and missed events before relying on the system.

## Privacy and the law

Surveillance AI processes images of people, which makes it personal data processing in almost every case. In Europe, two frameworks shape what is allowed.

**The GDPR** applies to all of it. You need a lawful basis for recording, clear signage, a defined retention period, and access limited to people who need it. Systematic monitoring of publicly accessible areas, and new technologies such as AI analytics, typically require a data protection impact assessment before deployment.

**The EU AI Act** adds rules specific to AI. Its prohibitions have applied since 2 February 2025, and several apply directly to video:

- **Emotion recognition in workplaces and schools** is prohibited, except for medical or safety reasons.
- **Building facial recognition databases through untargeted scraping** of images from the internet or CCTV footage is prohibited.
- **Biometric categorisation** to infer sensitive characteristics such as ethnicity, political opinions or sexual orientation is prohibited.
- **Real-time remote biometric identification in publicly accessible spaces for law enforcement** is prohibited except in narrowly defined cases.

Remote biometric identification that is not prohibited outright is classed as high-risk, with obligations for documentation, human oversight and accuracy. Most object-level analytics, such as counting vehicles or detecting a person in a restricted zone, fall outside these categories, but the GDPR still applies to them.

Good practice regardless of jurisdiction:

- **Collect less.** Analyse what the purpose requires, and keep metadata rather than video where that is enough.
- **Keep video on site** where possible, and send events rather than streams.
- **Redact before sharing**, so bystanders are not exposed when footage leaves the organisation.
- **Set retention limits** and enforce them automatically.
- **Log access**, so it is clear who viewed or exported what, and when.

This is general information, not legal advice. Requirements depend on the jurisdiction, the sector and the purpose of the system.

## A practical way to start

Organisations that get value from AI video analytics tend to start small and specific:

1. **Pick one question** you want answered: late-night activity at a gate, queue length at a counter, vehicles in a fire lane.
2. **Check the cameras** that cover it: angle, distance, lighting at the hours that matter.
3. **Pilot on your own footage** for a few weeks, with the analysis running alongside existing procedures rather than replacing them.
4. **Measure the results**: how many alerts were correct, how many events were missed, how much review time was saved.
5. **Decide where processing runs** based on what the pilot showed about bandwidth, latency and privacy.
6. **Put retention, access and review rules in place** before widening the rollout.

Then expand to the next question. A system built from a handful of well-understood uses is easier to trust, and easier to defend to a works council or regulator, than one that promises to "detect everything".

## Where UUG fits

UUG is built around the idea that recording, storage, management and analysis are separate concerns:

- **[Agent](/docs/agent/first-things-first/)** connects to a camera and records its stream.
- **[Vault](/docs/vault/first-things-first/)** stores recordings on storage you choose, including on premises.
- **[Hub](/docs/hub/first-things-first/)** provides the shared workspace. Its [media processing](/docs/hub/media-processing/) runs enabled analysis stages (object classification, tracking, line counting and region activity) and feeds the results into [Analytics](/docs/hub/analytics/), [markers](/docs/hub/markers/), alerts and redacted exports.
- **[Workflows](/docs/hub/workflows/)** chain processing stages, including your own, so analysis can be shaped to a specific site.
- The **[MCP server](/docs/hub/mcp/)** lets AI assistants query recordings and devices with a scoped token.

That separation is what makes the edge-or-central decision a configuration choice rather than a platform choice: video can stay where it is recorded, while analysis runs where it makes sense.

## The shift that matters

The change AI brings to video surveillance is not more cameras or sharper images. It is that footage stops being an archive you only open after an incident and becomes a source of events you can search, count and act on.

That shift is real, and useful well beyond security: in safety, operations and planning. It also comes with responsibilities that grow with what the system can do. The organisations that get the most from it will be the ones that are precise about the questions they ask, honest about the limits of the answers, and careful with the people in the frame.
