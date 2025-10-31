# Cleo Multi-Agent AI Platform — Copilot Guide

**Stack**: Next.js 15 (App Router) · React 19 · TypeScript · LangChain/LangGraph · Supabase · Docker

---

## Core architecture

**Chat entry points**:
- `app/api/chat/route.ts`: Main SSE endpoint (Vercel AI SDK). Sets `runtime = "nodejs"` and `maxDuration = 300` for delegation-heavy flows.
- `app/api/multi-model-chat/route.ts`: Multi-model routing + RAG controls (optional LangChain alternative).

**Agent orchestration** (LangGraph-based):
- Core engine: `lib/agents/core/` (`graph-builder.ts`, `execution-manager.ts`, `event-emitter.ts`, `timeout-manager.ts`, `tool-executor.ts`).
- Adapter layer: `lib/agents/orchestrator-adapter.ts` bridges legacy APIs to modular core; maintains global execution registry on `globalThis.__cleoExecRegistry`.
- Dual modes: Direct agent chat vs supervised delegation. See `docs/dual-mode-agent-system.md` and `docs/global-chat-orchestrator-and-pipeline.md`.

**Agent configuration**:
- Predefined specialists: `lib/agents/predefined/` (Emma, Peter, Apu, Toby, Ami, Nora, Jenn, etc.).
- Unified loader: `lib/agents/unified-config.ts` (async `getAllAgents`, `getAgentById`). Sync variants (`getAllAgentsSync`) are `@deprecated`—migrate orchestrators to async.
- Delegation scoring: `lib/delegation/intent-heuristics.ts` scores user intent against agent keywords; feeds router hints to `app/api/chat/route.ts`.

**Tool ecosystem**:
- Registry: `lib/tools/index.ts` (Zod-validated). New tools must call `ensureToolsHaveRequestContext(tools)` at export to inject user metadata.
- Context wrapper: `lib/tools/context-wrapper.ts` wraps execute functions with `withRequestContext` from `lib/server/request-context.ts` (AsyncLocalStorage-based).
- Supabase/tool calls inherit `userId`, `requestId`, `model` for logging and rate limiting.

**RAG pipeline**:
- Retrieval: `lib/rag/retrieve.ts` (`retrieveRelevant`, `buildContextBlock`). Supports hybrid vector+text search, reranking, and Redis caching.
- Client toggles: `options.enableSearch` in chat requests. Backend respects `maxContextChars` to stay within prompt budgets.
- Embeddings: `lib/rag/embeddings.ts`; Reranking: `lib/rag/reranking.ts`; Chunking: `lib/rag/chunking.ts`.

---

## Data layer (Supabase)

**Client creation**:
- Server: `lib/supabase/server.ts` (`createClient` async, respects cookies/auth).
- Client: `lib/supabase/client.ts` (browser bundle).
- Admin: `lib/supabase/admin.ts` (service role, bypasses RLS).

**Migrations**: `/migrations` (timestamped SQL). Baseline: `supabase_schema.sql`; append deltas in dated files (`20251028_agent_interrupts.sql`, etc.). Update analytics views (`20250910_orchestrator_chat_pipeline_analytics.sql`, `2025-10-05_dashboard_agent_analytics.sql`) when execution schema changes.

**Request context**: Wrap Supabase calls and tools with `withRequestContext({ userId, model, requestId }, async () => ...)` so metadata flows through AsyncLocalStorage. Functions like `getCurrentUserId()` read from this context.

---

## Development workflows

**Package manager**: `pnpm@10.14.0` (pinned in `package.json`).

**Local dev**:
```bash
pnpm install
pnpm dev  # Next.js Turbopack on http://localhost:3000
```

**Docker stack** (recommended for Supabase/Postgres locally):
```bash
pnpm docker:dev         # Start containers, follow logs
pnpm docker:dev-logs    # Tail logs
pnpm docker:dev-down    # Stop and cleanup
pnpm docker:dev-restart # Restart Cleo container
```

**Testing**:
- `pnpm test:context`: TS compile to `.tmp-tests`, run via Node test runner (integration tests).
- `pnpm test:jest`: Jest (UI/unit tests).
- `pnpm docker:test`: Containerized test run.

**Quality gates**: `pnpm lint`, `pnpm type-check`, `pnpm build` before deployments.

**Environment**: See `.env.example`. Required: Supabase keys, `OPENAI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `CSRF_SECRET`, `ENCRYPTION_KEY`. Optional: `OLLAMA_BASE_URL` for local models.

---

## Implementation patterns

**Execution events**: Graph nodes in `lib/agents/core/graph-builder.ts` emit structured events via `lib/agents/logging-events.ts` (`emitExecutionEvent`). These surface as timeline chips in the UI (`components/chat/pipeline-timeline.tsx`).

**Streaming**: `lib/chat/stream-handlers.ts` wraps Vercel AI SDK events (`onToolResult`, `onFinish`). Extend `makeStreamHandlers` when adding new tool annotations or timeline chips. SSE events accumulate in `parts` JSONB (persisted to `messages` table).

**File uploads**: `lib/file-handling.ts` validates (25MB, allowed MIME types), stores in Supabase Storage, checks heuristics. Use `persistAttachmentMetadata` for audit trails.

**Human-in-the-loop confirmations**: Tools can return `isConfirmationRequest: true` objects (see `lib/confirmation/wrapper.ts`). Stored in `globalThis.__pendingConfirmations` for polling endpoints.

**Agent delegation**: Tools like `delegate_to_emma` call `getAgentOrchestrator().startAgentExecutionForUI(...)`. Adapter emits progress events (`execution.started`, `execution.completed`) that UI subscribes to for real-time updates.

---

## Frontend conventions

**Layout**: `app/layout.tsx` (RSC server layout) + `app/layout-client.tsx` (client providers). Shared UI: `components/ui/` (Radix primitives, inspired by shadcn/ui). Motion effects: `components/motion-primitives/`.

**Chat UI**: `components/chat/` (timeline, tool confirmations), `app/agents/components/` (reasoning graph, modals). State: Zustand stores (`lib/agents/client-store.ts`, `app/**/stores.ts`). Prefer extending existing stores over creating new globals.

**Styling**: Tailwind v4 utility classes + `tailwind-merge` for conditional classNames.

---

## Observability

**Logs**: Server uses emoji markers (`⚡` processing, `🧭` routing, `[RERANK]` RAG). Tail `pnpm docker:logs` or Vercel logs.

**Analytics dashboards**: `app/dashboard/` renders execution timelines from Supabase materialized views. If chips disappear, verify execution events and view definitions.

**Error handling**: Supabase errors normalized in helper modules (e.g., `lib/supabase/server.ts`). Return structured `{ status, error }` objects. Client toasts and fallback UI in `components/ui/toast.tsx`.

---

## Special integrations

**WebSocket voice proxy**: `server/websocket-proxy.js` proxies OpenAI Realtime API (browsers can't send WS auth headers). Deployment: `server/README.md`.

**Ollama support**: Set `OLLAMA_BASE_URL` for local models. Model resolver in `lib/models/resolve.ts` auto-detects Ollama vs cloud providers.

**Delegation heuristics**: Keyword dictionaries in `lib/delegation/intent-heuristics.ts`. Extend `AGENT_KEYWORDS` when adding new specialists. Scoring is O(n) over keywords—simple and extensible.