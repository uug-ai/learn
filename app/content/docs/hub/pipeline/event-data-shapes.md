---
title: "Event & operation data shapes"
description: "What each operation hands back, the run fields a conditional stage can match, and the absolute dot-paths to reach them."
lead: "A conditional stage's condition is evaluated against the whole run — its operation results plus the curated device/user envelope. This page is the contract: what each operation's result looks like, and which absolute paths you can match."
date: 2026-06-11T00:00:00+00:00
lastmod: 2026-06-11T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "pipeline"
weight: 15
toc: true
---

A [conditional stage](integrations/#conditional-routing) declares one or more `needs`, each pairing an optional **gate operation** with a **condition** — a predicate (`path`, `op`, `value`) over the run. Whether your stage ever fires depends on the **shape of the run** when it is evaluated: which operation results have landed, and what the recording's curated `device`/`user` context says.

This page is that contract. It describes the result bag each workflow-relevant operation hands back, lists the absolute paths you can match, and explains how the orchestrator **validates** your paths at boot so a typo fails fast instead of silently never firing.

> **Paths are absolute from the run root.** A condition's `path` is resolved against the **whole run**, not a single operation's bag. Operation results live under `inputs.<op>` (the start context) and `results.<op>` (accumulated outputs), so a `need` on `classify` typically matches `results.classify.properties` (or `inputs.classify.properties` at open). The recording's `device`/`user` context and the run's identity scalars are matchable too — only credentials are off-limits.

## Envelope vs. result bag

Two different things travel in a pipeline message, and a condition can only see one of them:

- The **envelope** is the `models.WorkflowRun` struct (`models/pkg/models/workflowrun.go`): `operation`, `runId`, `key`, `user` and `device` (the scrubbed account/recording context), `storage` (the fetch credentials, set only on a dispatch to a worker), `traceId`, and the `inputs` / `results` bags themselves. It is a maintained Go type — for its exact fields, **read the struct**; this page deliberately does not duplicate it. The envelope is **context for your worker** (which recording fired, who owns it, where the media lives) and is fully catalogued in [Integrations → The message you receive](integrations/#the-message-you-receive).
- The **result bag** is what `inputs` / `results` *contain*. Both are `map[string]interface{}` keyed by operation — an **untyped** bag each operation fills with its own JSON. There is **no Go struct** for an operation's bag, so a condition's `path` walks plain map keys, and the shapes below are documented here rather than linked. Treat them as **worker-owned**: authoritative for writing conditions today, but not a compile-time contract.

> **What a condition can — and cannot — match.** `evaluateCondition` resolves `path` against the whole run: the operation results (`inputs.<op>`, `results.<op>`) **and** the curated envelope — `device.deviceKey`, `device.deviceName`, `device.provider`, `device.storageSolution`, `user.id`, `user.organisationId`, and the top-level scalars `key`, `operation`, `runId`, `traceId`. What it can **never** match is a **secret**: `storage` and `user.storage` are excluded from the matchable view and rejected at boot. So you *can* gate a stage on which camera or which organisation a recording belongs to, directly in a `condition`.

So the rule of thumb: **link the model for the full envelope, read this page for the operation bags — and write conditions with absolute paths (`inputs.<op>`/`results.<op>` for data, `device`/`user`/identity for the envelope, never credentials).**

## How a path resolves

`path` is an **absolute, dot-separated lookup into the run, walking string-keyed maps only**. The first segment selects a root — `inputs`, `results`, `device`, `user`, or a top-level scalar (`operation`/`runId`/`key`/`traceId`) — and each further segment is one map key. The evaluator:

- It **cannot index into arrays** — there are no numeric indices (`details.0`) and no wildcards (`details.*`). A path that lands on an array can only be tested with `exists`, or matched as a whole with `contains` / `in`.
- It **cannot reach past a scalar or array** — once a segment resolves to a non-map, deeper segments fail.

The `op` then compares the resolved value against `value`:

| `op` | Matches when |
| --- | --- |
| `exists` | the path resolves to anything (`value` ignored) |
| `eq` / `ne` | the value equals / does not equal `value` (numbers compared numerically) |
| `contains` | the value is a **string containing** `value`, **or** an **array containing** `value` |
| `in` | the value equals one of the members of the `value` list |
| `gt` / `gte` / `lt` / `lte` | the value compares numerically against `value` |

## `event` — the seed bag

When analysis hands a recording to the workflows engine it sends a single **`WorkflowRun`** message (`operation: event`) that **opens the run** and dispatches the `always`-stages. The hand-off carries the usual envelope fields — `key`, `traceId`, the curated `user` / `device` — and an `inputs` bag.

The bag carries **only the triggering operation's result, keyed by its operation name**. The hand-off fires when **classify** resolves, so `classify` is the one key in `inputs` at run open:

```jsonc
// the "inputs" bag — one key: the trigger's operation, value is its result bag
{
  "classify": { "properties": ["car", "person"], "objectCount": 2, "details": [ /* … */ ] }
}
```

`inputs` deliberately does **not** include the other built-in results (`dominantcolor`, `sprite`, `thumbnail`, …): those operations run in parallel with classify and aren't guaranteed to have resolved when the hand-off fires, so bundling "whatever resolved so far" would make the run's start context non-deterministic. Keeping it to the trigger alone gives a predictable contract — a workflow that needs another operation's output reads it from that operation's own source rather than relying on a best-effort key.

At run open the engine evaluates every conditional stage against the run, with the trigger's result available under `inputs.<op>`. Reach a field inside the [`classify` shape](#classify-the-classifier-result) with an absolute path, and gate the need on `classify` so it is only considered once that result is present:

```json
{ "operation": "classify", "condition": { "path": "inputs.classify.properties", "op": "contains", "value": "car" } }
```

To fan out unconditionally on every run, use `dispatch: always` (or a `need` on `classify` with no condition, which fires as soon as the classify result is present at open).

Two consequences of the bag carrying only the trigger:

- **`classify` is the only key at open.** Don't build a workflow that relies on a non-classify key in `inputs` at run open — it won't be there. Read other operations' output from their own source, or gate your stage on a later result that lands in `results`.
- **`event` is the open signal, not a need target.** The run-open message's `operation` is `event`, but you don't `need: event` \u2014 gate on the real operation whose data you read (`classify`), or leave the need ungated (empty `operation`) when you only branch on the envelope.

> **Storage credentials never appear in a result bag.** The credentials a worker needs to fetch the media (`uri`, `accessKey`, `secret`, the `vaultOverride*` set) travel **only** in the envelope's structured `storage` field on a dispatch — they are never folded into `inputs`/`results` and must not be matched.

## `classify` — the classifier result

The built-in classifier is the trigger that fans a recording out to workflows, so it is **the** operation conditional stages match against. Reach each field with `inputs.classify.<field>` at open or `results.classify.<field>` once it has resolved. Its result carries three top-level fields:

| `<field>` | Shape | Match with |
| --- | --- | --- |
| `properties` | flat array of class strings for **every** detected object, e.g. `["car","car","pedestrian"]` (duplicates kept) | `contains` (label present), `in`, `exists` |
| `objectCount` | **integer** — number of detected objects | `eq` / `ne` / `gt` / `gte` / `lt` / `lte` |
| `details` | array of per-object objects (each with `classified`, `distance`, `isStatic`, `frames`, `traject`, `x`/`y`/`w`, …) | `exists` only — it is an array, so `path` **cannot reach the fields inside it** |

**To route on a detected class, match `properties` with `contains`:**

```json
{ "operation": "classify", "condition": { "path": "results.classify.properties", "op": "contains", "value": "car" } }
```

**To gate on how many objects were detected, match `objectCount` numerically:**

```json
{ "operation": "classify", "condition": { "path": "results.classify.objectCount", "op": "gt", "value": 1 } }
```

> **The array caveat.** A `{ "path": "results.classify.label", "op": "eq", "value": "car" }` or `{ "path": "results.classify.details.0.classified", … }` condition will **never match**: there is no top-level `label`/`labels` field, and the per-object `classified` values live inside the `details` array, which a `path` cannot traverse. Match `properties` instead. Class strings come from the classifier's own vocabulary (e.g. `car`, `pedestrian`, `truck`).

The full bag, for reference — only `properties`, `objectCount` and `details` are top-level; everything else lives **inside** `details`, out of `path`'s reach:

```jsonc
// classify result bag — illustrative; worker-owned, may evolve
{
  "properties":  ["car", "car", "pedestrian"],  // matchable: contains / in / exists
  "objectCount": 3,                              // matchable: numeric (eq/gt/gte/lt/lte)
  "details": [                                   // matchable: exists only (it's an array)
    {
      "classified":     "car",     // class label for this object
      "distance":       142.6,      // pixels travelled across the clip
      "staticDistance": 120.4,
      "isStatic":       false,      // true when the object never moved
      "occurence":      81,
      "frame":          0,
      "frames":         [0, 9, 18], // frame numbers the object appears in
      "traject":        [[x1, y1, x2, y2]],  // bounding boxes over time
      "trajectCentroids": [[cx, cy]],
      "x": 754, "y": 882, "w": 72,  // last bounding box
      "frameWidth":  1920,
      "frameHeight": 1080,
      "id":    "2",
      "valid": true
    }
  ]
}
```

## Other operations in the seed bag

Workflows are dispatched off the operations bundled into the run-open hand-off (and stage results as they resolve), so `classify` is the one operation you can reliably `need`. Other analysis operations — `counting`, `sprite`, `thumbnail`, `dominantcolor` — are **not** guaranteed upstreams; they appear in the [`inputs` bag](#event-the-seed-bag) only when they happen to resolve before classify, which is timing-dependent and not guaranteed.

Because they are not dependable upstreams, the engine does **not** statically validate conditions on them — a `need` on `counting` is accepted as-is but may simply never fire. If you need to gate on a count or any other operation's result, model that as a **custom worker stage** that reads the recording's data directly, rather than relying on it being present at run open.

## Custom stages (e.g. `anpr`)

A custom worker stage hands back **whatever its worker writes** — its result shape is owned by the worker, not the platform. For example an `anpr` (number-plate) stage might return:

```jsonc
// worker-defined — illustrative, not guaranteed
{ "plates": ["ABC123", "XYZ789"], "region": "EU" }
```

A downstream stage can then `need: anpr` with a condition such as `{ "path": "results.anpr.plates", "op": "contains", "value": "ABC123" }`. Because the engine cannot know a worker's shape, **custom-operation paths are accepted as-is and not validated** — getting them right is the worker's contract with its consumers.

## Path validation at boot

The orchestrator parses `PIPELINE_STAGE_REGISTRY` once at startup and **fails fast** on a path it knows is wrong, so a bad condition surfaces at deploy time (the pod won't start) rather than as a stage that silently never fires:

- A path must start at a **valid root**: `inputs`/`results` (then `.<op>`), `device`, `user`, or a top-level scalar (`operation`/`runId`/`key`/`traceId`). An unknown root, an **empty** path, and any path into a **credential** (`storage…`, `user.storage…`) are rejected.
- Under `inputs.<op>`/`results.<op>` for the **known** operation (`classify`) the field must be declared (`properties`, `objectCount`, `details`) and the path may not reach **past** an array/scalar field — so `results.classify.label` and `results.classify.details.0.classified` are rejected. For any **other** operation — a non-dispatched one like `counting`, or a custom worker stage — the field path is **accepted as-is**, since its shape isn't statically known.
- Under `device`/`user` only the declared envelope fields are accepted (`device.deviceKey` ✓, `user.email` ✗).

This mirrors the rest of the registry: a malformed array or an unknown `needsMode` fail fast the same way. A need with an empty `operation` is **valid** — it's an ungated check on the run root. See [Registering a stage](integrations/#registering-a-stage).

## Quick reference

| Root | Matchable paths | Notes |
| --- | --- | --- |
| `event` | — (not a need target) | the run-open signal; gate on the bundled operation (`classify`) instead, or use `dispatch: always` |
| `inputs.classify` / `results.classify` | `…properties` (`contains`/`in`/`exists`), `…objectCount` (numeric), `…details` (`exists`) | the dispatch trigger — the reliable operation to gate on (at open under `inputs`, later under `results`) |
| custom (e.g. `results.anpr`) | worker-defined | accepted as-is, not validated; appears in `results` once resolved |
| `inputs.counting` / `sprite` / … | not a dependable upstream | only appear in `inputs` opportunistically; model as a custom stage instead |
| `device` | `deviceKey`, `deviceName`, `provider`, `storageSolution` | the recording source — ungated (empty `operation`), matchable from open |
| `user` | `id`, `organisationId` | the owning account — `user.storage` is **not** matchable (credentials) |
| identity | `operation`, `runId`, `key`, `traceId` | top-level scalars; `exists`/`eq`/`ne` |
| `storage` / `user.storage` | — (rejected) | credentials are never matchable |
