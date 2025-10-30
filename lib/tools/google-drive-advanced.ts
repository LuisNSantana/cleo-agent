/**
 * Advanced Google Drive Tools
 * 
 * Professional file management:
 * - Advanced permissions and sharing
 * - Copy and move files
 * - Batch operations
 * - Permission expiration
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'
// ✅ MIGRATION: Removed requestConfirmation import - now using approval-node.ts

// Token cache
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGoogleDriveAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `drive:${userId}`
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
    if (data.access_token && expiresAt > now + 300000) {
      tokenCache[cacheKey] = { token: data.access_token, expiry: expiresAt }
      return data.access_token
    }

    if (!data.refresh_token) return null

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
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(newExpiry).toISOString(),
        connected: true
      })
      .eq('user_id', userId)
      .eq('service_id', 'google-workspace')

    tokenCache[cacheKey] = { token: tokenData.access_token, expiry: newExpiry }
    return tokenData.access_token
  } catch (error) {
    console.error('Error getting Drive token:', error)
    return null
  }
}

async function makeGoogleDriveRequest(accessToken: string, endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Drive API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

// Share Drive file with permissions
export const shareDriveFileTool = tool({
  description: 'Share a Google Drive file or folder with specific users or publicly. Set permission levels (viewer, commenter, writer, owner) and expiration dates. Essential for collaboration and file distribution.',
  inputSchema: z.object({
    fileId: z.string().describe('ID of the file or folder to share'),
    shareWith: z.object({
      type: z.enum(['user', 'group', 'domain', 'anyone']).describe('Who to share with'),
      emailAddress: z.string().email().optional().describe('Email (required for user/group type)'),
      domain: z.string().optional().describe('Domain name (required for domain type)'),
      role: z.enum(['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader']).describe('Permission level'),
      expirationTime: z.string().optional().describe('ISO date when access expires (e.g., "2024-12-31T23:59:59Z")')
    }).describe('Sharing configuration'),
    sendNotification: z.boolean().optional().default(true).describe('Send email notification'),
    notificationMessage: z.string().optional().describe('Custom message in notification email')
  }),
  execute: async ({ fileId, shareWith, sendNotification, notificationMessage }) => {
    // ✅ MIGRATION: Removed requestConfirmation wrapper
    // Approval now handled by approval-node.ts using TOOL_APPROVAL_CONFIG
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getGoogleDriveAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Drive not connected' }
    }

    console.log('📁 [Drive Advanced] Sharing file:', { fileId, type: shareWith.type, role: shareWith.role })

    try {
      // Build permission
      const permission: any = {
        type: shareWith.type,
        role: shareWith.role
      }

      if (shareWith.type === 'user' || shareWith.type === 'group') {
        if (!shareWith.emailAddress) {
          return { success: false, message: 'Email address required for user/group sharing' }
        }
        permission.emailAddress = shareWith.emailAddress
      }

      if (shareWith.type === 'domain') {
        if (!shareWith.domain) {
          return { success: false, message: 'Domain required for domain sharing' }
        }
        permission.domain = shareWith.domain
      }

      if (shareWith.expirationTime) {
        permission.expirationTime = shareWith.expirationTime
      }

      // Create permission
      const result = await makeGoogleDriveRequest(
        token,
        `files/${fileId}/permissions?sendNotificationEmail=${sendNotification}${notificationMessage ? `&emailMessage=${encodeURIComponent(notificationMessage)}` : ''}`,
        {
          method: 'POST',
          body: JSON.stringify(permission)
        }
      )

      // Get file details
      const file = await makeGoogleDriveRequest(token, `files/${fileId}?fields=name,webViewLink,mimeType`)

      await trackToolUsage(userId, 'shareDriveFile', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `File shared with ${shareWith.type}${shareWith.emailAddress ? ` (${shareWith.emailAddress})` : ''}`,
        permission: {
          id: result.id,
          type: shareWith.type,
          role: shareWith.role,
          ...(shareWith.expirationTime && { expiresAt: shareWith.expirationTime })
        },
        file: {
          name: file.name,
          webViewLink: file.webViewLink,
          type: file.mimeType
        }
      }
    } catch (error) {
      console.error('Error sharing file:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to share file'
      }
    }
  }
})

// Copy or move Drive file
export const copyMoveDriveFileTool = tool({
  description: 'Copy or move files/folders in Google Drive. Organize files, create backups, duplicate templates. Supports preserving or updating permissions.',
  inputSchema: z.object({
    fileId: z.string().describe('ID of the file/folder to copy or move'),
    operation: z.enum(['copy', 'move']).describe('Whether to copy or move the file'),
    destinationFolderId: z.string().describe('ID of the destination folder'),
    newName: z.string().optional().describe('New name for the file (optional, keeps original if not provided)'),
    preservePermissions: z.boolean().optional().default(false).describe('Keep existing permissions (copy only)')
  }),
  execute: async ({ fileId, operation, destinationFolderId, newName, preservePermissions }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getGoogleDriveAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Drive not connected' }
    }

    console.log('📁 [Drive Advanced] File operation:', { fileId, operation, destinationFolderId })

    try {
      // Get original file details
      const originalFile = await makeGoogleDriveRequest(
        token,
        `files/${fileId}?fields=name,parents,mimeType,webViewLink`
      )

      let result: any

      if (operation === 'copy') {
        // Copy file
        const copyData: any = {
          parents: [destinationFolderId]
        }

        if (newName) {
          copyData.name = newName
        }

        result = await makeGoogleDriveRequest(
          token,
          `files/${fileId}/copy`,
          {
            method: 'POST',
            body: JSON.stringify(copyData)
          }
        )

        // Copy permissions if requested
        if (preservePermissions) {
          try {
            const permissions = await makeGoogleDriveRequest(
              token,
              `files/${fileId}/permissions?fields=permissions(type,role,emailAddress,domain)`
            )

            for (const perm of permissions.permissions || []) {
              // Skip owner permissions (can't be copied)
              if (perm.role === 'owner') continue

              const newPerm: any = {
                type: perm.type,
                role: perm.role
              }

              if (perm.emailAddress) newPerm.emailAddress = perm.emailAddress
              if (perm.domain) newPerm.domain = perm.domain

              await makeGoogleDriveRequest(
                token,
                `files/${result.id}/permissions?sendNotificationEmail=false`,
                {
                  method: 'POST',
                  body: JSON.stringify(newPerm)
                }
              )
            }
          } catch (permError) {
            console.warn('Could not copy all permissions:', permError)
          }
        }

      } else {
        // Move file
        const moveData: any = {
          addParents: destinationFolderId,
          removeParents: originalFile.parents ? originalFile.parents.join(',') : undefined
        }

        if (newName) {
          moveData.name = newName
        }

        const queryParams = new URLSearchParams()
        if (moveData.addParents) queryParams.append('addParents', moveData.addParents)
        if (moveData.removeParents) queryParams.append('removeParents', moveData.removeParents)

        const updateBody: any = {}
        if (newName) updateBody.name = newName

        result = await makeGoogleDriveRequest(
          token,
          `files/${fileId}?${queryParams.toString()}`,
          {
            method: 'PATCH',
            body: JSON.stringify(updateBody)
          }
        )
      }

      await trackToolUsage(userId, 'copyMoveDriveFile', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `File ${operation === 'copy' ? 'copied' : 'moved'} successfully`,
        file: {
          id: result.id,
          name: result.name || originalFile.name,
          webViewLink: result.webViewLink,
          type: result.mimeType || originalFile.mimeType
        },
        original: operation === 'copy' ? {
          id: fileId,
          name: originalFile.name
        } : undefined
      }
    } catch (error) {
      console.error('Error in copy/move operation:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete operation'
      }
    }
  }
})
