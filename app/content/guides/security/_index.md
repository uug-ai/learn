---
title: Security
description: How we build, release, admit and watch container images, from the Dockerfile to the running cluster.
toc: true
type: docs
---

Security guidance for building, delivering, and operating the products with
secure defaults and a minimal attack surface.

Our container supply chain has four layers of control. Each layer catches what
the one before it cannot:

```text
Build        Dockerfile follows the hardening baseline
  -> Release   CI tests, scans with Trivy, generates an SBOM, signs and attests
  -> Admission Kyverno checks signature and hardening attestation per image
  -> Runtime   Trivy Operator rescans running images; dashboards show the result
```

| Layer | What it guarantees | Guide |
| --- | --- | --- |
| Build | Small, non-root, digest-pinned images without shells or credentials. | [Image hardening](/guides/security/image-hardening) |
| Release | A hardened release has no known medium, high or critical vulnerability or secret when it is published, and carries a keyless signature and a signed hardening attestation. | [Hardened releases and signing](/guides/security/release-signing) |
| Runtime scanning | Every image running in the cluster is rescanned against the latest vulnerability database, so a CVE published after release still shows up. | [CVE scanning](/guides/security/vulnerability-scanning) |
| Admission | The cluster reports or rejects UUG.AI images that are unsigned, not from a hardened release, or pulled from another registry. | [Kyverno policies](/guides/security/kyverno-policies) |

## Where the configuration lives

| Control | Repository | Location |
| --- | --- | --- |
| Release scanning, signing and attestation | `uug-ai/workflows` | `.github/workflows/release-create.yml` |
| Pull request image scan | `uug-ai/workflows` | `.github/workflows/security-scan.yml` |
| Hub image policies | `kerberos-io/helm-charts` | `charts/hub/templates/kyverno/` |
| Kyverno, Policy Reporter, Trivy Operator, Grafana | `uug-ai/gitops` | `environments/production-bijlokehof/` and `environments/production/trivy/` |

These descriptions were checked against the repositories and the production
cluster on **18 November 2026**. Links to the repositories require authorized
GitHub access.
