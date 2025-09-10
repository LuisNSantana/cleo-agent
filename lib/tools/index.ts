// Central Tool Registry
// Rebuilt clean version including all tool groups (Google, Gmail, Shopify, Skyvern, SerpAPI, Notion, Delegation, Utilities, Credentials)
import { tool } from 'ai'
import { z } from 'zod'

// Core single tools
import { webSearchTool } from './web-search'
import { createDocumentTool } from './create-document'
import { openDocumentTool } from './open-document'
import { memoryAddNoteTool } from './memory'

// Task management
// Inline completeTaskTool (no separate file found)
export const completeTaskTool = tool({
	description: 'Signal task completion and return control to supervisor',
	inputSchema: z.object({
		summary: z.string().describe('Brief summary of completed work'),
		status: z.enum(['completed', 'ready', 'done']).default('completed'),
		nextSteps: z.string().optional().describe('Suggested next steps')
	}),
	execute: async ({ summary, status, nextSteps }) => {
		return {
			taskCompleted: true,
			status,
			summary,
			nextSteps: nextSteps || null,
			timestamp: new Date().toISOString(),
			message: `Task ${status}: ${summary}`
		}
	}
})

// Google Workspace
import { listCalendarEventsTool, createCalendarEventTool } from './google-calendar'
import { listDriveFilesTool, searchDriveFilesTool, getDriveFileDetailsTool, createDriveFolderTool, uploadFileToDriveTool } from './google-drive'
import { createGoogleDocTool, readGoogleDocTool, updateGoogleDocTool } from './google-docs'
import { createGoogleSheetTool, readGoogleSheetTool, updateGoogleSheetTool, appendGoogleSheetTool } from './google-sheets'
import { 
	createGoogleSlidesPresentationTool,
	addGoogleSlideTool,
	insertGoogleSlideTextBoxTool,
	appendBulletedSlideTool,
	readGoogleSlidesPresentationTool,
	replaceGoogleSlidesTextTool
} from './google-slides'

// Gmail
import { listGmailMessagesTool, getGmailMessageTool, sendGmailMessageTool, trashGmailMessageTool, modifyGmailLabelsTool } from './google-gmail'

// Shopify
import { shopifyTools } from './shopify'

// Skyvern
import { skyvernTools } from '../skyvern'

// SerpAPI
import { serpapiTools, serpapiCredentialTools } from '@/lib/serpapi/tools'

// Delegation tools (static predefined + dynamic generator)
import { delegationTools } from './delegation'

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

	// Utilities
	weather: weatherTool,
	time: timeTool,
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

	// Google Drive
	listDriveFiles: listDriveFilesTool,
	searchDriveFiles: searchDriveFilesTool,
	getDriveFileDetails: getDriveFileDetailsTool,
	createDriveFolder: createDriveFolderTool,
	uploadFileToDrive: uploadFileToDriveTool,

	// Google Docs
	createGoogleDoc: createGoogleDocTool,
	readGoogleDoc: readGoogleDocTool,
	updateGoogleDoc: updateGoogleDocTool,

	// Google Slides
	createGoogleSlidesPresentation: createGoogleSlidesPresentationTool,
	addGoogleSlide: addGoogleSlideTool,
	insertGoogleSlideTextBox: insertGoogleSlideTextBoxTool,
	appendBulletedSlide: appendBulletedSlideTool,
	readGoogleSlidesPresentation: readGoogleSlidesPresentationTool,
	replaceGoogleSlidesText: replaceGoogleSlidesTextTool,

	// Google Sheets
	createGoogleSheet: createGoogleSheetTool,
	readGoogleSheet: readGoogleSheetTool,
	updateGoogleSheet: updateGoogleSheetTool,
	appendGoogleSheet: appendGoogleSheetTool,

	// Gmail
	listGmailMessages: listGmailMessagesTool,
	getGmailMessage: getGmailMessageTool,
	sendGmailMessage: sendGmailMessageTool,
	trashGmailMessage: trashGmailMessageTool,
	modifyGmailLabels: modifyGmailLabelsTool,

	// Spread groups
	...shopifyTools,
	...skyvernTools,
	...delegationTools,
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
			execute: async ({ task, context, priority, requirements }) => ({
				status: 'delegated',
				targetAgent: agentId,
				delegatedTask: task,
				context: context || '',
				priority: priority || 'normal',
				requirements: requirements || '',
				handoffMessage: `Task delegated to ${agentName}: ${task}${context ? ` - Context: ${context}` : ''}`,
				nextAction: 'handoff_to_agent',
				agentId,
			})
		})
		;(tools as any)[toolName] = newTool
	}
	return toolName
}

// Backwards compatibility named export
export default tools
