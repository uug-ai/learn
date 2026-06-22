---
title: "Getting Started"
description: "What to expect from Factory"
lead: "What to expect from Factory"
date: 2020-10-06T08:49:31+00:00
lastmod: 2020-10-06T08:49:31+00:00
draft: false
images: []
menu:
  factory:
    parent: "factory"
weight: 301
toc: true
---

Once you've installed Factory, you will have the web application running inside your cluster. This web application allows you to administrate and automate the creation of your Agents through the concept of [Kubernetes deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) and pods.

Important to note is that this web application is relying [on the official Golang Kubernetes API](https://github.com/kubernetes/client-go), so that means from an administration point of view, you could simply use the well known `kubectl` command instead. The web application adds some functionalities on top of the Kubernetes API, which are specific to an Agent; for example region of interests, livestreaming settings, etc.

## Login page

Once you open a browser, and navigate to the web application (see installation for the url), you will land on the login page.

{{< figure src="login.gif" alt="Login into the Factory interface." caption="Login into the Factory interface." class="stretch">}}

The default username password, specified in the [`deployment.yaml`](https://github.com/kerberos-io/enterprise/blob/master/yaml/factory/deployment.yaml#L54) is:

- username: **root**
- password: **kerberos**

> The username and password [can be changed in the `deployment.yaml` file](https://github.com/kerberos-io/factory/blob/master/yaml/deployment.yaml#L34-L37).

## Overview

On the overview page you will find an intuitive overview of the different pages and functionalities. As Factory is running on top of a Kubernetes cluster, Agents are deployed as Kubernetes deployments.

Factory allows you to inspect and configure your Agents, but also provide an overview of the Kubernetes nodes and pods.

{{< figure src="overview.gif" alt="Review your Docker or Kubernetes agents." caption="Review your Docker or Kubernetes agents." class="stretch">}}

On the left menu you will find the following pages:

- Settings: the global settings which are inherited by Agents.
- Camera: a list of all the Agents running in your cluster.
- Nodes: a list of all the nodes in your cluster.
- Pods: all the pods running in your cluster.
- ConfigMaps: inspect, export and import the Kubernetes ConfigMaps that hold your agent configuration (when running a Kubernetes-native config store).

## Nodes

The nodes section lists all the available nodes inside your Kubernetes cluster. It shows a limited amount of information such as the version, the number of Docker images installed on the node, and some basic hardware information. Live CPU and memory usage is streamed for each node, so you can spot a node that is under pressure at a glance.

{{< figure src="nodes.gif" alt="Get an entire list of nodes which are connected to your Kubernetes cluster." caption="Get an entire list of nodes which are connected to your Kubernetes cluster." class="stretch">}}

## Cameras

The cameras section will list all the Agents (running as deployments) that you have deployed inside your cluster. This page gives you access to deploy new Agents. Next to that you can easily upgrade Agents to a newer version, reboot them, view logging and update the configuration options of the Agent.

{{< figure src="deployments.gif" alt="Get a list of all your Agents." caption="Get a list of all your Agents." class="stretch">}}

### Adding a new deployment

By specifying a name for your Agent, and it's corresponding RTSP url, a new Kubernetes deployment will be created for you, and a Kubernetes pod will be deployed to one of your installed nodes.

{{< figure src="add-kerberos-agent.gif" alt="Deploy a single Agent or in bulk." caption="Deploy a single Agent or in bulk." class="stretch">}}

#### Adding through ONVIF

Instead of creating a new Agent through a RTSP stream, you can discover streams through ONVIF, and enable additional features through ONVIF such as PTZ. Enable the ONVIF toggle, and type in the IP address, ONVIF username and ONVIF password. Click the verify connection, and select an RTSP stream from the profile list.

{{< figure src="add-through-onvif.gif" alt="Deploy an Agent with ONVIF capabilities." caption="Deploy an Agent with ONVIF capabilities." class="stretch">}}

Once the Agent is added, PTZ and other ONVIF capabilities will be enabled through Kerberos Hub.

{{< figure src="ptz-onvif.gif" alt="Moving a camera through ONVIF PTZ." caption="Moving a camera through ONVIF PTZ." class="stretch">}}

### Configuring a deployment

Once you have a running Agent, you should see a green circle next to the deployment, indicating that it is successfully running. At any time you can configure your Agent by clicking on the <SettingsIcon className="pointer"/> icon. This will open a popup, allowing you to change some settings.

{{< figure src="configure-kerberos-agent.gif" alt="Once you created the Agent, you can configure the agent." caption="Once you created the Agent, you can configure the agent." class="stretch">}}

Following settings can be changed:

- One or more regions of interest,
- Time based conditions,
- Pre- and post recording
- Continuous recording
- Linking to [Kerberos Hub Saas](/hub/first-things-first) or [Kerberos Vault](/vault/first-things-first)

{{< callout type="info" >}}
Before the configuration screen opens, Factory runs a quick **reachability check** (a ping) against the agent. If an agent is temporarily unreachable you get a fast, friendly message instead of a long hang, and any unsaved changes are confirmed before you close the screen.
{{< /callout >}}

### Global configuration

Configuration can be specified in an Agent, this means that you update the configuration of a specific Kubernetes deployment. However, this can also be specified at a higher level. This higher level is what we call the global configuration.

By specifying configurations at a higher level, any Agents will inherit from that configuration. This is improving the overall maintenance and management of your Agents.

The global configuration is stored by the factory itself. Depending on how the factory is set up this is a MongoDB database, a local JSON file, or a Kubernetes ConfigMap/Secret — see [Configuration & engines](/factory/configuration-and-engines) for the details.

{{< figure src="global-settings.gif" alt="You can specify the configurations on a global level, so all Agents will inherit from that." caption="You can specify the configurations on a global level, so all Agents will inherit from that." class="stretch">}}

### Upgrade or reboot an Agent

At Kerberos, we have agile development cycles, which means that new versions will be released every day, week or month. To make sure you can upgrade or downgrade these Agent easily, an upgrade feature is built-in. When pressing the upgrade button, you will be able to select the version to which you would like to upgrade or downgrade. Once submitted, **a zero downtime upgrade will take place**. Kubernetes will download the new release, create a new pod, and destroy the old one.

At any moment you can reboot one of your Agents. When pressing the reboot button, next to your deployment, Kubernetes will destroy the pod of your deployment, and schedule a new one.

{{< figure src="upgrade-kerberos-agent.gif" alt="You can specify the configurations on a global level, so all agents will inherit from that." caption="You can specify the configurations on a global level, so all agents will inherit from that." class="stretch">}}

### Live logs and in-browser terminal

Every Agent runs as a pod, and you can follow what it is doing without leaving the browser. From the cameras list you can:

- **Stream live logs** — open the console to tail the agent's logs in real time, which is the quickest way to confirm a camera is connecting and recording.
- **Open an in-browser terminal** — start an interactive shell straight into the running pod to inspect the container, check files or run troubleshooting commands, without needing `kubectl exec` or SSH access to the node.

{{< callout type="info" >}}
Logs and the terminal are streamed over a WebSocket connection to the Kubernetes API, so they are only available while the agent's pod is running.
{{< /callout >}}

## Pods

When creating an Agent, Kubernetes will create a Kubernetes deployment and schedule a pod. The pod will be managed by your deployment, and deployed as a container to one of your available nodes. Once a pod dies/ crashes, or whatever unexpected scenario, the deployment will make sure it is deployed again to a different (or the same) node. This makes sure the Agent is in a healthy state at all times. The pods page streams live CPU and memory usage per pod, and lets you delete a pod to force its deployment to reschedule it.

{{< figure src="pods.gif" alt="When creating a deployment, a Kubernetes pod has created and assigned to a node." caption="When creating a deployment, a Kubernetes pod has created and assigned to a node." class="stretch">}}

## ConfigMaps

When you run Factory with a Kubernetes-native configuration store (`configmap` or `secret`), the agent configuration lives in Kubernetes ConfigMaps and Secrets. The ConfigMaps page lets you inspect those objects, and **export** and **import** them:

- **Export** your ConfigMaps to keep a backup or to move a configuration between clusters.
- **Import** previously exported ConfigMaps to restore or replicate a setup.

System-managed ConfigMaps (such as `kube-root-ca.crt`) are skipped during import, so a round-trip cannot overwrite cluster-managed data.

{{< callout type="info" >}}
This page is most useful when the factory uses the `configmap` or `secret` configuration. See [Configuration & engines](/factory/configuration-and-engines) to learn how the configuration is stored and delivered to your agents.
{{< /callout >}}

## Storage and video management

Factory allows you to scale your video landscape horizontally, using the concept of Kubernetes, and brings a strong backbone for stability and performance. It allows you to avoid reinventing the wheel, and get stuck in the numerous challenges of developing a scalable video platform.

Agents store their recordings locally for a short period. This means that long-term storage is not included in the solution. On top of that it also does not have a visual component, which allows you te review dashboards or recordings. To overcome these two challenges, long-term storage with extensibility/integration capabilities and visualisation features, following solutions were developed [Kerberos Vault](/storage/introduction) and [Kerberos Hub](/cloud).

### Kerberos Vault

[Kerberos Vault](/vault/first-things-first) is a solution which makes it possible to store recordings from Agents (across different clusters) at a central place, on the storage provider you want. You can store your recordings in the cloud (AWS S3, Google Cloud Storage, Azure Blob storage) or at the edge (Minio, Ceph).

On the other hand it's an open platform, as it allows you build extensions and integrations (web apps, mobile apps, machine learning services much more). Kerberos Vault ships with the ability of real-time messaging (Kafka), and a REST API (documented as Swagger).

{{< figure src="vault-cloud-storage.svg" alt="Kerberos Vault allows you to centralise your recordings and build integrations." caption="Kerberos Vault allows you to centralise your recordings and build integrations." class="stretch">}}

To connect one or more Agents to your Kerberos Vault instance, you should open the configuration option and navigate to the `cloud` tab. After selected you need to fill-in the credentials from your Kerberos Vault account.

- Kerberos Vault URI: this is the API endpoint of your Kerberos Vault instance. Usually this is in the following format: `http(s)://yourdomain.com/api`. Where `yourdomain.com` should match your Kerberos Vault endpoint. If you are deploying Kerberos Vault at the edge, in the same cluster, you can use the internal DNS name, as following `http://vault.kerberos-vault/api`. Where `vault` is the `service name` and `kerberos-vault` is the `namespace`.

- Provider: the name of the provider, which you created on the Kerberos Vault providers page, to which you want to send your recordings to.

- Directory: this is the subdirectory in which your files will be stored. At the time of writing this should also equal your Kerberos Hub username, if you plan to upload to Kerberos Hub.

- Access Key: this should match the access key of one of your Kerberos Vault accounts.

- Secret Key: this should match the secret key of one of your Kerberos Vault accounts.

{{< figure src="kerberos-factory-kerberos-vault.gif" alt="Using Kerberos Vault you can bring your own storage, and store the recordings of your agents in your own storage provider." caption="Using Kerberos Vault you can bring your own storage, and store the recordings of your agents in your own storage provider." class="stretch">}}

### Kerberos Hub

For the visualisation part Kerberos Hub comes into the picture. Kerberos Hub is a web app, backed up with a number of microservices, that shows dashboards, live streams, filter recordings and much more. Learn more [about the features and functions here](/cloud).

You have two choices when using Kerberos Hub, either you send your recordings from your Agents directly to Kerberos Hub, or you send your recordings to Kerberos Vault, and connect Kerberos Vault to Kerberos Hub. About the latter more is explained on the [Kerberos Vault page](/storage/get-started).

Select the Kerberos Hub option, and copy-paste the credentials from your Kerberos Hub subscription.

{{< figure src="kerberos-factory-kerberos-hub.gif" alt="By linking the Agent to Kerberos Hub, your recordings and livestreams will become available online." caption="By linking your Enterprise agent to Kerberos Hub, your recordings and livestreams will become available online." class="stretch">}}

- Proxy URI: this is a proxy service which moves the recording in the Kerberos Hub SAAS version. By default `http://proxy.kerberos.io`.

- Region: this is the region where your recordings will be stored. Only `eu-west-1` for now (will change, on the roadmap).

- Bucket: the name of the Kerberos Hub bucket. Only `kerberosaccept` for now (will change, on the roadmap).

- Directory: this is your personal directory, and matches your Kerberos Hub username.

In the Kerberos Hub section (next to persistence) provide following information

- API url: the url of the Kerberos Hub endpoint. By default `https://api.cloud.kerberos.io` for our Kerberos Hub SAAS version.

- Public Key: this should match the public key of your Kerberos Hub subscription.

- Private Key: this should match the private key of your Kerberos Hub subscription.
