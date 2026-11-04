---
title: Argo CD
description: Read UUG Application and ApplicationSet configuration before syncing or diagnosing a deployment.
weight: 10
toc: true
type: docs
---

Argo CD compares Kubernetes state with the manifests generated from its
configured sources. The GitOps repository demonstrates both raw-manifest
Applications and multi-source Helm Applications, plus ApplicationSets for
shared components.

## The objects to understand

| Object | Question it answers |
| --- | --- |
| `AppProject` | Which source repositories, destinations, and resource kinds are permitted for a group of applications? |
| `Application` | Which sources, revisions, rendering options, destination, and sync policy define one deployment? |
| `ApplicationSet` | Which template and generators produce multiple Applications? |

An Application's `spec.project` is an Argo CD project name, not a Kubernetes
namespace. Its destination is separate. Follow these fields rather than
assuming a directory, project, and cluster have identical names.

## Raw manifests: Learn

The inspected staging Learn Application tracks GitOps `main`, points at
`environments/staging/learn`, and includes only
`{deployment,service,ingress}.yaml`.

This explains why a change to `deployment.yaml` is consumed and why adding an
arbitrarily named manifest alongside it is not automatically enough.
Its configured sync policy enables automated sync, pruning, self-healing, and
namespace creation.

## Multiple sources: Hub

The staging Hub Application uses a Git source with `ref: values` and a separate
Helm source for the `hub` chart. The chart's `valueFiles` references:

```yaml
valueFiles:
  - $values/environments/staging/kerberos-hub/values.yaml
```

`$values` resolves through the named Git source, not a directory inside the
chart package. The chart source's `targetRevision` selects the chart version;
the Git source's `targetRevision` selects the values revision. These are two
different version controls.

The example below illustrates that structure with sanitized placeholders; it is
not a ready-to-apply Application:

```yaml
sources:
  - repoURL: https://github.com/uug-ai/gitops
    targetRevision: main
    ref: values
  - repoURL: https://charts.kerberos.io
    chart: hub
    targetRevision: "<reviewed-chart-version>"
    helm:
      valueFiles:
        - $values/environments/staging/kerberos-hub/values.yaml
```

A component image upgrade may need compatible chart templates. A chart change
may alter resources even when no component image changes. Review both.

## Shared components: ApplicationSets

The certificate-manager ApplicationSet demonstrates a list generator and a
Go template that creates Applications for configured destinations. Its template
combines a Helm chart source with Git-hosted certificate configuration.

It also contains a destination-specific patch disabling automated sync.
That is evidence that sync policy is not uniform across the fleet.
**Recommended:** change the generating ApplicationSet when changing generated
Applications, and assess the scope across all matching destinations.

## Understand sync policy before acting

| Setting | Operational consequence |
| --- | --- |
| `automated` | Argo CD may apply tracked changes without a separate manual sync. |
| `prune: true` | Sync can delete resources no longer present in desired state. |
| `selfHeal: true` | Live changes can be reconciled back to Git's desired state. |
| `CreateNamespace=true` | Sync may create the configured destination namespace. |

These settings are observed on the two staging Applications above, not a
universal statement about every deployment. ApplicationSet patches and live
controller settings also matter.

## Sync status is not application health

**Synced** means the compared resource state matches the desired manifests.
**Healthy** is a separate assessment of resource health. Neither proves that a
user can successfully complete a business workflow.

For a rollout, check the expected revision, sync operation, resource health, and
application behavior. For an `OutOfSync` application, first determine whether
the diff is intended; do not click Sync or enable pruning as a generic repair.
See [Operating a deployment](/guides/platform-engineering/operations).

## Sources

The [reconciliation source map](/guides/platform-engineering/sources#reconciliation)
links the exact Applications and ApplicationSet used here. No dashboard access
or live cluster state was required to establish their configured behavior.
