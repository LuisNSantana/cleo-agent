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
  if (v === undefined) return fallback
  const n = parseInt(v, 10)
  if (!Number.isFinite(n)) return fallback
  return n
}

function numFromEnv(name: string, fallback: number): number {
  const v = process.env[name]
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function getRuntimeConfig(): RuntimeConfig {
  const defaultSpecialistLimit = 600_000
  const defaultSupervisorLimit = 600_000

  let specialistLimit = intFromEnv('AGENT_SPECIALIST_MAX_EXECUTION_MS', defaultSpecialistLimit)
  if (specialistLimit < 0) {
    specialistLimit = defaultSpecialistLimit
  }

  let supervisorLimit = intFromEnv('AGENT_SUPERVISOR_MAX_EXECUTION_MS', defaultSupervisorLimit)
  if (supervisorLimit < 0) {
    supervisorLimit = defaultSupervisorLimit
  }

  return {
    // UPDATED: Increased to 600s (10 min) for complex workflows with Google Workspace
    // Allows time for: Gmail API calls, attachments, multiple recipients, Drive operations
    delegationTimeoutMs: intFromEnv('DELEGATION_TIMEOUT_MS', 600_000),
    delegationPollMs: intFromEnv('DELEGATION_POLL_MS', 2000), // OPTIMIZADO: 2s en lugar de 750ms (reduce carga 62%)
    // Enable auto-extensions for long-running operations
    delegationExtendOnProgressMs: intFromEnv('DELEGATION_EXTEND_ON_PROGRESS_MS', 60_000),
    delegationMaxExtensionMs: intFromEnv('DELEGATION_MAX_EXTENSION_MS', 120_000), // Allow up to 2 min extension
  progressMinDeltaPercent: intFromEnv('PROGRESS_MIN_DELTA', 5),
  noProgressNoExtendMs: intFromEnv('NO_PROGRESS_NO_EXTEND_MS', 60_000),

  maxExecutionMsSpecialist: specialistLimit,
  // Supervisor may orchestrate delegations; allow up to 600s by default
  maxExecutionMsSupervisor: supervisorLimit,
    maxToolCallsSpecialist: intFromEnv('AGENT_SPECIALIST_MAX_TOOL_CALLS', 8),
  maxToolCallsSupervisor: intFromEnv('AGENT_SUPERVISOR_MAX_TOOL_CALLS', 15),

  // RAG thresholds (0..1)
  ragMinHybridScore: numFromEnv('RAG_MIN_HYBRID_SCORE', 0.22),
  ragMinRerankScore: numFromEnv('RAG_MIN_RERANK_SCORE', 0.18)
  }
}
