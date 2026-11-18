---
date: '2025-11-08T10:29:28Z'
title: 'Support'
description: Find an answer in the documentation, or reach the team that builds the platform by email or phone.
# Self-service resources, shown before the contact channels.
resources:
  - title: Documentation
    icon: book-open
    link: /docs/
    text: Install, configure and operate Agent, Factory, Vault and Hub.
  - title: Quick start
    icon: lightning-bolt
    link: /docs/prologue/quick-start/
    text: Get a first camera recording and visible in Hub.
  - title: Tutorials
    icon: academic-cap
    link: /tutorials/
    text: Step-by-step walkthroughs for common setups and integrations.
  - title: Knowledge base
    icon: question-mark-circle
    link: /knowledge-base/
    text: Answers to frequently asked questions for each product.
  - title: Guides
    icon: light-bulb
    link: /guides/
    text: How we build, deliver and secure the platform.
  - title: Release notes
    icon: tag
    link: /release-notes/
    text: Check whether a recent release changed or fixed what you are seeing.
# Ways to reach the team. The id links each channel to the guide below.
channels:
  - id: email
    title: Email support
    icon: mail
    text: Technical issues, account and billing questions. Your request reaches the engineers who build the platform.
    note: Check [what to include](#how-to-get-the-best-support) before you send it.
    links:
      - label: support@uug.ai
        url: mailto:support@uug.ai
  - id: phone
    title: Phone
    icon: phone
    text: For urgent production issues, or when talking it through is quicker than writing it down.
    links:
      - label: +32 9 390 80 78
        url: tel:+3293908078
  - id: contact
    title: Contact form
    icon: chat-alt-2
    text: New projects, pricing, partnerships and integration questions.
    links:
      - label: uug.ai/contact
        url: https://uug.ai/contact
  - id: github
    title: GitHub
    icon: github
    text: Agent, Factory and Vault are open source. Report bugs and request features in their public repositories.
    links:
      - label: github.com/kerberos-io
        url: https://github.com/kerberos-io
  - id: security
    title: Security reports
    icon: shield-check
    text: Email us with "Security report" in the subject, never in a public issue. We confirm receipt within three working days.
    links:
      - label: Disclosure policy
        url: https://uug.ai/security
# Guide to the right channel: a topic leads to a channel, or to the urgency question.
guide:
  topics:
    - label: Something is not working
      hint: An error, a failed setup, a camera or recordings
      ask: urgency
    - label: Account or billing
      hint: Access, users, subscriptions and invoices
      channel: email
    - label: A bug or feature request
      hint: In the open-source Agent, Factory or Vault
      channel: github
    - label: A new project or pricing
      hint: Plans, quotes, partnerships and integrations
      channel: contact
    - label: A security vulnerability
      hint: Report it privately, never in a public issue
      channel: security
  urgency:
    - label: Yes, production is down or recordings are at risk
      channel: urgent
    - label: No, but it blocks my work
      channel: email
  # Shown for production emergencies, with email and phone together.
  urgent:
    title: Production emergency
    icon: fire
    text: Make the impact and urgency explicit, so the right person picks it up first.
    steps:
      - Email support@uug.ai with **URGENT** in the subject line.
      - Call **+32 9 390 80 78** to make sure it is picked up.
      - Describe the impact, which sites, users or operations are affected, and when it started.
    links:
      - label: Email with URGENT
        url: mailto:support@uug.ai?subject=URGENT
      - label: Call +32 9 390 80 78
        url: tel:+3293908078
# How to get the best support.
before:
  - Press <kbd>Ctrl</kbd> <kbd>K</kbd> to search Learn and the knowledge base for the exact error message.
  - Check the release notes for a recent change or fix.
  - For open-source products, look for a similar issue on GitHub.
include:
  - What failed, the exact error message, and what you expected instead.
  - The product, its version and your environment, such as browser or operating system.
  - The steps to reproduce it and what you have already tried.
  - Screenshots or logs where they help.
never: Never send passwords, API keys or private footage. Share the relevant context, not a dump of every configuration file.
---

Stuck on a setup, chasing an error or planning something new? Most answers are
already on Learn. When they are not, you reach the people who build the
platform directly.
