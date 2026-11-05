---
title: "Quickstart"
description: "Deploy Factory on Kubernetes without MongoDB and open the UI."
draft: false
weight: 304
toc: true
---

Run Factory inside your Kubernetes cluster to deploy and manage Agents. This quickstart uses the [Factory deployment manifests](https://github.com/uug-ai/deployment/tree/main/base/factory): `ghcr.io/uug-ai/factory:v2.0.13`, pinned by digest, with the Kubernetes engine and ConfigMap configuration store. **MongoDB is not required.**

## Docker

Factory does **not** currently support a standalone Docker or Docker Compose deployment. The Docker and host engines are planned, not implemented. Use Kubernetes, including for a local trial; see [Configuration & engines](/docs/factory/configuration-and-engines#engine-factory_engine).

## Kubernetes

**Before you start:** have Git, a running Kubernetes cluster and `kubectl` configured for it. You need permission to create cluster-scoped RBAC resources. The supplied ClusterRole grants broad access across the cluster to the `default` ServiceAccount in `kerberos-factory`; review it before applying and use a disposable test cluster for this trial. Nodes must be able to pull the Factory image and, when you add cameras, the configured Agent image. Configure registry authentication if required.

Download the manifests:

```bash
git clone https://github.com/uug-ai/deployment.git
cd deployment/base/factory
```

Before applying, edit `kerberos-factory-deployment.yaml` and replace the two login values:

```yaml
- name: KERBEROS_LOGIN_USERNAME
  value: "factory-admin"
- name: KERBEROS_LOGIN_PASSWORD
  value: "REPLACE_WITH_A_STRONG_LOGIN_PASSWORD"
```

Leave `FACTORY_CONFIGURATION=configmap`, `FACTORY_ENGINE=kubernetes`, `NAMESPACE=kerberos-factory` and the writable volumes unchanged. This mode stores Agent settings in plaintext ConfigMaps. Do not add storage credentials or other sensitive settings for this trial; use the [Secret configuration store](/docs/factory/configuration-and-engines#configuration-storage-factory_configuration) with the [required RBAC changes](https://github.com/uug-ai/deployment/tree/main/base/factory#switching-the-configuration-store) before doing so. Keep edited files containing credentials out of Git; use Kubernetes Secrets for production login credentials.

The supplied Service exposes **NodePort 30079**, even when you use port-forward below. Restrict node access to trusted networks before applying it.

```bash
kubectl apply -f ../namespaces/kerberos-factory.yaml
kubectl apply -f kerberos-factory-clusterrole.yaml
kubectl apply -n kerberos-factory \
  -f kerberos-factory-deployment.yaml \
  -f kerberos-factory-service.yaml
kubectl rollout status deployment/factory -n kerberos-factory --timeout=300s
kubectl logs -n kerberos-factory deploy/factory
kubectl get configmap -n kerberos-factory agent-global-config agent-template-config
kubectl port-forward -n kerberos-factory svc/factory-nodeport 8080:80
```

Leave port-forward running. In another terminal, check the HTTP process:

```bash
curl --fail http://localhost:8080/healthz
```

Open [http://localhost:8080](http://localhost:8080) and sign in with your configured login. Confirm that **Nodes** lists your cluster nodes and **ConfigMaps** shows the bootstrapped Agent configuration. `/healthz` checks the HTTP process, not Kubernetes API access; the UI and ConfigMap checks verify more than rollout alone. If startup fails, inspect the logs and `kubectl describe pods -n kerberos-factory`.

## Add your first camera

In **Cameras**, add a name and a camera RTSP URL reachable from the cluster. Factory creates an Agent Deployment and Service; check that it becomes healthy in the UI and inspect its logs. The supplied Agent image is `kerberos/agent:latest`; select a tested version through `KERBEROS_AGENT_IMAGE` before production use.

Follow [Getting started](/docs/factory/getting-started#adding-a-new-deployment) for camera configuration and optional [Vault or Hub connections](/docs/factory/getting-started#storage-and-video-management). Neither Vault nor Hub is installed by these commands.

For managed or self-hosted clusters, persistent configuration, alternate stores and service exposure, see [Installation](/docs/factory/installation) and the [detailed manifest guide](https://github.com/uug-ai/deployment/tree/main/base/factory). These HTTP examples are for an isolated trial; configure TLS and production secret handling before exposing Factory.
