---
title: Environments
description: Separate environment intent, Git branches, and Argo CD destinations.
weight: 40
toc: true
type: docs
---

The internal promotion workflow recognizes `staging`, `qualityassurance`, and
`production`. Their desired deployment state lives under
`environments/<environment>/` in `uug-ai/gitops`.

The workflow inputs are called `source_branch` and `target_branch`, but they
select **environment directories**, not Git branches. The workflow checks out
`main` and proposes a PR back to `main`.

## Find the actual deployment target

An environment label is not a cluster identity. Read the Argo CD Application's
`spec.project`, `spec.destination`, and `spec.sources` to establish the project,
cluster, namespace, and tracked revision. For example, the inspected Learn
staging Application uses an in-cluster destination and the `staging` namespace;
it does not derive its destination from the similarly named AppProject file.

This matters when applications move between clusters or when multiple
environments share a cluster. Never select a kubeconfig context solely because
its name looks like the environment.

## Recommended validation roles

These are useful expectations for planning a rollout, not proof of enforced
GitHub environment protection or a mandatory approval chain:

| Environment | Recommended question before moving on |
| --- | --- |
| Staging | Does the released artifact start and work with the intended configuration and dependencies? |
| Quality assurance | Do representative user journeys and cross-service compatibility checks pass? |
| Production | Is the exact reviewed version set suitable for this rollout, with recovery and data compatibility understood? |

The existing documented staged path is:

```text
staging -> qualityassurance -> production
```

The current workflows also provide a **staging -> production** shortcut.
The YAML does not enforce that QA was visited first. Choose the approved path
for the change and explicitly record validation; do not infer an approval from
the presence of an environment name.

## Customer and additional deployments

The promotion workflow can target a configured customer repository. The
documented customer-upgrade convention is to use internal `production` as the
source and the customer's `staging` as the first destination. Treat repository
selection and deployment access as separate checks.

GitOps also contains edge and additional deployment directories. The presence
of a directory does not mean the generic promotion workflow supports it. Its
dropdown is limited to the three environment names above, and supported service
paths must exist in the selected source and target.

Use [promotion](/guides/platform-engineering/environments/promotion) to prepare
the change, [pull-request review](/guides/platform-engineering/environments/pullrequests)
to assess it, and [Argo CD](/guides/platform-engineering/gitops/argocd) to
understand reconciliation.

## Sources

See [GitOps automation](/guides/platform-engineering/sources#gitops-delivery-automation)
and [reconciliation configuration](/guides/platform-engineering/sources#reconciliation).
