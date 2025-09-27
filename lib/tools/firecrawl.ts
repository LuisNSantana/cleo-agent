import { tool } from 'ai'
import { z } from 'zod'

/**
 * Firecrawl Tools
 * firecrawl_crawl: site / multi-page crawl
 * firecrawl_extract: single page extraction
 * Both return structured content for downstream summarization / SEO analysis.
 */

interface FirecrawlCrawlResult {
  success: boolean
  data?: Array<{ url: string; markdown?: string; html?: string; meta?: any }>
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
  if (!res.ok) throw new Error(`Firecrawl error ${res.status}`)
  return res.json()
}

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
  firecrawl_sitemap_summarize: firecrawlSitemapSummarizeTool
}
