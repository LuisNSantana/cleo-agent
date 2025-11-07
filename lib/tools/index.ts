// Central Tool Registry
// Rebuilt clean version including all tool groups (Google, Gmail, Shopify, Skyvern, SerpAPI, Notion, Delegation, Utilities, Credentials)
import { tool } from 'ai'
import { z } from 'zod'
import { getAgentOrchestrator } from '@/lib/agents/agent-orchestrator'
import { ensureToolsHaveRequestContext, wrapToolExecuteWithRequestContext } from './context-wrapper'

// Core single tools
import { webSearchTool } from './web-search'
import { createDocumentTool } from './create-document'
import { openDocumentTool } from './open-document'
import { memoryAddNoteTool } from './memory'
import { leadResearchTool } from './lead-research'

// Task management
// Inline completeTaskTool (no separate file found)
export const completeTaskTool = tool({
	description: 'ONLY use AFTER executing all required tools successfully. Signal task completion with proof of execution (message_id, API response, etc.). DO NOT use as first/only action - must call actual work tools first (publish_to_telegram, postTweet, etc.)',
	inputSchema: z.object({
		summary: z.string().describe('Brief summary of completed work with PROOF (e.g., "Published to Telegram, message_id: 12345")'),
		status: z.enum(['completed', 'ready', 'done']).default('completed'),
		nextSteps: z.string().optional().describe('Suggested next steps'),
		toolsExecuted: z.array(z.string()).optional().describe('List of tools called BEFORE this (e.g., ["publish_to_telegram", "postTweet"])')
	}),
	execute: async ({ summary, status, nextSteps, toolsExecuted }) => {
		// Validation: Ensure this isn't being used as an escape hatch
		if (!toolsExecuted || toolsExecuted.length === 0) {
			console.warn('[COMPLETE_TASK] ⚠️ Called without any tools executed - possible agent escape hatch abuse')
		}
		return {
			taskCompleted: true,
			status,
			summary,
			nextSteps: nextSteps || null,
			toolsExecuted: toolsExecuted || [],
			timestamp: new Date().toISOString(),
			message: `Task ${status}: ${summary}`
		}
	}
})

// Google Workspace
import { listCalendarEventsTool, createCalendarEventTool } from './google-calendar'
import {
	createRecurringCalendarEventTool,
	inviteAttendeesToEventTool,
	addConferenceDetailsTool,
	updateCalendarEventTool,
	checkAvailabilityTool,
	setEventRemindersTool,
	searchCalendarEventsTool
} from './google-calendar-advanced'
import { listDriveFilesTool, searchDriveFilesTool, getDriveFileDetailsTool, createDriveFolderTool, uploadFileToDriveTool } from './google-drive'
import {
	shareDriveFileTool,
	copyMoveDriveFileTool
} from './google-drive-advanced'
import { createGoogleDocTool, readGoogleDocTool, updateGoogleDocTool } from './google-docs'
import { createStructuredGoogleDocTool } from './google-docs-structured'
import {
	formatGoogleDocsTextTool,
	applyGoogleDocsParagraphStyleTool,
	insertGoogleDocsTableTool,
	insertGoogleDocsImageTool,
	createGoogleDocsListTool
} from './google-docs-advanced'
import { createGoogleSheetTool, readGoogleSheetTool, updateGoogleSheetTool, appendGoogleSheetTool } from './google-sheets'
import {
	addGoogleSheetTabTool,
	createGoogleSheetChartTool,
	formatGoogleSheetCellsTool,
	applyConditionalFormattingTool,
	// New advanced tools
	insertGoogleSheetFormulasTool,
	addDataValidationTool,
	createNamedRangeTool,
	protectSheetRangeTool,
	addAutoFilterTool,
	createProfessionalTemplateTool
} from './google-sheets-advanced'
import { 
	createGoogleSlidesPresentationTool,
	addGoogleSlideTool,
	insertGoogleSlideTextBoxTool,
	appendBulletedSlideTool,
	readGoogleSlidesPresentationTool,
	replaceGoogleSlidesTextTool
} from './google-slides'
import {
	insertSlideImageTool,
	createSlideShapeTool,
	createSlideTableTool,
	formatSlideTextTool,
	addSlideSpeakerNotesTool
} from './google-slides-advanced'

