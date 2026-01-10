/**
 * Image Generation Tool
 * 
 * Allows AI agents to generate images from text descriptions
 * using FLUX, DALL-E, or Gemini image models.
 * 
 * This enables automatic image generation when users say:
 * - "Create a logo for..."
 * - "Draw me a cat"
 * - "Generate an image of..."
 * - "Diseña un banner para..."
 */

import { z } from 'zod'
import { tool } from 'ai'
import { imageGenerationService } from '@/lib/chat/services'

export const generateImageTool = tool({
  description: `Generate an AI image from a text description. Use this tool when the user asks to:
- Create, draw, generate, or design an image
- Make a logo, illustration, artwork, banner, or icon
- Visualize a concept, idea, or scene
- Edit or describe what an image should look like

Trigger keywords (any language):
- English: "create", "draw", "generate", "design", "make", "illustrate", "visualize"
- Spanish: "crea", "dibuja", "genera", "diseña", "haz", "imagina"
- Commands: "show me", "I want an image", "picture of", "foto de", "imagen de"

IMPORTANT: Always use this tool when the user wants visual content generated. Do NOT just describe what the image would look like - actually generate it.`,

  inputSchema: z.object({
    prompt: z.string().describe('Detailed description of the image to generate. Be specific about style, colors, composition, and mood.'),
    style: z.enum(['realistic', 'artistic', 'cartoon', 'digital-art', '3d-render', 'photographic', 'minimalist', 'abstract'])
      .optional()
      .describe('Visual style preference for the image'),
  }),

  execute: async ({ prompt, style }: { prompt: string; style?: string }) => {
    console.log(`[TOOL] generateImage called with prompt: "${prompt.slice(0, 100)}..."`)
    
    try {
      // Enhance prompt with style if provided
      const enhancedPrompt = style 
        ? `${prompt}. Style: ${style.replace('-', ' ')}`
        : prompt
      
      // Get current user from global context (set by route.ts)
      const userId = (globalThis as any).__currentUserId
      
      const result = await imageGenerationService.generateImage(
        enhancedPrompt,
        userId,
        !!userId // isAuthenticated
      )
      
      if (result.success && result.result) {
        console.log(`[TOOL] generateImage success: ${result.result.imageUrl.slice(0, 100)}...`)
        
        // Return markdown image that will render in chat
        return {
          success: true,
          imageUrl: result.result.imageUrl,
          title: result.result.title,
          description: result.result.description,
          markdown: `![${result.result.title}](${result.result.imageUrl})\n\n*${result.result.description}*`,
          model: result.model
        }
      } else {
        console.error('[TOOL] generateImage failed:', result.error)
        return {
          success: false,
          error: result.error || 'Image generation failed',
          suggestion: 'Try simplifying the prompt or being more specific about what you want.'
        }
      }
    } catch (error) {
      console.error('[TOOL] generateImage error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating image',
        suggestion: 'The image generation service may be temporarily unavailable. Please try again.'
      }
    }
  }
})
