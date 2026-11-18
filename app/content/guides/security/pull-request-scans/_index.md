---
title: Pull request and commit scans
description: How Trivy scans the image built from every pull request and every commit to main, and which repositories run the full release gate before merge.
weight: 15
toc: true
type: docs
---

The earliest point to find a vulnerability is the change that introduces it.
Every component repository has a `security-scan.yml` workflow that builds the
container image and scans it with [Trivy](https://trivy.dev/):

| Trigger | When it runs | Why |
| --- | --- | --- |
| Pull request | Opened, updated with new commits, or reopened | The reviewer sees what the change brings in before it is merged. |
| Commit to `main` | Every push to `main`, including merges | The merged result is scanned, not only the branch, so two clean pull requests that combine badly still show up. |
| Manual | `workflow_dispatch`, where the repository offers it | Rerun a scan, or scan a published tag, without a code change. |

## What the scan checks

Most repositories call the shared reusable workflow:

```yaml
jobs:
  security-scan:
    uses: uug-ai/workflows/.github/workflows/security-scan.yml@main
    with:
      project: ${{ github.event.repository.name }}
      docker_context: "."
    secrets: inherit
```

It builds the image from the pull request or commit and runs Trivy against it:

| Setting | Value |
| --- | --- |
| Scan type | `image`: OS packages and application dependencies (`vuln-type: os,library`) |
| Severities | `CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN` |
| Unfixed CVEs | Included (`ignore-unfixed: false`) |
| Output | A table in the job log, per package with installed and fixed version |
| Result | Informational (`exit-code: "0"`) |

The vulnerability database is pulled from GHCR (`ghcr.io/aquasecurity/trivy-db`)
at the start of each run, so a scan always uses the current list of CVEs.

{{< callout type="info" >}}
The shared scan **informs**; it does not block the merge. Blocking happens at
release: a hardened release fails on any medium, high or critical finding
(see [Hardened releases and signing](/guides/security/release-signing)).
A reviewer should still treat a new finding in the pull request table as a
reason to upgrade the dependency in the same change.
{{< /callout >}}

## Repositories with stricter checks

Some repositories go further than the shared table scan:

| Variant | What runs on each pull request and commit | Examples |
| --- | --- | --- |
| Full release gate | `release-create.yml` with `hardened: true` and `publish: false`: source secret and misconfiguration scan, tests with `govulncheck`, the image contract, the smoke test and the **blocking** Trivy gate. Nothing is pushed. | Hub frontend |
| Release build, gate on demand | `release-create.yml` with `publish: false`; a manual run with `hardened: true` adds the full gate. | Hub API |
| Repository-specific | A source scan for secrets and misconfiguration, followed by an image scan for vulnerabilities and secrets. | Vault |

Running the release gate on a pull request means a vulnerable dependency
fails the check before merge, instead of failing the release later. It takes
longer than the table scan.

## Other checks that run on code

| Check | Where | What it finds |
| --- | --- | --- |
| `govulncheck` | Dockerfile `test` stage of hardened Go services | Known vulnerabilities in Go modules, with call-graph reachability |
| Trivy source scan (`secret,misconfig`) | Hardened release and the full-gate pull request variant | Committed credentials and risky Dockerfile or Kubernetes configuration |
| CodeQL | Agent | Code patterns such as injection and unsafe input handling |

`govulncheck` reports whether vulnerable code is reachable, but the image gate
does not take reachability into account. Upgrade a vulnerable module even when
`govulncheck` says it is not called.

## Reading a result

1. Open the **Security scan** check on the pull request, or the run for the
   commit under **Actions**.
2. In the Trivy step, look for rows with severity `MEDIUM` or higher and a
   **Fixed Version**.
3. Upgrade the Go module, npm package or digest-pinned base image to that
   version in the same pull request.
4. Without a fixed version, remove the dependency or switch base image. A
   hardened release counts unfixed findings too.
