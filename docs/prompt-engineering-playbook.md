# Prompt Engineering Playbook for Cleo Agent

This playbook distills practical techniques to improve response quality, consistency, warmth, and tool synthesis across models.

## 1) Core Principles
- Single-source-of-truth: Keep all global behavior in the system prompt; keep per-feature rules local to feature tools.
- Few-shot > prose: Prefer a handful of targeted examples over long paragraphs.
- Answer-first: Gist upfront; details follow; finish with one crisp next-step.
- Deterministic scaffolds: Use stable section headers and 2–3 bullets per section (prevents model drift).
- Don’t oversteer: Reserve ~30% tokens for the model’s own reasoning/output.

## 2) System Prompt Structure (recommended)
- Order matters. Prepend retrieval context, then a short personalization instruction, then the system prompt.
- Keep the system prompt modular:
  1. Identity & tone (warm, helpful, concise)
  2. Communication rules (headings, bullets, one-liner open, A/B options)
  3. Tool integration rules (never expose tools, always synthesize)
  4. WebSearch formatting rules (Gist → Puntos clave → Fuentes → Próximos pasos)
  5. Optional specialization (developer/journalism)

> Tip: Cap each module at ~8–12 lines. Move long guidance into few-shots.

## 3) Few‑shot Packs (style anchors)
- Keep 3–5 “good” and 1–2 “bad” examples for high-frequency tasks:
  - Product explainer with pros/cons
  - Code refactor suggestion
  - RAG answer with sources
  - Calendar/Drive output (table/tree)
- Co-locate few-shots near the tool rules; don’t bury them at the end of the prompt.

## 4) Synthesis Skeletons (drop‑in templates)
Use explicit section markers; these survive across models:

- Product/tool queries
  1. Warm one‑liner with name + emoji
  2. Qué es y cómo funciona / What it is & how it works (2 bullets)
  3. Ventajas / Pros (max 3)
  4. Contras / Cons (max 3)
  5. Instalación rápida / Quick install (3 steps)
  6. Fuentes (title + domain)
  7. Próximos pasos (A/B/C)

- RAG answers
  1. Resumen (2–3 frases)
  2. Puntos clave (max 3)
  3. Respuesta directa a la pregunta
  4. Fuentes (dedupe)

- Coding help
  1. Diagnóstico breve
  2. Parche mínimo (snippet)
  3. Riesgos/alternativas (1–2)
  4. Próximo paso (comando/test)

## 5) Two‑pass “Critique & Revise” (lightweight)
- Pass 1 (draft): normal answer using skeleton.
- Pass 2 (self‑check): short checklist before sending:
  - ¿Tiene saludo breve, gist y 2–3 bullets?
  - ¿Fuentes deduplicadas, explicadas antes de listarlas?
  - ¿Pregunta final clara?
- Implement via a short post-formatter prompt or rubric; keep it <60 tokens.

## 6) Tool Calling Best Practices
- Always synthesize after tools; never show raw results.
- Brave Search: dedupe by hostname; include 5–6 links max with titles.
- Drive/Calendar: ALWAYS visible en chat (no FILE markers) usando arbol/tabla.
- “No-text” guardrail: Only trigger fallback synthesis if the model produced zero text.
- Post‑formatter (optional): When the model DID produce text, normalize into the skeleton without overwriting content.

## 7) Personality & Carisma
- Control via a compact personality header (type + 3 sliders + emoji toggle).
- Use 1 emoji max in greeting; avoid overuse elsewhere.
- Enthusiasm 60–75% and Proactive On tends to increase perceived charisma without bloating tokens.

## 8) Retrieval (RAG) Guidance
- Prepend retrieved context in a clear block, never interleave with instructions.
- Add a one-line personalization instruction: “Usa CONTEXTO para personalizar; si falta un dato, pide confirmación”.
- Budgeting: reserve 2–3k tokens for output; limit context to ~6k chars unless the model has >128k.
- Secondary pass: if <3 chunks, query for profile/memory to enrich personalization.

## 9) Guardrails & Refusals
- Keep refusal policy short and friendly; offer safe alternatives.
- Don’t apologize multiple times.
- Never mention tool names unless asked.

## 10) Diagnostics & Evals
- Logging (already added): prompt lengths, personality detection, withRag flag, and fallback path.
- Add a minimal “golden set” of 10 prompts per category with expected traits (greeting present, max bullets, sources present). Validate via CI with regex/heuristics.
- Track median response length and presence of closing question.

## 11) Token Hygiene
- Avoid repeating rules; keep a single webSearch rule-block.
- Prefer bulleted imperatives over paragraphs.
- Trim few-shots; rotate them if the system prompt grows too long.

