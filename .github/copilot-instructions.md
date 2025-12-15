# Copilot Instructions (Cleo)

## Big picture
- Next.js App Router (Node runtime), React 19, TypeScript, Vercel AI SDK streaming + LangChain/LangGraph agents, Supabase (optionally Redis for caching).
- Main chat endpoint is [app/api/chat/route.ts](../app/api/chat/route.ts) (SSE, model normalization, delegation, RAG, tool calls). Alternate pipeline is [app/api/multi-model-chat/route.ts](../app/api/multi-model-chat/route.ts) (MultiModelPipeline).

## Runtime + request context (critical)
- Routes that do orchestration/tooling must be Node: `export const runtime = 'nodejs'` and set `maxDuration` appropriately (e.g. chat uses `300`; HITL response uses `10`). Edge runtime breaks AsyncLocalStorage/crypto flows.
- Wrap async work in `withRequestContext({ userId, model, requestId }, fn)` from [lib/server/request-context.ts](../lib/server/request-context.ts). Tools and security logging assume this.
- Do not “simplify away” `globalThis.__cleo*` state: it’s used intentionally to survive route reloads/serverless recycling (see [lib/agents/orchestrator-adapter.ts](../lib/agents/orchestrator-adapter.ts)).

## Agents
- Core orchestrator implementation lives in `lib/agents/core/*`; compatibility layer is [lib/agents/orchestrator-adapter.ts](../lib/agents/orchestrator-adapter.ts).
- Load agent configs via async helpers in [lib/agents/unified-config.ts](../lib/agents/unified-config.ts) (`getAllAgents`, `getAgentById`). Avoid the sync variants unless you’re touching legacy orchestrator code.

## Tools + HITL
- Tool registry is [lib/tools/index.ts](../lib/tools/index.ts). When adding/changing tools, ensure they’re wrapped with request context via `ensureToolsHaveRequestContext(...)` from [lib/tools/context-wrapper.ts](../lib/tools/context-wrapper.ts).
- Human-in-the-loop approvals are handled by [app/api/interrupt/respond/route.ts](../app/api/interrupt/respond/route.ts) (InterruptManager expects a `HumanResponse`).

## RAG
- Retrieval is in [lib/rag/retrieve.ts](../lib/rag/retrieve.ts). Always pass `threadId` (usually `chatId`) to isolate results and cache keys; supports L1 in-memory + optional Redis L2.

## Frontend conventions
- Use `@/` path alias imports (avoid `../../`). Prefer Server Components; add `'use client'` only when necessary.
- UI primitives live in `components/ui/*`; chat UI is in `components/chat/*`.

## Dev workflows
- Use pnpm only (pinned in `package.json`). Common commands: `pnpm dev`, `pnpm docker:dev`, `pnpm lint`, `pnpm type-check`, `pnpm test:context`, `pnpm test:jest`.
- Voice realtime requires a separate WS proxy: `pnpm voice:proxy` (see [server/README.md](../server/README.md)).