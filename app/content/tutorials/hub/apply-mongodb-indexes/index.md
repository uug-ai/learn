---
title: 'Apply MongoDB indexes with the CLI'
description: 'Choose a versioned index set, preview missing MongoDB indexes, apply them safely, and verify the result locally or in Kubernetes.'
date: '2026-11-04'
weight: 6
toc: true
product: 'Hub'
level: 'Intermediate'
duration: '20 min'
tags: ['MongoDB', 'CLI', 'Kubernetes']
header: 'images/tutorial-mongodb-cli.svg'
---

{{< tutorial-byline author="Cedric Verstraeten" github="cedricve" created="Nov 4, 2026" updated="Nov 4, 2026" >}}

{{< tutorial-header alt="MongoDB logo and a CLI terminal side by side on a black background." >}}

MongoDB indexes support the queries that Hub uses to find devices, recordings, markers and other resources. When a release introduces a new query, its supporting indexes may need to be installed before the application rollout.

The [CLI](https://github.com/uug-ai/cli) provides a `check-indexes` action that compares your database with a versioned index specification. The safe operating sequence is **choose a contract, dry-run, review, apply, then dry-run again**.

{{< tutorial-meta time="~20 min, plus index build time" level="Intermediate" stack="MongoDB / CLI / Kubernetes" prerequisites="Database access and CLI" >}}

{{< tutorial-panel tone="brand" icon="check-circle" title="What you'll do" >}}
- Select the index specification required by your deployed release.
- Report missing indexes without changing the database.
- Create only the missing indexes in the reviewed scope.
- Run the same workflow inside Kubernetes without exposing MongoDB.
- Verify the final state instead of relying on the command's exit status.
{{< /tutorial-panel >}}

## Before you start

You need:

- The exact MongoDB connection URI and database name for the intended environment.
- Network access to MongoDB, including its TLS and authentication requirements.
- A database account allowed to list indexes; applying indexes also requires `createIndex` privileges on the target collections.
- A tested CLI checkout or container image that contains the required specification.
- For a local source run, Git, the Go version required by the checkout's `go.mod`, and access to its dependencies.
- For a cluster run, `kubectl` access to the intended namespace and a Secret containing the connection URI.

Test in staging first. For production, confirm backups, available disk space and an appropriate change window. Index builds consume CPU, memory and I/O; duration depends on collection size and database load, not the tutorial's reading time.

This action installs indexes, not a data migration. It does not backfill ownership fields or change how legacy resources belong to an organisation or project. Do not remove legacy-query indexes merely because canonical ownership indexes also exist.

## Understand what the checker changes

| Mode | Behaviour |
|---|---|
| `dry-run` | Lists existing indexes and reports missing definitions. Does not create indexes. |
| `live` | Creates the missing definitions immediately, without a confirmation prompt. |

The checker matches **ordered index keys, uniqueness and the partial filter expression**. An equivalent index under a different name counts as present. Changing compound-key order is not equivalent.

It does **not** drop extra indexes, rename existing indexes or replace conflicting definitions. It is an additive checker, not a complete database-schema reconciler.

{{< callout type="warning" >}}
The current checker compares and applies keys, names for newly created indexes, `unique` and `partialFilterExpression`. It does not preserve every option that can appear in a MongoDB index export, such as `sparse`, `expireAfterSeconds` (TTL) or `collation`. Review the selected definitions before a live run. If a required index depends on an unsupported option, have your database administrator install and verify it through an approved MongoDB procedure instead.
{{< /callout >}}

## Choose the right index version

Browse the [CLI's index specifications](https://github.com/uug-ai/cli/tree/main/indexes), preferably at the tag or commit you will run.

| Specification family | Intended use |
|---|---|
| `hub-*.txt` | A broader Hub index snapshot. Select the baseline documented for your release. |
| `storage-*.txt` | Storage database indexes, not the Hub database. |
| `migration-*.txt` | A focused contract for a particular feature or rollout. Inspect its collections and release instructions. |

The `migration-` prefix does not make `check-indexes` migrate documents. These files can also describe runtime-query indexes that should be applied before deploying a feature.

**The version is a filename stem, not a path.** For example:

```text
-index-version migration-hub-workflow-device-groups-08-10-2026
```

resolves to:

```text
indexes/migration-hub-workflow-device-groups-08-10-2026.txt
```

Do not pass the `indexes/` prefix or `.txt` suffix. The CLI loads the file relative to its working directory. Always specify the version explicitly: the current fallback is the older `hub-08-12-2025`, not automatic discovery of the latest file.

A baseline is not a promise to include every later feature-specific contract. Follow your release instructions for any additional sets. Likewise, do not apply every historical file indiscriminately.

The worked example below installs the focused workflow device-group lookup contract for `groups` and `sites`. Substitute the version and collections required by your deployment.

## Apply indexes from a local checkout

{{% steps %}}

### Prepare the CLI and connection

Clone the repository, then select your tested release tag or commit before continuing:

```bash
git clone https://github.com/uug-ai/cli.git
cd cli
```

Run all following `go run .` commands from this directory so the `indexes/` directory can be found.

In Bash, read the URI without placing its literal value in shell history:

```bash
read -r -s -p 'MongoDB URI: ' MONGODB_URI
printf '\n'

MONGODB_DATABASE='Kerberos'
INDEX_VERSION='migration-hub-workflow-device-groups-08-10-2026'
INDEX_COLLECTIONS='groups,sites'

test -f "indexes/${INDEX_VERSION}.txt"
```

Use your actual database name; `Kerberos` is only an example. Check that the file exists and inspect its definitions before proceeding. A URI can use `mongodb://` or `mongodb+srv://`; include the authentication database and TLS options required by your deployment.

The checker does not automatically read a `MONGODB_URI` environment variable: these examples explicitly pass the shell variable through `-mongodb-uri`. Although this avoids a literal secret in shell history, the expanded URI is still a process argument and may be visible to privileged users. Use a controlled operator environment and never commit credentials.

### Preview the missing indexes

```bash
go run . -action check-indexes \
  -mongodb-uri "$MONGODB_URI" \
  -mongodb-destination-database "$MONGODB_DATABASE" \
  -collections "$INDEX_COLLECTIONS" \
  -index-version "$INDEX_VERSION" \
  -mode dry-run
```

Supplying all flags keeps this non-interactive. To check **all collections listed in the selected file**, explicitly pass `-collections ""`. Omitting `-collections` prompts for input; an empty selection does not mean every collection discovered in MongoDB.

For missing indexes, the report contains a table per collection with **Name**, **Key**, **Unique** and **Partial**, followed by output such as:

```text
[summary] missing_total=4 mode=dry-run
[info] dry-run mode: skipping index creation and prompts.
```

The number depends on what is already installed. Before approving the live run, confirm:

- The connection targets the intended environment and database.
- The version resolves to the expected file.
- Every requested collection is present in that specification.
- The ordered keys, uniqueness and partial filters match the intended rollout.
- There are no `[error]` messages or unexpected collection-skipping warnings.

### Create the reviewed missing indexes

Keep the connection, version and collection selection unchanged. Change only the mode:

```bash
go run . -action check-indexes \
  -mongodb-uri "$MONGODB_URI" \
  -mongodb-destination-database "$MONGODB_DATABASE" \
  -collections "$INDEX_COLLECTIONS" \
  -index-version "$INDEX_VERSION" \
  -mode live
```

Creation is attempted one index at a time. Successful operations print `[ok] created <collection>/<index>`. Existing matching indexes are left alone.

Do not start concurrent copies of the same operation. Monitor MongoDB resource usage and application latency while builds run.

### Verify with a second dry run

Repeat the exact dry-run command from the preview step. After a successful application, expect:

```text
[ok] all canonical indexes present across checked collections.
```

Also inspect the **entire output** for errors and skipped collections. A failed collection lookup can be skipped, and individual creation failures do not necessarily produce a non-zero process exit. Neither a zero exit status nor `[done] index creation pass complete.` proves that every index was installed.

Retain the CLI tag or commit, index version, database name, collection selection and sanitized logs in your deployment record. Once verification succeeds, proceed with the application rollout that requires these indexes.

{{% /steps %}}

## Run the same workflow in Kubernetes

Running a Job inside the cluster is useful when MongoDB is reachable only over internal DNS. The CLI flags and verification requirements are identical; no public database endpoint is needed.

Use a pinned CLI image tag or digest that contains the selected specification. The [repository's Job template](https://github.com/uug-ai/cli/blob/main/jobs/check-indexes.yaml) is a starting point, not a guarantee that its image includes a newer contract.

### Prepare a dry-run Job

In your target namespace, provision an existing Secret named `hub-index-check` with a `mongodb-uri` key through your normal secret-management process. Do not paste credentials into the manifest.

Save this as `index-check.yaml`, replacing `<tested-tag>` with your approved CLI image tag and adjusting the database, contract and collections:

```yaml {filename="index-check.yaml"}
apiVersion: batch/v1
kind: Job
metadata:
  name: hub-indexes-dry-run
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: check-indexes
          image: ghcr.io/uug-ai/cli:<tested-tag>
          workingDir: /
          command: ["/main"]
          args:
            - "-action"
            - "check-indexes"
            - "-mongodb-uri"
            - "$(MONGODB_URI)"
            - "-mongodb-destination-database"
            - "Kerberos"
            - "-collections"
            - "groups,sites"
            - "-index-version"
            - "migration-hub-workflow-device-groups-08-10-2026"
            - "-mode"
            - "dry-run"
          env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: hub-index-check
                  key: mongodb-uri
```

Kubernetes expands `$(MONGODB_URI)` in the argument from the Secret-backed environment variable; this is not automatic CLI environment-variable support. The official image includes its specifications under `/indexes`. Add an image pull Secret if your registry access requires one.

### Run and review

Confirm your Kubernetes context, then set the intended namespace:

```bash
kubectl config current-context
NAMESPACE='your-hub-namespace'

kubectl -n "$NAMESPACE" create -f index-check.yaml
kubectl -n "$NAMESPACE" logs -f job/hub-indexes-dry-run
kubectl -n "$NAMESPACE" wait \
  --for=condition=complete job/hub-indexes-dry-run --timeout=10m
```

If the Pod is not ready when you request logs, inspect it with `kubectl -n "$NAMESPACE" get pods`, resolve any scheduling or image-pull issue, then read the logs again. A wait timeout does not cancel the Job or establish whether indexes are present.

Review the report using the same checklist as the local dry run. Kubernetes marking the Job `Complete` is not sufficient proof of success.

### Apply and verify with separate Jobs

After review, make a second manifest with only these changes:

- Set `metadata.name` to `hub-indexes-live`.
- Change the `-mode` argument's value to `live`.

Create that Job, follow its logs, and wait for completion. Allow enough time for the actual collection sizes. Keep the image, URI Secret, database, version and collection selection the same.

Finally, create a third Job named `hub-indexes-verify` with `-mode dry-run`. Confirm the all-present message **and** the absence of errors or skipped collections before continuing the rollout.

Use a new name for each Job, including later reruns: existing Job Pod arguments are immutable, so changing `-mode` on a completed Job with `kubectl apply` is not the workflow.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `parsing indexes file ...: open ...` | Run from the CLI repository root, pass the filename stem only, and confirm the checkout or image contains that version. |
| `collection ... not present in indexes file; skipping` | Correct the collection spelling or choose the contract containing it. A skipped collection has not been verified. |
| `list indexes` fails | Check the database name, collection existence, network path, credentials and `listIndexes` privileges. Do not accept an all-present message alongside lookup errors. |
| Server selection timeout | Check DNS, MongoDB network policies or allowlists, TLS settings and URI authentication options from the environment running the CLI. |
| Duplicate-key error during creation | A required unique index conflicts with existing data. Stop and investigate with the database owner; do not delete records or remove `unique` merely to make the build pass. |
| Index name or options conflict | The checker does not replace incompatible indexes. Inspect the existing definition and arrange a separately reviewed database change. |
| The command prints `[done]`, but indexes remain missing | Inspect individual `[error] create ...` lines, resolve the cause, then repeat dry-run, live and verification for the same scope. Successful earlier creations remain installed. |
| No creation occurs | Confirm `-mode live`. Other mode values do not apply indexes. |
| Database load rises during a build | Monitor resource usage and application impact with your database operator; avoid parallel builds from additional CLI runs. |

{{< tutorial-panel tone="success" icon="check-circle" title="Done when" >}}
- The intended version and collections have been checked against the correct database.
- Every missing index has been successfully created or handled through a separately approved procedure for unsupported options.
- A final dry run reports all required indexes present with no errors or skipped collections.
- The reviewed scope and sanitized output are recorded alongside the application rollout.
{{< /tutorial-panel >}}

## Further reading

- [Check indexes command reference](/docs/cli/check-indexes/)
- [CLI overview](/docs/cli/)
- [Versioned index specifications](https://github.com/uug-ai/cli/tree/main/indexes)
- [CLI release and feature-specific instructions](https://github.com/uug-ai/cli/blob/main/README.md)
