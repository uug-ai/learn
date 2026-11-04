---
title: GitHub
description: Understand UUG's workflow callers and the boundary between component releases and GitOps changes.
weight: 10
toc: true
type: docs
---

UUG uses GitHub repositories for component source and GitHub Actions for delivery
automation. In Learn, small workflow callers delegate common jobs to
`uug-ai/workflows`, while repository-specific inputs describe what to build and
which GitOps image field to update.

This page uses **Learn's checked-in callers** as evidence. It does not assume
every component has the same build matrix or claim to document the internals of
the shared workflow repository.

## Follow a Learn release

| Stage | Learn configuration | What the caller requests |
| --- | --- | --- |
| Source review | `.github/workflows/pr-build.yml` | A shared pull-request build with AMD64 and ARM64 runners. |
| Create a version | `.github/workflows/release-bump.yml` | A manual major, minor, or patch bump, followed by the shared release workflow. |
| Release event | `.github/workflows/release-create.yml` | A shared release build for a created GitHub release. |
| Stage the artifact | Inputs to the release caller | A GitOps PR updating the image in `environments/staging/learn/deployment.yaml`. |
| Verify the image | `.github/workflows/security-scan.yml` via release callers | A repository-local verification job for the tagged image. |

The deployment key passed by both release callers is
`.spec.template.spec.containers[0].image`, with a value shaped like
`ghcr.io/uug-ai/learn:<release-tag>`.
An image build does not itself merge the requested GitOps PR or prove that
staging is running that image.

## Why the bump workflow calls release directly

GitHub suppresses most follow-on workflow events created with the default
`GITHUB_TOKEN`. Learn's bump workflow therefore explicitly calls the reusable
release workflow after the version bump rather than relying only on a second
`release: created` event.

When diagnosing a missing build, inspect the initiating run and its dependent
jobs before creating another release. A manually retried release can otherwise
duplicate work or target a different version.

## Automation does not replace review

Learn also calls a shared PR-description workflow with
`overwrite_description: true`. Treat generated descriptions as editable review
material, and verify that the final description still explains the actual
change.

For deployment changes, review the GitOps manifest diff separately from the
source PR. See [Deployment pull requests](/guides/platform-engineering/environments/pullrequests)
for a recommended review checklist.

## Continue

- [Actions](/guides/platform-engineering/devops/github/actions) maps the GitOps
  workflows and their effects.
- [Workflow templates](/guides/platform-engineering/devops/github/templates)
  explains how to adapt a caller without copying a deployment contract blindly.
- [Image hardening](/guides/security/image-hardening) defines the image-build
  baseline; it is not a statement that every current image meets it.

## Sources

The [source map](/guides/platform-engineering/sources#component-delivery)
links Learn's build and release callers.
