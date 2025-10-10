import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentModel, getCurrentUserId } from '@/lib/server/request-context'

// Simple in-memory token cache (5 min expiry)
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGoogleDocsAccessToken(userId: string): Promise<string | null> {
  console.log('🔍 Getting Google Docs access token for user:', userId)
  
  // Check cache first
  const cacheKey = `docs:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) {
    console.log('✅ Using cached token')
    return cached.token
  }
  
  try {
    const supabase = await createClient()
    if (!supabase) {
      console.error('❌ Failed to create Supabase client')
      return null
    }

    const { data, error } = await (supabase as any)
      .from('user_service_connections')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()

    console.log('🔍 Database query result:', {
      hasData: !!data,
      error: error,
      hasAccessToken: data?.access_token ? 'yes' : 'no',
      hasRefreshToken: data?.refresh_token ? 'yes' : 'no',
      tokenExpiresAt: data?.token_expires_at
    })

    if (error || !data) {
      console.error('No Google Docs connection found:', error)
      return null
    }

    // Check if token is expired or missing expiry, and refresh if necessary
    const now = new Date()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at) : null
    const shouldRefresh = (!expiresAt || now >= expiresAt) && data.refresh_token

    if (shouldRefresh) {
      console.log('Token expired or missing expiry, attempting refresh...')
      try {
        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: data.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text()
          console.error('Failed to refresh Google token:', errorText)
          // Mark as disconnected if refresh fails
          await (supabase as any)
            .from('user_service_connections')
            .update({ connected: false })
            .eq('user_id', userId)
            .eq('service_id', 'google-workspace')
          return null
        }

        const tokenData = await refreshResponse.json()
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

        // Update the token in the database
        const { error: updateError } = await (supabase as any)
          .from('user_service_connections')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: newExpiresAt.toISOString(),
            connected: true
          })
          .eq('user_id', userId)
          .eq('service_id', 'google-workspace')

        if (updateError) {
          console.error('Failed to update refreshed token:', updateError)
          return null
        }

        console.log('Token refreshed successfully')
        // Cache the new token
        tokenCache[cacheKey] = { 
          token: tokenData.access_token, 
          expiry: newExpiresAt.getTime() 
        }
        return tokenData.access_token
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        // Mark as disconnected if refresh fails
        await (supabase as any)
          .from('user_service_connections')
          .update({ connected: false })
          .eq('user_id', userId)
          .eq('service_id', 'google-workspace')
        return null
      }
    }

    // Cache the token if valid
    if (expiresAt && expiresAt > now) {
      tokenCache[cacheKey] = { 
        token: data.access_token, 
        expiry: expiresAt.getTime() 
      }
    }

    return data.access_token
  } catch (error) {
    console.error('Error getting Google Docs access token:', error)
    return null
  }
}

async function makeGoogleDocsRequest(accessToken: string, endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://docs.googleapis.com/v1/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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

// 📄 Create a new Google Doc
export const createGoogleDocTool = tool({
  description: '📄 Create a new Google Document with title and initial content. Returns the document ID and web link for sharing.',
  inputSchema: z.object({
    title: z.string().min(1).describe('Title of the new document'),
    content: z.string().optional().describe('Initial content for the document (plain text)'),
    shareSettings: z.enum(['private', 'public_read', 'public_edit']).optional().default('private').describe('Sharing settings for the document'),
  }),
  execute: async ({ title, content, shareSettings = 'private' }) => {
    const userId = getCurrentUserId()
    const currentModel = getCurrentModel()
    
    console.log('🔧 [Google Docs] Creating document:', {
      userId: userId ? 'present' : 'missing',
      model: currentModel || 'unknown',
      title,
      hasContent: !!content,
      shareSettings
    })
    
    try {
      const started = Date.now()
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

      // Create the document
      const docResponse = await makeGoogleDocsRequest(accessToken, 'documents', {
        method: 'POST',
        body: JSON.stringify({
          title: title,
        }),
      })

      const documentId = docResponse.documentId

      // Add initial content if provided
      if (content) {
        await makeGoogleDocsRequest(accessToken, `documents/${documentId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: {
                    index: 1,
                  },
                  text: content,
                },
              },
            ],
          }),
        })
      }

      // Handle sharing settings
      if (shareSettings !== 'private') {
        try {
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
            console.warn('Failed to set sharing permissions:', await driveResponse.text())
          }
        } catch (shareError) {
          console.warn('Error setting sharing permissions:', shareError)
        }
      }

      // Track usage
      await trackToolUsage(userId, 'createGoogleDoc', { ok: true, execMs: Date.now() - started, params: { title } })

      const result = {
        success: true,
        message: `Document "${title}" created successfully`,
        document: {
          id: documentId,
          title: title,
          webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
          webEditLink: `https://docs.google.com/document/d/${documentId}/edit`,
          shareSettings,
          hasContent: !!content
        }
      }

      console.log('✅ [Google Docs] Document created:', result)
      return result

    } catch (error) {
      console.error('❌ [Google Docs] Create error:', error)
      await trackToolUsage(userId || 'unknown', 'createGoogleDoc', { ok: false, execMs: 0, errorType: 'create_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create document',
        document: null
      }
    }
  },
})

