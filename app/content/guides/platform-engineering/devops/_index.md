---
title: Software delivery
description: Follow a component change from source review to a proposed deployment.
weight: 20
toc: true
type: docs
---

Building software and deploying software are different operations. A component
repository owns its source and release workflow. GitOps owns the desired version
for an environment, and Argo CD reconciles that configuration.

Start with [GitHub delivery](/guides/platform-engineering/devops/github) for a
concrete walkthrough using Learn, then read
[promotion](/guides/platform-engineering/environments/promotion) for moving
already released versions between environments.

Keep three review questions separate:

| Review | Question |
| --- | --- |
| Source pull request | Does the implementation behave correctly? |
| Release build | Was the intended artifact built and published? |
| Deployment pull request | Is this artifact and configuration suitable for this target? |

A successful build alone does not answer the deployment question. Likewise,
merging deployment configuration is not evidence that the application is
healthy; finish with [rollout verification](/guides/platform-engineering/operations).
