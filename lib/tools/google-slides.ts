import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId, getCurrentModel } from '@/lib/server/request-context'

// Simple token cache (5 min)
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getSlidesAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `slides:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) return cached.token
  try {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()
    if (!data) return null
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
    if (data.access_token && expiresAt > Date.now() + 5 * 60 * 1000) {
      tokenCache[cacheKey] = { token: data.access_token, expiry: expiresAt }
      return data.access_token
    }
    if (!data.refresh_token) return data.access_token || null
    // Refresh
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token'
      })
    })
    if (!refreshRes.ok) return data.access_token || null
    const refreshJson = await refreshRes.json()
    const newExpiry = Date.now() + refreshJson.expires_in * 1000
    await (supabase as any)
      .from('user_service_connections')
      .update({ access_token: refreshJson.access_token, token_expires_at: new Date(newExpiry).toISOString(), connected: true })
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
    tokenCache[cacheKey] = { token: refreshJson.access_token, expiry: newExpiry }
    return refreshJson.access_token
  } catch (e) {
    console.error('[Slides] token error', e)
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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Slides API error ${res.status}: ${text}`)
  }
  return res.json()
}

// 1. Create presentation
export const createGoogleSlidesPresentationTool = tool({
  description: '🟦 Create a new Google Slides presentation with an optional title and initial summary slide.',
  inputSchema: z.object({
    title: z.string().min(1).describe('Title for the presentation'),
    initialText: z.string().optional().describe('Optional text to place in the first slide textbox'),
    shareSettings: z.enum(['private','public_read']).optional().default('private')
  }),
  execute: async ({ title, initialText, shareSettings='private' }) => {
    const userId = getCurrentUserId(); const model = getCurrentModel(); const started = Date.now()
    if (!userId) return { success:false, message:'Auth required', presentation:null }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected', presentation:null }
    try {
      const pres = await slidesRequest(token, 'presentations', { method:'POST', body: JSON.stringify({ title }) })
      const firstSlideId: string | undefined = pres.slides?.[0]?.objectId
      // If initial text provided, insert a textbox via batchUpdate
      if (initialText && firstSlideId) {
        const elementId = 'intro_box_' + Date.now()
        await slidesRequest(token, `presentations/${pres.presentationId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              { createShape: { objectId: elementId, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: firstSlideId, size: { height:{ magnitude:350, unit:'PT'}, width:{ magnitude:600, unit:'PT'}}, transform: { scaleX:1, scaleY:1, translateX:50, translateY:80, unit:'PT'} } } },
              { insertText: { objectId: elementId, insertionIndex: 0, text: initialText } }
            ]
          })
        })
      }
      // Sharing (Drive API) only if public_read
      let shareLink = pres.presentLink || pres.links?.preview || null
      if (shareSettings === 'public_read') {
        try {
          const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${pres.presentationId}/permissions`, {
            method:'POST',
            headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
            body: JSON.stringify({ role:'reader', type:'anyone', allowFileDiscovery:false })
          })
          if (driveRes.ok) shareLink = `https://docs.google.com/presentation/d/${pres.presentationId}/edit?usp=sharing`
        } catch (e) { console.warn('[Slides] share failed', e) }
      }
      await trackToolUsage(userId, 'slides.createPresentation', { ok:true, execMs: Date.now()-started })
      return { success:true, message:'Presentation created', presentation: { id: pres.presentationId, title: pres.title, url: shareLink || `https://docs.google.com/presentation/d/${pres.presentationId}/edit`, slideCount: pres.slides?.length || 0 } }
    } catch (e:any) {
      console.error('[Slides] create error', e)
  await trackToolUsage(userId, 'slides.createPresentation', { ok:false, execMs: Date.now()-started, errorType:'create_error' })
      return { success:false, message:e.message, presentation:null }
    }
  }
})

