---
id: proj-support-triage
section: projects
title: AI Support Triage & RAG Response Pipeline
tags: [n8n, gmail, gemini, qdrant, cohere, hubspot, telegram, rag, rerank]
updated: 2026-07-20
---

## Overview

AI Support Triage & RAG Response Pipeline. Stack: n8n, Gmail, Google Gemini, Qdrant, Cohere Rerank, HubSpot CRM, Telegram, Human-in-the-Loop.

Flow: Gmail intake → Gemini triage → HubSpot ticket → RAG (Qdrant + Cohere rerank) → confidence-gated draft → Telegram HITL → Gmail reply.

## What was built

- n8n main workflow: Gmail intake → Gemini AI triage (category / priority / sentiment / team routing) → HubSpot ticket create/update with full contact resolution.
- Dedicated retrieve sub-workflow called as an agent tool: Qdrant similarity search (topK 8) + Gemini embeddings + Cohere reranker.
- retrievalConfidence (high / medium / low) derived from rerank scores; needsEscalation when confidence is low — AI must not answer from its own knowledge.
- Telegram approval gate before every customer reply; HubSpot pipeline stages for waiting-on-us vs waiting-on-customer after approve/reject.

## Impact

- Reduced manual ticket classification from about 5 minutes to under 30 seconds per inbound email.
- 95%+ auto-classified; 0 manual routing steps.
- Downloadable main workflow JSON and Retrieve Document sub-workflow JSON on the portfolio.
