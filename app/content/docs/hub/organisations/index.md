---
title: "Organisations"
description: "Understand how organisations separate ownership, access, and resources in Kerberos Hub."
lead: "Understand how organisations separate ownership, access, and resources in Kerberos Hub."
date: 2026-08-11T00:00:00+00:00
lastmod: 2026-08-11T00:00:00+00:00
draft: true
images: []
menu:
  hub:
    parent: "hub"
weight: 303
toc: true
---

An organisation is the ownership and access boundary for shared resources in Kerberos Hub. Sites, groups, devices, recordings, workflows, alerts, and other shared resources belong to an organisation rather than to an individual member.

A user can own or belong to more than one organisation. The **current organisation** determines which organisation's resources are visible and affected by subsequent actions. Membership determines which organisations a user can enter, while roles and permissions determine what the user can do in each organisation.

## Core concepts

| Concept | Purpose |
| --- | --- |
| Organisation | Owns shared Hub resources and organisation-level settings. |
| Membership | Connects a user to an organisation and controls whether that access is active. |
| Current organisation | Selects the organisation context used to scope Hub activity. |
| Role assignment | Grants permissions within an organisation and can optionally narrow access to selected resources. |

## Ownership and isolation

Describe which resources are owned by an organisation, which data remains personal to a user, and how Hub keeps data isolated when a user belongs to multiple organisations.

Include a diagram showing the relationship between an organisation, its members, roles, sites, groups, devices, and media.

## Creating an organisation

Document who can create an organisation, the required and optional organisation details, and what happens after creation.

Cover the following areas:

- General details, including the organisation name and description.
- Company information.
- Primary, technical, and financial contacts.
- Billing address and regional defaults.
- The organisation that becomes current after creation.

## Switching organisations

Explain how to use the organisation switcher, which organisations are listed, and how the selected organisation changes the resources shown throughout Hub.

Add screenshots for the current organisation, the open switcher, the empty state, and organisation creation.

## Members and access

Explain the difference between organisation ownership, membership, and role-based access. Document the membership lifecycle, invitations, expiry, suspension, and revocation as these capabilities become available in Hub.

For permission details, see [Roles]({{< ref "/docs/hub/roles" >}}).

## Organisation settings

Document organisation-level settings and identify which roles can change them. Keep account preferences that follow an individual user separate from settings shared by every organisation member.

## Domains and organisations

Clarify that a login domain provides a username and sign-in namespace, while an organisation provides the ownership boundary for resources. A domain does not automatically combine its users into one organisation.

For login-domain configuration, see [Domains]({{< ref "/docs/hub/domains" >}}).

## Configuration and rollout

Document the feature flags used to enable organisation switching and creation, including their dependency and deployment defaults.

## Migrating existing accounts

Describe how existing owner and sub-user accounts map to organisations, how access is preserved during migration, and which compatibility limitations apply while legacy resources are being moved to organisation ownership.

## Troubleshooting

Cover common problems such as an unavailable organisation list, a missing current organisation, a failed switch, and resources that are not yet visible in the selected organisation.