## 12) Implementation Pointers (repo‑specific)
- System prompt modules: `lib/prompts/index.ts` (keep rules tight; move examples to few‑shots).
- Personality prompt: `lib/prompts/personality.ts` (expose sliders; keep compact header for non-verbose mode).
- Web search synthesis: `app/components/chat/use-chat-core.ts` (fallback + optional post‑formatter).
- RAG: `app/api/chat/route.ts` (prepend context + short personalization line).
- Add post‑formatter (optional): normalize model text into the skeleton when webSearch was used and the model produced text.

---

## Quick Wins (apply first)
1) Add a tiny post‑formatter for webSearch answers that already have text: enforce skeleton (Gist → Puntos → Fuentes → Próximos pasos) without overwriting content.
2) Convert long prose in the system prompt to 3–5 bullets; move details into few‑shots close to the relevant tool.
3) Keep a single, short “carisma header” (1 emoji, greet by name) and remove redundant warmth sentences.
4) Maintain a 10‑item golden set and check for: greeting present, ≤3 bullets per section, sources present & deduped, closing question present.

---

## External Best Practices (benchmarked)

- Instruction placement and specificity
  - Put decision-critical rules early (identity → formatting → tool rules). Keep each module concise (8–12 lines). Use bullets over prose. Source: OpenAI Prompt Engineering Guide (2024–2025 updates).
- Output contracts (structured, short sections)
  - Define section headers and max bullets. Prefer examples over long descriptions. Add a tiny self-check rubric to improve adherence. Sources: OpenAI Guides; community rubrics.
- Tool use and synthesis
  - Describe tools tersely in system prompt, but never expose tool internals to users. Always synthesize results; explain findings before listing links; dedupe by hostname. Sources: OpenAI tool use notes; production agent write-ups.
- RAG retrieval and context budgeting
  - Prepend context block; keep it under budget (~6k chars by default). Run a secondary pass for user profile if results are sparse. Sources: Anthropic Contextual Retrieval docs; RAG cookbooks.
- Reasoning without leakage
  - Use internal “plan/review” but do not reveal chain-of-thought. Provide a short “Approach” only if asked. Sources: OpenAI + Anthropic guidance on reasoning.
- Evaluation & iteration
  - Maintain a golden set; use regex/heuristics to check presence of greeting, sections, sources, and closing question. Track median length. Iterate weekly. Sources: community eval guides, internal playbooks.

## Concrete Additions We Implemented

- Client post-formatter for webSearch
  - If model already produced text: append Sources (deduped) and Next steps if missing; language-aware. Lightweight and safe.
- System prompt self-check rubric
  - A silent “quality check” section ensures warmth, structure, sources-before-links, and closing question—without chain-of-thought.
- RAG personalization line
  - A compact instruction to use CONTEXTO for personalization and ask confirmation if a personal datum is missing.

## Suggested Golden Set (starter)

1) “Resume las novedades de Next.js 15 y dame 3 pasos siguientes” → expects: saludo breve, 3 bullets, fuentes dedup, próximos pasos.
2) “Comparar Vite vs Next.js para app pequeña” → pros/cons limitados, recomendación clara, pregunta final.
3) “Crea evento el viernes 10am con Ana” → tabla o lista clara, confirmación de zona horaria, opciones A/B.
4) “Muéstrame mis carpetas recientes en Drive” → árbol con conteos, sugerencias de organización.
5) “Investiga alternativas a Supabase” → explicación breve, 5–6 fuentes dedup, próximos pasos.
6) “Escribe un reporte corto (300+ palabras)” → contenido en FILE markers, intro breve fuera.
7) “¿Qué tiempo hace en Madrid mañana?” → respuesta directa + consejo práctico.
8) “Ayúdame a depurar error 500 en Next.js API route” → diagnóstico breve, parche mínimo, riesgos.
9) “Resume este PDF y saca 3 insights” → límites y sugerencias si grande; estructura de puntos clave.
10) “Háblame como profesional sin emojis” → tono profesional, sin emojis, cierre con pregunta.

## References (for maintainers)

- OpenAI Prompt Engineering Guide (system prompts, structure, few-shot): platform.openai.com/docs/guides/prompt-engineering
- Anthropic: Contextual Retrieval & RAG cookbooks: docs.anthropic.com
- Tool use & structured outputs (community notes): OpenAI Dev Forum and public agent posts
- RAG fine-tuning/evals examples: qdrant.tech blog and cookbooks

These references informed the patterns above; we avoid quoting large passages to keep this concise and source-agnostic.
