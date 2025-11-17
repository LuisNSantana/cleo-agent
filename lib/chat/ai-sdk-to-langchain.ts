/**
 * Convert AI SDK multimodal parts to LangChain HumanMessage content format
 * 
 * AI SDK format:
 * - { type: "text", text: "..." }
 * - { type: "image", image: "url" | Uint8Array }
 * - { type: "file", url: "...", name: "...", mediaType: "..." }
 * 
 * LangChain format for Grok-4-fast vision:
 * - { type: "text", text: "..." }
 * - { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }  // MUST be object with url property
 * 
 * @see https://docs.x.ai/docs/guides/image-understanding
 * @see https://js.langchain.com/docs/how_to/tool_calls_multimodal/
 */
export async function convertAiSdkPartsToLangChain(parts: any[]): Promise<any[]> {
	if (!Array.isArray(parts)) return []
	
	const converted = await Promise.all(parts.map(async part => {
		if (!part || typeof part !== 'object') return part
		
		// Text parts: same format in both
		if (part.type === 'text') {
			return {
				type: 'text',
				text: part.text
			}
		}
		
		// Image parts: AI SDK → LangChain conversion
		if (part.type === 'image') {
			const imageData = part.image
			
			// If it's a Uint8Array, convert to base64 data URL
			if (imageData instanceof Uint8Array) {
				const base64 = Buffer.from(imageData).toString('base64')
				return {
					type: 'image_url',
					image_url: {
						url: `data:image/jpeg;base64,${base64}`
					}
				}
			}
			
			// If it's a URL string, we need to download and convert to base64
			// xAI Grok API requires base64 data URLs, not HTTP URLs
			if (typeof imageData === 'string') {
				// Already a data URL? Use it directly
				if (imageData.startsWith('data:image/')) {
					console.log('[AI SDK → LangChain] Using existing base64 data URL for image')
					return {
						type: 'image_url',
						image_url: {
							url: imageData
						}
					}
				}
				
				// HTTP URL (e.g., Supabase Storage) - download and convert to base64
				if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
					try {
						console.log('[AI SDK → LangChain] Downloading image from HTTP URL:', imageData.substring(0, 80) + '...')
						const response = await fetch(imageData)
						if (!response.ok) {
							console.error('[AI SDK → LangChain] Failed to fetch image:', response.statusText)
							return {
								type: 'text',
								text: `[IMAGE ERROR: Could not load image from ${imageData}]`
							}
						}
						
						const arrayBuffer = await response.arrayBuffer()
						const buffer = Buffer.from(arrayBuffer)
						const base64 = buffer.toString('base64')
						
						// Detect image type from URL or default to jpeg
						const imageType = imageData.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
						const dataUrl = `data:image/${imageType};base64,${base64}`
						
						console.log('[AI SDK → LangChain] ✅ Converted HTTP URL to base64 data URL:', {
							originalUrl: imageData.substring(0, 60) + '...',
							sizeKB: Math.round(buffer.length / 1024),
							format: imageType
						})
						
						return {
							type: 'image_url',
							image_url: {
								url: dataUrl
							}
						}
					} catch (error) {
						console.error('[AI SDK → LangChain] Error downloading image:', error)
						return {
							type: 'text',
							text: `[IMAGE ERROR: Failed to download image - ${error instanceof Error ? error.message : String(error)}]`
						}
					}
				}
				// Unknown format: try using as-is with proper structure
				console.warn('[AI SDK → LangChain] Unknown image URL format:', imageData.substring(0, 80))
				return {
					type: 'image_url',
					image_url: {
						url: imageData
					}
				}
			}
			
			// Fallback: return as-is and hope for the best
			console.warn('[AI SDK → LangChain] Unknown image format:', typeof imageData)
			return part
		}
		
		// ✅ PDF FILE PROCESSING: Download, detect if scanned, convert to images for vision OCR
		if (part.type === 'file' && part.mediaType === 'application/pdf' && part.url) {
			const fileName = part.name || 'document.pdf'
			const fileUrl = part.url
			
			console.log('[AI SDK → LangChain] Processing PDF file:', {
				name: fileName,
				url: fileUrl.substring(0, 80) + '...'
			})
			
			// Only process HTTP URLs (download and analyze)
			if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
				try {
					console.log('📋 [PDF] Downloading from HTTP URL:', fileUrl.substring(0, 80) + '...')
					const response = await fetch(fileUrl)
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`)
					}
					const arrayBuffer = await response.arrayBuffer()
					const pdfBuffer = Buffer.from(arrayBuffer)
					console.log(`📋 [PDF] Downloaded successfully: ${(pdfBuffer.length / 1024).toFixed(0)} KB`)
					
					// Extract text and detect if scanned
					const { extractPdfText } = await import('@/lib/file-processing')
					const { isPdfLikelyScanned, convertPdfPagesToImages } = await import('@/lib/pdf-to-image')
					
					const extractedText = await extractPdfText(pdfBuffer)
					console.log(`📋 [PDF] Extracted text length: ${extractedText.length} chars`)
					
					const isScanned = isPdfLikelyScanned(extractedText)
					console.log(`📋 [PDF] Is scanned? ${isScanned}`)
					
					// TODO: Get modelVision from context - for now assume true for Grok-4-fast
					const modelVision = true // This should come from agent config
					
					if (isScanned && modelVision) {
						console.log('[PDF-SCAN] Detected scanned PDF in ai-sdk-to-langchain, converting to images for vision OCR...')
						
						const imageResult = await convertPdfPagesToImages(pdfBuffer, {
							maxPages: 3,
							scale: 2.0,
							format: 'png'
						})
						
						if (imageResult.success && imageResult.images && imageResult.images.length > 0) {
							console.log(`[PDF-SCAN] Converted ${imageResult.images.length} pages for vision analysis`)
							
							// Return array of parts: intro text + images
							const parts: any[] = [
								{
									type: 'text',
									text: `📄 [${fileName}] - PDF escaneado (${imageResult.totalPages} páginas)\n\nAnalizando imágenes de las primeras ${imageResult.images.length} páginas con visión OCR...`
								}
							]
							
							// Add each page as an image
							for (const img of imageResult.images) {
								parts.push({
									type: 'image_url',
									image_url: {
										url: img.base64 // Already in data:image/png;base64,... format
									}
								})
							}
							
							// Return the first part, others will be added via flat()
							return parts
						}
					}
					
					// Not scanned or no images: return text instruction for extract_text_from_pdf tool
					return {
						type: 'text',
						text: `[ATTACHED FILE: ${fileName}]\nType: application/pdf\nURL: ${fileUrl}\n\nIMPORTANT: This is an attached PDF. Use extract_text_from_pdf tool with the URL above to access its content before analyzing.`
					}
				} catch (error) {
					console.error('❌ [PDF] Processing error:', error)
					// Fallback to text instruction
					return {
						type: 'text',
						text: `[ATTACHED FILE: ${fileName}]\nType: application/pdf\nURL: ${fileUrl}\n\nIMPORTANT: This is an attached PDF. Use extract_text_from_pdf tool with the URL above to access its content before analyzing.`
					}
				}
			}
			
			// Data URL or other format: return text instruction
			return {
				type: 'text',
				text: `[ATTACHED FILE: ${fileName}]\nType: application/pdf\nURL: ${fileUrl}\n\nIMPORTANT: This is an attached PDF. Use extract_text_from_pdf tool with the URL above to access its content before analyzing.`
			}
		}
		
		// Other file types: convert to text instructions for the model
		if (part.type === 'file') {
			const fileName = part.name || 'document'
			const fileType = part.mediaType || 'unknown'
			const fileUrl = part.url
			
			console.log('[AI SDK → LangChain] Converting file part to text instruction:', {
				name: fileName,
				mediaType: fileType,
				hasUrl: !!fileUrl
			})
			
			// Convert to clear text instruction the model can understand
			return {
				type: 'text',
				text: `[ATTACHED FILE: ${fileName}]\nType: ${fileType}\nURL: ${fileUrl}\n\nIMPORTANT: This is an attached file. Use appropriate tool to access its content before analyzing.`
			}
		}
		
		// Unknown part type: pass through
		return part
	}))
	
	// Flatten arrays (PDF vision OCR can return multiple parts)
	return converted.flat()
}
