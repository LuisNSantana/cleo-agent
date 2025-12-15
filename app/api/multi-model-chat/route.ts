/**
 * Multi-Model Chat Integration for Cleo Agent
 *
 * This endpoint integrates the multi-model orchestration system
 * with the existing chat API to optimize cost and quality.
 */

import { NextRequest, NextResponse } from 'next/server'
import { MultiModelPipeline } from '@/lib/langchain/pipeline'
import { ModelRouter } from '@/lib/langchain/router'
import { AgentFactory } from '@/lib/langchain/agents'
import { withRequestContext } from '@/lib/server/request-context'
import { z } from 'zod'
import {
	incrementMessageCount,
	logUserMessage,
	storeAssistantMessage,
	validateAndTrackUsage,
} from '../chat/api'
import { buildFinalSystemPrompt } from '@/lib/chat/prompt'
import { setPipelineEventController, clearPipelineEventController } from '@/lib/tools/delegation'
import { analyzeDelegationIntent } from '@/lib/agents/delegation'

// Request schema compatible with main chat endpoint
const PromptVariantSchema = z.enum([
	'default',
	'journalism',
	'developer',
	'reasoning',
	'minimal',
	'debug',
])

const FilePartSchema = z.object({
		type: z.literal('file'),
		name: z.string().optional(),
		mimeType: z.string().optional(),
		mediaType: z.string().optional(),
		content: z.string().optional(),
	url: z.string().optional(),
		size: z.number().optional(),
})

const TextPartSchema = z.object({
		type: z.literal('text'),
		text: z.string().optional(),
		content: z.string().optional(),
})

const MessageContentSchema = z.union([
	z.string(),
	z.array(z.union([FilePartSchema, TextPartSchema])),
])

