# Cleo Multi-Agent Architecture Guide

This document explains how Cleo’s multi-agent system works end-to-end: architecture, components, routing (delegation) decisions, runtime agent registration, observability, and how to operate and troubleshoot it.

## At a glance

- Supervisor-first design: a supervisor agent (Cleo) coordinates specialist agents.
- Dynamic graph orchestration: graph is built and rebuilt at runtime as agents are added.
- Deterministic, explainable routing: token/tag-based scoring chooses the best agent.
- Live observability: structured logs and UI events make routing choices visible.
- Extensible: users can register new agents from the UI without redeploying.

---

## Architecture overview

Conceptually, Cleo uses a small LangGraph of nodes:

```
┌─────────────────┐     ┌───────────────┐     ┌───────────────────────┐
│  cleo-supervisor│ ──> │    router     │ ──> │  specialist or runtime │
└─────────────────┘     └───────────────┘     │   agent (N choices)   │
                                              └────────────┬──────────┘
                                                           │
                                                           ▼
                                                  ┌────────────────┐
                                                  │   finalize     │
                                                  └────────────────┘
```

- cleo-supervisor: emits guidance and coordinates delegation.
- router: performs content-aware routing to the best agent (or finalize).
- specialist/runtime agent: executes the task (e.g., technical, creative, logical, or newly created).
- finalize: crafts the final response and completes the execution.

The graph is rebuilt automatically when new runtime agents are registered so they become routable immediately.

---

## Key components

- Orchestrator (`lib/agents/agent-orchestrator.ts`)
  - Builds the LangGraph with nodes and conditional edges.
  - Stores agent configs and agent instances.
  - Executes requests and maintains execution state, steps, and metrics.
  - Provides API-safe methods for runtime registration and graph rebuilds.

- Base (built-in) agents (`lib/agents/config.ts`)
  - cleo-supervisor (role: supervisor)
  - toby-technical (role: specialist)
  - ami-creative (role: specialist)
  - peter-logical (role: specialist)
  - Built-ins include descriptive prompts and tags used by the router.

- Runtime agents (created from the UI)
  - Registered via `/api/agents/register`.
  - Added to `agentConfigs` and `agents`, and the graph is rebuilt.
  - Immediately considered in routing decisions.

- Client-side store (`lib/agents/client-store.ts`)
  - Minimal client store driven by API endpoints.
  - Tracks executions, metrics, graph view, and live delegation events.

- API endpoints
  - `POST /api/agents/execute`: start a new execution (supervisor-led by default).
  - `GET /api/agents/execution/[id]`: poll execution status and messages.
  - `POST /api/agents/register`: register a runtime agent and rebuild the graph.

---

## Execution lifecycle

1. Client calls `POST /api/agents/execute` with an input message (and optional `agentId`).
2. Orchestrator creates an `execution` record and kicks off the LangGraph.
3. cleo-supervisor emits coordination intent; router receives the latest message.
4. router computes candidates and chooses the best agent via scoring (details below).
5. The chosen agent executes (tool calls, reasoning, content generation).
6. finalize node synthesizes the result and ends the execution.
7. Client polls `GET /api/agents/execution/[id]` for live updates until completed.

If a user explicitly targets a specific agent (via `agentId` or message metadata), the router honors it when present and valid.

---

## Routing and delegation scoring

Cleo’s routing uses an explainable, deterministic scoring process:

- Inputs
  - The latest user message content (string).
  - Agent configs: name, description, objective, and especially `tags`.

- Normalization
  - Message is lowercased and diacritics are removed (NFD). 
  - Tokenization splits on non-alphanumeric chars and keeps tokens of length ≥ 3.

- Scoring
  - For each candidate agent (all non-supervisor agents):
    - Base score: +1 for each token found in the combined agent text: `objective + name + description + tags`.
    - Tag boost: +2 for any exact tag that appears in the token set.
  - The agent with the highest score is selected if `score > 0`.
  - If no agent scores > 0, the router returns `finalize`.

- Overrides and safeguards
  - Requested agent in the message (or execution) is honored if valid.
  - The router avoids self-routing to `cleo-supervisor`.

