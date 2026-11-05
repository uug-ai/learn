---
title: "Quickstart"
description: "Deploy the Hub services on Kubernetes and open the web interface."
draft: false
weight: 303
toc: true
---

Hub is a multi-service application, not a single container. This quickstart uses the [deployment examples](https://github.com/uug-ai/deployment/tree/main/base/hub) and their pinned Hub Helm chart, `0.170.1`, for a **new, isolated test installation**.

## Docker

The deployment repository's [Docker Compose guide](https://github.com/uug-ai/deployment/blob/main/README.docker.md) is a placeholder; it does not supply a working Hub stack. There is no verified standalone Docker quickstart in these sources. Use the Kubernetes path below rather than starting only the frontend or API container.

## Kubernetes

**Before you start:** have Git, Helm 3, a Kubernetes cluster and `kubectl` configured. Provision these dependencies first; the Hub chart does **not** install them:

| Dependency | Needed for |
| --- | --- |
| MongoDB | Hub accounts, configuration and recording metadata. Use a new `Kerberos` database for this trial. |
| RabbitMQ | The event-processing pipeline; this example uses `queueProvider: RABBITMQ`. |
| MQTT broker, such as VerneMQ | Agent communication. Its endpoint must be reachable by Agents, Hub and the browser; use WSS with a trusted certificate. |
| TURN/STUN server, such as Coturn | WebRTC live streaming. |
| [Vault](/docs/vault/quickstart) with object storage and account keys | Recording access, thumbnails and sprites. |
| Prometheus Operator's `ServiceMonitor` CRD | Chart `0.170.1` creates `ServiceMonitor` resources even for a local trial. |

Use the [detailed dependency installation guide](https://github.com/kerberos-io/hub#installation) for self-hosted or managed services. Have a valid [Hub license](/docs/hub/license) available; do not assume the bundled trial license meets your requirements. If an image requires registry authentication, create an image-pull Secret in `kerberos-hub` and set `imagePullSecrets` in your values.

### Configure

```bash
git clone https://github.com/uug-ai/deployment.git
cd deployment
git checkout --detach 5485f454b38b4a16c91907fd06e906d372f45253
umask 077
cp base/hub/kerberos-hub-values.yaml hub-values.yaml
cp base/hub/kerberos-hub-import-database-job.yaml hub-import.yaml
helm repo add kerberos https://charts.kerberos.io
helm repo update
```

Edit `hub-values.yaml` before installing:

- Set `mongodb`, `rabbitmq`, `mqtt` and `turn` to your real endpoints and credentials. Configure MongoDB TLS if required. Database and queue hosts must resolve from the pods, not just your workstation.
- Set `kerberosvault.uri` to your Vault API URL and replace its provider and account keys, including the `archive`, `thumbnail` and `sprite` entries.
- Replace `kerberoshub.api.jwtSecret` and `kerberoshub.api.apiKey` with separate strong random values, and set `license` as needed. Disable unused integrations such as `kerberoshub.api.slack.enabled`, or supply their real configuration.
- Keep `ingress: ""` for local port-forwarding. Under the existing `kerberoshub` mapping, set the following values (merge them; do not discard the other API/frontend settings):

```yaml
kerberoshub:
  api:
    schema: "http"
    url: "localhost:8081"
  frontend:
    schema: "http"
    url: "localhost:8080"
    demoEnabled: false
```

These are browser-facing URLs. Always open the UI as `http://localhost:8080` so its origin matches the API's configured allowed origin. The local API URL is not usable by remote Agents.

In `hub-import.yaml`, update **both** the MongoDB wait command and the `mongosh` connection command to your database, authentication and TLS settings. Replace **both** seeded users' `password` hashes with bcrypt hashes of passwords you choose, generated locally (for example with `htpasswd -nBC 10 example-user`; use only the hash after `example-user:`). Keep the owner and application passwords distinct. The owner's username is `example-user` unless you change `ownerUsername`.

The import creates accounts, subscriptions, an organisation and a project. **Use it only for this new test database:** rerunning it can overwrite seeded account credentials. Do not copy the chart guide's separate seed files as well.

### Install

```bash
set -e
kubectl get crd servicemonitors.monitoring.coreos.com
kubectl apply -f base/namespaces/kerberos-hub.yaml
kubectl apply -n kerberos-hub -f hub-import.yaml
kubectl wait -n kerberos-hub --for=condition=complete \
  job/hub-import-database-job --timeout=300s
kubectl logs -n kerberos-hub job/hub-import-database-job -c init-container

helm upgrade --install hub kerberos/hub --version 0.170.1 \
  --namespace kerberos-hub --values hub-values.yaml --wait --timeout=10m
kubectl wait -n kerberos-hub --for=condition=available \
  deployment --all --timeout=300s
kubectl get pods -n kerberos-hub
```

Stop if the import fails; inspect the Job's logs and events before proceeding. If a deployment fails, inspect `kubectl describe pod <pod-name> -n kerberos-hub` and its logs for image-pull, database or broker errors. Check all Hub services, not just the frontend. This installs the chart's services and pipeline; it deliberately skips the optional YOLOv8 GPU workload, PVCs and NodePort Services in `base/hub/kustomization.yaml`.

### Open and verify

Run each port-forward in its own terminal and leave both running:

```bash
kubectl port-forward -n kerberos-hub svc/hub-frontend-svc 8080:80
```

```bash
kubectl port-forward -n kerberos-hub svc/hub-api-svc 8081:8081
```

In another terminal:

```bash
curl --fail http://localhost:8080/healthz
```

Open [http://localhost:8080](http://localhost:8080) and sign in as `example-user` with the owner password you chose. A frontend health response alone does not verify the API or pipeline: confirm sign-in succeeds and the UI loads without failed API requests. Then [connect an Agent](/docs/agent/connect-to-hub) and [integrate Vault](/docs/vault/integrations) to check live view and recording processing with your own footage.

Keep the edited files out of Git. The example values and import Job contain plaintext credentials, and Helm stores release values in the cluster; restrict access and use production secret management. Before connecting remote Agents, configure reachable HTTPS UI/API endpoints, ingress and certificates using the [full installation guide](/docs/hub/installation), then follow [Hub configuration](/docs/hub/configuration). The two loopback port-forwards above are for local testing only.
