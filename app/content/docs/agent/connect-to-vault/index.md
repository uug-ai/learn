---
title: "Connect to Vault"
description: "Upload an Agent's recordings to Kerberos Vault, on the storage you choose."
lead: "Upload an Agent's recordings to Kerberos Vault, on the storage you choose."
date: 2026-10-31T00:00:00+00:00
lastmod: 2026-10-31T00:00:00+00:00
draft: false
images: []
weight: 205
toc: true
connects:
  - page: /docs/vault/accounts
    why: Create the account whose access and secret key the Agent uploads with.
  - page: /docs/vault/providers
    why: Choose where Vault stores the recordings, such as S3, Azure or MinIO.
  - page: /docs/vault/integrations
    why: React to every new recording with Kafka, SQS, RabbitMQ or Hub.
---

By default an Agent keeps its recordings on its own disk. Connect it to [Kerberos Vault](/docs/vault/first-things-first) when you want those recordings stored centrally, on storage you control, and available to other applications. The Agent uploads each recording as soon as it is written; Vault decides where it is stored and who is told about it.

This page covers the Agent side of the connection. The Vault side, an account and a storage provider, is explained in the Vault docs.

## Before you start

You need a running Vault with:

- a [provider](/docs/vault/providers): the bucket or storage system the recordings end up in, and
- an [account](/docs/vault/accounts) linked to that provider. The account gives you the **access key** and **secret key** the Agent uploads with.

You also need the URL of the Vault API, for example `https://vault.example.com/api`. The Agent must be able to reach it.

## Configure the Agent

Open the Agent's web interface and go to **Settings → Persistence**.

1. In the **Persistence** block, select **Kerberos Vault**.
2. Fill in the fields:
   - **Vault API URL**: the address of the Vault API.
   - **Provider**: the provider to send recordings to. Leave it empty to use the provider of the account.
   - **Directory**: the subdirectory the recordings are stored in. Use one directory per Agent or per site. If you also use [Kerberos Hub](#using-vault-together-with-hub), this must match the Hub username.
   - **Access key** and **Secret key**: the keys of the Vault account.
3. Select **Verify Connection**. The Agent checks the keys against Vault and, when a provider or directory is set, uploads a short test recording to it.
4. Save the settings.

New recordings are uploaded from then on. By default the Agent removes each recording from its own disk once it is uploaded successfully, so its disk only acts as a buffer. Turn off **Enable delete on upload** if you want to keep a local copy as well.

### Optional settings

- **Custom upload headers**: a JSON object such as `{"site_id":"site-1","line_id":"line-2"}`. The Agent sends these as headers with every upload, and Vault adds them to the `metadata` of its [integration messages](/docs/vault/integrations), so your consumers know where a recording came from.
- **Max retries** and **Timeout**: how persistent the Agent is when an upload fails.
- **Secondary Persistence**: a second Vault the Agent uploads to when the primary one is unavailable or times out. Useful for failover.

## Configure with environment variables

For automated deployments, set the same values as environment variables instead of using the web interface:

| Variable | Setting |
| --- | --- |
| `AGENT_CLOUD` | `kstorage` selects Kerberos Vault. |
| `AGENT_KERBEROSVAULT_URI` | Vault API URL |
| `AGENT_KERBEROSVAULT_ACCESS_KEY` | Access key |
| `AGENT_KERBEROSVAULT_SECRET_KEY` | Secret key |
| `AGENT_KERBEROSVAULT_PROVIDER` | Provider (optional) |
| `AGENT_KERBEROSVAULT_DIRECTORY` | Directory |
| `AGENT_KERBEROSVAULT_CUSTOM_HEADERS` | Custom upload headers (JSON on one line) |
| `AGENT_KERBEROSVAULT_MAX_RETRIES`, `AGENT_KERBEROSVAULT_TIMEOUT` | Retry behaviour |
| `AGENT_KERBEROSVAULT_SECONDARY_*` | The same settings for the secondary Vault, except max retries and timeout |
| `AGENT_REMOVE_AFTER_UPLOAD` | Remove recordings after a successful upload (`true` by default) |

```bash
docker run -p 80:80 --name mycamera \
  -e AGENT_CLOUD=kstorage \
  -e AGENT_KERBEROSVAULT_URI=https://vault.example.com/api \
  -e AGENT_KERBEROSVAULT_ACCESS_KEY=xxx \
  -e AGENT_KERBEROSVAULT_SECRET_KEY=xxx \
  -e AGENT_KERBEROSVAULT_DIRECTORY=agent1 \
  -d --restart=always kerberos/agent:latest
```

The [Agent repository](https://github.com/kerberos-io/agent#configure-with-environment-variables) lists every variable. If you manage many Agents on Kubernetes, [Factory](/docs/factory/getting-started) sets these values for you.

## Using Vault together with Hub

Self-hosted [Kerberos Hub](/docs/hub/first-things-first) reads recordings from your Vault. Two things connect the three products:

- The Agent's **Directory** must equal the Hub username of the account the recordings belong to. Otherwise Hub can't match the recordings to that account. See [Kerberos Hub username](/docs/vault/integrations#kerberos-hub-username).
- Vault needs the [Kerberos Hub integration](/docs/vault/integrations#kerberos-hub), so every new recording is sent on to the [Hub pipeline](/docs/hub/pipeline).

The Agent also connects to Hub directly, for status, live view and camera control. That is a separate setting, described in [Connect to Hub](/docs/agent/connect-to-hub).

## Troubleshooting

- **Verify Connection fails.** Check that the URL ends with the API path (usually `/api`) and that the Agent can reach it from its network. A wrong access or secret key is rejected by Vault.
- **Uploads succeed but you can't find the recordings.** Look in the provider set on the Agent. If that provider is empty, doesn't exist or is disabled in Vault, Vault uses the provider of the account instead. Recordings are stored under the Agent's directory, unless the account sets a fixed directory (anything other than `*`), which then takes precedence.
- **Recordings reach Vault but not Hub.** Check the directory and the Hub integration as described in [Using Vault together with Hub](#using-vault-together-with-hub).
