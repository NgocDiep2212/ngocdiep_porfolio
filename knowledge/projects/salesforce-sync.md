---
id: proj-salesforce-sync
section: projects
title: Salesforce Account & Contact Sync
tags: [n8n, salesforce, google-sheets, soql, crm]
updated: 2026-07-19
---

## Overview

Salesforce Account & Contact Sync — CRM data integration. Stack: n8n, Salesforce REST API, Google Sheets, SOQL, dedup logic, audit trail.

Flow: Google Sheets → validate → deduplicate → Salesforce upsert → audit trail write-back. Idempotent and safe to re-run.

## What was built

- Idempotent n8n sync: Google Sheets → field validation → SOQL lookup for existing accounts → dedup merge → Salesforce create/update → contact upsert by Email.
- Validation gate routes invalid rows to error path; dedup logic prevents double-writes on re-run.
- Full audit trail writes Success/Failed status, record ID, error message, and timestamp back to the source Sheet.

## Impact

- 100% dedup-safe; full audit trail; 0 data loss risk by design.
- Demo audit sheet with synthetic test cases available on the portfolio.
