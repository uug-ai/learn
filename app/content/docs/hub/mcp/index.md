---
title: "MCP server"
description: "Connect AI assistants to Hub recordings and devices with a scoped access token over Streamable HTTP."
lead: "Give your assistant read-only access to the Hub resources you choose."
date: 2026-11-09T00:00:00+00:00
lastmod: 2026-11-09T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 306
toc: true
---

Hub's **Model Context Protocol (MCP)** server lets compatible AI assistants discover devices, search recording metadata, and request temporary links to selected recording assets. It runs inside the Hub API and uses the same organisation, project, and resource permissions as Hub.

The server is **read-only**: it cannot change camera configuration, delete recordings, or create workflows. To connect it to Claude, follow [Connect Hub MCP to Claude Code](/tutorials/hub/connect-mcp-to-claude/).

## Connection details

| Setting | Value |
| --- | --- |
| Endpoint | Your Hub **API** base URL followed by `/mcp`, for example `https://api.hub.example.com/mcp` |
| Transport | Streamable HTTP (`http` in Claude Code), not legacy SSE |
| Authentication | `Authorization: Bearer <HUB_ACCESS_TOKEN>` on every request |
| Accept header | `application/json; version=2026-01-01, text/event-stream` |
| Access | Read-only, limited by token permissions and current resource grants |

Use the API address, which may differ from the Hub web application's address. The `2026-01-01` value pins the **Hub API contract**; it is not an MCP protocol revision. Let your client negotiate the MCP protocol version separately.

## Enable the server

For a self-hosted deployment, set this environment variable on the **Hub API** service and roll out the updated configuration:

```text
MCP_ENABLED=true
```

MCP is disabled by default; `/mcp` is not registered until enabled. Expose that path through your API's existing HTTPS ingress or reverse proxy. Preserve the `Authorization`, `Accept`, `Content-Type`, and MCP transport headers, and do not cache its responses.

If a browser-based client sends an `Origin` from another site, an administrator must explicitly allow that exact origin:

```text
MCP_ALLOWED_ORIGINS=https://assistant.example.com
```

Multiple origins are comma-separated; wildcards are not accepted. This setting does not widen REST API CORS or enable cookie authentication. A CLI client that sends no `Origin` does not need an origin entry.

The transport is stateless and returns JSON. It does not expose a persistent GET/SSE stream or DELETE-based sessions; those requests return `405`. A browser visit to `/mcp` is therefore not a connection test.

## Create an access token

Use a **dedicated Hub access token**, not an Agent key, browser session JWT, or storage credential.

1. Sign in to Hub and select the intended organisation and project.
2. Open **Profile > Access tokens** (`/profile?tab=access-tokens`). If this section is unavailable to your account, ask an owner to provision the integration.
3. Select **Generate access token**.
4. In **Details**, give it a recognisable name, such as `Claude MCP`, and a description.
5. In **Expiry**, choose a short lifetime appropriate for the integration.
6. In **Permissions**, assign only the read permissions you need:
   - `media.read` for recordings and recording asset links.
   - `devices.read` for device discovery and details.
7. Select **Generate**, copy the token from the success dialog, and store it privately.

You do not need the broad `application` permission or any write permission. Token scopes do not grant access beyond the issuing identity's current resource permissions. Tokens stay bound to their organisation and project; changing a prompt cannot switch them to another tenant.

## Send the authorization header

Every MCP request must include:

```http
Authorization: Bearer <HUB_ACCESS_TOKEN>
Accept: application/json; version=2026-01-01, text/event-stream
Content-Type: application/json
```

Replace `<HUB_ACCESS_TOKEN>` with the raw token. Hub's copy control may already include `Bearer `: include that prefix **exactly once**. For a client with a separate bearer-token field, enter only the raw token.

Query-string tokens and cookies are not accepted. Hub checks the signature, expiry, persisted token binding, revocation, and effective resource access on each request. OAuth discovery and authorization-code sign-in are not implemented for this endpoint: use a client that can supply a custom authorization header.

