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

// Insert advanced formulas helper
export const insertGoogleSheetFormulasTool = tool({
  description: 'Insert advanced formulas into Google Sheets cells. Supports SUM, AVERAGE, VLOOKUP, PIVOT tables, INDEX/MATCH, and custom formulas. Essential for creating functional, calculating spreadsheets.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The sheet ID'),
    formulas: z.array(z.object({
      cell: z.object({
        row: z.number().describe('Row index (0-indexed)'),
        column: z.number().describe('Column index (0-indexed, A=0, B=1, etc.)')
      }).describe('Target cell for the formula'),
      formula: z.string().describe('Formula to insert (e.g., "=SUM(A1:A10)", "=VLOOKUP(B2,Data!A:B,2,FALSE)")'),
      type: z.enum(['SUM', 'AVERAGE', 'VLOOKUP', 'INDEX_MATCH', 'COUNT', 'IF', 'PIVOT', 'CUSTOM']).optional().describe('Type of formula for categorization')
    })).describe('Array of formulas to insert'),
    autoResize: z.boolean().optional().describe('Auto-resize columns to fit content (default: true)')
  }),
  execute: async ({ spreadsheetId, sheetId, formulas, autoResize = true }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Inserting formulas:', { spreadsheetId, sheetId, count: formulas.length })

    try {
      const requests: any[] = []

      // Insert formulas
      for (const { cell, formula } of formulas) {
        requests.push({
          updateCells: {
            range: {
              sheetId,
              startRowIndex: cell.row,
              endRowIndex: cell.row + 1,
              startColumnIndex: cell.column,
              endColumnIndex: cell.column + 1
            },
            rows: [{
              values: [{
                userEnteredValue: { formulaValue: formula }
              }]
            }],
            fields: 'userEnteredValue'
          }
        })
      }

      // Auto-resize columns if requested
      if (autoResize) {
        requests.push({
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 50 // Resize first 50 columns
            }
          }
        })
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, requests)

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to insert formulas' }
      }

      await trackToolUsage(userId, 'insertGoogleSheetFormulas', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `${formulas.length} formulas inserted successfully`,
        insertedFormulas: formulas.map(f => ({
          cell: `${String.fromCharCode(65 + f.cell.column)}${f.cell.row + 1}`,
          formula: f.formula,
          type: f.type
        })),
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Insert formulas error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to insert formulas'
      }
    }
  }
})

