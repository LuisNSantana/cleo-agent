/**
 * Super Ankie Mode - Curated Tool Registry
 * 
 * A lightweight, fast-execution toolset for the default "Super Ankie" mode.
 * These tools are selected for daily productivity tasks without delegation overhead.
 * 
 * Optimizations applied (2025-2026):
 * - Direct execution via Vercel AI SDK 6 ToolLoopAgent
 * - No orchestrator/delegation latency
 * - SerpAPI (Google) for accurate, date-filtered news
 * - Parallel tool execution support
 */

import { tool } from 'ai'
import { z } from 'zod'

// Core tools
import { memoryAddNoteTool } from './memory'
import { generateImageTool } from './generate-image'
import { openDocumentTool } from './open-document'

// SerpAPI tools (Google Search)
import { 
  serpGeneralSearchTool, 
  serpScholarSearchTool, 
  serpTrendsSearchTool, 
  serpTrendingNowTool, 
  stockQuoteTool, 
  marketNewsTool 
} from '@/lib/serpapi/tools'
import { resolveSerpapiKey } from '@/lib/serpapi/credentials'

// Google Docs
import { createGoogleDocTool, readGoogleDocTool } from './google-docs'
import { createStructuredGoogleDocTool } from './google-docs-structured'

// Google Sheets
import { createGoogleSheetTool, readGoogleSheetTool } from './google-sheets'

// Google Slides
import { createGoogleSlidesPresentationTool } from './google-slides'
import { createStructuredSlidesTool } from './google-slides-structured'

// Google Drive
import { listDriveFilesTool, searchDriveFilesTool } from './google-drive'

// Gmail
import { listGmailMessagesTool, sendGmailMessageTool } from './google-gmail'
import { createGmailDraftTool } from './google-gmail-advanced'

// Calendar
import { listCalendarEventsTool, createCalendarEventTool } from './google-calendar'

// Twitter/X
import { postTweetTool, hashtagResearchTool } from './twitter'

// Utilities
import { weatherTool, timeTool, calculatorTool, cryptoPriceTool } from './index'

// Context wrapper for request-scoped data
import { ensureToolsHaveRequestContext } from './context-wrapper'

/**
 * Optimized News Search Tool for Super Ankie
 * - Uses Google News via SerpAPI
 * - Defaults to "this week" for date filtering
 * - Better for current events queries
 */
