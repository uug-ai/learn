---
title: Operating a deployment
description: Verify a rollout from Git revision to application behavior and choose a durable recovery.
weight: 50
toc: true
type: docs
---

This is a **recommended diagnostic procedure** based on the Applications and
promotion workflows in GitOps, not a claim that a particular cluster is healthy
or that these checks are automated.

Use authorized, read-only access first. Confirm the Kubernetes context and the
Application's actual destination before inspecting workloads. Avoid exporting
full manifests or logs into public channels; they may contain private values.

## Verify the chain, not only the PR

| Layer | Evidence to collect |
| --- | --- |
| Git | The merged deployment commit and exact image/chart/configuration changes. |
| Argo CD | The expected compared/applied revision, sync status, health, and last operation result. |
| Kubernetes | Rollout completion, ready replicas, events, and the intended container images. |
| Application | A representative user journey and any relevant service errors. |

For an Application tracking `main`, the branch can advance again after your PR.
Check the commit actually compared and applied. Multi-source Applications have
multiple revisions; a chart version and a Git commit are not interchangeable.

## Inspect Argo CD first

Run these commands only against the authorized Argo CD control-plane context:

```bash
kubectl config current-context

# Substitute the Application you intend to inspect.
APP=learn-staging
kubectl -n argocd get application "$APP" \
  -o jsonpath='{.spec.destination}{"\n"}{.status.sync}{"\n"}{.status.health}{"\n"}'
kubectl -n argocd get application "$APP" \
  -o jsonpath='{.status.operationState.phase}{"\n"}{.status.operationState.message}{"\n"}'
```

The destination may be a different cluster from the Argo CD control plane.
Switch to that authorized destination context before running workload checks.

## Inspect the target workload

Substitute the namespace and Deployment name from the selected Application's
manifests. These commands do not change the workload:

```bash
kubectl -n <namespace> rollout status deployment/<deployment> --timeout=120s
kubectl -n <namespace> get deployment <deployment> \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"="}{.image}{"\n"}{end}'
kubectl -n <namespace> get pods
kubectl -n <namespace> get events --sort-by=.metadata.creationTimestamp
```

Readiness and a successful rollout are necessary signals, not end-to-end
validation. For Learn, a representative check is to open the changed guide and
follow its navigation and internal links. For a processing service, choose a
representative journey that exercises the affected dependency chain.

## Narrow a failed rollout

| Symptom | Next inspection |
| --- | --- |
| Expected Git change has no effect | Application revision, source path, directory include filter, and destination. |
| Manifest generation fails | Pinned chart version, `$values` reference, required values, and source access. |
| Application stays `OutOfSync` | Actual resource diff, automated-sync policy, previous operation errors, and deliberate exceptions. |
| Pods cannot pull the image | Exact repository/tag or digest, registry access, and architecture availability. |
| Pods run but remain unready | Events, probes, required configuration, and dependency reachability. |
| Healthy resources but broken user journey | Application-level errors and cross-service/configuration compatibility. |

For promotion failures before deployment, inspect the Actions run instead:
the branch may have been pushed before report generation failed. Do not confuse
that with a cluster rollout failure.

## Plan recovery in desired state

**Recommended:** identify the known-good image, chart, and configuration set;
check whether data migrations or external side effects allow it to run safely.
Propose a reviewed GitOps change restoring that compatible state.

A Git revert does not restore persistent data. The generic promotion workflow
only advances the Hub chart when it considers the source version newer, so an
image downgrade is not automatically a chart rollback.

Avoid treating `kubectl rollout undo` or live edits as a durable GitOps fix:
self-healing can overwrite them. Coordinate emergency actions with the
responsible operator and reconcile the intended state back into Git.

## Sources

See the [Application configuration](/guides/platform-engineering/sources#reconciliation)
and [promotion implementation](/guides/platform-engineering/sources#gitops-delivery-automation).
This procedure deliberately does not prescribe an unverified dashboard,
alerting policy, backup system, or production access mechanism.
