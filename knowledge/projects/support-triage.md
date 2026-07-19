---
id: proj-support-triage
section: projects
title: AI Support Triage & RAG Response Pipeline
tags: [n8n, gmail, gemini, qdrant, hubspot, telegram, rag]
updated: 2026-07-19
---

## Overview

AI Support Triage & RAG Response Pipeline. Stack: n8n, Gmail, Google Gemini, Qdrant, HubSpot CRM, Telegram, Human-in-the-Loop.

Flow: Gmail intake → AI classify → RAG knowledge search → HubSpot ticket → human-approved reply. Zero manual routing.

## What was built

- n8n workflow: Gmail intake → Gemini AI triage (category / priority / sentiment / team routing) → HubSpot ticket create/update with full contact resolution.
- RAG retrieval (Qdrant + Gemini embeddings) with strict no-hallucination rules — AI answers only from uploaded company knowledge base, escalates when KB is insufficient.
- Telegram approval gate before every customer reply is sent; ticket pipeline stages updated automatically on approve or reject.

## Impact

- Reduced manual ticket classification from about 5 minutes to under 30 seconds per inbound email.
- 95%+ auto-classified; 0 manual routing steps.
- Downloadable n8n JSON available on the portfolio.
