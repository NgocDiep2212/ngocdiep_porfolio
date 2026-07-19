---
id: proj-job-matcher
section: projects
title: AI Job Matcher — Code-Orchestrated Pipeline
tags: [python, claude, crewai, sqlite, streamlit, llm]
updated: 2026-07-19
---

## Overview

AI Job Matcher — Multi-Agent AI Pipeline redesigned into a code-orchestrated system. Stack: Python, Claude API, CrewAI (v1), SQLite, Streamlit, Jinja2, Function Calling.

## Architecture

Redesigned a 5-agent CrewAI system into a 7-stage code-orchestrated pipeline — LLMs only for CV parsing, enrichment, and scoring; search, validation, calculations, and report generation handled deterministically in code.

Built persistent SQLite state (cv_cache + jobs.db), structured outputs, retry/error handling, and per-run token/cost monitoring for incremental runs and observability.

## Impact (measured from run logs)

- 8× fewer LLM tokens (about 200K → about 25K)
- 85–90% lower operating cost ($0.65–0.87 → $0.03–0.12)
- 4× faster execution (6–11 min → about 2 min)

## Links

- Live demo: https://fabulous-daifuku-d8e73d.netlify.app/
- GitHub: https://github.com/NgocDiep2212/ai_job_matcher
