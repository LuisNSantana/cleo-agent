import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentModel, getCurrentUserId } from '@/lib/server/request-context'

// Simple in-memory token cache (5 min)
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
  } catch (error) {
    console.error('Error getting Drive access token:', error)
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
    throw new Error(`Google Drive API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

// 📁 List files from Google Drive
export const listDriveFilesTool = tool({
  description: '📁 List files and folders from Google Drive. ALWAYS use this when user asks about their files, documents, folders, or wants to see what\'s in their Drive. Supports filtering by file type, name, and folder location. IMPORTANT: Shows recent files by default.',
  inputSchema: z.object({
    maxResults: z.number().min(1).max(100).optional().default(50).describe('Maximum number of files to return (1-100). Default is 50.'),
    query: z.string().optional().describe('Search query to filter files (e.g., "name contains \'presentation\'", "mimeType = \'application/pdf\'", or just "presentation" for simple search)'),
    orderBy: z.string().optional().default('modifiedTime desc').describe('How to order results: "modifiedTime desc" (newest first), "name", "createdTime desc", "quotaBytesUsed desc" (largest first)'),
    includeItemsFromAllDrives: z.boolean().optional().default(false).describe('Include files from shared drives and other drives'),
    spaces: z.string().optional().default('drive').describe('Spaces to search: "drive" (main Drive), "appDataFolder", or "photos"'),
  }),
  execute: async ({ maxResults = 50, query, orderBy = 'modifiedTime desc', includeItemsFromAllDrives = false, spaces = 'drive' }) => {
    // Get userId and model from request-scoped context (with safe fallbacks inside helpers)
    const userId = getCurrentUserId()
    const currentModel = getCurrentModel()
    
    // Debug logging
    console.log('🔧 [Google Drive] Tool execution started:', {
      userId: userId ? 'present' : 'missing',
      model: currentModel || 'unknown',
      params: {
        maxResults,
        query,
        orderBy,
        includeItemsFromAllDrives,
        spaces
      },
      currentTime: new Date().toISOString()
    })
    
    try {
      const started = Date.now()
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to access Google Drive',
          files: [],
          total_count: 0
        }
      }

      const accessToken = await getGoogleDriveAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Connect Google Drive in Settings',
          files: [],
          total_count: 0
        }
      }

      // Build query parameters
      const params = new URLSearchParams({
        pageSize: maxResults.toString(),
        orderBy: orderBy,
        spaces: spaces,
        includeItemsFromAllDrives: includeItemsFromAllDrives.toString(),
        supportsAllDrives: 'true',
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,iconLink,thumbnailLink,fileExtension,shared,ownedByMe),nextPageToken'
      })

      // Add search query if provided
      if (query) {
        // If it's a simple search term, wrap it in a name contains query
        const searchQuery = query.includes('=') || query.includes('contains') ? query : `name contains '${query}'`
        params.append('q', searchQuery)
      }

      const data = await makeGoogleDriveRequest(accessToken, `files?${params}`)

      console.log('🔧 [Google Drive] API Response:', {
        totalItems: data.files?.length || 0,
        hasFiles: !!data.files,
        firstFileName: data.files?.[0]?.name || 'none',
        allFileNames: data.files?.map((f: any) => f.name) || []
      })

      const files = data.files?.map((file: any) => ({
        id: file.id,
        name: file.name || 'Untitled',
        mimeType: file.mimeType || 'unknown',
        size: file.size ? parseInt(file.size) : 0,
        sizeFormatted: file.size ? formatFileSize(parseInt(file.size)) : 'Unknown size',
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        fileExtension: file.fileExtension || '',
        shared: file.shared || false,
        ownedByMe: file.ownedByMe || false,
        fileType: getFileTypeDescription(file.mimeType),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      })) || []

      const result = {
        success: true,
        message: `Found ${files.length} files${query ? ` matching "${query}"` : ''}`,
        files,
        total_count: files.length,
        query: query || 'all files'
      }
      if (userId) {
        await trackToolUsage(userId, 'googleDrive.listFiles', { ok: true, execMs: Date.now() - started, params: { maxResults } })
      }
      return result
    } catch (error) {
      console.error('Error listing Drive files:', error)
      const userId = getCurrentUserId()
      if (userId) await trackToolUsage(userId, 'googleDrive.listFiles', { ok: false, execMs: 0, errorType: 'list_error' })
      return {
        success: false,
        message: `Failed to fetch Drive files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        files: [],
        total_count: 0
      }
    }
  },
})

