---
title: Platform Engineering
description: How a shared development workspace connects to GitHub delivery workflows and GitOps-managed environments.
weight: 30
toc: true
type: docs
---

Platform engineering connects the tools used to develop the products
with the tools used to deliver it. The aim is to share repeatable workflows
without making every service use one language or one release version.

These guides are for engineers developing services, reviewing deployments, or
supporting a rollout. Start with [Dev containers](/guides/onboarding/dev-containers)
if you need a working development environment first.

## The platform in three parts

| Layer | Where it lives | What it provides |
| --- | --- | --- |
| Development workspace | `uug-ai/monorepo` | Repository checkouts, a shared Dev Container, Go workspace generation, and VS Code tasks. |
| Software delivery | Component repositories and GitHub Actions | Source review, build and release workflow callers, and proposed deployment-version updates. Learn is a concrete example. |
| Desired deployment state | `uug-ai/gitops` | Environment manifests, Helm values, Argo CD applications, and promotion workflows. |

The monorepo is a **meta-repository**, not a single application release. Its
components remain separate repositories. GitOps records which released versions
an environment should run; it does not build those versions.

A representative change follows this path:

```text
Component source change and review
  -> component build and release
  -> GitOps staging image-update pull request
  -> merge and Argo CD reconciliation
  -> validation and promotion pull request
  -> merge and target-environment reconciliation
```

This is the delivery shape configured for Learn. Do not assume every component
has identical triggers, checks, or automatic staging updates.

## Choose a guide

| Task | Guide |
| --- | --- |
| Work across an API, frontend, and shared library | [Development workspace](/guides/platform-engineering/workspace) |
| Understand source builds and deployment changes | [GitHub delivery](/guides/platform-engineering/devops/github) |
| Find the state that controls a deployment | [GitOps](/guides/platform-engineering/gitops) |
| Understand chart sources, sync, and drift | [Argo CD](/guides/platform-engineering/gitops/argocd) |
| Select and promote an environment | [Environments](/guides/platform-engineering/environments) |
| Review a rollout safely | [Deployment pull requests](/guides/platform-engineering/environments/pullrequests) |
| Diagnose a rollout or plan recovery | [Operating a deployment](/guides/platform-engineering/operations) |

## What these guides establish

The descriptions of current configuration were checked against the private
monorepo and GitOps repositories on **4 November 2026**. The
[source map](/guides/platform-engineering/sources) records the exact revisions
and files. Links to those repositories require authorized GitHub access.

Repository configuration shows intent, not live cluster health. These guides do
not establish which workflows have successfully run, which approvals are
enforced in GitHub settings, or which versions are currently serving traffic.
Sections labelled **Recommended** are working guidance, not claims that a
control is already enforced. Examples omit credentials, internal endpoints,
cluster identifiers, and customer configuration.