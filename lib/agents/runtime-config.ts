// Centralized runtime configuration for agent execution, delegation, and budgets
// Values can be overridden via environment variables. Keep conservative defaults.

export type RuntimeConfig = {
  delegationTimeoutMs: number
  delegationPollMs: number
  delegationExtendOnProgressMs: number
  delegationMaxExtensionMs: number
  progressMinDeltaPercent: number
  noProgressNoExtendMs: number

  maxExecutionMsSpecialist: number
  maxExecutionMsSupervisor: number
  maxToolCallsSpecialist: number
  maxToolCallsSupervisor: number

  // RAG thresholds
  ragMinHybridScore: number
  ragMinRerankScore: number
}

function intFromEnv(name: string, fallback: number): number {
  const v = process.env[name]
  if (!v) return fallback
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function numFromEnv(name: string, fallback: number): number {
  const v = process.env[name]
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    // Default delegation timeout set to 300s to match API route maxDuration
    delegationTimeoutMs: intFromEnv('DELEGATION_TIMEOUT_MS', 300_000),
    delegationPollMs: intFromEnv('DELEGATION_POLL_MS', 750),
    // Disable auto-extensions by default to avoid exceeding serverless function time limits
    delegationExtendOnProgressMs: intFromEnv('DELEGATION_EXTEND_ON_PROGRESS_MS', 60_000),
    delegationMaxExtensionMs: intFromEnv('DELEGATION_MAX_EXTENSION_MS', 0),
  progressMinDeltaPercent: intFromEnv('PROGRESS_MIN_DELTA', 5),
  noProgressNoExtendMs: intFromEnv('NO_PROGRESS_NO_EXTEND_MS', 60_000),

    maxExecutionMsSpecialist: intFromEnv('AGENT_SPECIALIST_MAX_EXECUTION_MS', 120_000),
    // Supervisor may orchestrate delegations; allow up to 300s
    maxExecutionMsSupervisor: intFromEnv('AGENT_SUPERVISOR_MAX_EXECUTION_MS', 300_000),
    maxToolCallsSpecialist: intFromEnv('AGENT_SPECIALIST_MAX_TOOL_CALLS', 8),
  maxToolCallsSupervisor: intFromEnv('AGENT_SUPERVISOR_MAX_TOOL_CALLS', 15),

  // RAG thresholds (0..1)
  ragMinHybridScore: numFromEnv('RAG_MIN_HYBRID_SCORE', 0.22),
  ragMinRerankScore: numFromEnv('RAG_MIN_RERANK_SCORE', 0.18)
  }
}
