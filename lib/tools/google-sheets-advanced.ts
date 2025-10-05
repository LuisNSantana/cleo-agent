/**
 * Advanced Google Sheets Tools
 * 
 * Provides powerful functionality for creating production-ready spreadsheets:
 * - Multiple sheets/tabs
 * - Charts and graphs (pie, bar, line, etc.)
 * - Conditional formatting
 * - Cell formatting (colors, borders, fonts)
 * - Named ranges
 * - Data validation
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

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
      .eq('service_id', 'google-workspace')
      .eq('connected', true)
      .single()

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
        .eq('service_id', 'google-workspace')

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

async function batchUpdateSpreadsheet(
  userId: string,
  spreadsheetId: string,
  requests: any[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  const accessToken = await getGoogleSheetsAccessToken(userId)
  
  if (!accessToken) {
    return { success: false, error: 'No valid Google Sheets access token available' }
  }

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Google Sheets batchUpdate error (${response.status}):`, errorText)
      return { success: false, error: `API error: ${response.status} ${errorText}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error in batchUpdate:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Add a new sheet/tab to an existing spreadsheet
export const addGoogleSheetTabTool = tool({
  description: 'Add a new sheet/tab to an existing Google Spreadsheet. Essential for multi-sheet documents like dashboards with separate data/charts tabs.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetTitle: z.string().describe('The title for the new sheet/tab'),
    index: z.number().optional().describe('Position index for the new sheet (0-based, default: append to end)'),
    rowCount: z.number().optional().describe('Initial number of rows (default: 1000)'),
    columnCount: z.number().optional().describe('Initial number of columns (default: 26)'),
    hidden: z.boolean().optional().describe('Whether to hide the sheet (default: false)'),
    tabColor: z.object({
      red: z.number().min(0).max(1).optional(),
      green: z.number().min(0).max(1).optional(),
      blue: z.number().min(0).max(1).optional()
    }).optional().describe('Tab color in RGB format (0-1 range)')
  }),
  execute: async ({ spreadsheetId, sheetTitle, index, rowCount = 1000, columnCount = 26, hidden = false, tabColor }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Adding new sheet:', { spreadsheetId, sheetTitle })

    try {
      const request: any = {
        addSheet: {
          properties: {
            title: sheetTitle,
            gridProperties: {
              rowCount,
              columnCount
            },
            hidden,
            ...(index !== undefined && { index }),
            ...(tabColor && { tabColor })
          }
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, [request])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to add sheet' }
      }

      await trackToolUsage(userId, 'addGoogleSheetTab', { ok: true, execMs: Date.now() - started })

      const addedSheet = result.data?.replies?.[0]?.addSheet
      
      return {
        success: true,
        message: `Sheet "${sheetTitle}" added successfully`,
        sheet: {
          sheetId: addedSheet?.properties?.sheetId,
          title: addedSheet?.properties?.title,
          index: addedSheet?.properties?.index,
          webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${addedSheet?.properties?.sheetId}`
        }
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Add sheet error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add sheet'
      }
    }
  }
})

// Create a chart in Google Sheets
export const createGoogleSheetChartTool = tool({
  description: 'Create a chart/graph in Google Sheets. Supports pie, bar, column, line charts. Perfect for dashboards and data visualization.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The sheet ID where the chart will be placed (use 0 for first sheet, or get from sheet metadata)'),
    chartType: z.enum(['PIE', 'BAR', 'COLUMN', 'LINE', 'AREA', 'SCATTER']).describe('Type of chart to create'),
    dataRange: z.object({
      sheetId: z.number().describe('Sheet ID containing the data'),
      startRow: z.number().describe('Start row (0-indexed)'),
      endRow: z.number().describe('End row (exclusive)'),
      startColumn: z.number().describe('Start column (0-indexed, A=0, B=1, etc.)'),
      endColumn: z.number().describe('End column (exclusive)')
    }).describe('Range of data for the chart'),
    title: z.string().optional().describe('Chart title'),
    position: z.object({
      anchorRow: z.number().describe('Row to anchor the chart (0-indexed)'),
      anchorColumn: z.number().describe('Column to anchor the chart (0-indexed)'),
      offsetX: z.number().optional().describe('Horizontal offset in pixels'),
      offsetY: z.number().optional().describe('Vertical offset in pixels')
    }).optional().describe('Chart position on the sheet'),
    legendPosition: z.enum(['BOTTOM', 'TOP', 'LEFT', 'RIGHT', 'NO_LEGEND']).optional().describe('Legend position (default: BOTTOM)')
  }),
  execute: async ({ spreadsheetId, sheetId, chartType, dataRange, title, position, legendPosition = 'BOTTOM' }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Creating chart:', { spreadsheetId, sheetId, chartType })

    try {
      const request = {
        addChart: {
          chart: {
            spec: {
              title: title || `${chartType} Chart`,
              [chartType === 'PIE' ? 'pieChart' : 
               chartType === 'BAR' ? 'basicChart' :
               chartType === 'COLUMN' ? 'basicChart' :
               chartType === 'LINE' ? 'basicChart' :
               chartType === 'AREA' ? 'basicChart' :
               'basicChart']: {
                ...(chartType !== 'PIE' && {
                  chartType,
                  legendPosition,
                  axis: [
                    { position: 'BOTTOM_AXIS' },
                    { position: 'LEFT_AXIS' }
                  ],
                  domains: [{
                    domain: {
                      sourceRange: {
                        sources: [{
                          sheetId: dataRange.sheetId,
                          startRowIndex: dataRange.startRow,
                          endRowIndex: dataRange.endRow,
                          startColumnIndex: dataRange.startColumn,
                          endColumnIndex: dataRange.startColumn + 1
                        }]
                      }
                    }
                  }],
                  series: [{
                    series: {
                      sourceRange: {
                        sources: [{
                          sheetId: dataRange.sheetId,
                          startRowIndex: dataRange.startRow,
                          endRowIndex: dataRange.endRow,
                          startColumnIndex: dataRange.startColumn + 1,
                          endColumnIndex: dataRange.endColumn
                        }]
                      }
                    }
                  }]
                }),
                ...(chartType === 'PIE' && {
                  legendPosition,
                  domain: {
                    sourceRange: {
                      sources: [{
                        sheetId: dataRange.sheetId,
                        startRowIndex: dataRange.startRow,
                        endRowIndex: dataRange.endRow,
                        startColumnIndex: dataRange.startColumn,
                        endColumnIndex: dataRange.startColumn + 1
                      }]
                    }
                  },
                  series: {
                    sourceRange: {
                      sources: [{
                        sheetId: dataRange.sheetId,
                        startRowIndex: dataRange.startRow,
                        endRowIndex: dataRange.endRow,
                        startColumnIndex: dataRange.startColumn + 1,
                        endColumnIndex: dataRange.endColumn
                      }]
                    }
                  }
                })
              }
            },
            position: position ? {
              overlayPosition: {
                anchorCell: {
                  sheetId,
                  rowIndex: position.anchorRow,
                  columnIndex: position.anchorColumn
                },
                ...(position.offsetX !== undefined && { offsetXPixels: position.offsetX }),
                ...(position.offsetY !== undefined && { offsetYPixels: position.offsetY })
              }
            } : {
              overlayPosition: {
                anchorCell: {
                  sheetId,
                  rowIndex: 1,
                  columnIndex: 5
                }
              }
            }
          }
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, [request])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to create chart' }
      }

      await trackToolUsage(userId, 'createGoogleSheetChart', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `${chartType} chart created successfully`,
        chart: {
          chartId: result.data?.replies?.[0]?.addChart?.chart?.chartId,
          webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        }
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Create chart error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create chart'
      }
    }
  }
})

// Format cells in Google Sheets
export const formatGoogleSheetCellsTool = tool({
  description: 'Apply formatting to cells in Google Sheets: background color, text color, bold/italic, borders, alignment, number format. Essential for creating professional, readable spreadsheets.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The sheet ID to format'),
    range: z.object({
      startRow: z.number().describe('Start row (0-indexed)'),
      endRow: z.number().describe('End row (exclusive)'),
      startColumn: z.number().describe('Start column (0-indexed, A=0, B=1, etc.)'),
      endColumn: z.number().describe('End column (exclusive)')
    }).describe('Range of cells to format'),
    formatting: z.object({
      backgroundColor: z.object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      }).optional().describe('Background color in RGB (0-1)'),
      textColor: z.object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      }).optional().describe('Text color in RGB (0-1)'),
      bold: z.boolean().optional().describe('Make text bold'),
      italic: z.boolean().optional().describe('Make text italic'),
      fontSize: z.number().optional().describe('Font size in points'),
      horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional().describe('Horizontal alignment'),
      verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional().describe('Vertical alignment'),
      numberFormat: z.object({
        type: z.enum(['NUMBER', 'CURRENCY', 'PERCENT', 'DATE', 'TIME']).describe('Number format type'),
        pattern: z.string().optional().describe('Custom format pattern (e.g., "$#,##0.00" for currency)')
      }).optional().describe('Number formatting'),
      borders: z.object({
        top: z.boolean().optional(),
        bottom: z.boolean().optional(),
        left: z.boolean().optional(),
        right: z.boolean().optional(),
        style: z.enum(['SOLID', 'DOTTED', 'DASHED']).optional(),
        color: z.object({
          red: z.number().min(0).max(1).optional(),
          green: z.number().min(0).max(1).optional(),
          blue: z.number().min(0).max(1).optional()
        }).optional()
      }).optional().describe('Border configuration')
    }).describe('Formatting options to apply')
  }),
  execute: async ({ spreadsheetId, sheetId, range, formatting }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Formatting cells:', { spreadsheetId, sheetId, range })

    try {
      const requests: any[] = []

      // Build cell format
      const cellFormat: any = {}
      
      if (formatting.backgroundColor) {
        cellFormat.backgroundColor = formatting.backgroundColor
      }
      
      if (formatting.textColor || formatting.bold || formatting.italic || formatting.fontSize) {
        cellFormat.textFormat = {
          ...(formatting.textColor && { foregroundColor: formatting.textColor }),
          ...(formatting.bold !== undefined && { bold: formatting.bold }),
          ...(formatting.italic !== undefined && { italic: formatting.italic }),
          ...(formatting.fontSize && { fontSize: formatting.fontSize })
        }
      }
      
      if (formatting.horizontalAlignment) {
        cellFormat.horizontalAlignment = formatting.horizontalAlignment
      }
      
      if (formatting.verticalAlignment) {
        cellFormat.verticalAlignment = formatting.verticalAlignment
      }
      
      if (formatting.numberFormat) {
        cellFormat.numberFormat = {
          type: formatting.numberFormat.type,
          ...(formatting.numberFormat.pattern && { pattern: formatting.numberFormat.pattern })
        }
      }

      // Add repeat cell request for formatting
      if (Object.keys(cellFormat).length > 0) {
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: range.startRow,
              endRowIndex: range.endRow,
              startColumnIndex: range.startColumn,
              endColumnIndex: range.endColumn
            },
            cell: {
              userEnteredFormat: cellFormat
            },
            fields: 'userEnteredFormat(' + 
              Object.keys(cellFormat).map(k => k).join(',') + ')'
          }
        })
      }

      // Add borders if specified
      if (formatting.borders) {
        const borderStyle = {
          style: formatting.borders.style || 'SOLID',
          ...(formatting.borders.color && { color: formatting.borders.color })
        }

        if (formatting.borders.top) {
          requests.push({
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: range.startRow,
                endRowIndex: range.startRow + 1,
                startColumnIndex: range.startColumn,
                endColumnIndex: range.endColumn
              },
              top: borderStyle
            }
          })
        }

        if (formatting.borders.bottom) {
          requests.push({
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: range.endRow - 1,
                endRowIndex: range.endRow,
                startColumnIndex: range.startColumn,
                endColumnIndex: range.endColumn
              },
              bottom: borderStyle
            }
          })
        }

        if (formatting.borders.left) {
          requests.push({
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: range.startRow,
                endRowIndex: range.endRow,
                startColumnIndex: range.startColumn,
                endColumnIndex: range.startColumn + 1
              },
              left: borderStyle
            }
          })
        }

        if (formatting.borders.right) {
          requests.push({
            updateBorders: {
              range: {
                sheetId,
                startRowIndex: range.startRow,
                endRowIndex: range.endRow,
                startColumnIndex: range.endColumn - 1,
                endColumnIndex: range.endColumn
              },
              right: borderStyle
            }
          })
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, requests)

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to format cells' }
      }

      await trackToolUsage(userId, 'formatGoogleSheetCells', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Cells formatted successfully',
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Format cells error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to format cells'
      }
    }
  }
})

// Apply conditional formatting
export const applyConditionalFormattingTool = tool({
  description: 'Apply conditional formatting rules to Google Sheets cells. Automatically highlight cells based on their values (e.g., red if >80%, green if positive). Perfect for dashboards and alerts.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The sheet ID'),
    range: z.object({
      startRow: z.number().describe('Start row (0-indexed)'),
      endRow: z.number().describe('End row (exclusive)'),
      startColumn: z.number().describe('Start column (0-indexed)'),
      endColumn: z.number().describe('End column (exclusive)')
    }).describe('Range to apply conditional formatting'),
    condition: z.object({
      type: z.enum([
        'NUMBER_GREATER', 
        'NUMBER_GREATER_THAN_EQ', 
        'NUMBER_LESS', 
        'NUMBER_LESS_THAN_EQ',
        'NUMBER_EQ',
        'NUMBER_NOT_EQ',
        'TEXT_CONTAINS',
        'TEXT_NOT_CONTAINS',
        'TEXT_STARTS_WITH',
        'TEXT_ENDS_WITH',
        'CUSTOM_FORMULA'
      ]).describe('Type of condition'),
      value: z.union([z.string(), z.number()]).optional().describe('Value to compare against (for NUMBER_*/TEXT_* types)'),
      formula: z.string().optional().describe('Custom formula (for CUSTOM_FORMULA type, e.g., "=A1>0.8")')
    }).describe('Condition that triggers the formatting'),
    format: z.object({
      backgroundColor: z.object({
        red: z.number().min(0).max(1),
        green: z.number().min(0).max(1),
        blue: z.number().min(0).max(1)
      }).optional().describe('Background color when condition is true'),
      textColor: z.object({
        red: z.number().min(0).max(1),
        green: z.number().min(0).max(1),
        blue: z.number().min(0).max(1)
      }).optional().describe('Text color when condition is true'),
      bold: z.boolean().optional().describe('Make text bold when condition is true')
    }).describe('Formatting to apply when condition is true')
  }),
  execute: async ({ spreadsheetId, sheetId, range, condition, format }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Applying conditional formatting:', { spreadsheetId, sheetId })

    try {
      // Build condition
      let booleanCondition: any = {}

      if (condition.type === 'CUSTOM_FORMULA') {
        booleanCondition = {
          type: 'CUSTOM_FORMULA',
          values: [{ userEnteredValue: condition.formula }]
        }
      } else {
        booleanCondition = {
          type: condition.type,
          values: [{ userEnteredValue: String(condition.value) }]
        }
      }

      // Build format
      const cellFormat: any = {}
      if (format.backgroundColor) {
        cellFormat.backgroundColor = format.backgroundColor
      }
      if (format.textColor || format.bold) {
        cellFormat.textFormat = {
          ...(format.textColor && { foregroundColor: format.textColor }),
          ...(format.bold !== undefined && { bold: format.bold })
        }
      }

      const request = {
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId,
              startRowIndex: range.startRow,
              endRowIndex: range.endRow,
              startColumnIndex: range.startColumn,
              endColumnIndex: range.endColumn
            }],
            booleanRule: {
              condition: booleanCondition,
              format: cellFormat
            }
          },
          index: 0
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, [request])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to apply conditional formatting' }
      }

      await trackToolUsage(userId, 'applyConditionalFormatting', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Conditional formatting applied successfully',
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Conditional formatting error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to apply conditional formatting'
      }
    }
  }
})
