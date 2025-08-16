import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Simple in-memory LRU cache for frequent document accesses (limits to 50 entries)
class LRUCache<T> {
  private max: number
  private cache: Map<string, { data: T; expiry: number }>

  constructor(max = 50) {
    this.max = max
    this.cache = new Map()
  }

  get(key: string): { data: T; expiry: number } | undefined {
    const item = this.cache.get(key)
    if (item) {
      this.cache.delete(key)
      this.cache.set(key, item)
    }
    return item
  }

  set(key: string, value: { data: T; expiry: number }): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }
}

const docCache = new LRUCache<any>(50)  // Cache documents for 10 minutes

export const openDocumentTool = tool({
  description: '📝 Open an existing document in the Canvas Editor for collaborative editing. Use when user wants to work on, edit, or collaborate on a document from their collection (via RAG context). Accepts ID or filename. Prioritizes fuzzy matching for user-friendly searches.',
  inputSchema: z.object({
    documentId: z.string().min(3).describe('Document ID (UUID) or filename (e.g., "historywow.md"). Minimum 3 characters for accurate search.'),
    suggestion: z.string().describe('Personalized message why opening in Canvas Editor helps (e.g., "For Huminary Labs workflow review").'),
    actionType: z.enum(['edit', 'collaborate', 'review', 'expand']).describe('Action type on document.')
  }),
  execute: async ({ documentId, suggestion, actionType }) => {
    const startTime = Date.now()  // Performance tracking
    try {
      const supabase = await createClient()
      if (!supabase) return { success: false, error: 'Database unavailable' }

      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user?.id) return { success: false, error: 'User not authenticated' }

      const userId = auth.user.id
      console.log(`[OPEN_DOCUMENT] Searching: ${documentId} for user: ${userId}`)

      // Cache check (key: userId:documentId)
      const cacheKey = `${userId}:${documentId.toLowerCase()}`
      const cached = docCache.get(cacheKey)
      if (cached && cached.expiry > Date.now()) {
        console.log('[OPEN_DOCUMENT] Cache hit')
        return { ...cached.data, fromCache: true }
      }

      let document: any = null
      let searchError: any = null

      // UUID fast path
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)
      if (isUUID) {
        console.log('[OPEN_DOCUMENT] UUID search...')
        const { data, error } = await (supabase as any)
          .from('documents')
          .select('id, title, filename, content_md, content_html, created_at, updated_at')
          .eq('id', documentId)
          .eq('user_id', userId)
          .single()
        document = data
        searchError = error
      } else {
        // Filename/title ILIKE search, ordered by recent
        console.log('[OPEN_DOCUMENT] Filename/title search...')
        const { data, error } = await (supabase as any)
          .from('documents')
          .select('id, title, filename, content_md, content_html, created_at, updated_at')
          .eq('user_id', userId)
          .or(`filename.ilike.%${documentId}%,title.ilike.%${documentId}%`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()
        document = data
        searchError = error
      }

      if (searchError || !document) {
        // Fuzzy search fallback using Supabase textSearch (pg_trgm if enabled)
        console.log('[OPEN_DOCUMENT] Fuzzy fallback...')
        const { data: fuzzyData, error: fuzzyError } = await (supabase as any)
          .from('documents')
          .select('id, title, filename, content_md, content_html, created_at, updated_at')
          .eq('user_id', userId)
          .textSearch('filename,title', documentId, { type: 'websearch', config: 'english' })  // Or 'spanish'; enable pg_trgm in Supabase for similarity
          .order('rank', { ascending: false })
          .limit(1)
          .single()

        if (fuzzyData) {
          document = fuzzyData
          searchError = null
          console.log('[OPEN_DOCUMENT] Fuzzy match:', document.filename)
        } else {
          // Get suggestions: Similar docs
          const { data: suggestions } = await (supabase as any)
            .from('documents')
            .select('filename, title, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(5)

          const suggestionList = suggestions?.map((d: { filename: string; title?: string | null; updated_at: string | Date }) => `${d.filename} (${d.title || 'untitled'}, last updated ${new Date(d.updated_at).toLocaleDateString()})`).join(', ') || 'none'

          return {
            success: false,
            error: `Document "${documentId}" not found. Try checking spelling or use one of these: ${suggestionList}. For Huminary Labs docs, ensure filename matches exactly.`
          }
        }
      }

      // Cache the result (expiry 10 min)
      const cacheData = {
        success: true,
        message: `DOCUMENT_FOUND: Include complete documentContent in response. Show full content to user.`,
        documentContent: document.content_md || '',
        document: {
          id: document.id,
          title: document.title || document.filename,
          filename: document.filename,
          contentPreview: `${document.content_md?.slice(0, 300)}...`,
          lastModified: document.updated_at,
          wordCount: document.content_md?.split(/\s+/).length || 0,
          fullContent: document.content_md,
          htmlContent: document.content_html
        },
        actionType,
        canvasEditorAction: {
          type: 'openDocument',
          documentId: document.id,  // Resolved ID
          filename: document.filename,
          content: document.content_md || '',
          htmlContent: document.content_html
        }
      }
      docCache.set(cacheKey, { data: cacheData, expiry: Date.now() + 10 * 60 * 1000 })

      console.log(`[OPEN_DOCUMENT] Success in ${Date.now() - startTime}ms`)

      return cacheData
    } catch (error: any) {
      console.error('[OPEN_DOCUMENT] Error:', error.message)
      return { success: false, error: `Failed to open: ${error.message}. Contact Huminary Labs support if persists.` }
    }
  }
})