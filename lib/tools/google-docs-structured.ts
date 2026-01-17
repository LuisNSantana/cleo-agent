/**
 * Structured Google Docs Creation Tool
 * 
 * Creates properly formatted Google Docs with:
 * - Automatic paragraph structure
 * - Proper heading hierarchy (H1, H2, H3)
 * - Styled text (bold, italic, lists)
 * - Correct indexing and formatting
 * 
 * Based on Google Docs API best practices:
 * https://developers.google.com/workspace/docs/api/concepts/structure
 * https://developers.google.com/workspace/docs/api/how-tos/format-text
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId, getCurrentModel } from '@/lib/server/request-context'

// Token cache
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGoogleDocsAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `docs:${userId}`
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

    const now = new Date()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at) : null
    const shouldRefresh = (!expiresAt || now >= expiresAt) && data.refresh_token

    if (shouldRefresh) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) return null

      const tokenData = await refreshResponse.json()
      const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

      await (supabase as any)
        .from('user_service_connections')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          connected: true
        })
        .eq('user_id', userId)
        .eq('service_id', 'google-workspace')

      tokenCache[cacheKey] = { token: tokenData.access_token, expiry: newExpiresAt.getTime() }
      return tokenData.access_token
    }

    tokenCache[cacheKey] = { token: data.access_token, expiry: expiresAt?.getTime() || (Date.now() + 5 * 60 * 1000) }
    return data.access_token
  } catch (error) {
    console.error('❌ Error getting Docs token:', error)
    return null
  }
}

async function makeDocsRequest(token: string, endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://docs.googleapis.com/v1/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Docs API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

/**
 * Content block types for structured documents
 */
interface ContentBlock {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet_list' | 'numbered_list'
  text: string
  formatting?: {
    bold?: boolean
    italic?: boolean
    fontSize?: number
  }
}

/**
 * Parse markdown-like content into structured blocks
 */
function parseContentToBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  const lines = content.split('\n')
  
  let currentList: { type: 'bullet_list' | 'numbered_list'; items: string[] } | null = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // Heading 1
    if (trimmed.startsWith('# ')) {
      if (currentList) {
        processListItems(blocks, currentList)
        currentList = null
      }
      blocks.push({
        type: 'heading1',
        text: trimmed.substring(2).trim()
      })
    }
    // Heading 2
    else if (trimmed.startsWith('## ')) {
      if (currentList) {
        processListItems(blocks, currentList)
        currentList = null
      }
      blocks.push({
        type: 'heading2',
        text: trimmed.substring(3).trim()
      })
    }
    // Heading 3
    else if (trimmed.startsWith('### ')) {
      if (currentList) {
        processListItems(blocks, currentList)
        currentList = null
      }
      blocks.push({
        type: 'heading3',
        text: trimmed.substring(4).trim()
      })
    }
    // Bullet list
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!currentList || currentList.type !== 'bullet_list') {
        if (currentList) processListItems(blocks, currentList)
        currentList = { type: 'bullet_list', items: [] }
      }
      currentList.items.push(trimmed.substring(2).trim())
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      if (!currentList || currentList.type !== 'numbered_list') {
        if (currentList) processListItems(blocks, currentList)
        currentList = { type: 'numbered_list', items: [] }
      }
      currentList.items.push(trimmed.replace(/^\d+\.\s/, ''))
    }
    // Regular paragraph
    else {
      if (currentList) {
        processListItems(blocks, currentList)
        currentList = null
      }
      
      // Check for **bold** or *italic*
      let text = trimmed
      let formatting: ContentBlock['formatting'] = {}
      
      if (text.includes('**')) {
        formatting.bold = true
        text = text.replace(/\*\*/g, '')
      } else if (text.includes('*')) {
        formatting.italic = true
        text = text.replace(/\*/g, '')
      }
      
      blocks.push({
        type: 'paragraph',
        text,
        formatting: Object.keys(formatting).length > 0 ? formatting : undefined
      })
    }
  }
  
  // Process any remaining list
  if (currentList) {
    processListItems(blocks, currentList)
  }
  
  return blocks
}

