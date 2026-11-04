---
title: Development workspace
description: Develop across UUG repositories without confusing local checkouts with released dependencies.
weight: 10
toc: true
type: docs
---

The monorepo brings separate component repositories into one VS Code workspace.
For example, a Hub API change can be developed alongside the shared `models`,
`database`, `queue`, and `trace` libraries and the Angular Hub frontend.
The repositories still have independent branches, histories, and releases.

Use the [Dev Container setup guide](/guides/onboarding/dev-containers) for
installation, prerequisites, and first-start troubleshooting.

## Understand the checkout before changing it

Three files explain the development environment:

| File in `uug-ai/monorepo` | Purpose |
| --- | --- |
| `.gitmodules` | Declares component paths, remotes, and tracked branches. A declaration alone does not prove a gitlink commit pin exists. |
| `.devcontainer/post-create.sh` | Initializes or clones repositories, installs selected dependencies, builds model TypeScript bindings, and regenerates the Go workspace. |
| `.vscode/tasks.json` | Defines working directories and commands for running individual services and combined stacks. |

There is an important difference between a pinned submodule checkout and this
container's bootstrap behavior. The bootstrap first attempts
`git submodule update --init --remote --recursive`, falls back to recorded commits
if fetching fails, and can directly clone entries without gitlinks. It is
convenient for active development, but **not a guarantee that every checkout
matches one reproducible platform snapshot**.

From your own monorepo checkout, inspect the repositories involved:

```bash
git status --short
git submodule status
git -C hub-api status --short --branch
git -C models status --short --branch
git -C hub-frontend status --short --branch
```

`git submodule status` covers registered submodules; inspect directly cloned
repositories separately. Keep work on the intended component branch, not just
the meta-repository branch.

## Local Go changes versus released dependencies

The bootstrap discovers Go modules in selected component directories and
generates a root `go.work`. This allows the API to use a local `models` checkout
while you are changing both, without committing local `replace` directives.
It does not publish that library or update its consumers' released dependencies.

**Recommended cross-repository change sequence:**

1. Change and check the shared library in its own repository.
2. Exercise its consumers with the local workspace enabled.
3. If models changed, regenerate and check their TypeScript bindings using the
   model repository's documented commands.
4. Release the shared dependency and update the consuming repositories.
5. Check each consumer against its declared dependencies as well as the local
   workspace before releasing it.

For a Go consumer, disabling workspace resolution can expose an accidentally
unreleased dependency. Run this from the component's module directory:

```bash
# Example: monorepo/hub-api/api
GOWORK=off go test ./...
```

Tests may require that component's documented tools and test configuration.
A local workspace passing does not prove an isolated release build will pass.

## Use tasks as executable entry points

Open `hub.code-workspace` and use **Tasks: Run Task**. Verified task names include:

| Task | Use |
| --- | --- |
| `stack: start frontend + api` | Start the Hub frontend and API together. |
| `api: run` | Run the Hub API from its module directory. |
| `learn: serve` | Preview the learning site. |
| `helm: lint` | Run the configured Helm chart lint task. |
| `helm: template (hub)` | Inspect a rendered Hub chart locally. |

Read a task's command and environment before running it: service-specific tasks
can load local environment files or use different Go workspace settings.
Prefer the checked-in task over a command copied from an older setup note.

## Keep local secrets local

On container start, `fetch-secrets.sh` uses a forwarded `DOPPLER_TOKEN` to
download configured development secrets into component-local `.env.local` files.
It writes through a temporary file, restricts successful outputs to mode `600`,
and warns rather than fetching when the CLI or token is unavailable.
A failed download leaves an existing output file untouched, so it may be stale.

This is a **development** mechanism. It does not demonstrate how every cluster
gets runtime secrets. Never paste the token, environment files, or kubeconfig
into a pull request, screenshot, support log, or this learning site.

## Update deliberately

`pull.sh` updates the parent and then merges configured remote submodule
branches. It can change many working copies and recorded submodule positions.
The `monorepo: switch to main and pull` task invokes a different script,
`main.sh`, which the monorepo README explicitly warns discards local changes.
Do not use it as routine synchronization while you have work to preserve.

**Recommended:** inspect and commit or otherwise safely preserve component work
before workspace-wide updates. Review changed gitlinks separately from source
changes. A workspace refresh is not a deployment; deployment changes belong in
[GitOps](/guides/platform-engineering/gitops).

## Sources

See the pinned [workspace evidence](/guides/platform-engineering/sources#development-workspace)
for the bootstrap, task, and secret-fetch implementations.
