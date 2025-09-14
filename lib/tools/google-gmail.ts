import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

// Simple in-memory token cache (5 min)
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGmailAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `gmail:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) return cached.token

  try {
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await (supabase as any)
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()

    if (error || !data) return null

    const now = Date.now()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0
    if (data.access_token && expiresAt > now + 300000) { // 5 min buffer
      tokenCache[cacheKey] = { token: data.access_token, expiry: expiresAt }
      return data.access_token
    }

    if (!data.refresh_token) return null

    // Refresh token
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshRes.ok) {
      // mark disconnected on hard failure
      await (supabase as any)
        .from('user_service_connections')
        .update({ connected: false })
        .eq('user_id', userId)
        .eq('service_id', 'google-workspace')
      return null
    }

    const tokenData = await refreshRes.json()
    const newExpiry = now + tokenData.expires_in * 1000

    await (supabase as any)
      .from('user_service_connections')
      .update({ access_token: tokenData.access_token, token_expires_at: new Date(newExpiry).toISOString(), connected: true })
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')

    tokenCache[cacheKey] = { token: tokenData.access_token, expiry: newExpiry }
    return tokenData.access_token
  } catch (e) {
    console.error('[Gmail] Token error:', e)
    return null
  }
}

async function gmailRequest(accessToken: string, endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gmail API error ${res.status}: ${text}`)
  }
  return res.json()
}

function decodeBase64Url(data?: string): string {
  if (!data) return ''
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(escape(atob(normalized)))
    } else {
      // Node.js
      return Buffer.from(normalized, 'base64').toString('utf-8')
    }
  } catch {
    try {
      return Buffer.from(normalized, 'base64').toString('utf-8')
    } catch {
      return ''
    }
  }
}

function getHeader(headers: Array<{ name: string; value: string }>, key: string): string {
  const h = headers.find(h => h.name.toLowerCase() === key.toLowerCase())
  return h?.value ?? ''
}

// RFC 2047 MIME header encoding for non-ASCII characters
function encodeRFC2047(text: string): string {
  // Check if text contains non-ASCII characters
  if (/^[\x00-\x7F]*$/.test(text)) {
    return text // Already ASCII, no encoding needed
  }
  
  // Encode as =?UTF-8?B?base64-encoded-text?=
  const base64Text = Buffer.from(text, 'utf-8').toString('base64')
  return `=?UTF-8?B?${base64Text}?=`
}

// 📥 List messages
export const listGmailMessagesTool = tool({
  description: '📥 List Gmail messages. Supports Gmail search query, label filters, and max results. Returns lightweight metadata (From, Subject, Date, Snippet).',
  inputSchema: z.object({
    q: z.string().optional().describe('Gmail search query, e.g. "from:foo@bar.com is:unread newer_than:7d"'),
    labelIds: z.array(z.string()).optional().describe('Filter by label IDs (e.g., ["INBOX","UNREAD"])'),
    maxResults: z.number().min(1).max(20).default(10).describe('Max messages to return (1-20). Default 10.'),
    includeSpamTrash: z.boolean().optional().default(false),
  }),
  execute: async ({ q, labelIds, maxResults = 10, includeSpamTrash = false }) => {
  const userId = getCurrentUserId()
    try {
      const started = Date.now()
      if (!userId) return { success: false, message: 'Auth required', messages: [], total_count: 0 }
      const token = await getGmailAccessToken(userId)
      if (!token) return { success: false, message: 'Connect Gmail in Settings', messages: [], total_count: 0 }

      const params = new URLSearchParams({ maxResults: String(maxResults), includeSpamTrash: String(includeSpamTrash) })
      if (q) params.append('q', q)
      if (labelIds && labelIds.length) labelIds.forEach(l => params.append('labelIds', l))

      const list = await gmailRequest(token, `users/me/messages?${params}`)
      const ids: string[] = list.messages?.map((m: any) => m.id) ?? []

      // Fetch metadata for each message in parallel (max 10 concurrent)
      const results: any[] = []
      const chunkSize = 10
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        const promises = chunk.map(async (id) => {
          try {
            const msg = await gmailRequest(token, `users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`)
            const headers = msg.payload?.headers ?? []
            return {
              id: msg.id,
              threadId: msg.threadId,
              from: getHeader(headers, 'From'),
              to: getHeader(headers, 'To'),
              subject: getHeader(headers, 'Subject') || '(No subject)',
              date: getHeader(headers, 'Date'),
              snippet: msg.snippet ?? '',
              labelIds: msg.labelIds ?? [],
            }
          } catch (e) {
            return null // Skip broken items
          }
        })
        
        const chunkResults = await Promise.all(promises)
        results.push(...chunkResults.filter(r => r !== null))
      }

      const result = { success: true, message: `Found ${results.length} messages`, messages: results, total_count: results.length }
      await trackToolUsage(userId, 'gmail.listMessages', { ok: true, execMs: Date.now() - started, params: { maxResults } })
      return result
    } catch (error) {
      console.error('[Gmail] list error:', error)
  const userIdStr = getCurrentUserId()
  if (userIdStr) await trackToolUsage(userIdStr, 'gmail.listMessages', { ok: false, execMs: 0, errorType: 'list_error' })
      return { success: false, message: 'Failed to list messages', messages: [], total_count: 0 }
    }
  }
})

