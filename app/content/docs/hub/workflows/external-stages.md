---
title: "External stages"
description: "Connect customer-managed workers to Hub workflows through the workflow forwarder and authenticated callback API."
lead: "Run a workflow stage in your own environment: receive a safe, versioned invocation over RabbitMQ or HTTPS and return its result through the Hub API."
date: 2026-09-24T00:00:00+00:00
lastmod: 2026-09-24T00:00:00+00:00
draft: false
images: []
aliases:
  - /docs/hub/workflows/forwarder/
menu:
  hub:
    parent: "workflows"
weight: 15
toc: true
---

A [custom workflow stage](../stages/) normally runs beside Hub, consumes an
internal `WorkflowRun` from its stage queue, and returns that message to the
workflows engine. The **workflow forwarder** is the boundary for stages that run
in a customer-managed environment instead. It keeps the internal queue and
credentials inside Hub and sends the external service a smaller, versioned
invocation over the customer's own RabbitMQ broker or HTTPS endpoint.

Use the forwarder when the external worker:

- runs outside the Hub cluster;
- must not receive Hub storage credentials or internal routing state;
- should consume from a customer-managed queue or API;
- needs to return data that can route the remaining workflow stages.

{{< callout type="info" >}}
The forwarder is an opt-in workflow service. The deployment must enable
`hub-workflows-forwarder`, route a workflow stage to its queue, and select a
completion mode. Callback mode also requires a reachable Hub API URL.
{{< /callout >}}

## End-to-end flow

In callback mode, the forwarder is an adapter between Hub's internal run
message and the external contract:

```text
Hub workflows engine
        |
        | internal WorkflowRun
        v
Workflow forwarder
        |
        | safe WorkflowInvocation
        v
Customer RabbitMQ or HTTPS endpoint
        |
        | POST callback with customer's Hub token
        v
Hub API: /workflows/runs/{runId}
        |
        | trusted internal result
        v
Hub workflows engine -> downstream stages or completion
```

1. The workflows engine dispatches the `forwarder` stage.
2. The forwarder removes internal-only data and builds a
   `uug.ai/workflow-invocation/v1` message.
3. The external worker consumes the invocation and performs its work.
4. The worker sends a `uug.ai/workflow-result/v1` body to the callback URL from
   the invocation, using its own Hub access token.
5. Hub validates the token, tenant, run, and dispatched operation before
   publishing the result back to the workflows engine.
6. The engine records the first accepted result and either dispatches matching
   downstream stages or completes the run.

The external worker never connects to Hub's internal workflow queue and never
receives a Hub credential in the invocation.

## Completion modes

The binding's completion mode decides when the `forwarder` stage resolves.

| Mode | Behaviour | Use when |
|---|---|---|
| `delivered` | The forwarder resolves the stage after the customer destination confirms delivery. No callback block is included. | Delivery itself is the final outcome and Hub does not need a returned value. |
| `callback` | Delivery leaves the stage open. The invocation includes a callback block and Hub waits for the external result. | Downstream routing or workflow completion depends on the external worker's result. |

Use `callback` for an external processing stage. A successfully published
invocation does **not** complete that stage.

## Invocation contract

The external worker receives a `WorkflowInvocation`, not the internal
`WorkflowRun`:

