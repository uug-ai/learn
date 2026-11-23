---
title: 'No ignore file: how UUG ships video software with zero known CVEs'
description: 'Video recorders and VMS servers are where vulnerabilities go to live. How our release gate, signing, admission policies and runtime scanning keep known CVEs out of UUG, and what to ask any video vendor.'
date: '2026-11-23T20:00:00Z'
lastmod: '2026-11-23T20:00:00Z'
authors:
  - name: Cedric Verstraeten
    link: https://github.com/cedricve
    image: https://github.com/cedricve.png
images: ['social.png']
category: 'Security'
tags: ['Security', 'Supply chain', 'Vulnerability management']
illustration: 'blog-release-gate'
artworkAlt: 'An isometric release line: a build sends container images through GOVULNCHECK, TRIVY and SBOM scanners, with a red alarm on TRIVY, then through a release gate showing 0 CVEs, signing and into production.'
toc: true
---

The camera system is often the oldest computer in a building that is still connected to the network. The recorder in the server cupboard, the Windows machine running the video management software, the viewing client on the security desk: they were installed once, commissioned, and then left alone for as long as they kept recording.

**That is exactly why video surveillance has a vulnerability problem.** Not because its software has more bugs than other software, but because its vulnerabilities live for so long. A flaw is fixed upstream, the vendor publishes an advisory, and the recorder in the cupboard keeps running the old version for another five years.

We decided early that UUG would not work like that. This article explains what the evidence says about legacy video systems, what "zero known CVEs" actually means in our release process, and the questions worth asking of any video vendor, including us.

{{< tutorial-panel tone="brand" icon="shield-check" title="The short version" >}}
- **The industry evidence is consistent.** Network video recorders top Forescout's 2025 list of riskiest IoT devices, and end-of-life recorders and cameras keep appearing in CISA's catalog of actively exploited vulnerabilities, often with no patch coming.
- **Our rule is simple and automated.** A hardened UUG release cannot be published while the image contains any known medium, high or critical vulnerability, fixed or unfixed, or an embedded secret. There is no ignore file.
- **Production enforces it.** Images are signed and carry a signed hardening attestation, and our production cluster rejects Hub images without one.
- **We keep checking after release.** Every running image is rescanned at least daily against a fresh vulnerability database, because a clean release can become vulnerable tomorrow.
{{< /tutorial-panel >}}

## What the evidence says about legacy video systems

### Recorders and cameras top the risk rankings