// Data validation helper (dropdowns, ranges, etc.)
export const addDataValidationTool = tool({
  description: 'Add data validation to Google Sheets cells. Create dropdowns, number ranges, date ranges, custom validation. Perfect for forms, input controls, and data quality.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The sheet ID'),
    range: z.object({
      startRow: z.number().describe('Start row (0-indexed)'),
      endRow: z.number().describe('End row (exclusive)'),
      startColumn: z.number().describe('Start column (0-indexed)'),
      endColumn: z.number().describe('End column (exclusive)')
    }).describe('Range to apply validation'),
    validation: z.object({
      type: z.enum([
        'ONE_OF_LIST',      // Dropdown from list
        'ONE_OF_RANGE',     // Dropdown from range
        'NUMBER_BETWEEN',   // Number in range
        'NUMBER_GREATER',   // Number greater than
        'NUMBER_LESS',      // Number less than
        'DATE_BETWEEN',     // Date in range
        'TEXT_LENGTH',      // Text length validation
        'CHECKBOX',         // Checkbox
        'CUSTOM_FORMULA'    // Custom validation formula
      ]).describe('Type of validation'),
      values: z.array(z.string()).optional().describe('List values for ONE_OF_LIST type'),
      sourceRange: z.string().optional().describe('Range reference for ONE_OF_RANGE (e.g., "Sheet1!A1:A10")'),
      minValue: z.union([z.number(), z.string()]).optional().describe('Minimum value/date'),
      maxValue: z.union([z.number(), z.string()]).optional().describe('Maximum value/date'),
      formula: z.string().optional().describe('Custom validation formula'),
      strict: z.boolean().optional().describe('Reject invalid input (default: true)'),
      showDropdown: z.boolean().optional().describe('Show dropdown arrow (default: true)')
    }).describe('Validation configuration'),
    inputMessage: z.string().optional().describe('Help text shown when cell is selected'),
    invalidMessage: z.string().optional().describe('Error message for invalid input')
  }),
  execute: async ({ spreadsheetId, sheetId, range, validation, inputMessage, invalidMessage }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Adding data validation:', { spreadsheetId, sheetId, type: validation.type })

    try {
      // Build validation rule
      let condition: any = {}

      switch (validation.type) {
        case 'ONE_OF_LIST':
          condition = {
            type: 'ONE_OF_LIST',
            values: validation.values?.map(v => ({ userEnteredValue: v })) || []
          }
          break
        case 'ONE_OF_RANGE':
          condition = {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: validation.sourceRange }]
          }
          break
        case 'NUMBER_BETWEEN':
          condition = {
            type: 'NUMBER_BETWEEN',
            values: [
              { userEnteredValue: String(validation.minValue) },
              { userEnteredValue: String(validation.maxValue) }
            ]
          }
          break
        case 'NUMBER_GREATER':
          condition = {
            type: 'NUMBER_GREATER',
            values: [{ userEnteredValue: String(validation.minValue) }]
          }
          break
        case 'NUMBER_LESS':
          condition = {
            type: 'NUMBER_LESS',
            values: [{ userEnteredValue: String(validation.maxValue) }]
          }
          break
        case 'DATE_BETWEEN':
          condition = {
            type: 'DATE_BETWEEN',
            values: [
              { userEnteredValue: String(validation.minValue) },
              { userEnteredValue: String(validation.maxValue) }
            ]
          }
          break
        case 'TEXT_LENGTH':
          condition = {
            type: 'TEXT_LENGTH',
            values: [
              { userEnteredValue: String(validation.minValue || 0) },
              { userEnteredValue: String(validation.maxValue || 255) }
            ]
          }
          break
        case 'CHECKBOX':
          condition = {
            type: 'BOOLEAN'
          }
          break
        case 'CUSTOM_FORMULA':
          condition = {
            type: 'CUSTOM_FORMULA',
            values: [{ userEnteredValue: validation.formula }]
          }
          break
      }

      const request = {
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: range.startRow,
            endRowIndex: range.endRow,
            startColumnIndex: range.startColumn,
            endColumnIndex: range.endColumn
          },
          rule: {
            condition,
            strict: validation.strict !== false,
            showCustomUi: validation.showDropdown !== false,
            ...(inputMessage && { inputMessage }),
            ...(invalidMessage && { errorMessage: invalidMessage })
          }
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, [request])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to add data validation' }
      }

      await trackToolUsage(userId, 'addDataValidation', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `Data validation (${validation.type}) applied successfully`,
        validation: {
          type: validation.type,
          range: `${String.fromCharCode(65 + range.startColumn)}${range.startRow + 1}:${String.fromCharCode(65 + range.endColumn - 1)}${range.endRow}`,
          strict: validation.strict !== false
        },
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Data validation error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add data validation'
      }
    }
  }
})

// Named ranges helper
export const createNamedRangeTool = tool({
  description: 'Create named ranges in Google Sheets for easier formula references. Instead of "A1:C10", use "SalesData". Essential for complex spreadsheets and maintainable formulas.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    name: z.string().describe('Name for the range (e.g., "SalesData", "ProductList")'),
    range: z.object({
      sheetId: z.number().describe('Sheet ID containing the range'),
      startRow: z.number().describe('Start row (0-indexed)'),
      endRow: z.number().describe('End row (exclusive)'),
      startColumn: z.number().describe('Start column (0-indexed)'),
      endColumn: z.number().describe('End column (exclusive)')
    }).describe('Range to name')
  }),
  execute: async ({ spreadsheetId, name, range }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Creating named range:', { spreadsheetId, name })

    try {
      const request = {
        addNamedRange: {
          namedRange: {
            name,
            range: {
              sheetId: range.sheetId,
              startRowIndex: range.startRow,
              endRowIndex: range.endRow,
              startColumnIndex: range.startColumn,
              endColumnIndex: range.endColumn
            }
          }
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, [request])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to create named range' }
      }

      await trackToolUsage(userId, 'createNamedRange', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `Named range "${name}" created successfully`,
        namedRange: {
          name,
          range: `${String.fromCharCode(65 + range.startColumn)}${range.startRow + 1}:${String.fromCharCode(65 + range.endColumn - 1)}${range.endRow}`,
          usage: `Use "${name}" in formulas instead of cell references`
        },
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Named range error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create named range'
      }
    }
  }
})

