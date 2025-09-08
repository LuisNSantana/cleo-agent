import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentModel, getCurrentUserId } from '@/lib/server/request-context'

// Simple in-memory token cache (5 min expiry)
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getGoogleSheetsAccessToken(userId: string): Promise<string | null> {
  console.log('🔍 Getting Google Sheets access token for user:', userId)
  
  // Check cache first
  const cacheKey = `sheets:${userId}`
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
      .eq('service_id', 'google-sheets')
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
      console.error('No Google Sheets connection found:', error)
      return null
    }

    // Check if token is expired or missing expiry, and refresh if necessary
    const now = new Date()
    const expiresAt = data.token_expires_at ? new Date(data.token_expires_at) : new Date(0)
    
    if (expiresAt <= now || !data.access_token) {
      console.log('🔄 Token expired or missing, attempting refresh')
      
      if (!data.refresh_token) {
        console.error('❌ No refresh token available')
        return null
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: data.refresh_token,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      })

      if (!refreshResponse.ok) {
        console.error('❌ Failed to refresh token:', await refreshResponse.text())
        return null
      }

      const refreshData = await refreshResponse.json()
      console.log('✅ Token refreshed successfully')

      // Calculate new expiry (expires_in is in seconds)
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000))

      // Update the database with the new token
      const { error: updateError } = await (supabase as any)
        .from('user_service_connections')
        .update({
          access_token: refreshData.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('service_id', 'google-sheets')

      if (updateError) {
        console.error('❌ Failed to update token in database:', updateError)
        return null
      }

      // Cache the new token
      tokenCache[cacheKey] = {
        token: refreshData.access_token,
        expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
      }

      return refreshData.access_token
    }

    // Token is still valid, cache it
    tokenCache[cacheKey] = {
      token: data.access_token,
      expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
    }

    return data.access_token
  } catch (error) {
    console.error('❌ Error getting Google Sheets access token:', error)
    return null
  }
}

async function makeGoogleSheetsRequest(
  userId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  const accessToken = await getGoogleSheetsAccessToken(userId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid Google Sheets access token available' }
  }

  try {
    const response = await fetch(`https://sheets.googleapis.com/v4${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Google Sheets API error (${response.status}):`, errorText)
      return { success: false, error: `API error: ${response.status} ${errorText}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error making Google Sheets request:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Create a new Google Spreadsheet
export const createGoogleSheetTool = tool({
  description: 'Create a new Google Spreadsheet with optional initial data and formatting',
  inputSchema: z.object({
    title: z.string().describe('The title of the new spreadsheet'),
    sheetTitle: z.string().optional().describe('The title of the first sheet (default: "Sheet1")'),
    data: z.array(z.array(z.string())).optional().describe('Optional initial data as array of rows, each row is an array of cell values'),
    shareWithEveryone: z.boolean().optional().describe('Whether to share the spreadsheet publicly (default: false)'),
    shareEmails: z.array(z.string()).optional().describe('Email addresses to share the spreadsheet with')
  }),
  execute: async ({ title, sheetTitle = 'Sheet1', data, shareWithEveryone = false, shareEmails }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        spreadsheet: null
      }
    }

    console.log('📊 [Google Sheets] Creating spreadsheet:', { title, sheetTitle, hasData: !!data })

    try {
      // Create the spreadsheet
      const createResult = await makeGoogleSheetsRequest(userId, '/spreadsheets', 'POST', {
        properties: {
          title: title
        },
        sheets: [{
          properties: {
            title: sheetTitle
          }
        }]
      })

      if (!createResult.success || !createResult.data) {
        return {
          success: false,
          message: createResult.error || 'Failed to create spreadsheet',
          spreadsheet: null
        }
      }

      const spreadsheetId = createResult.data.spreadsheetId
      console.log('✅ [Google Sheets] Spreadsheet created with ID:', spreadsheetId)

      // Add initial data if provided
      if (data && data.length > 0) {
        const range = `${sheetTitle}!A1:${String.fromCharCode(64 + data[0].length)}${data.length}`
        
        const updateResult = await makeGoogleSheetsRequest(
          userId, 
          `/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, 
          'PUT',
          {
            values: data
          }
        )

        if (!updateResult.success) {
          console.warn('⚠️ Failed to add initial data:', updateResult.error)
        } else {
          console.log('✅ [Google Sheets] Initial data added')
        }
      }

      // Handle sharing settings
      const shareSettings: any = {
        public: shareWithEveryone,
        emails: shareEmails || []
      }

      if (shareWithEveryone) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await getGoogleSheetsAccessToken(userId)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone'
            }),
          })
          console.log('✅ [Google Sheets] Made spreadsheet public')
        } catch (shareError) {
          console.warn('Error making spreadsheet public:', shareError)
        }
      }

      if (shareEmails && shareEmails.length > 0) {
        try {
          for (const email of shareEmails) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${await getGoogleSheetsAccessToken(userId)}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'writer',
                type: 'user',
                emailAddress: email
              }),
            })
          }
          console.log('✅ [Google Sheets] Shared with specified emails')
        } catch (shareError) {
          console.warn('Error sharing with emails:', shareError)
        }
      }

      // Track usage
      await trackToolUsage(userId, 'createGoogleSheet', { ok: true, execMs: Date.now() - started, params: { title, hasData: !!data } })

      const result = {
        success: true,
        message: `Spreadsheet "${title}" created successfully`,
        spreadsheet: {
          id: spreadsheetId,
          title: title,
          webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          webEditLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          shareSettings,
          hasData: !!data
        }
      }

      console.log('✅ [Google Sheets] Spreadsheet created:', result)
      return result

    } catch (error) {
      console.error('❌ [Google Sheets] Create error:', error)
      await trackToolUsage(userId || 'unknown', 'createGoogleSheet', { ok: false, execMs: 0, errorType: 'create_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create spreadsheet',
        spreadsheet: null
      }
    }
  },
})

