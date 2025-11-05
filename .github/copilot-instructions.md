# Cleo Multi-Agent AI Platform — Copilot Guide

**Stack**: Next.js 15 (App Router) · React 19 · TypeScript · LangChain/LangGraph · Supabase · Docker

---

## Core architecture

**Chat entry points**:
- `app/api/chat/route.ts`: Main SSE endpoint (Vercel AI SDK). Sets `runtime = "nodejs"` and `maxDuration = 300` for delegation-heavy flows.
- `app/api/multi-model-chat/route.ts`: Multi-model routing + RAG controls (optional LangChain alternative).
- **All API routes handling long operations MUST export `runtime = "nodejs"` and appropriate `maxDuration`** (e.g., `300` for delegation, `10` for quick ops).
  - Edge runtime lacks AsyncLocalStorage, crypto, and other Node.js APIs critical to request context and security.

**Agent orchestration** (LangGraph-based):
- Core engine: `lib/agents/core/` (`graph-builder.ts`, `execution-manager.ts`, `event-emitter.ts`, `timeout-manager.ts`, `tool-executor.ts`).
- Adapter layer: `lib/agents/orchestrator-adapter.ts` bridges legacy APIs to modular core; maintains global execution registry on `globalThis.__cleoExecRegistry`.
- Dual modes: **Direct** (user picks agent, bypasses supervisor, thread ID: `{agentId}_direct`) vs **Supervised** (Cleo orchestrates, thread ID: `cleo-supervisor_supervised`). See `docs/delegation-and-dual-mode-architecture.md`.
- Event propagation: Direct event listener pattern in `app/api/chat/route.ts` for `execution.interrupted` ensures HITL works in both modes without parent/child hierarchy.

**Agent configuration**:
- Predefined specialists: `lib/agents/predefined/` (Emma, Peter, Apu, Toby, Ami, Nora, Jenn, Astra, Insights, Wex, Notion—all in `ALL_PREDEFINED_AGENTS`).
- Unified loader: `lib/agents/unified-config.ts` (async `getAllAgents`, `getAgentById`). **Sync variants are `@deprecated`**—migrate orchestrators to async.
- Cleo (supervisor) is **protected**: cannot be deleted, always available as `cleo-supervisor`.
- Delegation scoring (3 layers): 1) Intent heuristics (`lib/delegation/intent-heuristics.ts`), 2) Router patterns (early-exit), 3) Model decision (GPT-4o-mini). Layers 1-2 **suggest**, model **decides**.

**Tool ecosystem**:
- Registry: `lib/tools/index.ts` (Zod-validated). **Critical**: New tools MUST call `ensureToolsHaveRequestContext(tools)` at export to inject user metadata.
- Context wrapper: `lib/tools/context-wrapper.ts` wraps execute functions with `withRequestContext` from `lib/server/request-context.ts` (AsyncLocalStorage-based).
- Supabase/tool calls inherit `userId`, `requestId`, `model` for logging and rate limiting. Use `getCurrentUserId()` to read context anywhere.
- Request context survives async boundaries by promoting to `globalThis.__currentUserId`, `__currentModel`, `__requestId` when AsyncLocalStorage unavailable.

**RAG pipeline**:
- Retrieval: `lib/rag/retrieve.ts` (`retrieveRelevant`, `buildContextBlock`). Dual-layer cache: L1 in-memory (2min TTL), L2 Redis (configurable).
- Hybrid search: Vector similarity + text rank, weighted scores. Optional reranking (`lib/rag/reranking.ts`).
- Client toggles: `options.enableSearch` in chat requests. Backend respects `maxContextChars` for prompt budgets.
- Embeddings: `lib/rag/embeddings.ts`; Chunking: `lib/rag/chunking.ts`.

---

## Data layer (Supabase)

**Client creation**:
- Server: `lib/supabase/server.ts` (`createClient` async, respects cookies/auth).
- Client: `lib/supabase/client.ts` (browser bundle).
- Admin: `lib/supabase/admin.ts` (service role, bypasses RLS).

**Migrations**: `/migrations` (timestamped SQL). Baseline: `supabase_schema.sql`; append deltas in dated files (`20251028_agent_interrupts.sql`, etc.). Update analytics views (`20250910_orchestrator_chat_pipeline_analytics.sql`, `2025-10-05_dashboard_agent_analytics.sql`) when execution schema changes.

**Request context**: Wrap Supabase calls and tools with `withRequestContext({ userId, model, requestId }, async () => ...)` so metadata flows through AsyncLocalStorage. Functions like `getCurrentUserId()` read from this context.


**Interrupt persistence**: Dual-layer (L1 in-memory, L2 Supabase `agent_interrupts` table) survives serverless recycling during HITL approvals (10-300s).

