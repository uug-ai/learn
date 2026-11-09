---
title: 'Connect Hub MCP to Claude Code'
description: 'Connect Claude Code to the Hub MCP server using an access token in the Authorization header, then discover devices and search recordings.'
date: '2026-11-09'
weight: 7
toc: true
product: 'Hub'
level: 'Beginner'
duration: '10 min'
tags: ['MCP', 'Claude', 'Access tokens']
illustration: 'hub'
---

{{< tutorial-byline author="Documentation team" github="uug-ai" avatar="/android-chrome-192x192.png" created="Nov 9, 2026" updated="Nov 9, 2026" >}}

{{< tutorial-header alt="Hub connects camera sites, processing services and operators." >}}

Connect **Claude Code** to Hub so you can ask about accessible devices and recordings without copying API responses into a conversation. Claude Code calls Hub's read-only MCP tools over HTTPS using your dedicated access token.

This walkthrough uses Claude Code's terminal client because it supports custom HTTP headers. It is not a Claude.ai **Add connector** or Claude Desktop chat configuration walkthrough. Do not assume another Claude client's connector screen accepts a bearer header; it must support the [Hub MCP connection requirements](/docs/hub/mcp/#connection-details).

{{< tutorial-meta time="~10 min" level="Beginner" stack="Hub / MCP / Claude Code" prerequisites="An enabled Hub MCP endpoint and a scoped Hub access token" >}}

## Before you start

You need:

- [Claude Code installed and signed in](https://code.claude.com/docs/en/quickstart).
- Your Hub **API** URL, reachable over HTTPS from the machine running Claude Code.
- An administrator who has enabled `MCP_ENABLED=true` on that API.
- A dedicated Hub access token with `media.read` and `devices.read`, and access to the intended project and devices. Follow [Create an access token](/docs/hub/mcp/#create-an-access-token).
- Permission under your organisation's policy to send Hub metadata to Claude. Requesting video URLs can also expose footage through temporary links.

The commands below use **Bash** on Linux, macOS, or WSL. Run them in the same terminal in which you will launch Claude Code. Replace `https://api.hub.example.com/mcp` with your actual API endpoint.

## 1. Load your token without saving it in shell history

Prompt for the **raw token**, without the `Bearer ` prefix:

```bash
read -r -s -p "Hub access token (without Bearer): " HUB_ACCESS_TOKEN
printf '\n'
export HUB_ACCESS_TOKEN
```

Pasting into this hidden prompt avoids putting the credential in your command history. If Hub copied `Bearer ` with the token, remove that prefix before pasting. Do not paste the token into Claude's conversation.

The variable is available only to this shell and its child processes. A Claude Code process launched elsewhere, including an already-running editor session, will not automatically receive it. Use your organisation's secret manager for longer-lived setups; do not put the token in a committed file.

## 2. Register the HTTP server

Add Hub as a private user-scoped server:

```bash
claude mcp add --transport http --scope user hub \
  https://api.hub.example.com/mcp \
  --header 'Authorization: Bearer ${HUB_ACCESS_TOKEN}' \
  --header 'Accept: application/json; version=2026-01-01, text/event-stream'
```

Keep the **single quotes** around the authorization header. They prevent Bash from substituting the secret into the registration command; Claude Code resolves the environment-variable reference when it loads the configuration.

`--scope user` makes the server available to your Claude Code projects without writing a shared project configuration. If you want it only for the current project, use `--scope local` instead. Neither scope should contain the actual token.

The equivalent Claude Code server entry is:

```json
{
  "mcpServers": {
    "hub": {
      "type": "http",
      "url": "https://api.hub.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${HUB_ACCESS_TOKEN}",
        "Accept": "application/json; version=2026-01-01, text/event-stream"
      }
    }
  }
}
```

Use either registration method, not both. When editing an existing configuration, merge the entry instead of replacing other servers. Environment-variable interpolation here is a **Claude Code** feature, not part of the MCP protocol or a portable configuration format for every client.

## 3. Verify the connection

From the same terminal:

```bash
claude mcp list
claude
```

In the interactive Claude Code session, open:

```text
/mcp
```

Confirm that `hub` is connected and inspect its available tools. With both read permissions and matching resource grants, you should see:

- `devices_list`
- `devices_get`
- `recordings_filter`
- `recordings_get`
- `recordings_get_urls`

A successful `claude mcp add` only confirms that configuration was saved; **Connected** and a successful tool call verify the integration. If connection fails, use the [troubleshooting table](/docs/hub/mcp/#troubleshooting). Do not attempt OAuth sign-in for Hub: the configured bearer header is the authentication mechanism.

## 4. Discover your devices

Try this prompt:

> Use the Hub MCP tools to list the first 10 devices I can access. Show each device's name, id, and key. Do not request recording URLs or any camera credentials.

Review the tool request before approving it if Claude asks for permission. Claude should call `devices_list` and use the returned data, not invent camera names or IDs.

The tools only expose resources permitted by your token and current grants. For device details, `devices_get` uses the returned `id`; recording device filters use the device `key`.

## 5. Find recordings

Choose a returned device and give Claude a bounded time range:

> Use Hub MCP to find up to 10 recordings for the device key I select, between 08:00 and 09:00 UTC on 9 November 2026. Return their ids, device names, timestamps, and descriptions. Use Unix seconds for the time filter. Do not request asset URLs yet.

Replace that example date and device with a period that contains recordings in your project. Claude should use `recordings_filter`. If you need more results, ask it to follow `nextCursor` while `hasMore` is true; one page is not the full collection.

These are metadata queries. A description or tag is not proof that Claude has viewed the video, and recording content is untrusted data rather than instructions for the assistant.

## 6. Request one selected recording

Select an actual recording ID from the search results:

> For recording id <id-from-the-results> only, use recordings_get_urls to request the video and thumbnail assets. Report which assets are available and their expiry times. Do not fetch links for any other recordings.

Claude should call the tool with an input shaped like:

```json
{
  "mediaIds": ["<id-from-the-results>"],
  "assets": ["video", "thumbnail"]
}
```

Check `unavailableIds` and any `unavailableAssets` instead of assuming every search result has a video. Open a returned link only in an approved environment. Inline playback depends on your client; metadata access does not guarantee Claude can watch the recording.

Temporary URLs are credentials for their assets. Avoid sharing or persisting them, and do not include signed links in logs or support tickets. Revoking the Hub access token does not revoke storage URLs already issued.

## 7. Disconnect or rotate credentials

To remove the user-scoped client configuration:

```bash
claude mcp remove --scope user hub
unset HUB_ACCESS_TOKEN
```

If you registered with `--scope local`, remove from that scope instead. Exit any running Claude Code session that inherited the variable. Removing the server or unsetting the variable does **not** revoke the token: revoke it in **Hub > Profile > Access tokens** when it is no longer needed.

For rotation, create a replacement token with the same minimal read permissions, exit Claude Code, load the replacement into `HUB_ACCESS_TOKEN`, and relaunch from that terminal. Verify a tool call, then revoke the old token. The stored environment-variable reference does not need changing.

## Further reading

- [Hub MCP server](/docs/hub/mcp/) for permissions, transport behaviour, limits, and troubleshooting.
- [Claude Code MCP reference](https://code.claude.com/docs/en/mcp) for HTTP servers, configuration scopes, and environment-variable expansion.
