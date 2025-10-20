import { tool } from 'ai'
import { z } from 'zod'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

/**
 * Firecrawl Tools - Complete Suite
 * 
 * Enhanced with multimodal document analysis capabilities:
 * - PDF parsing and extraction
 * - Web scraping with screenshots
 * - Structured data extraction with AI
 * - Web search with content scraping
 * - Full website crawling
 * - Browser automation with actions
 */

interface FirecrawlCrawlResult {
  success: boolean
  data?: Array<{ url: string; markdown?: string; html?: string; meta?: any }>
  error?: string
}

interface FirecrawlScrapeResult {
  success: boolean
  data?: {
    markdown?: string
    html?: string
    rawHtml?: string
    screenshot?: string
    links?: string[]
    json?: any
    metadata?: {
      title?: string
      description?: string
      language?: string
      sourceURL?: string
      statusCode?: number
      [key: string]: any
    }
    actions?: {
      screenshots?: string[]
      scrapes?: Array<{ url: string; html?: string }>
    }
  }
  error?: string
}

interface FirecrawlSearchResult {
  success: boolean
  data?: {
    web?: Array<{
      url: string
      title: string
      description: string
      position: number
      markdown?: string // If scraping enabled
    }>
    images?: Array<{
      title: string
      imageUrl: string
      url: string
      position: number
    }>
    news?: Array<{
      title: string
      url: string
      snippet: string
      date: string
      position: number
    }>
  }
  error?: string
}