**Global state pattern**: Critical runtime state uses `globalThis` prefixed with `__cleo*` to survive Next.js route handler reloads (e.g., `__cleoExecRegistry`, `__cleoRuntimeAgents`, `__currentUserId`). This is intentional for serverless durability—not a code smell.

---

## Data layer (Supabase)

**Client creation**:
- Server: `lib/supabase/server.ts` (`createClient` async, respects cookies/auth).
- Client: `lib/supabase/client.ts` (browser bundle).
- Admin: `lib/supabase/admin.ts` (service role, bypasses RLS—**use sparingly**).

**Migrations**: `/migrations` (timestamped SQL). Baseline: `supabase_schema.sql`; append deltas in dated files (`20251028_agent_interrupts.sql`, etc.). Update analytics views (`20250910_orchestrator_chat_pipeline_analytics.sql`, `2025-10-05_dashboard_agent_analytics.sql`) when execution schema changes.

**Request context**: Wrap Supabase calls and tools with `withRequestContext({ userId, model, requestId }, async () => ...)` so metadata flows through AsyncLocalStorage. Functions like `getCurrentUserId()` read from this context.

**Interrupt persistence**: Dual-layer (L1 in-memory, L2 Supabase `agent_interrupts` table) survives serverless recycling during HITL approvals (10-300s).

---

## Development workflows

**Package manager**: `pnpm@10.14.0` (pinned in `package.json`). **Always use `pnpm` commands—never npm/yarn**.

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
pnpm docker:clean       # Prune volumes/containers
```

**Testing**:
- `pnpm test:context`: TS compile to `.tmp-tests`, run via Node test runner (integration tests).
- `pnpm test:jest`: Jest (UI/unit tests).
- `pnpm docker:test`: Containerized test run.

**Quality gates**: `pnpm lint`, `pnpm type-check`, `pnpm build` before deployments.

**Environment**: See `.env.example`. **Required**: Supabase keys, `OPENAI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `CSRF_SECRET`, `ENCRYPTION_KEY`. **Optional**: `OLLAMA_BASE_URL` for local models (set to `http://localhost:11434` for Ollama).

**Voice proxy**: Real-time WebSocket voice requires separate proxy server (`server/websocket-proxy.js`). Run with `pnpm voice:proxy` or `pnpm dev:voice` for parallel dev (app + proxy). See `server/README.md` for deployment.

---

## Implementation patterns

**Execution events**: Graph nodes in `lib/agents/core/graph-builder.ts` emit structured events via `lib/agents/logging-events.ts` (`emitExecutionEvent`). These surface as timeline chips in the UI (`components/chat/pipeline-timeline.tsx`).

**Streaming**: `lib/chat/stream-handlers.ts` wraps Vercel AI SDK events (`onToolResult`, `onFinish`). Extend `makeStreamHandlers` when adding new tool annotations or timeline chips. SSE events accumulate in `parts` JSONB (persisted to `messages` table).

**File uploads**: `lib/file-handling.ts` validates (25MB max, allowed MIME types: images, PDFs, Office docs, text). Stores in Supabase Storage. Use `persistAttachmentMetadata` for audit trails.

**Human-in-the-loop confirmations**: Tools return `{ needsConfirmation: true, preview, confirmationId, pendingAction }` objects (see `lib/confirmation/wrapper.ts`). Wrap critical tools with `withConfirmation()`. Stored in `globalThis.__pendingConfirmations` + Supabase L2 for durability. Respond via `app/api/interrupt/respond/route.ts`.

**Agent delegation**: Tools like `delegate_to_emma` call `getAgentOrchestrator().startAgentExecutionForUI(...)`. Adapter emits progress events (`execution.started`, `execution.completed`) via EventEmitter; UI subscribes for real-time updates. Bridge pattern in `orchestrator-adapter.ts` ensures core events propagate to legacy listeners.

**Model resolution**: `lib/models/resolve.ts` (`resolveModelFromList`) normalizes model IDs, handles aliases (e.g., `grok-4-fast-reasoning`), auto-detects Ollama vs cloud providers. Fallback: `grok-4-fast-reasoning`.

**CSRF protection pattern**: All state-changing routes validate double-submit tokens via `middleware.ts`. Client must send `x-csrf-token` header matching `csrf_token` cookie. Skip for Next.js internals (paths starting with `/_next/`, etc.).

---

## Frontend conventions

**Layout**: `app/layout.tsx` (RSC server layout) + `app/layout-client.tsx` (client providers). Shared UI: `components/ui/` (Radix primitives, inspired by shadcn/ui). Motion effects: `components/motion-primitives/`.

**Chat UI**: `components/chat/` (timeline, tool confirmations), `app/agents/components/` (reasoning graph, modals). State: Zustand stores (`lib/agents/client-store.ts`, `app/**/stores.ts`). Prefer extending existing stores over creating new globals.

