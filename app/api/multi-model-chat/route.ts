/**
 * Multi-Model Chat Integration for Cleo Agent
 *
 * This endpoint integrates the multi-model orchestration system
 * with the existing chat API to optimize cost and quality.
 */

import { NextRequest, NextResponse } from 'next/server'
import { MultiModelPipeline } from '@/lib/langchain/pipeline'
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
	console.log('🔗 LangChain Multi-Model Chat - Health Check')

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
	console.log('🚀 LangChain Multi-Model Chat - Processing Request')

	try {
		const body = await req.json()
		console.log('📨 Request body:', {
			message: typeof body.message === 'string' ? `${body.message.substring(0, 100)}...` : undefined,
			type: body.type,
			hasMetadata: !!body.metadata,
			userId: body.metadata?.userId,
		})

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
			console.log('👤 Validating user:', metadata.userId)
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
							console.log('🔍 Using real Supabase user ID for LangChain:', realUserId)
						}
					} catch {}
				}
			} catch (authError) {
				console.warn(
					'⚠️ Authentication validation failed for internal call, proceeding without auth:',
					authError,
				)
				// For internal calls from /api/chat, we can proceed without strict auth validation
				// The original endpoint already validated the user
			}
		}

		// Build final system prompt (personalization + RAG context) similar to main chat endpoint
		let finalSystemPrompt: string | undefined
		try {
			console.log('🔍 Building final system prompt with:', {
				originalModel: metadata.originalModel,
				systemPrompt: metadata.systemPrompt ? 'present' : 'not present',
				systemPromptLength: metadata.systemPrompt?.length || 0,
			})
			finalSystemPrompt = (
				await buildFinalSystemPrompt({
					baseSystemPrompt: metadata.systemPrompt,
					model: metadata.originalModel || 'langchain:multi-model-smart',
					messages: [{ role: 'user', content: typeof body.message === 'string' ? body.message : '' }],
					supabase,
					realUserId,
					enableSearch: options.enableSearch ?? false,
					documentId: metadata.documentId,
					projectId: metadata.projectId,
					debugRag: metadata.debugRag,
				})
			).finalSystemPrompt
			if (finalSystemPrompt) {
				console.log('[LangChain] Final system prompt prepared. length:', finalSystemPrompt.length)
			}
		} catch (e) {
			console.warn('[LangChain] Failed to build final system prompt, using defaults')
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
			console.log('🧠 [MULTI-MODEL] Analyzing for delegation:', normalizedContent?.substring(0, 100))
			const analysis = analyzeDelegationIntent(normalizedContent || '')
			if (analysis && analysis.confidence > 0.4) { // Lower threshold for multi-model endpoint
				intelligentDelegation = {
					agentId: analysis.agentId,
					toolName: analysis.toolName,
					confidence: analysis.confidence
				}
				console.log('🎯 [MULTI-MODEL] Auto-detected delegation:', intelligentDelegation)
			}
		} catch (error) {
			console.warn('⚠️ [MULTI-MODEL] Delegation analysis failed:', error)
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
			console.log('🤖 [MULTI-MODEL] Added intelligent delegation tool:', intelligentDelegation.toolName)
		}

		const enableToolsAuto = metadata.enableTools ?? (likelyToolIntent || allowedToolsAuto.length > 0)
		if (enableToolsAuto) {
			console.log('🧰 Tools enabled (auto):', { 
				mentionsAmi, mentionsPeter, mentionsEmma, mentionsToby, mentionsApu, 
				mentionsNotion, mentionsWorkspace, mentionsDelegate, 
				allowedToolsAuto,
				intelligentDelegation: intelligentDelegation ? {
					agent: intelligentDelegation.agentId,
					tool: intelligentDelegation.toolName,
					confidence: Math.round(intelligentDelegation.confidence * 100) + '%'
				} : null
			})
		}

		// Attach per-request context so tools can read userId/model
		let reqId: string
		try {
			reqId = crypto.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
		} catch { reqId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}` }
		;(globalThis as any).__currentUserId = realUserId || metadata.userId
		;(globalThis as any).__currentModel = metadata.originalModel || 'langchain:multi-model-smart'
		;(globalThis as any).__requestId = reqId

		const pipelineResult = await withRequestContext({ userId: realUserId || metadata.userId, model: metadata.originalModel || 'langchain:multi-model-smart', requestId: reqId }, async () => pipeline.process({
			content: normalizedContent,
			type: effectiveType,
			metadata: {
				...metadata,
				...options,
				...attachmentMeta,
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
		}))

		console.log('✅ LangChain processing complete:', {
			model: pipelineResult.modelUsed,
			tokensUsed: pipelineResult.tokens,
			processingTime: pipelineResult.processingTime,
			responseLength: (pipelineResult.result || '').substring(0, 100) + '...',
		})

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

								// Store assistant response including tool-invocation parts for UI
								const inv = Array.isArray(pipelineResult.toolInvocations) ? pipelineResult.toolInvocations : []
								const assistantParts: any[] = []
								for (const t of inv) {
									assistantParts.push({
										type: 'tool-invocation',
										toolInvocation: {
											state: 'call',
											step: 0,
											toolCallId: t.toolCallId,
											toolName: t.toolName,
											args: t.args || {},
										}
									})
									assistantParts.push({
										type: 'tool-invocation',
										toolInvocation: {
											state: 'result',
											step: 0,
											toolCallId: t.toolCallId,
											toolName: t.toolName,
											result: t.result !== undefined ? t.result : null,
										}
									})
								}
								assistantParts.push({ type: 'text', text: pipelineResult.result || '' })

								await storeAssistantMessage({
										supabase,
										userId: metadata.userId,
										chatId: metadata.chatId,
										messages: [
												{
														role: 'assistant',
														content: assistantParts,
												},
										],
										message_group_id: metadata.message_group_id,
										model: metadata.originalModel || 'langchain:multi-model-smart',
										inputTokens: pipelineResult.tokens?.input,
										outputTokens: pipelineResult.tokens?.output,
								})

				console.log('✅ Messages logged to database successfully')
			} catch (dbError) {
				console.warn('⚠️ Failed to log messages to database:', dbError)
				// Don't fail the entire request if logging fails
			}
		} else {
			console.log('ℹ️ Skipping database logging - no supabase client or missing metadata')
		}

		// Return streaming response compatible with frontend SSE parser
		const encoder = new TextEncoder()
				const readable = new ReadableStream<Uint8Array>({
			start(controller) {
				try {
					// Set up pipeline event controller for delegation events
					setPipelineEventController(controller, encoder)

					const fullText = pipelineResult.result || ''

					// Notify start of text stream
					const startEvent = { type: 'text-start' }
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(startEvent)}\n\n`))

							// Emit routing info for observability
							try {
								if ((pipelineResult as any).routing) {
									const r = (pipelineResult as any).routing
									const routeEvent = { type: 'route', selectedModel: r.selectedModel, fallbackModel: r.fallbackModel, reasoning: r.reasoning, confidence: r.confidence }
									controller.enqueue(encoder.encode(`data: ${JSON.stringify(routeEvent)}\n\n`))
								}
							} catch {}

									// Emit actual model used (detect fallback via suffix)
									try {
										const used = pipelineResult.modelUsed || ''
										const modelEvent = { type: 'model', modelUsed: used, fallback: /\(fallback\)$/i.test(used) }
										controller.enqueue(encoder.encode(`data: ${JSON.stringify(modelEvent)}\n\n`))
									} catch {}

										// Emit tool invocations for UI, if present
										try {
											const inv = pipelineResult.toolInvocations || []
											for (const t of inv) {
												// tool-call (optional preview)
												const callEvent = {
													type: 'tool-invocation',
													toolInvocation: {
														state: 'call',
														step: 0,
														toolCallId: t.toolCallId,
														toolName: t.toolName,
														args: t.args || {},
													}
												}
												controller.enqueue(encoder.encode(`data: ${JSON.stringify(callEvent)}\n\n`))
												// tool-result
												if (t.result !== undefined) {
													const resultEvent = {
														type: 'tool-invocation',
														toolInvocation: {
															state: 'result',
															step: 0,
															toolCallId: t.toolCallId,
															toolName: t.toolName,
															result: t.result,
														}
													}
													controller.enqueue(encoder.encode(`data: ${JSON.stringify(resultEvent)}\n\n`))
												}
											}
										} catch {}

										// Stream text chunks as text-delta events expected by the UI (uses `delta` key)
					const words = fullText.split(' ')
					for (let i = 0; i < words.length; i++) {
						const deltaEvent = {
							type: 'text-delta',
							delta: words[i] + (i < words.length - 1 ? ' ' : ''),
						}
						controller.enqueue(encoder.encode(`data: ${JSON.stringify(deltaEvent)}\n\n`))
					}

					// Finish event with usage
					const finishEvent = {
						type: 'finish',
						text: fullText,
						usage: {
							promptTokens: pipelineResult.tokens?.input || 0,
							completionTokens: pipelineResult.tokens?.output || 0,
							totalTokens:
								(pipelineResult.tokens?.input || 0) + (pipelineResult.tokens?.output || 0),
						},
					}
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishEvent)}\n\n`))
					// SSE terminator for clients that expect it
					controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
					
					// Clean up pipeline event controller
					clearPipelineEventController()
					
					controller.close()
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

