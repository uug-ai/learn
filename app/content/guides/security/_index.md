---
title: Security
description: How we secure our applications from the first pull request to the running cluster, with Trivy scans, SBOMs, signed images, Kyverno admission policies, CVE results in the release notes and a one-hour patch target.
toc: true
type: docs
---

Security is part of how every component is built, released and run, not a
review at the end. This page summarizes the controls; each section links to
a guide with the exact configuration.

## At a glance

- **Scanned at every step.** [Trivy](https://trivy.dev/) scans each pull
  request, each commit to `main`, each release, each promotion and, once a
  day, every image running in production.
- **No known vulnerabilities at release.** A hardened release fails on any
  medium, high or critical CVE, including ones without a fix, and on any
  secret found in the image. There is no ignore file.
- **An SBOM for every hardened release.** Each image carries an SPDX
  software bill of materials and SLSA provenance in the registry, covered by
  its signature.
- **Signed and verified images.** Releases are signed with Sigstore Cosign,
  without long-lived keys. [Kyverno](https://kyverno.io/) checks the
  signature and a hardening attestation before a Pod may start, and production
  rejects images that are not from a hardened release.
- **CVE results in the release notes.** Every promotion pull request lists the
  CVE counts of each image it deploys, so the reviewer sees them before the
  merge.
- **Patched within one hour.** When we learn about a fixable CVE in one of our
  images, a patched and verified release is ready within one hour.

## From pull request to production

```text
Pull request    Trivy scans the image the change builds
  -> Commit       The same scan runs again on every push to main
  -> Release      Tests, smoke test, Trivy gate, SBOM, provenance, signature, attestation
  -> Promotion    Every image in the target environment is rescanned; CVE table in the release notes
  -> Admission    Kyverno verifies signature, hardening attestation and registry
  -> Runtime      Trivy Operator rescans running images daily; Grafana dashboards
  -> Response     A new CVE is patched with a hardened release within one hour
```

Each step catches what the one before it cannot. A pull request scan shows a
reviewer what a change brings in. The release gate stops a vulnerable image
from being published. Admission control stops an image that skipped the gate
from running. Runtime scanning finds CVEs that were published after the image
shipped.

## The controls

| Step | What we do | Guide |
| --- | --- | --- |
| Build | Small, non-root, digest-pinned images without shells, package managers or credentials. | [Image hardening](/guides/security/image-hardening) |
| Pull request and commit | Trivy scans the image built from every pull request and every push to `main`. Some repositories run the full release gate on each pull request. | [Pull request and commit scans](/guides/security/pull-request-scans) |
| Release | Tests with the race detector and `govulncheck`, a non-root smoke test, a blocking Trivy gate, a rescan of the published digest, a keyless signature and a hardening attestation. | [Hardened releases and signing](/guides/security/release-signing) |
| SBOM | Trivy and BuildKit generate SPDX SBOMs; the release fails when the SBOM and the installed packages disagree. | [SBOMs](/guides/security/sbom) |
| Release notes | Each GitHub release states its hardening status; each promotion pull request carries a Trivy CVE table for every image. | [CVE results in release notes](/guides/security/release-notes) |
| Runtime | Trivy Operator rescans every running image at least once a day, plus secrets, workload configuration, RBAC and CIS compliance. | [CVE scanning](/guides/security/vulnerability-scanning) |
| Admission | Kyverno reports or rejects our images that are unsigned, not from a hardened release, or pulled from another registry. | [Kyverno policies](/guides/security/kyverno-policies) |
| Response | One-hour target from a known, fixable CVE to a patched hardened release. | [Patching CVEs](/guides/security/cve-response) |

## Why several layers

- **Shift left, but don't stop there.** Scanning a pull request is cheap and
  fast, but a CVE published tomorrow is not in today's scan. That is why the
  same images are rescanned at promotion and every day in production.
- **Gate where it counts.** Pull request scans inform; the release gate
  blocks. A finding never reaches a version tag, and production only runs
  images that passed that gate.
- **Prove it, don't assume it.** The signature, the hardening attestation and
  the SBOM travel with the image. Anyone with access can verify them with
  `cosign`, and Kyverno does so for every Pod.
- **One place to change.** The scanning, signing and attestation logic lives
  in one shared release workflow. A fix to a check applies to every
  repository at once.

## Where the configuration lives

| Control | Repository | Location |
| --- | --- | --- |
| Release scanning, SBOM, signing and attestation | `uug-ai/workflows` | `.github/workflows/release-create.yml` |
| Pull request and commit image scan | `uug-ai/workflows` and each component | `.github/workflows/security-scan.yml` |
| Promotion CVE table | `uug-ai/gitops` | `.github/workflows/promote.yaml`, `.github/scripts/scan_release_images.py` |
| Hub image policies | `kerberos-io/helm-charts` | `charts/hub/templates/kyverno/` |
| Kyverno, Policy Reporter, Trivy Operator, Grafana | `uug-ai/gitops` | `environments/production-bijlokehof/` and `environments/production/trivy/` |

These descriptions were checked against the repositories on
**18 November 2026**. Links to the repositories require authorized GitHub
access.