- Observability
  - Logs show: candidate list, normalized message, per-agent scores, and the selection.
  - A UI event `agent-delegation` is dispatched with `{ from, to, reason, query, timestamp }`.

This approach makes routing:
- Predictable and tunable (adjust tags/boosts easily).
- Transparent (scores visible in logs).
- Extensible (runtime agents participate immediately).

---

## Runtime agent registration

Users can add new agents visually via the Agent Creator form. Behind the scenes:

1. The UI posts the agent config to `POST /api/agents/register`.
2. Orchestrator stores the config and constructs a corresponding agent instance.
3. The LangGraph is rebuilt with fresh conditional edges that include the new agent.
4. Router automatically considers the new agent in its scoring on subsequent requests.

Guidelines for effective runtime agents:
- Provide a concise `name` and `description` that contain likely user tokens.
- Define a strong set of `tags` (3–12) that match real user vocabulary.
- Keep prompts scoped to the agent’s domain and tools useful to that domain.

---

## UI instrumentation and observability

- Delegation events
  - The router emits `CustomEvent('agent-delegation', { detail: { from, to, reason, query, timestamp } })`.
  - The client store listens to `agent-delegation` and appends to `delegationEvents`.
  - The `DelegationTracker` component (see `components/agents/delegation-tracker.tsx`) shows a live log of routing decisions in the UI.

- Execution polling
  - The client polls `/api/agents/execution/[id]` every second while running.
  - Minimal metrics and step data are shown for progress visibility.

- Logs
  - Look for lines like `Scoring X candidate agents`, per-agent `scored N`, and `Selected best match`.
  - On registration, the orchestrator logs `Graph rebuilt to include runtime agent: <id>`.

---

## How to influence routing

- Tune tags on built-in agents
  - Built-ins ship with sensible tags (e.g., technical, creative, logical). You can add or refine tags in `lib/agents/config.ts`.

- Create a more specific runtime agent
  - If two agents overlap, the one with more precise `tags` and description often wins.
  - Example: for queries like “Second War in Warcraft,” a runtime agent with tags `["warcraft", "wow", "lore", "second war"]` will win against a generic technical agent.

- Use explicit targeting (when needed)
  - Pass `agentId` to `/api/agents/execute` or include metadata `requested_agent_id` in the message to force routing to a specific agent.

---

## Advantages of this design

- Dynamic extensibility: add new agents at runtime; no redeploy required.
- Explainable routing: simple token/tag scoring with clear logs.
- Robust defaults: safe `finalize` fallback when no agent fits.
- Separation of concerns: supervisor coordinates; specialists execute.
- Developer ergonomics: TypeScript, Next.js app router, and a small, inspectable codebase.

---

## Technology stack

- Framework: Next.js (App Router) + React + TypeScript
- State management: Zustand (client store)
- Orchestration: LangChain + LangGraph
- UI: ShadCN UI components, Tailwind CSS (via project setup)
- Package manager: pnpm
- Model providers: provider-agnostic wiring (see `lib/providers` / `lib/openproviders`), configurable models per agent
- Optional integrations: search/RAG tooling in `lib/tools` and `lib/rag` (dependent on project config)

---

## State management in test mode (no database)

In the current test environment, runtime agents are kept without a database. Instead, the system uses in-memory state and a lightweight sync protocol so the UI and server stay consistent.

- Where agents live
  - Server: The orchestrator holds two in-memory maps: `agentConfigs` and `agents`. The orchestrator instance is reused across requests (global process scope), so registered agents persist while the server stays running.
  - Client: The React graph view uses a client-side store that merges built-in agents with runtime agents fetched from the server.

- Runtime agent identity
  - IDs follow the pattern `custom_\d+` (e.g., `custom_1756441115596`).
  - This pattern is used to detect runtime agents for syncing and cleanup.

