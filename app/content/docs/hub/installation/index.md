---
title: "Installation"
description: "Installing Kerberos Hub wherever you want."
lead: "Installing Kerberos Hub wherever you want."
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-08-25T00:00:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 302
toc: true
---

Kerberos Hub is the single pane of glass for your Agents. It comes with a best of breed open source technology stack, a modular design and out-of-the-box scalability. Kerberos Hub allows building and maintaining an ever-growing video streaming and analytics landscape.

No matter how many Agents you have running in the field Kerberos Hub will manage it.

## Helm and Kubernetes

Kerberos Hub is composed of a couple of microservices which are all installed in a Kubernetes cluster. Because we are handling with many containers, we can benefit from package managers such as [Helm](https://helm.sh/) to deploy our resources more easily. In the near future we might use the [Kubernetes operator](https://kubernetes.io/docs/concepts/extend-kubernetes/operator) as well.

{{< figure src="hub-architecture.svg" alt="Kerberos Hub is composed out of different microservices." caption="Kerberos Hub is composed out of different microservices." class="stretch">}}

## Dependencies

Within the Kerberos Hub architecture we use a couple of third-party, open source, technologies such as:

- MongoDB,
- Kafka,
- Pion Turn / Coturn,
- and Vernemq

## Installation

To install Kerberos Hub, we will redirect you to the official Github repository, [kerberos-io/hub](https://github.com/kerberos-io/hub). This repository includes all the instructions needed to get Kerberos Hub up and running.

## Configuration

When successfully installed the Kerberos Hub Helm chart, it is time to configure the solution to your needs. Learn more about [the configuration here](/hub/configuration).

### Google Places address autocomplete

Kerberos Hub uses Google Places to suggest addresses when users configure sites,
groups, profiles, and devices. The frontend uses `PlaceAutocompleteElement`,
which requires **Places API (New)**. A key configured only for the legacy Places
API does not enable autocomplete.

Configure the Google Cloud project that owns the browser API key:

1. Confirm that billing is enabled for the project.
2. Enable [Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com).
3. Enable [Places API (New)](https://console.cloud.google.com/apis/library/places.googleapis.com).
4. Open [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) and select the key used by Hub.
5. Under **Application restrictions**, select **Websites** and add every Hub origin as an HTTP referrer, for example `https://hub.example.com/*`. Add `http://localhost:4200/*` only to a development key when local development needs autocomplete.
6. Under **API restrictions**, select **Restrict key** and allow both **Maps JavaScript API** and **Places API (New)**.
7. Save the key and allow several minutes for the changes to propagate.

Set the key in the Hub Helm values:

```yaml
kerberoshub:
  frontend:
    googlemaps:
      apikey: "YOUR_BROWSER_API_KEY"
```

Apply the values through your normal GitOps deployment, or upgrade a directly
managed Helm release:

```shell
helm upgrade --install hub kerberos-io/hub \
  --namespace kerberos-hub \
  --values values.yaml
```

The chart passes this value to the frontend as `GOOGLEMAPS_KEY`. Although a
browser API key is visible to users of the application, it must still be
protected with website and API restrictions. Do not use an unrestricted key.

To verify the setup, open a Hub address field and start typing. Place suggestions
should appear after the first focus. If the field remains a normal text input,
inspect the browser console for `ApiNotActivatedMapError`,
`RefererNotAllowedMapError`, or request-denied messages. These indicate a missing
API, an incorrect website restriction, or a key from a different Cloud project.
