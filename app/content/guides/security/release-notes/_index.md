---
title: CVE results in release notes
description: How each release states its hardening status and how every promotion pull request lists the CVE counts of the images it deploys.
weight: 50
toc: true
type: docs
---

Security results belong where decisions are made. We put them in the release
notes at two levels:

| Level | Where | What it shows |
| --- | --- | --- |
| Component release | The GitHub release of the component, for example `uug-ai/hub-api` `v1.11.69` | Which checks this version went through |
| Environment promotion | The GitOps pull request that deploys a set of versions to an environment or customer | The Trivy CVE counts of **every image** in the target environment, scanned when the notes are generated |

## Component releases: the hardening status

The shared release workflow writes one line at the top of every GitHub
release, above the change list:

| Status | Meaning |
| --- | --- |
| **Image hardening: Verified (security checks, SBOM, provenance and signing)** | A hardened release. It passed the Trivy gate (no medium, high or critical CVE and no secret at release), has an SBOM and provenance, and is signed with a hardening attestation. |
| **Image hardening: Signed (standard build, not hardened)** | Signed, but not scanned at release and without an SBOM. Fine for staging; production rejects it. |
| **Image hardening: Not verified (standard build)** | Neither scanned nor signed. |

So a reader of the release, or a reviewer of the staging pull request that
copies these notes, sees straight away whether the version may go to
production. The scan reports and SBOM themselves are in the release
workflow's artifacts; see [SBOMs](/guides/security/sbom).

## Promotions: the Trivy CVE table

A release that was clean on the day it shipped can be affected by a CVE
published since. A promotion often deploys versions released days or weeks
earlier, so the promotion workflow scans again.

When `uug-ai/gitops` promotes an environment with **Generate release notes**
enabled, `promote.yaml`:

1. Collects every image the target environment will run after the promotion,
   from the manifests and Helm values.
2. Updates the Trivy vulnerability database and scans each image.
3. Appends a **Container image security (Trivy)** section to the generated
   release notes in the promotion pull request, after the summary of the
   changes.

The table looks like this (example values):

```markdown
## Container image security (Trivy)

Scan completed at 2026-11-18 15:44 UTC.

| Image | Critical | High | Medium | Low | Unknown |
| --- | ---: | ---: | ---: | ---: | ---: |
| ghcr.io/uug-ai/<component>:<tag> | 0 | 0 | 0 | 0 | 0 |
| <third-party image>:<tag> | 1 | 4 | 12 | 20 | 0 |
| … | | | | | |
```

The counts include CVEs without a fix and count the same CVE separately in
each package it affects. Multi-platform images are scanned for Linux AMD64.
An image that could not be scanned shows **N/A** with a warning: N/A is not
zero. The raw per-image Trivy reports are in the `release-image-security`
artifact of the workflow run.

For a customer promotion, the pull request, and with it the CVE table, opens
in that customer's GitOps repository, so the customer's reviewers see the
same results.

{{< callout type="info" >}}
The promotion table is **informational**, not a gate. Production admission
already requires hardened releases (see
[Kyverno policies](/guides/security/kyverno-policies)). A non-zero count for
one of our images in a promotion means a CVE was published after its release:
[patch it](/guides/security/cve-response) before or right after promoting.
{{< /callout >}}

## Reviewing a promotion

1. Read the change summary, then the **Container image security (Trivy)**
   table.
2. Any non-zero critical, high or medium count for a `ghcr.io/uug-ai` image
   needs a decision: patch first, or promote and patch straight away.
3. Check for **N/A** rows and the warning below the table.
4. For details, download `release-image-security` from the promotion run.

See also [Deployment pull requests](/guides/platform-engineering/environments/pullrequests)
and [Promotion](/guides/platform-engineering/environments/promotion).