// 2. Add slide
export const addGoogleSlideTool = tool({
  description: '➕ Add a new blank slide (optionally with layout) to an existing presentation.',
  inputSchema: z.object({
    presentationId: z.string().min(5),
    layout: z.enum(['BLANK','TITLE','TITLE_AND_BODY']).optional().default('BLANK'),
    objectId: z.string().optional().describe('Optional specific objectId for the new slide')
  }),
  execute: async ({ presentationId, layout, objectId }) => {
    const userId = getCurrentUserId(); const started = Date.now()
    if (!userId) return { success:false, message:'Auth required', slide:null }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected', slide:null }
    try {
      const requests:any[] = [ { createSlide: { objectId: objectId || undefined, slideLayoutReference: layout !== 'BLANK' ? { predefinedLayout: layout } : undefined } } ]
      const res = await slidesRequest(token, `presentations/${presentationId}:batchUpdate`, { method:'POST', body: JSON.stringify({ requests }) })
      const reply = res.replies?.[0]?.createSlide
      await trackToolUsage(userId, 'slides.addSlide', { ok:true, execMs: Date.now()-started })
      return { success:true, message:'Slide added', slide: { id: reply?.objectId, layout } }
    } catch (e:any) {
      console.error('[Slides] add slide error', e)
  await trackToolUsage(userId, 'slides.addSlide', { ok:false, execMs: Date.now()-started, errorType:'add_slide_error' })
      return { success:false, message:e.message, slide:null }
    }
  }
})

// 3. Insert text box into a slide
export const insertGoogleSlideTextBoxTool = tool({
  description: '📝 Insert a text box with content into a specific slide.',
  inputSchema: z.object({
    presentationId: z.string(),
    slideId: z.string(),
    text: z.string().min(1),
    x: z.number().optional().default(50),
    y: z.number().optional().default(80),
    width: z.number().optional().default(600),
    height: z.number().optional().default(150)
  }),
  execute: async ({ presentationId, slideId, text, x=50, y=80, width=600, height=150 }) => {
    const userId = getCurrentUserId(); const started = Date.now()
    if (!userId) return { success:false, message:'Auth required' }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected' }
    try {
      const elementId = 'tb_' + Date.now()
      await slidesRequest(token, `presentations/${presentationId}:batchUpdate`, { method:'POST', body: JSON.stringify({ requests: [ { createShape: { objectId: elementId, shapeType:'TEXT_BOX', elementProperties: { pageObjectId: slideId, size:{ height:{ magnitude:height, unit:'PT'}, width:{ magnitude:width, unit:'PT'}}, transform:{ scaleX:1, scaleY:1, translateX:x, translateY:y, unit:'PT'} } } }, { insertText: { objectId: elementId, insertionIndex:0, text } } ] }) })
      await trackToolUsage(userId, 'slides.insertTextBox', { ok:true, execMs: Date.now()-started })
      return { success:true, message:'Text box inserted', elementId }
    } catch (e:any) {
      console.error('[Slides] insert textbox error', e)
  await trackToolUsage(userId, 'slides.insertTextBox', { ok:false, execMs: Date.now()-started, errorType:'insert_textbox_error' })
      return { success:false, message:e.message }
    }
  }
})

