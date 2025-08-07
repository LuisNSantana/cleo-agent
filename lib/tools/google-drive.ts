import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function getGoogleDriveAccessToken(userId: string): Promise<string | null> {
  console.log('🔍 Getting Google Drive access token for user:', userId)
  
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
      .eq('service_id', 'google-drive')
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
      console.error('No Google Drive connection found:', error)
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
          // Marcar como desconectado si el refresh falla
          await (supabase as any)
            .from('user_service_connections')
            .update({ connected: false })
            .eq('user_id', userId)
            .eq('service_id', 'google-drive')
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
          .eq('service_id', 'google-drive')

        if (updateError) {
          console.error('Failed to update refreshed token:', updateError)
          return null
        }

        console.log('Token refreshed successfully')
        return tokenData.access_token
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        // Marcar como desconectado si el refresh falla
        await (supabase as any)
          .from('user_service_connections')
          .update({ connected: false })
          .eq('user_id', userId)
          .eq('service_id', 'google-drive')
        return null
      }
    }

    return data.access_token
  } catch (error) {
    console.error('Error getting Google Drive access token:', error)
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
    maxResults: z.number().min(1).max(100).optional().default(20).describe('Maximum number of files to return (1-100). Default is 20.'),
    query: z.string().optional().describe('Search query to filter files (e.g., "name contains \'presentation\'", "mimeType = \'application/pdf\'", or just "presentation" for simple search)'),
    orderBy: z.string().optional().default('modifiedTime desc').describe('How to order results: "modifiedTime desc" (newest first), "name", "createdTime desc", "quotaBytesUsed desc" (largest first)'),
    includeItemsFromAllDrives: z.boolean().optional().default(false).describe('Include files from shared drives and other drives'),
    spaces: z.string().optional().default('drive').describe('Spaces to search: "drive" (main Drive), "appDataFolder", or "photos"'),
  }),
  execute: async ({ maxResults = 20, query, orderBy = 'modifiedTime desc', includeItemsFromAllDrives = false, spaces = 'drive' }) => {
    // Get userId and model from global context (injected by chat handler)
    const userId = (globalThis as any).__currentUserId
    const currentModel = (globalThis as any).__currentModel
    
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
          message: 'Google Drive not connected. Please connect your Google Drive in Settings > Connections.',
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

      return {
        success: true,
        message: `Found ${files.length} files${query ? ` matching "${query}"` : ''}`,
        files,
        total_count: files.length,
        query: query || 'all files'
      }
    } catch (error) {
      console.error('Error listing Drive files:', error)
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
    maxResults: z.number().min(1).max(50).optional().default(10).describe('Maximum number of results (1-50). Default is 10.'),
    includeContent: z.boolean().optional().default(false).describe('Search inside file content (for documents, PDFs, etc.)'),
    modifiedAfter: z.string().optional().describe('Find files modified after this date (ISO format: "2025-08-01T00:00:00Z")'),
    sharedWithMe: z.boolean().optional().default(false).describe('Only search files shared with me'),
  }),
  execute: async ({ searchTerm, fileType, maxResults = 10, includeContent = false, modifiedAfter, sharedWithMe = false }) => {
    // Get userId from global context
    const userId = (globalThis as any).__currentUserId
    
    try {
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
          message: 'Google Drive not connected. Please connect your Google Drive in Settings > Connections.',
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

      const params = new URLSearchParams({
        q: searchQuery,
        pageSize: maxResults.toString(),
        orderBy: 'relevance',
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink,thumbnailLink,fileExtension,shared,ownedByMe)',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true'
      })

      const data = await makeGoogleDriveRequest(accessToken, `files?${params}`)

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

      return {
        success: true,
        message: `Found ${files.length} files matching "${searchTerm}"${fileType ? ` (${fileType} files)` : ''}`,
        files,
        total_count: files.length,
        searchTerm,
        searchQuery
      }
    } catch (error) {
      console.error('Error searching Drive files:', error)
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
    // Get userId from global context
    const userId = (globalThis as any).__currentUserId
    
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
          message: 'Google Drive not connected. Please connect your Google Drive in Settings > Connections.',
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

      return {
        success: true,
        message: `Retrieved details for "${file.name}"`,
        file: fileDetails
      }
    } catch (error) {
      console.error('Error getting Drive file details:', error)
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
  description: '📁 Create a new folder in Google Drive. Use this when user wants to organize their files by creating new folders.',
  inputSchema: z.object({
    name: z.string().min(1).describe('Name of the folder to create'),
    parentFolderId: z.string().optional().describe('ID of the parent folder. If not provided, creates in root folder'),
    description: z.string().optional().describe('Optional description for the folder'),
  }),
  execute: async ({ name, parentFolderId, description }) => {
    // Get userId from global context
    const userId = (globalThis as any).__currentUserId
    
    try {
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
          message: 'Google Drive not connected. Please connect your Google Drive in Settings > Connections.',
          folder: null
        }
      }

      const folderData = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        description,
        parents: parentFolderId ? [parentFolderId] : undefined
      }

      const folder = await makeGoogleDriveRequest(
        accessToken,
        'files',
        {
          method: 'POST',
          body: JSON.stringify(folderData),
        }
      )

      return {
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
    } catch (error) {
      console.error('Error creating Drive folder:', error)
      return {
        success: false,
        message: `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        folder: null
      }
    }
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
  createFolder: createDriveFolderTool
}
