# Prompt Engineering & Multi‑Agent Guide (2025)

Audience: contributors working on Cleo’s prompts, routing, and multi‑agent orchestration. This document consolidates current best practices from OpenAI, Anthropic (Claude), and LangChain, and maps them to actionable improvements in this repo.

## Why this matters
Modern models are strong but sensitive to context, roles, and tool design. Production multi‑agent systems need: clear roles, effort budgets, source quality heuristics, parallelization guidance, and reliable stop/resume behavior. These patterns improve accuracy, cost, and user trust.

## Key references
- OpenAI: Prompt engineering guide (2025) — roles, structured outputs, Markdown/XML, prompt caching.
  https://platform.openai.com/docs/guides/prompt-engineering
- Anthropic: Building Effective Agents (2024) — workflows vs agents, tool prompt‑engineering, simplicity & transparency.
  https://www.anthropic.com/engineering/building-effective-agents
- Anthropic: How we built our multi‑agent research system (2025) — effort scaling, parallelization, subagent task specs, evals.
  https://www.anthropic.com/engineering/multi-agent-research-system
- LangChain: How and when to build multi‑agent systems (2025) — context engineering, durable execution, observability, evals.
  https://blog.langchain.com/how-and-when-to-build-multi-agent-systems/

## Summary of best practices
- Roles & chain of command: keep developer/system instructions separate from user inputs; be explicit about identity, tasks, constraints, and examples.
- Effort scaling: match iterations, tool calls, and number of subagents to query complexity; stop when marginal gain < 10%.
- Parallelization: parallelize “reading” (research) tasks; keep “writing/synthesis” mostly single‑agent to avoid merge conflicts.
- Subagent task spec: pass objective, output format, tools, effort budget, and handoff expectations to each subagent.
- Source quality: start broad → narrow; prefer primary sources; dedupe; resolve contradictions; cite compactly.
- Checkpoint & resume: save short checkpoints; adapt to tool failures; summarize when nearing context limits.
- Stop conditions & confirmation: explicit stop rules; confirmation for destructive actions.
- Evals: start small, consider LLM‑as‑judge for rubric scoring; keep some human reviews.

## Gap analysis vs repo
- Central system prompt (Cleo) already includes: identity, delegation heuristics, anti‑hallucination, specialist map.
- Missing/weak: explicit effort scaling, parallelization heuristics, crisp subagent task spec, checkpoint/resume, concise source‑quality heuristics, unified stop conditions.

## Changes implemented in this PR/session
- Enhanced `lib/prompts/index.ts` (Cleo) with:
  - Effort scaling & budgets
  - Parallelization heuristics (read vs write)
  - Subagent task spec template
  - Source‑quality & search strategy
  - Checkpointing & resume guidance
  - Stop conditions & confirmation rules

These are injected into the Cleo system prompt at assembly time (see `buildCleoSystemPrompt`). No API or type changes.

## Recommended follow‑ups (optional)
- Agents:
  - Wex: already strong — consider adding an explicit max tool‑call budget when orchestrated by Cleo.
  - Apu: add a short stop/budget note similar to Wex’s STOP CRITERIA.
  - Emma/Nora: add a single “effort budget + stop criteria” line to keep latency/cost bounded for large stores/calendars.
- Orchestrator:
  - Expose optional per‑task budgets in delegation payload (iterations/tool calls/subagent cap) and echo them to subagents.
  - Add a “checkpoint” event type (compact summary) after major phases to improve observability.
- Evals & observability:
  - Add 10–20 high‑leverage eval prompts (finance, research, social) with a rubric (accuracy, completeness, source quality, tool efficiency), optionally LLM‑as‑judge.
  - Ensure delegation steps include source counts and artifact links in metrics where possible.

## Prompt snippets you can reuse
- Effort scaling (developer/system message):
  "Simple: 1 call, ≤3 tools; Targeted: ≤2 iters/≤6 tools; Comparative: ≤4 iters/≤12 tools; Broad: ≤6 iters/≤20 tools/3–6 subagents; stop at <10% net‑new signal."

- Subagent task spec:
  "Objective | Output | Tools | Effort budget | Handoffs (artifacts + 3–5 bullet summary)."

- Source quality:
  "Start broad→narrow; prefer primary sources; dedupe; resolve contradictions; compact numbered citations."

## Notes
- Keep internal scaffolding invisible to users; never mention tool names or schemas.
- When local or budget‑sensitive, keep responses short, with concrete next steps and links.

— Maintainers, Oct 2025