// Gmail
import { listGmailMessagesTool, getGmailMessageTool, sendGmailMessageTool, trashGmailMessageTool, modifyGmailLabelsTool } from './google-gmail'
import {
	sendHtmlGmailTool,
	sendGmailWithAttachmentsTool,
	createGmailDraftTool
} from './google-gmail-advanced'

// Shopify
import { shopifyTools } from './shopify'

// Skyvern
import { skyvernTools } from '../skyvern'
// New research/crawl tools
import { perplexityTools } from './perplexity'
import { firecrawlTools, firecrawlExtendedTools } from './firecrawl'

// SerpAPI
import { serpapiTools, serpapiCredentialTools } from '@/lib/serpapi/tools'

// Twitter/X Tools
import { twitterTools, twitterToolMeta } from './twitter'
import {
	postTweetWithMediaTool,
	createTwitterThreadTool
} from './twitter-advanced'

// Instagram Tools
import { instagramTools } from './instagram-advanced'

// Facebook Tools
import { facebookTools } from './facebook-advanced'

// Telegram Tools
import { telegramChannelTools } from './telegram-channel'

// Delegation tools (static predefined + dynamic generator)
import { delegationTools } from './delegation'

// Financial tools
import { financialModelingPrepTools } from './financial-modeling-prep'
import { alphaVantageTools } from './alpha-vantage'
// Ingredients comparison
import { ingredientsTools } from './ingredients-compare'
import { pdfTools } from './pdf-extract'

// Notion (register each tool with explicit keys)
import {
	getNotionPageTool,
	createNotionPageTool,
	updateNotionPageTool,
	getNotionPagePropertyTool,
	getNotionDatabaseTool,
	queryNotionDatabaseTool,
	createNotionDatabaseTool,
	updateNotionDatabaseTool,
	getNotionDatabaseSchemaTool,
	createNotionDatabaseEntryTool,
	getNotionBlockChildrenTool,
	appendNotionBlocksTool,
	getNotionBlockTool,
	updateNotionBlockTool,
	deleteNotionBlockTool,
	createNotionBlockTool,
	addNotionTextContentTool,
	searchNotionWorkspaceTool,
	searchNotionPagesTool,
	searchNotionDatabasesTool,
	listNotionUsersTool,
	getNotionUserTool,
	getNotionCurrentUserTool,
} from '../notion'
import {
	addNotionCredentialsTool,
	testNotionConnectionTool,
	listNotionCredentialsTool,
} from '../notion/credential-tools'

// ============================================================================
// Utility / Informational Tools (Weather, Time, Calculator, Crypto, Random Fact)
// ============================================================================

// Weather tool (with cache)
interface WeatherResult {
	location: string
	temperature: number | undefined
	unit: 'celsius' | 'fahrenheit'
	condition?: string
	humidity?: string
	windSpeed?: string
	icon?: string
	timestamp: string
	error?: string
}

const weatherCache: Record<string, { data: WeatherResult; expiry: number }> = {}