const superAnkieNewsSearchTool = tool({
  description: 'Search for current news articles using Google News. Use this for news/events queries. Optionally filter by date range.',
  inputSchema: z.object({
    q: z.string().min(1).max(300).describe('News search query (e.g., "Apple latest news", "Tesla earnings")'),
    timeFilter: z.enum(['today', 'week', 'month']).optional().describe('Optional time filter: today (last 24h), week (last 7 days), month (last 30 days). If not specified, searches all recent news.'),
    num: z.number().min(1).max(10).default(6).describe('Number of results (1-10)'),
  }),
  execute: async (input) => {
    const key = await resolveSerpapiKey()
    if (!key) return { error: 'No SerpAPI key configured' }
    
    // Map timeFilter to SerpAPI tbs parameter (only if specified)
    const tbsMap: Record<string, string> = {
      today: 'qdr:d',
      week: 'qdr:w',
      month: 'qdr:m'
    }
    
    try {
      const params: Record<string, string | number> = {
        engine: 'google_news',
        q: input.q,
        num: input.num ?? 6,
        hl: 'es',
        gl: 'es'
      }
      
      // Only add time filter if specified
      if (input.timeFilter && tbsMap[input.timeFilter]) {
        params.tbs = tbsMap[input.timeFilter]
      }
      
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      
      const res = await fetch(`https://serpapi.com/search.json?${qs}&api_key=${encodeURIComponent(key)}`)
      if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`)
      
      const json = await res.json()
      const articles = (json.news_results || json.articles || []).slice(0, input.num).map((a: any) => ({
        title: a.title,
        link: a.link,
        source: a.source?.name || a.source,
        date: a.date,
        snippet: a.snippet || a.description
      }))
      
      return {
        query: input.q,
        timeFilter: input.timeFilter,
        articles,
        totalFound: articles.length,
        engine: 'google_news'
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'News search failed' }
    }
  }
})

/**
 * Super Ankie Tools Registry
 * ~25 essential tools for fast, direct execution
 */
export const superAnkieTools = {
  // 🔍 Research & Web (SerpAPI - Google for accurate results)
  newsSearch: superAnkieNewsSearchTool,
  webSearch: serpGeneralSearchTool,
  scholarSearch: serpScholarSearchTool,
  googleTrends: serpTrendsSearchTool,
  trendingNow: serpTrendingNowTool,
  stockQuote: stockQuoteTool,
  marketNews: marketNewsTool,
  
  // 📝 Google Docs
  createGoogleDoc: createGoogleDocTool,
  createStructuredGoogleDoc: createStructuredGoogleDocTool,
  readGoogleDoc: readGoogleDocTool,
  
  // 📊 Google Sheets
  createGoogleSheet: createGoogleSheetTool,
  readGoogleSheet: readGoogleSheetTool,
  
  // 📽️ Google Slides
  createGoogleSlidesPresentation: createGoogleSlidesPresentationTool,
  createStructuredGoogleSlides: createStructuredSlidesTool,
  
  // 📁 Google Drive
  listDriveFiles: listDriveFilesTool,
  searchDriveFiles: searchDriveFilesTool,
  
  // 📧 Gmail
  listGmailMessages: listGmailMessagesTool,
  sendGmailMessage: sendGmailMessageTool,
  createGmailDraft: createGmailDraftTool,
  
  // 📅 Calendar
  listCalendarEvents: listCalendarEventsTool,
  createCalendarEvent: createCalendarEventTool,
  
  // 🐦 X/Twitter
  postTweet: postTweetTool,
  hashtagResearch: hashtagResearchTool,
  
  // 🧠 Memory & Utils
  memoryAddNote: memoryAddNoteTool,
  time: timeTool,
  weather: weatherTool,
  calculator: calculatorTool,
  cryptoPrices: cryptoPriceTool,
  generateImage: generateImageTool,
  
  // 📎 Documents
  openDocument: openDocumentTool,
}

// Apply request context wrapper to all tools
ensureToolsHaveRequestContext(superAnkieTools)

// Export tool count for logging
export const SUPER_ANKIE_TOOL_COUNT = Object.keys(superAnkieTools).length

// Export type for type safety
export type SuperAnkieToolName = keyof typeof superAnkieTools

/**
 * Tool Metadata for UI (icons, labels)
 */
export const superAnkieToolMeta: Record<string, { icon: string; label?: string }> = {
  newsSearch: { icon: '/icons/google.png', label: 'Google News' },
  webSearch: { icon: '/icons/google.png', label: 'Google Search' },
  scholarSearch: { icon: '/icons/google.png', label: 'Google Scholar' },
  googleTrends: { icon: '/icons/google.png', label: 'Google Trends' },
  trendingNow: { icon: '/icons/google.png', label: 'Trending Now' },
  stockQuote: { icon: '/icons/google.png', label: 'Stock Quote' },
  marketNews: { icon: '/icons/google.png', label: 'Market News' },
  
  createGoogleDoc: { icon: '/icons/google_docs.png', label: 'Create Doc' },
  createStructuredGoogleDoc: { icon: '/icons/google_docs.png', label: 'Create Doc' },
  readGoogleDoc: { icon: '/icons/google_docs.png', label: 'Read Doc' },
  createGoogleSheet: { icon: '/icons/sheets.png', label: 'Create Sheet' },
  readGoogleSheet: { icon: '/icons/sheets.png', label: 'Read Sheet' },
  createGoogleSlidesPresentation: { icon: '/icons/slides.png', label: 'Create Slides' },
  createStructuredGoogleSlides: { icon: '/icons/slides.png', label: 'Create Slides' },
  listDriveFiles: { icon: '/icons/google-drive.svg', label: 'Drive Files' },
  searchDriveFiles: { icon: '/icons/google-drive.svg', label: 'Search Drive' },
  listGmailMessages: { icon: '/icons/gmail.png', label: 'Gmail' },
  sendGmailMessage: { icon: '/icons/gmail.png', label: 'Send Email' },
  createGmailDraft: { icon: '/icons/gmail.png', label: 'Draft Email' },
  listCalendarEvents: { icon: '/icons/google-calendar.svg', label: 'Calendar' },
  createCalendarEvent: { icon: '/icons/google-calendar.svg', label: 'New Event' },
  postTweet: { icon: '/icons/x_twitter.png', label: 'Post to X' },
  hashtagResearch: { icon: '/icons/x_twitter.png', label: 'Hashtags' },
  weather: { icon: '/icons/weather.png', label: 'Weather' },
  time: { icon: '/icons/clock.png', label: 'Time' },
}