// 📖 Get full message content
export const getGmailMessageTool = tool({
  description: '📖 Get full Gmail message content by ID. Returns subject, headers, text and HTML bodies, and basic parts info.',
  inputSchema: z.object({
    messageId: z.string().describe('Gmail message ID'),
  }),
  execute: async ({ messageId }) => {
  const userId = getCurrentUserId()
    try {
      const started = Date.now()
      if (!userId) return { success: false, message: 'Auth required' }
      const token = await getGmailAccessToken(userId)
      if (!token) return { success: false, message: 'Connect Gmail in Settings' }

      const msg = await gmailRequest(token, `users/me/messages/${messageId}?format=full`)

      const headers = msg.payload?.headers ?? []
      const subject = getHeader(headers, 'Subject') || '(No subject)'
      const from = getHeader(headers, 'From')
      const to = getHeader(headers, 'To')
      const date = getHeader(headers, 'Date')

      // Extract body parts
      let textBody = ''
      let htmlBody = ''

      function walk(part: any) {
        if (!part) return
        const mimeType = part.mimeType
        if (mimeType === 'text/plain' && part.body?.data) textBody += decodeBase64Url(part.body.data)
        if (mimeType === 'text/html' && part.body?.data) htmlBody += decodeBase64Url(part.body.data)
        if (part.parts) part.parts.forEach((p: any) => walk(p))
      }
      walk(msg.payload)

      // Fallback if single-part with body at root
      if (!textBody && msg.payload?.mimeType === 'text/plain' && msg.payload?.body?.data) textBody = decodeBase64Url(msg.payload.body.data)
      if (!htmlBody && msg.payload?.mimeType === 'text/html' && msg.payload?.body?.data) htmlBody = decodeBase64Url(msg.payload.body.data)

      const result = {
        success: true,
        message: 'OK',
        id: msg.id,
        threadId: msg.threadId,
        subject, from, to, date,
        snippet: msg.snippet ?? '',
        textBody,
        htmlBody,
        labelIds: msg.labelIds ?? [],
      }
      await trackToolUsage(userId, 'gmail.getMessage', { ok: true, execMs: Date.now() - started })
      return result
    } catch (error) {
      console.error('[Gmail] get error:', error)
  const userIdStr = getCurrentUserId()
  if (userIdStr) await trackToolUsage(userIdStr, 'gmail.getMessage', { ok: false, execMs: 0, errorType: 'get_error' })
      return { success: false, message: 'Failed to get message' }
    }
  }
})