// 🔍 Search files in Google Drive
export const searchDriveFilesTool = tool({
  description: '🔍 Search for specific files in Google Drive using advanced search criteria. Use this when user wants to find files by name, type, content, or other criteria. More powerful than the list tool for targeted searches.',
  inputSchema: z.object({
    searchTerm: z.string().describe('What to search for (file name, content, or description)'),
    fileType: z.string().optional().describe('Filter by file type: "document", "spreadsheet", "presentation", "pdf", "image", "video", "audio", "folder", or specific mime type'),
    maxResults: z.number().min(1).max(50).optional().default(25).describe('Maximum number of results (1-50). Default is 25.'),
    includeContent: z.boolean().optional().default(false).describe('Search inside file content (for documents, PDFs, etc.)'),
    modifiedAfter: z.string().optional().describe('Find files modified after this date (ISO format: "2025-08-01T00:00:00Z")'),
    sharedWithMe: z.boolean().optional().default(false).describe('Only search files shared with me'),
  }),
  execute: async ({ searchTerm, fileType, maxResults = 25, includeContent = false, modifiedAfter, sharedWithMe = false }) => {
    // Get userId from request-scoped context
    const userId = getCurrentUserId()
    
    try {
      const started = Date.now()
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to search Google Drive',
          files: [],
          total_count: 0
        }
      }

      const accessToken = await getGoogleDriveAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Connect Google Drive in Settings',
          files: [],
          total_count: 0
        }
      }

      // Build advanced search query
      let searchQuery = ''
      
      if (includeContent) {
        searchQuery += `fullText contains '${searchTerm}'`
      } else {
        searchQuery += `name contains '${searchTerm}'`
      }

      // Add file type filter
      if (fileType) {
        const mimeType = getGoogleMimeType(fileType)
        if (mimeType) {
          searchQuery += ` and mimeType = '${mimeType}'`
        }
      }

      // Add date filter
      if (modifiedAfter) {
        searchQuery += ` and modifiedTime > '${modifiedAfter}'`
      }

      // Add shared filter
      if (sharedWithMe) {
        searchQuery += ` and sharedWithMe = true`
      }

      // Use a safe orderBy: 'relevance' only when doing fullText search; otherwise prefer recency
      const orderBy = includeContent ? 'relevance' : 'modifiedTime desc'
      const baseParams: Record<string, string> = {
        q: searchQuery,
        pageSize: maxResults.toString(),
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink,fileExtension,shared,ownedByMe)',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true'
      }
      let params = new URLSearchParams({ ...baseParams, orderBy })

      let data: any
      try {
        data = await makeGoogleDriveRequest(accessToken, `files?${params}`)
      } catch (err: any) {
        const msg = (err && err.message) ? String(err.message) : ''
        // Fallback: if the API complains about orderBy, retry without it
        if (/orderBy/.test(msg) || /Invalid Value/.test(msg)) {
          try {
            params = new URLSearchParams(baseParams) // drop orderBy
            data = await makeGoogleDriveRequest(accessToken, `files?${params}`)
          } catch (err2) {
            throw err2
          }
        } else {
          throw err
        }
      }

      const files = data.files?.map((file: any) => ({
        id: file.id,
        name: file.name || 'Untitled',
        mimeType: file.mimeType || 'unknown',
        size: file.size ? parseInt(file.size) : 0,
        sizeFormatted: file.size ? formatFileSize(parseInt(file.size)) : 'Unknown size',
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        fileExtension: file.fileExtension || '',
        shared: file.shared || false,
        ownedByMe: file.ownedByMe || false,
        fileType: getFileTypeDescription(file.mimeType),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      })) || []

      const result = {
        success: true,
        message: `Found ${files.length} files matching "${searchTerm}"${fileType ? ` (${fileType} files)` : ''}`,
        files,
        total_count: files.length,
        searchTerm,
        searchQuery
      }
      if (userId) {
        await trackToolUsage(userId, 'googleDrive.searchFiles', { ok: true, execMs: Date.now() - started, params: { maxResults, includeContent } })
      }
      return result
    } catch (error) {
      console.error('Error searching Drive files:', error)
      const userId = getCurrentUserId()
      if (userId) await trackToolUsage(userId, 'googleDrive.searchFiles', { ok: false, execMs: 0, errorType: 'search_error' })
      return {
        success: false,
        message: `Failed to search Drive files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        files: [],
        total_count: 0
      }
    }
  },
})

// 📄 Get file details from Google Drive
export const getDriveFileDetailsTool = tool({
  description: '📄 Get detailed information about a specific file or folder in Google Drive. Use this when user wants more details about a particular file, including permissions, sharing status, and metadata.',
  inputSchema: z.object({
    fileId: z.string().describe('The ID of the file to get details for'),
    includePermissions: z.boolean().optional().default(false).describe('Include detailed sharing permissions information'),
  }),
  execute: async ({ fileId, includePermissions = false }) => {
    // Get userId from request-scoped context
    const userId = getCurrentUserId()
    
    try {
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required to access Google Drive',
          file: null
        }
      }

      const accessToken = await getGoogleDriveAccessToken(userId)
      if (!accessToken) {
        return {
          success: false,
          message: 'Connect Google Drive in Settings',
          file: null
        }
      }

      let fields = 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,iconLink,thumbnailLink,fileExtension,shared,ownedByMe,parents,description,lastModifyingUser,sharingUser,owners,version,quotaBytesUsed'
      
      if (includePermissions) {
        fields += ',permissions(id,type,role,emailAddress,displayName)'
      }

      const params = new URLSearchParams({
        fields,
        supportsAllDrives: 'true'
      })

      const file = await makeGoogleDriveRequest(accessToken, `files/${fileId}?${params}`)

      const fileDetails = {
        id: file.id,
        name: file.name || 'Untitled',
        description: file.description || '',
        mimeType: file.mimeType || 'unknown',
        size: file.size ? parseInt(file.size) : 0,
        sizeFormatted: file.size ? formatFileSize(parseInt(file.size)) : 'Unknown size',
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        fileExtension: file.fileExtension || '',
        shared: file.shared || false,
        ownedByMe: file.ownedByMe || false,
        fileType: getFileTypeDescription(file.mimeType),
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
        parents: file.parents || [],
        version: file.version || '1',
        quotaBytesUsed: file.quotaBytesUsed || '0',
        lastModifyingUser: file.lastModifyingUser?.displayName || 'Unknown',
        owners: file.owners?.map((owner: any) => owner.displayName || owner.emailAddress) || [],
        permissions: includePermissions ? file.permissions?.map((p: any) => ({
          type: p.type,
          role: p.role,
          emailAddress: p.emailAddress,
          displayName: p.displayName
        })) : undefined
      }

      const result = {
        success: true,
        message: `Retrieved details for "${file.name}"`,
        file: fileDetails
      }
      if (userId) {
        await trackToolUsage(userId, 'googleDrive.getFileDetails', { ok: true, execMs: 0, params: { includePermissions } })
      }
      return result
  } catch (error) {
      console.error('Error getting Drive file details:', error)
      if (userId) await trackToolUsage(userId, 'googleDrive.getFileDetails', { ok: false, execMs: 0, errorType: 'details_error' })
      return {
        success: false,
        message: `Failed to get file details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: null
      }
    }
  },
})

