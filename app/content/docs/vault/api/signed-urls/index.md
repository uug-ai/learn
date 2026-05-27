---
title: "REST API"
description: "How to call the Vault REST API to obtain signed URLs for media, thumbnails, sprites and other generated assets."
lead: ""
date: 2026-05-26T00:00:00+00:00
lastmod: 2026-05-26T00:00:00+00:00
draft: false
images: []
menu:
  vault:
    parent: "vault"
weight: 312
toc: true
---

Vault exposes a REST API that lets you obtain temporary, time-limited URLs ("signed URLs") for every asset it stores: the original recording (`.mp4`), the thumbnail (`_thumbnail.jpg`), the sprite (`_sprite.jpg`), the redacted version, exports, and any other generated file.

This page documents the endpoints you need to call, the authentication model, and gives ready-to-use examples.

## Authentication

All `/api/storage/*` endpoints described below are **not** behind JWT. They authenticate per-request using **account credentials** that you provision in the Vault admin UI (see [Accounts](/vault/accounts/)).

Two HTTP headers are always required:

| Header | Description |
|---|---|
| `X-Kerberos-Storage-AccessKey` | The access key of the Vault account. |
| `X-Kerberos-Storage-SecretAccessKey` | The matching secret. |

The account also has a **default provider** assigned to it; you can override it per request via `X-Kerberos-Storage-Provider` (single-file endpoints) or via the JSON body (bulk endpoint).

> **Warning:** Treat the access key + secret pair as a long-lived credential.
> Do not embed them in frontend code or share them with end-users. The
> signed URLs the API returns are the only artefacts that are safe to hand
> out, and only for the duration of their expiry.

## How asset filenames are derived

When the Hub pipeline processes a recording, every generated asset is stored on the same provider, in the same `username/` directory, using a deterministic filename derived from the original recording. For a recording named:

```
account-a/1776427171_1-1_frontdoor_402-263-805-680_801_29960.mp4
```

the pipeline generates:

| Asset | Filename |
|---|---|
| Recording | `account-a/1776427171_..._29960.mp4` |
| Thumbnail | `account-a/1776427171_..._29960_thumbnail.jpg` |
| Sprite | `account-a/1776427171_..._29960_sprite.jpg` |
| Redacted recording | `account-a/1776427171_..._29960_redacted.mp4` |

To obtain a signed URL for any of them, you call the same endpoint and just pass the corresponding filename.

## 1. Single file — `GET /api/storage`

Returns a signed URL for one file.

**Request headers**