export const weatherTool = tool({
	description: 'Get current weather for a location. Defaults to Madrid. Returns temperature, condition, humidity, wind, and icon.',
	inputSchema: z.object({
		location: z.string().default('Madrid').describe('City and optional country code (e.g., "Madrid", "Paris,FR")'),
		unit: z.enum(['celsius', 'fahrenheit']).default('celsius')
	}),
		execute: async ({ location = 'Madrid', unit = 'celsius' }) => {
			const loc = (location || 'Madrid').trim()
		if (!loc) return { error: 'Location required' }
		const unitsParam = unit === 'fahrenheit' ? 'imperial' : 'metric'
		const cacheKey = `${loc.toLowerCase()}-${unitsParam}`
		const now = Date.now()
		const cached = weatherCache[cacheKey]
		if (cached && cached.expiry > now) return cached.data
		const apiKey = process.env.OPENWEATHER_API_KEY
		if (!apiKey) return { error: 'Weather API not configured' }
		const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(loc)}&units=${unitsParam}&lang=en&appid=${apiKey}`
		try {
			const res = await fetch(url, { next: { revalidate: 600 } })
			if (!res.ok) return { error: res.status === 404 ? `Location "${loc}" not found` : `API error ${res.status}` }
			const data = await res.json() as any
			const result: WeatherResult = {
				location: `${data.name}, ${data.sys?.country ?? ''}`.trim(),
				temperature: data.main?.temp,
			unit: unit as 'celsius' | 'fahrenheit',
				condition: data.weather?.[0]?.description,
				humidity: data.main?.humidity ? `${data.main.humidity}%` : undefined,
				windSpeed: data.wind?.speed ? `${data.wind.speed} ${unit === 'fahrenheit' ? 'mph' : 'm/s'}` : undefined,
				icon: data.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : undefined,
				timestamp: new Date(data.dt * 1000).toISOString(),
			}
			weatherCache[cacheKey] = { data: result, expiry: now + 15 * 60 * 1000 }
			return result
		} catch (e) {
			return { error: 'Unable to fetch weather' }
		}
	}
})

// Time tool
export const timeTool = tool({
	description: 'Get current ISO timestamp for a timezone or city (defaults Europe/Madrid).',
	inputSchema: z.object({ timezone: z.string().default('Europe/Madrid') }),
	execute: async ({ timezone }) => {
		try {
			const dt = new Date().toLocaleString('en-US', { timeZone: timezone })
			return { timezone, datetime: dt, iso: new Date().toISOString() }
		} catch {
			return { error: 'Invalid timezone' }
		}
	}
})

// Calculator tool
export const calculatorTool = tool({
	description: 'Evaluate a math expression (supports + - * / ^ sin cos tan log abs sqrt pi e).',
	inputSchema: z.object({ expression: z.string() }),
	execute: async ({ expression }) => {
		try {
			const safe = expression
				.replace(/[^0-9+\-*/.^(), sin cos tan log abs sqrt pi e ]/g, '')
				.replace(/\b(sin|cos|tan|log|abs|sqrt)\b/g, 'Math.$1')
				.replace(/pi/g, 'Math.PI')
				.replace(/e/g, 'Math.E')
			const result = new Function(`return ${safe}`)()
			if (typeof result !== 'number' || !isFinite(result)) throw new Error('Invalid')
			return { expression, result }
		} catch {
			return { error: 'Invalid expression' }
		}
	}
})

// Crypto price tool
export const cryptoPriceTool = tool({
	description: 'Get real-time cryptocurrency prices (CoinGecko).',
	inputSchema: z.object({
		coinIds: z.array(z.string()).default(['bitcoin']),
		vsCurrency: z.string().default('usd')
	}),
		execute: async ({ coinIds = ['bitcoin'], vsCurrency = 'usd' }) => {
		try {
				const ids = coinIds.join(',')
			const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`
			const res = await fetch(url)
			if (!res.ok) throw new Error('API error')
			const data = await res.json() as Record<string, any>
			return coinIds.map(id => ({
				coinId: id,
				vsCurrency,
				price: data[id]?.[vsCurrency] ?? null,
				change24h: data[id]?.[`${vsCurrency}_24h_change`] ?? null,
				timestamp: new Date().toISOString()
			}))
		} catch {
			return { error: 'Unable to fetch crypto prices' }
		}
	}
})