// 📁 Create a new folder in Google Drive
export const createDriveFolderTool = tool({
  description: '📁 Create a new folder in Google Drive. Use after the user has reviewed a preview and explicitly approved the folder creation.',
  inputSchema: z.object({
    name: z.string().min(1).describe('Name of the folder to create'),
    parentFolderId: z.string().optional().describe('ID of the parent folder. If not provided, creates in root folder'),
    description: z.string().optional().describe('Optional description for the folder'),
  }),
  execute: async ({ name, parentFolderId, description }) => {
    // Validate token before confirmation
    const userId = getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        message: 'Authentication required to create folders in Google Drive',
        folder: null
      }
    }
    const accessToken = await getGoogleDriveAccessToken(userId)
    if (!accessToken) {
      return {
        success: false,
        message: 'Connect Google Drive in Settings',
        folder: null
      }
    }
    const { requestConfirmation } = await import('../confirmation/unified')
    return requestConfirmation(
      'createDriveFolder',
      { name, parentFolderId, description },
      async () => {
        try {
          const folderData = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        description,
        parents: parentFolderId ? [parentFolderId] : undefined
      }

      const started = Date.now()
      const folder = await makeGoogleDriveRequest(
        accessToken,
        'files',
        {
          method: 'POST',
          body: JSON.stringify(folderData),
        }
      )

      const result = {
        success: true,
        message: `Successfully created folder "${name}"`,
        folder: {
          id: folder.id,
          name: folder.name,
          webViewLink: folder.webViewLink,
          createdTime: folder.createdTime,
          parents: folder.parents || []
        }
      }
      if (userId) {
        await trackToolUsage(userId, 'googleDrive.createFolder', { ok: true, execMs: Date.now() - started, params: { hasParent: !!parentFolderId } })
      }
      return result
    } catch (error) {
      console.error('Error creating Drive folder:', error)
      if (userId) await trackToolUsage(userId, 'googleDrive.createFolder', { ok: false, execMs: 0, errorType: 'create_folder_error' })
      return {
        success: false,
        message: `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        folder: null
      }
    }
  }
)
},
})

// ⬆️ Upload a new file to Google Drive
export const uploadFileToDriveTool = tool({
  description: '⬆️ Upload a new file to Google Drive. Use after the user has reviewed a preview and explicitly approved the upload. Supports specifying a target folder and MIME type.',
  inputSchema: z.object({
    filename: z.string().min(1).describe('Filename to create in Drive (e.g., "documento.md")'),
    content: z.string().min(1).describe('File content as a UTF-8 string (for markdown, text, JSON, etc.)'),
    mimeType: z.string().optional().default('text/markdown').describe('MIME type of the file (e.g., text/markdown, text/plain, application/json, text/html)'),
    folderId: z.string().optional().describe('Optional destination folder ID in Drive'),
  }),
  execute: async ({ filename, content, mimeType = 'text/markdown', folderId }) => {
    // Validate token before confirmation
    const userId = getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        message: 'Authentication required to upload to Google Drive',
        file: null,
      }
    }
    let accessToken = await getGoogleDriveAccessToken(userId)
    if (!accessToken) {
      return {
        success: false,
        message: 'Connect Google Drive in Settings',
        file: null,
      }
    }
    const { requestConfirmation } = await import('../confirmation/unified')
    return requestConfirmation(
      'uploadToDrive',
      { filename, content, mimeType, folderId },
      async () => {
        try {
          const started = Date.now()
          // Build multipart/related body per Drive API
          const boundary = 'gcpmultipart' + Math.random().toString(36).slice(2)
          const metadata: Record<string, any> = { name: filename }
          if (folderId) metadata.parents = [folderId]

      const bodyParts = [
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: ${mimeType}; charset=UTF-8\r\n\r\n${content}\r\n`,
        `--${boundary}--`,
      ]
      const multipartBody = bodyParts.join('')

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType,parents,createdTime,modifiedTime,iconLink,thumbnailLink'

      async function attemptUpload(token: string) {
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        })
        return res
      }

      if (!accessToken) {
        if (userId) await trackToolUsage(userId, 'googleDrive.uploadFile', { ok: false, execMs: 0, errorType: 'upload_error' })
        return {
          success: false,
          message: 'Drive upload failed: missing access token.',
          file: null,
        }
      }
      let res = await attemptUpload(accessToken)
      // If unauthorized, try fetching a fresh token once and retry
      if (res.status === 401 || res.status === 403) {
        const maybeRefreshed = await getGoogleDriveAccessToken(userId)
        if (maybeRefreshed && maybeRefreshed !== accessToken) {
          accessToken = maybeRefreshed
          res = await attemptUpload(accessToken)
        }
      }

      if (!res.ok) {
        const details = await res.text().catch(() => '')
        if (userId) await trackToolUsage(userId, 'googleDrive.uploadFile', { ok: false, execMs: 0, errorType: 'upload_error' })
        return {
          success: false,
          message: `Drive upload failed (${res.status}). ${details || 'Please reconnect Google Drive and try again.'}`,
          file: null,
        }
      }

      const data = await res.json()
      const result = {
        success: true,
        message: `Uploaded "${data.name}" to Google Drive successfully`,
        file: {
          id: data.id,
          name: data.name,
          mimeType: data.mimeType,
          parents: data.parents || [],
          webViewLink: data.webViewLink,
          webContentLink: data.webContentLink,
          createdTime: data.createdTime,
          modifiedTime: data.modifiedTime,
          iconLink: data.iconLink,
          thumbnailLink: data.thumbnailLink,
        },
      }
      if (userId) {
        await trackToolUsage(userId, 'googleDrive.uploadFile', { ok: true, execMs: Date.now() - started, params: { hasFolder: !!folderId, mimeType } })
      }
      return result
    } catch (error) {
      console.error('Error uploading file to Drive:', error)
      if (userId) await trackToolUsage(userId, 'googleDrive.uploadFile', { ok: false, execMs: 0, errorType: 'upload_error' })
      return {
        success: false,
        message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: null,
      }
    }
  }
)
},
})

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileTypeDescription(mimeType: string): string {
  const typeMap: { [key: string]: string } = {
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.spreadsheet': 'Google Sheet',
    'application/vnd.google-apps.presentation': 'Google Slides',
    'application/vnd.google-apps.folder': 'Folder',
    'application/vnd.google-apps.form': 'Google Form',
    'application/vnd.google-apps.drawing': 'Google Drawing',
    'application/vnd.google-apps.site': 'Google Site',
    'application/pdf': 'PDF Document',
    'text/plain': 'Text File',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'video/mp4': 'MP4 Video',
    'audio/mpeg': 'MP3 Audio',
    'application/zip': 'ZIP Archive',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation'
  }
  
  return typeMap[mimeType] || 'Unknown File Type'
}

function getGoogleMimeType(fileType: string): string | null {
  const typeMap: { [key: string]: string } = {
    'document': 'application/vnd.google-apps.document',
    'spreadsheet': 'application/vnd.google-apps.spreadsheet',
    'presentation': 'application/vnd.google-apps.presentation',
    'folder': 'application/vnd.google-apps.folder',
    'form': 'application/vnd.google-apps.form',
    'pdf': 'application/pdf',
    'image': 'image/',
    'video': 'video/',
    'audio': 'audio/'
  }
  
  return typeMap[fileType] || null
}

// Export all Google Drive tools
export const googleDriveTools = {
  listFiles: listDriveFilesTool,
  searchFiles: searchDriveFilesTool,
  getFileDetails: getDriveFileDetailsTool,
  createFolder: createDriveFolderTool,
  uploadFile: uploadFileToDriveTool
}
