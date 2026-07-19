---
id: proj-onboarding
section: projects
title: Customer Onboarding Automation
tags: [n8n, hubspot, email, drip, crm]
updated: 2026-07-19
---

## Overview

Customer Onboarding Automation. Stack: n8n, HubSpot, email drip sequence.

Flow: Webhook intake → validate → HubSpot contact creation → 5-touch email drip sequence → CRM milestone updates. Zero manual steps from signup to week-one guide.

## What was built

- Validates required fields (name, email, company); sends Telegram alert and stops if invalid.
- Creates HubSpot contact and runs a multi-touch email drip with CRM milestone updates along the way.