// Random fact (static fallback)
const FACTS = [
	'The first programmable computer was the Z3 (1941).',
	'TypeScript adds static typing to JavaScript.',
	'The Notion API uses block-based content structure.',
	'OpenAI function calling enables structured tool use.',
]
export const randomFactTool = tool({
	description: 'Return a random tech fact.',
	inputSchema: z.object({}),
	execute: async () => ({ fact: FACTS[Math.floor(Math.random() * FACTS.length)] })
})

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export const tools = {
	// Core
	webSearch: webSearchTool,
	memoryAddNote: memoryAddNoteTool,
	leadResearch: leadResearchTool,

	// Utilities
	// Canonical keys
	weather: weatherTool,
	time: timeTool,
	// Aliases for backwards-compatibility with prompts/seed data
	weatherInfo: weatherTool,
	getCurrentDateTime: timeTool,
	calculator: calculatorTool,
	cryptoPrices: cryptoPriceTool,
	randomFact: randomFactTool,

	// Tasks
	complete_task: completeTaskTool,

	// Documents
	createDocument: createDocumentTool,
	openDocument: openDocumentTool,

	// Google Calendar
	listCalendarEvents: listCalendarEventsTool,
	createCalendarEvent: createCalendarEventTool,
	
	// Google Calendar Advanced
	createRecurringCalendarEvent: createRecurringCalendarEventTool,
	inviteAttendeesToEvent: inviteAttendeesToEventTool,
	addConferenceDetails: addConferenceDetailsTool,
	updateCalendarEvent: updateCalendarEventTool,
	checkAvailability: checkAvailabilityTool,
	setEventReminders: setEventRemindersTool,
	searchCalendarEvents: searchCalendarEventsTool,

	// Google Drive
	listDriveFiles: listDriveFilesTool,
	searchDriveFiles: searchDriveFilesTool,
	getDriveFileDetails: getDriveFileDetailsTool,
	createDriveFolder: createDriveFolderTool,
	uploadFileToDrive: uploadFileToDriveTool,
	
	// Google Drive Advanced
	shareDriveFile: shareDriveFileTool,
	copyMoveDriveFile: copyMoveDriveFileTool,

	// Google Docs
	createGoogleDoc: createGoogleDocTool,
	createStructuredGoogleDoc: createStructuredGoogleDocTool, // ⭐ NEW: Better formatting for complex documents
	readGoogleDoc: readGoogleDocTool,
	updateGoogleDoc: updateGoogleDocTool,
	
	// Google Docs Advanced
	formatGoogleDocsText: formatGoogleDocsTextTool,
	applyGoogleDocsParagraphStyle: applyGoogleDocsParagraphStyleTool,
	insertGoogleDocsTable: insertGoogleDocsTableTool,
	insertGoogleDocsImage: insertGoogleDocsImageTool,
	createGoogleDocsList: createGoogleDocsListTool,

	// Google Slides
	createGoogleSlidesPresentation: createGoogleSlidesPresentationTool,
	addGoogleSlide: addGoogleSlideTool,
	insertGoogleSlideTextBox: insertGoogleSlideTextBoxTool,
	appendBulletedSlide: appendBulletedSlideTool,
	readGoogleSlidesPresentation: readGoogleSlidesPresentationTool,
	replaceGoogleSlidesText: replaceGoogleSlidesTextTool,
	
	// Google Slides Advanced
	insertSlideImage: insertSlideImageTool,
	createSlideShape: createSlideShapeTool,
	createSlideTable: createSlideTableTool,
	formatSlideText: formatSlideTextTool,
	addSlideSpeakerNotes: addSlideSpeakerNotesTool,

	// Google Sheets
	createGoogleSheet: createGoogleSheetTool,
	readGoogleSheet: readGoogleSheetTool,
	updateGoogleSheet: updateGoogleSheetTool,
	appendGoogleSheet: appendGoogleSheetTool,
	
	// Google Sheets Advanced
	addGoogleSheetTab: addGoogleSheetTabTool,
	createGoogleSheetChart: createGoogleSheetChartTool,
	formatGoogleSheetCells: formatGoogleSheetCellsTool,
	applyConditionalFormatting: applyConditionalFormattingTool,
	// New advanced sheet tools
	insertGoogleSheetFormulas: insertGoogleSheetFormulasTool,
	addDataValidation: addDataValidationTool,
	createNamedRange: createNamedRangeTool,
	protectSheetRange: protectSheetRangeTool,
	addAutoFilter: addAutoFilterTool,
	createProfessionalTemplate: createProfessionalTemplateTool,

	// Gmail
	listGmailMessages: listGmailMessagesTool,
	getGmailMessage: getGmailMessageTool,
	sendGmailMessage: sendGmailMessageTool,
	trashGmailMessage: trashGmailMessageTool,
	modifyGmailLabels: modifyGmailLabelsTool,
	
	// Gmail Advanced
	sendHtmlGmail: sendHtmlGmailTool,
	sendGmailWithAttachments: sendGmailWithAttachmentsTool,
	createGmailDraft: createGmailDraftTool,

	// Spread groups
	...shopifyTools,
	...skyvernTools, // retained globally (Wex no longer uses them)
	...perplexityTools,
	...firecrawlExtendedTools,
	...delegationTools,
	...twitterTools,
	...ingredientsTools,
	...pdfTools,
	
	// Twitter Advanced
	postTweetWithMedia: postTweetWithMediaTool,
	createTwitterThread: createTwitterThreadTool,
	
	// Instagram Tools
	...instagramTools,
	
	// Facebook Tools
	...facebookTools,
	
	// Telegram Tools
	...telegramChannelTools,
	
	// Notion tools (explicit keys)
	'get-notion-page': getNotionPageTool,
	'create-notion-page': createNotionPageTool,
	'update-notion-page': updateNotionPageTool,
	'get-notion-page-property': getNotionPagePropertyTool,
	'get-notion-database': getNotionDatabaseTool,
	'query-notion-database': queryNotionDatabaseTool,
	'create-notion-database': createNotionDatabaseTool,
	'update-notion-database': updateNotionDatabaseTool,
	'get-notion-database-schema': getNotionDatabaseSchemaTool,
	'create-notion-database-entry': createNotionDatabaseEntryTool,
	'get-notion-block-children': getNotionBlockChildrenTool,
	'append-notion-blocks': appendNotionBlocksTool,
	'get-notion-block': getNotionBlockTool,
	'update-notion-block': updateNotionBlockTool,
	'delete-notion-block': deleteNotionBlockTool,
	'create-notion-block': createNotionBlockTool,
	'add-notion-text-content': addNotionTextContentTool,
	'search-notion-workspace': searchNotionWorkspaceTool,
	'search-notion-pages': searchNotionPagesTool,
	'search-notion-databases': searchNotionDatabasesTool,
	'list-notion-users': listNotionUsersTool,
	'get-notion-user': getNotionUserTool,
	'get-notion-current-user': getNotionCurrentUserTool,

	// Notion credential tools
	'add-notion-credentials': addNotionCredentialsTool,
	'test-notion-connection': testNotionConnectionTool,
	'list-notion-credentials': listNotionCredentialsTool,

	...serpapiTools,
	...serpapiCredentialTools,

	// Financial Analysis Tools
	...financialModelingPrepTools,
	...alphaVantageTools,
}