- Sync protocol (client ↔ server)
  - Endpoint: `GET /api/agents/sync`
    - Returns the full list of agents currently known by the server orchestrator (built-ins + runtime).
  - Client store: `lib/agents/client-store.ts`
    - `initializeAgents()` loads built-ins, then calls `syncAgents()`.
    - `syncAgents()` fetches `/api/agents/sync`, filters runtime agents by `^custom_\d+$`, merges with built-ins, and updates the graph nodes/edges.
  - Agents page: `app/agents/components/AgentsPageContent.tsx`
    - Calls `initializeAgents()` on mount so runtime agents appear in the graph after refresh.
    - Provides a “Refrescar” button that calls `syncAgents()` on demand.

- Cleanup (remove runtime agents only)
  - Endpoint: `POST /api/agents/cleanup`
    - Removes only runtime agents (IDs matching `^custom_\d+$`) via `orchestrator.removeRuntimeAgent()` and rebuilds the graph server-side.
  - UI: In the “Grafo de Arquitectura Multi-Agente” header, the “Limpiar Agentes” button calls this endpoint and then re-syncs the graph. Built-in agents remain intact.
  - Auto-expiry: The orchestrator includes a safety cleanup that can remove old runtime agents (~30 min) based on the timestamp embedded in the ID.

- What this means for users (test mode)
  - Agents you create at runtime persist across page reloads (no DB), as long as the server process stays alive.
  - After a refresh, the graph shows runtime agents once the client re-syncs with the server (automatically on mount, or via the “Refrescar” button).
  - You can remove your created runtime agents using the “Limpiar Agentes” button; the graph updates immediately after sync.
  - Scope is global to the running server process (not per-user) and meant for testing. For multi-tenant persistence, add a database-backed store.

Tip: Logs will show “Reusing orchestrator from globalThis”, “Available agent configs/instances…”, and routing scores. This helps verify that runtime agents are registered, synced to the client, and considered by the router.

---

## Common scenarios and tests

- Route to Technical (Toby)
  - Query: “Explain the second war … history …”
  - Expect: Toby wins due to tags like `historia`, `guerra`, `segunda`.

- Route to Creative (Ami)
  - Query: “Help me design a creative layout for my blog”
  - Expect: Ami wins due to `diseño`, `creativo`, `contenido`.

- Route to Logical (Peter)
  - Query: “Solve 2x + 5 = 15 and explain the steps”
  - Expect: Peter wins due to `matemáticas`, `problema`, `cálculo`.

- Route to a runtime agent
  - Create an agent with tags `["warcraft", "wow", "lore", "second war"]`.
  - Query: “Explain the Second War in Warcraft”
  - Expect: The runtime agent wins over generic technical.

---

## Troubleshooting

- “Supervisor always delegates to the same agent”
  - Ensure agents (especially built-ins) have strong, relevant `tags` in `lib/agents/config.ts`.
  - Check logs for `Scoring N candidate agents` and per-agent `scored` lines.
  - Verify the new agent is in `Available agent configs/instances` and appears in the candidates list.

- “My runtime agent doesn’t get called”
  - Confirm `/api/agents/register` returned 200 and logs show `Graph rebuilt …`.
  - Ensure its `tags` overlap with the expected user tokens.
  - Try a test query that matches tags exactly.

- “I want to force a specific agent”
  - Pass `agentId` to `/api/agents/execute` or add `requested_agent_id` metadata to the message.

---

## Where to look in the code

- Router and scoring: `lib/agents/agent-orchestrator.ts` (router node + conditional edges)
- Built-in agent configs: `lib/agents/config.ts`
- Client store and events: `lib/agents/client-store.ts`
- Delegation UI: `components/agents/delegation-tracker.tsx`
- API routes: `app/api/agents/execute`, `app/api/agents/execution/[id]`, `app/api/agents/register`

---

## Glossary

- Agent: A configured LLM persona with prompt, tools, and tags.
- Runtime agent: An agent registered while the app is running via the UI/API.
- Routing/Delegation: The process of selecting which agent should handle a given input.
- Finalize: LangGraph node that synthesizes the final response.

---

## Summary

Cleo’s multi-agent system uses a small, dynamic graph where a supervisor delegates tasks to the best-suited agent via an explainable token/tag scoring algorithm. Users can create agents at runtime, immediately participate in routing, and observe decisions live in the UI and logs. The design balances simplicity, transparency, and extensibility.
