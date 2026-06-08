---
title: GitHub
toc: true
type: docs
---

These rules apply to **every new repository** created under the
[`uug-ai`](https://github.com/uug-ai) organisation. They keep the monorepo and
the satellite repositories predictable, so anyone can guess where a service
lives, what it is called and how it is laid out without reading the code first.

## Repository naming

Repository names are **lower-case kebab-case** — words separated by single
hyphens, no spaces, no underscores, no camelCase.

```text
✅ hub-api
✅ hub-cleanup
✅ factory-frontend
❌ HubApi
❌ hub_api
❌ hubCleanup
```

Names are built from a **product prefix** followed by an increasingly specific
scope. Reuse an existing prefix instead of inventing a synonym.

| Prefix     | Belongs to                  | Examples                                     |
| ---------- | --------------------------- | -------------------------------------------- |
| `hub-`     | Anything in the Hub product | `hub-api`, `hub-frontend`, `hub-cleanup`     |
| `factory-` | The Factory product         | `factory-api`, `factory-frontend`            |
| _(none)_   | Shared building blocks      | `models`, `queue`, `trace`, `vault`, `agent` |

{{< callout type="info" >}}
The `hub-pipeline-*` prefix (e.g. `hub-pipeline-workflow`) is **legacy**. It is
kept for the existing analysis-worker repositories but should **not** be used
for new repositories — pick a prefix from the table above that reflects the
product the repo belongs to.
{{< /callout >}}

Guidelines:

- **One responsibility per name.** A repository does one thing and nothing else.
  If the name needs an "and", split it.
- **Prefer nouns**, singular for a service (`queue`), plural only when the repo
  *is* a collection (`models`).
- **No version numbers, dates or personal names** in the repository name. Use
  tags and branches for versioning.
- **Match the directory name in the monorepo.** A repository’s name and its
  folder under the monorepo root must be identical.

## Repository structure

Every repository ships a predictable set of top-level files so tooling and
newcomers always know where to look.

### Required files

| File                | Purpose                                                         |
| ------------------- | -------------------------------------------------------------- |
| `README.md`         | What the repo is, how to run it locally, how to test it.       |
| `LICENSE`           | The licence for the repository.                                |
| `.gitignore`        | Language-appropriate ignores; never commit build output.       |
| `Dockerfile`        | Required for any deployable service.                           |
| `.github/`          | Workflows, issue/PR templates and `CODEOWNERS`.                |

Go services additionally carry a `go.mod` (and, where part of the workspace, a
`go.work`); frontends carry a `package.json`.

### Directory layout

Keep the root shallow and group code by intent rather than by type. The exact
folders depend on the language guide ([Go](../go/), [Angular](../angular/),
[React](../react/), [Python](../python/)), but the spirit is the same:

```text
my-service/
├── README.md
├── Dockerfile
├── .github/
│   └── workflows/
├── cmd/            # entrypoints (Go) — or src/ for frontends
├── internal/       # private packages, not importable by other repos
├── pkg/            # reusable packages meant to be imported
└── models/         # data contracts, if the service owns any
```

Rules:

- **`internal/` is private.** Anything other repositories should import lives in
  `pkg/`; everything else goes in `internal/`.
- **No deep nesting for its own sake.** If a folder holds a single file, it
  probably does not need to exist.
- **Tests live next to the code** they cover (`*_test.go`, `*.spec.ts`), not in
  a separate top-level tree, unless the framework dictates otherwise.
- **Generated and vendored code is clearly marked** and excluded from review
  (`_vendor/`, `public/`, build artefacts).

## Branch and tag naming

- Default branch is **`main`**.
- Work happens on **short-lived, kebab-case branches** prefixed by intent:
  `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.

  ```text
  ✅ feat/detection-ingest
  ✅ fix/thumbnail-timeout
  ❌ my-changes
  ❌ JohnsBranch
  ```

- Releases are **annotated tags** following [SemVer](https://semver.org/),
  prefixed with `v`: `v1.4.0`.

## Quick checklist for a new repo

1. Name is lower-case kebab-case with the right product prefix.
2. The monorepo folder name matches the repository name exactly.
3. `README.md`, `LICENSE`, `.gitignore` and `.github/` are present.
4. A `Dockerfile` exists for anything deployable.
5. Shared code is in `pkg/`, private code in `internal/`.
6. Default branch is `main`; `CODEOWNERS` is set.
