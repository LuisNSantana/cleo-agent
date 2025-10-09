/**
 * API Route: Process Attachment
 * 
 * Processes file attachments to extract content for Canvas Editor integration
 */

import { NextRequest, NextResponse } from 'next/server'
import '@/lib/suppress-warnings'
import { processFileContent } from '@/lib/file-processing'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, contentType, name } = body

    if (!url || !contentType || !name) {
      return NextResponse.json({ 
        error: 'Missing required fields: url, contentType, name' 
      }, { status: 400 })
    }

    // Validate that this is a supported file type
    const isPdf = contentType.includes('pdf')
    const isText = contentType.startsWith('text')
    const isDocx = contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const isDoc = contentType === 'application/msword'
    if (!isPdf && !isText && !isDocx && !isDoc) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Supported: PDF, text, and Word (.docx/.doc).' 
      }, { status: 400 })
    }

    try {
      // Download the file content
      const fileResponse = await fetch(url)
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`)
      }

      // Convert to data URL for processing
      const buffer = await fileResponse.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const dataUrl = `data:${contentType};base64,${base64}`

  // Process the file content (supports: images (passthrough), text, pdf, docx/doc)
      const result = await processFileContent(dataUrl, name, contentType)

      return NextResponse.json({
        success: true,
        content: result.content,
        type: result.type,
        summary: result.summary
      })

    } catch (processingError) {
      logger.error('ATTACHMENT-API', 'Error processing file', processingError)
      return NextResponse.json({ 
        error: `Failed to process file: ${processingError instanceof Error ? processingError.message : 'Unknown error'}` 
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('ATTACHMENT-API', 'Process attachment error', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// App Router Configuration - increase request body size limit for Grok-4-Fast 2M token support
export const preferredRegion = 'auto'
export const dynamic = 'force-dynamic'