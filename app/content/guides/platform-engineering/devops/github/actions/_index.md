---
title: Actions
description: Choose the GitOps workflow that matches the change you intend to make.
weight: 10
toc: true
type: docs
---

In `uug-ai/gitops`, workflow names distinguish a deployment change from release
communication. Read the workflow inputs before starting a run; several actions
create branches, PRs, or releases in other repositories.

## Workflow map

| GitHub Actions name | Definition under `.github/workflows/` | Effect |
| --- | --- | --- |
| Promote from/to environment | `promote.yaml` | Copies selected deployment versions/configuration and creates or updates a target-repository PR. |
| Promote to production | `promote-to-production.yaml` | Dispatches the promotion workflow from staging to production, internally. |
| Generate release notes on demand | `generate-release-notes.yaml` | Generates a repository/version comparison in the run summary without changing deployments or publishing a release. |
| Create weekly GitOps release | `create-weekly-release.yaml` | On manual dispatch, snapshots production version changes into a dated GitOps release; also supports regenerating an existing release's notes. |
| Draft Learn release notes | `draft-learn-release-notes.yaml` | On release publication or manual dispatch, prepares an editorial draft PR in Learn. |

The word **weekly** describes the release workflow's purpose: the inspected
definition has a manual dispatch trigger, not a weekly cron schedule.

## Inspect a run without changing state

With authorized GitHub CLI access:

```bash
gh workflow list --repo uug-ai/gitops
gh run list --repo uug-ai/gitops --workflow promote.yaml --limit 5
gh run view <run-id> --repo uug-ai/gitops
```

For a promotion, distinguish the version-copy job from the release-note and
image-scan jobs. The promotion branch can already exist when a later job fails.
Inspect the branch and any existing PR before retrying.

## Release communication is a separate step

The weekly release workflow compares production component versions with the
previous dated GitOps tag. A new release uses a `YYYY-MM-DD` UTC tag and refuses
to create a duplicate same-day tag or release.

Publishing a non-prerelease GitOps release triggers **Draft Learn release
notes**. Its default path renders and sanitizes the finalized release text
into a draft Learn PR for editorial review. The workflow also has manual
generation options; read their descriptions before using them.
It preserves existing pages and unmerged automation-branch content rather than
silently replacing reviewed work.

The weekly workflow's `regenerate_tag` mode changes the existing GitOps release
description over its original version range. Editing a release does not fire
the publication trigger again: use the Learn drafting workflow's `release_tag`
input when a new draft is needed.

This automation uses a configured repository token so publication can emit
follow-on events. It does not merge the Learn PR. Sanitization is not a
substitute for checking customer-facing wording, identifiers, and release scope.

## Recommended failure triage

| Symptom | Check first |
| --- | --- |
| No promotion PR | Whether the manifest diff is empty, then whether downstream reporting failed after the branch push. |
| Notes cannot compare versions | Repository access and the exact source/target tags, including any `v` prefix. |
| A release exists but no Learn draft appears | Publication versus edit, prerelease status, workflow token access, and the downstream run. |
| An image scan reports `N/A` | The per-image diagnostic artifact, not an assumption of zero vulnerabilities. |
| A caller behaves differently after no local YAML change | The reusable workflow/action revision; several current references use mutable `@main`. |

Current configuration and recommended review checks are covered in
[promotion](/guides/platform-engineering/environments/promotion) and
[deployment pull requests](/guides/platform-engineering/environments/pullrequests).

## Sources

See the pinned [delivery automation](/guides/platform-engineering/sources#gitops-delivery-automation)
for each workflow.
