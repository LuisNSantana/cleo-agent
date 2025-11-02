/**
 * STATELESS Legacy Orchestrator Wrapper
 * Thin adapter that delegates ALL operations to CoreOrchestrator (single source of truth).
 * Does NOT maintain its own execution state - CoreOrchestrator.activeExecutions is authoritative.
 * 
 * Based on official LangGraph patterns:
 * - interrupt() for HITL pauses
 * - Command(resume=value) for resuming
 * - MemorySaver checkpointer for persistence
 * - All execution state in CoreOrchestrator.activeExecutions Map
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getGlobalOrchestrator, AgentOrchestrator as CoreOrchestrator, type ExecutionContext } from '@/lib/agents/core/orchestrator'
import type { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { getCurrentUserId } from '@/lib/server/request-context'
import { getAllAgents } from '@/lib/agents/unified-config'
import logger from '@/lib/utils/logger'

// ----------------------------------------------------------------------------
// Global state for backward compatibility (minimal - only for listeners)
// ----------------------------------------------------------------------------
const g = globalThis as any
if (!g.__cleoOrchListeners) g.__cleoOrchListeners = [] as Array<(event: any) => void>
const listeners = g.__cleoOrchListeners as Array<(event: any) => void>

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------
function toBaseMessages(prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): BaseMessage[] {
	return (prior || []).flatMap(m => {
		switch (m.role) {
			case 'user': return [new HumanMessage(m.content)]
			case 'assistant': return [new AIMessage(m.content)]
			case 'system': return [new SystemMessage(m.content)]
			case 'tool': {
				// Convert stale tool messages to system notes (avoid LangChain errors)
				const note = `[tool:${m?.metadata?.name || m?.metadata?.tool_name || 'unknown'}] ${String(m.content).slice(0, 400)}`
				return [new SystemMessage(note)]
			}
			default: return [new HumanMessage(String(m.content || ''))]
		}
	})
}

// ----------------------------------------------------------------------------
// Execution helpers that delegate to CoreOrchestrator
// ----------------------------------------------------------------------------
async function createAndRunExecution(
	input: string,
	agentId: string | undefined,
	prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
	threadId?: string,
	userId?: string
): Promise<AgentExecution> {
	const core = getGlobalOrchestrator()
	
	// Derive effective user id with fallbacks
	let effectiveUserId = userId || getCurrentUserId()
	if (!effectiveUserId) {
		try {
			const g: any = globalThis as any
			effectiveUserId = g.__currentUserId || g.__cleoLastUserId || effectiveUserId
		} catch {}
	}
	const finalUserId = effectiveUserId || '00000000-0000-0000-0000-000000000000'
	
	// Get agent config
	const allAgents = await getAllAgents(finalUserId)
	const targetId = agentId || 'cleo-supervisor'
	const target = allAgents.find(a => a.id === targetId) || allAgents.find(a => a.id === 'cleo-supervisor')!
	
	// Create execution context
	const baseMessages = toBaseMessages(prior || [])
	
	// Check if input is already in history (avoid duplication)
	const lastPriorMessage = (prior || []).slice(-1)[0]
	const inputAlreadyInHistory = lastPriorMessage && 
		lastPriorMessage.role === 'user' && 
		lastPriorMessage.content.trim() === input.trim()
	
	const messageHistory = inputAlreadyInHistory 
		? baseMessages
		: [...baseMessages, new HumanMessage(input)]
	
	const ctx: ExecutionContext = {
		threadId: threadId || `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
		userId: finalUserId,
		agentId: targetId,
		messageHistory,
		metadata: { 
			source: 'legacy-orchestrator', 
			executionId: undefined,
			threadId: threadId || null // ✅ CRITICAL: Pass thread for RAG isolation in graph state
		}
	}
	
	logger.debug(`🔍 [LEGACY WRAPPER] Delegating to CoreOrchestrator:`, {
		agentId: targetId,
		userId: finalUserId,
		threadId: ctx.threadId,
		messageCount: messageHistory.length
	})
	
	// CRITICAL FIX: Don't await executeAgent! Return the execution immediately
	// so SSE polling can start watching it while it's still running.
	// The execution will be in CoreOrchestrator.activeExecutions immediately.
	
	// CRITICAL: Pass timeout for HITL-enabled agents
	// Need minimum 10 minutes to allow 5-minute approval wait + buffer + execution time
	// This prevents delegations from timing out while waiting for user approval
	const HITL_SAFE_TIMEOUT_MS = 600_000 // 10 minutes
	
	// Start execution (don't await)
	const executionPromise = core.executeAgent(target, ctx, { timeout: HITL_SAFE_TIMEOUT_MS })
	
	// Get the execution ID that was just created (it's in activeExecutions now)
	// CoreOrchestrator.executeAgent creates the execution synchronously before async work
	const executions = core.getActiveExecutions()
	const execution = executions.find(e => 
		e.agentId === targetId && 
		e.userId === finalUserId &&
		e.threadId === ctx.threadId
	)
	
	if (!execution) {
		logger.error('[LEGACY WRAPPER] Failed to find execution after starting:', {
			targetId,
			userId: finalUserId,
			threadId: ctx.threadId,
			activeExecutionIds: executions.map(e => e.id)
		})
		// Fallback: wait for promise and try again
		await executionPromise
		const retryExecs = core.getActiveExecutions()
		const retryExec = retryExecs.find(e => e.agentId === targetId && e.userId === finalUserId)
		if (retryExec) return retryExec
		throw new Error('Execution not found in CoreOrchestrator')
	}
	
	logger.debug('[LEGACY WRAPPER] Found running execution:', {
		id: execution.id,
		status: execution.status,
		stepsCount: execution.steps?.length || 0
	})
	
	// Start execution in background (don't block HTTP response)
	executionPromise.then(result => {
		logger.debug('[LEGACY WRAPPER] Execution completed:', {
			id: execution.id,
			status: execution.status
		})
		
		// Notify legacy listeners for backward compatibility
		try {
			listeners.forEach(fn => fn({ 
				type: 'execution_completed', 
				agentId: execution.agentId, 
				timestamp: new Date(), 
				data: { executionId: execution.id } 
			}))
		} catch (err) {
			logger.warn('[LEGACY WRAPPER] Error notifying listeners:', err)
		}
	}).catch(err => {
		logger.error('[LEGACY WRAPPER] Execution failed:', err)
	})
	
	// Return the execution immediately (it's running in background)
	return execution
}

// ----------------------------------------------------------------------------
// Public API (legacy-compatible)
// ----------------------------------------------------------------------------
export function getAgentOrchestrator() {
	const core = getGlobalOrchestrator()
	
	const api = {
		__id: 'stateless-legacy-wrapper',
		
		// Expose core for direct access if needed
		core: core,

		// Fire-and-forget style execution
		executeAgent(input: string, agentId?: string) {
			return createAndRunExecution(input, agentId, [])
		},

		startAgentExecution(input: string, agentId?: string) {
			return createAndRunExecution(input, agentId, [])
		},

		startAgentExecutionWithHistory(
			input: string,
			agentId: string | undefined,
			prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>
		) {
			return createAndRunExecution(input, agentId, prior)
		},

		// Dual-mode execution for UI with enhanced context
		startAgentExecutionForUI(
			input: string, 
			agentId?: string, 
			threadId?: string, 
			userId?: string, 
			prior?: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
			forceSupervised?: boolean
		) {
			return createAndRunExecution(input, agentId, prior || [], threadId, userId)
		},

		// Execution getters - delegate to CoreOrchestrator (single source of truth)
		getExecution(executionId: string): AgentExecution | null {
			logger.debug('[LEGACY WRAPPER] getExecution called:', executionId)
			
			// CoreOrchestrator.activeExecutions is the ONLY source of truth
			const execution = core.getExecutionStatus(executionId)
			
			if (execution) {
				logger.debug('[LEGACY WRAPPER] Found execution in CoreOrchestrator:', {
					id: execution.id,
					status: execution.status,
					stepsCount: execution.steps?.length || 0
				})
			} else {
				logger.warn('[LEGACY WRAPPER] Execution not found:', executionId)
			}
			
			return execution as AgentExecution | null
		},

		getAllExecutions(): AgentExecution[] {
			const executions = core.getActiveExecutions()
			logger.debug('[LEGACY WRAPPER] getAllExecutions:', executions.length)
			return executions
		},

		getActiveExecutions(): AgentExecution[] {
			const active = core.getActiveExecutions()
			logger.debug('[LEGACY WRAPPER] getActiveExecutions:', active.length)
			return active
		},

		// Agent management - delegate to unified config
		async getAgentConfigs(): Promise<Map<string, AgentConfig>> {
			try {
				const userId = getCurrentUserId() || '00000000-0000-0000-0000-000000000000'
				const agents = await getAllAgents(userId)
				const map = new Map<string, AgentConfig>()
				agents.forEach(a => map.set(a.id, a))
				return map
			} catch {
				return new Map()
			}
		},

		// Runtime registration not supported in stateless wrapper
		registerRuntimeAgent(agentConfig: AgentConfig) {
			logger.warn('[LEGACY WRAPPER] registerRuntimeAgent called but not supported in stateless wrapper')
			return false
		},

		removeRuntimeAgent(agentId: string) {
			logger.warn('[LEGACY WRAPPER] removeRuntimeAgent called but not supported in stateless wrapper')
			return false
		},

		// Model info
		async getModelInfo(agentId?: string) {
			try {
				const userId = getCurrentUserId() || '00000000-0000-0000-0000-000000000000'
				const targetId = agentId || 'cleo-supervisor'
				const agents = await getAllAgents(userId)
				const agentConfig = agents.find(a => a.id === targetId)
				
				if (agentConfig) {
					let provider = 'openai'
					let modelName = 'gpt-4o-mini'
					
					const lower = agentConfig.model?.toLowerCase() || ''
					if (lower.startsWith('gpt-') || lower.startsWith('openai:')) provider = 'openai'
					else if (lower.includes('claude') || lower.startsWith('anthropic:')) provider = 'anthropic'
					else if (lower.startsWith('ollama:') || lower.includes('llama')) provider = 'ollama'
					else if (lower.startsWith('groq:')) provider = 'groq'
					else if (lower.includes('gemini') || lower.startsWith('google:')) provider = 'google'
					
					return {
						agentId: targetId,
						provider,
						modelName: agentConfig.model || modelName,
						configured: agentConfig.model || modelName,
						timestamp: new Date().toISOString()
					}
				}
				
				return null
			} catch {
				return null
			}
		},

		// Event listeners for backward compatibility
		onEvent(fn: (event: any) => void) {
			listeners.push(fn)
			// Also subscribe to CoreOrchestrator events
			core.on('execution.completed', (execution: AgentExecution) => {
				fn({ type: 'execution_completed', agentId: execution.agentId, timestamp: new Date(), data: { executionId: execution.id } })
			})
			core.on('execution.failed', (execution: AgentExecution) => {
				fn({ type: 'error', agentId: execution.agentId, timestamp: new Date(), data: { executionId: execution.id, error: execution.error } })
			})
		},

		offEvent(fn: (event: any) => void) {
			const idx = listeners.indexOf(fn)
			if (idx >= 0) listeners.splice(idx, 1)
		},

		cleanup() {
			listeners.splice(0, listeners.length)
		},

		// Handle completion notifications from Core Orchestrator
		handleExecutionCompletion(execution: any) {
			logger.debug('[LEGACY WRAPPER] handleExecutionCompletion called:', execution.id)
			// No-op in stateless wrapper - CoreOrchestrator is already authoritative
		}
	}

	// Expose singleton globally for backward compatibility
	;(globalThis as any).__cleoOrchestrator = api
	return api
}

// Convenience wrapper
export function registerRuntimeAgent(agentConfig: AgentConfig) {
	const orch = getAgentOrchestrator() as any
	return orch.registerRuntimeAgent(agentConfig)
}

export function recreateAgentOrchestrator() {
	// Reset listeners only
	listeners.splice(0, listeners.length)
	return getAgentOrchestrator()
}
