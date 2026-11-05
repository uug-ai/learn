---
title: Sources and scope
description: Trace platform guidance to the repository configuration it describes.
weight: 60
toc: true
type: docs
---

The platform guides were checked on **4 November 2026** using authenticated,
read-only GitHub access. The reference repositories are private; their links
require authorization. Configuration was inspected, not executed or deployed.
No live cluster state or GitHub protection settings were verified.

Reference snapshots:

- `uug-ai/monorepo`: `7b66a07273f0d5c3af31028d3bf1590927230439`
- `uug-ai/gitops`: `0003f56cb77bd3b5972e96168807839c7a2e5907`

The links below pin those revisions so the evidence remains reviewable as
`main` changes. Use the current workflow definition when operating the platform;
an old guide is not authorization to run an obsolete command.

## Development workspace

| Evidence | What it supports |
| --- | --- |
| [Monorepo README](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/README.md) and [repository declarations](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/.gitmodules) | Meta-repository organization, independent components, and the warning about destructive workspace reset. |
| [Dev Container definition](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/.devcontainer/devcontainer.json) | Container hooks and host-token forwarding. |
| [Bootstrap script](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/.devcontainer/post-create.sh) | Remote-first submodule setup, direct-clone fallback, binding build, and generated Go workspace. |
| [Development secret fetcher](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/.devcontainer/fetch-secrets.sh) | Development-only secret downloads, temporary-file handling, and warnings. |
| [VS Code tasks](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/.vscode/tasks.json) and [update script](https://github.com/uug-ai/monorepo/blob/7b66a07273f0d5c3af31028d3bf1590927230439/pull.sh) | Executable service entry points and workspace-wide update behavior. |

## Component delivery

These links pin Learn's own workflow callers at the inspected checkout,
`18bd1ad5105dfc14ce91cfe7264a94337d0e2aa3`, rather than the private
shared-workflow implementations. They establish the requested inputs and
dependency graph, not the internals or successful execution of shared jobs.

| Evidence | What it supports |
| --- | --- |
| [PR build caller](https://github.com/uug-ai/learn/blob/18bd1ad5105dfc14ce91cfe7264a94337d0e2aa3/.github/workflows/pr-build.yml) | Shared workflow reuse and requested AMD64/ARM64 matrix. |
| [Release caller](https://github.com/uug-ai/learn/blob/18bd1ad5105dfc14ce91cfe7264a94337d0e2aa3/.github/workflows/release-create.yml) | Created-release trigger and requested staging image-update PR. |
| [Version bump caller](https://github.com/uug-ai/learn/blob/18bd1ad5105dfc14ce91cfe7264a94337d0e2aa3/.github/workflows/release-bump.yml) | Manual version selection and direct release invocation. |
| [PR-description caller](https://github.com/uug-ai/learn/blob/18bd1ad5105dfc14ce91cfe7264a94337d0e2aa3/.github/workflows/pr-description.yml) | Generated description with overwrite enabled. |

## GitOps delivery automation

| Evidence | What it supports |
| --- | --- |
| [Promotion workflow](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/.github/workflows/promote.yaml) | Inputs, service field lists, supporting-file copies, chart advancement, branch reuse, reporting jobs, and scan conditions. |
| [Production shortcut](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/.github/workflows/promote-to-production.yaml) | Direct staging-to-production dispatch and its defaults. |
| [GitOps README, promotion sections](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/README.md#design-website-and-learn-promotion) | Documented service scope and informational image-scan limitations. |
| [Existing Learn promotion guidance](https://github.com/uug-ai/learn/blob/18bd1ad5105dfc14ce91cfe7264a94337d0e2aa3/app/content/guides/platform-engineering/environments/promotion.md) | Previously documented staged path and production-to-customer-staging convention; these are not restrictions enforced by workflow inputs. |
| [Promotion PR helper](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/.github/scripts/upsert_release_pr.py) | Create/update behavior and oversized-note continuation comments. |
| [On-demand notes](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/.github/workflows/generate-release-notes.yaml) | Version comparison without deployment changes. |
| [Weekly release workflow](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/.github/workflows/create-weekly-release.yaml) | Manual production snapshots, dated releases, and note regeneration. |
| [Learn release-note drafting](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/.github/workflows/draft-learn-release-notes.yaml) | Published-release trigger, manual options, preserved editorial state, and draft PR creation. |

## Reconciliation

| Evidence | What it supports |
| --- | --- |
| [Learn staging Application](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/environments/staging/argocd-application-learn.yaml) | Raw YAML include filter, tracked revision, destination, and configured sync policy. |
| [Hub staging Application](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/environments/staging/argocd-application-kerberos-hub.yaml) | Versioned chart plus Git-hosted values, destination, and sync policy. |
| [Certificate-manager ApplicationSet](https://github.com/uug-ai/gitops/blob/0003f56cb77bd3b5972e96168807839c7a2e5907/components/argocd-applicationset-cert-manager.yaml) | List generation, Helm/Git sources, and a destination-specific automated-sync exception. |

## Interpretation and safe examples

The guides explain the configuration needed to reason about development and
delivery. They intentionally omit customer names, cluster identifiers, private
endpoints, credentials, and raw environment values.

Repository intent does not prove production state, required approvals, complete
monitoring, secret rotation, backup coverage, or compliance. Diagnostic and review
checklists are recommendations unless explicitly tied to demonstrated
configuration. The public [image-hardening guide](/guides/security/image-hardening)
is a build standard, not evidence of universal implementation.
