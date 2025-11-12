/**
 * Convert AI SDK multimodal parts to LangChain HumanMessage content format
 * 
 * AI SDK format:
 * - { type: "text", text: "..." }
 * - { type: "image", image: "url" | Uint8Array }
 * - { type: "file", url: "...", name: "...", mediaType: "..." }
 * 
 * LangChain format:
 * - { type: "text", text: "..." }
 * - { type: "image_url", image_url: { url: "..." } }
 * - { type: "file", url: "...", name: "...", mediaType: "..." } (preserved for tool processing)
 * 
 * @see https://js.langchain.com/docs/how_to/tool_calls_multimodal/
 */
export function convertAiSdkPartsToLangChain(parts: any[]): any[] {
	if (!Array.isArray(parts)) return []
	
	return parts.map(part => {
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
			
			// If it's already a URL string, use it directly
			if (typeof imageData === 'string') {
				return {
					type: 'image_url',
					image_url: {
						url: imageData
					}
				}
			}
			
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
	})
}
