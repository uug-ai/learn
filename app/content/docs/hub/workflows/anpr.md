---
title: "ANPR stage"
description: "The ANPR workflow stage (hub-anpr): reads the number plate of every classified vehicle on a recording and returns a detection + marker result. A reference implementation of a custom stage."
lead: "hub-anpr is a production workflow stage that reads the number plate of every classified vehicle on a recording and hands back a detection (plate boxes) and a marker (one timeline span per vehicle) — a concrete, end-to-end example of the stage contract."
date: 2026-07-03T00:00:00+00:00
lastmod: 2026-07-03T00:00:00+00:00
draft: true
images: []
sidebar:
  exclude: true
excludeSearch: true
toc: true
---

{{< callout type="info" >}}
This page is an **unlisted deep-dive** into a single stage; it is intentionally kept out of the sidebar and search. For the general, capability-agnostic contract every stage codes against, start at [Stages](/docs/hub/workflows/stages/).
{{< /callout >}}

**`hub-anpr`** is a standalone Kerberos Hub [workflow stage](/docs/hub/workflows/stages/) for **automatic number-plate recognition (ANPR)**. It is the production sibling of the [`hub-loitering`](https://github.com/uug-ai/hub-loitering) example: where `hub-loitering` emits a [marker](/docs/hub/workflows/ingest/marker/) (a timeline span), `hub-anpr` emits a [detection](/docs/hub/workflows/ingest/detection/) — a run of tracks and per-frame boxes the engine persists to the detections collection — **plus** a marker, so the recognised plates show up on the recording's edit-media modal.

The workflows engine dispatches an `anpr` stage to this worker; the worker reads the plate of every classified vehicle on the recording and routes a `detection` block (the plate boxes) and a `marker` block (one named timeline span per vehicle) back to the engine, which persists them and can fan out further conditional stages that depend on `anpr`.

## What it does

For each dispatched run the worker:

1. **Fetches the recording** the run is about, via the dispatch's signed URL (`internal/media`).
2. **Decodes** a representative frame for each tracked vehicle (`internal/frame`, via the `ffmpeg` binary).
3. **Reads the plate** off the cropped vehicle region (`internal/plate`). Recognition is pluggable behind the `plate.Recognizer` interface and selected with `ANPR_OCR_ENGINE` (see [Choosing an OCR engine](#choosing-an-ocr-engine)).
4. **Builds and routes** a `detection` block (the tight plate boxes the engine localized) and a `marker` block (one named span per vehicle) back on the workflows queue.

A vehicle whose plate cannot be localized or confidently read falls back to its classify trajectory and is labelled **`unread`** (no synthetic plate) — so a detection is **always** produced and switching engines never fabricates plates; it only changes how many are read successfully.

The worker can also **sample plate crops to a dataset** for offline evaluation (`ANPR_DATASET_DIR`, see [Dataset sampling](#dataset-sampling-offline-evaluation)), and the binary ships a `probe` (one-message dry run) and `evaluate` (offline benchmark over a sampled dataset) subcommand alongside the long-lived `serve` worker.

## How it fits the workflow

```
classify stage ─▶ (engine) ─dispatch▶ hub-anpr-queue ─▶ hub-anpr
                                                              │
                                        fetch + decode + OCR  │
                                        build detection + markers ▼
   engine ◀─ route result ◀─ hub-workflows-queue ◀── { blocks: [ detection, marker ] }
     │
     └─▶ detections + markers collections  +  run.Results["anpr"]  (fans out conditional stages)
```

The worker is **DB-free**: all persistence is delegated to the workflows engine via the `anpr` detection result published on the workflows queue. That is exactly the [stage contract](/docs/hub/workflows/stages/) — receive a `WorkflowRun`, do the work, hand back a [block envelope](/docs/hub/workflows/ingest/) — applied to a real capability.

## Deploy

`hub-anpr` runs as a long-lived worker Deployment alongside the rest of the Hub. For plates to appear on a recording **two** things must be true: the worker must be running, and the workflows engine must **route** matching runs to it (see [Register it as a stage](#register-it-as-a-stage)). In a `charts/hub` Helm deployment both are single toggles.

### Helm (recommended)

The chart wires the queue name, RabbitMQ credentials and env for you — you only choose the image tag and the OCR engine:

```yaml
kerberoshub:
  services:
    anpr:
      enabled: true                  # run the worker Deployment
      tag: "v1.0.0"                  # the published image already defaults to engine=fast
      # Override the engine or any ANPR_* tuning here (see Configuration):
      env: {}
  workflows:
    stages:
      anpr:
        enabled: true                # route classified cars to the worker
```

`kerberoshub.services.anpr.queue` is shared with the generated engine registry entry, so the engine dispatches and the worker consumes the **same** queue with no drift. Any `ANPR_*` variable from [Configuration](#configuration) can be set under `services.anpr.env`.

### Container images

The release pipeline builds **one multi-arch (amd64 + arm64) image per tag** from the default `Dockerfile` and pushes it to `ghcr.io/uug-ai/hub-anpr:<tag>` (and `:latest`). It ships **ready to run as-is**:

| Image | Bundles | Default engine |
| ----- | ------- | -------------- |
| `ghcr.io/uug-ai/hub-anpr:<tag>` (published) | `ffmpeg`, onnxruntime, the YOLOv9 detector + CCT recognizer models, **plus** `tesseract` as a fallback | `fast` |

The image defaults `ANPR_OCR_ENGINE=fast` and points the four model-path variables at its baked-in weights, so the best-accuracy path runs with **no extra configuration**; if the ONNX engine is unavailable it automatically falls back to `tesseract`. No models need to be mounted.

Two alternative images are **not** published — build them yourself if you need them:

| Image | Built from | For |
| ----- | ---------- | --- |
| tesseract-only | `Dockerfile.static` | a small pure-Go build (`ffmpeg` + `tesseract`, no CGo/ONNX) when you don't need the `fast` engine |
| OpenCV | `Dockerfile.cv` | the `-tags opencv` crop-preprocessing variant |

### Choosing an OCR engine

`ANPR_OCR_ENGINE` selects the plate reader. The reader is pluggable behind one adapter per protocol, so you swap engines with env alone:

| Engine | Accuracy | Needs | Use when |
| ------ | -------- | ----- | -------- |
| `fast` (default in the published image) | best in-process | nothing — models + onnxruntime are baked in | the default; highest accuracy with no external service |
| `tesseract` | baseline | the `tesseract` binary (present in the published image as the fallback, or the `Dockerfile.static` image) | a lighter footprint, or as the automatic fallback when ONNX is unavailable |
| `http` | depends on the sidecar | a remote `/recognize` service at `ANPR_OCR_ENDPOINT` | you run your own engine (incl. AGPL/paid, e.g. OpenALPR) as a sidecar |

A vehicle whose plate cannot be localized or confidently read is labelled **`unread`** rather than given a guessed value, so switching engines never fabricates plates — it only changes how many are read successfully.

## Register it as a stage

Which runs reach this worker is the engine's job, not the worker's. Add the stage to `PIPELINE_STAGE_REGISTRY` so a run is dispatched here once `classify` has labelled a car:

```json
[
  {
    "operation": "anpr",
    "dispatch": "conditional",
    "queue": "hub-anpr-queue",
    "needs": [
      { "operation": "classify",
        "condition": { "path": "inputs.classify.details.*.classified", "op": "eq", "value": "car" } }
    ]
  }
]
```

Match `inputs.classify.details.*.classified`, **not** `inputs.classify.properties`: the `.details.*.classified` fan-out is the per-object class this worker actually reads (a run only reaches ANPR when a detected object was classified `car`). `inputs.classify.properties` is a separate, frequently-empty summary list, so gating on it silently drops many car recordings.

`dispatch` is the closed enum `always` | `conditional` (a stage with `needs` must be `conditional`), and a condition `path` is absolute from the run root — `inputs.classify.details.*.classified`, not a bare `details`. The `*` fans out across the `details` array; the engine validates both `dispatch` and `path` at boot and refuses to start on an invalid registry.

In a Hub Helm deployment this is generated for you: enable `kerberoshub.workflows.stages.anpr` (routing) and `kerberoshub.services.anpr` (the worker deployment) in the `charts/hub` values.

### Routing and reading are two separate knobs

Which vehicle classes get plates read is controlled in **two** independent places that must agree:

1. **Routing** — the `needs` condition above decides which runs are dispatched to the worker at all. The default `"op": "eq", "value": "car"` only sends recordings with a classified **car**. This condition is evaluated in the engine and is **not** forwarded to the worker.
2. **Reading** — once a run arrives, `ANPR_PLATE_CLASSES` (see [Configuration](#configuration)) decides which of that run's classified tracks the worker actually reads a plate for. It defaults to `car`.

To add a class (e.g. read lorries too) you must widen **both**: broaden the routing condition to an `in` match and add the class to `ANPR_PLATE_CLASSES`. Widening only one has no effect — a class the router never sends is never read, and a class the router sends but is not in `ANPR_PLATE_CLASSES` is skipped by the worker.

```json
{ "operation": "classify",
  "condition": { "path": "inputs.classify.details.*.classified", "op": "in", "value": ["car", "lorry"] } }
```

```yaml
kerberoshub:
  services:
    anpr:
      env:
        ANPR_PLATE_CLASSES: "car,lorry"   # must match the routed classes above
```

## Configuration

Every value below is read from the environment. In a Hub deployment they are injected by the Helm chart (`charts/hub` → `hub-stage.yaml`) from `services.anpr.env`; locally they come from `.env.local`.

### Core / queue

| Env var             | Default                   | Description                                                        |
| ------------------- | ------------------------- | ------------------------------------------------------------------ |
| `ANPR_QUEUE`        | `hub-anpr-queue`          | Queue this worker consumes (must match the engine's dispatch name) |
| `WORKFLOWS_QUEUE`   | `hub-workflows-queue`     | Queue the worker routes its result back to                         |
| `DEAD_LETTER_QUEUE` | `dead-letter-queue`       | Queue unparseable messages are dead-lettered to; override only if your topology names it differently |
| `QUEUE_SYSTEM`      | `RABBITMQ`                | Queue backend selector consumed by the queue library; injected by the Helm chart |
| `LOG_LEVEL`         | `info`                    | `trace` \| `debug` \| `info` \| `warn` \| `error`                  |
| `ANPR_PLATE_CLASSES`| `car`                     | Comma-separated, case-insensitive classify labels this worker reads plates for (e.g. `car,lorry`). Only tracks whose `classified` value is in the set are read; others are skipped. A **separate knob** from the stage `needs` routing condition — widen both together to add a class (see [Routing and reading are two separate knobs](#routing-and-reading-are-two-separate-knobs)) |
| `RABBITMQ_HOST`     | —                         | RabbitMQ host                                                      |
| `RABBITMQ_EXCHANGE` | —                         | RabbitMQ exchange                                                  |
| `RABBITMQ_USERNAME` | —                         | RabbitMQ username                                                  |
| `RABBITMQ_PASSWORD` | —                         | RabbitMQ password                                                  |

### OCR engine

| Env var                  | Default     | Description                                                             |
| ------------------------ | ----------- | ----------------------------------------------------------------------- |
| `ANPR_OCR_ENGINE`        | `fast`      | OCR engine: `tesseract` \| `http` \| `fast`. `fast` needs the ONNX build and falls back to `tesseract` when the ONNX runtime is unavailable |
| `ANPR_OCR_ENDPOINT`      | —           | `http` engine: absolute URL of the remote `/recognize` service          |
| `ANPR_OCR_MODEL_PATH`    | —           | `fast` engine: fast-plate-ocr recognizer model                          |
| `ANPR_OCR_DETECTOR_PATH` | —           | `fast` engine: YOLOv9 plate-detector model                              |
| `ANPR_OCR_PLATE_CONFIG`  | —           | `fast` engine: recognizer `plate_config.yaml`                           |
| `ANPR_OCR_DETECTOR_CONF` | —           | `fast` engine: detector confidence threshold (optional)                 |
| `ONNXRUNTIME_LIB_PATH`   | —           | ONNX engines: path to `libonnxruntime.so` (baked into the published image) |
| `ANPR_OCR_TIMEOUT`       | —           | Per-call OCR timeout (optional)                                         |

### Dataset sampling (offline evaluation)

| Env var              | Default | Description                                                          |
| -------------------- | ------- | -------------------------------------------------------------------- |
| `ANPR_DATASET_DIR`   | —       | When set, sample plate crops + reads here for the `evaluate` command            |
| `ANPR_READ_FRAMES`   | `1`     | Frames per vehicle decoded + OCR'd for the read (multi-frame voting); `0` off   |
| `ANPR_SAMPLE_FRAMES` | `1`     | Frames per vehicle saved to the dataset; independent of reads; `0` saves none   |
| `ANPR_READ_MOVEMENT_MIN` | `0` | Min scale-invariant movement (centre travel ÷ box size) before a plate is read; `0` reads all, e.g. `0.5` skips near-static cars |
| `ANPR_SAMPLE_MOVEMENT_MIN` | `0` | Same movement gate for dataset sampling; `0` samples all, a positive value keeps near-static crops out of the dataset |
| `ANPR_READ_MAX_JUMP` | `0` | Track-stability gate: max single-step jump (box diagonals) before a plate is read; `0` off, e.g. `2` drops wandering tracks from an upstream tracker ID-switch/merge |
| `ANPR_MOVEMENT_SCALE_WEIGHT` | `1` | Weight of apparent-size change (head-on motion) in the movement signal; `1` counts box growth like centre travel, `0` = pure centre-based (head-on cars gate as static), `>1` amplifies |
| `ANPR_SAMPLE_VELOCITY_MIN` | `0` | Per-frame sample gate: keep only frames whose local step movement (÷ box size) meets this, so a car that drives in then parks doesn't flood the dataset with its stationary tail; `0` keeps every frame |
| `ANPR_SAMPLE_REQUIRE_PLATE` | `false` | Drop sampled crops on which no plate was localized, keeping "vehicle only" frames out of the dataset; off preserves hard negatives |
| `ANPR_DEBUG_FRAMES`  | `false` | Write per-frame debug overlays (whole frame + vehicle/plate boxes) under `<ANPR_DATASET_DIR>/debug/`; disk-heavy, no-op without `ANPR_DATASET_DIR` |
| `ANPR_EVAL_RUN`      | —       | `evaluate`: restrict the benchmark to one sampled run                           |

### Read quality (optional tuning)

These default off / to sensible values; tune them to trade OCR cost against accuracy. In a Hub deployment set them under `services.anpr.env`.

| Env var               | Default | Description                                                                                                     |
| --------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `ANPR_READ_TARGET_PX` | `640`   | Ideal larger side (px) of the vehicle crop fed to the reader; frames closest to this are read first, so even a 1-frame read picks a detector-friendly crop. `0` = read the largest box first |
| `ANPR_READ_MIN_PX`    | `0`     | Minimum crop larger side (px) to attempt a read; smaller crops are left `unread` instead of producing a low-res misread. `0` = no floor |
| `ANPR_CROP_PAD`       | `0`     | Fraction each crop side is expanded to keep a fast car's plate in frame when the classify box lags. Keep modest (e.g. `0.1`); too much shrinks the plate under the detector |
| `ANPR_READ_CONF_MIN`  | `0`     | Recognizer-confidence vote floor: reads below it are dropped from the consensus tally so low-confidence junk can't win or break ties. Distinct from `ANPR_OCR_DETECTOR_CONF` (which gates the detector) |
| `ANPR_READ_QUORUM`    | `0`     | Agreeing-read count that (a) ends a vehicle's OCR early once this many read frames agree on one plate, making `ANPR_READ_FRAMES` a max budget, and (b) acts as an acceptance floor: a plate with fewer agreeing votes is rejected and the vehicle left `unread`, so a lone high-confidence misread can't win. Agreement (not a single high score) is required; set `ANPR_READ_FRAMES` >= this. `0` = off (read the full budget, accept any read) |

## Observability

The worker logs to stdout at `LOG_LEVEL` and exposes **Prometheus metrics on `:8080/metrics`**. For how the engine that *dispatches* this stage logs and traces a run end-to-end — including the "run created but never reached a stage" case — see [Observability](/docs/hub/workflows/observability/).

## Build from source

```bash
git clone https://github.com/uug-ai/hub-anpr
cd hub-anpr
go build ./...
go test ./...
```

The module pins `github.com/uug-ai/models` and `github.com/uug-ai/queue` in `go.mod`, so it builds against published releases with nothing else checked out.

### OpenCV-enhanced build (optional)

Plate OCR runs through an optional preprocessing step. The default build is pure-Go (no CGo) and OCRs the raw crop. Building with the `opencv` tag compiles a **gocv/OpenCV** pass (grayscale, upscale, Otsu threshold) that cleans the crop first, materially lifting accuracy on small / low-contrast plates:

```bash
go build -tags opencv .   # needs OpenCV 4.10+ (pkg-config opencv4) on the host
```

This mirrors `hub-pipeline-redaction`'s split: the gocv code lives in `internal/plate/preprocess_opencv.go` (`//go:build opencv`) with a no-op `preprocess_stub.go` (`//go:build !opencv`) selected otherwise, so the default build and CI runners without OpenCV stay green. The CV image is built from `Dockerfile.cv` (`FROM gocv/opencv:4.10.0`, `-tags opencv`).

## Related

- [Stages](/docs/hub/workflows/stages/) — the general contract this stage implements.
- [Ingest](/docs/hub/workflows/ingest/) — how the result envelope is stored.
- [Detection block](/docs/hub/workflows/ingest/detection/) — the plate-box block this stage emits.
- [Marker block](/docs/hub/workflows/ingest/marker/) — the per-vehicle timeline span this stage emits.
- [Observability](/docs/hub/workflows/observability/) — following a run end-to-end.
