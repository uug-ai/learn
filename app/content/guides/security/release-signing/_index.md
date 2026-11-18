---
title: Hardened releases and signing
description: What the shared release workflow checks, scans, signs and attests before a release tag points at an image.
weight: 20
toc: true
type: docs
---

Every component releases through the shared reusable workflow
`uug-ai/workflows/.github/workflows/release-create.yml`. A component's own
`release-bump.yml` calls it with a few inputs; the security behaviour lives in
one place, so a fix to a check applies to every repository at once.

```yaml
release:
  uses: uug-ai/workflows/.github/workflows/release-create.yml@main
  permissions:
    contents: write
    packages: write
    id-token: write   # needed for keyless signing
  with:
    hardened: ${{ inputs.hardened }}
    sign: true
    hardened_profile: api   # worker, frontend, api, standalone or mongo-task
```

## Two kinds of release

| Release | Inputs | What it gets | Release status |
| --- | --- | --- | --- |
| Hardened | `hardened: true` | All checks below, SBOM, provenance, signature and a hardening attestation. | Verified (security checks, SBOM, provenance and signing) |
| Standard, signed | `hardened: false`, `sign: true` | A multi-platform build and a keyless signature. No scan gate, no attestation. | Signed (standard build, not hardened) |
| Standard | `hardened: false`, `sign: false` | A multi-platform build only. | Not verified (standard build) |

The status is written into the GitHub release, so you can see at a glance
what a tag went through.

{{< callout type="warning" >}}
Production enforces the hardening policy (see
[Kyverno policies](/guides/security/kyverno-policies)). A standard release
deploys to staging but is **rejected in production**, and Argo CD keeps
retrying the old version. Release with `hardened: true` whenever the version
will be promoted to production.
{{< /callout >}}

## What a hardened release checks

The jobs run in this order. Any failure stops the release before a version
tag points at the image.

1. **Source scan** (`hardened-source`). Trivy scans the repository for
   secrets and misconfiguration (`scanners: secret,misconfig`) and fails on
   high or critical findings.
2. **Tests and reachability** (`hardened-images`, per architecture). The
   Dockerfile's `test` stage runs the native tests with the race detector and
   `govulncheck`.
3. **Image contract.** The final image must run as `65532:65532`, match the
   expected entrypoint and working directory for its profile, and must not
   contain a shell, `curl`, `wget`, a package manager, a compiler, or a setuid
   or setgid file. The runtime user must be able to read its own files.
4. **Smoke test.** Worker images start with a read-only root filesystem,
   `--cap-drop ALL` and `no-new-privileges` against real MongoDB and RabbitMQ
   services, and must expose metrics and consume their queue. Frontend and API
   images have their own smoke tests.
5. **Vulnerability and secret gate.** Trivy scans the final image with
   `scanners: vuln,secret`, all severities and `ignore-unfixed: false`. The
   release fails on **any medium, high or critical vulnerability, including
   ones without a fix, or any secret**. There is no `.trivyignore`. Frontend
   images also scan the browser dependency inventory extracted from the image.
6. **SBOM.** Trivy generates an SPDX SBOM. When the image has an Alpine/Wolfi
   package database, the installed packages must exactly match both the
   scanner's package list and the SBOM, so a package the scanner missed fails
   the release.
7. **Publish with provenance.** The image is pushed per architecture to a
   staging tag with BuildKit SBOM and `provenance: mode=max`.
8. **Rescan the published digest.** Trivy scans the image again by its
   immutable digest in GHCR and applies the same gate. This proves that the
   bytes in the registry are the bytes that were checked.
9. **Sign and attest** (`hardened-manifest`). The multi-platform manifest is
   signed and a hardening attestation is attached (see below). Both are
   verified straight away.
10. **Promote tags.** Only now do the version tags point at the verified
    digest. The workflow then finalizes the GitHub release and opens the
    staging GitOps pull request.

Scan reports, the SBOM, the digest and the signature and attestation
verification output are uploaded as workflow artifacts and kept as release
evidence.

## Keyless signing with Cosign

We sign with [Sigstore Cosign](https://docs.sigstore.dev/) in keyless mode.
There is no signing key to store or rotate: GitHub Actions issues an OIDC
token, Sigstore's Fulcio turns it into a short-lived certificate, and the
signature is recorded in the public Rekor transparency log.

The certificate identifies **the shared workflow**, not the component, because
`release-create.yml` does the signing for every repository:

| Certificate field | Value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject | `https://github.com/uug-ai/workflows/.github/workflows/release-create.yml@<ref>` |
| GitHub workflow repository | The component, for example `uug-ai/hub-api` |

Always verify the **repository claim** as well as the subject. Checking only
the subject accepts an image signed for any UUG.AI repository, so a signed
`hub-vlm` image would pass as `hub-api`.

Verify a release yourself:

```shell
IMAGE=ghcr.io/uug-ai/hub-api:v1.11.43

cosign verify \
  --certificate-identity-regexp '^https://github\.com/uug-ai/workflows/\.github/workflows/release-create\.yml@(refs/\S+|[0-9a-f]{40})$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-github-workflow-repository uug-ai/hub-api \
  "$IMAGE"
```

## The hardening attestation

A signature says *who built* an image. The hardening attestation says *which
checks it passed*. It is an in-toto attestation, signed with the same keyless
identity, of type
`https://github.com/uug-ai/workflows/attestations/image-hardening/v1`:

```json
{
  "result": "passed",
  "repository": "uug-ai/hub-api",
  "tag": "v1.11.43",
  "profile": "api",
  "run": "https://github.com/uug-ai/hub-api/actions/runs/<run>/attempts/<n>",
  "platforms": { "amd64": "sha256:…", "arm64": "sha256:…" },
  "checks": [
    "source-secret-and-misconfiguration-scan",
    "native-tests-race-and-govulncheck",
    "non-root-runtime-contract",
    "read-only-no-capability-smoke-test",
    "image-vulnerability-and-secret-gate",
    "sbom-package-inventory-match",
    "published-digest-rescan"
  ]
}
```

Only a hardened release that passed every check gets one. Kyverno checks it at
admission, including that `repository` matches the image.

```shell
cosign verify-attestation \
  --type https://github.com/uug-ai/workflows/attestations/image-hardening/v1 \
  --certificate-identity-regexp '^https://github\.com/uug-ai/workflows/\.github/workflows/release-create\.yml@(refs/\S+|[0-9a-f]{40})$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-github-workflow-repository uug-ai/hub-api \
  "$IMAGE" | jq -r '.payload | @base64d | fromjson | .predicate'
```

## Pull request scans

`uug-ai/workflows/.github/workflows/security-scan.yml` builds the image on
every pull request and prints a Trivy table of all severities. It is
**informational** (`exit-code: "0"`): it shows a reviewer what a change brings
in, but it does not block the merge. The release gate above is where findings
block.

## When the gate fails

- **A vulnerable Go module.** Upgrade it, even when `govulncheck` says the
  code is not reachable. The image gate scans the binary's module list and
  does not know about reachability.
- **A vulnerable OS package.** Bump the digest-pinned base image. CI caches
  layers, so an `apk upgrade` layer can stay stale until the `FROM` digest
  changes.
- **No fix available.** The gate counts unfixed vulnerabilities too. Remove
  the package, switch base image, or wait for the fix; there is no ignore
  file to fall back on.
- **A transient registry error** in the manifest or signing job (GHCR
  sometimes returns stale reads). Check that the digest exists, then rerun the
  failed jobs. To retry a release without moving its tag, run the component's
  **Bump release** workflow with `existing_tag` set.