// Read data from a Google Spreadsheet
export const readGoogleSheetTool = tool({
  description: 'Read data from a Google Spreadsheet, specific range, or entire sheet',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to read from'),
    range: z.string().optional().describe('The range to read (e.g., "Sheet1!A1:C10" or "Sheet1"). If not specified, reads the entire first sheet'),
    includeMetadata: z.boolean().optional().describe('Whether to include spreadsheet metadata (default: false)')
  }),
  execute: async ({ spreadsheetId, range: inputRange, includeMetadata = false }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    let range = inputRange
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        data: null
      }
    }

    console.log('📊 [Google Sheets] Reading spreadsheet:', { spreadsheetId, range })

    try {
      // Get spreadsheet info if no range specified or metadata requested
      let spreadsheetInfo = null
      if (!range || includeMetadata) {
        const infoResult = await makeGoogleSheetsRequest(userId, `/spreadsheets/${spreadsheetId}`)
        if (infoResult.success) {
          spreadsheetInfo = infoResult.data
          // If no range specified, use the first sheet
          if (!range && spreadsheetInfo.sheets && spreadsheetInfo.sheets.length > 0) {
            range = spreadsheetInfo.sheets[0].properties.title
          }
        }
      }

      // Default to Sheet1 if still no range
      if (!range) {
        range = 'Sheet1'
      }

      // Get the values
      const valuesResult = await makeGoogleSheetsRequest(
        userId, 
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
      )

      if (!valuesResult.success) {
        return {
          success: false,
          message: valuesResult.error || 'Failed to read spreadsheet data',
          data: null
        }
      }

      const values = valuesResult.data.values || []
      
      // Track usage
      await trackToolUsage(userId, 'readGoogleSheet', { ok: true, execMs: Date.now() - started, params: { spreadsheetId, range } })

      const result = {
        success: true,
        message: `Successfully read ${values.length} rows from spreadsheet`,
        data: {
          spreadsheetId,
          range: valuesResult.data.range,
          values,
          rowCount: values.length,
          columnCount: values.length > 0 ? Math.max(...values.map((row: any[]) => row.length)) : 0,
          webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          metadata: includeMetadata ? {
            title: spreadsheetInfo?.properties?.title || 'Unknown',
            sheets: spreadsheetInfo?.sheets?.map((sheet: any) => ({
              title: sheet.properties.title,
              sheetId: sheet.properties.sheetId,
              gridProperties: sheet.properties.gridProperties
            })) || []
          } : null
        }
      }

      console.log('✅ [Google Sheets] Spreadsheet read:', { 
        spreadsheetId, 
        range: result.data.range,
        rowCount: result.data.rowCount 
      })
      return result

    } catch (error) {
      console.error('❌ [Google Sheets] Read error:', error)
      await trackToolUsage(userId || 'unknown', 'readGoogleSheet', { ok: false, execMs: 0, errorType: 'read_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read spreadsheet',
        data: null
      }
    }
  },
})

