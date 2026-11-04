---
title: Templates
description: Reuse workflow callers while keeping repository-specific build and deployment inputs explicit.
weight: 20
toc: true
type: docs
---

The verified reuse pattern in Learn is a **reusable workflow caller**: a small
repository workflow calls `uug-ai/workflows` with explicit inputs. This is not
evidence that an organization-wide repository scaffolder or mandatory PR
template is installed.

## A concrete caller

Learn's pull-request build delegates its job like this:

```yaml
name: Build pull request

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  build:
    uses: uug-ai/workflows/.github/workflows/pr-build.yml@main
    with:
      project: ${{ github.event.repository.name }}
      language: javascript
      docker_context: "."
      runner_matrix: '[{"architecture":"amd64","runner":"ubuntu-24.04"},{"architecture":"arm64","runner":"ubuntu-24.04-arm"}]'
    secrets: inherit
```

This is Learn's configuration, not a universal template. For example,
`language: javascript` is a caller input here even though Learn's image build
also uses Hugo and Go. Read the reusable workflow's current interface before
adapting it to a different project.

## Recommended adaptation checklist

Verify the build context, toolchain, test entry points, supported architectures,
and shared-workflow input contract for the new repository. Do not copy
`secrets: inherit` without reviewing which secrets the called workflow requires
and what its jobs can access.

For a release caller, also establish:

| Input | Why it matters |
| --- | --- |
| Image repository and tag | Identifies the artifact reviewers must trace back to source. |
| `gitops_repo` | Determines where the deployment PR is requested. |
| `gitops_file` | Selects the target environment and workload manifest. |
| `gitops_key` | Must address the actual image field, not a coincidentally similar container index. |
| Runner matrix | Requests builds for the architectures the workload needs. |

Learn's release caller points at
`environments/staging/learn/deployment.yaml`; it must not be copied unchanged
into another service. A wrong file or YAML key can update a different workload
while still producing a syntactically valid PR.

Current callers use `@main` for shared workflows. **Recommended:** evaluate
immutable reviewed revisions where reproducibility and change control require
them; do not describe the current callers as pinned.

## Keep the review contract visible

Reuse a workflow to reduce duplicated automation, not to hide deployment
decisions. A source change should explain its behavior and compatibility;
a deployment change should explain its target, exact versions, validation,
and recovery plan. The
[deployment PR guide](/guides/platform-engineering/environments/pullrequests)
provides a recommended description skeleton without claiming it is enforced.

## Sources

See Learn's [workflow callers](/guides/platform-engineering/sources#component-delivery).