// 📤 Send email (simple, no attachments)
// Note: The system prompt enforces user approval before calling this tool. The UI/agent should
// first draft the message and only call send after explicit confirmation from the user.
export const sendGmailMessageTool = tool({
  description: '📤 Send an email via Gmail. Supports To, Cc, Bcc, Subject, and plain text or HTML body. For replies, pass threadId and In-Reply-To headers.',
  inputSchema: z.object({
    to: z.array(z.string().email()).describe('Recipients list'),
    subject: z.string().default('(No subject)'),
    text: z.string().optional().describe('Plain text body'),
    html: z.string().optional().describe('HTML body'),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    replyTo: z.string().email().optional(),
    threadId: z.string().optional(),
    inReplyTo: z.string().optional().describe('Message-ID being replied to'),
    references: z.string().optional(),
  }).refine((data) => !!data.text || !!data.html, { message: 'Either text or html body is required', path: ['text'] }),
  execute: async ({ to, subject = '(No subject)', text, html, cc, bcc, replyTo, threadId, inReplyTo, references }) => {
  const userId = getCurrentUserId()
    try {
      const started = Date.now()
      if (!userId) return { success: false, message: 'Auth required' }
      const token = await getGmailAccessToken(userId)
      if (!token) return { success: false, message: 'Connect Gmail in Settings' }

      // Build MIME message per RFC 2822
      const boundary = `----=_Part_${Date.now()}`
      const headers: string[] = []
      headers.push(`To: ${to.join(', ')}`)
      if (cc?.length) headers.push(`Cc: ${cc.join(', ')}`)
      if (bcc?.length) headers.push(`Bcc: ${bcc.join(', ')}`)
      if (replyTo) headers.push(`Reply-To: ${replyTo}`)
      if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
      if (references) headers.push(`References: ${references}`)
      headers.push(`Subject: ${encodeRFC2047(subject)}`)
      headers.push('MIME-Version: 1.0')

      let mime = ''
      if (text && html) {
        headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
        mime = `${headers.join('\r\n')}\r\n\r\n` +
          `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n` +
          `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n` +
          `--${boundary}--`
      } else if (html) {
        headers.push('Content-Type: text/html; charset=UTF-8')
        mime = `${headers.join('\r\n')}\r\n\r\n${html}`
      } else {
        headers.push('Content-Type: text/plain; charset=UTF-8')
        mime = `${headers.join('\r\n')}\r\n\r\n${text ?? ''}`
      }

      const raw = Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

      const body: any = { raw }
      if (threadId) body.threadId = threadId

      const res = await gmailRequest(token, `users/me/messages/send`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      await trackToolUsage(userId, 'gmail.sendMessage', { ok: true, execMs: Date.now() - started, params: { hasHtml: !!html } })
      return { success: true, message: 'Email sent', id: res.id, threadId: res.threadId }
    } catch (error) {
      console.error('[Gmail] send error:', error)
  const userIdStr = getCurrentUserId()
  if (userIdStr) await trackToolUsage(userIdStr, 'gmail.sendMessage', { ok: false, execMs: 0, errorType: 'send_error' })
      return { success: false, message: 'Failed to send email' }
    }
  }
})

// 🗑️ Trash a message
export const trashGmailMessageTool = tool({
  description: '🗑️ Move a Gmail message to Trash by ID.',
  inputSchema: z.object({ messageId: z.string() }),
  execute: async ({ messageId }) => {
  const userId = getCurrentUserId()
    try {
      if (!userId) return { success: false, message: 'Auth required' }
      const token = await getGmailAccessToken(userId)
      if (!token) return { success: false, message: 'Connect Gmail in Settings' }
      const res = await gmailRequest(token, `users/me/messages/${messageId}/trash`, { method: 'POST' })
      await trackToolUsage(userId, 'gmail.trashMessage', { ok: true, execMs: 1 })
      return { success: true, message: 'Moved to Trash', id: res.id }
    } catch (error) {
  const userIdStr = getCurrentUserId()
  if (userIdStr) await trackToolUsage(userIdStr, 'gmail.trashMessage', { ok: false, execMs: 0, errorType: 'trash_error' })
      return { success: false, message: 'Failed to trash message' }
    }
  }
})

// 🏷️ Modify labels (add/remove)
export const modifyGmailLabelsTool = tool({
  description: '🏷️ Add or remove labels on a Gmail message by ID. Use system label IDs like INBOX, UNREAD, STARRED, IMPORTANT or user label IDs.',
  inputSchema: z.object({
    messageId: z.string(),
    addLabelIds: z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  }),
  execute: async ({ messageId, addLabelIds, removeLabelIds }) => {
  const userId = getCurrentUserId()
    try {
      if (!userId) return { success: false, message: 'Auth required' }
      const token = await getGmailAccessToken(userId)
      if (!token) return { success: false, message: 'Connect Gmail in Settings' }
      const res = await gmailRequest(token, `users/me/messages/${messageId}/modify`, {
        method: 'POST',
        body: JSON.stringify({ addLabelIds: addLabelIds ?? [], removeLabelIds: removeLabelIds ?? [] })
      })
      await trackToolUsage(userId, 'gmail.modifyLabels', { ok: true, execMs: 1 })
      return { success: true, message: 'Labels updated', id: res.id, labelIds: res.labelIds }
    } catch (error) {
  const userIdStr = getCurrentUserId()
  if (userIdStr) await trackToolUsage(userIdStr, 'gmail.modifyLabels', { ok: false, execMs: 0, errorType: 'modify_error' })
      return { success: false, message: 'Failed to modify labels' }
    }
  }
})

export const gmailTools = {
  listMessages: listGmailMessagesTool,
  getMessage: getGmailMessageTool,
  sendMessage: sendGmailMessageTool,
  trashMessage: trashGmailMessageTool,
  modifyLabels: modifyGmailLabelsTool,
}
