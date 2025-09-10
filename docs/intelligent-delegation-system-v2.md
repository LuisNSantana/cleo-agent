# Intelligent Delegation System v2 (Cleo)

This document explains how Cleo routes user requests to the right specialist agent using an intent analyzer with fuzzy matching, multilingual keywords, calibrated scoring, and clarification prompts.

## Overview

- Purpose: Reduce friction and ambiguity, so users don’t need perfect keywords. Cleo detects intent and delegates to the best specialist: Ami, Emma, Toby, Peter, or Apu.
- Key capabilities:
  - Fuzzy matching (Levenshtein) for typos and variants (en/es)
  - Bilingual keywords and contextual phrases
  - Weights per signal type (primary/secondary/contextual/exclusions)
  - Confidence thresholds and clarification questions
  - Suggested task extraction for concise subtask titles

## Components

- `lib/agents/delegation/intelligent-analyzer.ts`:
  - Keyword patterns per agent (primary, secondary, contextual, exclusions)
  - Fuzzy match helper with Levenshtein
  - Scoring and confidence computation
  - Clarification logic for close scores
  - Task extraction (short, action-oriented title)
- Integration points:
  - `app/api/chat/route.ts` and `app/api/multi-model-chat/route.ts` use the analyzer to pick a delegate tool (e.g., `delegate_to_emma`).

## Scoring & Confidence

- Weights:
  - contextual: 4
  - primary: 3
  - secondary: 2
  - exclusion: -3
- Confidence:
  - high (>= 0.8): auto-delegate
  - medium (>= 0.6): delegate, but may ask for a quick confirmation
  - below 0.6: ask a clarification before delegating

## Fuzzy Matching

- `fuzzyIncludes(text, keyword, tolerance)`: uses Levenshtein to tolerate typos and accent variants.
- Typical tolerances:
  - contextual: 0.85
  - primary: 0.88
  - secondary: 0.90

## Agent Focus Areas

- Ami (General Assistant & Lifestyle): calendar, reservations (OpenTable/Booking.com), places near me, contact/company lookups (LinkedIn), practical search.
- Emma (E-commerce/Shopify): analytics (AOV, LTV, ROAS, CR), products, orders, collections, trends, conversion.
- Toby (Technical): code, APIs, databases, Supabase, Next.js/React/Tailwind, performance, errors, deployments.
- Peter (Google Workspace): Docs/Sheets/Drive/Calendar/Gmail/Slides/Forms, permissions, templates, Apps Script.
- Apu (Research & Market Analysis): competitive analysis, market size, datasets, sources, reports, trends.

## Clarification Questions

When scores are close or confidence is low, Cleo asks a targeted question, e.g.:
- Ami vs Emma: “Is this about general lifestyle/organization or about your Shopify store?”
- Toby vs Apu: “Do you need technical implementation or data analysis and market insights?”
- Peter vs Emma: “Workspace productivity or store management and analytics?”

## Suggested Task Extraction

- Strips “can you/could you/please/help me/I need/I want to” and punctuation.
- Capitalizes first letter.
- Example:
  - Input: “Can you find me a great sushi place near me?”
  - Output: “Find a great sushi place near me”

## Extending Patterns

1) Add synonyms/brands/acronyms in English/Spanish.
2) Add exclusions to reduce false positives (e.g., Emma excludes technical jargon only when relevant).
3) Calibrate thresholds after observing logs.

Minimal checklist to add a new agent:
- Add pattern entry to `AGENT_PATTERNS`.
- Add metadata in `AGENT_METADATA` with display name and `delegate_to_*` tool.
- Add clarifications for common confusion pairs.

## Examples

1) “Reserva una mesa para 2 hoy a las 8pm en un italiano cerca de mí”
- Ami triggers via contextual phrases and reservation vocabulary.

2) “Show me bestselling products and conversion trends for my store”
- Emma triggers via ecommerce KPIs and “my store” context.

3) “Next.js API route returns 500 after deployment”
- Toby triggers via technical stack terms and error context.

4) “Compare competitor market share and cite sources”
- Apu triggers via research verbs and source/dataset keywords.

5) “Create a Google Sheet with a summary table and share with the team”
- Peter triggers via Sheets/permissions/collaboration language.

## Operational Notes

- Logs: ensure the chat endpoints emit analyzer scores and chosen agent for quick tuning.
- Safety: Exclusions reduce obvious mismatches; update regularly.
- Language: We include accent/non-accent Spanish forms to avoid misses.

## Roadmap Ideas

- N-gram phrase embeddings for tie-breakers.
- Lightweight semantic router with few-shot patterns as “hints”.
- Per-user personalization (preferred agents, domains).
