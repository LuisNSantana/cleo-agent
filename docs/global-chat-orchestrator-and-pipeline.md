# Global Chat Orchestrator & Pipeline (Phase 1)

This document explains the new global chat architecture, prompt updates, delegation/routing, the UI pipeline/timeline with tool chips, and the database changes required to persist everything.

## Overview

- Global chat now routes through Cleo's multi-agent orchestrator in supervised mode.
- The backend emits SSE events for execution steps and tool invocations.
- The UI renders a modern timeline showing: thinking, delegations, tool execution, and the final response.
- Chips (tool invocations) and pipeline steps persist in DB under `public.messages.parts` (JSONB) so they survive reloads and conversation switches.

## Prompt & Routing Improvements

- System prompt (`lib/prompts/index.ts`) updated with:
  - Delegation & Speed rubric
  - Specialists awareness and orchestration rules
  - Safety and secrecy reminders
- Router hint injected (internal) from a routing scorer so Cleo picks the best agent quickly.

## Backend Changes

- `app/api/chat/route.ts` bridges orchestrator SSE into the global chat endpoint.
  - Accumulates `execution-step` and `tool-invocation` parts during the run.
  - Persists a final assistant message with `parts` including the pipeline and chips.
- `app/api/chat/db.ts` persists/loads `parts` from the `messages` table.
- Types updated in `app/types/*.ts` for message parts.

## UI Changes

- `app/components/chat/pipeline-timeline.tsx`: renders a premium, minimal timeline of steps.
- `app/components/chat/tool-invocation.tsx`: renders tool chips/cards.
- `app/components/chat/message-assistant.tsx`: reads `parts` and shows chips + timeline.
- `app/components/chat/use-chat-core.ts`: parses SSE `execution-step` events.

## Database Changes

We rely on existing `public.messages.parts` (JSONB) to store chips/pipeline. For performance and analytics we added:

- Indexes:
  - `idx_messages_parts_gin` (GIN on `messages.parts`)
  - `idx_messages_chat_id_created_at` for paging
  - `idx_agent_executions_user_chat`, `idx_agent_execution_steps_exec_num` for timelines/analytics
- Analytics schema:
  - View `analytics.v_agent_execution_timeline` (joins executions + steps)
  - MVs `analytics.mv_tool_usage_daily` and `analytics.mv_delegations_daily`
  - Function `analytics.refresh_analytics_materialized_views()` for refresh

Apply with the migration in `migrations/20250910_orchestrator_chat_pipeline_analytics.sql`.

## How to Run Locally

1. Apply migrations to Supabase:
   - Run the SQL in `migrations/20250910_orchestrator_chat_pipeline_analytics.sql`.
2. Start the app and test global chat:
   - Send prompts that trigger delegation/tool use and watch the timeline/chips.
3. Refresh the page and switch conversations:
   - Chips and timeline stay visible (loaded from DB).

## Optional

- Token-level streaming for supervised runs.
- More timeline polish: avatars, collapsible groups, step drill-down.
- Scheduled refresh with `pg_cron` (add separately if permitted).

## Troubleshooting

- If MVs are empty: run `SELECT analytics.refresh_analytics_materialized_views();` then test again.
- If timeline doesn't render after refresh: check that `messages.parts` is being saved and loaded by the UI components.
