/**
 * Advanced Google Slides Tools
 * 
 * Professional presentation creation with:
 * - Custom layouts and themes
 * - Images, shapes, and text boxes with styling
 * - Tables with data
 * - Speaker notes
 * - Slide transitions
 * - Advanced positioning and sizing
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { trackToolUsage } from '@/lib/analytics'
import { getCurrentUserId } from '@/lib/server/request-context'

// Token cache
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getSlidesAccessToken(userId: string): Promise<string | null> {
  const cacheKey = `slides:${userId}`
  const cached = tokenCache[cacheKey]
  if (cached && cached.expiry > Date.now()) return cached.token
  
  try {
    const supabase = await createClient()
    if (!supabase) return null

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

    // Refresh token
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
    console.error('[Slides] token error', e)
    return null
  }
}

async function slidesBatchUpdate(token: string, presentationId: string, requests: any[]) {
  const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Slides API error ${res.status}: ${text}`)
  }

  return res.json()
}

// Insert image into slide
export const insertSlideImageTool = tool({
  description: 'Insert an image into a Google Slides presentation from a URL. Supports custom positioning and sizing. Perfect for logos, photos, diagrams.',
  inputSchema: z.object({
    presentationId: z.string().describe('The ID of the presentation'),
    pageObjectId: z.string().describe('The slide ID where to insert the image'),
    imageUrl: z.string().url().describe('URL of the image to insert'),
    position: z.object({
      translateX: z.number().describe('X position in EMU (1 point = 12700 EMU, so 100pt = 1270000)'),
      translateY: z.number().describe('Y position in EMU'),
    }).optional().describe('Position on slide (optional, defaults to center)'),
    size: z.object({
      width: z.number().describe('Width in EMU'),
      height: z.number().describe('Height in EMU')
    }).optional().describe('Image size (optional)')
  }),
  execute: async ({ presentationId, pageObjectId, imageUrl, position, size }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getSlidesAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Google Workspace not connected' }
    }

    console.log('📊 [Slides Advanced] Inserting image:', { presentationId, pageObjectId })

    try {
      const imageId = `image_${Date.now()}`
      
      const request: any = {
        createImage: {
          objectId: imageId,
          url: imageUrl,
          elementProperties: {
            pageObjectId,
            ...(size && {
              size: {
                width: { magnitude: size.width, unit: 'EMU' },
                height: { magnitude: size.height, unit: 'EMU' }
              }
            }),
            ...(position && {
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: position.translateX,
                translateY: position.translateY,
                unit: 'EMU'
              }
            })
          }
        }
      }

      await slidesBatchUpdate(token, presentationId, [request])

      await trackToolUsage(userId, 'insertSlideImage', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Image inserted successfully',
        imageId,
        webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    } catch (error) {
      console.error('Error inserting image:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to insert image'
      }
    }
  }
})

// Create shape with custom styling
export const createSlideShapeTool = tool({
  description: 'Create a shape in Google Slides with custom styling: rectangles, circles, arrows, etc. Supports colors, borders, and text inside shapes.',
  inputSchema: z.object({
    presentationId: z.string().describe('The ID of the presentation'),
    pageObjectId: z.string().describe('The slide ID where to create the shape'),
    shapeType: z.enum([
      'RECTANGLE',
      'ROUND_RECTANGLE',
      'ELLIPSE',
      'TRIANGLE',
      'RIGHT_TRIANGLE',
      'ARROW',
      'CLOUD',
      'STAR_5',
      'HEXAGON'
    ]).describe('Type of shape to create'),
    position: z.object({
      translateX: z.number().describe('X position in points (multiply by 12700 for EMU)'),
      translateY: z.number().describe('Y position in points')
    }).describe('Position on slide'),
    size: z.object({
      width: z.number().describe('Width in points'),
      height: z.number().describe('Height in points')
    }).describe('Shape size'),
    style: z.object({
      backgroundColor: z.object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      }).optional().describe('Fill color in RGB (0-1)'),
      borderColor: z.object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      }).optional().describe('Border color in RGB (0-1)'),
      borderWeight: z.number().optional().describe('Border thickness in points')
    }).optional().describe('Shape styling'),
    text: z.string().optional().describe('Text to insert inside the shape')
  }),
  execute: async ({ presentationId, pageObjectId, shapeType, position, size, style, text }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getSlidesAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Google Workspace not connected' }
    }

    console.log('📊 [Slides Advanced] Creating shape:', { presentationId, shapeType })

    try {
      const shapeId = `shape_${Date.now()}`
      
      const requests: any[] = [
        {
          createShape: {
            objectId: shapeId,
            shapeType,
            elementProperties: {
              pageObjectId,
              size: {
                width: { magnitude: size.width * 12700, unit: 'EMU' },
                height: { magnitude: size.height * 12700, unit: 'EMU' }
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: position.translateX * 12700,
                translateY: position.translateY * 12700,
                unit: 'EMU'
              }
            }
          }
        }
      ]

      // Apply styling if provided
      if (style) {
        const shapeProperties: any = {}
        
        if (style.backgroundColor) {
          shapeProperties.shapeBackgroundFill = {
            solidFill: {
              color: { rgbColor: style.backgroundColor }
            }
          }
        }

        if (style.borderColor || style.borderWeight) {
          shapeProperties.outline = {
            ...(style.borderColor && {
              outlineFill: {
                solidFill: {
                  color: { rgbColor: style.borderColor }
                }
              }
            }),
            ...(style.borderWeight && {
              weight: { magnitude: style.borderWeight * 12700, unit: 'EMU' }
            })
          }
        }

        if (Object.keys(shapeProperties).length > 0) {
          requests.push({
            updateShapeProperties: {
              objectId: shapeId,
              shapeProperties,
              fields: Object.keys(shapeProperties).join(',')
            }
          })
        }
      }

      // Add text if provided
      if (text) {
        requests.push({
          insertText: {
            objectId: shapeId,
            insertionIndex: 0,
            text
          }
        })
      }

      await slidesBatchUpdate(token, presentationId, requests)

      await trackToolUsage(userId, 'createSlideShape', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `${shapeType} shape created successfully`,
        shapeId,
        webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    } catch (error) {
      console.error('Error creating shape:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create shape'
      }
    }
  }
})

// Create table in slide
export const createSlideTableTool = tool({
  description: 'Create a table in Google Slides with specified rows and columns. Can include initial data. Perfect for data presentation and comparisons.',
  inputSchema: z.object({
    presentationId: z.string().describe('The ID of the presentation'),
    pageObjectId: z.string().describe('The slide ID where to create the table'),
    rows: z.number().min(1).describe('Number of rows'),
    columns: z.number().min(1).describe('Number of columns'),
    position: z.object({
      translateX: z.number().describe('X position in points'),
      translateY: z.number().describe('Y position in points')
    }).describe('Position on slide'),
    size: z.object({
      width: z.number().describe('Total table width in points'),
      height: z.number().describe('Total table height in points')
    }).describe('Table size'),
    data: z.array(z.array(z.string())).optional().describe('Initial table data as array of rows (optional)')
  }),
  execute: async ({ presentationId, pageObjectId, rows, columns, position, size, data }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getSlidesAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Google Workspace not connected' }
    }

    console.log('📊 [Slides Advanced] Creating table:', { presentationId, rows, columns })

    try {
      const tableId = `table_${Date.now()}`
      
      const requests: any[] = [
        {
          createTable: {
            objectId: tableId,
            elementProperties: {
              pageObjectId,
              size: {
                width: { magnitude: size.width * 12700, unit: 'EMU' },
                height: { magnitude: size.height * 12700, unit: 'EMU' }
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: position.translateX * 12700,
                translateY: position.translateY * 12700,
                unit: 'EMU'
              }
            },
            rows,
            columns
          }
        }
      ]

      // Add data to cells if provided
      if (data && data.length > 0) {
        for (let rowIndex = 0; rowIndex < Math.min(rows, data.length); rowIndex++) {
          const rowData = data[rowIndex]
          for (let colIndex = 0; colIndex < Math.min(columns, rowData.length); colIndex++) {
            const cellText = rowData[colIndex]
            if (cellText) {
              requests.push({
                insertText: {
                  objectId: tableId,
                  cellLocation: {
                    rowIndex,
                    columnIndex: colIndex
                  },
                  text: cellText,
                  insertionIndex: 0
                }
              })
            }
          }
        }
      }

      await slidesBatchUpdate(token, presentationId, requests)

      await trackToolUsage(userId, 'createSlideTable', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: `Table (${rows}x${columns}) created successfully`,
        tableId,
        webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    } catch (error) {
      console.error('Error creating table:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create table'
      }
    }
  }
})

// Format text in slides
export const formatSlideTextTool = tool({
  description: 'Format text in Google Slides: font size, font family, bold, italic, colors. Essential for professional presentation styling.',
  inputSchema: z.object({
    presentationId: z.string().describe('The ID of the presentation'),
    objectId: z.string().describe('The ID of the text box or shape containing the text'),
    startIndex: z.number().optional().describe('Start index of text to format (optional, formats all if not provided)'),
    endIndex: z.number().optional().describe('End index of text to format (optional)'),
    style: z.object({
      bold: z.boolean().optional().describe('Make text bold'),
      italic: z.boolean().optional().describe('Make text italic'),
      underline: z.boolean().optional().describe('Underline text'),
      fontSize: z.number().optional().describe('Font size in points'),
      fontFamily: z.string().optional().describe('Font family (e.g., "Arial", "Calibri")'),
      foregroundColor: z.object({
        red: z.number().min(0).max(1).optional(),
        green: z.number().min(0).max(1).optional(),
        blue: z.number().min(0).max(1).optional()
      }).optional().describe('Text color in RGB (0-1)')
    }).describe('Text formatting options')
  }),
  execute: async ({ presentationId, objectId, startIndex, endIndex, style }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getSlidesAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Google Workspace not connected' }
    }

    console.log('📊 [Slides Advanced] Formatting text:', { presentationId, objectId })

    try {
      const textStyle: any = {}
      const fields: string[] = []

      if (style.bold !== undefined) {
        textStyle.bold = style.bold
        fields.push('bold')
      }

      if (style.italic !== undefined) {
        textStyle.italic = style.italic
        fields.push('italic')
      }

      if (style.underline !== undefined) {
        textStyle.underline = style.underline
        fields.push('underline')
      }

      if (style.fontSize) {
        textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' }
        fields.push('fontSize')
      }

      if (style.fontFamily) {
        textStyle.fontFamily = style.fontFamily
        fields.push('fontFamily')
      }

      if (style.foregroundColor) {
        textStyle.foregroundColor = { opaqueColor: { rgbColor: style.foregroundColor } }
        fields.push('foregroundColor')
      }

      const request: any = {
        updateTextStyle: {
          objectId,
          style: textStyle,
          fields: fields.join(',')
        }
      }

      if (startIndex !== undefined && endIndex !== undefined) {
        request.updateTextStyle.textRange = {
          type: 'FIXED_RANGE',
          startIndex,
          endIndex
        }
      } else {
        request.updateTextStyle.textRange = { type: 'ALL' }
      }

      await slidesBatchUpdate(token, presentationId, [request])

      await trackToolUsage(userId, 'formatSlideText', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Text formatted successfully',
        webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    } catch (error) {
      console.error('Error formatting text:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to format text'
      }
    }
  }
})

// Add speaker notes
export const addSlideSpeakerNotesTool = tool({
  description: 'Add speaker notes to a slide in Google Slides. Perfect for presentation preparation and talking points.',
  inputSchema: z.object({
    presentationId: z.string().describe('The ID of the presentation'),
    pageObjectId: z.string().describe('The slide ID to add notes to'),
    notes: z.string().describe('Speaker notes text to add')
  }),
  execute: async ({ presentationId, pageObjectId, notes }) => {
    const started = Date.now()
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const token = await getSlidesAccessToken(userId)
    if (!token) {
      return { success: false, message: 'Google Workspace not connected' }
    }

    console.log('📊 [Slides Advanced] Adding speaker notes:', { presentationId, pageObjectId })

    try {
      // First, we need to get the notes page for this slide
      const presentationResponse = await fetch(
        `https://slides.googleapis.com/v1/presentations/${presentationId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!presentationResponse.ok) {
        throw new Error('Failed to get presentation')
      }

      const presentation = await presentationResponse.json()
      const slide = presentation.slides?.find((s: any) => s.objectId === pageObjectId)
      
      if (!slide || !slide.slideProperties?.notesPage) {
        return { success: false, message: 'Could not find notes page for this slide' }
      }

      const notesPageObjectId = slide.slideProperties.notesPage.notesObjectId
      
      // Find the notes shape (usually the second shape on the notes page)
      const notesShape = slide.slideProperties.notesPage.pageElements?.find(
        (el: any) => el.shape && el.shape.shapeType === 'TEXT_BOX'
      )

      if (!notesShape) {
        return { success: false, message: 'Could not find notes shape' }
      }

      const request = {
        insertText: {
          objectId: notesShape.objectId,
          text: notes,
          insertionIndex: 0
        }
      }

      await slidesBatchUpdate(token, presentationId, [request])

      await trackToolUsage(userId, 'addSlideSpeakerNotes', { ok: true, execMs: Date.now() - started })

      return {
        success: true,
        message: 'Speaker notes added successfully',
        webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`
      }
    } catch (error) {
      console.error('Error adding speaker notes:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add speaker notes'
      }
    }
  }
})
