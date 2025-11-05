/**
 * Semantic ID Generator for Execution Steps
 * ==========================================
 * 
 * Generates human-readable, grep-friendly IDs for execution steps.
 * 
 * **Before (Phase 1)**:
 * - `cleo-supervisor_router_1762348250879`
 * - Not grep-friendly (underscore separators)
 * - Hard to parse visually
 * 
 * **After (Phase 2)**:
 * - `cleo-supervisor:router:1762348250879`
 * - Colon-separated for readability
 * - Easy to grep: `grep "cleo-supervisor:router"`
 * - Clear hierarchy: agent → node type → timestamp
 * 
 * **Delegation IDs**:
 * - `cleo-supervisor→astra-email:delegate:1762348250879`
 * - Arrow (→) shows delegation flow
 * - Easy to grep: `grep "cleo-supervisor→"`
 * 
 * Usage:
 * ```typescript
 * const stepId = generateSemanticStepId('cleo-supervisor', 'router')
 * // → "cleo-supervisor:router:1762348250879"
 * 
 * const delId = generateDelegationId('cleo-supervisor', 'astra-email')
 * // → "cleo-supervisor→astra-email:delegate:1762348250879"
 * ```
 */

/**
 * Generates a semantic step ID with format: `{agentId}:{nodeType}:{timestamp}`
 * 
 * @param agentId - The agent executing this step (e.g., 'cleo-supervisor', 'astra-email')
 * @param nodeType - The type of node/step (e.g., 'router', 'agent', 'tools', 'end')
 * @param timestamp - Optional timestamp (defaults to Date.now())
 * @returns Semantic step ID like "cleo-supervisor:router:1762348250879"
 * 
 * @example
 * generateSemanticStepId('cleo-supervisor', 'router')
 * // → "cleo-supervisor:router:1762348250879"
 * 
 * generateSemanticStepId('astra-email', 'tools', 1762348250000)
 * // → "astra-email:tools:1762348250000"
 */
export function generateSemanticStepId(
  agentId: string,
  nodeType: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Date.now()
  return `${agentId}:${nodeType}:${ts}`
}

/**
 * Generates a semantic delegation ID with format: `{fromAgent}→{toAgent}:delegate:{timestamp}`
 * 
 * Uses Unicode arrow (→) to visually indicate delegation flow.
 * Grep-friendly: `grep "cleo-supervisor→"` finds all delegations from Cleo.
 * 
 * @param fromAgent - The delegating agent (e.g., 'cleo-supervisor')
 * @param toAgent - The target specialist agent (e.g., 'astra-email', 'peter-financial')
 * @param timestamp - Optional timestamp (defaults to Date.now())
 * @returns Semantic delegation ID like "cleo-supervisor→astra-email:delegate:1762348250879"
 * 
 * @example
 * generateDelegationId('cleo-supervisor', 'astra-email')
 * // → "cleo-supervisor→astra-email:delegate:1762348250879"
 * 
 * generateDelegationId('cleo-supervisor', 'peter-financial', 1762348250000)
 * // → "cleo-supervisor→peter-financial:delegate:1762348250000"
 */
export function generateDelegationId(
  fromAgent: string,
  toAgent: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Date.now()
  return `${fromAgent}→${toAgent}:delegate:${ts}`
}

/**
 * Parses a semantic step ID back into components
 * 
 * @param semanticId - The semantic ID to parse
 * @returns Object with agentId, nodeType, timestamp, and optional delegation info
 * 
 * @example
 * parseSemanticStepId('cleo-supervisor:router:1762348250879')
 * // → { agentId: 'cleo-supervisor', nodeType: 'router', timestamp: 1762348250879 }
 * 
 * parseSemanticStepId('cleo-supervisor→astra-email:delegate:1762348250879')
 * // → { 
 * //   agentId: 'cleo-supervisor→astra-email', 
 * //   nodeType: 'delegate', 
 * //   timestamp: 1762348250879,
 * //   isDelegation: true,
 * //   fromAgent: 'cleo-supervisor',
 * //   toAgent: 'astra-email'
 * // }
 */
export function parseSemanticStepId(semanticId: string): {
  agentId: string
  nodeType: string
  timestamp: number
  isDelegation?: boolean
  fromAgent?: string
  toAgent?: string
} {
  const parts = semanticId.split(':')
  
  if (parts.length !== 3) {
    throw new Error(`Invalid semantic step ID format: ${semanticId}. Expected format: "agentId:nodeType:timestamp"`)
  }
  
  const [agentPart, nodeType, timestampStr] = parts
  const timestamp = parseInt(timestampStr, 10)
  
  if (isNaN(timestamp)) {
    throw new Error(`Invalid timestamp in semantic step ID: ${semanticId}`)
  }
  
  // Check if this is a delegation ID (contains arrow)
  const isDelegation = agentPart.includes('→')
  
  if (isDelegation) {
    const [fromAgent, toAgent] = agentPart.split('→')
    return {
      agentId: agentPart,
      nodeType,
      timestamp,
      isDelegation: true,
      fromAgent,
      toAgent,
    }
  }
  
  return {
    agentId: agentPart,
    nodeType,
    timestamp,
  }
}

/**
 * Validates a semantic step ID format
 * 
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * isValidSemanticStepId('cleo-supervisor:router:1762348250879') // → true
 * isValidSemanticStepId('cleo-supervisor_router_1762348250879') // → false (old format)
 * isValidSemanticStepId('cleo-supervisor→astra-email:delegate:1762348250879') // → true
 */
export function isValidSemanticStepId(id: string): boolean {
  try {
    parseSemanticStepId(id)
    return true
  } catch {
    return false
  }
}
