---
title: Dev machine
description: Prepare a local workstation for developing the Augment Vision platform.
toc: true
---

Use a local development environment when you want direct access to the host's
Docker daemon, browsers, editors, and command-line tools. The monorepo combines
the platform repositories in one VS Code workspace while each repository keeps
its own dependencies and configuration.

For a preconfigured Linux toolchain, use the
[Dev container]({{< ref "/guides/onboarding/dev-containers" >}}) instead.

## Prerequisites

Install the following tools before cloning the workspace:

- Git with access to the private `uug-ai` repositories.
- Go 1.25 or later.
- A current Node.js LTS release and npm.
- VS Code, recommended for the bundled workspace and tasks.
- Docker, when the service you are developing needs local infrastructure or a
	container build.

Configure GitHub authentication before cloning. SSH access is the most reliable
option when the workspace must fetch private repositories and Go modules.

## Clone the workspace

Clone the monorepo and initialize its child repositories:

```bash
git clone --recurse-submodules git@github.com:uug-ai/monorepo.git
cd monorepo
```

If you cloned without child repositories, initialize them afterward:

```bash
git submodule update --init --recursive
```

Open `hub.code-workspace` rather than only the root folder. The multi-root
workspace exposes each repository separately and loads the shared VS Code tasks.

```bash
code hub.code-workspace
```

## Install dependencies

Synchronize the Go workspace and install the frontend dependencies needed for
the area you plan to work on:

```bash
go work sync

cd hub-frontend/kerberos.ng
npm install --legacy-peer-deps
```

Other applications keep their own package manifests. Run `npm install` from the
relevant application directory, for example `factory/frontend`, `admin`,
`design`, or `website`.

Consult the repository README before building a component. Some repositories
require native libraries, a specific Node.js version, or `GOWORK=off` when they
must be tested against published dependencies instead of local workspace modules.

## Configure services

Configuration belongs to the repository that consumes it. Common local files
include:

- `hub-api/api/.env.local` for the Hub API.
- `agent/machinery/.env.local` for the Agent.
- `.env.local` in pipeline and workflow repositories.

Use each repository's example environment file and README as the source of truth.
Never commit credentials or local environment files.

The API and workers also depend on services such as MongoDB and RabbitMQ. Start
the required dependencies using the repository's documented Docker or Kubernetes
setup before running the application.

## Run the Hub stack

From VS Code, open **Tasks: Run Task** and choose
**stack: start frontend + api**. The task starts:

- Hub API at `http://localhost:8081`.
- Hub frontend at `http://localhost:4200`.

The equivalent terminal commands are:

```bash
# Terminal 1
cd hub-api
ENV_FILE=$PWD/api/.env.local go run ./api serve

# Terminal 2
cd hub-frontend/kerberos.ng
npm run start-dev
```

Additional tasks are available for Factory, Vault, Learn, Helm, Agent, and
workflow workers. Their working directory and environment variables are defined
in the workspace task configuration.

## Keep repositories current

The workspace provides two update tasks:

- **monorepo: pull latest** updates the configured repositories.
- **monorepo: switch to main and pull** returns repositories to their primary
	branch before updating them.

Do not run the second task while you have uncommitted work or need to preserve a
feature branch. Check each repository with `git status` first.

## Troubleshooting

- **A repository directory is empty.** Run
	`git submodule update --init --recursive` and confirm your GitHub access.
- **A private Go dependency cannot be downloaded.** Verify SSH authentication
	and configure `GOPRIVATE` for the `uug-ai` and `kerberos-io` organisations.
- **Frontend installation reports peer dependency conflicts.** Use the
	repository's documented install command; the Hub frontend currently requires
	`npm install --legacy-peer-deps`.
- **The API starts without configuration.** Confirm that
	`hub-api/api/.env.local` exists and that `ENV_FILE` points to it.
- **A port is already in use.** Stop the existing process or adjust the relevant
	task and application configuration before restarting.