Keep tokens out of source control, shared MCP configurations, chat messages, screenshots, and logs. Prefer your client's secret input or an environment-variable reference instead of embedding a credential.

## Available tools

Tool discovery only exposes tools for which both token scope and current resource grants allow access.

| Tool | Purpose | Token permission |
| --- | --- | --- |
| `devices_list` | Discover accessible devices with filters and pagination. | `devices.read` |
| `devices_get` | Read one device's metadata by its returned `id`. | `devices.read` |
| `recordings_filter` | Search recording metadata with filters and pagination. | `media.read` |
| `recordings_get` | Read one recording's metadata by its returned `id`. | `media.read` |
| `recordings_get_urls` | Request temporary video, thumbnail, or sprite URLs for selected recordings. | `media.read` |

Search and get tools return metadata, not media URLs, camera credentials, private addresses, or full device configuration. Recording time ranges use Unix **seconds**; recording durations and device heartbeat timestamps use **milliseconds**. Device filters use device keys, while `devices_get` takes the returned MongoDB `id`.

Pages default to 25 results and support up to 100. Follow `nextCursor` while `hasMore` is true rather than assuming the first page is the complete result.

### Request recording assets only when needed

First use `recordings_filter` to select recordings. Then request only the required assets:

```json
{
  "mediaIds": ["<recording-id-from-search>"],
  "assets": ["video", "thumbnail"]
}
```

`recordings_get_urls` accepts 1-96 recording IDs. Its result includes `recordings` and `unavailableIds`; a recording can also report `unavailableAssets`. Missing and inaccessible IDs are intentionally indistinguishable. A metadata-only recording may have no video available.

Signed URLs grant temporary access to anyone who possesses them. Request them only for selected recordings, do not log or persist their signatures, and follow the returned `expiresAt` when present. A `null` expiry means the storage provider did not expose one, not that the link never expires. Revoking the Hub token prevents new requests but does not invalidate already-issued storage URLs. Inline video playback depends on the client.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `404` on `/mcp` | Confirm `MCP_ENABLED=true` on the deployed API and that the ingress routes `/mcp` to that API, not the frontend. |
| `401 Unauthorized` | Use a bound Hub access token, include `Bearer ` exactly once, and check expiry, rotation, or revocation. Browser login tokens do not work. |
| `403` with an origin error | Allow the client's exact browser origin in `MCP_ALLOWED_ORIGINS`. Do not add a wildcard. |
| Missing tools or denied calls | Check both `media.read` / `devices.read` token scopes and the issuing identity's current project and device grants. |
| No matching recordings | Confirm the token's organisation/project, device coverage, filter, and time units. An empty page is not proof that the whole deployment has no recordings. |
| `405 Method Not Allowed` | Use Streamable HTTP POST requests, not a browser GET or legacy SSE transport. |
| `406 Not Acceptable` | Ensure `Accept` includes both `application/json` and `text/event-stream`. |
| `429 Too Many Requests` | Honor `Retry-After`. Per API process, each token allows 60 requests per minute and four concurrent requests; initialization and discovery count too. |
| `RESPONSE_TOO_LARGE` | Reduce the page limit or narrow the filter. |
| Client requests OAuth sign-in | Configure the bearer header instead. Hub MCP does not advertise OAuth grant endpoints. |

Use bounded searches: requests have a 20-second deadline, a 64 KiB body limit, and a 128 KiB structured-result limit. Review your organisation's AI data policy before sending recording metadata or asset links to an assistant, and treat returned labels and descriptions as data, not instructions.

## Next steps

- [Connect Hub MCP to Claude Code](/tutorials/hub/connect-mcp-to-claude/) for a complete client setup and first queries.
- [Organisations and projects](/docs/hub/organisations/) for resource boundaries.
- [Recordings](/docs/hub/recordings/) for reviewing footage in Hub.
