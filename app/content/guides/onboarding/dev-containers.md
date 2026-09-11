---
title: Dev containers
description: Use the monorepo's reproducible VS Code development container.
toc: true
---

The monorepo includes a VS Code Dev Container that provides a consistent Linux
environment for the platform repositories. It installs the shared Go, Node.js,
Hugo, Kubernetes, infrastructure, and media-processing tools without requiring
each developer to reproduce that toolchain on the host.

## Prerequisites

Before opening the container, install:

- Docker Desktop or another Docker-compatible engine.
- VS Code.
- The **Dev Containers** VS Code extension.
- GitHub credentials with access to the repositories you need.

The container uses host networking and adds network administration capabilities.
Confirm that those options are permitted by your Docker environment and company
device policy.

## Open the workspace in the container

Clone the monorepo, open it in VS Code, and select **Dev Containers: Reopen in
Container** from the Command Palette:

```bash
git clone --recurse-submodules git@github.com:uug-ai/monorepo.git
cd monorepo
code hub.code-workspace
```

VS Code builds the image from `.devcontainer/Dockerfile` and mounts the
repository at `/workspaces/monorepo`.

## What the container installs

The image is based on the Go 1.25 Dev Container and includes the common platform
toolchain:

- Node.js, npm, Tailwind CSS, and frontend build dependencies.
- FFmpeg development libraries and Graphviz.
- Hugo Extended, pinned to the version supported by the current Go toolchain.
- Helm, kubectl, Terraform, AWS CLI, Azure CLI, and Doppler CLI.
- Shared Go developer tools used by the repositories.

VS Code installs the configured Docker, Kubernetes, MongoDB, ESLint, Prettier,
GitLens, and GitHub extensions inside the container.

## First-start initialization

After the image is created, `.devcontainer/post-create.sh` prepares the
workspace. It:

1. Initializes or clones repositories listed in `.gitmodules`.
2. Installs dependencies for the Hub, Factory, Admin, Design, and Website
	 frontends when those repositories are present.
3. Builds the generated TypeScript bindings in `models`.
4. Discovers local Go modules, regenerates `go.work`, and tidies each module.
5. Tidies the Learn Hugo modules.
6. Verifies optional native Agent support when its verification script exists.

This process can take several minutes and requires network access. A failed step
prints a warning and allows container creation to continue, so review the setup
log before assuming every repository is ready.

You can rerun the initialization after correcting a transient failure:

```bash
bash .devcontainer/post-create.sh
```

## Local secrets

On every container start, `.devcontainer/fetch-secrets.sh` can download approved
development secrets into repository-local `.env.local` files. It requires a
Doppler service-account token in the host environment:

```bash
export DOPPLER_TOKEN=your-service-account-token
```

Set the token on the host before rebuilding or reopening the container. The
container forwards it as an environment variable; do not add it to source files,
shell history, or committed workspace settings.

When no token is available, secret fetching is skipped. Create the required
local environment files manually from each repository's documented examples.

## Run and debug services

Open `hub.code-workspace` inside the container to use the shared tasks. Common
forwarded ports include:

| Port | Service |
| --- | --- |
| `4200` | Hub frontend |
| `8081` | Hub API |
| `1313` | Learn documentation |
| `8080` | Agent |

Run **stack: start frontend + api** to start the core Hub application, or choose
one of the repository-specific tasks for Factory, Vault, Learn, Agent, Helm, or
workflow workers.

## Rebuild and update

Rebuild the container after changing `.devcontainer/Dockerfile`,
`devcontainer.json`, or image-level tools. Dependency or source changes usually
need only the appropriate install command or workspace task.

Repository branches remain independent inside the container. Check `git status`
in the repository you are editing before running workspace-wide update tasks.

## Troubleshooting

- **A private repository fails to clone.** Confirm that the host SSH agent is
	forwarded and can authenticate to GitHub.
- **Container creation succeeds with warnings.** Review the post-create log and
	rerun `.devcontainer/post-create.sh` after network access is restored.
- **Secrets were not written.** Confirm that `DOPPLER_TOKEN` was exported on the
	host before the container started, then reopen the container.
- **A service cannot reach a host dependency.** The container uses host
	networking; verify the dependency is listening on the expected interface and
	port.
- **The toolchain changed but commands still use old versions.** Run **Dev
	Containers: Rebuild Container** so the image-level tools are recreated.