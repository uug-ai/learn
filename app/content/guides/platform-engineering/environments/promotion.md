---
title: Promotion
toc: false
type: docs
description: Promote validated releases between environments through the GitOps workflow.
---

We promote releases between environments through the `uug-ai/gitops` repository using the workflow defined in `.github/workflows/promote.yaml`. Instead of manually updating Kubernetes manifests, the workflow copies the approved image references from one environment to another and opens a pull request for review.

## When to use this workflow

Use the promotion workflow when you want to:

- move a validated release from `staging` to `qualityassurance`
- move an approved release from `qualityassurance` to `production`
- promote our approved `production` versions into a customer's `staging` environment for validation

For customer upgrades, we always use our internal `production` environment as the source of truth and promote into the customer's `staging` environment first.

## Running a promotion

1. Open the `uug-ai/gitops` repository in GitHub.
2. Go to **Actions** and select **Promote from/to environment**.
3. Fill in the workflow inputs:
   - `source_branch`: the environment you want to copy versions from; for customer promotions this is always `production`
   - `target_branch`: the environment you want to update in the selected repository
   - `customer`: use `n/a` for internal environments, or select a customer repository
   - `services`: choose `all`, `hub`, `hub-pipeline`, `vault`, or `factory`
4. Start the workflow.

> For customer rollouts, the expected path is **our `production` -> customer `staging`**.

## What happens behind the scenes

The workflow checks out the GitOps repository and, when needed, a customer repository. It then copies the relevant image tags and repositories from the source environment into the target environment using `yq`.

Depending on the selected service, it updates files such as:

- `environments/<env>/kerberos-hub/values.yaml`
- `environments/<env>/kerberos-hub/hub-pipeline-classifier.yaml`
- `environments/<env>/kerberos-vault/deployment.yaml`
- `environments/<env>/kerberos-factory/deployment.yaml`

For internal promotions (`customer = n/a`), it also updates:

- `environments/<env>/kerberos.io/deployment.yaml`
- `environments/<env>/doc.kerberos.io/deployment.yaml`
- `environments/<env>/learn/deployment.yaml`

After updating the manifests, the workflow creates a branch named `promote-from-<source>-to-<target>`, commits the changes, pushes the branch, and opens a pull request against `main`.

## Release notes in the pull request

Every promotion pull request includes generated release notes so reviewers can quickly understand what is changing between the source and target environments. The PR body contains:

- an **overview** of the repositories and version changes (`from -> to`)
- **statistics** per repository, such as commits, files changed, additions, and deletions
- a short summary of the **major functional changes** included in each upgraded service

A typical release note section looks like this:

```md
## Overview

This release includes changes from the following repositories:

- **uug-ai/hub-frontend**: v1.8.21 → v1.8.25
- **uug-ai/hub-api**: v1.8.25 → v1.8.26
- **uug-ai/hub-cleanup**: v1.4.7 → v1.4.11
- **uug-ai/hub-pipeline-event**: v1.2.0 → v1.3.0
- **uug-ai/hub-pipeline-sequence**: v1.6.12 → v1.6.14

## Statistics

| Repository | Commits | Files Changed | Additions | Deletions |
|------------|---------|---------------|-----------|-----------|
| uug-ai/hub-frontend | 17 | 21 | +614 | -226 |
| uug-ai/hub-api | 5 | 8 | +540 | -38 |
| uug-ai/hub-cleanup | 15 | 12 | +1078 | -101 |
| uug-ai/hub-pipeline-event | 9 | 16 | +54 | -12 |
| uug-ai/hub-pipeline-sequence | 8 | 16 | +122 | -81 |

---

## uug-ai/hub-frontend

**Release:** v1.8.21 → v1.8.25

- Updated `@uug-ai/models` dependency to v1.4.35
- Added fallback canvas dimensions for device motion regions to improve region rendering reliability
- Introduced timeline overview mode (timeline vs chart) with new state, actions, and effects
- Major refactor of timeline rendering for better performance via per-device processing, caching, and viewport prefetching
- Improved timeline and chart behavior when filters change, including correct clearing, grouping control, and reduced unnecessary reloads
```

This makes the promotion PR both a deployment change and a release communication artifact for reviewers, QA, and customer rollouts.

## Recommended promotion path

Follow the standard release path:

```text
staging -> qualityassurance -> production
```

This keeps validation predictable and ensures each environment has been reviewed before moving forward.

## After the pull request is created

1. Review the generated manifest diff and the attached release notes.
2. Verify the expected image tags, version transitions, and major changes are correct.
3. Request approval when the target environment is sensitive, especially `production`.
4. Merge the pull request.
5. Let ArgoCD sync the updated manifests into the target cluster.

## Practical tips

- Use a specific `services` option when only part of the platform needs promotion.
- Use the `customer` option for customer-managed environments instead of editing their repository by hand.
- For customer deployments, never promote directly from our `staging` or `qualityassurance` environments; always start from our validated `production` versions.
- If no image versions changed between environments, the workflow may finish with no meaningful commit to merge.

