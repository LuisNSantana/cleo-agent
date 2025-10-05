/**
 * Advanced Gmail Tools
 * 
 * Professional email capabilities:
 * - HTML formatted emails with custom styling
 * - Attachments from URLs
 * - Inline images in email body
 * - Email templates with variables
 * - CC, BCC, Reply-To headers
 * - Email threading
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

// Token cache
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGmailAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `gmail:${userId}`
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
      .update({
        access_token: refreshJson.access_token,
        token_expires_at: new Date(newExpiry).toISOString(),
        connected: true
      })
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')

    tokenCache[cacheKey] = { token: refreshJson.access_token, expiry: newExpiry }
    return refreshJson.access_token
  } catch (e) {
    console.error('[Gmail] token error', e)
    return null
  }
}

function createMimeMessage(params: {
  to: string[]
  subject: string
  htmlBody?: string
  textBody?: string
  cc?: string[]
  bcc?: string[]
  from?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
  attachments?: Array<{ filename: string; mimeType: string; data: string }>
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const {
    to,
    subject,
    htmlBody,
    textBody,
    cc,
    bcc,
    from,
    replyTo,
    inReplyTo,
    references,
    attachments
  } = params

  let message = ''
  
  // Headers
  message += `From: ${from || 'me'}\r\n`
  message += `To: ${to.join(', ')}\r\n`
  if (cc && cc.length > 0) message += `Cc: ${cc.join(', ')}\r\n`
  if (bcc && bcc.length > 0) message += `Bcc: ${bcc.join(', ')}\r\n`
  if (replyTo) message += `Reply-To: ${replyTo}\r\n`
  if (inReplyTo) message += `In-Reply-To: ${inReplyTo}\r\n`
  if (references) message += `References: ${references}\r\n`
  message += `Subject: ${subject}\r\n`
  message += `MIME-Version: 1.0\r\n`
  message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`

  // Body
  if (htmlBody || textBody) {
    message += `--${boundary}\r\n`
    
    if (htmlBody && textBody) {
      // Multipart alternative (both HTML and plain text)
      const altBoundary = `alt_${Date.now()}`
      message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`
      
      message += `--${altBoundary}\r\n`
      message += `Content-Type: text/plain; charset="UTF-8"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n\r\n`
      message += Buffer.from(textBody).toString('base64') + '\r\n\r\n'
      
      message += `--${altBoundary}\r\n`
      message += `Content-Type: text/html; charset="UTF-8"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n\r\n`
      message += Buffer.from(htmlBody).toString('base64') + '\r\n\r\n'
      
      message += `--${altBoundary}--\r\n`
    } else if (htmlBody) {
      message += `Content-Type: text/html; charset="UTF-8"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n\r\n`
      message += Buffer.from(htmlBody).toString('base64') + '\r\n\r\n'
    } else if (textBody) {
      message += `Content-Type: text/plain; charset="UTF-8"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n\r\n`
      message += Buffer.from(textBody).toString('base64') + '\r\n\r\n'
    }
  }

  // Attachments
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      message += `--${boundary}\r\n`
      message += `Content-Type: ${attachment.mimeType}\r\n`
      message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n\r\n`
      message += attachment.data + '\r\n\r\n'
    }
  }

  message += `--${boundary}--\r\n`

  return message
}

// Send HTML formatted email
export const sendHtmlGmailTool = tool({
  description: 'Send a professional HTML formatted email via Gmail. Supports rich formatting, custom styles, tables, colors, fonts. Perfect for newsletters, reports, formal communications.',
  inputSchema: z.object({
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject'),
    htmlBody: z.string().describe('HTML content of the email (can include tables, styles, formatting)'),
    textBody: z.string().optional().describe('Plain text fallback (optional but recommended)'),
    cc: z.array(z.string().email()).optional().describe('CC recipients'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
    replyTo: z.string().email().optional().describe('Reply-To email address'),
    threadId: z.string().optional().describe('Thread ID if this is a reply'),
    inReplyTo: z.string().optional().describe('Message-ID this email is replying to'),
    references: z.string().optional().describe('References header for email threading')
  }),
  execute: async (params) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const { requestConfirmation } = await import('../confirmation/unified')
    
    return requestConfirmation(
      'sendHtmlGmail',
      params,
      async () => {
        const token = await getGmailAccessToken(userId)
        if (!token) {
          return { success: false, message: 'Gmail not connected' }
        }

        console.log('📧 [Gmail Advanced] Sending HTML email:', { to: params.to, subject: params.subject })

        try {
          const mimeMessage = createMimeMessage({
            to: params.to,
            subject: params.subject,
            htmlBody: params.htmlBody,
            textBody: params.textBody,
            cc: params.cc,
            bcc: params.bcc,
            replyTo: params.replyTo,
            inReplyTo: params.inReplyTo,
            references: params.references
          })

          const encodedMessage = Buffer.from(mimeMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')

          const body: any = { raw: encodedMessage }
          if (params.threadId) body.threadId = params.threadId

          const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`Gmail API error: ${error}`)
          }

          const result = await response.json()

          await trackToolUsage(userId, 'sendHtmlGmail', { ok: true, execMs: Date.now() - started })

          return {
            success: true,
            message: 'HTML email sent successfully',
            id: result.id,
            threadId: result.threadId
          }
        } catch (error) {
          console.error('Error sending HTML email:', error)
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email'
          }
        }
      }
    )
  }
})

// Send email with attachments
export const sendGmailWithAttachmentsTool = tool({
  description: 'Send an email with file attachments via Gmail. Supports multiple attachments of various types. Perfect for sending documents, reports, images.',
  inputSchema: z.object({
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body (plain text or HTML)'),
    isHtml: z.boolean().optional().default(false).describe('Whether body is HTML formatted'),
    attachments: z.array(z.object({
      filename: z.string().describe('Name of the file'),
      mimeType: z.string().describe('MIME type (e.g., "application/pdf", "image/png")'),
      content: z.string().describe('Base64 encoded file content')
    })).describe('Array of attachments to include'),
    cc: z.array(z.string().email()).optional().describe('CC recipients'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipients')
  }),
  execute: async (params) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const { requestConfirmation } = await import('../confirmation/unified')
    
    return requestConfirmation(
      'sendGmailWithAttachments',
      params,
      async () => {
        const token = await getGmailAccessToken(userId)
        if (!token) {
          return { success: false, message: 'Gmail not connected' }
        }

        console.log('📧 [Gmail Advanced] Sending email with attachments:', {
          to: params.to,
          attachmentCount: params.attachments.length
        })

        try {
          const mimeMessage = createMimeMessage({
            to: params.to,
            subject: params.subject,
            htmlBody: params.isHtml ? params.body : undefined,
            textBody: params.isHtml ? undefined : params.body,
            cc: params.cc,
            bcc: params.bcc,
            attachments: params.attachments.map(att => ({
              filename: att.filename,
              mimeType: att.mimeType,
              data: att.content
            }))
          })

          const encodedMessage = Buffer.from(mimeMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')

          const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encodedMessage })
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(`Gmail API error: ${error}`)
          }

          const result = await response.json()

          await trackToolUsage(userId, 'sendGmailWithAttachments', { ok: true, execMs: Date.now() - started })

          return {
            success: true,
            message: `Email sent successfully with ${params.attachments.length} attachment(s)`,
            id: result.id,
            threadId: result.threadId
          }
        } catch (error) {
          console.error('Error sending email with attachments:', error)
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email'
          }
        }
      }
    )
  }
})

// Create email draft
export const createGmailDraftTool = tool({
  description: 'Create an email draft in Gmail without sending it. Useful for preparing emails that need review before sending. Supports HTML formatting and attachments.',
  inputSchema: z.object({
    to: z.array(z.string().email()).describe('Recipient email addresses'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body'),
    isHtml: z.boolean().optional().default(false).describe('Whether body is HTML formatted'),
    cc: z.array(z.string().email()).optional().describe('CC recipients'),
    bcc: z.array(z.string().email()).optional().describe('BCC recipients')
  }),
  execute: async (params) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getGmailAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Gmail not connected' }
    }

    console.log('📧 [Gmail Advanced] Creating draft:', { to: params.to, subject: params.subject })

    try {
      const mimeMessage = createMimeMessage({
        to: params.to,
        subject: params.subject,
        htmlBody: params.isHtml ? params.body : undefined,
        textBody: params.isHtml ? undefined : params.body,
        cc: params.cc,
        bcc: params.bcc
      })

      const encodedMessage = Buffer.from(mimeMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: { raw: encodedMessage }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Gmail API error: ${error}`)
      }

      const result = await response.json()

      await trackToolUsage(userId, 'createGmailDraft', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Draft created successfully',
        id: result.id,
        draftLink: `https://mail.google.com/mail/#drafts?compose=${result.message.id}`
      }
    } catch (error) {
      console.error('Error creating draft:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create draft'
      }
    }
  }
})
