/**
 * Structured Google Slides Tool
 *
 * Create a presentation from markdown-like content with automatic slides,
 * titles, subtitles and bulleted lists using Google Slides API best practices.
 *
 * Supported syntax:
 * - "# Title" → new slide title
 * - "## New Slide" → explicitly start a new slide
 * - "### Subtitle" → slide subtitle
 * - "- Bullet" or "* Bullet" → bulleted list items
 * - Blank lines are ignored
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId, getCurrentModel } from '@/lib/server/request-context'

// Token cache
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getSlidesAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `slides:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) return cached.token
  try {
    const supabase = await createClient()
    if (!supabase) return null
    const { data } = await (supabase as any)
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()
    if (!data) return null
    const expiry = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
    if (data.access_token && expiry > Date.now()) {
      tokenCache[cacheKey] = { token: data.access_token, expiry }
      return data.access_token
    }
    if (!data.refresh_token) return data.access_token || null
    const refresh = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token'
      })
    })
    if (!refresh.ok) return data.access_token || null
    const rj = await refresh.json()
    const newExp = Date.now() + (rj.expires_in * 1000)
    await (supabase as any)
      .from('user_service_connections')
      .update({ access_token: rj.access_token, token_expires_at: new Date(newExp).toISOString(), connected: true })
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
    tokenCache[cacheKey] = { token: rj.access_token, expiry: newExp }
    return rj.access_token
  } catch {
    return null
  }
}

async function slidesRequest(token: string, endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`https://slides.googleapis.com/v1/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  if (!res.ok) throw new Error(`Slides API ${res.status}: ${await res.text()}`)
  return res.json()
}

// Parsed slide structure
interface SlideBlock {
  title: string
  subtitle?: string
  bullets: string[]
}

function parseSlides(content: string): SlideBlock[] {
  const lines = content.split('\n')
  const slides: SlideBlock[] = []
  let current: SlideBlock | null = null

  const startNewSlide = (title: string) => {
    if (current) slides.push(current)
    current = { title: title.trim(), bullets: [] }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('## ')) {
      startNewSlide(line.substring(3))
      continue
    }
    if (line.startsWith('# ')) {
      startNewSlide(line.substring(2))
      continue
    }
    if (line.startsWith('### ')) {
      if (!current) startNewSlide('')
      current!.subtitle = line.substring(4).trim()
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!current) startNewSlide('')
      current!.bullets.push(line.substring(2).trim())
      continue
    }
    // If plain text line, treat as bullet point
    if (!current) startNewSlide('')
    current!.bullets.push(line)
  }
  if (current) slides.push(current)
  return slides
}

export const createStructuredSlidesTool = tool({
  description: `📽️ Create a Google Slides presentation from markdown-like content.

Use cases: pitch decks, agendas, briefs, reports.
Syntax: '# Title' (slide), '### Subtitle', '- bullet' items.
`,
  inputSchema: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    shareSettings: z.enum(['private','public_read']).optional().default('private')
  }),
  execute: async ({ title, content, shareSettings = 'private' }) => {
    const userId = getCurrentUserId(); const model = getCurrentModel(); const started = Date.now()
    if (!userId) return { success:false, message:'Authentication required', presentation:null }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected', presentation:null }

    try {
      // 1) Create presentation
      const pres = await slidesRequest(token, 'presentations', { method:'POST', body: JSON.stringify({ title }) })
      const firstSlideId: string | undefined = pres.slides?.[0]?.objectId

      // 2) Parse content
      const blocks = parseSlides(content)

      // 3) Build batch requests
      const requests: any[] = []

      // Helper to create a slide with title, subtitle and bullets
      const addSlideRequests = (slideId: string | undefined, block: SlideBlock, isFirst: boolean) => {
        const workSlideId = isFirst && slideId ? slideId : `slide_${Date.now()}_${Math.floor(Math.random()*1000)}`
        if (!isFirst) {
          requests.push({ createSlide: { objectId: workSlideId } })
        }

        // Title box
        if (block.title) {
          const titleBoxId = `title_${Date.now()}_${Math.floor(Math.random()*1000)}`
          requests.push({ createShape: { objectId: titleBoxId, shapeType:'TEXT_BOX', elementProperties: { pageObjectId: workSlideId, size:{ width:{ magnitude:640, unit:'PT'}, height:{ magnitude:60, unit:'PT'}}, transform:{ scaleX:1, scaleY:1, translateX:40, translateY:30, unit:'PT'} } } })
          requests.push({ insertText: { objectId: titleBoxId, insertionIndex:0, text: block.title } })
          requests.push({ updateTextStyle: { objectId: titleBoxId, style: { bold:true, fontSize:{ magnitude: 28, unit:'PT'} }, fields:'bold,fontSize' } })
        }

        // Subtitle box
        if (block.subtitle) {
          const subId = `sub_${Date.now()}_${Math.floor(Math.random()*1000)}`
          requests.push({ createShape: { objectId: subId, shapeType:'TEXT_BOX', elementProperties: { pageObjectId: workSlideId, size:{ width:{ magnitude:640, unit:'PT'}, height:{ magnitude:40, unit:'PT'}}, transform:{ scaleX:1, scaleY:1, translateX:40, translateY:95, unit:'PT'} } } })
          requests.push({ insertText: { objectId: subId, insertionIndex:0, text: block.subtitle } })
          requests.push({ updateTextStyle: { objectId: subId, style: { italic:true, fontSize:{ magnitude: 16, unit:'PT'} }, fields:'italic,fontSize' } })
        }

        // Bullet list
        if (block.bullets.length) {
          const listId = `list_${Date.now()}_${Math.floor(Math.random()*1000)}`
          const text = block.bullets.join('\n')
          requests.push({ createShape: { objectId: listId, shapeType:'TEXT_BOX', elementProperties: { pageObjectId: workSlideId, size:{ width:{ magnitude:700, unit:'PT'}, height:{ magnitude:360, unit:'PT'}}, transform:{ scaleX:1, scaleY:1, translateX:40, translateY:150, unit:'PT'} } } })
          requests.push({ insertText: { objectId: listId, insertionIndex:0, text } })
          requests.push({ createParagraphBullets: { objectId: listId, textRange: { type:'ALL' }, bulletPreset:'BULLET_DISC_CIRCLE_SQUARE' } })
        }
      }

      // First slide uses existing one
      if (blocks.length > 0) addSlideRequests(firstSlideId, blocks[0], true)
      for (let i=1;i<blocks.length;i++) addSlideRequests(undefined, blocks[i], false)

      if (requests.length) {
        await slidesRequest(token, `presentations/${pres.presentationId}:batchUpdate`, { method:'POST', body: JSON.stringify({ requests }) })
      }

      // Sharing if requested
      let shareLink = `https://docs.google.com/presentation/d/${pres.presentationId}/edit`
      if (shareSettings === 'public_read') {
        try {
          const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${pres.presentationId}/permissions`, {
            method:'POST', headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ role:'reader', type:'anyone', allowFileDiscovery:false })
          })
          if (driveRes.ok) shareLink = `https://docs.google.com/presentation/d/${pres.presentationId}/edit?usp=sharing`
        } catch {}
      }

      await trackToolUsage(userId, 'slides.createStructured', { ok:true, execMs: Date.now()-started, params:{ blocks: blocks.length } })
      return { success:true, message:'Presentation created from structured content', presentation: { id: pres.presentationId, title: pres.title, url: shareLink, slideCount: blocks.length } }
    } catch (e:any) {
      await trackToolUsage(userId || 'unknown', 'slides.createStructured', { ok:false, execMs: Date.now()-started, errorType:'create_error' })
      return { success:false, message: e?.message || 'Failed to create structured slides', presentation:null }
    }
  }
})
