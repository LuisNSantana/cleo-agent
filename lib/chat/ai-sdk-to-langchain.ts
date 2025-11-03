/**
 * Convert AI SDK multimodal parts to LangChain HumanMessage content format
 * 
 * AI SDK format:
 * - { type: "text", text: "..." }
 * - { type: "image", image: "url" | Uint8Array }
 * 
 * LangChain format:
 * - { type: "text", text: "..." }
 * - { type: "image_url", image_url: { url: "..." } }
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
		
		// Unknown part type: pass through
		return part
	})
}