**Styling**: Tailwind v4 utility classes + `tailwind-merge` for conditional classNames (`cn()` helper).

**Path aliasing**: Use `@/` prefix for all imports (mapped to project root in `tsconfig.json`). **Never use relative paths like `../../`**—always use `@/` to maintain consistency and avoid refactoring issues.

**Component patterns**: Prefer server components by default. Mark client components with `'use client'` only when needed (hooks, browser APIs, interactivity). Keep server/client boundary clear to optimize bundle size.

---

## Observability & debugging

**Logs**: Server uses emoji markers (`⚡` processing, `🧭` routing, `[RERANK]` RAG, `🎯` router decisions). Tail `pnpm docker:logs` or Vercel logs.

**Analytics dashboards**: `app/dashboard/` renders execution timelines from Supabase materialized views (`analytics.v_agent_execution_timeline`, `analytics.mv_tool_usage_daily`). Refresh with `SELECT analytics.refresh_analytics_materialized_views();`.

**Error handling**: Supabase errors normalized in helper modules (e.g., `lib/supabase/server.ts`). Return structured `{ status, error }` objects. Client toasts and fallback UI in `components/ui/toast.tsx`.

**Timeline debugging**: If chips disappear after refresh, verify: 1) `messages.parts` JSONB is populated, 2) execution events are emitting, 3) materialized views are up to date.

**Redis diagnostics**: Use `pnpm diagnose:redis` and `pnpm test:redis-cache-hit` scripts to verify L2 cache connectivity and performance.

---

## Security & middleware

**CSRF protection**: `middleware.ts` enforces double-submit cookies for POST/PUT/DELETE/PATCH. Set `x-csrf-token` header matching `csrf_token` cookie.

**CSP headers**: Content-Security-Policy varies by env (dev allows `unsafe-eval`, prod restricts). Configured in `middleware.ts`.

**RLS**: Supabase Row Level Security enforced on all tables. Admin client bypasses (use sparingly). Request context propagates `userId` for proper isolation.

**Runtime configuration**: Middleware exports `runtime = "nodejs"` to ensure Node.js APIs available. Never use `edge` runtime for middleware.

---

## Special integrations

**WebSocket voice proxy**: `server/websocket-proxy.js` proxies OpenAI Realtime API (browsers can't send WS auth headers). Run with `pnpm voice:proxy` or `pnpm dev:voice` (parallel dev). Deployment: `server/README.md`.

**Ollama support**: Set `OLLAMA_BASE_URL` for local models. Model resolver in `lib/models/resolve.ts` auto-detects Ollama vs cloud providers. Recommended: `ollama pull llama3.1:8b`.

**Delegation heuristics**: Keyword dictionaries in `lib/delegation/intent-heuristics.ts`. Extend `AGENT_KEYWORDS` when adding new specialists. Scoring is O(n) over keywords—simple and extensible. Threshold: 0.55 for router hints.

**Daily limits**: Per-user model usage tracked in `lib/daily-limits.ts`. Check `dailyLimits.canUseModel(userId, modelId)` before expensive operations.

---

## Key anti-patterns to avoid

1. **Don't** use sync agent loaders (`getAllAgentsSync`, `getAgentByIdSync`) in new code—migrate to async `getAllAgents`/`getAgentById`.
2. **Don't** skip `ensureToolsHaveRequestContext()` when exporting tool arrays—breaks user context propagation.
3. **Don't** set `runtime = "edge"` for routes needing Node.js APIs (AsyncLocalStorage, crypto, etc.).
4. **Don't** create new global state stores—extend existing Zustand stores (`lib/agents/client-store.ts`).
5. **Don't** hardcode model fallbacks—use `resolveModelFromList` and respect `DEFAULT_FALLBACK_MODEL_ID`.
6. **Don't** forget to update analytics views (`migrations/*.sql`) when adding execution schema fields.

---

## Quick reference: Common tasks

**Add new agent**: Create in `lib/agents/predefined/`, export from `index.ts`, update `ALL_PREDEFINED_AGENTS`, add keywords to `AGENT_KEYWORDS`.

**Add new tool**: Define in `lib/tools/`, wrap with `wrapToolExecuteWithRequestContext`, export from `lib/tools/index.ts`, call `ensureToolsHaveRequestContext` on array.

**Add delegation pattern**: Update `AGENT_KEYWORDS` in `lib/delegation/intent-heuristics.ts` with weighted keywords.

**Debug missing timeline**: Check `messages.parts` JSONB, verify execution events in logs, refresh analytics views.

**Local Ollama setup**: Install Ollama, `ollama pull llama3.1:8b`, set `OLLAMA_BASE_URL=http://localhost:11434` in `.env.local`.