// Sheet protection helper
export const protectSheetRangeTool = tool({
  description: 'Protect cells or entire sheets in Google Sheets to prevent unwanted edits. Perfect for templates, formulas, and collaborative documents where certain areas should be read-only.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    protection: z.object({
      type: z.enum(['SHEET', 'RANGE']).describe('Protect entire sheet or specific range'),
      sheetId: z.number().describe('Sheet ID to protect'),
      range: z.object({
        startRow: z.number().describe('Start row (0-indexed)'),
        endRow: z.number().describe('End row (exclusive)'),
        startColumn: z.number().describe('Start column (0-indexed)'),
        endColumn: z.number().describe('End column (exclusive)')
      }).optional().describe('Range to protect (required for RANGE type)'),
      description: z.string().optional().describe('Description of the protection'),
      warningOnly: z.boolean().optional().describe('Show warning instead of blocking edits (default: false)'),
      editors: z.array(z.string()).optional().describe('Email addresses of users who can edit (empty = only you)')
    }).describe('Protection configuration')
  }),
  execute: async ({ spreadsheetId, protection }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Protecting range/sheet:', { spreadsheetId, type: protection.type })

    try {
      const protectedRange: any = {
        description: protection.description || `Protected ${protection.type.toLowerCase()}`,
        warningOnly: protection.warningOnly || false
      }

      if (protection.type === 'SHEET') {
        protectedRange.protectedSheetProperties = {
          sheetId: protection.sheetId
        }
      } else {
        protectedRange.range = {
          sheetId: protection.sheetId,
          startRowIndex: protection.range!.startRow,
          endRowIndex: protection.range!.endRow,
          startColumnIndex: protection.range!.startColumn,
          endColumnIndex: protection.range!.endColumn
        }
      }

      // Add editors if specified
      if (protection.editors && protection.editors.length > 0) {
        protectedRange.editors = {
          users: protection.editors
        }
      }

      const request = {
        addProtectedRange: {
          protectedRange
        }
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, [request])

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to protect range/sheet' }
      }

      await trackToolUsage(userId, 'protectSheetRange', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `${protection.type} protected successfully`,
        protection: {
          type: protection.type,
          sheetId: protection.sheetId,
          range: protection.range ? `${String.fromCharCode(65 + protection.range.startColumn)}${protection.range.startRow + 1}:${String.fromCharCode(65 + protection.range.endColumn - 1)}${protection.range.endRow}` : 'Entire sheet',
          warningOnly: protection.warningOnly || false,
          editors: protection.editors?.length || 0
        },
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Protection error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to protect range/sheet'
      }
    }
  }
})

// Auto filter and sorting helper
export const addAutoFilterTool = tool({
  description: 'Add auto-filter to Google Sheets ranges for easy sorting and filtering. Creates dropdown arrows on header row for interactive data exploration. Essential for data analysis.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The sheet ID'),
    range: z.object({
      startRow: z.number().describe('Start row (0-indexed, usually 0 for headers)'),
      endRow: z.number().describe('End row (exclusive)'),
      startColumn: z.number().describe('Start column (0-indexed)'),
      endColumn: z.number().describe('End column (exclusive)')
    }).describe('Range to apply auto-filter'),
    sortOrder: z.object({
      columnIndex: z.number().describe('Column to sort by (0-indexed)'),
      sortOrder: z.enum(['ASCENDING', 'DESCENDING']).describe('Sort direction')
    }).optional().describe('Initial sort order (optional)')
  }),
  execute: async ({ spreadsheetId, sheetId, range, sortOrder }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Adding auto-filter:', { spreadsheetId, sheetId })

    try {
      const requests: any[] = []

      // Add auto filter
      requests.push({
        setBasicFilter: {
          filter: {
            range: {
              sheetId,
              startRowIndex: range.startRow,
              endRowIndex: range.endRow,
              startColumnIndex: range.startColumn,
              endColumnIndex: range.endColumn
            },
            ...(sortOrder && {
              sortSpecs: [{
                dimensionIndex: sortOrder.columnIndex,
                sortOrder: sortOrder.sortOrder
              }]
            })
          }
        }
      })

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, requests)

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to add auto-filter' }
      }

      await trackToolUsage(userId, 'addAutoFilter', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Auto-filter added successfully',
        filter: {
          range: `${String.fromCharCode(65 + range.startColumn)}${range.startRow + 1}:${String.fromCharCode(65 + range.endColumn - 1)}${range.endRow}`,
          sortedBy: sortOrder ? `Column ${String.fromCharCode(65 + sortOrder.columnIndex)} (${sortOrder.sortOrder})` : 'None',
          instructions: 'Click dropdown arrows in header row to sort and filter data'
        },
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Auto-filter error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add auto-filter'
      }
    }
  }
})