| Header | Required | Description |
|---|---|---|
| `X-Kerberos-Storage-FileName` | yes | Object key, e.g. `account-a/1776427171_..._29960.mp4` |
| `X-Kerberos-Storage-Provider` | yes | Provider name the file lives on (must match the account's provider) |
| `X-Kerberos-Storage-AccessKey` | yes | Account access key |
| `X-Kerberos-Storage-SecretAccessKey` | yes | Account secret |

**Response**

```json
{
  "data": "https://<provider-host>/...<signed-query-string>..."
}
```

**Example** — fetch a signed URL for a thumbnail:

```http
GET http://localhost:8085/api/storage HTTP/1.1
X-Kerberos-Storage-FileName: account-a/1776427171_1-1_frontdoor_402-263-805-680_801_29960_thumbnail.jpg
X-Kerberos-Storage-Provider: primary-provider
X-Kerberos-Storage-AccessKey: <vault-access-key>
X-Kerberos-Storage-SecretAccessKey: <vault-secret-access-key>
```

```bash
curl -s "http://localhost:8085/api/storage" \
  -H "X-Kerberos-Storage-FileName: account-a/1776427171_..._29960_thumbnail.jpg" \
  -H "X-Kerberos-Storage-Provider: primary-provider" \
  -H "X-Kerberos-Storage-AccessKey: $VAULT_ACCESS_KEY" \
  -H "X-Kerberos-Storage-SecretAccessKey: $VAULT_SECRET"
```

## 2. Bulk — `POST /api/storage/bulk`

Returns signed URLs for any number of files in a single round-trip. This is the most efficient way to fetch **all signed URLs for a given media** (recording + thumbnail + sprite + redacted + …).

**Request headers**

| Header | Required |
|---|---|
| `X-Kerberos-Storage-AccessKey` | yes |
| `X-Kerberos-Storage-SecretAccessKey` | yes |
| `Content-Type: application/json` | yes |

**Request body**

An array of `MediaUrlRequest`:

```json
[
  {
    "filename": "account-a/1776427171_..._29960.mp4",
    "provider": "primary-provider",
    "uriExpiryTime": "24h"
  },
  {
    "filename": "account-a/1776427171_..._29960_thumbnail.jpg",
    "provider": "primary-provider",
    "uriExpiryTime": "24h"
  },
  {
    "filename": "account-a/1776427171_..._29960_sprite.jpg",
    "provider": "primary-provider",
    "uriExpiryTime": "24h"
  }
]
```

| Field | Required | Description |
|---|---|---|
| `filename` | yes | Object key in the provider. |
| `provider` | no | Provider name. Defaults to the account's default provider. |
| `uriExpiryTime` | no | TTL of the signed URL. Accepts Go duration strings (`30m`, `1h`, `24h`) or an integer number of seconds. Defaults to `DEFAULT_URI_EXPIRY_TIME` (86400s / 24h). |

**Response**

A JSON map of `filename → signed URL`, embedded in the standard envelope as a string:

```json
{
  "data": "{\"account-a/...mp4\":\"https://...\",\"account-a/..._thumbnail.jpg\":\"https://...\"}"
}
```

> **Note:** `data` is a JSON-encoded string, not a nested object. Parse it
> twice: first the envelope, then `data`.

**Example** — get every generated link for a single media in one call:

```bash
curl -s -X POST "http://localhost:8085/api/storage/bulk" \
  -H "X-Kerberos-Storage-AccessKey: $VAULT_ACCESS_KEY" \
  -H "X-Kerberos-Storage-SecretAccessKey: $VAULT_SECRET" \
  -H "Content-Type: application/json" \
  -d '[
    {"filename":"account-a/1776427171_..._29960.mp4",            "provider":"primary-provider","uriExpiryTime":"24h"},
    {"filename":"account-a/1776427171_..._29960_thumbnail.jpg",  "provider":"primary-provider","uriExpiryTime":"24h"},
    {"filename":"account-a/1776427171_..._29960_sprite.jpg",     "provider":"primary-provider","uriExpiryTime":"24h"},
    {"filename":"account-a/1776427171_..._29960_redacted.mp4",   "provider":"primary-provider","uriExpiryTime":"24h"}
  ]' | jq -r '.data | fromjson'
```

A complete `.http` reference is shipped with the repository at [`vault/examples/get_signed_urls.http`](https://github.com/uug-ai/vault/blob/main/examples/get_signed_urls.http).

## 3. Two signing modes

The shape of the URLs returned by the endpoints above is controlled by the `VAULT_SIGNING` environment variable on the Vault deployment:

| `VAULT_SIGNING` | Returned URL points to | Notes |
|---|---|---|
| `false` *(default)* | Native provider presigned URL (S3/MinIO presign, GCS V4 signed URL, Azure SAS) | The client downloads directly from the storage backend. Lowest Vault load. |
| `true` | A `…/api/storage/signed?...` URL served by Vault itself | Vault streams the object after validating an HMAC. Use when the storage backend is not reachable from clients. |

In both cases your integration code is identical — you call `GET /api/storage` or `POST /api/storage/bulk` and use whatever URL comes back. The next section is only relevant when `VAULT_SIGNING=true`.

### Vault-signed URLs (`VAULT_SIGNING=true`)

In this mode the returned URL has the form:

```
{VAULT_PUBLIC_URL}/api/storage/signed
    ?a={account}
    &p={provider}
    &f={url-encoded filename}
    &e={expiry unix seconds}
    &s={HMAC token}
```

These public endpoints exist on every Vault instance:

| Endpoint | Purpose |
|---|---|
| `GET  /api/storage/signed` | Streams the object body. |
| `HEAD /api/storage/signed` | Validates the signature without streaming bytes. Useful for preflight / link-checking. |
| `GET  /api/storage/signed/validate` | Returns a JSON document describing whether the signature is valid and when it expires. |

The HMAC is computed with the secret in `VAULT_URL_SIGNING_KEY` and covers the account, provider, filename and expiry — so the URL cannot be tampered with and stops working after `e`.

**Example**

```http
GET http://localhost:8085/api/storage/signed
  ?a=account-a
    &e=1777032108
  &f=account-a%2F1776427171_..._29960.mp4
  &p=primary-provider
  &s=<hmac-signature>
```

## End-to-end: list every signed URL for a media

The recommended pattern when you need *all* assets for a recording (player + scrubber thumbnails + share link to the redacted version, etc.):

1. Start from the recording filename you already have, e.g. from a Hub pipeline event payload (`payload.key`).
2. Derive the asset filenames using the suffix convention (`_thumbnail.jpg`, `_sprite.jpg`, `_redacted.mp4`, …).
3. Call `POST /api/storage/bulk` once with the full list.
4. Use the URLs from the response directly — no further auth needed for the lifetime of `uriExpiryTime`.

```bash
MEDIA="account-a/1776427171_1-1_frontdoor_402-263-805-680_801_29960.mp4"
BASE="${MEDIA%.mp4}"

curl -s -X POST "$VAULT_URL/api/storage/bulk" \
  -H "X-Kerberos-Storage-AccessKey: $VAULT_ACCESS_KEY" \
  -H "X-Kerberos-Storage-SecretAccessKey: $VAULT_SECRET" \
  -H "Content-Type: application/json" \
  -d "[
    {\"filename\":\"${MEDIA}\",                  \"uriExpiryTime\":\"1h\"},
    {\"filename\":\"${BASE}_thumbnail.jpg\",     \"uriExpiryTime\":\"1h\"},
    {\"filename\":\"${BASE}_sprite.jpg\",        \"uriExpiryTime\":\"1h\"},
    {\"filename\":\"${BASE}_redacted.mp4\",      \"uriExpiryTime\":\"1h\"}
  ]" | jq -r '.data | fromjson'
```

## Status codes

| Code | Meaning |
|---|---|
| `200` | URL(s) returned successfully. |
| `400` | A required header / body field is missing or malformed. |
| `401` | Account credentials are invalid, or the account is not bound to the requested provider. |
| `5xx` | Vault could not reach the configured storage provider — check the Vault logs. |
