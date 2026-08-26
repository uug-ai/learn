---
title: "Organisations"
description: "Understand how organisations, projects, memberships, roles, and resources fit together in Kerberos Hub."
lead: "Understand how organisations and projects separate ownership, access, and resources in Kerberos Hub."
date: 2026-08-11T00:00:00+00:00
lastmod: 2026-08-25T00:00:00+00:00
draft: true
images: []
menu:
  hub:
    parent: "hub"
weight: 303
toc: true
---

An organisation is the ownership and access boundary being introduced for shared resources in Kerberos Hub. The target model places sites, groups, devices, recordings, workflows, alerts, and other shared resources in an organisation rather than assigning them to an individual member.

A user can own or belong to more than one organisation. The **current organisation** selects the context used by organisation-aware requests. During the rollout, the current selection, ownership, and active memberships determine which organisations a user can select, while the existing account role and resource permissions remain authoritative for what that user can do.

> [!NOTE] Feature flags
> Organisation and project controls are opt-in and hierarchical. The organisation umbrella can override both families; otherwise their group and child flags apply independently. See [Feature flags]({{< ref "/docs/hub/feature-flags" >}}#organisations-and-projects) before enabling switching, creation, or settings.

## Core concepts

| Concept | Current rollout |
| --- | --- |
| Organisation | Identifies the target owner of shared Hub resources and organisation-level settings. |
| Project | Provides an operational and access boundary inside one organisation. Every project belongs to exactly one organisation. |
| Membership | Connects a user to an organisation and allows an active, unexpired relationship to appear in the organisation switcher. Membership alone grants no capabilities. |
| Current organisation | Selects the organisation context used by organisation-aware Hub activity. |
| Current project | Selects the project context used by project-aware Hub activity. It is navigation state, not proof that the user may access the project. |
| Role | Defines what actions a member may perform. Roles belong to an organisation and can be reused in its projects. |
| Role assignment | Part of the target organisation RBAC model. Canonical role assignments are not yet the live authorization source. |

## Organisation and project structure

An organisation is the parent identity, membership, billing, and policy boundary. A project is a child boundary used to isolate operational resources and access within that organisation.

```text
Organisation
├── Members
├── Roles
├── Project A
│   ├── Sites
│   ├── Groups
│   ├── Devices
│   └── Recordings and derived data
└── Project B
    ├── Sites
    ├── Groups
    ├── Devices
    └── Recordings and derived data
```

The same user identity can be a member of several organisations. Within an organisation, the user may be authorized for one project, several projects, or the complete organisation. Hub does not create a separate user account for each project.

The records have separate responsibilities:

| Record | Relationship | Responsibility |
| --- | --- | --- |
| User | One person or service identity | Sign-in, profile, preferences, and current organisation/project selections. |
| Organisation membership | User + organisation | Membership lifecycle such as pending, active, suspended, revoked, or expired. It grants no capabilities by itself. |
| Project | Project + organisation | Names an access and resource boundary inside the organisation. |
| Role | Role + organisation | Defines capabilities such as viewing live video or managing devices. |
| Role assignment | User + organisation + role + scope | Grants a role to a member and says where that grant applies. |
| Operational resource | Resource + organisation + project | Places a site, group, device, recording, or derived result inside one project boundary. |

Organisation memberships and role assignments are sibling records joined by the same user and organisation identifiers. A role assignment is valid only while the corresponding membership is active and unexpired. Assignments are not embedded in the membership, so membership lifecycle and authorization lifecycle can be managed independently.

## Project access

The target authorization model uses scoped role assignments. The role answers **what may this member do?** and its scope answers **where may they do it?**

For example, one member could have:

```text
Security operator in Project A
  Sites: Brussels office
  Groups: Perimeter cameras
  Devices: Reception camera

Viewer in Project B
  Resources: all resources in Project B
```

These are two role assignments for the same organisation membership. Use a separate assignment when the role, project, expiry, or source of the grant differs. Effective access is the union of all active, unexpired assignments, but every grant remains constrained to its own project.

Organisation-wide access must be explicit. A missing or empty restricted scope must never silently become access to every project. Owners and administrators that need access across the organisation receive an explicit organisation-wide assignment rather than relying on their current project selection.

> [!IMPORTANT] Rollout status
> Scoped role assignments describe the target authorization model. During the current migration, the legacy account role and the user's site, group, and camera allow-lists remain authoritative. Do not remove those legacy grants until the RBAC migration has passed shadow-mode parity checks and the organisation has been switched to the new resolver.

## Sites, groups, and devices

Every project-owned site, group, and device stores both its organisation and project identity. The organisation identifier prevents cross-tenant access; the project identifier prevents a resource from appearing in another project within the same organisation.

A role assignment can grant:

- All resources in one project.
- Selected sites in one project.
- Selected resource groups in one project.
- Selected devices in one project.
- A combination of site, group, and device selections in one project.

Sites and resource groups are useful for reusable batches. For example, assigning the **Perimeter cameras** group grants access to the devices currently in that group. Adding a device to an authorized site or group can therefore grant access immediately and must itself be permission-checked and audited. Explicit device selections are best reserved for exceptions.

All resources referenced by an assignment must belong to the assignment's organisation and project. Hub must reject mixed-project scopes. Moving a site, group, or device to another project is an explicit administrative operation and must not carry incompatible assignments into the destination.

For each resource request, Hub evaluates the following conditions:

```text
active organisation membership
AND active, unexpired role assignment
AND role permits the requested action
AND assignment covers the resource project
AND assignment covers the resource, its site, or its group
```

Database reads apply the organisation and project filters before returning resources. The project selected in the browser narrows the working view, but it never replaces these server-side checks.

## Managing access

Access can be presented through two complementary screens without creating two authorization systems:

- **Organisation > Members** is user-oriented. An administrator selects a member, assigns projects and roles, and optionally restricts access to sites, groups, or devices in each project.
- **Project > Access** is project-oriented. A project administrator sees the members and assignments for that project.

Both screens edit the same role-assignment records. Organisation membership is still managed once at organisation level.

An administrator may need to see project names and assignable site/group/device metadata without being allowed to view live video, recordings, or analytics. Hub treats this as control-plane permission to manage project access, separate from data-plane permission to use the resources. An organisation owner can manage access across projects; a project administrator can manage only the projects covered by their own grant.

When many users need the same access, a future access-team principal can receive one role assignment and users can join that team. Access teams must remain separate from resource groups: a team groups people, while a site or resource group groups operational resources.

## Ownership and isolation

In the target model, organisation-owned data is shared with authorized members of that organisation. This includes operational resources such as sites, groups, devices, recordings, workflows, alerts, cases, and shared integrations. A user's profile, sign-in credentials, active organisation selection, and personal preferences continue to belong to the user.

Organisation-aware Hub paths resolve the current organisation and use it to scope lists and actions. Changing organisation therefore changes the working context rather than combining data from several organisations in one view.

This ownership migration is still in progress. Some resource readers and writers continue to use legacy owner or master-account fields, and compatibility coverage differs by resource type. Until each resource type has completed dual-read, dual-write, and historical backfill, switching can expose incomplete or empty views even when membership is valid.

An organisation has one owner, but can have multiple members. A user can also own multiple organisations or combine ownership in one organisation with membership in another.

## Creating an organisation

When organisation creation is enabled, open the organisation menu below the Hub logo and select **Create organisation**. The current API permits any authenticated user to create an organisation when the frontend action is enabled. The creator becomes its owner and receives an active membership.

The form is divided into three tabs:

- **General** contains the organisation name, domain, and description. The name is required and must contain between 2 and 120 characters.
- **Company** contains the legal name, trading name, industry, and website.
- **Contact & location** contains a company email address and phone number, together with the billing street, city, region, postal code, and country.

All fields except the organisation name are optional. After creation, the frontend attempts to select the new organisation and reload the application with that context. This requires coordinated frontend, Hub API, and shared-model versions that return a refreshed session token after selection. If those versions are not deployed together, the organisation can be created while the automatic switch still fails.

The optional organisation domain is metadata stored on the organisation. It does not configure the subdomain-based login feature described in [Domains]({{< ref "/docs/hub/domains" >}}).

## Switching organisations

The current organisation is shown below the Hub logo in the sidebar. When switching is enabled, select this area to open the organisation menu. The menu contains:

- The organisation currently selected for your account.
- Organisations you own.
- Organisations for which you have an active, unexpired membership.

Select an organisation to make it current. Hub saves the selection to your user account, refreshes your authenticated session, and reloads the application so cached data from the previous organisation is discarded. Organisation-aware pages then request resources in the selected context. Pages that still depend on legacy ownership may remain incomplete until their resource migration is finished.

Switching does not change your membership or permissions. During this rollout, legacy account roles and the user's site, group, and camera allow-lists remain authoritative; canonical organisation role assignments are planned for a later RBAC migration.

## Members and access

Ownership, membership, and roles answer different access questions:

- **Ownership** identifies the user responsible for the organisation. Creating an organisation makes the creator its owner.
- **Membership** allows a non-owner to select an organisation. Only active memberships that have not expired are included in the organisation switcher, and membership alone grants no capabilities.
- **Roles and permissions** currently come from the existing account role and resource allow-lists. Organisation-scoped roles and assignments are the target authorization model, not the live authority in this phase.

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

Organisation switching and creation are opt-in frontend features. Their Helm values are part of the pending organisation rollout and are not present in the current `main` chart. Once using a chart version that includes them, both values default to `"false"`:

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

Existing installations must establish organisation identities before enabling organisation switching. The organisation bootstrap creates one canonical organisation for each existing owner account, initializes a missing current-organisation selection, and creates the membership links needed to preserve owner and sub-user access. Existing valid selections take precedence over the migration default. The bootstrap does not combine several owner accounts into one organisation.

Resource ownership is migrated separately and one collection at a time. Compatibility reads and writes are not yet complete across every resource type. The current resource-backfill command performs dry-run inventory only: live writes, index creation, checkpoint resume, and organisation-scoped resolution remain disabled until collection-specific adapters are ready.

A deployment should complete and verify the identity bootstrap, confirm dual-read and dual-write coverage for every enabled resource type, and finish the corresponding historical backfills before treating switching as generally available.

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

First confirm the organisation shown in the sidebar. If it is correct, check the migration readiness of the affected resource type. A membership makes an organisation selectable, but it does not move legacy resources or grant access through the legacy authorization model. The current backfill tooling can inventory affected records but cannot yet perform live resource backfills.