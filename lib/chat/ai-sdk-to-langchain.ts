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
		
		// ✅ FIX: File parts (PDFs, documents) - convert to text instructions for the model
		// Models don't understand { type: 'file' } natively, so we convert to clear text
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
				text: `[ATTACHED FILE: ${fileName}]\nType: ${fileType}\nURL: ${fileUrl}\n\nIMPORTANT: This is an attached ${fileType === 'application/pdf' ? 'PDF' : 'document'}. Use extract_text_from_pdf tool with the URL above to access its content before analyzing.`
			}
		}
		
		// Unknown part type: pass through
		return part
	}))
	
	return converted
}
