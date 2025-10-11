# Cleo Multi-Agent AI Platform — Copilot Guide

**Stack**: Next.js 15 · React 19 · TypeScript · LangChain/LangGraph · Supabase · Docker

## Quick essentials
- Primary entry: `app/api/chat/route.ts` (SSE via Vercel AI SDK, sets `runtime = "nodejs"` and `maxDuration = 300` for long delegations)
- LangChain router endpoint: `app/api/multi-model-chat/route.ts` (multi-model switch + RAG controls)
- Modular orchestrator core: `lib/agents/core/` (graph builder, execution manager, error handler, memory, metrics)
- Enhanced adapter: `lib/agents/orchestrator-adapter-enhanced.ts` (bridges legacy orchestrator, maintains global execution registry)
- Supabase helpers: `lib/supabase/` (`createClient`, auth middleware, storage utilities)

## Architecture map
- Specialist agents live in `lib/agents/predefined/`; metadata served through `lib/agents/unified-config.ts` (prefer async APIs, sync variants are `@deprecated`).
- Dual-mode chat (direct vs supervised) documented in `docs/dual-mode-agent-system.md`; pipeline timeline details in `docs/global-chat-orchestrator-and-pipeline.md`.
- Delegation heuristics and scoring reside in `lib/delegation/intent-heuristics.ts`; they feed router hints consumed inside `app/api/chat/route.ts`.
- Tool registry centralized in `lib/tools/index.ts` with Zod schemas; new tools should wrap `ensureToolsHaveRequestContext` to inherit request metadata.
- LangChain pipeline (`lib/langchain/`) handles model routing, RAG assembly (`retrieve.ts`, `buildContextBlock`), and streaming events.

## Data & integrations
- Supabase schema migrations live in `/migrations` (timestamped SQL). Start from `supabase_schema.sql`, append deltas in dated files.
- Environment essentials (see `.env.example`): Supabase keys, `OPENAI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `CSRF_SECRET`, `ENCRYPTION_KEY`, optional `OLLAMA_BASE_URL`.
- WebSocket voice proxy: `server/websocket-proxy.js` with deployment instructions in `server/README.md`.
- Analytics dashboards consume views defined in `20250910_orchestrator_chat_pipeline_analytics.sql` and `2025-10-05_dashboard_agent_analytics.sql`; update views when execution schema changes.

## Development workflow
- Install with `pnpm install` (`packageManager` pinned to `pnpm@10.14.0`).
- Local dev: `pnpm dev` (Next.js Turbopack). Docker stack: `pnpm docker:dev`, `pnpm docker:dev-logs`, `pnpm docker:dev-down`.
- Tests: `pnpm test:context` (TS compile + Node test runner in `.tmp-tests`), `pnpm test:jest` (Jest UI/unit), `pnpm docker:test` (containerized run).
- Quality gates: `pnpm lint`, `pnpm type-check`, and `pnpm build` before release deployments.

## Implementation patterns
- Execution graph nodes live in `lib/agents/core/graph-builder.ts`; emit UI events through `lib/agents/logging-events.ts` to surface in chat timelines.
- Streaming helper `lib/chat/stream-handlers.ts` wraps Vercel AI SDK events. Extend it when adding new timeline chips or tool annotations.
- File uploads route through `lib/file-handling.ts` (Supabase storage + antivirus heuristics). Reuse `persistAttachmentMetadata` for audit trails.
- RAG toggles: client sends `options.enableSearch`; propagate to metadata and respect `maxContextChars` in `lib/rag/build-context.ts`.
- Use `withRequestContext` from `lib/server/request-context.ts` when invoking tools or Supabase so user metadata is available for logging and rate limits.

## Frontend conventions
- App Router layouts in `app/layout.tsx` + `app/layout-client.tsx`; shared UI primitives reside in `components/ui/` (shadcn-derived).
- Chat experience composed from `components/chat/` (timeline, tool confirmations) and `app/agents/components/` (reasoning graph, modals).
- State management uses Zustand stores (`lib/agents/client-store.ts`, `app/**/stores.ts`); prefer extending existing stores over creating new globals.
- Styling: Tailwind v4 utility classes + `tailwind-merge` helpers. Keep motion effects under `components/motion-primitives/`.

## Observability & debugging
- Server logs use emoji markers (`⚡` processing, `🧭` routing, `[RERANK]` RAG); tail `pnpm docker:logs` or inspect Vercel logs to follow the pipeline.
- Supabase errors normalized in `lib/supabase/errors.ts`; handle returns with structured `{ status, error }` objects.
- Dashboard analytics (`app/dashboard/`) expects timelines populated; if chips disappear, check execution events and Supabase materialized views.