---
title: Pull requests
description: Review desired-state changes independently from source releases and generated notes.
weight: 20
toc: true
type: docs
---

Deployment PRs are the review boundary between released software and the
environment that should run it. A source PR asks whether code is correct;
a GitOps PR asks whether specific versions and configuration are appropriate
for a specific target.

The current promotion workflow creates or updates a PR against `main` in
GitOps or a selected customer repository. It can regenerate descriptions and
continuation comments. Review the current diff, not only an earlier description.

## Recommended review checklist

| Check | What to establish |
| --- | --- |
| Target | Correct repository, environment directory, Argo CD Application, cluster, and namespace. |
| Artifact identity | Intended image repository and tag/digest; corresponding component release exists. |
| Scope | Only the intended services change; partial promotions have not omitted required dependent changes. |
| Compatibility | Shared models, API/frontend contracts, worker messages, chart templates, and configuration agree. |
| Non-image changes | Review copied icons, chart configuration, index definitions, and any resource changes. |
| Environment boundaries | Credentials, endpoints, storage, and other target-specific settings were not accidentally copied from the source. |
| Evidence | Validation covers the proposed version set; notes, translations, and image reports are complete enough to assess. |
| Recovery | Known-good versions are identified, including chart/configuration and data compatibility constraints. |

These are recommendations. The inspected files do not establish branch
protection, required reviewers, or enforced GitHub environment approvals.

For Hub, check the Application's Helm `targetRevision` as well as component
image tags in `values.yaml`. For a standalone Deployment, check which container
the workflow actually updated. A valid YAML document can still select the wrong
image or application.

## A useful PR description

The following is a recommended review skeleton, not a checked-in mandatory
GitHub template:

```markdown
## Target and scope
Internal qualityassurance; Learn only.

## Version change
Learn: <previous-release-tag> -> <candidate-release-tag>
Source environment and validation: <evidence for the exact candidate>

## Compatibility and configuration
<Related changes, or why no dependency/configuration change is needed>

## Rollout verification
<Argo CD revision, workload readiness, and representative journey to check>

## Recovery
<Known-good image/configuration and any data compatibility constraints>
```

Keep credentials and internal/customer identifiers out of public descriptions.
Reference approved private evidence instead of attaching raw values files.

## Generated reports need interpretation

Generated release notes summarize changes but are not the complete diff.
Read overflow comments when the PR body says notes continue there. Missing
repositories, truncated context, or `N/A` scan rows need investigation.
Promotion CVE findings are informational, and disabling notes skips that scan;
neither an absent table nor a green workflow means "no vulnerabilities."

A rerun for the same date and route can replace the promotion branch. If the
diff changed, review it again before merging.

## After merge

Identify the expected GitOps commit, then check reconciliation and workload
behavior using [Operating a deployment](/guides/platform-engineering/operations).
Do not close the rollout solely because GitHub shows a merged PR.

## Sources

See the [promotion implementation and PR helper](/guides/platform-engineering/sources#gitops-delivery-automation).