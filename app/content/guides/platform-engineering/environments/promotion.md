---
podcast: guides-platform-engineering-environments-promotion
title: Promotion
description: Promote released component versions through reviewed GitOps changes.
weight: 10
toc: true
type: docs
---

Promotion copies selected desired versions and related configuration from one
environment to another. It does not rebuild images. In `uug-ai/gitops`,
`.github/workflows/promote.yaml` implements **Promote from/to environment**.

Despite the input names, `source_branch` and `target_branch` are environment
directory names on `main`, not branches. The resulting promotion branch is
proposed back to `main` in GitOps or the selected customer repository.

## Before starting

**Recommended:** confirm the source contains the intended released images,
record validation of that exact version set, and check that the target's
required manifests exist. Choose the smallest service scope that includes all
compatible changes.

For customer upgrades, follow the existing documented convention:
internal `production` -> customer `staging` first. The workflow exposes broader
choices; it does not itself enforce that convention.

## Run a promotion

In `uug-ai/gitops`, open **Actions -> Promote from/to environment -> Run
workflow**:

| Input | Meaning |
| --- | --- |
| `source_branch` | Source directory: `staging`, `qualityassurance`, or `production`. |
| `target_branch` | Target directory with the same choices. |
| `customer` | `n/a` for internal deployment state, or an authorized configured customer repository. |
| `services` | `all`, `hub`, `hub-pipeline`, `vault`, `factory`, `design`, `website`, or `learn`. |
| `generate_release_notes` | Generate comparison notes and the target-image security report; defaults to true. |
| `include_diff_stats` | Include diff statistics; defaults to false in this workflow. |
| `release_notes_source` | `commits`, `code`, or `diff`; defaults to `commits`. |

The separate **Promote to production** workflow dispatches this workflow with
`staging` -> `production`, `customer=n/a`, and defaults to all services,
release notes enabled, diff statistics enabled, and `code` context.
It is a shortcut, not an additional approval gate.

## What is copied

| Selection | Configured changes |
| --- | --- |
| `hub` | Selected Hub/Admin/worker version fields; available `icons.js`, `chart.yaml`, and `indexes.txt`; a newer Hub chart revision when both Application files exist. |
| `hub-pipeline` | Selected pipeline version fields and the standalone classifier image. |
| `vault`, `factory` | The first container's image in the corresponding standalone deployment. |
| `design`, `website`, `learn` | The selected service's standalone deployment image, internally only. |
| `all` | The combined supported changes, plus legacy website/documentation images internally. |

The Hub field list is explicit: this is **not** a wholesale copy of
`values.yaml`, nor a guarantee that every newly added service field is covered.
For the listed standalone workloads, the workflow addresses
`.spec.template.spec.containers[0].image`; review the actual container layout.

Hub promotion also copies the three supporting files in full when present.
Review them for behavior and index changes, not just versions.
Chart promotion only advances to a version considered newer by the workflow;
it does not automatically downgrade the chart during an image rollback.

Partial promotions do not implicitly update Learn or Website. Customer targets
do not receive the internal-only `design`, `website`, or `learn` updates.

## Branch and pull-request behavior

The workflow prepares a branch named:

```text
promote/<yyyy-mm-dd>-<source>-to-<target>
```

It commits and pushes only when the manifest diff is nonempty. With no changes,
it skips commit, push, and PR creation.

The branch name does not include service scope. Runs for the same route and
date can reuse it, and the current workflow force-pushes that branch. The PR
helper creates a PR or updates an existing open one.
**Recommended:** avoid overlapping runs for the same route and re-review the
latest diff after any rerun. Do not assume the previous approval covered it.

## Generated notes and image scans

When notes are enabled and changes exist, release-note generation and image
scanning run in parallel after target inventory preparation. The PR receives
version comparisons, optional statistics, available Hub translation changes,
and a **Container image security (Trivy)** table. Long notes continue in marked
PR comments.

The inventory covers the post-promotion target application images, including
unchanged images in a partial promotion. It combines Hub chart defaults and
values, chart-rendered images, and supported standalone workload directories.
It is not a scan of all cluster infrastructure: configured exclusions apply.
The scan is point-in-time and targets Linux AMD64, not every architecture.

Important boundaries:

- Vulnerability findings are **informational**; their presence does not block
  promotion.
- Individual pull, timeout, or malformed-report failures produce warnings and
  `N/A`, not zero vulnerabilities.
- Inventory, scanner setup, or initial database failures can fail the workflow
  before PR publication, after the promotion branch has already been pushed.
- Disabling release notes also skips this promotion image scan.

Use the Actions summary and `release-image-security` artifact for diagnostics;
the artifact is retained for 14 days. Generated notes and security counts are
review inputs, not evidence that a rollout is safe or that all images are
compliant with the [image-build baseline](/guides/security/image-hardening).

## Finish the rollout

Review the [deployment PR](/guides/platform-engineering/environments/pullrequests),
including supporting configuration and any incomplete reports. Merge only the
intended target diff. Argo CD then reconciles according to the actual
Application's sync policy; merging a PR does not prove a successful rollout.

Follow [Operating a deployment](/guides/platform-engineering/operations) to
check the applied revision, running images, health, and a representative user
journey. Record the result before the next promotion.

## Sources

The pinned [promotion workflow and README](/guides/platform-engineering/sources#gitops-delivery-automation)
support the current behavior and the documented customer-upgrade convention.