```json
{
  "schema": "uug.ai/workflow-invocation/v1",
  "executionId": "wfx_8a5f...",
  "runId": "68d3fb899cad115513a781bd",
  "workflow": {
    "id": "customer-analysis",
    "name": "Customer analysis"
  },
  "stage": {
    "operation": "forwarder"
  },
  "tenant": {
    "organisationId": "6754047347321302010cafee",
    "projectId": "6754047347321302010cafee"
  },
  "media": {
    "key": "recordings/camera-1/example.mp4"
  },
  "device": {
    "key": "camera-1",
    "name": "Front entrance",
    "siteIds": ["site-1"]
  },
  "data": {
    "inputs": {},
    "results": {
      "classify": {
        "objects": ["person"]
      }
    }
  },
  "callback": {
    "url": "https://api.example.com/workflows/runs/68d3fb899cad115513a781bd",
    "method": "POST",
    "resultSchema": "uug.ai/workflow-result/v1"
  },
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

The exact `data` fields come from the forwarder binding. The environment-backed
RabbitMQ binding exposes the run's `inputs` and accumulated `results`. Advanced
bindings can explicitly map a narrower set of tenant, device, media, input, or
result fields.

The boundary intentionally excludes:

- storage credentials and account storage settings;
- the internal ingest payload;
- internal lifecycle, dispatch, and resolution state;
- Hub access tokens.

A short-lived signed media URL is included only when the binding explicitly
opts in.

### Invocation identities

| Field | Meaning |
|---|---|
| `runId` | The complete durable workflow run. Use it only as the run identity represented in the callback URL. |
| `executionId` | The deterministic identity of this operation within this run. Use it as the external idempotency key. |
| `stage.operation` | The trusted result key. Return the same value in the callback body. |
| `traceId` | The distributed trace identifier to include in external logs and tracing when possible. |

The forwarder may redeliver an invocation after a timeout or connection
failure. The external worker should therefore deduplicate work by
`executionId`.

## Create and provision the access token

The external service authenticates the callback with an access token created by
a user in Hub. In Hub, create the token in the organisation and project whose
workflow runs it will update, and grant exactly:

```text
workflow-runs.update
```

The spelling is exact and plural: `workflow-runs.update`.

Provision the token directly to the external service through its secret
manager. Do not put it in:

- the workflow definition;
- the forwarder binding or destination;
- RabbitMQ message headers;
- the invocation body.

The Hub API verifies the token signature and its persisted access-token
binding, pins the request to the token's organisation and project, and then
requires the `workflow-runs.update` scope. A valid token cannot update a run
from another project, and the requested operation must already have been
dispatched for that run.

## Return the result

Read the callback URL, method, and result schema from each invocation rather
than constructing the URL in the external worker:

```http
POST /workflows/runs/68d3fb899cad115513a781bd HTTP/1.1
Host: api.example.com
Authorization: Bearer <hub-access-token>
Content-Type: application/json
```

```json
{
  "schema": "uug.ai/workflow-result/v1",
  "stage": {
    "operation": "forwarder"
  },
  "result": {
    "decision": "allow",
    "confidence": 0.94
  }
}
```

`stage.operation` must match the invocation's `stage.operation`. The `result`
object becomes that operation's entry in the workflow run's results and can be
read by downstream conditions.

The callback request body is limited to 1 MiB. Store large artefacts in the
customer system or an appropriate object store and return a reference and
small routing values instead.

### Responses and retries

| Response | Meaning | External worker action |
|---|---|---|
| `202 Accepted` | Hub accepted and queued the first result. | Mark the callback complete. |
| `200 OK` | The identical result was already recorded. | Treat the retry as successful. |
| `400 Bad Request` | The schema, operation, or body is invalid. | Correct the request; do not retry unchanged. |
| `401 Unauthorized` | The bearer token is missing, invalid, or lacks `workflow-runs.update`. | Replace or reconfigure the token. |
| `404 Not Found` | The run is not visible in the token's organisation/project, or its media is unavailable. | Verify the token binding and run. |
| `409 Conflict` | The stage was not dispatched, or a different result already won. | Do not overwrite the accepted result. |
| `410 Gone` | The unresolved run has already closed. | Stop retrying this result. |
| `503 Service Unavailable` | Hub could not load, compare, rehydrate, or publish the result. | Retry with backoff. |

Callback processing is **first result wins**. Concurrent duplicate messages
cannot overwrite the accepted result or dispatch downstream stages twice.
Retried callbacks should send the same JSON result.

## Configure the Helm deployment

The chart connects the workflow definition's `forwarder` operation to the
forwarder service and its customer RabbitMQ destination:

```yaml
kerberoshub:
  workflows:
    enabled: true
    definitions:
      customer-analysis:
        enabled: true
        triggers:
          - type: automatic
        stages:
          - operation: forwarder
            dispatch: always

  services:
    forwarder:
      enabled: true
      queue: "kcloud-forwarder-queue.fifo"
      rabbitmqDestination:
        host: "customer-rabbitmq.example.com:5671"
        username: "workflow-publisher"
        password: "<from-your-secret-management-overlay>"
        queue: "customer-workflow-invocations"
        virtualHost: "/"
        tls: true
        declareQueue: false
      callback:
        # Empty derives the callback base from kerberoshub.api.schema and .url.
        baseURL: ""
      env:
        FORWARDER_OPERATION: "forwarder"
        FORWARDER_COMPLETION_MODE: "callback"
```

Set `callback.baseURL` only when external workers must reach a different public
API origin:

```yaml
kerberoshub:
  services:
    forwarder:
      callback:
        baseURL: "https://api.example.com"
```

The callback base must be an absolute HTTPS URL. The forwarder appends
`/workflows/runs/{runId}`.

The destination connection is separate from Hub's internal `RABBITMQ_*`
connection. Use TLS and a customer-broker account that can publish only to the
required invocation queue. If the queue is provisioned by the customer, keep
`declareQueue: false`; otherwise the forwarder can declare a durable quorum
queue and dead-letter queue.

Advanced installations can mount a forwarder JSON configuration to define
several workflow/operation bindings, explicit field mappings, or HTTPS webhook
destinations.

## External worker checklist

- Consume and validate `uug.ai/workflow-invocation/v1`.
- Deduplicate processing by `executionId`.
- Treat `runId` and `stage.operation` as opaque identities.
- Keep the Hub access token in a secret manager.
- Use a project-bound token with only `workflow-runs.update`.
- Read the callback URL and result schema from the invocation.
- Return the same operation and a JSON `result` object no larger than 1 MiB.
- Treat `202` and an identical-result `200` as success.
- Retry transient `503` responses with backoff.
- Include `traceId` in logs and traces.

For a stage deployed inside the Hub environment instead, use the direct queue
contract in [Stages](../stages/). For the workflow graph and conditional
routing model, return to [Workflows](../).
