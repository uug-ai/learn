---
title: "Quickstart"
description: "Deploy Vault with Docker or Kubernetes and check that it is running."
draft: false
weight: 303
toc: true
---

Deploy UUG / Kerberos Vault with either Docker or Kubernetes. Both examples use `ghcr.io/uug-ai/vault:v1.7.19`, matching the [deployment manifests](https://github.com/uug-ai/deployment/tree/main/base/vault).

**Before you start:** have a MongoDB-compatible database reachable from the container or pod, and an object-storage provider/bucket such as S3 or MinIO. MongoDB stores metadata and configuration; the provider stores recordings. These examples do not install either dependency. You also need Docker, or a Kubernetes cluster with `kubectl` configured. If image pulls require authentication, sign in to GHCR (and configure an image-pull Secret for Kubernetes).

## Docker

Create a private configuration file:

```bash
mkdir vault-quickstart
cd vault-quickstart
umask 077
cat > vault.env <<'EOF'
GIN_MODE=release
KERBEROS_LOGIN_USERNAME=vault-admin
KERBEROS_LOGIN_PASSWORD=REPLACE_WITH_A_STRONG_LOGIN_PASSWORD
MONGODB_HOST=REPLACE_WITH_DATABASE_HOST:27017
MONGODB_DATABASE_STORAGE=KerberosStorage
MONGODB_DATABASE_CREDENTIALS=admin
MONGODB_USERNAME=REPLACE_WITH_DATABASE_USERNAME
MONGODB_PASSWORD=REPLACE_WITH_DATABASE_PASSWORD
MONGODB_FLAVOR=mongodb
MONGODB_RETRY_WRITES=true
MONGODB_TLS=false
EOF
```

Replace every `REPLACE_WITH_...` value in `vault.env` before continuing. Use a database hostname reachable **inside Docker**, not `localhost`. Set `MONGODB_TLS=true` if your database requires TLS; see the [database configuration guide](https://github.com/uug-ai/deployment/tree/main/base/vault#mongodb-configuration) for URI, custom CA and DocumentDB settings.

```bash
docker run -d --name kerberos-vault \
  --env-file ./vault.env \
  --publish 127.0.0.1:8080:8080 \
  --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount type=volume,source=vault-tmp,target=/run/vault \
  ghcr.io/uug-ai/vault:v1.7.19

docker logs kerberos-vault
curl --fail http://localhost:8080/api/health
```

Open [http://localhost:8080](http://localhost:8080) and sign in with the login you configured. If the health request fails while Vault starts, check the logs and retry. The named volume provides writable upload scratch space for the non-root image; recordings remain in your provider, not this volume. Allow sufficient disk space for concurrent uploads. A successful health response confirms the HTTP server is running, not that storage is configured.

## Kubernetes

Download the manifests from the [detailed installation guide](https://github.com/uug-ai/deployment/tree/main/base/vault):

```bash
git clone https://github.com/uug-ai/deployment.git
cd deployment/base/vault
```

Before applying, edit these files:

- `mongodb-configmap.yaml`: set the database host, credentials and TLS settings to match your database.
- `kerberos-vault-deployment.yaml`: if your database is not `mongodb.mongodb:27017`, update the init container's `nc -z mongodb.mongodb 27017` command to probe your database host and port too. Setting `MONGODB_URI` alone does not update this wait check.
- `vault-runtime-configuration-configmap.yaml`: replace `KERBEROS_LOGIN_USERNAME` and `KERBEROS_LOGIN_PASSWORD`. Leave the three resource arrays as `[]` to configure storage and accounts in the UI.

The ConfigMap examples are for an isolated trial only: credentials are plaintext. For production, use Secrets as described in the [installation guide](https://github.com/uug-ai/deployment/tree/main/base/vault#vault-configuration). The supplied Service exposes NodePort `30080`; restrict access to trusted networks.

```bash
kubectl apply -f ../namespaces/kerberos-vault.yaml
kubectl apply -n kerberos-vault \
  -f mongodb-configmap.yaml \
  -f vault-runtime-configuration-configmap.yaml \
  -f kerberos-vault-deployment.yaml \
  -f kerberos-vault-service.yaml
kubectl rollout status deployment/vault -n kerberos-vault --timeout=300s
kubectl logs -n kerberos-vault deploy/vault -c vault
kubectl port-forward -n kerberos-vault svc/vault-nodeport 8080:80
```

Leave port-forward running. In another terminal, confirm health:

```bash
curl --fail http://localhost:8080/api/health
```

Open [http://localhost:8080](http://localhost:8080) and sign in with your configured login. If rollout is stuck in `Init`, inspect `kubectl logs -n kerberos-vault deploy/vault -c wait-for-mongodb-before-starup`. The manifest provides a writable `1Gi` scratch volume at `/run/vault`; [increase it for larger or concurrent uploads](https://github.com/uug-ai/deployment/tree/main/base/vault#size-the-writable-scratch-volume). Applying the individual files above intentionally skips the optional GPU data-filtering worker.

## Store your first recording

In Vault, add and validate a [storage provider](/docs/vault/providers), then create an [account](/docs/vault/accounts) using that provider and generate its access keys. [Connect an Agent](/docs/agent/connect-to-vault) with those account keys and a Vault API URL reachable from the Agent (`http://<vault-host>:<port>/api`), then verify the connection. The loopback URL and Kubernetes port-forward above are only for local access; configure a reachable HTTPS endpoint before connecting remote Agents.

Keep configuration files containing credentials out of Git. These HTTP examples are for a trusted test environment; configure TLS and production secret handling before exposing Vault.
