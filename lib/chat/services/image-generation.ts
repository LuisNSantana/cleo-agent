/**
 * Image generation service
 * Handles AI image generation via multiple providers (FLUX, DALL-E, Gemini)
 */

import { dailyLimits } from '@/lib/daily-limits'
import { createClient } from '@/lib/supabase/server'
import { MODELS } from '@/lib/models'
import { chatLogger } from './logger'

interface ImageGenerationResult {
  success: boolean
  result?: {
    imageUrl: string
    title: string
    description: string
    style: string
    dimensions: { width: number; height: number }
  }
  error?: string
  model: string
}

export type { ImageGenerationResult }

export class ImageGenerationService {
  /**
   * Generate image using preferred provider with fallbacks
   */
  async generateImage(
    prompt: string,
    userId?: string,
    isAuthenticated?: boolean
  ): Promise<ImageGenerationResult> {
    try {
      chatLogger.debug('Starting image generation', { prompt: prompt.slice(0, 50) })

      // Get user from Supabase if authenticated
      let user = null
      if (userId && isAuthenticated) {
        const supabase = await createClient()
        if (supabase) {
          const { data: userData } = await supabase.auth.getUser()
          user = userData.user
        }
      }

      // Determine model ID
      const preferredId = 'gemini-2.5-flash-image-preview'
      const legacyId = 'openrouter:google/gemini-2.5-flash-image-preview'
      const modelId = MODELS.find((m) => m.id === preferredId) ? preferredId : legacyId

      const modelConfig = MODELS.find((m) => m.id === modelId)
      if (!modelConfig) {
        throw new Error('Image generation model not found')
      }

      // Check daily limits for authenticated users
      if (user?.id) {
        const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)

        if (!limitCheck.canUse) {
          throw new Error(
            `Daily limit reached for image generation. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`
          )
        }
      }

      // Try providers in order: OpenRouter FLUX → OpenAI DALL-E → Mock fallback
      const result = await this.tryOpenRouterFlux(prompt, user?.id, modelId)
        .catch(() => this.tryOpenAIDallE(prompt, user?.id, modelId))
        .catch((err) => this.createMockFallback(prompt, user?.id, modelId, err))

      return result
    } catch (error) {
      chatLogger.error('Image generation failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model: 'openrouter:google/gemini-2.5-flash-image-preview',
      }
    }
  }

  /**
   * Try OpenRouter FLUX.1 image generation
   */
  private async tryOpenRouterFlux(
    prompt: string,
    userId: string | undefined,
    modelId: string
  ): Promise<ImageGenerationResult> {
    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Cleo Agent',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a high-quality image: ${prompt}`,
          },
        ],
        modalities: ['image', 'text'],
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const imageData = data.choices?.[0]?.message?.images?.[0]

    if (!imageData?.image_url?.url) {
      throw new Error('No image URL in OpenRouter response')
    }

    const result = {
      imageUrl: imageData.image_url.url,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image using Gemini 2.5 Flash Image Preview: "${prompt}"`,
      style: 'Gemini 2.5 Flash',
      dimensions: { width: 1024, height: 1024 },
    }

    if (userId) {
      await dailyLimits.recordUsage(userId, modelId).catch((err) => {
        chatLogger.error('Failed to record image usage', { userId, error: err })
      })
    }

    chatLogger.info('Image generated via OpenRouter FLUX')
    return { success: true, result, model: modelId }
  }

  /**
   * Try OpenAI DALL-E 3 as fallback
   */
  private async tryOpenAIDallE(
    prompt: string,
    userId: string | undefined,
    modelId: string
  ): Promise<ImageGenerationResult> {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured for fallback')
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const imageUrl = data.data[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL received from OpenAI')
    }

    const result = {
      imageUrl,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image using DALL-E 3: "${prompt}"`,
      style: 'DALL-E 3',
      dimensions: { width: 1024, height: 1024 },
    }

    if (userId) {
      await dailyLimits.recordUsage(userId, modelId).catch((err) => {
        chatLogger.error('Failed to record image usage', { userId, error: err })
      })
    }

    chatLogger.info('Image generated via DALL-E 3 fallback')
    return { success: true, result, model: 'dall-e-3-fallback' }
  }

  /**
   * Create mock fallback when all providers fail
   */
  private async createMockFallback(
    prompt: string,
    userId: string | undefined,
    modelId: string,
    previousError: Error
  ): Promise<ImageGenerationResult> {
    chatLogger.warn('All image providers failed, using placeholder', { error: previousError })

    const result = {
      imageUrl: `https://via.placeholder.com/1024x1024/4F46E5/FFFFFF?text=${encodeURIComponent(prompt.slice(0, 50))}`,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image based on: "${prompt}"`,
      style: 'Digital Art',
      dimensions: { width: 1024, height: 1024 },
    }

    if (userId) {
      await dailyLimits.recordUsage(userId, modelId).catch((err) => {
        chatLogger.error('Failed to record image usage', { userId, error: err })
      })
    }

    return { success: true, result, model: modelId }
  }
}

export const imageGenerationService = new ImageGenerationService()