function processListItems(
  blocks: ContentBlock[], 
  list: { type: 'bullet_list' | 'numbered_list'; items: string[] }
) {
  for (const item of list.items) {
    blocks.push({
      type: list.type,
      text: item
    })
  }
}

/**
 * Build Google Docs API requests from content blocks
 * 
 * Strategy: Progressive Insertion (Google Docs API Best Practice)
 * 1. Insert all text content in one batch at index 1
 * 2. Calculate exact indices for each block
 * 3. Apply formatting in ascending index order
 * 
 * This approach ensures predictable indices and correct style application.
 */
function buildDocumentRequests(blocks: ContentBlock[]): any[] {
  const requests: any[] = []
  
  // Step 1: Build the complete text content
  const fullText = blocks.map(b => b.text + '\n').join('')
  
  // Insert all text at once at the beginning of the document
  requests.push({
    insertText: {
      location: { index: 1 },
      text: fullText
    }
  })
  
  // Step 2: Apply formatting in ascending index order
  let currentIndex = 1
  
  for (const block of blocks) {
    const textLength = block.text.length + 1 // +1 for the newline character
    const endIndex = currentIndex + textLength
    
    // Apply paragraph style for headings
    if (block.type === 'heading1' || block.type === 'heading2' || block.type === 'heading3') {
      const styleMapping = {
        'heading1': 'HEADING_1',
        'heading2': 'HEADING_2',
        'heading3': 'HEADING_3'
      }
      
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: endIndex
          },
          paragraphStyle: {
            namedStyleType: styleMapping[block.type]
          },
          fields: 'namedStyleType'
        }
      })
    }
    
    // Apply text formatting (bold, italic, fontSize)
    if (block.formatting) {
      const textStyle: any = {}
      const fields: string[] = []
      
      if (block.formatting.bold) {
        textStyle.bold = true
        fields.push('bold')
      }
      
      if (block.formatting.italic) {
        textStyle.italic = true
        fields.push('italic')
      }
      
      if (block.formatting.fontSize) {
        textStyle.fontSize = {
          magnitude: block.formatting.fontSize,
          unit: 'PT'
        }
        fields.push('fontSize')
      }
      
      // Only add updateTextStyle if there are fields to update
      if (fields.length > 0) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: endIndex
            },
            textStyle: textStyle,
            fields: fields.join(',')
          }
        })
      }
    }
    
    // Create paragraph bullets for lists
    if (block.type === 'bullet_list' || block.type === 'numbered_list') {
      requests.push({
        createParagraphBullets: {
          range: {
            startIndex: currentIndex,
            endIndex: endIndex
          },
          bulletPreset: block.type === 'bullet_list' 
            ? 'BULLET_DISC_CIRCLE_SQUARE' 
            : 'NUMBERED_DECIMAL_ALPHA_ROMAN'
        }
      })
    }
    
    // Move to next block
    currentIndex = endIndex
  }
  
  return requests
}

/**
 * Create a structured Google Doc from markdown-like content
 */
