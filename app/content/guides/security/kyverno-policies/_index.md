---
title: Kyverno policies
description: How Kyverno checks image signatures and hardening attestations at admission, and how the results reach policy reports and Grafana.
weight: 40
toc: true
type: docs
---

Signing an image only helps if something checks the signature before the
image runs. In our clusters that is [Kyverno](https://kyverno.io/), a policy
engine that runs as a Kubernetes admission webhook. For every Pod with a
UUG.AI image it checks three things:

| Category | Policy | Passes when |
| --- | --- | --- |
| Image signing | `<image>-signed-images` | The image has a keyless signature from `release-create.yml` **for its own repository**. |
| Image hardening | `<image>-hardened-images` | The image has a signed hardening attestation with `result: passed` and the matching `repository`. |
| Image registry | `trusted-registry` | A UUG.AI image (`uugai/…`, `*/uugai/…`, `*/uug-ai/…`) is pulled from `ghcr.io/uug-ai`. |

What the signature and attestation contain is described in
[Hardened releases and signing](/guides/security/release-signing).

## Audit and Enforce

Each policy has a `validationFailureAction`:

- **Audit**: the Pod is admitted, and a failing result is written to a policy
  report.
- **Enforce**: the API server rejects the Pod. For a Deployment this means the
  new ReplicaSet cannot create Pods; the old version keeps running and Argo CD
  shows the Application as out of sync.

Current state (18 November 2026):

| Namespace | Image signing | Image hardening | Image registry |
| --- | --- | --- | --- |
| `kerberos-hub` (Hub production) | Audit (23) | **Enforce** (22), Audit (1) | Audit |
| `staging` (Hub staging) | Audit (24) | Audit (24) | Audit |
| `kerberos-vault` (Vault) | Audit | Audit | – |

`hub-objecttracking` hardening stays in Audit because its GPU image is not
signed yet. `trusted-registry` is always Audit: it reports, never blocks.

All policies use `failurePolicy: Ignore`, so Pods still start while Kyverno
itself is down, and `webhookTimeoutSeconds: 30`, because verifying against
GHCR and the Rekor log can take longer than the 10 second default.

## Where the policies come from

**Hub** ships its policies in the Helm chart, one static file per image in
`kerberos-io/helm-charts/charts/hub/templates/kyverno/`. Two values control
them, and both are off by default:

```yaml
imageVerification:          # *-signed-images and trusted-registry
  enabled: true
  validationFailureAction: Audit
imageHardening:             # *-hardened-images
  enabled: true
  validationFailureAction: Enforce
```

The policies are namespaced (`Policy`, not `ClusterPolicy`), so they apply to
the Hub release's namespace only, and they render only when the Kyverno CRDs
are installed. A customer without Kyverno gets no policies.

**Vault** policies live in GitOps under
`environments/production-bijlokehof/kyverno-policies/<namespace>/`, synced by
the Application `kyverno-policies-production`.

A signature policy, trimmed:

```yaml
apiVersion: kyverno.io/v1
kind: Policy
metadata:
  name: hub-api-signed-images
  annotations:
    policies.kyverno.io/category: Image signing
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Audit
  failurePolicy: Ignore
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-hub-api
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - imageReferences:
            - "ghcr.io/uug-ai/hub-api:*"
            - "ghcr.io/uug-ai/hub-api@*"
          mutateDigest: false
          verifyDigest: false
          attestors:
            - entries:
                - keyless:
                    issuer: https://token.actions.githubusercontent.com
                    subjectRegExp: '^https://github\.com/uug-ai/workflows/\.github/workflows/release-create\.yml@(refs/.+|[0-9a-f]{40})$'
                    additionalExtensions:
                      githubWorkflowRepository: uug-ai/hub-api
                    rekor:
                      url: https://rekor.sigstore.dev
```

The `githubWorkflowRepository` extension is what ties the signature to one
repository. The hardening policy has the same attestor and additionally
requires the attestation type
`https://github.com/uug-ai/workflows/attestations/image-hardening/v1` with
`result` equal to `passed` and `repository` equal to the image's repository.

### Adding an image

When the chart gains a UUG.AI image:

1. Make sure its repository releases with `sign: true` (and `hardened: true`
   if it will run in production).
2. Copy an existing `*-signed-images.yaml` and `*-hardened-images.yaml` in
   `templates/kyverno/` and change the image name and repository.
3. Render the chart and check the new policy appears. After rollout, check its
   policy report on staging before production.

## Kyverno in the cluster

| Application | Chart | Values in `uug-ai/gitops` |
| --- | --- | --- |
| `kyverno-production` | `kyverno/kyverno` 3.9.2 (Kyverno 1.19) | `environments/production-bijlokehof/kyverno/values.yaml` |
| `policy-reporter-production` | `kyverno/policy-reporter` 3.11.2 | `environments/production-bijlokehof/policy-reporter/values.yaml` |
| `kyverno-policies-production` | Plain manifests | `environments/production-bijlokehof/kyverno-policies/` |

The admission controller runs three replicas; background, cleanup and reports
controllers two each. The webhooks skip `kube-system`, `argocd` and
`longhorn-system`, so a Kyverno problem can never block the components needed
to fix it.

## Policy reports

Kyverno writes every result to a `PolicyReport` in the workload's namespace:
at admission, and again from its background scan of running resources (every
hour), so a policy added later still reports on Pods that already run.

```shell
# Pass/fail counts per resource
kubectl -n kerberos-hub get policyreports

# Failing results only, for Deployments
kubectl -n kerberos-hub get policyreports -o json | jq -r '
  .items[] | select(.scope.kind == "Deployment") | .scope.name as $name
  | .results[] | select(.result == "fail")
  | [$name, .policy, .message] | @tsv'
```

{{< callout type="info" >}}
Reports also exist for old ReplicaSets that are scaled to zero, and those
still reference earlier, unsigned image tags. Judge the current state by
Deployment-scoped results, not by the total number of failures.
{{< /callout >}}

To test whether production would admit an image before promoting it, ask the
API server without changing anything:

```shell
kubectl -n kerberos-hub set image deployment/<name> \
  <container>=ghcr.io/uug-ai/<image>:<tag> --dry-run=server
```

An Enforce policy that fails returns the Kyverno error message instead of the
patched object.

## Metrics and dashboards

[Policy Reporter](https://kyverno.github.io/policy-reporter/) turns the
policy reports into Prometheus metrics. We run it metrics-only (its UI is
disabled). The main metric is `policy_report_result`, labelled with `policy`,
`rule`, `category`, `severity`, `status`, `kind`, `name` and the workload's
namespace as **`exported_namespace`** (`namespace` is where Policy Reporter
itself runs).

```promql
# Failing results per category
sum by (category, exported_namespace) (policy_report_result{status="fail"})

# Images without a hardened release, for running Deployments
policy_report_result{category="Image hardening", status="fail", kind="Deployment"}
```

Grafana picks up these dashboards from ConfigMaps in the `kyverno` namespace:

| Dashboard | Source |
| --- | --- |
| **Image signing & hardening** | Ours, `kyverno-policies/dashboards/image-signing-hardening.yaml` in GitOps. Signed and hardened pass/fail counts and a per-image table, filtered by namespace. |
| Policy Reporter overview, policy details, cluster policy details | Policy Reporter chart (`monitoring.enabled`) |
| Kyverno | Kyverno chart (`grafana.enabled`): admission latency, webhook and controller health |

Like vulnerabilities, policy results are not yet wired to a Grafana alert
rule; see [Alerting](/guides/security/vulnerability-scanning#alerting).
