---
title: "MP4 Verification"
description: "Cryptographically verify the authenticity and integrity of recordings produced by Agent."
lead: "Every MP4 produced by Agent is signed with a fingerprint so you can prove it has not been tampered with — useful for auditing, evidence handling, and chain-of-custody workflows."
date: 2026-05-15T00:00:00+00:00
lastmod: 2026-05-15T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 308
toc: true
---

Video evidence is only useful if you can trust that it has not been altered between the moment it was recorded and the moment it is reviewed. Kerberos Hub addresses this with a built-in **fingerprint and signature** mechanism: every fragmented MP4 written by Agent is signed with a private key at the moment it is closed, and the resulting signature is embedded directly inside the file. Anyone with the matching public key can later verify — entirely offline — that the recording is authentic and bit-perfect.

> **Note:** MP4 verification is available for recordings produced by Agent. Recordings produced by other software, or files that have been re-encoded, transcoded, or trimmed by an external tool, will not pass verification because their internal structure no longer matches the signed fingerprint.

## How a recording is fingerprinted

When the agent finalises an MP4 recording (in `machinery/src/video/mp4.go`, see [`mp4.go#L721-L740`](https://github.com/kerberos-io/agent/blob/master/machinery/src/video/mp4.go#L721-L740)), it builds a deterministic fingerprint from a small set of structural fields that uniquely describe the file:

- `Moov.Mvhd.CreationTime` — the moment the file was created (Mac HFS epoch).
- `Moov.Mvhd.Duration` — the total duration of the recording.
- `Moov.Trak.Hdlr.Name` — the handler name, which embeds the agent name and version (e.g. `agent v3.0.0`).
- `len(Moof)` — the number of `moof` (fragment) boxes in the file.
- `size(Moof1) … size(MoofN)` — the size in bytes of every individual fragment.

These values are concatenated into a single underscore-separated string, for example:

```text
3826543210_45000_agent v3.0.0_15_18324_18112_18420_…_18301
```

The agent then:

1. Loads the RSA private key from the agent configuration (`config.Signing.PrivateKey`).
2. Signs the fingerprint string with **RSASSA-PKCS1-v1_5 / SHA-256**.
3. Stores the resulting signature in a custom `uuid` box (UUID `6b0c1f8e-3d2a-4f5b-9c7d-8f1e2b3c4d5e`) inside the `moov` atom of the MP4 file.

The signature travels with the file. There is no separate sidecar file to lose or strip away, and there is no external service to call at verification time.

### Why these fields?

The fingerprint is intentionally derived from **structural** properties rather than the raw video bitstream, for two reasons:

- It is **fast to compute and verify**, even for multi-hour recordings — verification only needs to parse the MP4 box structure, not decode the video.
- Any tampering that matters in practice (cutting, splicing, re-encoding, re-muxing, replacing fragments, or adding/removing frames) **necessarily changes** at least one of these values: a different number of `moof` boxes, a different fragment size, a different total duration, or a different `creationTime`. The signature will no longer match and verification will fail.

Because the agent version is part of the fingerprint, you also get a tamper-evident record of *which* agent produced the file.

## Verifying a recording in Hub

Hub ships with a public verification page that runs entirely in the browser. It does not upload the file to the backend — the parsing, hashing, and signature check all happen client-side using the Web Crypto API.

The page is reachable at **`/verification`** on your Hub deployment. You can also link directly to it with a query parameter that points at a recording URL, in which case the verification runs automatically:

```text
https://<your-hub>/verification?url=https://example.com/path/to/recording.mp4
https://<your-hub>/verification?url=…&autoVerify=false
```

### What the page does

1. **Loads the MP4** either from a local file picker or from a remote URL.
2. **Parses the box structure** to extract `mvhd` (creation time, duration), the `hdlr` name (agent version), and the size of every `moof` box.
3. **Rebuilds the fingerprint string** using the exact same algorithm as the agent.
4. **Reads the embedded signature** from the custom `uuid` box.
5. **Fetches the public key** (`/public_key.pem`) served by Hub and imports it as an `RSASSA-PKCS1-v1_5` verification key.
6. **Verifies the signature** against the locally rebuilt fingerprint.

The result is a clear `valid` or `invalid` status, along with the recovered metadata: agent version, creation time (in both Mac HFS and Unix epochs), duration, fragment sizes, the SHA-256 hash of the fingerprint, the raw signature, and the public key that was used. All of these are visible in the UI so an auditor can attach them to a report.

### What "valid" actually proves

A valid result proves three things at once:

1. **Authenticity** — the recording was produced by an agent that holds the matching private key.
2. **Integrity** — not a single byte that contributes to the fingerprint (creation time, duration, agent identity, fragment count, fragment sizes) has been altered since the file was closed.
3. **Provenance** — the embedded handler name tells you which agent version produced the file.

A failed verification means at least one of those guarantees is broken: the file has been re-encoded, fragments have been added/removed/replaced, the `moov` atom has been rewritten, or the signature was produced with a different key.

## Use cases

Fingerprint verification turns a regular MP4 into a piece of evidence you can defend. Some concrete scenarios where customers rely on it:

### Police, legal, and insurance hand-overs

When footage is exported from Hub and handed over to a third party (police investigation, legal counsel, insurance claim), the receiving party usually needs to demonstrate that what they reviewed is exactly what the camera recorded. By archiving the original MP4 in a [case](../cases/) and providing the verification URL alongside it, the recipient can prove on their own machine — without trusting Hub or the camera owner — that the file is intact.

### Compliance and regulated environments

In regulated industries (banking, critical infrastructure, healthcare, public transport, retail loss prevention) auditors periodically request video evidence of an incident. Running the verification page on a sample of archived recordings gives an auditor a reproducible, cryptographic answer to the question *"can we be sure this footage was not edited?"* — without having to trust the operator of the surveillance system.

### Chain of custody for incidents

When an incident is opened in [Cases](../cases/), the associated recording is copied to a long-term storage provider in Vault. Re-running verification at any point in the case lifecycle (initial triage, legal review, court submission) confirms that the archived copy is byte-identical (in its signed structural fields) to the file the agent originally produced. Each verification can be screenshotted or logged, building an explicit chain of custody.

### Detecting re-encoded or "improved" footage

A common failure mode in video evidence is well-meaning tampering: someone opens the file, trims the boring bits, re-exports it from a video editor, and shares the result. The new file may look identical but its `moof` structure, fragment sizes, and `creationTime` will all differ. Verification will reject it immediately, prompting the reviewer to ask for the original.

### Verifying recordings stored outside Hub

Because the signature is embedded inside the MP4, verification works on any copy of the file, regardless of where it is stored — S3, a USB drive, an email attachment, a SharePoint folder. As long as the verifier has the public key (served from Hub at `/public_key.pem`), they can validate the recording in isolation.

### Deep-fake and synthetic-video defence

As generative video tooling becomes more accessible, the ability to prove that a clip was produced by a specific physical device — and not generated or modified after the fact — becomes a baseline requirement for evidentiary video. The agent-side signing step ties every MP4 to the private key held by the agent, giving you a strong cryptographic anchor against synthetic or substituted footage.

## Operational notes

- **Key management.** The agent signs with a private key configured under `config.Signing.PrivateKey`. Hub serves the matching public key at `/public_key.pem`. Treat the private key as you would any other production secret: rotate it deliberately, and keep historical public keys available so that older recordings can still be verified.
- **No private key, no signature.** If the agent is started without a signing key configured, the MP4 will still be playable but it will not contain the `uuid` signature box. Verification of such a file will report `invalid`.
- **What is *not* covered.** The fingerprint protects the structural identity of the file. It does not encrypt the video content, and it does not protect against an attacker who has access to the agent's private key. Combine MP4 verification with end-to-end encryption and proper key handling for the strongest guarantees.
- **Performance.** Verification is fast — typically a few hundred milliseconds for a multi-minute fragmented MP4 — because only the box structure is parsed, not the video samples themselves.