// 4. Append bulleted list slide (create slide + bullets)
export const appendBulletedSlideTool = tool({
  description: '•➕ Create a new slide and add a bulleted list with the provided items.',
  inputSchema: z.object({
    presentationId: z.string(),
    items: z.array(z.string().min(1)).min(1),
    title: z.string().optional(),
  }),
  execute: async ({ presentationId, items, title }) => {
    const userId = getCurrentUserId(); const started = Date.now()
    if (!userId) return { success:false, message:'Auth required', slide:null }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected', slide:null }
    try {
      const slideObjectId = 'slide_' + Date.now()
      const textBoxId = 'list_' + Date.now()
      const bulletText = (title ? title + '\n' : '') + items.join('\n')
      const requests: any[] = [
        { createSlide: { objectId: slideObjectId } },
        { createShape: { objectId: textBoxId, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideObjectId, size:{ height:{ magnitude:400, unit:'PT'}, width:{ magnitude:700, unit:'PT'}}, transform:{ scaleX:1, scaleY:1, translateX:40, translateY:60, unit:'PT'} } } },
        { insertText: { objectId: textBoxId, insertionIndex:0, text: bulletText } },
        // Apply bullets (skip title line if present)
        { createParagraphBullets: { objectId: textBoxId, textRange: { type: 'FROM_START_INDEX', startIndex: title ? (title.length + 1) : 0 }, bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE' } }
      ]
      await slidesRequest(token, `presentations/${presentationId}:batchUpdate`, { method:'POST', body: JSON.stringify({ requests }) })
      await trackToolUsage(userId, 'slides.appendBulletedSlide', { ok:true, execMs: Date.now()-started })
      return { success:true, message:'Bulleted slide added', slide: { id: slideObjectId, itemsCount: items.length } }
    } catch (e:any) {
      console.error('[Slides] bulleted slide error', e)
  await trackToolUsage(userId, 'slides.appendBulletedSlide', { ok:false, execMs: Date.now()-started, errorType:'append_bulleted_error' })
      return { success:false, message:e.message, slide:null }
    }
  }
})

// 5. Read presentation metadata
export const readGoogleSlidesPresentationTool = tool({
  description: '🔍 Get presentation metadata: title, slide count, list of slide IDs.',
  inputSchema: z.object({ presentationId: z.string() }),
  execute: async ({ presentationId }) => {
    const userId = getCurrentUserId(); const started = Date.now()
    if (!userId) return { success:false, message:'Auth required', presentation:null }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected', presentation:null }
    try {
      const pres = await slidesRequest(token, `presentations/${presentationId}`)
      await trackToolUsage(userId, 'slides.readPresentation', { ok:true, execMs: Date.now()-started })
      return { success:true, message:'OK', presentation: { id: pres.presentationId, title: pres.title, slideCount: pres.slides?.length || 0, slideIds: pres.slides?.map((s:any)=>s.objectId) || [] } }
    } catch (e:any) {
      console.error('[Slides] read error', e)
  await trackToolUsage(userId, 'slides.readPresentation', { ok:false, execMs: Date.now()-started, errorType:'read_error' })
      return { success:false, message:e.message, presentation:null }
    }
  }
})

// 6. Replace text occurrences across presentation
export const replaceGoogleSlidesTextTool = tool({
  description: '🔄 Replace all occurrences of a text string across the presentation slides.',
  inputSchema: z.object({
    presentationId: z.string(),
    matchText: z.string().min(1),
    replaceText: z.string().min(1)
  }),
  execute: async ({ presentationId, matchText, replaceText }) => {
    const userId = getCurrentUserId(); const started = Date.now()
    if (!userId) return { success:false, message:'Auth required', replaced:0 }
    const token = await getSlidesAccessToken(userId)
    if (!token) return { success:false, message:'Google Workspace not connected', replaced:0 }
    try {
      const res = await slidesRequest(token, `presentations/${presentationId}:batchUpdate`, { method:'POST', body: JSON.stringify({ requests: [ { replaceAllText: { containsText: { text: matchText, matchCase:false }, replaceText } } ] }) })
      const replies = res.replies || []
      const replaced = replies[0]?.replaceAllText?.occurrencesChanged || 0
      await trackToolUsage(userId, 'slides.replaceText', { ok:true, execMs: Date.now()-started, params: { replaced } })
      return { success:true, message:`Replaced ${replaced} occurrences`, replaced }
    } catch (e:any) {
      console.error('[Slides] replace text error', e)
  await trackToolUsage(userId, 'slides.replaceText', { ok:false, execMs: Date.now()-started, errorType:'replace_text_error' })
      return { success:false, message:e.message, replaced:0 }
    }
  }
})

export const googleSlidesTools = {
  createGoogleSlidesPresentation: createGoogleSlidesPresentationTool,
  addGoogleSlide: addGoogleSlideTool,
  insertGoogleSlideTextBox: insertGoogleSlideTextBoxTool,
  appendBulletedSlide: appendBulletedSlideTool,
  readGoogleSlidesPresentation: readGoogleSlidesPresentationTool,
  replaceGoogleSlidesText: replaceGoogleSlidesTextTool
}