// Professional templates helper
export const createProfessionalTemplateTool = tool({
  description: 'Create professional Google Sheets templates with predefined layouts, formatting, and formulas. Choose from dashboard, financial report, project tracker, and more.',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    template: z.enum([
      'FINANCIAL_DASHBOARD',
      'PROJECT_TRACKER', 
      'SALES_REPORT',
      'BUDGET_PLANNER',
      'EMPLOYEE_TRACKER',
      'INVENTORY_MANAGEMENT',
      'EXPENSE_REPORT',
      'KPI_DASHBOARD'
    ]).describe('Template type to create'),
    sheetName: z.string().optional().describe('Name for the new sheet (default: template name)'),
    customization: z.object({
      companyName: z.string().optional().describe('Company name for headers'),
      dateRange: z.object({
        start: z.string().optional().describe('Start date (YYYY-MM-DD)'),
        end: z.string().optional().describe('End date (YYYY-MM-DD)')
      }).optional().describe('Date range for the template'),
      columns: z.array(z.string()).optional().describe('Custom column names (overrides default)')
    }).optional().describe('Template customization options')
  }),
  execute: async ({ spreadsheetId, template, sheetName, customization = {} }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    console.log('📊 [Advanced Sheets] Creating professional template:', { spreadsheetId, template })

    try {
      const requests: any[] = []
      const templateName = sheetName || template.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      
      // First, add a new sheet for the template
      const addSheetRequest = {
        addSheet: {
          properties: {
            title: templateName,
            gridProperties: {
              rowCount: 100,
              columnCount: 20
            },
            tabColor: { red: 0.2, green: 0.6, blue: 0.9 }
          }
        }
      }
      
      requests.push(addSheetRequest)

      // Apply initial template structure based on type
      const templateData = getTemplateData(template, customization)
      
      // Add header row with formatting
      requests.push({
        updateCells: {
          range: {
            sheetId: 0, // Will be updated after sheet creation
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: templateData.headers.length
          },
          rows: [{
            values: templateData.headers.map((header: string) => ({
              userEnteredValue: { stringValue: header },
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.6, blue: 0.9 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                horizontalAlignment: 'CENTER'
              }
            }))
          }],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      })

      // Add sample data if provided
      if (templateData.sampleData && templateData.sampleData.length > 0) {
        requests.push({
          updateCells: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              endRowIndex: 1 + templateData.sampleData.length,
              startColumnIndex: 0,
              endColumnIndex: templateData.headers.length
            },
            rows: templateData.sampleData.map(row => ({
              values: row.map(cell => ({
                userEnteredValue: typeof cell === 'number' ? { numberValue: cell } : { stringValue: String(cell) }
              }))
            })),
            fields: 'userEnteredValue'
          }
        })
      }

      // Add formulas if provided
      if (templateData.formulas && templateData.formulas.length > 0) {
        templateData.formulas.forEach(({ cell, formula }) => {
          requests.push({
            updateCells: {
              range: {
                sheetId: 0,
                startRowIndex: cell.row,
                endRowIndex: cell.row + 1,
                startColumnIndex: cell.column,
                endColumnIndex: cell.column + 1
              },
              rows: [{
                values: [{
                  userEnteredValue: { formulaValue: formula },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 1 },
                    textFormat: { bold: true }
                  }
                }]
              }],
              fields: 'userEnteredValue,userEnteredFormat'
            }
          })
        })
      }

      const result = await batchUpdateSpreadsheet(userId, spreadsheetId, requests)

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to create template' }
      }

      await trackToolUsage(userId, 'createProfessionalTemplate', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `${template} template created successfully`,
        template: {
          name: templateName,
          type: template,
          features: templateData.features,
          headerCount: templateData.headers.length,
          sampleRows: templateData.sampleData?.length || 0,
          formulas: templateData.formulas?.length || 0
        },
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      }
    } catch (error) {
      console.error('❌ [Advanced Sheets] Template creation error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create template'
      }
    }
  }
})