export const createStructuredGoogleDocTool = tool({
  description: `📝 Create a professionally formatted Google Document from markdown-like content. 

⚠️ NOT FOR PRESENTATIONS: If user asks for slides, pitch deck, presentación, or diapositivas, use createStructuredGoogleSlides instead!

Use this for: text documents, reports, articles, essays, written content.

FORMATTING RULES:
- Use "# Title" for main headings (Heading 1)
- Use "## Subtitle" for section headings (Heading 2)  
- Use "### Subheading" for subsections (Heading 3)
- Use "- item" or "* item" for bullet lists
- Use "1. item" for numbered lists
- Use "**text**" for bold text
- Use "*text*" for italic text
- Leave blank lines between sections for better readability

Example:
\`\`\`
# Introducción
La Segunda Guerra Mundial fue un conflicto...

## Causas Principales
Las raíces de la Segunda Guerra Mundial...

### Tratado de Versalles
El tratado impuso duras sanciones...

- Primera causa
- Segunda causa
- Tercera causa
\`\`\`

This tool automatically:
✓ Creates proper paragraph structure
✓ Applies heading styles (H1, H2, H3)
✓ Formats lists correctly
✓ Handles text styling (bold, italic)
✓ Ensures correct character indexing`,
  
  inputSchema: z.object({
    title: z.string().min(1).describe('Title of the document'),
    content: z.string().min(1).describe(`Document content using markdown-like syntax:
# for H1, ## for H2, ### for H3
- or * for bullets, 1. for numbered lists
**text** for bold, *text* for italic`),
    shareSettings: z.enum(['private', 'public_read', 'public_edit']).optional().default('private')
  }),
  
  execute: async ({ title, content, shareSettings = 'private' }) => {
    const userId = getCurrentUserId()
    const currentModel = getCurrentModel()
    const started = Date.now()
    
    console.log('📝 [Structured Google Docs] Creating document:', {
      userId: userId ? 'present' : 'missing',
      model: currentModel || 'unknown',
      title,
      contentLength: content.length,
      shareSettings
    })
    
    try {
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to create Google Docs',
          document: null
        }
      }

      const accessToken = await getGoogleDocsAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Google Docs not connected. Please connect your Google account in Settings > Connections.',
          document: null
        }
      }

      // 1. Create empty document
      console.log('📄 Creating empty document...')
      const docResponse = await makeDocsRequest(accessToken, 'documents', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })

      const documentId = docResponse.documentId
      console.log('✅ Document created:', documentId)

      // 2. Parse content into structured blocks
      console.log('📋 Parsing content into blocks...')
      const blocks = parseContentToBlocks(content)
      console.log(`📊 Parsed ${blocks.length} content blocks`)

      // 3. Build requests from blocks
      console.log('🔨 Building formatting requests...')
      const requests = buildDocumentRequests(blocks)
      console.log(`📝 Generated ${requests.length} API requests`)

      // 4. Apply all formatting in one batch
      if (requests.length > 0) {
        console.log('⚡ Applying formatting...')
        await makeDocsRequest(accessToken, `documents/${documentId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({ requests }),
        })
        console.log('✅ Formatting applied successfully')
      }

      // 5. Handle sharing settings
      if (shareSettings !== 'private') {
        try {
          console.log(`🔓 Setting sharing to: ${shareSettings}`)
          const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: shareSettings === 'public_edit' ? 'writer' : 'reader',
              type: 'anyone',
            }),
          })
          
          if (!driveResponse.ok) {
            console.warn('⚠️ Failed to set sharing permissions:', await driveResponse.text())
          } else {
            console.log('✅ Sharing permissions set')
          }
        } catch (shareError) {
          console.warn('⚠️ Error setting sharing permissions:', shareError)
        }
      }

      // Track usage
      await trackToolUsage(userId, 'createStructuredGoogleDoc', { 
        ok: true, 
        execMs: Date.now() - started, 
        params: { title, blocks: blocks.length, requests: requests.length } 
      })

      const result = {
        success: true,
        message: `📄 Document "${title}" created successfully with ${blocks.length} formatted sections`,
        document: {
          id: documentId,
          title: title,
          webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
          webEditLink: `https://docs.google.com/document/d/${documentId}/edit`,
          shareSettings,
          stats: {
            blocks: blocks.length,
            requests: requests.length,
            executionTimeMs: Date.now() - started
          }
        }
      }

      console.log('✅ [Structured Google Docs] Document created successfully:', result)
      return result

    } catch (error) {
      console.error('❌ [Structured Google Docs] Error:', error)
      await trackToolUsage(userId || 'unknown', 'createStructuredGoogleDoc', { 
        ok: false, 
        execMs: Date.now() - started, 
        errorType: error instanceof Error ? error.message : 'creation_error'
      })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create structured document',
        document: null
      }
    }
  },
})
