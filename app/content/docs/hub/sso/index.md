---
title: "SSO"
description: "Use your own Identity Provider through OpenID Connect (OIDC)"
lead: "Use your own Identity Provider through OpenID Connect (OIDC)"
date: 2020-10-06T08:49:31+00:00
lastmod: 2026-10-29T17:26:00+00:00
draft: false
images: []
menu:
  hub:
    parent: "hub"
weight: 305
toc: true
podcast: hub-sso
---

This guide covers the integration details for single sign-on (SSO) through OpenID Connect (OIDC). For an overview of all sign-in options, including passwords, authenticator-based 2FA, passkeys, and recovery, start with [Authentication](/docs/hub/authentication).

Hub supports multiple users with access controlled by [organisations, projects](/docs/hub/organisations), and [roles](/docs/hub/roles). Local sign-in uses a username or email address and a Hub password. OIDC delegates authentication to an external identity provider so users can use their centrally managed identity rather than another application-specific password.

{{< figure src="hub-add-account.gif" alt="Give another user limited access to Hub by creating a sub account." caption="Give another user limited access to Hub by creating a sub account." class="stretch">}}

Hub can be linked to multiple OIDC providers. Depending on the domain you use to sign in (`@customer1.com` or `@customer2.com`), you will be redirected to the relevant OIDC provider. You can use the following `environment variables` to configure one or more SSO domains having the specific `SSO credentials`; more information can be found in the [Configuration](#configuration) section.

    sso: # OIDC settings for allowing SSO.
      - domain: "uug.ai"
        redirectUrl: "https://api.cloud.kerberos.io/sso/callback/uug.ai"
        issuer: "https://xxx.eu.auth0.com/"
        claimId: "email"
        clientId: "xxx"
        clientSecret: "xxx"
        clientVerificationId: "" # This is only required for SSO chaining.
      - domain: "kerberos.io"
        redirectUrl: "https://api.cloud.kerberos.io/sso/callback/kerberos.io"
        issuer: "https://accounts.google.com"
        claimId: "email"
        clientId: "xxx"
        clientSecret: "xxx"
        clientVerificationId: "" # This is only required for SSO chaining.
      - ...

Once authenticated with the OIDC provider, you are redirected back to the configured `redirectUrl`. Hub exchanges the authorization code and verifies the returned ID token, then locates an existing Hub user by the returned identity's email address or username. Create that matching user in Hub before signing in; this flow does not automatically provision an account.

The identity provider manages the password and MFA policy for OIDC sign-in. Hub's local 2FA challenge and **force MFA** enrolment apply to password sign-in, not this OIDC flow. An existing local Hub password is not removed by configuring SSO; it is also still required when adding or removing Hub passkeys.

{{< figure src="sso-kerberos-hub.gif" alt="Example of how SSO works with Hub." caption="Example of how SSO works with Hub." class="stretch">}}

## Configuration

To configure Hub with one or more OIDC providers you'll need to provide a configuration in the `values.yaml` file (as shown above). Each OIDC provider is assigned to a domain, which is then activated by signing in. For example, if your user signs in with an email address like `tom@uug.ai`, the user will be redirected to the `auth0` OIDC provider; if signing in with an email address like `john@kerberos.io`, the user will be redirected to the `google` OIDC provider.

### Microsoft Entra (Azure Active Directory)

To connect an existing Azure Active Directory to your Hub instance, you might go through [Microsoft's tutorial on creating an app registration in Azure](https://learn.microsoft.com/en-us/power-pages/security/authentication/openid-settings#create-an-app-registration-in-azure). By creating a new app registration in Microsoft Entra, you'll obtain a client ID and client secret. Next to that you'll need to provide the `redirectUrl` variable, so Microsoft Entra knows to which endpoint it should send the tokens for authorisation.

After creating the new `App registration`, you should be able to extract the following details:

- issuer: https://login.microsoftonline.com/{yourtenantid}/v2.0
- clientId: Application (client) ID
- clientSecret: Client secret **value**, not the secret's identifier
- redirectUrl: this is something that you have configured in the Hub Helm chart, but also need to add in your Azure tenant.

### Other OIDC providers

As mentioned above with Microsoft Entra, you will have plenty of other providers such as Google, Auth0, etc. Each of those providers has its own UI to configure the Hub application.

## SSO Chaining

Having SSO enabled for your Hub simplifies the login experience for your end users, as they do not have to remember specific credentials for the Hub application. Next to that you might want to include Hub into an existing application, for example using an `iframe`, where that existing application might already use OIDC for single sign-on.

An elegant way to boost the user experience for your end users is to reuse the OIDC authentication of the surrounding application for the Hub application which is embedded. 

{{< figure src="sso-chaining.gif" alt="Forward existing access token to Hub to SSO." caption="Forward existing access token to Hub to SSO." class="stretch">}}

To make this work you'll need to set up both applications with OpenID Connect (OIDC). This means that the "wrapper" application will need a configuration setup with the OIDC provider (for example Auth0 in the previous example), and Hub should have a similar configuration with the same OIDC provider.

However, there is a difference with this setup, as Hub will not be responsible for running the authentication against the OIDC provider; the wrapper application is responsible here. What is happening is that the `accessToken` which is received by the wrapper application is forwarded (or chained) to the Hub application. The Hub application will receive the `accessToken` on the verification URL: `https://hub.kerberos.io/sso/verify/{domain}?accesstoken={accessToken}`, and will use the `clientVerificationId` value for the specific `domain` you defined.

What happens behind the scenes is that Hub will look for the SSO definition you have provided in the Helm chart, by selecting the `domain` you've defined.

    - domain: "uug.ai"
      redirectUrl: "https://api.cloud.kerberos.io/sso/callback/uug.ai"
      forceSSO: "false"
      issuer: "https://uugai.eu.auth0.com/"
      claimId: "email"
      clientId: "xxx"
      clientSecret: "xxx"
      clientVerificationId: "NSkr7Ezyyyyyyyyz8HqmF2iGDb" # This is only required for SSO chaining.

The `clientVerificationId` should be the same clientId you have used to configure the wrapper application, otherwise you will not be able to validate the `accessToken`. Once validated, the user credentials are extracted from the `accessToken` and the user is automatically signed in.

## Force SSO for Domain

When leveraging the domain feature, you can force the SSO usage by setting the `forceSSO` value to `true`. This will make sure that once you arrive on the domain page, the SSO redirection is shown by default and the username/password fields are hidden.

This option also hides the local passkey selector. It changes the login screen; do not treat it alone as an API-wide policy that disables local password or passkey authentication.

{{< figure src="force-sso-domains.gif" alt="Forcing SSO for domains hides the username and password fields." caption="Forcing SSO for domains hides the username and password fields." class="stretch">}}

### Configuration

To make this work you might need to create two different app registrations with two different callback URLs:
  - an application registration for the wrapper application with a specific `redirectUrl` to the wrapper application.
  - (optional) an application registration for Hub with a `redirectUrl` to `https://hub.kerberos.io/sso/callback/{domain}`.
  
By creating two app registrations you will be able to SSO against both applications independently. Once you have obtained the different credentials for each app registration: `issuer`, `clientId` and `clientSecret`, you also need to make sure a correct `redirectUrl` is configured in the chosen OIDC provider (this is typically configured through the OIDC provider's web UI).

While having both applications set up with their own OIDC configuration (targeting the same OIDC provider), you can now close the loop by configuring the `clientVerificationId`. This value should equal the `clientId` of the wrapper application. You can simply copy-paste the `clientId` into the `clientVerificationId` value and you are done.

Once you have deployed this new configuration and set up the relevant wrapper application, you will be able to receive an `accessToken` from the OIDC provider. By sending that `accessToken` to the following endpoint `https://hub.kerberos.io/sso/verify/{domain}?accesstoken={accessToken}`, it will be validated against the `clientVerificationId` value in your Hub configuration (linked to the specific domain).

By embedding the following URL `https://hub.kerberos.io/sso/verify/{domain}?accesstoken={accessToken}` in, for example, an `iframe`, you will be seamlessly logged in to Hub without providing any credentials.

## Database

As detailed above you can configure your Hub tenant to include one or more SSO domains. Depending on the user's domain name or suffix, you redirect a user to a specific SSO domain which authenticates the user on your behalf. 

There are two options to configure the SSO domain feature.

1. Through environment variables as described above.
2. Using the database and by creating an entry in the `settings` collection.

### Environment variables

Within the `values.yaml` of the Hub installation you have the option to specify one or more SSO domains by creating separate list items. When applying the `values.yaml` configuration you will have those SSO domains available in the Hub application. 

    sso: # OIDC settings for allowing SSO.
      - domain: "uug.ai"
        redirectUrl: "https://api.cloud.kerberos.io/sso/callback/uug.ai"
        forceSSO: "false"
        issuer: "https://xxx.eu.auth0.com/"
        claimId: "email"
        clientId: "xxx"
        clientSecret: "xxx"
        clientVerificationId: "" # This is only required for SSO chaining.
      - domain: "kerberos.io"
        redirectUrl: "https://api.cloud.kerberos.io/sso/callback/kerberos.io"
        forceSSO: "false"
        issuer: "https://accounts.google.com"
        claimId: "email"
        clientId: "xxx"
        clientSecret: "xxx"
        clientVerificationId: "" # This is only required for SSO chaining.
      - ...

### Database

Another possibility to provide SSO domains is by defining them in the database. By creating a new item in the `settings` collection of your database, your Hub application will read the SSO domains into memory.

    { 
        "_id" : ObjectId("xxxxx"), 
        "key" : "sso", 
        "map" : {
            "uug.ai" : {
                "domain" : "uug.ai", 
                "redirect_url" : "https://xxxx/sso/callback/uug.ai",
                "force_sso": "false",
                "issuer" : "https://uugai.xxx.com/", 
                "claim_id" : "email",
                "client_id" : "xxxx", 
                "client_secret" : "xxxx", 
                "client_verification_id" : "xxxx"
            },
            "kerberos.io" : {
                "domain" : "kerberos.io", 
                "redirect_url" : "https://xxxx/sso/callback/kerberos.io",
                "force_sso": "false",
                "issuer" : "https://kerberosio.xxx.com/", 
                "claim_id" : "email",
                "client_id" : "xxxx", 
                "client_secret" : "xxxx", 
                "client_verification_id" : "xxxx"
            }
        }
    }