// 📖 Read content from a Google Doc
export const readGoogleDocTool = tool({
  description: '📖 Read and extract content from a Google Document. Returns the full text content, title, and document metadata.',
  inputSchema: z.object({
    documentId: z.string().min(1).describe('Google Docs document ID (from URL or previous operations)'),
    includeMetadata: z.boolean().optional().default(true).describe('Include document metadata like creation date, last modified, etc.'),
  }),
  execute: async ({ documentId, includeMetadata = true }) => {
    const userId = getCurrentUserId()
    const currentModel = getCurrentModel()
    
    console.log('🔧 [Google Docs] Reading document:', {
      userId: userId ? 'present' : 'missing',
      model: currentModel || 'unknown',
      documentId,
      includeMetadata
    })
    
    try {
      const started = Date.now()
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to read Google Docs',
          content: null
        }
      }

      const accessToken = await getGoogleDocsAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Google Docs not connected. Please connect your Google account in Settings > Connections.',
          content: null
        }
      }

      // Get document content
      const doc = await makeGoogleDocsRequest(accessToken, `documents/${documentId}`)
      
      // Extract text content from the document structure
      let textContent = ''
      if (doc.body && doc.body.content) {
        for (const element of doc.body.content) {
          if (element.paragraph && element.paragraph.elements) {
            for (const textElement of element.paragraph.elements) {
              if (textElement.textRun && textElement.textRun.content) {
                textContent += textElement.textRun.content
              }
            }
          }
        }
      }

      // Get metadata from Drive API if requested
      let metadata = null
      if (includeMetadata) {
        try {
          const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}?fields=id,name,createdTime,modifiedTime,size,webViewLink,webContentLink,owners,lastModifyingUser,shared`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })
          
          if (driveResponse.ok) {
            metadata = await driveResponse.json()
          }
        } catch (metadataError) {
          console.warn('Failed to get metadata:', metadataError)
        }
      }

      // Track usage
      await trackToolUsage(userId, 'readGoogleDoc', { ok: true, execMs: Date.now() - started, params: { documentId } })

      const result = {
        success: true,
        message: `Document content read successfully (${textContent.length} characters)`,
        content: {
          documentId,
          title: doc.title || 'Untitled Document',
          textContent,
          wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
          characterCount: textContent.length,
          webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
          metadata: metadata ? {
            createdTime: metadata.createdTime,
            modifiedTime: metadata.modifiedTime,
            size: metadata.size,
            owners: metadata.owners,
            lastModifyingUser: metadata.lastModifyingUser,
            shared: metadata.shared
          } : null
        }
      }

      console.log('✅ [Google Docs] Document read:', { 
        documentId, 
        title: result.content.title,
        characterCount: result.content.characterCount 
      })
      return result

    } catch (error) {
      console.error('❌ [Google Docs] Read error:', error)
      await trackToolUsage(userId || 'unknown', 'readGoogleDoc', { ok: false, execMs: 0, errorType: 'read_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read document',
        content: null
      }
    }
  },
})

// ✏️ Update content in a Google Doc
export const updateGoogleDocTool = tool({
  description: '✏️ Update or append content to an existing Google Document. Can replace all content or append to the end.',
  inputSchema: z.object({
    documentId: z.string().min(1).describe('Google Docs document ID to update'),
    content: z.string().min(1).describe('New content to add or replace'),
    mode: z.enum(['replace', 'append', 'prepend']).optional().default('append').describe('How to add content: replace all, append to end, or prepend to beginning'),
    formatting: z.object({
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      fontSize: z.number().min(6).max(72).optional(),
    }).optional().describe('Optional formatting for the new content'),
  }),
  execute: async ({ documentId, content, mode = 'append', formatting }) => {
    const userId = getCurrentUserId()
    const currentModel = getCurrentModel()
    
    console.log('🔧 [Google Docs] Updating document:', {
      userId: userId ? 'present' : 'missing',
      model: currentModel || 'unknown',
      documentId,
      mode,
      contentLength: content.length,
      hasFormatting: !!formatting
    })
    
    try {
      const started = Date.now()
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to update Google Docs',
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

      // Get current document to determine content length
      const doc = await makeGoogleDocsRequest(accessToken, `documents/${documentId}`)
      const currentLength = doc.body?.content?.reduce((length: number, element: any) => {
        if (element.paragraph && element.paragraph.elements) {
          return length + element.paragraph.elements.reduce((elemLength: number, textElement: any) => {
            return elemLength + (textElement.textRun?.content?.length || 0)
          }, 0)
        }
        return length
      }, 0) || 0

      const requests: any[] = []

      if (mode === 'replace') {
        // Delete all content and insert new content
        if (currentLength > 1) {
          requests.push({
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: currentLength,
              },
            },
          })
        }
        requests.push({
          insertText: {
            location: {
              index: 1,
            },
            text: content,
          },
        })
      } else if (mode === 'prepend') {
        // Insert at the beginning (index 1)
        requests.push({
          insertText: {
            location: {
              index: 1,
            },
            text: content + '\n\n',
          },
        })
      } else {
        // Append to the end
        requests.push({
          insertText: {
            location: {
              index: currentLength > 0 ? currentLength : 1,
            },
            text: (currentLength > 1 ? '\n\n' : '') + content,
          },
        })
      }

      // Apply formatting if specified
      if (formatting && requests.length > 0) {
        const insertIndex = mode === 'prepend' ? 1 : currentLength
        const endIndex = insertIndex + content.length + (mode === 'append' && currentLength > 1 ? 2 : 0)
        
        if (formatting.bold) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: insertIndex,
                endIndex: endIndex,
              },
              textStyle: {
                bold: true,
              },
              fields: 'bold',
            },
          })
        }
        
        if (formatting.italic) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: insertIndex,
                endIndex: endIndex,
              },
              textStyle: {
                italic: true,
              },
              fields: 'italic',
            },
          })
        }
        
        if (formatting.fontSize) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: insertIndex,
                endIndex: endIndex,
              },
              textStyle: {
                fontSize: {
                  magnitude: formatting.fontSize,
                  unit: 'PT',
                },
              },
              fields: 'fontSize',
            },
          })
        }
      }

      // Execute the batch update
      await makeGoogleDocsRequest(accessToken, `documents/${documentId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          requests,
        }),
      })

      // Track usage
      await trackToolUsage(userId, 'updateGoogleDoc', { ok: true, execMs: Date.now() - started, params: { documentId, mode, contentLength: content.length } })

      const result = {
        success: true,
        message: `Document updated successfully (${mode} mode, ${content.length} characters)`,
        document: {
          id: documentId,
          webViewLink: `https://docs.google.com/document/d/${documentId}/edit`,
          mode,
          contentAdded: content.length,
          formattingApplied: !!formatting
        }
      }

      console.log('✅ [Google Docs] Document updated:', result)
      return result

    } catch (error) {
      console.error('❌ [Google Docs] Update error:', error)
      await trackToolUsage(userId || 'unknown', 'updateGoogleDoc', { ok: false, execMs: 0, errorType: 'update_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update document',
        document: null
      }
    }
  },
})

// Export the tools
export const googleDocsTools = {
  createDocument: createGoogleDocTool,
  readDocument: readGoogleDocTool,
  updateDocument: updateGoogleDocTool
}