Forescout's [Riskiest Devices of 2025](https://www.forescout.com/research-labs/the-riskiest-devices-of-2025/) research ranks the **network video recorder (NVR) as the riskiest IoT device type**, with IP cameras in fourth place. NVRs first entered Forescout's list in [2024](https://www.forescout.com/press-releases/what-devices-pose-the-highest-security-risk-forescout-answers-in-new-research-the-riskiest-connected-devices-in-2024/), described as devices that are commonly exposed online and have vulnerabilities exploited by botnets and advanced threat actors.

VulnCheck's [2026 network edge device report](https://www.vulncheck.com/blog/network-edge-device-report-2026) shows why age matters so much. Of the network edge device vulnerabilities exploited in 2025, **42.5 percent affected devices that were end of life or likely end of life**. For vulnerabilities exploited by botnets, the share was **65 percent**. Attackers go where patches no longer arrive.

### End of life, still recording, actively exploited

CISA's [Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) lists flaws with evidence of real-world exploitation. Video equipment is a regular entry:

| Device | Vulnerability | What happened |
|---|---|---|
| Digiever DS-2105 Pro NVR | CVE-2023-52163, command injection | Added to the catalog in December 2025. The issue affects only end-of-life products, so [no official fix is available](https://securityaffairs.com/186021/security/u-s-cisa-adds-a-flaw-in-digiever-ds-2105-pro-to-its-known-exploited-vulnerabilities-catalog.html). |
| D-Link DNR-322L NVR and DCS-2530L / DCS-2670L cameras | CVE-2022-40799, CVE-2020-25078, CVE-2020-25079 | [Added in August 2025](https://securityaffairs.com/180833/security/u-s-cisa-adds-d-link-cameras-and-network-video-recorder-flaws-to-its-known-exploited-vulnerabilities-catalog.html), years after the flaws were first published. |
| Hikvision cameras and recorders | CVE-2021-36260, CVSS 9.8 | Fixed in September 2021. In August 2022, researchers still found [more than 80,000 unpatched devices out of 285,000](https://www.securityweek.com/over-80000-unpatched-hikvision-cameras-exposed-takeover/) exposed on the internet. |
| Hikvision cameras and DVRs | Older Hikvision flaw, likely CVE-2017-7921 | In September 2025, the SANS Internet Storm Center saw [new exploit attempts in its honeypots](https://isc.sans.edu/diary/Exploit+Attempts+Against+Older+Hikvision+Camera+Vulnerability/32316/), eight years after the flaw was disclosed. |

The pattern is the same each time. A fix exists, or the product is past the point where one will be made, and the device keeps running.

### It is not only low-cost recorders

It would be easy to conclude that this is a problem of cheap, unbranded hardware. It is not. Professional video management software installed on Windows servers carries its own dependency tree: operating system, database, web server, runtimes, codecs and bundled third-party tools. Each one is a source of CVEs.

- Bosch's product security advisories (now published by [Keenfinity](https://www.keenfinity-group.com/us/en/support/product-security/security-advisories.html)) include **"Multiple OpenSSL vulnerabilities in BVMS"**, rated CVSS 9.8 and published in March 2024, affecting BVMS, BVMS Viewer and several DIVAR IP appliances. The same list includes BVMS being affected by **Autodesk Design Review** vulnerabilities from 2021, published in March 2024.
- Axis lists [CVE-2025-30023](https://help.axis.com/security-advisories), rated **9.0 (Critical)**, which could allow an authenticated user to execute code remotely on AXIS Camera Station. It is fixed in AXIS Camera Station Pro 6.9 and AXIS Camera Station 5.58.

To be clear: **publishing these advisories is good practice**, and these vendors did the right thing by disclosing and fixing. Every serious software product has vulnerabilities. The question is what happens next.

## Why vulnerabilities stick in legacy architectures

A fixed version on a vendor's download page does not protect anyone. The risk lives in the gap between "a fix exists" and "every recording server and appliance runs it". Traditional video architectures make that gap wide:

- **Updating is a project.** Upgrading a recording server can mean a maintenance window, a site visit and a period without recording. So it gets postponed.
- **Appliances outlive their support.** A recorder that still records looks healthy. Its end-of-support date is in a contract, not on a dashboard.
- **Large installs, large surface.** The more software a product bundles, the more upstream advisories apply to it, and the more often it needs updating.
- **No inventory.** Without a software bill of materials, it is hard to answer the most basic question when a new CVE is published: *are we affected?*
- **Scanners that report, but never block.** A vulnerability report that does not stop a release, an installation or a deployment is information, not a control.

We cannot fix the installed base of the industry. We can make sure our own platform does not add to it.

## What "zero known CVEs" means for us

"Zero CVEs" is an easy phrase to misuse, so here is our precise definition:

> When a hardened UUG release is published, a Trivy scan of the final image finds **no known vulnerability of medium, high or critical severity**, including vulnerabilities that do not have a fix yet, and **no embedded secret**. The release cannot be published otherwise.

What it does **not** mean is equally important:

- It does not mean our code has no bugs. A scanner finds *known* vulnerabilities in *dependencies*; it cannot find a mistake we have not discovered yet in our own code.
- It does not mean an image stays clean forever. New CVEs are published every day against software that was clean yesterday. That is why we keep scanning after release.

Everything below is how that definition is enforced, rather than promised.

{{< rete height="600" alt="The UUG container supply chain: a change is built and checked by the shared release workflow, the verified image is signed and attested in the registry, Kyverno checks the attestation at admission, and Trivy Operator rescans running images." caption="Four layers of control from source code to the running cluster. A failure at the release gate stops the version tag from ever pointing at the image; a missing attestation stops production from admitting it." >}}
{
  "groups": [
    { "id": "ci", "label": "Release: shared GitHub workflow", "x": 0, "y": 0, "w": 620, "h": 220 },
    { "id": "cluster", "label": "Production cluster", "x": 0, "y": 300, "w": 960, "h": 220 }
  ],
  "nodes": [
    { "id": "change", "kind": "default", "x": 30, "y": 70, "w": 220, "h": 110, "header": "BUILD", "title": "Hardened image", "subtitle": "Minimal and non-root" },
    { "id": "gate", "kind": "pipeline", "x": 370, "y": 70, "w": 220, "h": 110, "header": "RELEASE GATE", "title": "Tests and Trivy", "subtitle": "Medium+ or secret fails" },
    { "id": "registry", "kind": "storage", "x": 710, "y": 70, "w": 220, "h": 110, "header": "REGISTRY", "title": "Signed image", "subtitle": "SBOM and attestation" },
    { "id": "kyverno", "kind": "factory", "x": 710, "y": 370, "w": 220, "h": 110, "header": "ADMISSION", "title": "Kyverno", "subtitle": "Checks the attestation" },
    { "id": "running", "kind": "hub", "x": 370, "y": 370, "w": 220, "h": 110, "header": "RUNTIME", "title": "Running services", "subtitle": "Hub, Vault, Factory" },
    { "id": "operator", "kind": "pipeline-monitor", "x": 30, "y": 370, "w": 220, "h": 110, "header": "CONTINUOUS", "title": "Trivy Operator", "subtitle": "Rescans at least daily" }
  ],
  "connections": [
    { "from": "change", "to": "gate", "label": "build" },
    { "from": "gate", "to": "registry", "label": "pass" },
    { "from": "registry", "to": "kyverno", "label": "pull" },
    { "from": "kyverno", "to": "running", "label": "admit" },
    { "from": "operator", "to": "running", "kind": "dashed", "label": "scan" }
  ]
}
{{< /rete >}}

## Layer 1: ship nothing worth exploiting

The cheapest vulnerability to fix is the one in a package you never shipped. Our [image hardening baseline](/guides/security/image-hardening) starts there:

- **Empty or distroless runtimes.** Go services compile to a static binary and run on `scratch`: no operating system, no shell, no package manager, no libc. Where a service needs shared libraries, we use a minimal distroless base instead.
- **Nothing for convenience.** No `curl`, `wget`, compiler or shell in the final image, not even to implement a health check.
- **A fixed, unprivileged identity.** Every image runs as the numeric user `65532:65532`, without capabilities or setuid files, on a port above 1024.
- **Pinned and reviewed bases.** Every base image is pinned to its SHA-256 digest, next to a readable tag. Pinning prevents surprises; it does not deliver security updates, so pinned digests are reviewed and bumped deliberately.

A typical legacy video server bundles an operating system, a database, a web server and a set of runtimes. A typical UUG backend image contains one binary, CA certificates and nothing else. There is very little left for a vulnerability scanner to find.

## Layer 2: a release gate with no ignore file

Every component releases through one shared, reusable workflow. When a release is marked as hardened, the workflow runs these checks in order. **Any failure stops the release before a version tag points at the image.**

1. Scan the source repository for secrets and misconfiguration.
2. Run the tests with the Go race detector and [`govulncheck`](https://go.dev/doc/security/vuln/).
3. Check the image contract: non-root user, expected entrypoint, and no shell, package manager, compiler or setuid file.
4. Smoke-test the image with a read-only root filesystem, all capabilities dropped and privilege escalation disabled.
5. **Scan the final image with Trivy across all severities, including unfixed vulnerabilities.** Any medium, high or critical finding, or any secret, fails the release.
6. Generate an SPDX software bill of materials, and check that it matches the packages actually installed.
7. Publish the image with build provenance.
8. **Scan the published image again, by its immutable digest,** so the bytes in the registry are proven to be the bytes that were checked.
9. Sign the image and attach a signed hardening attestation.
10. Only then point the version tags at the verified digest.

The gate itself is a single, unforgiving expression. It counts every medium, high or critical vulnerability and every secret in the scan reports, and the release continues only when that count is zero:

```shell
jq -se '[.[].Results[]? | ((.Vulnerabilities[]?
  | select(.Severity == "MEDIUM" or .Severity == "HIGH" or .Severity == "CRITICAL")),
  .Secrets[]?)] | length == 0' image-security.json browser-security.json
```

There is **no `.trivyignore` file** and no exception list. If a vulnerability has no fix yet, the gate still counts it. The answer is to remove the package, change the base image, or wait for a fix, not to suppress the finding. We also upgrade a vulnerable Go module even when `govulncheck` reports that the vulnerable code is not reachable, because the image gate does not take reachability into account, and neither does an auditor.

### What a blocked release looks like

On 22 November 2026, the release of Factory **v2.0.14** reached the image gate, and the gate returned `false`. The image contained known vulnerabilities of medium or higher severity in its Go toolchain and dependencies. The release stopped, and no version tag ever pointed at that image; v2.0.14 remains an unpublished draft.

The fix upgraded Go to 1.26.11 and bumped two Go modules. Less than half an hour after the block, Factory **v2.0.15** passed every check and was published. That is what we want the gate to do: make the vulnerable version impossible to ship, and the fixed version quick to ship.

Each hardened GitHub release states what it went through, for example:

> **Image hardening: Verified (security checks, SBOM, provenance and signing)**

The scan reports, SBOM, digest and verification output are kept as release evidence. The full workflow is described in [Hardened releases and signing](/guides/security/release-signing).

## Layer 3: sign it, attest it, and let the cluster refuse

A clean scan is only useful if nothing else can take the scanned image's place. Every hardened image is signed with [Sigstore Cosign](https://docs.sigstore.dev/) in keyless mode: there is no long-lived signing key to steal or rotate, and every signature is recorded in the public Rekor transparency log.

Next to the signature, the image carries a signed **hardening attestation**: a statement that names the repository, the version, the per-architecture digests and the checks the image passed. Only an image that passed every check receives one.

You can verify any release yourself:

```shell
IMAGE=ghcr.io/uug-ai/hub-api:v1.11.84

cosign verify-attestation \
  --type https://github.com/uug-ai/workflows/attestations/image-hardening/v1 \
  --certificate-identity-regexp '^https://github\.com/uug-ai/workflows/\.github/workflows/release-create\.yml@(refs/\S+|[0-9a-f]{40})$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-github-workflow-repository uug-ai/hub-api \
  "$IMAGE" | jq -r '.payload | @base64d | fromjson | .predicate'
```

In our production cluster, [Kyverno](https://kyverno.io/) checks that attestation before a Pod is admitted. For Hub production, the hardening policy is set to **Enforce** for 22 of its 23 images: an image without a passing attestation for its own repository is rejected, and the previous version keeps running. The remaining image, the GPU-based object tracking service, is still in Audit mode while its release is brought onto the signed pipeline. The details are in [Kyverno policies](/guides/security/kyverno-policies).

This is the difference between a policy and a control. A standard, unhardened build can be deployed to staging for testing, but it cannot reach Hub production.

## Layer 4: keep scanning what is actually running

A release that was clean on the day it shipped can become vulnerable the day after, when a new CVE is published against one of its components. So the scan does not end at the release.

[Trivy Operator](https://aquasecurity.github.io/trivy-operator/) runs in our production cluster and scans every workload image in every namespace. Each report expires after 24 hours, so **every running image is rescanned at least daily against a fresh vulnerability database**, including low-severity and unfixed findings. The results are exposed as metrics and shown on a Grafana vulnerability dashboard, per namespace, image and CVE. Every promotion pull request also [lists the CVE counts](/guides/security/release-notes) of each image it deploys, so a reviewer sees them before the merge.

When a new finding appears in one of our images, the response follows the same path as any change: upgrade the module or bump the pinned base image, then cut a hardened release. Our target is a **patched, hardened and signed release within one hour** of learning about a fixable CVE; the steps are in [Patching CVEs](/guides/security/cve-response). Because the release gate fails while the CVE is still present, **a green release is proof that the fix worked**.

The cluster scan also keeps us honest about what we do not build ourselves. On 18 November 2026, it reported several hundred critical findings across the cluster, and none of them were in UUG images. They belong to third-party components such as ingress, storage and monitoring charts, which we update through GitOps rather than patching their images. Building our own images to a zero-CVE standard is the part we control completely; the rest of the stack is a continuing job.

## Zero known CVEs is not zero vulnerabilities

A dependency scanner cannot find a vulnerability in code we wrote ourselves. That requires security review, outside researchers and responsible disclosure, and then the same fast release path.

In November 2026, we fixed and published a set of [security advisories for the open-source Agent](https://github.com/kerberos-io/agent/security/advisories), including a hard-coded default token signing key and endpoints that did not require authentication. The fixes shipped in Agent v3.14.4 to v3.14.6. We would rather publish an advisory with a fixed release than leave a known issue in an installed base, which is precisely the problem this article describes.

Our hosted and self-hosted customers also keep their own responsibilities: runtime policies, network segmentation, secrets and access control. The difference we can make is that **updating UUG is a new image tag, not a site visit**. A fix that takes half an hour to release should not take five years to arrive.

## Questions to ask any video vendor

Whether you are evaluating UUG or any other platform, these questions separate a security process from a security statement:

{{< tutorial-panel tone="neutral" icon="clipboard-check" title="Your vendor checklist" >}}
- Can you provide a **software bill of materials** for each release?
- Which vulnerability severities **block a release**, and are vulnerabilities without a fix allowed through?
- Is there an **ignore or exception list**, and who approves entries in it?
- Are releases **signed**, and can I verify the signature and what checks the build passed?
- How long does it typically take from an **upstream fix to your release**, and from your release to my **sites actually running it**?
- What is the **end-of-support date** of the appliance, operating system and database you ship?
- Do you **publish security advisories**, and where?
{{< /tutorial-panel >}}

If the answers are vague, the vulnerabilities probably are not.

## Sources

External sources, retrieved on 23 November 2026:

- Forescout, [The Riskiest Devices of 2025](https://www.forescout.com/research-labs/the-riskiest-devices-of-2025/) and [Riskiest Connected Devices in 2024](https://www.forescout.com/press-releases/what-devices-pose-the-highest-security-risk-forescout-answers-in-new-research-the-riskiest-connected-devices-in-2024/).
- VulnCheck, [2026 State of Exploitation: Exploiting the Network Edge](https://www.vulncheck.com/blog/network-edge-device-report-2026).
- CISA, [Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog).
- Security Affairs, [CISA adds a flaw in Digiever DS-2105 Pro to its KEV catalog](https://securityaffairs.com/186021/security/u-s-cisa-adds-a-flaw-in-digiever-ds-2105-pro-to-its-known-exploited-vulnerabilities-catalog.html) and [CISA adds D-Link cameras and NVR flaws to its KEV catalog](https://securityaffairs.com/180833/security/u-s-cisa-adds-d-link-cameras-and-network-video-recorder-flaws-to-its-known-exploited-vulnerabilities-catalog.html).
- SecurityWeek, [Over 80,000 unpatched Hikvision cameras exposed to takeover](https://www.securityweek.com/over-80000-unpatched-hikvision-cameras-exposed-takeover/).
- SANS Internet Storm Center, [Exploit attempts against older Hikvision camera vulnerability](https://isc.sans.edu/diary/Exploit+Attempts+Against+Older+Hikvision+Camera+Vulnerability/32316/).
- Keenfinity (formerly Bosch Security Systems), [Security advisories](https://www.keenfinity-group.com/us/en/support/product-security/security-advisories.html).
- Axis Communications, [Security advisories](https://help.axis.com/security-advisories).

Our own process is documented in the [Security guides](/guides/security). The release workflow, admission policies and cluster scanning described here were checked against our repositories and production cluster on 18 November 2026, and the Factory release example against its workflow run on 22 November 2026.
