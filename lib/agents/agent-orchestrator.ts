/**
 * Modular Legacy Orchestrator Wrapper
 * Clean implementation that delegates to core/orchestrator and preserves legacy API surface.
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { AgentOrchestrator as CoreOrchestrator, ExecutionContext } from '@/lib/agents/core/orchestrator'
import type { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { getAllAgents } from '@/lib/agents/config'

// ----------------------------------------------------------------------------
// Global singletons/state (survives route reloads)
// ----------------------------------------------------------------------------
const g = globalThis as any
if (!g.__cleoRuntimeAgents) g.__cleoRuntimeAgents = new Map<string, AgentConfig>()
if (!g.__cleoExecRegistry) g.__cleoExecRegistry = [] as AgentExecution[]
if (!g.__cleoOrchListeners) g.__cleoOrchListeners = [] as Array<(event: any) => void>

const runtimeAgents = g.__cleoRuntimeAgents as Map<string, AgentConfig>
const execRegistry = g.__cleoExecRegistry as AgentExecution[]
const listeners = g.__cleoOrchListeners as Array<(event: any) => void>

let coreInstance: CoreOrchestrator | null = null
function getCore(): CoreOrchestrator {
	if (!coreInstance) {
		coreInstance = new CoreOrchestrator({ enableMetrics: true, enableMemory: true })
	}
	return coreInstance
}

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------
function toBaseMessages(prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): BaseMessage[] {
	// IMPORTANT: Do NOT replay historical 'tool' messages to the model. LangChain requires
	// tool messages to directly follow a model message that has tool_calls in the SAME turn.
	// Replaying old tool messages causes 400 errors. We skip them or convert to system notes.
	
	console.log('🔍 [DEBUG] Legacy toBaseMessages - Input count:', prior?.length || 0)
	
	const result = (prior || []).flatMap(m => {
		switch (m.role) {
			case 'user': return [new HumanMessage(m.content)]
			case 'assistant': return [new AIMessage(m.content)]
			case 'system': return [new SystemMessage(m.content)]
			case 'tool': {
				// Keep a lightweight breadcrumb as a system note instead of a ToolMessage
				console.log('🔍 [DEBUG] Converting tool message to system note:', m.content.slice(0, 100))
				const note = `[tool:${m?.metadata?.name || m?.metadata?.tool_name || 'unknown'}] ${String(m.content).slice(0, 400)}`
				return [new SystemMessage(note)]
			}
			default: return [new HumanMessage(String(m.content || ''))]
		}
	})
	
	console.log('🔍 [DEBUG] Legacy toBaseMessages - Output count:', result.length)
	return result
}

function resolveModelInfo(agentConfig: AgentConfig) {
	const id = agentConfig.model || ''
	let provider = 'openai'
	let modelName = id

	const lower = id.toLowerCase()
	if (lower.startsWith('gpt-') || lower.startsWith('openai:')) provider = 'openai'
	else if (lower.includes('claude') || lower.startsWith('anthropic:')) provider = 'anthropic'
	else if (lower.startsWith('ollama:') || lower.includes('llama')) provider = 'ollama'
	else if (lower.startsWith('groq:')) provider = 'groq'
	else if (lower.includes('gemini') || lower.startsWith('google:')) provider = 'google'

	// Normalize a few common shortcuts
	switch (id) {
		case 'gpt-4o': modelName = 'gpt-4o'; provider = 'openai'; break
		case 'gpt-4o-mini': modelName = 'gpt-4o-mini'; provider = 'openai'; break
	}

	return { provider, modelName, configured: id, timestamp: new Date().toISOString() }
}

// ----------------------------------------------------------------------------
// Execution
// ----------------------------------------------------------------------------
function createAndRunExecution(input: string, agentId: string | undefined, prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>): AgentExecution {
	const core = getCore()
	const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

	const exec: AgentExecution = {
		id: executionId,
		agentId: agentId || 'cleo-supervisor',
		threadId: 'default',
		userId: 'anonymous',
		status: 'running',
		startTime: new Date(),
		messages: [],
		metrics: { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 },
		steps: []
	}

	const target = getAllAgents().find(a => a.id === (agentId || 'cleo-supervisor')) || getAllAgents().find(a => a.id === 'cleo-supervisor')!

	const ctx: ExecutionContext = {
		threadId: exec.threadId,
		userId: exec.userId,
		agentId: exec.agentId,
		messageHistory: [...toBaseMessages(prior || []), new HumanMessage(input)],
		metadata: { source: 'legacy-orchestrator', executionId }
	}

	// Run via core orchestrator (includes routing/delegation)
		core.executeAgent(target, ctx, { timeout: 60000 }).then(res => {
			exec.status = 'completed'
			exec.endTime = new Date()
			const content = (res && (res as any).content) || ''
			exec.messages = exec.messages || []
			
			// CRITICAL FIX: Use the actual delegated agent from result metadata, not the original target
			const actualSender = (res && (res as any).metadata?.sender) || target.id
			console.log('🔍 [DEBUG] Legacy orchestrator - Final message sender:', {
				originalTargetId: target.id,
				resultSender: (res && (res as any).metadata?.sender),
				finalSender: actualSender,
				resultMetadata: (res && (res as any).metadata)
			})
			
			exec.messages.push({ id: `${exec.id}_final`, type: 'ai', content: String(content), timestamp: new Date(), metadata: { sender: actualSender, source: 'core' } })
		listeners.forEach(fn => fn({ type: 'execution_completed', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id } }))
	}).catch(err => {
		exec.status = 'failed'
		exec.endTime = new Date()
		exec.error = err instanceof Error ? err.message : String(err)
		listeners.forEach(fn => fn({ type: 'error', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id, error: exec.error } }))
	})

	execRegistry.push(exec)
	return exec
}

// ----------------------------------------------------------------------------
// Public API (legacy-compatible)
// ----------------------------------------------------------------------------
export function getAgentOrchestrator() {
	const api = {
		__id: 'modular-legacy-orchestrator',

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
			// Use the same execution logic with filtered messages
			return createAndRunExecution(input, agentId, prior || [])
		},

		getExecution(executionId: string) {
			return execRegistry.find(e => e.id === executionId) || null
		},

		getAllExecutions(): AgentExecution[] {
			return [...execRegistry]
		},

		getActiveExecutions(): AgentExecution[] {
			// Prefer core for active executions if available
			try {
				const core = getCore()
				const active = core.getActiveExecutions?.() || []
				// Merge/dedupe with local registry
				const map = new Map<string, AgentExecution>()
				active.forEach(e => map.set(e.id, e))
				execRegistry.filter(e => e.status === 'running').forEach(e => map.set(e.id, e))
				return Array.from(map.values())
			} catch {
				return execRegistry.filter(e => e.status === 'running')
			}
		},

		getAgentConfigs(): Map<string, AgentConfig> {
			const map = new Map<string, AgentConfig>()
			getAllAgents().forEach(a => map.set(a.id, a))
			runtimeAgents.forEach((a, id) => map.set(id, a))
			return map
		},

		registerRuntimeAgent(agentConfig: AgentConfig) {
			runtimeAgents.set(agentConfig.id, agentConfig)
			return true
		},

		removeRuntimeAgent(agentId: string) {
			return runtimeAgents.delete(agentId)
		},

		getModelInfo(agentId?: string) {
			const targetId = agentId || 'cleo-supervisor'
			const cfg = this.getAgentConfigs().get(targetId)
			if (!cfg) return null
			return { agentId: targetId, ...resolveModelInfo(cfg) }
		},

		onEvent(fn: (event: any) => void) {
			listeners.push(fn)
		},

		offEvent(fn: (event: any) => void) {
			const idx = listeners.indexOf(fn)
			if (idx >= 0) listeners.splice(idx, 1)
		},

		cleanup() {
			listeners.splice(0, listeners.length)
		}
	}

	// Expose singleton globally for adapter fallbacks
	;(globalThis as any).__cleoOrchestrator = api
	return api
}

// Convenience wrapper
export function registerRuntimeAgent(agentConfig: AgentConfig) {
	const orch = getAgentOrchestrator() as any
	return orch.registerRuntimeAgent(agentConfig)
}

export function recreateAgentOrchestrator() {
	// Reset core and listeners
	const g = globalThis as any
	try { g.__cleoCoreOrchestrator?.shutdown?.() } catch {}
	delete g.__cleoCoreOrchestrator
	coreInstance = null
	listeners.splice(0, listeners.length)
	return getAgentOrchestrator()
}

