import '@/lib/suppress-warnings'

/**
 * PDF to Image Converter with Vision OCR Fallback
 * 
 * For scanned PDFs with no extractable text, converts pages to images
 * and uses Grok-4-fast vision capabilities for OCR analysis.
 * 
 * Uses pdf-to-img for pure-JS conversion (serverless-friendly)
 */

export interface PdfToImageOptions {
  /** Maximum number of pages to convert (default: 3 for OCR) */
  maxPages?: number
  /** Scale factor for image quality (default: 2.0 for OCR clarity) */
  scale?: number
  /** Output format (default: 'png' for best OCR) */
  format?: 'png' | 'jpg'
}

export interface PdfImageResult {
  success: boolean
  images?: Array<{
    pageNumber: number
    base64: string
    mimeType: string
    sizeKB: number
  }>
  error?: string
  totalPages?: number
}

/**
 * Check if PDF has extractable text
 * Returns true if text content is minimal or empty (likely scanned)
 */
export function isPdfLikelyScanned(extractedText: string): boolean {
  if (!extractedText || extractedText.trim().length === 0) {
    return true
  }
  
  // If text is very short relative to what a typical page would have
  // Heuristic: less than 100 characters suggests it's likely scanned
  const cleanText = extractedText.trim()
  if (cleanText.length < 100) {
    return true
  }
  
  // Check ratio of alphanumeric characters
  // Scanned PDFs often have garbled/minimal text extraction
  const alphanumeric = cleanText.match(/[a-zA-Z0-9]/g) || []
  const alphaRatio = alphanumeric.length / cleanText.length
  
  // If less than 50% alphanumeric, likely not real text
  if (alphaRatio < 0.5) {
    return true
  }
  
  return false
}

/**
 * Convert PDF pages to images for vision OCR analysis
 * 
 * @param pdfBuffer - PDF file as Buffer
 * @param options - Conversion options
 * @returns Promise with array of base64 images
 */
export async function convertPdfPagesToImages(
  pdfBuffer: Buffer,
  options: PdfToImageOptions = {}
): Promise<PdfImageResult> {
  try {
    // Dynamic import to avoid bundling issues
    const { pdf } = await import('pdf-to-img')
    
    const {
      maxPages = 3, // Only convert first 3 pages for OCR
      scale = 2.0,   // 2x scale for good OCR quality
      format = 'png' // PNG for best quality
    } = options
    
    console.log('[PDF→IMAGE] Starting conversion:', {
      bufferSize: `${(pdfBuffer.length / 1024).toFixed(0)} KB`,
      maxPages,
      scale,
      format
    })
    
    // Convert PDF to images
    const document = await pdf(pdfBuffer, { scale })
    
    const images: Array<{
      pageNumber: number
      base64: string
      mimeType: string
      sizeKB: number
    }> = []
    
    let pageNumber = 1
    let totalPages = 0
    
    // Iterate through pages (limited by maxPages)
    for await (const imageBuffer of document) {
      totalPages++
      
      if (pageNumber > maxPages) {
        // Count total but don't convert beyond maxPages
        continue
      }
      
      // Convert buffer to base64
      const base64 = imageBuffer.toString('base64')
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
      const sizeKB = Math.round(imageBuffer.length / 1024)
      
      images.push({
        pageNumber,
        base64: `data:${mimeType};base64,${base64}`,
        mimeType,
        sizeKB
      })
      
      console.log(`[PDF→IMAGE] Converted page ${pageNumber}: ${sizeKB} KB`)
      
      pageNumber++
    }
    
    console.log('[PDF→IMAGE] Conversion complete:', {
      convertedPages: images.length,
      totalPages,
      totalSizeKB: images.reduce((sum, img) => sum + img.sizeKB, 0)
    })
    
    return {
      success: true,
      images,
      totalPages
    }
    
  } catch (error: any) {
    console.error('[PDF→IMAGE] Conversion failed:', error)
    
    return {
      success: false,
      error: error?.message || 'Failed to convert PDF to images'
    }
  }
}

/**
 * Create vision-ready message content for multimodal analysis
 * Formats images for Grok-4-fast vision OCR
 */
export function createVisionOcrContent(
  images: Array<{ pageNumber: number; base64: string }>,
  userPrompt?: string
): Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> {
  const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = []
  
  // Add user prompt or default OCR instruction
  const prompt = userPrompt || 
    'Este es un PDF escaneado sin texto extraíble. Por favor, analiza las imágenes y extrae todo el texto visible, manteniendo la estructura y formato original.'
  
  content.push({
    type: 'text',
    text: prompt
  })
  
  // Add each page image
  for (const image of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: image.base64
      }
    })
  }
  
  return content
}
