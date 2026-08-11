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

Organisation-owned data is shared by the people who have access to that organisation. This includes operational resources such as sites, groups, devices, recordings, workflows, alerts, cases, and shared integrations. A user's profile, sign-in credentials, and personal preferences continue to belong to the user.

Hub resolves the current organisation for every authenticated request. Lists and actions are scoped to that organisation, so changing organisation changes the working context across Hub rather than combining data from several organisations in one view.

An organisation has one owner, but can have multiple members. A user can also own multiple organisations or combine ownership in one organisation with membership in another.

## Creating an organisation

When organisation creation is enabled, open the organisation menu below the Hub logo and select **Create organisation**. Any signed-in user with access to this action can create an organisation. The creator becomes its owner and receives an active membership.

The form is divided into three tabs:

- **General** contains the organisation name, domain, and description. The name is required and must contain between 2 and 120 characters.
- **Company** contains the legal name, trading name, industry, and website.
- **Contact & location** contains a company email address and phone number, together with the billing street, city, region, postal code, and country.

All fields except the organisation name are optional. After Hub creates the organisation, it selects the new organisation as the current context and reloads the application with that context.

The optional organisation domain is metadata stored on the organisation. It does not configure the subdomain-based login feature described in [Domains]({{< ref "/docs/hub/domains" >}}).

## Switching organisations

The current organisation is shown below the Hub logo in the sidebar. When switching is enabled, select this area to open the organisation menu. The menu contains:

- The organisation currently selected for your account.
- Organisations you own.
- Organisations for which you have an active, unexpired membership.

Select an organisation to make it current. Hub saves the selection to your user account, refreshes your authenticated session, and reloads the application so cached data from the previous organisation is discarded. After the reload, pages such as Devices, Recordings, Cases, and Workflows show resources for the selected organisation.

Switching does not change your membership or permissions. It only changes the organisation in which those permissions are evaluated.

## Members and access

Ownership, membership, and roles answer different access questions:

- **Ownership** identifies the user responsible for the organisation. Creating an organisation makes the creator its owner.
- **Membership** determines whether a user can enter the organisation. Only active memberships that have not expired are included in the organisation switcher.
- **Roles and permissions** determine which pages, resources, and actions a member can use after entering the organisation.

The organisation model supports pending, active, suspended, and revoked memberships, as well as an optional expiry date. Invitation and membership-management screens are not part of the initial organisation-switcher rollout. Existing account and subaccount administration remains the way to manage user access during this phase.

For permission details, see [Roles]({{< ref "/docs/hub/roles" >}}).

## Organisation settings

Organisation records can hold shared company details, billing information, regional defaults, contacts, and access-policy settings. These values belong to the organisation and therefore remain the same regardless of which member is viewing it.

The initial Hub interface exposes the company and billing fields while creating an organisation. A dedicated settings screen for editing organisation details, membership policy, multi-factor authentication requirements, allowed email domains, and regional defaults is not yet included in this rollout.

User profile settings remain personal and follow the user when they switch organisations.

## Domains and organisations

A login domain and an organisation solve different multi-tenancy problems:

- A **login domain** provides a sign-in and username namespace through the Hub hostname. It allows the same visible username to exist in different domains.
- An **organisation** owns resources and provides the context in which members work after signing in.

A domain does not automatically combine its users into one organisation. Existing domain-prefixed users keep their login namespace when organisations are introduced. Likewise, setting the domain field on an organisation does not create DNS records or enable domain-based login.

For login-domain configuration, see [Domains]({{< ref "/docs/hub/domains" >}}).

## Configuration and rollout

Organisation switching and creation are opt-in frontend features in the Hub Helm chart. Both are disabled by default:

```yaml
kerberoshub:
  frontend:
    features:
      organisations:
        switcherEnabled: "true"
        creationEnabled: "true"
```

`switcherEnabled` makes the current-organisation display interactive and loads the list of organisations available to the user. When it is `"false"`, Hub still displays the current organisation as read-only context.

`creationEnabled` adds the creation action to the organisation menu. It only has a visible effect when `switcherEnabled` is also `"true"`.

The chart maps these values to `FEATURE_ORGANISATION_SWITCHER_ENABLED` and `FEATURE_ORGANISATION_CREATION_ENABLED` in the frontend container.

## Migrating existing accounts

Existing installations must establish organisation identities before enabling organisation switching. The organisation bootstrap creates one canonical organisation for each existing owner account, selects it for that owner, and creates the membership links needed to preserve owner and sub-user access. It does not combine several owner accounts into one organisation.

Resource ownership is migrated separately. During that transition, Hub services use compatibility reads and writes so existing resources remain available while canonical organisation ownership is added. A deployment should complete and verify the organisation bootstrap and the resource-ownership migration before treating switching as generally available.

Existing login domains are preserved. They remain sign-in namespaces and are not copied into the organisation domain field.

## Troubleshooting

### The current organisation is visible but cannot be selected

Organisation switching is disabled. Set `kerberoshub.frontend.features.organisations.switcherEnabled` to `"true"` and redeploy the Hub frontend.

### The create action is missing

Creation requires both organisation flags. Set `creationEnabled` and `switcherEnabled` to `"true"`. If creation is enabled by itself, Hub does not display the action because there is no organisation menu in which to place it.

### Hub shows "No organisation"

Hub could not find a current organisation and the organisation list is empty. Verify that the account has been included in the organisation bootstrap. An owner should have a canonical organisation and active owner membership; a sub-user should have an active membership in the relevant organisation.

### The organisation list is unavailable

The list request failed rather than returning an empty list. Check that the versioned Hub API organisation routes are deployed and reachable, and inspect the Hub API logs for the request error.

### Switching fails or returns to the previous organisation

Hub only permits switching to an organisation the user owns or can access through an active, unexpired membership. Confirm the membership state and expiry. A successful switch must also return a refreshed session token; deployments using mismatched frontend, API, or shared-model versions can fail at this step.

### Resources are missing after switching

First confirm the organisation shown in the sidebar. If it is correct, verify that resource ownership migration has completed for the affected resource type. A membership grants access to the organisation, but it does not move legacy resources from another owner scope into that organisation.