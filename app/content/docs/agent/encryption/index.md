---
title: "Encryption"
description: "End-to-end encryption to keep your recordings secure."
lead: "End-to-end encryption to keep your recordings secure."
date: 2023-04-09T21:45:00+00:00
lastmod: 2023-04-09T21:45:00+00:00
draft: true
images: []
menu:
  agent:
    parent: "agent"
weight: 204
toc: true
---

Agent main goal is to make recordings and store them somewhere so you can access them. Next to "just" storing them, storing them securely is even more important, due to these we have integrated different levels of security in the Kerberos.io stack.

![Encryption diagram](./encryption.svg)

## Encryption from Agent to Vault {#encryption-from-agent-to-kerberos-vault}

![Encryption Agent to Vault](./encryption-agent-vault.svg)

## Decryption from Vault to Hub {#decryption-from-kerberos-vault-to-kerberos-hub}

![Encryption Vault to Hub](./encryption-vault-hub.svg)

## Encryption from Agent to Hub {#encryption-from-agent-to-kerberos-hub}

![Encryption Agent to Hub](./encryption-agent-hub.svg)