const LangChainRequestSchema = z.object({
	message: MessageContentSchema,
	type: z.enum(['text', 'multimodal']).optional().default('text'),
	options: z
		.object({
			temperature: z.number().optional().default(0.7),
			enableSearch: z.boolean().optional().default(false),
		})
		.optional()
		.default({}),
	metadata: z
		.object({
			chatId: z.string().optional(),
			userId: z.string().optional(),
			isAuthenticated: z.boolean().optional(),
			systemPrompt: z.string().optional(),
			systemPromptVariant: PromptVariantSchema.optional(),
			originalModel: z.string().optional(),
			message_group_id: z.string().optional(),
			documentId: z.string().optional(),
			projectId: z.string().optional(),
			debugRag: z.boolean().optional(),
			useRAG: z.boolean().optional(),
			maxContextChars: z.number().optional(),
			enableTools: z.boolean().optional(),
				allowedTools: z.array(z.string()).optional(),
				// routing controls
				forceModel: z.union([
					z.literal('local'),
					z.literal('ollama'),
					z.literal('groq'),
					z.literal('openai'),
					z.string(),
				]).optional(),
				preferLocal: z.boolean().optional(),
				maxLocalContext: z.number().optional(),
				// LangChain router type for optimized configurations
				routerType: z.enum(['balanced-local', 'balanced', 'fast']).optional(),
		})
		.optional()
		.default({}),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
	try {
		const pipeline = new MultiModelPipeline()
		const hasGroqKey = !!process.env.GROQ_API_KEY
		const hasOpenAIKey = !!process.env.OPENAI_API_KEY

		return NextResponse.json({
			status: 'healthy',
			service: 'langchain-multi-model-chat',
			timestamp: new Date().toISOString(),
			environment: {
				groqConfigured: hasGroqKey,
				openaiConfigured: hasOpenAIKey,
				allSystemsReady: hasGroqKey && hasOpenAIKey,
			},
			models: {
				'groq:gpt-oss-120b': hasGroqKey ? 'ready' : 'missing-api-key',
				'openai:gpt-4o-mini': hasOpenAIKey ? 'ready' : 'missing-api-key',
			},
			pipelineMetrics: pipeline.getMetrics(),
		})
	} catch (error) {
		console.error('❌ LangChain health check failed:', error)

		return NextResponse.json(
			{
				status: 'unhealthy',
				service: 'langchain-multi-model-chat',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		)
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()

		const parsed = LangChainRequestSchema.safeParse(body)
		if (!parsed.success) {
			console.error('❌ Invalid request schema:', parsed.error)
			return NextResponse.json(
				{ error: 'Invalid request format', details: parsed.error.flatten() },
				{ status: 400 },
			)
		}

		const { message, type, options, metadata } = parsed.data

		// Initialize pipeline
		console.log('⚙️ Initializing LangChain Multi-Model Pipeline')
		const pipeline = new MultiModelPipeline()

		// Validate usage if authenticated
		let supabase: any = null
		let realUserId: string | null = metadata.userId || null
		if (metadata.userId && metadata.isAuthenticated) {
			try {
				supabase = await validateAndTrackUsage({
					userId: metadata.userId,
					model: metadata.originalModel || 'langchain:multi-model-smart',
					isAuthenticated: metadata.isAuthenticated,
				})

				if (supabase) {
					await incrementMessageCount({ supabase, userId: metadata.userId })
					try {
						const { data: userData, error: userError } = await supabase.auth.getUser()
						if (!userError && userData?.user) {
							realUserId = userData.user.id
						}
					} catch {}
				}
			} catch (authError) {
				// For internal calls from /api/chat, we can proceed without strict auth validation
				// The original endpoint already validated the user
			}
		}

		// Build final system prompt (personalization + RAG context) similar to main chat endpoint
		let finalSystemPrompt: string | undefined
		try {
			finalSystemPrompt = (
				await buildFinalSystemPrompt({
					baseSystemPrompt: metadata.systemPrompt,
					model: metadata.originalModel || 'langchain:multi-model-smart',
					messages: [{ role: 'user', content: typeof body.message === 'string' ? body.message : '' }],
					supabase,
					realUserId,
					threadId: metadata.chatId || null,
					enableSearch: options.enableSearch ?? false,
					documentId: metadata.documentId,
					projectId: metadata.projectId,
					debugRag: metadata.debugRag,
				})
			).finalSystemPrompt
		} catch (e) {
			// Use defaults if prompt building fails
		}

		// Process with LangChain pipeline (normalized below)

		// Normalize message to string; detect attachments and set appropriate type/metadata
		let normalizedContent = ''
		let effectiveType: 'text' | 'image' | 'document' = 'text'
	let attachmentMeta: { filename?: string; mimeType?: string; fileSize?: number; imageUrl?: string } = {}

		if (typeof message === 'string') {
			normalizedContent = message
		} else if (Array.isArray(message)) {
			const parts = message
			const textParts: string[] = []
			let sawImage = false
			let sawPdf = false

			for (const part of parts) {
				if ((part as any).type === 'text') {
					const t = (part as any).text || (part as any).content || ''
					if (t) textParts.push(t)
				} else if ((part as any).type === 'file') {
					const name = (part as any).name || 'archivo'
					const mt = (part as any).mimeType || (part as any).mediaType || 'unknown'
					const size = (part as any).size
					const url = (part as any).url || (part as any).content
					attachmentMeta = {
						filename: name,
						mimeType: mt,
						fileSize: typeof size === 'number' ? size : undefined,
						imageUrl: (mt && mt.startsWith('image/') && typeof url === 'string') ? url : undefined,
					}
					if (mt.startsWith('image/')) {
						textParts.push(`[IMAGEN ADJUNTA: ${name}]`)
						sawImage = true
					} else if (mt === 'application/pdf') {
						textParts.push(`[PDF ADJUNTO: ${name}]`)
						sawPdf = true
					} else {
						textParts.push(`[ARCHIVO ADJUNTO: ${name} (${mt})]`)
					}
				}
			}

			normalizedContent = textParts.join('\n\n') || 'Mensaje del usuario'
			effectiveType = sawImage ? 'image' : sawPdf ? 'document' : 'text'
		}

	// Process with LangChain pipeline
	console.log('⚡ Processing with LangChain:', { type: effectiveType, messageLength: normalizedContent.length, hasImageUrl: Boolean(attachmentMeta.imageUrl), mimeType: attachmentMeta.mimeType })
	console.log('🧾 Using systemPromptOverride?', Boolean(finalSystemPrompt))

		// Auto-enable tools if the message likely requires them and not explicitly disabled
		const lowerMsg = (normalizedContent || '').toLowerCase()
		// Detect explicit delegation or app/tool intents
		const mentionsAmi = /\bami\b/.test(lowerMsg)
		const mentionsPeter = /\bpeter\b/.test(lowerMsg)
		const mentionsEmma = /\bemma\b/.test(lowerMsg)
		const mentionsToby = /\btoby\b/.test(lowerMsg)
		const mentionsApu = /\bapu\b/.test(lowerMsg)
		const mentionsNotion = /\bnotion\b/.test(lowerMsg)
		const mentionsWorkspace = /\bworkspace(s)?\b|\bespacio(s)?\s+de\s+trabajo\b/.test(lowerMsg)
		const mentionsDelegate = /\bdeleg(a|ar|aci[oó]n)\b|\b(dile|di|puedes decir(le)?)\s+a\s+(ami|peter|emma|toby|apu)\b/.test(lowerMsg)

		// Use intelligent delegation analyzer for automatic agent detection
		let intelligentDelegation: { agentId: string; toolName: string; confidence: number } | null = null
		try {
			const analysis = analyzeDelegationIntent(normalizedContent || '')
			if (analysis && analysis.confidence > 0.4) { // Lower threshold for multi-model endpoint
				intelligentDelegation = {
					agentId: analysis.agentId,
					toolName: analysis.toolName,
					confidence: analysis.confidence
				}
			}
		} catch (error) {
			// Delegation analysis failed, continue without it
		}

		const likelyToolIntent = (
			/\b(clima|tiempo|pron[oó]stico|weather|forecast)\b/.test(lowerMsg) ||
			/\b(buscar|busca|b[uú]scame|b[uú]squeda|buscarme|search|google)\b/.test(lowerMsg) ||
			/\b(noticias|[uú]ltimas noticias|ultimas noticias)\b/.test(lowerMsg) ||
			/\b(precio|precios|crypto|cripto)\b/.test(lowerMsg) ||
			/\b(calendario|evento|agenda|schedule)\b/.test(lowerMsg) ||
			/\b(email|correo|gmail)\b/.test(lowerMsg) ||
			/\b(drive|archivo|documento|abrir|open|crear|create)\b/.test(lowerMsg) ||
			mentionsNotion || mentionsWorkspace || mentionsDelegate || mentionsAmi || mentionsPeter || mentionsEmma || mentionsToby || mentionsApu ||
			Boolean(intelligentDelegation) // Include intelligent delegation detection
		)

		// If specific subagents are mentioned, prefer enabling only delegation tool(s)
		const allowedToolsAuto: string[] = []
		if (mentionsAmi) allowedToolsAuto.push('delegate_to_ami')
		if (mentionsPeter) allowedToolsAuto.push('delegate_to_peter')
		if (mentionsEmma) allowedToolsAuto.push('delegate_to_emma')
		if (mentionsToby) allowedToolsAuto.push('delegate_to_toby')
		if (mentionsApu) allowedToolsAuto.push('delegate_to_apu')
		
		// Add intelligent delegation tool if detected
		if (intelligentDelegation && !allowedToolsAuto.includes(intelligentDelegation.toolName)) {
			allowedToolsAuto.push(intelligentDelegation.toolName)
		}

		const enableToolsAuto = metadata.enableTools ?? (likelyToolIntent || allowedToolsAuto.length > 0)

		// Attach per-request context so tools can read userId/model
		let reqId: string
		try {
			reqId = crypto.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
		} catch { reqId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}` }
		;(globalThis as any).__currentUserId = realUserId || metadata.userId
		;(globalThis as any).__currentModel = metadata.originalModel || 'langchain:multi-model-smart'
		;(globalThis as any).__requestId = reqId

		const taskInput = {
			content: normalizedContent,
			type: effectiveType,
			metadata: {
				...metadata,
				...options,
				...attachmentMeta,
				threadId: metadata.chatId || null,
				// Ensure agent uses the full personalized + RAG-augmented system prompt
				systemPromptOverride: finalSystemPrompt,
				// Map UI enableSearch to RAG toggle unless explicitly provided
				useRAG: metadata.useRAG ?? options.enableSearch ?? false,
				// Enable tool calling if requested (off by default)
				enableTools: enableToolsAuto,
				allowedTools: Array.isArray((metadata as any).allowedTools)
					? (metadata as any).allowedTools
					: (allowedToolsAuto.length > 0 ? allowedToolsAuto : undefined),
			},
		} as any

		const toolsLikelyEnabled = Boolean(taskInput?.metadata?.enableTools)
		console.log(
			toolsLikelyEnabled
				? '⚡ LangChain tools mode: streaming connection opened'
				: '⚡ LangChain streaming mode (tools disabled): starting token stream',
		)

		// Log and store messages if authenticated and supabase is available
		if (supabase && metadata.chatId && metadata.userId) {
			try {
				// Log user message
				await logUserMessage({
					supabase,
					userId: metadata.userId,
					chatId: metadata.chatId,
					content: normalizedContent,
					model: metadata.originalModel || 'langchain:multi-model-smart',
					message_group_id: metadata.message_group_id,
					isAuthenticated: metadata.isAuthenticated || false,
				})
			} catch (dbError) {
				// Don't fail the entire request if logging fails
			}

		}

		// Return streaming response compatible with frontend SSE parser
		const encoder = new TextEncoder()
				const readable = new ReadableStream<Uint8Array>({
			start(controller) {
				try {
					// Set up pipeline event controller for delegation events
					setPipelineEventController(controller, encoder)

					// Notify start of text stream
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text-start' })}\n\n`))

					// Unified: real token streaming via agent.stream() (works for tools-enabled too).
					;(async () => {
						let finalText = ''
						const toolCallOrder: string[] = []
						const toolCalls = new Map<string, { toolCallId: string; toolName: string; args?: any; result?: any }>()
						try {
							const router = new ModelRouter()
							const routing = router.route(taskInput)
							const usedModel = routing.selectedModel

							const send = (obj: any) => {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
								// Capture tool invocations for persistence
								try {
									if (obj?.type === 'tool-invocation' && obj?.toolInvocation?.toolCallId) {
										const ti = obj.toolInvocation
										const id = String(ti.toolCallId)
										if (!toolCalls.has(id)) {
											toolCallOrder.push(id)
											toolCalls.set(id, { toolCallId: id, toolName: ti.toolName, args: ti.args, result: ti.result })
										} else {
											const existing = toolCalls.get(id)!
											existing.toolName = ti.toolName || existing.toolName
											if (ti.args !== undefined) existing.args = ti.args
											if (ti.result !== undefined) existing.result = ti.result
											toolCalls.set(id, existing)
										}
									}
								} catch {}
							}

							// Emit routing/model info early (matches existing event contract)
							send({
								type: 'route',
								selectedModel: routing.selectedModel,
								fallbackModel: routing.fallbackModel,
								reasoning: routing.reasoning,
								confidence: routing.confidence,
							})
							send({ type: 'model', modelUsed: usedModel, fallback: false })

							// Apply the same metadata optimization the pipeline uses
							taskInput.metadata = pipeline.optimizeContextForModel(taskInput.metadata || {}, usedModel)
							// Allow agents to emit tool events directly into this SSE stream
							;(taskInput.metadata as any).__emitSseEvent = send
							const agent = AgentFactory.getAgent(usedModel) as any

							await withRequestContext(
								{ userId: realUserId || metadata.userId, model: metadata.originalModel || 'langchain:multi-model-smart', requestId: reqId } as any,
								async () => {
									for await (const delta of agent.stream(taskInput)) {
										finalText += delta
										send({ type: 'text-delta', delta })
									}
								},
							)

							// If primary fails and fallback exists, attempt fallback streaming
							// NOTE: streaming errors are caught by outer try/catch and will surface to UI.

							const inputTokens = Math.ceil((normalizedContent || '').length / 4)
							const outputTokens = Math.ceil((finalText || '').length / 4)
							send({
								type: 'finish',
								text: finalText,
								usage: {
									promptTokens: inputTokens,
									completionTokens: outputTokens,
									totalTokens: inputTokens + outputTokens,
								},
							})
							send({ type: '[DONE]' })
							// Back-compat terminator for strict SSE clients
							controller.enqueue(encoder.encode(`data: [DONE]\n\n`))

							// Persist assistant message after stream completes
							if (supabase && metadata.chatId && metadata.userId) {
								try {
									const assistantParts: any[] = []
									for (const id of toolCallOrder) {
										const t = toolCalls.get(id)
										if (!t) continue
										assistantParts.push({
											type: 'tool-invocation',
											toolInvocation: {
												state: 'call',
												step: 0,
												toolCallId: t.toolCallId,
												toolName: t.toolName,
												args: t.args || {},
											},
										})
										if (t.result !== undefined) {
											assistantParts.push({
												type: 'tool-invocation',
												toolInvocation: {
													state: 'result',
													step: 0,
													toolCallId: t.toolCallId,
													toolName: t.toolName,
													result: t.result,
												},
											})
										}
									}
									assistantParts.push({ type: 'text', text: finalText })

									await storeAssistantMessage({
										supabase,
										userId: metadata.userId,
										chatId: metadata.chatId,
										messages: [{ role: 'assistant', content: assistantParts }],
										message_group_id: metadata.message_group_id,
										model: usedModel,
										inputTokens,
										outputTokens,
									})
								} catch {}
							}
						} catch (err) {
							console.error('❌ Streaming error (token stream path):', err)
							try {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'finish', error: 'stream-failed' })}\n\n`))
								controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
							} catch {}
						}
						try { clearPipelineEventController() } catch {}
						try { controller.close() } catch {}
					})().catch(() => {})
				} catch (streamError) {
					console.error('❌ Streaming error:', streamError)
					// Clean up pipeline event controller on error
					clearPipelineEventController()
					controller.error(streamError as any)
				}
			},
		})

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream; charset=utf-8',
				'Cache-Control': 'no-cache, no-transform',
				'Connection': 'keep-alive',
			},
		})
	} catch (error) {
		console.error('❌ LangChain processing error:', error)
		return NextResponse.json(
			{
				error: 'LangChain processing failed',
				details: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		)
	}
}

