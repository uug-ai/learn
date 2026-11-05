---
title: GitOps
description: Locate and change the desired deployment state in the GitOps repository.
weight: 30
toc: true
type: docs
---

GitOps keeps deployment intent in Git and uses a controller to reconcile it with
Kubernetes. The `uug-ai/gitops` repository contains environment manifests, Helm values,
Argo CD configuration, shared components, and release automation.

This separates **what was built** in a component repository from **what an
environment should run**. Editing source in the monorepo does not update the
GitOps version set.

## Repository map

| Path | Role |
| --- | --- |
| `environments/` | Environment AppProjects, Applications, and workload configuration. |
| `environments/<environment>/kerberos-hub/values.yaml` | Environment-specific Hub chart values, including component versions. |
| `environments/<environment>/argocd-application-kerberos-hub.yaml` | Connects the chart revision to Git-hosted values and the actual destination. |
| `environments/<environment>/learn/` | A standalone example with Deployment, Service, and Ingress manifests. |
| `components/` | Shared components and ApplicationSets, including certificate and ingress-related configuration. |
| `.github/workflows/` and `.github/scripts/` | Promotion, release communication, inventory, and reporting automation. |
| `argocd-values.yaml` | Configuration for the Argo CD installation itself, not application values. |

Not every folder uses the same deployment mechanism. Learn's staging
Application reads selected raw YAML files; Hub's staging Application combines
a versioned Helm chart with values from Git. Read the Application before
deciding which file to change.

## Trace configuration to a workload

For a Learn staging image change:

1. Find `environments/staging/argocd-application-learn.yaml`.
2. Read its Git revision, source path, directory include filter, destination,
   and sync policy.
3. Follow the source path to `environments/staging/learn/deployment.yaml`.
4. Inspect the intended container image and related Service/Ingress definitions.

For Hub, also follow the chart source and `$values` reference. Editing an unused
file beside a source path has no effect; editing a file selected by an automated
Application may take effect as soon as the tracked branch changes.

## Recommended change workflow

Prefer the established component release and
[promotion workflows](/guides/platform-engineering/environments/promotion)
for supported version changes. Use an explicit, reviewed GitOps change for
configuration not handled by those workflows.

Before proposing a change, identify the consuming Application and render or
validate with the same chart version and target values where applicable.
Review resource deletion, service routing, persistence, and compatibility, not
just YAML syntax.

Do not copy environment values into a public issue or use them as a sample.
Use sanitized examples and authorized local tooling for values that contain
private configuration.

## Git remains the recovery record

A manual `kubectl` edit does not update desired state. On Applications with
self-healing enabled, Argo CD can undo that edit; pruning can also remove
resources deleted from Git.

**Recommended:** use reviewed desired-state changes for durable fixes. Any
emergency intervention should be coordinated with the responsible operator and
followed by a compatible Git change. A Git revert restores configuration
history, not database contents or external side effects.

Continue with [Argo CD](/guides/platform-engineering/gitops/argocd) for the
controller model and [operating a deployment](/guides/platform-engineering/operations)
for diagnostic steps.

## Sources

See the pinned [reconciliation configuration](/guides/platform-engineering/sources#reconciliation)
and [promotion automation](/guides/platform-engineering/sources#gitops-delivery-automation).
