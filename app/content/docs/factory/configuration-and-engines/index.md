---
podcast: factory-configuration-and-engines
title: "Configuration & engines"
description: "How Factory stores its configuration and how it schedules your Agents."
lead: "How Factory stores its configuration and how it schedules your Agents."
date: 2026-06-22T08:49:31+00:00
lastmod: 2026-06-22T08:49:31+00:00
draft: false
images: []
menu:
  factory:
    parent: "factory"
weight: 303
toc: true
---

Factory is controlled by **two independent axes**. One decides *where
Factory keeps its own configuration*, the other decides *how your Agents
are scheduled and run*. Because they are orthogonal, you can mix and match them:
for example run the Kubernetes engine while keeping your configuration in MongoDB,
or in a ConfigMap, or run a future Docker engine while keeping configuration as a
plain JSON file.

| Axis           | Environment variable    | Values                                          | Default      |
| -------------- | ----------------------- | ----------------------------------------------- | ------------ |
| Config storage | `FACTORY_CONFIGURATION` | `json` · `configmap` · `secret` · `mongodb`     | `json`       |
| Engine         | `FACTORY_ENGINE`        | `kubernetes` · `docker` · `host`                | `kubernetes` |

## Configuration storage (`FACTORY_CONFIGURATION`)

The configuration axis decides where Factory reads and writes its own
**global** and **template** configuration, and how that configuration is delivered
to the Agents it provisions.

- **`json`** — configuration is stored in local JSON files (`config/global.json`
  and `config/template.json`) next to Factory. No MongoDB connection is used.
  This is the lightest-weight option and the typical choice for the (planned)
  Docker and host engines.

- **`configmap`** — Factory still keeps a local JSON copy as the source of
  truth, but every Agent receives its configuration through a Kubernetes
  **ConfigMap** that is mounted as `AGENT_*` environment variables. No MongoDB
  connection is used. This is the recommended option for a clean, Kubernetes-native
  deployment.

- **`secret`** — behaves exactly like `configmap`, but the values are kept in
  Kubernetes **Secrets** instead of ConfigMaps. Use this when your Agent
  configuration contains sensitive settings (storage credentials, Kerberos Hub
  keys, encryption keys, …): the values are stored base64-encoded and can be
  protected with your cluster's Secret access controls (RBAC). No MongoDB
  connection is used.

- **`mongodb`** — Factory and the Agents both use **MongoDB**. This is the
  legacy behaviour: Agents read their configuration from MongoDB at runtime rather
  than from a ConfigMap or Secret.

{{< callout type="info" >}}
Any value other than `mongodb` (`json`, `configmap` or `secret`) runs Factory
in **standalone** mode — no MongoDB connection is required at all.
{{< /callout >}}

### Delivering config to Agents without MongoDB

When you use the `configmap` or `secret` configuration, Factory builds the
Agent configuration into environment variables and injects them straight into the
Agent's pod with `envFrom`. The Agent therefore no longer needs to read MongoDB at
runtime. Two kinds of stores are created:

- A **global** store (`agent-global-config`) and a **template** store
  (`agent-template-config`), bootstrapped on start-up. With `secret`, these are
  named `agent-global-config-secret` and `agent-template-config-secret`. The
  global store carries the settings that every Agent inherits, exposed as
  `GLOBAL_AGENT_*` variables.
- A **per-agent** store (named after the deployment, with a `-config` /
  `-config-secret` suffix) that carries the overrides for a single Agent, exposed as `AGENT_*`
  variables.

The Agent merges the two: it starts from the inherited `GLOBAL_AGENT_*` values and
applies the per-agent `AGENT_*` values on top. When you delete an Agent, its
per-agent ConfigMap/Secret is cleaned up together with its deployment and service.

### `AGENT_CONFIG_SOURCE` — opting in per Agent

You don't have to switch the whole Factory over at once. Even when Factory
itself is still configured for `mongodb` (so the UI keeps listing Agents from the
database), you can set `AGENT_CONFIG_SOURCE=configmap` or
`AGENT_CONFIG_SOURCE=secret` to have newly provisioned Agents receive their
configuration through a Kubernetes store instead of reading it from MongoDB. This
makes it possible to migrate gradually.

## Engine (`FACTORY_ENGINE`)

The engine axis decides how Agents are actually scheduled and run.

- **`kubernetes`** *(implemented)* — Agents are Kubernetes **Deployments**
  (each with a matching **Service**). Configuration is delivered through ConfigMaps
  or Secrets via `envFrom`, and live logs and the in-browser terminal are served
  through the Kubernetes API. This is the default and currently the only fully
  implemented engine.

- **`docker`** *(planned)* — Agents would run as Docker containers on a single
  host, with configuration delivered through env files (`--env-file`) and exec via
  the Docker API.

- **`host`** *(planned)* — Agent binaries would run directly on the host as
  supervised processes, with no container runtime or orchestrator.

{{< callout type="warning" >}}
The `docker` and `host` engines are on the roadmap but are **not implemented yet**.
Today Factory always runs the `kubernetes` engine. The build of the Agent
configuration (the `AGENT_*` / `GLOBAL_AGENT_*` environment variables) is already
engine-agnostic, so it will be reused unchanged by the future engines.
{{< /callout >}}

## Deprecated: `FACTORY_ENVIRONMENT`

Earlier versions of Factory used a single `FACTORY_ENVIRONMENT` variable.
It is **deprecated** and replaced by the two variables above, but it is still
honoured as a fallback when the new variables are not set:

| Legacy `FACTORY_ENVIRONMENT` | → `FACTORY_CONFIGURATION` | → `FACTORY_ENGINE` |
| ---------------------------- | ------------------------- | ------------------ |
| `kubernetes`                 | `mongodb`                 | `kubernetes`       |
| `standalone`                 | `configmap`               | `kubernetes`       |
| `docker`                     | `json`                    | `docker`           |

If you are setting up a new deployment, prefer the explicit `FACTORY_CONFIGURATION`
and `FACTORY_ENGINE` variables over `FACTORY_ENVIRONMENT`.

## Which combination should I use?

| Goal                                                        | `FACTORY_CONFIGURATION` | `FACTORY_ENGINE` |
| ----------------------------------------------------------- | ----------------------- | ---------------- |
| Kubernetes-native, no database, sensitive values protected  | `secret`                | `kubernetes`     |
| Kubernetes-native, no database                              | `configmap`             | `kubernetes`     |
| Keep the classic MongoDB-backed behaviour                   | `mongodb`               | `kubernetes`     |
| Lightweight, file-based config                              | `json`                  | `kubernetes`     |