ensureToolsHaveRequestContext(tools)

// Export tool metadata maps for UI consumption
export const toolMeta = {
	twitter: twitterToolMeta,
	// Advanced Twitter tools (ensure X icon appears in UI)
	createTwitterThread: { icon: '/icons/x_twitter.png', label: 'Create Thread' },
	postTweetWithMedia: { icon: '/icons/x_twitter.png', label: 'Post with Media' },
}

export type ToolName = keyof typeof tools

// Dynamic delegation tool creation
export function ensureDelegationToolForAgent(agentId: string, agentName: string): string {
	const toolName = `delegate_to_${agentId.replace(/[^a-zA-Z0-9]/g, '_')}`
	if (!(toolName in tools)) {
		const newTool = tool({
			description: `Delegate tasks to ${agentName}.`,
			inputSchema: z.object({
				task: z.string(),
				context: z.string().optional(),
				priority: z.enum(['low','normal','high']).default('normal'),
				requirements: z.string().optional(),
			}),
			execute: async ({ task, context, priority, requirements }) => {
				// ✅ MIGRATION FIX: Canonicalize agent ID to resolve legacy aliases
				const { resolveAgentCanonicalKey } = await import('../agents/alias-resolver')
				const canonicalAgentId = await resolveAgentCanonicalKey(agentId)
				
				const orchestrator = getAgentOrchestrator() as any
				// Dynamic import to avoid build issues
				let userId: string | undefined
				try {
					const { getCurrentUserId } = await import('@/lib/server/request-context')
					userId = getCurrentUserId?.()
				} catch {}
				// Fallback via enhanced adapter global flags
				if (!userId) {
					const g: any = globalThis as any
					userId = g?.__currentUserId || g?.__cleoLastUserId
				}
				if (!userId) {
					console.warn('[DELEGATION] Missing userId in tool context; delegation may be limited')
				}
				
				const input = [
					`Tarea: ${task}`,
					context ? `Contexto: ${context}` : null,
					requirements ? `Requisitos: ${requirements}` : null,
					priority ? `Prioridad: ${priority}` : null,
				].filter(Boolean).join('\n')

				const exec = orchestrator.startAgentExecutionForUI?.(input, canonicalAgentId, undefined, userId, [], true)
					|| orchestrator.startAgentExecution?.(input, canonicalAgentId)
				const execId: string | undefined = exec?.id
				
				// Check if execution failed to start (agent not found)
				if (!exec || !execId) {
					console.error(`❌ [DELEGATION] Failed to start execution for agent: ${canonicalAgentId} (original: ${agentId})`)
					return {
						status: 'failed',
						targetAgent: canonicalAgentId,
						delegatedTask: task,
						context: context || '',
						priority: priority || 'normal',
						requirements: requirements || '',
						handoffMessage: `Failed to delegate to ${agentName}: Agent not found or unavailable`,
						nextAction: 'handle_error',
						agentId,
						result: `Delegation failed: Agent ${agentId} not found or unavailable`,
						executionId: execId,
						error: `Agent ${agentId} not found or unavailable`
					}
				}
				
				// Get agent timeout based on type
				const getAgentTimeout = (agentId: string): number => {
					// Research agents get longer timeout  
					if (agentId.includes('apu') || agentId.includes('research')) return 180_000 // 3 minutes
					// Email and complex workflow agents 
					if (agentId.includes('ami') || agentId.includes('astra') || agentId.includes('email')) return 150_000 // 2.5 minutes
					// Standard agents
					return 90_000 // 1.5 minutes
				}
				
				const startedAt = Date.now()
				const TIMEOUT_MS = getAgentTimeout(agentId)
				const POLL_MS = 600

				let finalResult: string | null = null
				let status: string = 'running'
				while (Date.now() - startedAt < TIMEOUT_MS) {
					 
					await new Promise(r => setTimeout(r, POLL_MS))
					try {
						const snapshot = execId ? orchestrator.getExecution?.(execId) : null
						status = snapshot?.status || status
						if (snapshot?.status === 'completed') {
							finalResult = String(snapshot?.result || snapshot?.messages?.slice(-1)?.[0]?.content || '')
							break
						}
						if (snapshot?.status === 'failed') {
							finalResult = `Delegation failed: ${snapshot?.error || 'unknown error'}`
							break
						}
					} catch {}
				}

				if (!finalResult) {
					const timeoutMessage = `Task timed out after ${TIMEOUT_MS/1000}s (${agentId}). ` +
						(status === 'running' ? 'Task may still be processing in background.' : `Status: ${status}`)
					finalResult = timeoutMessage
				}

				// Determine status based on the result
				const delegationStatus = finalResult.startsWith('Delegation failed:') || finalResult.startsWith('Task timed out') 
					? 'failed' 
					: 'delegated'

				return {
					status: delegationStatus,
					targetAgent: agentId,
					delegatedTask: task,
					context: context || '',
					priority: priority || 'normal',
					requirements: requirements || '',
					handoffMessage: `Task delegated to ${agentName}: ${task}${context ? ` - Context: ${context}` : ''}`,
					nextAction: delegationStatus === 'failed' ? 'handle_error' : 'handoff_to_agent',
					agentId,
					result: finalResult,
					executionId: execId,
					error: delegationStatus === 'failed' ? finalResult : undefined,
					partial: status === 'running' && finalResult.includes('timed out') // Mark as partial if still running
				}
			}
		})
		wrapToolExecuteWithRequestContext(toolName, newTool)
		;(tools as any)[toolName] = newTool
	}
	return toolName
}

// Backwards compatibility named export
export default tools
