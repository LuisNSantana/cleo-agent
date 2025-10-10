/**
 * Image Generation Intent Detection
 * 
 * Detects when user wants to generate an image based on their message content
 */

const IMAGE_GENERATION_KEYWORDS = [
  // Spanish terms
  'genera una imagen', 'crea una imagen', 'dibuja', 'diseña', 'haz una imagen',
  'crear imagen', 'generar imagen', 'imagen de', 'foto de', 'ilustración de',
  'dibujo de', 'diseño de', 'logo de', 'póster de', 'banner de',
  'visualiza', 'representa', 'muestra visualmente', 'haz un dibujo',
  'hazme un logo', 'haz un logo', 'crea un logo', 'crea un póster', 'renderiza',
  'píntame', 'pintame', 'ilústrame', 'concept art', 'arte conceptual',
  'portada de', 'cover art', 'arte de', 'arte estilo',
  
  // English terms
  'generate an image', 'create an image', 'draw', 'design', 'make an image',
  'create image', 'generate image', 'image of', 'picture of', 'illustration of',
  'drawing of', 'design of', 'logo of', 'poster of', 'banner of',
  'visualize', 'represent', 'show visually', 'make a drawing',
  'render', 'render me', 'concept art of', 'artwork of', 'cover art of',
  'album cover', 'movie poster', 'digital art of',
  
  // Common phrases
  'quiero ver', 'muéstrame', 'cómo se ve', 'cómo sería', 'imagina',
  'i want to see', 'show me', 'what would look like', 'imagine',
  'haz que se vea', 'enséñame cómo se vería', 'make it look like',
]

const IMAGE_STYLE_KEYWORDS = [
  'realista', 'cartoon', 'anime', 'acuarela', 'óleo', 'digital',
  'minimalista', 'abstracto', 'fotorrealista', 'vintage', 'moderno',
  'realistic', 'watercolor', 'oil painting', 'minimalist', 'abstract',
  'photorealistic', 'modern', 'artistic', 'professional', 'creative'
]

const NEGATIVE_PATTERNS = [
  /analiza (esta|la)?\s*(imagen|foto)/i,
  /describe (esta|la)?\s*(imagen|foto)/i,
  /qué ves en (esta|la)\s*(imagen|foto)/i,
  /busca(r)?\s+(una\s+)?imagen(es)?/i,
  /sube esta imagen/i,
  /revisa esta imagen/i,
  /analizar imagen adjunta/i,
]

export interface ImageGenerationIntent {
  shouldGenerate: boolean
  confidence: number
  prompt: string
  detectedKeywords: string[]
  extractedPrompt: string
}

/**
 * Analyze user message to detect image generation intent
 */
export function detectImageGenerationIntent(message: string): ImageGenerationIntent {
  const lowerMessage = message.toLowerCase()
  const detectedKeywords: string[] = []
  let confidence = 0

  for (const negative of NEGATIVE_PATTERNS) {
    if (negative.test(message)) {
      return {
        shouldGenerate: false,
        confidence: 0,
        prompt: message,
        detectedKeywords: [],
        extractedPrompt: message.trim(),
      }
    }
  }

  // Check for direct image generation keywords
  for (const keyword of IMAGE_GENERATION_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      detectedKeywords.push(keyword)
      confidence += 0.3
    }
  }

  // Check for style keywords (boost confidence)
  for (const styleKeyword of IMAGE_STYLE_KEYWORDS) {
    if (lowerMessage.includes(styleKeyword.toLowerCase())) {
      detectedKeywords.push(styleKeyword)
      confidence += 0.1
    }
  }

  // Check for typical image generation patterns
  const patterns = [
    /una imagen (de|del|que)/i,
    /genera(r)? (una )?imagen/i,
    /crea(r)? (una )?imagen/i,
    /dibuja(r)? (una )?/i,
    /diseña(r)? (un|una)?/i,
    /imagen que (muestre|represente|sea)/i,
    /make (an? )?image/i,
    /create (an? )?image/i,
    /generate (an? )?image/i,
    /draw (an? )?/i,
    /design (an? )?/i,
    /render (an? )?/i,
    /artwork (of|showing)/i,
    /concept art (of|for)/i,
  ]

  for (const pattern of patterns) {
    if (pattern.test(message)) {
      confidence += 0.35
      detectedKeywords.push(`pattern:${pattern.source}`)
      break
    }
  }

  // Extract the actual image prompt (remove generation keywords)
  let extractedPrompt = message
  for (const keyword of IMAGE_GENERATION_KEYWORDS) {
    extractedPrompt = extractedPrompt.replace(new RegExp(keyword, 'gi'), '').trim()
  }

  // Clean up the extracted prompt
  extractedPrompt = extractedPrompt
    .replace(/^(de|del|que|of|a|an)\s+/i, '') // Remove leading articles
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()

  // Ensure we have a meaningful prompt
  if (extractedPrompt.length < 3) {
    extractedPrompt = message // Fallback to original message
  }

  const shouldGenerate = confidence >= 0.35 && detectedKeywords.length > 0

  return {
    shouldGenerate,
    confidence: Math.min(confidence, 1.0),
    prompt: message,
    detectedKeywords,
    extractedPrompt
  }
}

/**
 * Check if a message is asking for image generation
 */
export function isImageGenerationRequest(message: string): boolean {
  const intent = detectImageGenerationIntent(message)
  return intent.shouldGenerate
}

/**
 * Extract the image prompt from a generation request
 */
export function extractImagePrompt(message: string): string {
  const intent = detectImageGenerationIntent(message)
  return intent.extractedPrompt
}

/**
 * Test examples for the detection system
 */
export const TEST_EXAMPLES = [
  // Should detect (true)
  { text: "Genera una imagen de un gato jugando", expected: true },
  { text: "Crea una imagen realista de una casa", expected: true },
  { text: "Dibuja un logo moderno para mi empresa", expected: true },
  { text: "Haz una imagen de una montaña al atardecer", expected: true },
  { text: "Quiero ver una imagen de un coche futurista", expected: true },
  { text: "Generate an image of a beautiful sunset", expected: true },
  { text: "Create a professional logo design", expected: true },
  { text: "Make an image showing a robot", expected: true },
  
  // Should NOT detect (false)
  { text: "¿Cómo estás hoy?", expected: false },
  { text: "Explícame qué es la inteligencia artificial", expected: false },
  { text: "Busca imágenes de gatos en internet", expected: false },
  { text: "Analiza esta imagen que te envío", expected: false },
  { text: "¿Qué ves en esta foto?", expected: false },
]