// Helper function to get template data based on type
function getTemplateData(template: string, customization: any) {
  const companyName = customization.companyName || 'Your Company'
  const currentDate = new Date().toISOString().split('T')[0]
  
  switch (template) {
    case 'FINANCIAL_DASHBOARD':
      return {
        headers: customization.columns || ['Metric', 'Q1', 'Q2', 'Q3', 'Q4', 'Total', 'Growth %'],
        sampleData: [
          ['Revenue', 100000, 120000, 110000, 130000, '=SUM(B2:E2)', '=((F2-B2)/B2)*100'],
          ['Expenses', 60000, 65000, 62000, 68000, '=SUM(B3:E3)', '=((F3-B3)/B3)*100'],
          ['Profit', '=B2-B3', '=C2-C3', '=D2-D3', '=E2-E3', '=F2-F3', '=((F4-B4)/B4)*100']
        ],
        formulas: [
          { cell: { row: 6, column: 1 }, formula: '=AVERAGE(B2:E2)' },
          { cell: { row: 7, column: 1 }, formula: '=MAX(B2:E2)' }
        ],
        features: ['Quarterly financial tracking', 'Growth calculations', 'Summary formulas', 'Professional formatting']
      }
    
    case 'PROJECT_TRACKER':
      return {
        headers: customization.columns || ['Task', 'Assignee', 'Start Date', 'Due Date', 'Status', 'Progress %', 'Priority'],
        sampleData: [
          ['Project Setup', 'John Doe', currentDate, '2024-12-15', 'In Progress', 75, 'High'],
          ['Requirements Gathering', 'Jane Smith', currentDate, '2024-12-10', 'Completed', 100, 'High'],
          ['Development Phase 1', 'Mike Johnson', '2024-12-11', '2024-12-25', 'Not Started', 0, 'Medium']
        ],
        formulas: [
          { cell: { row: 5, column: 1 }, formula: '=AVERAGE(F2:F4)' },
          { cell: { row: 6, column: 1 }, formula: '=COUNTIF(E2:E4,"Completed")' }
        ],
        features: ['Task management', 'Progress tracking', 'Status monitoring', 'Priority levels']
      }

    case 'SALES_REPORT':
      return {
        headers: customization.columns || ['Salesperson', 'Region', 'Product', 'Units Sold', 'Unit Price', 'Total Revenue', 'Commission'],
        sampleData: [
          ['Alice Johnson', 'North', 'Product A', 50, 100, '=D2*E2', '=F2*0.05'],
          ['Bob Smith', 'South', 'Product B', 75, 150, '=D3*E3', '=F3*0.05'],
          ['Carol Brown', 'East', 'Product A', 30, 100, '=D4*E4', '=F4*0.05']
        ],
        formulas: [
          { cell: { row: 5, column: 3 }, formula: '=SUM(D2:D4)' },
          { cell: { row: 5, column: 5 }, formula: '=SUM(F2:F4)' },
          { cell: { row: 5, column: 6 }, formula: '=SUM(G2:G4)' }
        ],
        features: ['Sales tracking', 'Revenue calculations', 'Commission tracking', 'Regional analysis']
      }

    default:
      return {
        headers: ['Item', 'Description', 'Value', 'Status'],
        sampleData: [
          ['Sample 1', 'Description 1', 100, 'Active'],
          ['Sample 2', 'Description 2', 200, 'Pending']
        ],
        formulas: [],
        features: ['Basic template structure']
      }
  }
}