// Update data in a Google Spreadsheet
export const updateGoogleSheetTool = tool({
  description: 'Update data in a Google Spreadsheet by writing to specific cells or ranges',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to update'),
    range: z.string().describe('The range to update (e.g., "Sheet1!A1:C3")'),
    values: z.array(z.array(z.string())).describe('The data to write as array of rows, each row is an array of cell values'),
    inputOption: z.enum(['RAW', 'USER_ENTERED']).optional().describe('How input data should be interpreted (RAW for literal values, USER_ENTERED for formulas and formatted text)')
  }),
  execute: async ({ spreadsheetId, range, values, inputOption = 'USER_ENTERED' }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        result: null
      }
    }

    console.log('📊 [Google Sheets] Updating spreadsheet:', { spreadsheetId, range, rowCount: values.length })

    try {
      const updateResult = await makeGoogleSheetsRequest(
        userId, 
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${inputOption}`, 
        'PUT',
        {
          values: values
        }
      )

      if (!updateResult.success) {
        return {
          success: false,
          message: updateResult.error || 'Failed to update spreadsheet',
          result: null
        }
      }

      // Track usage
      await trackToolUsage(userId, 'updateGoogleSheet', { ok: true, execMs: Date.now() - started, params: { spreadsheetId, range, rowCount: values.length } })

      const result = {
        success: true,
        message: `Successfully updated ${values.length} rows in spreadsheet`,
        result: {
          spreadsheetId,
          updatedRange: updateResult.data.updatedRange,
          updatedRows: updateResult.data.updatedRows,
          updatedColumns: updateResult.data.updatedColumns,
          updatedCells: updateResult.data.updatedCells,
          webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          inputOption
        }
      }

      console.log('✅ [Google Sheets] Spreadsheet updated:', result)
      return result

    } catch (error) {
      console.error('❌ [Google Sheets] Update error:', error)
      await trackToolUsage(userId || 'unknown', 'updateGoogleSheet', { ok: false, execMs: 0, errorType: 'update_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update spreadsheet',
        result: null
      }
    }
  },
})

// Add data to the end of a Google Spreadsheet
export const appendGoogleSheetTool = tool({
  description: 'Append data to the end of a Google Spreadsheet (adds new rows)',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet to append to'),
    range: z.string().describe('The range/sheet to append to (e.g., "Sheet1" or "Sheet1!A:A")'),
    values: z.array(z.array(z.string())).describe('The data to append as array of rows, each row is an array of cell values'),
    inputOption: z.enum(['RAW', 'USER_ENTERED']).optional().describe('How input data should be interpreted (RAW for literal values, USER_ENTERED for formulas and formatted text)')
  }),
  execute: async ({ spreadsheetId, range, values, inputOption = 'USER_ENTERED' }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        result: null
      }
    }

    console.log('📊 [Google Sheets] Appending to spreadsheet:', { spreadsheetId, range, rowCount: values.length })

    try {
      const appendResult = await makeGoogleSheetsRequest(
        userId, 
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${inputOption}`, 
        'POST',
        {
          values: values
        }
      )

      if (!appendResult.success) {
        return {
          success: false,
          message: appendResult.error || 'Failed to append to spreadsheet',
          result: null
        }
      }

      // Track usage
      await trackToolUsage(userId, 'appendGoogleSheet', { ok: true, execMs: Date.now() - started, params: { spreadsheetId, range, rowCount: values.length } })

      const result = {
        success: true,
        message: `Successfully appended ${values.length} rows to spreadsheet`,
        result: {
          spreadsheetId,
          updatedRange: appendResult.data.updates?.updatedRange,
          updatedRows: appendResult.data.updates?.updatedRows,
          updatedColumns: appendResult.data.updates?.updatedColumns,
          updatedCells: appendResult.data.updates?.updatedCells,
          webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          inputOption
        }
      }

      console.log('✅ [Google Sheets] Data appended:', result)
      return result

    } catch (error) {
      console.error('❌ [Google Sheets] Append error:', error)
      await trackToolUsage(userId || 'unknown', 'appendGoogleSheet', { ok: false, execMs: 0, errorType: 'append_error' })
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to append to spreadsheet',
        result: null
      }
    }
  },
})
