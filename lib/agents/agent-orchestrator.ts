/**
 * Modular Legacy Orchestrator Wrapper
 * Clean implementation that delegates to core/orchestrator and preserves legacy API surface.
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { AgentOrchestrator as CoreOrchestrator, ExecutionContext } from '@/lib/agents/core/orchestrator'
import type { AgentConfig, AgentExecution } from '@/lib/agents/types'
import { getRuntimeConfig } from '@/lib/agents/runtime-config'
import { getCurrentUserId } from '@/lib/server/request-context'
import { ALL_PREDEFINED_AGENTS } from '@/lib/agents/predefined'
import logger from '@/lib/utils/logger'
import { safeSetState } from '@/lib/agents/execution-state'
import { emitExecutionEvent } from '@/lib/agents/logging-events'

// Helper to emit structured state change events for legacy execution objects
function emitStateChangeEvent(execution: AgentExecution, prev: string, next: string) {
	try {
		emitExecutionEvent({
			trace_id: execution.id,
			execution_id: execution.id,
			agent_id: execution.agentId,
			user_id: execution.userId,
			thread_id: execution.threadId,
			state: next,
			event: 'state.change',
			level: 'debug',
			data: { prev, next, source: 'legacy-orchestrator' }
		})
	} catch {}
}

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
		
		// CRITICAL: Set up event propagation from core to legacy/UI
		logger.debug('🔍 [LEGACY] Setting up core orchestrator event listeners')
		
		// Listen for delegation progress events from core and propagate to window
		coreInstance.on('delegation.progress', (data: any) => {
			if (typeof window !== 'undefined') {
				const event = new CustomEvent('delegation-progress', { detail: data })
				window.dispatchEvent(event)
			}
			// Also reflect delegation steps into legacy exec registry so polling gets consistent steps
			try {
				const execId = data?.sourceExecutionId
				if (!execId) return
				const exec = execRegistry.find(e => e.id === execId)
				if (!exec) return
				if (!Array.isArray(exec.steps)) exec.steps = []
				exec.steps.push({
					id: `delegation_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
					timestamp: new Date(),
					agent: data?.targetAgent || exec.agentId,
					action: 'delegating',
					content: data?.message || `${data?.targetAgent} working on task`,
					progress: typeof data?.progress === 'number' ? data.progress : 0,
					metadata: {
						sourceAgent: data?.sourceAgent,
						delegatedTo: data?.targetAgent,
						task: data?.task,
						status: data?.status,
						stage: data?.stage
					}
				} as any)
			} catch {}
		})
		
		// Listen for delegation requested events
		coreInstance.on('delegation.requested', (data: any) => {
			if (typeof window !== 'undefined') {
				const event = new CustomEvent('agent-delegation', { detail: { ...data, type: 'requested' } })
				window.dispatchEvent(event)
			}
		})
		
		// Listen for delegation completed events  
		coreInstance.on('delegation.completed', (data: any) => {
			if (typeof window !== 'undefined') {
				const event = new CustomEvent('agent-delegation', { detail: { ...data, type: 'completed' } })
				window.dispatchEvent(event)
			}
			// Append a completion step for visibility in legacy registry
			try {
				const execId = data?.sourceExecutionId
				if (!execId) return
				const exec = execRegistry.find(e => e.id === execId)
				if (!exec) return
				if (!Array.isArray(exec.steps)) exec.steps = []
				exec.steps.push({
					id: `delegation_completed_${Date.now()}`,
					timestamp: new Date(),
					agent: data?.targetAgent || exec.agentId,
					action: 'delegating',
					content: `${data?.targetAgent} completed the task`,
					progress: 100,
					metadata: {
						status: 'completed',
						stage: 'finalizing',
						result: data?.result
					}
				} as any)
			} catch {}
		})
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
	
	const result = (prior || []).flatMap(m => {
		switch (m.role) {
			case 'user': return [new HumanMessage(m.content)]
			case 'assistant': return [new AIMessage(m.content)]
			case 'system': return [new SystemMessage(m.content)]
			case 'tool': {
				// Keep a lightweight breadcrumb as a system note instead of a ToolMessage
				const note = `[tool:${m?.metadata?.name || m?.metadata?.tool_name || 'unknown'}] ${String(m.content).slice(0, 400)}`
				return [new SystemMessage(note)]
			}
			default: return [new HumanMessage(String(m.content || ''))]
		}
	})
	
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
function createAndRunExecution(
	input: string,
	agentId: string | undefined,
	prior: Array<{ role: 'user'|'assistant'|'system'|'tool'; content: string; metadata?: any }>,
	threadId?: string,
	userId?: string
): AgentExecution {
	const core = getCore()
	const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

	// Derive effective user id with fallbacks to survive missing ALS contexts
	let effectiveUserId = userId || getCurrentUserId()
	if (!effectiveUserId) {
		try {
			const g: any = globalThis as any
			effectiveUserId = g.__currentUserId || g.__cleoLastUserId || effectiveUserId
		} catch {}
	}

	const exec: AgentExecution = {
		id: executionId,
		agentId: agentId || 'cleo-supervisor',
			threadId: threadId || 'default',
			userId: effectiveUserId || '00000000-0000-0000-0000-000000000000',
		status: 'running',
		startTime: new Date(),
		messages: [],
		metrics: { totalTokens: 0, inputTokens: 0, outputTokens: 0, executionTime: 0, executionTimeMs: 0, tokensUsed: 0, toolCallsCount: 0, handoffsCount: 0, errorCount: 0, retryCount: 0, cost: 0 },
		steps: []
	}

	// Track tool calls during execution
	const toolCallsUsed: Array<{ id: string; name: string; args: any; result?: any; error?: string }> = []
	
	// Set up tool event listeners for this execution
	const toolExecutingListener = (event: any) => {
		if (event.executionId === executionId || event.agentId === exec.agentId) {
			logger.debug('🔧 [DEBUG] Tool executing:', event.toolName)
			const toolCall = {
				id: event.callId || `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
				name: event.toolName,
				args: event.args || {},
			}
			toolCallsUsed.push(toolCall)

			emitExecutionEvent({
				trace_id: exec.id,
				execution_id: exec.id,
				agent_id: exec.agentId,
				user_id: exec.userId,
				thread_id: exec.threadId,
				state: exec.status,
				event: 'tool.start',
				level: 'debug',
				data: { toolName: event.toolName, callId: toolCall.id }
			})

		// ------------------------------------------------------------------
		// Initial synthetic step to ensure hasSteps=true for UI polling logic
		// Prevents infinite polling states where no steps were ever appended.
		try {
			exec.steps!.push({
				id: `step_${Date.now()}_start`,
				timestamp: new Date(),
				agent: exec.agentId,
				action: 'routing', // closest semantic existing union member for initial phase
				content: `Execution started for ${exec.agentId}\nInput Preview: ${String(input).slice(0,120)}`,
				progress: 0,
				metadata: {
					started: true,
					delegation_entry: prior?.some(m => /delegate_to_/i.test(m.content)) ? 'delegation_chain' : 'direct',
					context_user_id: exec.userId,
					execution_mode: 'legacy-orchestrator',
					threadId: exec.threadId
				}
			})
			logger.debug('🟢 [EXECUTION_START] Created initial step', {
				executionId: exec.id,
				agentId: exec.agentId,
				context_user_id: exec.userId
			})
			
			// structured event for initial step
			emitExecutionEvent({
				trace_id: exec.id,
				execution_id: exec.id,
				agent_id: exec.agentId,
				user_id: exec.userId,
				thread_id: exec.threadId,
				state: exec.status,
				event: 'step.append',
				level: 'debug',
				data: { stepId: exec.steps![exec.steps!.length-1].id, action: 'routing' }
			})
		} catch (e) {
			logger.warn('⚠️ Failed to push initial start step', { executionId: exec.id, error: e instanceof Error ? e.message : e })
		}
		}
	}
	
	const toolCompletedListener = (event: any) => {
		if (event.executionId === executionId || event.agentId === exec.agentId) {
			logger.debug('✅ [DEBUG] Tool completed:', event.toolName, 'result preview:', String(event.result || '').slice(0, 100))
			// Update the corresponding tool call with result
			const toolCall = toolCallsUsed.find(tc => tc.id === event.callId || tc.name === event.toolName)
			if (toolCall) {
				toolCall.result = event.result
				toolCall.error = event.error
			}
			
			emitExecutionEvent({
				trace_id: exec.id,
				execution_id: exec.id,
				agent_id: exec.agentId,
				user_id: exec.userId,
				thread_id: exec.threadId,
				state: exec.status,
				event: 'tool.end',
				level: toolCall?.error ? 'warn' : 'debug',
				data: { toolName: event.toolName, callId: toolCall?.id, error: event.error }
			})
		}
	}
	
	// Add listeners
	core.on('tool.executing', toolExecutingListener)
	core.on('tool.completed', toolCompletedListener)

	// Include runtime agents registered at runtime in addition to predefined
	const allAgents: AgentConfig[] = [
		...ALL_PREDEFINED_AGENTS as unknown as AgentConfig[],
		...Array.from(runtimeAgents.values())
	]
	const target = allAgents.find(a => a.id === (agentId || 'cleo-supervisor')) || allAgents.find(a => a.id === 'cleo-supervisor')!

	const baseMessages = toBaseMessages(prior || [])
	
	// Check if the current input is already the last message in prior messages
	// to avoid duplication (happens when we persist user message then load it back)
	const lastPriorMessage = (prior || []).slice(-1)[0]
	const inputAlreadyInHistory = lastPriorMessage && 
		lastPriorMessage.role === 'user' && 
		lastPriorMessage.content.trim() === input.trim()
	
	const messageHistory = inputAlreadyInHistory 
		? baseMessages  // Don't add input again if it's already the last message
		: [...baseMessages, new HumanMessage(input)]  // Add input if not already present
	
	logger.debug(`🔍 [LEGACY DEBUG] Message history construction:`, {
		executionId,
		priorCount: (prior || []).length,
		inputAlreadyInHistory,
		finalHistoryCount: messageHistory.length,
		lastMessage: messageHistory[messageHistory.length - 1]?.content?.slice(0, 50)
	})

	const ctx: ExecutionContext = {
		threadId: exec.threadId,
		userId: exec.userId,
		agentId: exec.agentId,
		messageHistory,
		metadata: { source: 'legacy-orchestrator', executionId }
	}

		// Run via core orchestrator (includes routing/delegation)
		// Use centralized runtime-config for timeouts
		const runtime = getRuntimeConfig()
		const timeoutMsRaw = target.role === 'supervisor' ? runtime.maxExecutionMsSupervisor : runtime.maxExecutionMsSpecialist
		const hasTimeout = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0
		const timeoutMs = hasTimeout ? timeoutMsRaw : null
		logger.debug(`🔍 [DEBUG] About to call core.executeAgent with timeout ${timeoutMs ?? 'disabled'}ms for agent ${target.id}`)
	
	// Add timeout wrapper to prevent hanging
	// Ensure ALS request context is preserved for downstream tools (calendar, drive, etc.)
	let executionPromise: Promise<any>
	try {
		// Lazy require to avoid client bundle impact
		 
		const { withRequestContext } = require('@/lib/server/request-context')
		logger.debug(`🚀 [LEGACY DEBUG] Starting core execution for agent ${target.id} with timeout ${timeoutMs}ms`)
		executionPromise = withRequestContext({ userId: exec.userId, requestId: exec.id }, () => core.executeAgent(target, ctx, { timeout: timeoutMs ?? undefined }))
		logger.debug('🔐 [LEGACY DEBUG] Wrapped core.executeAgent with request context', { executionId: exec.id, userId: exec.userId })
	} catch (ctxWrapErr) {
		logger.warn('⚠️ [LEGACY DEBUG] Failed to wrap with request context, executing directly', { error: ctxWrapErr instanceof Error ? ctxWrapErr.message : String(ctxWrapErr) })
		executionPromise = core.executeAgent(target, ctx, { timeout: timeoutMs ?? undefined })
	}

	// Rely on core ExecutionManager timeout; do not add another Promise.race here to avoid double timeouts
	const promiseToAwait = executionPromise

	logger.debug(`🔍 [LEGACY DEBUG] Awaiting core execution (timeout handled by core) for agent ${target.id}`)

	promiseToAwait.then(res => {
		logger.info('🔍 [LEGACY DEBUG] Execution completed, processing result:', {
			executionId: exec.id,
			agentId: target.id,
			hasResult: !!res,
			resultType: typeof res,
			resultContent: res && (res as any).content ? String((res as any).content).slice(0, 200) : 'NO_CONTENT',
			resultMetadata: (res as any)?.metadata || {}
		})
		
		const prevStateBeforeComplete = (exec as any).status
		safeSetState(exec as any, 'completed', logger as any)
		if (prevStateBeforeComplete !== (exec as any).status) emitStateChangeEvent(exec, prevStateBeforeComplete, (exec as any).status)
		exec.endTime = new Date()
		const content = (res && (res as any).content) || ''
		exec.messages = exec.messages || []
		
		logger.debug('🔍 [LEGACY DEBUG] Pre-push state:', {
			executionId: exec.id,
			messagesArrayLength: exec.messages.length,
			extractedContent: String(content).slice(0, 200),
			contentLength: String(content).length
		})
		
		// CRITICAL FIX: Use the actual delegated agent from result metadata, not the original target
		const actualSender = (res && (res as any).metadata?.sender) || target.id
		
		try {
			// CRITICAL FIX: Use messages from ExecutionResult if available (from graph execution)
			// This preserves the full conversation state instead of just the final message
			if ((res as any)?.messages && Array.isArray((res as any).messages)) {
				console.log('🔵 [LEGACY DEBUG] Using messages from ExecutionResult:', {
					executionId: exec.id,
					resultMessagesCount: (res as any).messages.length,
					resultMessages: (res as any).messages.map((m: any) => ({
						type: m.constructor?.name,
						content: String(m.content || '').slice(0, 100)
					}))
				})
				
				// Convert LangChain messages to execution message format
				exec.messages = (res as any).messages.map((msg: any, index: number) => {
					const isAI = msg.constructor?.name === 'AIMessage' || msg.type === 'ai'
					const isUser = msg.constructor?.name === 'HumanMessage' || msg.type === 'user' || msg.type === 'human'
					const isSystem = msg.constructor?.name === 'SystemMessage' || msg.type === 'system'
					
					return {
						id: `${exec.id}_msg_${index}`,
						type: isAI ? 'ai' : (isUser ? 'user' : (isSystem ? 'system' : 'ai')),
						content: String(msg.content || ''),
						timestamp: new Date(),
						metadata: { 
							sender: (msg as any)?.additional_kwargs?.sender || actualSender,
							source: 'graph_execution'
						},
						toolCalls: (msg as any)?.tool_calls || []
					}
				})
				
				console.log('🔵 [LEGACY DEBUG] Converted messages:', {
					executionId: exec.id,
					convertedCount: exec.messages.length,
					finalMessagePreview: exec.messages[exec.messages.length - 1]
				})
			} else {
				// Fallback: single message from content (legacy behavior)
				console.log('🔵 [LEGACY DEBUG] Using fallback single message approach')
				
				// Extract toolCalls from the result if available, or use captured tools
				const resultToolCalls = (res && (res as any).toolCalls) ? (res as any).toolCalls.map((tc: any) => ({
					id: tc.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
					name: tc.name || 'unknown',
					args: tc.args || {},
					result: tc.result,
					error: tc.error
				})) : []
				
				// Use captured tool calls if result doesn't have them
				const finalToolCalls = resultToolCalls.length > 0 ? resultToolCalls : toolCallsUsed
				
				exec.messages.push({ 
					id: `${exec.id}_final`, 
					type: 'ai', 
					content: String(content), 
					timestamp: new Date(), 
					metadata: { sender: actualSender, source: 'core' },
					toolCalls: finalToolCalls
				})
			}
			
			logger.info('🔍 [LEGACY DEBUG] Final message pushed to execution:', {
				executionId: exec.id,
				messageId: exec.messages[exec.messages.length - 1]?.id,
				contentLength: exec.messages[exec.messages.length - 1]?.content?.length || 0,
				actualSender,
				toolCallsCount: exec.messages.reduce((count, msg) => count + (msg.toolCalls?.length || 0), 0),
				totalMessagesNow: exec.messages.length
			})
			
			// Update metrics with tool call count from all messages
			exec.metrics.toolCallsCount = exec.messages.reduce((count, msg) => count + (msg.toolCalls?.length || 0), 0)
			
			// structured log success completion
			emitExecutionEvent({
				trace_id: exec.id,
				execution_id: exec.id,
				agent_id: exec.agentId,
				user_id: exec.userId,
				thread_id: exec.threadId,
				state: exec.status,
				event: 'execution.complete',
				level: 'info',
				data: { messages: exec.messages.length, toolCalls: exec.metrics.toolCallsCount }
			})
			
			// Clean up listeners
			core.off?.('tool.executing', toolExecutingListener)
			core.off?.('tool.completed', toolCompletedListener)
		} catch (pushError) {
			logger.error('🔍 [DEBUG] Error pushing message:', pushError)
		}
		
		try {
			listeners.forEach(fn => fn({ type: 'execution_completed', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id } }))
		} catch (listenerError) {
			logger.error('🔍 [DEBUG] Error notifying listeners:', listenerError)
		}
	}).catch(err => {
		logger.error('🚨 [LEGACY DEBUG] Execution error caught:', {
			executionId: exec.id,
			agentId: target.id,
			error: err instanceof Error ? err.message : String(err),
			isTimeout: err.message?.includes('timeout'),
			stack: err instanceof Error ? err.stack : undefined
		})
		
		// For timeout errors, try to capture any partial results (soft-timeout behavior)
		if (err.message.includes('timeout')) {
			// Check if we have any tool calls captured during execution
			if (toolCallsUsed.length > 0) {
				const prevStatePartial = (exec as any).status
				safeSetState(exec as any, 'completed', logger as any) // Mark as completed since we have partial results
				if (prevStatePartial !== (exec as any).status) emitStateChangeEvent(exec, prevStatePartial, (exec as any).status)
				exec.endTime = new Date()
				exec.messages = exec.messages || []
				
				// Create a summary message with available tool results
				const partialContent = `He realizado una investigación parcial con los resultados disponibles. Se ejecutaron ${toolCallsUsed.length} herramientas de investigación.`
				
				try {
					exec.messages.push({ 
						id: `${exec.id}_partial`, 
						type: 'ai', 
						content: partialContent, 
						timestamp: new Date(), 
						metadata: { sender: target.id, source: 'partial_timeout', partial: true },
						toolCalls: toolCallsUsed
					})
					
					exec.metrics.toolCallsCount = toolCallsUsed.length
					
					logger.info('🔍 [DEBUG] Partial results saved, tool calls:', toolCallsUsed.length)
					
					// Notify listeners of successful completion with partial results
					listeners.forEach(fn => fn({ type: 'execution_completed', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id, partial: true } }))
					
					// Clean up listeners
					core.off?.('tool.executing', toolExecutingListener)
					core.off?.('tool.completed', toolCompletedListener)
					
					// structured log partial completion (timeout path)
					emitExecutionEvent({
						trace_id: exec.id,
						execution_id: exec.id,
						agent_id: exec.agentId,
						user_id: exec.userId,
						thread_id: exec.threadId,
						state: exec.status,
						event: 'execution.complete.partial',
						level: 'warn',
						data: { toolCalls: toolCallsUsed.length, timeoutPartial: true }
					})
					
					return // Exit early since we handled the timeout gracefully
				} catch (partialError) {
					logger.error('🔍 [DEBUG] Error saving partial results:', partialError)
				}
			}
		}
		
		// Default error handling for non-timeout errors or when partial results failed
		const prevStateFailed = (exec as any).status
		safeSetState(exec as any, 'failed', logger as any)
		if (prevStateFailed !== (exec as any).status) emitStateChangeEvent(exec, prevStateFailed, (exec as any).status)
		exec.endTime = new Date()
		exec.error = err instanceof Error ? err.message : String(err)
		
		// Clean up listeners on error too
		core.off?.('tool.executing', toolExecutingListener)
		core.off?.('tool.completed', toolCompletedListener)
		
		listeners.forEach(fn => fn({ type: 'error', agentId: exec.agentId, timestamp: new Date(), data: { executionId: exec.id, error: exec.error } }))
		
		emitExecutionEvent({
			trace_id: exec.id,
			execution_id: exec.id,
			agent_id: exec.agentId,
			user_id: exec.userId,
			thread_id: exec.threadId,
			state: exec.status,
			event: 'execution.error',
			level: 'error',
			data: { error: exec.error }
		})
	})

	// Structured log: execution.start
	emitExecutionEvent({
		trace_id: exec.id,
		execution_id: exec.id,
		agent_id: exec.agentId,
		user_id: exec.userId,
		thread_id: exec.threadId,
		state: exec.status,
		event: 'execution.start',
		level: 'info',
		data: { inputPreview: input.slice(0,200), priorCount: prior?.length || 0 }
	})

	execRegistry.push(exec)
	return exec
}

// ----------------------------------------------------------------------------
// Public API (legacy-compatible)
// ----------------------------------------------------------------------------
export function getAgentOrchestrator() {
	const core = getCore() // Ensure core is available
	const api = {
		__id: 'modular-legacy-orchestrator',
		
		// EXPOSE CORE ORCHESTRATOR for adapter access
		core: core,


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
			// Use the same execution logic with filtered messages and propagate ids
			return createAndRunExecution(input, agentId, prior || [], threadId, userId)
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
			const allAgents: AgentConfig[] = [...ALL_PREDEFINED_AGENTS]
			allAgents.forEach((a: AgentConfig) => map.set(a.id, a))
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
		},

		// CRITICAL FIX: Handle completion notifications from Core Orchestrator
		handleExecutionCompletion(execution: any) {
			logger.debug('🔍 [LEGACY] Received execution completion from core:', execution.id)
			
			// Find the execution in our registry and mark it completed
			let exec = execRegistry.find((e: any) => e.id === execution.id)
			
			if (!exec) {
				logger.debug('🔍 [LEGACY] Execution not found in registry, creating new entry:', execution.id)
				// Create a new execution entry for delegated executions that weren't tracked
				const newExec: AgentExecution = {
					id: execution.id,
					agentId: execution.agentId || 'unknown',
					threadId: execution.threadId || 'unknown',
					userId: execution.userId || 'unknown', 
					status: 'completed' as const,
					startTime: execution.startTime || new Date(),
					endTime: execution.endTime || new Date(),
					messages: execution.messages || [],
					steps: execution.steps || [],
					metrics: execution.metrics || { toolCallsCount: 0, tokensUsed: 0 }
				}
				execRegistry.push(newExec)
				exec = newExec
			} else {
				const prevCoreState = (exec as any).status
				safeSetState(exec as any, 'completed', logger as any)
				if (prevCoreState !== (exec as any).status) emitStateChangeEvent(exec, prevCoreState, (exec as any).status)
				exec.endTime = execution.endTime || new Date()
			}
			
			// Ensure final message is included
			if (execution.messages && execution.messages.length > 0) {
				const lastMessage = execution.messages[execution.messages.length - 1]
				if (lastMessage.type === 'ai' && lastMessage.content && exec) {
					// Check if we already have this message
					const existingMessage = exec.messages.find((m: any) => m.id === lastMessage.id)
					if (!existingMessage) {
						exec.messages.push(lastMessage)
						logger.debug('🔍 [LEGACY] Added final AI message to execution')
					}
				}
			}
			
			// Notify listeners of completion
			if (exec) {
				try {
					listeners.forEach(fn => fn({ 
						type: 'execution_completed', 
						agentId: exec!.agentId, 
						timestamp: new Date(), 
						data: { executionId: exec!.id } 
					}))
					logger.debug('🔍 [LEGACY] Listeners notified of completion for:', exec.id)
				} catch (error) {
					logger.error('🔍 [LEGACY] Error notifying listeners:', error)
				}
			}
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

