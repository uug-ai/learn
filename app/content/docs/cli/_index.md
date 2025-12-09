---
title: "Cli"
description: ""
lead: ""
date: 2020-10-06T08:49:15+00:00
lastmod: 2020-10-06T08:49:15+00:00
draft: false
images: []
weight: 8

---

# uug-ai/cli

This repository contains CLI tools for performing specific automations.
- [`vault-to-hub-migration`](vault-to-hub-migration): Migrating data from a Vault database to a Hub database.
- [`generate-default-labels`](generate-default-labels): Adding labels to existing users.
- [`check-indexes`](check-indexes): Check for and add missing indexes compared to recommended versions.


## Run

You can run these jobs in your cluster. The benefit is that you do not need to expose anything, and use the internal Kubernetes dns.

```sh
kubectl apply -f jobs/vault-to-hub-migration-job.yaml
```

```sh
kubectl apply -f jobs/generate-default-labels-job.yaml
```

## Installation and contributing

1. Clone the repository:

   ```sh
   git clone https://github.com/uug-ai/cli.git
   cd cli
   ```

2. Install dependencies:

   ```sh
   go mod tidy
   ```

3. Run example. This will execute the `vault-to-hub-migration` action. Please have a look at the various options you can provide for each action.

   ```sh
   go run main.go -action vault-to-hub-migration \
                  ...options
   ```