async function callFirecrawl(path: string, body: any) {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) throw new Error('FIRECRAWL_API_KEY not configured')
  const res = await fetch(`https://api.firecrawl.dev${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`Firecrawl error ${res.status}: ${errorText}`)
  }
  return res.json()
}

// ============================================================================
// NEW: Enhanced Tools for Multimodal Document Analysis
// ============================================================================

/**
 * Tool 1: Analyze PDF Documents (with structured extraction)
 * Perfect for analyzing research papers, reports, contracts, etc.
 */
export const firecrawlAnalyzePdfTool = tool({
  description: 'Analyze PDF documents from URLs or the latest attached file and extract structured information. Supports both public PDFs and web pages containing PDFs. Can extract specific data using AI with custom prompts or schemas. Perfect for research papers, reports, contracts, invoices, and documentation.',
  inputSchema: z.object({
    // Accept non-URL strings (filenames or relative paths) and normalize in execute
    url: z.string().min(1).describe('URL of the PDF, a relative path, or an attachment filename (will be resolved)'),
    extractionPrompt: z.string().optional().describe('Natural language prompt describing what to extract (e.g., "Extract author, title, key findings, and methodology")'),
    extractionSchema: z.record(z.any()).optional().describe('JSON schema for structured extraction. Example: {"type": "object", "properties": {"title": {"type": "string"}, "authors": {"type": "array"}}}'),
    includeScreenshot: z.boolean().optional().default(false).describe('Include a screenshot of the first page'),
    maxPages: z.number().optional().describe('Maximum number of pages to parse (cloud only, 1-10000)')
  }),
  execute: async (params) => {
  const { url, extractionPrompt, extractionSchema, includeScreenshot = false, maxPages } = params
  const userId = getCurrentUserId()
    
    try {
      // Normalize URL: allow filenames/relative paths by preferring last attachment URL
      function normalizePdfUrl(input: unknown) {
        if (typeof input !== 'string' || input.trim().length === 0) return null
        const val = input.trim()
        if (/^https?:\/\//i.test(val)) return val
        try {
          const g = globalThis
          const lastUrl = (g && (g as any).__lastAttachmentUrl) as string | undefined
          if (lastUrl && /^https?:\/\//i.test(lastUrl)) {
            return lastUrl
          }
        } catch {}
        // Try to resolve against app base if provided and looks like a root-relative path
        try {
          const base = (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '')
          if (base && val.startsWith('/')) {
            return new URL(val, base).toString()
          }
        } catch {}
        return null
      }

      const resolvedUrl = normalizePdfUrl(url)
      if (!resolvedUrl) {
        return {
          success: false,
          error: 'Invalid or unresolved PDF URL. Provide a full URL or attach the PDF to the message.',
          url
        }
      }

      // Track usage
      if (userId) {
        await trackToolUsage(userId, 'firecrawl_analyze_pdf', { 
          params: { url: resolvedUrl, hasPrompt: !!extractionPrompt, hasSchema: !!extractionSchema }
        })
      }

      // Build formats array
      const formats: any[] = ['markdown']
      
      // Add JSON extraction if prompt or schema provided
      if (extractionPrompt || extractionSchema) {
        const jsonFormat: any = { type: 'json' }
        if (extractionPrompt) jsonFormat.prompt = extractionPrompt
        if (extractionSchema) jsonFormat.schema = extractionSchema
        formats.push(jsonFormat)
      }
      
      // Add screenshot if requested
      if (includeScreenshot) {
        formats.push({ type: 'screenshot', fullPage: false })
      }

      // Configure parsers for PDF
      const parsers: any[] = maxPages ? [{ type: 'pdf', maxPages }] : ['pdf']

      const result: FirecrawlScrapeResult = await callFirecrawl('/v2/scrape', {
        url: resolvedUrl,
        formats,
        parsers,
        onlyMainContent: true,
        timeout: 60000 // 60 seconds for PDF processing
      })

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to analyze PDF',
          url: resolvedUrl
        }
      }

      const response: any = {
        success: true,
        url: resolvedUrl,
        markdown: result.data.markdown,
        metadata: result.data.metadata || {},
        extractedData: result.data.json || null,
        screenshot: result.data.screenshot || null,
        pageCount: result.data.metadata?.pageCount,
        fileSize: result.data.metadata?.fileSize,
        language: result.data.metadata?.language
      }

      return response
    } catch (e: any) {
      console.error('[Firecrawl PDF] Error:', e)
      return {
        success: false,
        url,
        error: String(e.message || e)
      }
    }
  }
})

/**
 * Tool 2: Advanced Web Scraping with Actions
 * Supports dynamic content, JavaScript rendering, and browser automation
 */
export const firecrawlScrapeAdvancedTool = tool({
  description: 'Advanced web scraping with browser automation. Can interact with pages before extracting content: click buttons, fill forms, scroll, wait for dynamic content, take screenshots. Perfect for SPAs, login-protected content, and dynamic websites. Supports PDF parsing if URL is a PDF.',
  inputSchema: z.object({
    url: z.string().url().describe('URL to scrape'),
    formats: z.array(z.enum(['markdown', 'html', 'rawHtml', 'screenshot', 'links'])).optional().default(['markdown']).describe('Output formats'),
    actions: z.array(z.object({
      type: z.enum(['wait', 'click', 'scroll', 'write', 'press', 'screenshot']),
      milliseconds: z.number().optional().describe('For wait action: delay in ms'),
      selector: z.string().optional().describe('For click/write: CSS selector'),
      text: z.string().optional().describe('For write action: text to type'),
      key: z.string().optional().describe('For press action: key to press (Enter, Tab, etc.)'),
      direction: z.enum(['up', 'down']).optional().describe('For scroll action'),
      fullPage: z.boolean().optional().describe('For screenshot action: capture full page')
    })).optional().describe('Browser actions to perform before scraping'),
    extractData: z.boolean().optional().default(false).describe('Extract structured data using AI'),
    extractionPrompt: z.string().optional().describe('What to extract from the page'),
    extractionSchema: z.record(z.any()).optional().describe('JSON schema for extraction'),
    onlyMainContent: z.boolean().optional().default(true).describe('Extract only main content or full page'),
    waitFor: z.number().optional().describe('Milliseconds to wait before scraping (0-30000)')
  }),
  execute: async (params) => {
    const { 
      url, 
      formats = ['markdown'], 
      actions, 
      extractData = false,
      extractionPrompt,
      extractionSchema,
      onlyMainContent = true,
      waitFor
    } = params
    const userId = getCurrentUserId()
    
    try {
      if (userId) {
        await trackToolUsage(userId, 'firecrawl_scrape_advanced', { 
          params: {
            targetUrl: url, 
            hasActions: !!actions?.length,
            extractData 
          }
        })
      }

      // Build formats array
      const finalFormats: any[] = [...formats]
      
      // Add structured extraction if requested
      if (extractData && (extractionPrompt || extractionSchema)) {
        const jsonFormat: any = { type: 'json' }
        if (extractionPrompt) jsonFormat.prompt = extractionPrompt
        if (extractionSchema) jsonFormat.schema = extractionSchema
        finalFormats.push(jsonFormat)
      }

      // Check if URL is a PDF
      const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?')
      const parsers = isPdf ? ['pdf'] : undefined

      const result: FirecrawlScrapeResult = await callFirecrawl('/v2/scrape', {
        url,
        formats: finalFormats,
        actions,
        onlyMainContent,
        waitFor,
        parsers,
        timeout: 45000
      })

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Scraping failed',
          url
        }
      }

      const response: any = {
        success: true,
        url,
        markdown: result.data.markdown,
        html: result.data.html,
        rawHtml: result.data.rawHtml,
        links: result.data.links || [],
        screenshot: result.data.screenshot,
        extractedData: result.data.json,
        metadata: result.data.metadata || {},
        actionResults: result.data.actions
      }

      return response
    } catch (e: any) {
      console.error('[Firecrawl Scrape Advanced] Error:', e)
      return {
        success: false,
        url,
        error: String(e.message || e)
      }
    }
  }
})

/**
 * Tool 3: Web Search with Content Extraction
 * Search the web and optionally scrape full content from results
 */
export const firecrawlSearchTool = tool({
  description: 'Search the web and get full content from results. Can search across web, news, and images. Optionally scrapes full markdown content from search results. Perfect for research, finding specific information, and content discovery.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().default(5).describe('Number of results (1-20)'),
    sources: z.array(z.enum(['web', 'news', 'images'])).optional().default(['web']).describe('Search sources'),
    scrapeContent: z.boolean().optional().default(false).describe('Scrape full content from results (increases credits usage)'),
    location: z.string().optional().describe('Location for localized results (e.g., "US", "GB", "ES")'),
    language: z.string().optional().describe('Language code (e.g., "en", "es", "fr")')
  }),
  execute: async (params) => {
    const { 
      query, 
      limit = 5, 
      sources = ['web'], 
      scrapeContent = false,
      location,
      language 
    } = params
    const userId = getCurrentUserId()
    
    try {
      if (userId) {
        await trackToolUsage(userId, 'firecrawl_search', { 
          params: {
            searchQuery: query, 
            sources: sources.join(','),
            scrapeContent 
          }
        })
      }

      // Build search request
      const searchBody: any = {
        query,
        limit: Math.min(Math.max(limit, 1), 20),
        sources: sources.map(s => ({ type: s }))
      }

      // Add location if provided
      if (location) {
        searchBody.location = location
      }

      // Add scrape options if scraping content
      if (scrapeContent) {
        searchBody.scrapeOptions = {
          formats: ['markdown'],
          onlyMainContent: true
        }
      }

      const result: FirecrawlSearchResult = await callFirecrawl('/v2/search', searchBody)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Search failed',
          query
        }
      }

      // Format results
      const response: any = {
        success: true,
        query,
        results: {
          web: (result.data.web || []).map(r => ({
            position: r.position,
            title: r.title,
            url: r.url,
            description: r.description,
            content: r.markdown || null
          })),
          images: (result.data.images || []).map(r => ({
            position: r.position,
            title: r.title,
            imageUrl: r.imageUrl,
            url: r.url
          })),
          news: (result.data.news || []).map(r => ({
            position: r.position,
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            date: r.date
          }))
        },
        totalResults: (result.data.web?.length || 0) + (result.data.images?.length || 0) + (result.data.news?.length || 0)
      }

      return response
    } catch (e: any) {
      console.error('[Firecrawl Search] Error:', e)
      return {
        success: false,
        query,
        error: String(e.message || e)
      }
    }
  }
})

// ============================================================================
// Existing Tools (kept for backward compatibility)
// ============================================================================

export const firecrawlCrawlTool = tool({
  description: 'Crawl a website (depth-limited) extracting markdown & meta for research/SEO.',
  inputSchema: z.object({
    url: z.string().url(),
    depth: z.number().min(1).max(4).optional().default(2),
    maxPages: z.number().min(1).max(60).optional().default(20),
    includeHtml: z.boolean().optional().default(false)
  }),
  execute: async (params) => {
    const { url, depth = 2, maxPages = 20, includeHtml = false } = params as { url: string; depth?: number; maxPages?: number; includeHtml?: boolean }
    try {
      const data: FirecrawlCrawlResult = await callFirecrawl('/v1/crawl', {
        url,
        maxDepth: depth,
        limit: maxPages,
        formats: includeHtml ? ['markdown','html'] : ['markdown']
      })
      if (!data.success) return { success: false, pages: [], meta: { total: 0, truncated: false }, error: data.error || 'Unknown error' }
      const pages = (data.data || []).slice(0, maxPages).map(p => ({
        url: p.url,
        markdown: p.markdown,
        html: p.html,
        title: p.meta?.title,
        description: p.meta?.description
      }))
      return { success: true, pages, meta: { total: pages.length, truncated: pages.length >= maxPages }, error: undefined }
    } catch (e: any) {
      return { success: false, pages: [], meta: { total: 0, truncated: false }, error: String(e.message || e) }
    }
  }
})

export const firecrawlExtractTool = tool({
  description: 'Extract a single page (markdown + meta) via Firecrawl.',
  inputSchema: z.object({ url: z.string().url(), includeHtml: z.boolean().optional().default(false) }),
  execute: async (params) => {
    const { url, includeHtml = false } = params as { url: string; includeHtml?: boolean }
    try {
      const data = await callFirecrawl('/v1/extract', { url, formats: includeHtml ? ['markdown','html'] : ['markdown'] })
      const page = Array.isArray(data?.data) ? data.data[0] : data?.data || {}
      return {
        success: true,
        url,
        markdown: page.markdown,
        html: page.html,
        title: page.meta?.title,
        description: page.meta?.description
      }
    } catch (e: any) {
      return { success: false, url, error: String(e.message || e) }
    }
  }
})

export const firecrawlTools = {
  firecrawl_crawl: firecrawlCrawlTool,
  firecrawl_extract: firecrawlExtractTool
}

// Lightweight sitemap summarization using existing crawl tool (derives key topics & representative pages)
import { tool as aiTool } from 'ai'
import crypto from 'crypto'

export const firecrawlSitemapSummarizeTool = aiTool({
  description: 'Summarize a site section: crawl limited pages then output key topics, representative URLs, and content focus (non-AI heavy).',
  inputSchema: z.object({
    url: z.string().url(),
    depth: z.number().min(1).max(3).optional().default(2),
    maxPages: z.number().min(3).max(40).optional().default(15)
  }),
  execute: async (params) => {
    const { url, depth = 2, maxPages = 15 } = params as { url: string; depth?: number; maxPages?: number }
    try {
      // Reuse crawl logic directly instead of calling .execute (internal pattern simplified)
      const crawl = await (async () => {
        try {
          return await callFirecrawl('/v1/crawl', { url, maxDepth: depth, limit: maxPages, formats: ['markdown'] })
        } catch (e) { return { success: false, error: e instanceof Error ? e.message : String(e) } }
      })() as any
      if (!crawl.success) {
        return { success: false, error: crawl.error || 'crawl_failed' }
      }
      const dataPages: Array<{ url: string; markdown?: string; meta?: any }> = crawl.data || []
      const pages = dataPages.slice(0, maxPages)
      // Basic keyword extraction
      const freq = new Map<string, number>()
      for (const p of pages) {
        const text = (p.markdown || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ')
        const tokens: string[] = text.split(/\s+/).filter((tok: string) => tok.length > 4 && tok.length < 30)
        for (const tok of tokens.slice(0, 400)) {
          freq.set(tok, (freq.get(tok) || 0) + 1)
        }
      }
      const topKeywords = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>`${k} (${v})`)
      const representative = pages.slice(0, Math.min(8, pages.length)).map((p: any) => ({ url: p.url, title: p.meta?.title }))
      return {
        success: true,
        url,
        pagesAnalyzed: pages.length,
        topKeywords,
        representative,
        hash: crypto.createHash('sha1').update(url+pages.length).digest('hex').slice(0,10)
      }
    } catch (e:any) {
      return { success: false, error: String(e.message||e) }
    }
  }
})

// Augment export (keeping backward compatibility)
export const firecrawlExtendedTools = {
  ...firecrawlTools,
  firecrawl_sitemap_summarize: firecrawlSitemapSummarizeTool,
  // New enhanced tools for multimodal analysis
  firecrawl_analyze_pdf: firecrawlAnalyzePdfTool,
  firecrawl_scrape_advanced: firecrawlScrapeAdvancedTool,
  firecrawl_search: firecrawlSearchTool
}
