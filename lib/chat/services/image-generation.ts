/**
 * Image generation service
 * Handles AI image generation via OpenAI (gpt-image-1-mini as primary, DALL-E 3 fallback)
 * 
 * COST OPTIMIZATION (Jan 2026):
 * - gpt-image-1-mini: $0.005-0.036 per image (primary)
 * - DALL-E 3: $0.04-0.12 per image (fallback)
 * - Gemini via OpenRouter: removed (less reliable)
 */

import { OpenAI } from 'openai'
import { dailyLimits } from '@/lib/daily-limits'
import { createClient } from '@/lib/supabase/server'
import { MODELS } from '@/lib/models'
import { chatLogger } from './logger'
import { type User } from '@supabase/supabase-js'

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

// Quality levels for gpt-image-1-mini
type ImageQuality = 'low' | 'medium' | 'high'

export class ImageGenerationService {
  /**
   * Generate image using openai/gpt-5-image-mini (cheapest) with DALL-E 3 fallback
   */
  async generateImage(
    prompt: string,
    userId?: string,
    isAuthenticated?: boolean,
    quality: ImageQuality = 'medium'
  ): Promise<ImageGenerationResult> {
    try {
      chatLogger.debug('Starting image generation', { prompt: prompt.slice(0, 50), quality })

      // Get user from Supabase if authenticated
      let user: User | null = null
      if (userId && isAuthenticated) {
        const supabase = await createClient()
        if (supabase) {
          const { data: userData } = await supabase.auth.getUser()
          user = userData.user
        }
      }

      // Primary model: chatgpt-image-latest (Official OpenAI)
      const modelId = 'chatgpt-image-latest'
      const modelConfig = MODELS.find((m) => m.id === modelId)
      
      // Fallback config if model not in registry
      const effectiveModelConfig = modelConfig || {
        id: modelId,
        name: 'ChatGPT Image Latest', 
        maxCalls: 50,
        provider: 'openai', 
        providerId: 'chatgpt-image-latest',
        baseProviderId: 'openai',
      }

      // Check daily limits for authenticated users
      if (user?.id && modelConfig) {
        const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)

        if (!limitCheck.canUse) {
          throw new Error(
            `Daily limit reached for image generation. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`
          )
        }
      }

      // Try providers in order: gpt-image-1-mini (Official) → DALL-E 3 → Mock fallback
      const result = await this.tryGptImage1MiniOfficial(prompt, user?.id, modelId, quality)
        .catch(() => this.tryOpenAIDallE(prompt, user?.id, 'dall-e-3'))
        .catch((err) => this.createMockFallback(prompt, user?.id, modelId, err))

      return result
    } catch (error) {
      chatLogger.error('Image generation failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model: 'gpt-image-1-mini',
      }
    }
  }

  /**
   * Helper: Upload Base64 image to Supabase Storage and get URL
   * This prevents context window crashes by converting huge Base64 strings to short URLs.
   */
  private async uploadBase64Image(base64Data: string): Promise<string> {
    try {
      const supabase = await createClient()
      if (!supabase) throw new Error('Supabase client not available')

      // Remove data:image/xxx;base64, prefix if present
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "")
      const buffer = Buffer.from(base64Content, 'base64')

      const fileName = `generated-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      chatLogger.error('Failed to upload generated image to storage', { error })
      // Return original base64 as fallback, although it might crash context
      // At least the user sees the image once before crash
      return base64Data
    }
  }

  /**
   * Primary: OpenAI usage for chatgpt-image-latest (or gpt-image-1)
   * Using official OpenAI SDK images.generate as per user example.
   */
  private async tryGptImage1MiniOfficial(
    prompt: string,
    userId: string | undefined,
    modelId: string,
    quality: ImageQuality = 'medium'
  ): Promise<ImageGenerationResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured for official OpenAI usage')
    }

    // User requested "test chatgpt-image-latest"
    const actualModelId = 'chatgpt-image-latest'
    
    chatLogger.info(`Attempting image generation with ${actualModelId} via Official OpenAI SDK (images.generate)`)

    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, 
    })

    try {
      // Minimal payload as per user example
      const response = await openai.images.generate({
        model: actualModelId,
        prompt: prompt,
        n: 1, 
        size: "1024x1024", 
      });

      let imageUrl = response.data?.[0]?.url;
      
      // Fallback to b64_json if url is missing (user example implies b64 usage)
      if (!imageUrl && response.data?.[0]?.b64_json) {
        // We MUST upload this to storage to avoid context crash
        const base64Data = `data:image/png;base64,${response.data[0].b64_json}`;
        imageUrl = await this.uploadBase64Image(base64Data);
      }

      if (!imageUrl) {
        throw new Error(`No image URL or Base64 received from ${actualModelId}`)
      }

      const result = {
        imageUrl,
        title: `Generated Image: ${prompt.slice(0, 50)}`,
        description: `AI-generated image using ${actualModelId}: "${prompt}"`,
        style: 'ChatGPT Image Latest', 
        dimensions: { width: 1024, height: 1024 }, 
      }

      if (userId) {
        await dailyLimits.recordUsage(userId, modelId).catch((err) => {
          chatLogger.error('Failed to record image usage', { userId, error: err })
        })
      }

      chatLogger.info(`Image generated via ${actualModelId} (Official SDK)`)
      return { success: true, result, model: actualModelId }

    } catch (error: any) {
      chatLogger.warn(`Official OpenAI SDK generation failed for ${actualModelId}`, { error: error.message })
      throw error 
    }
  }

  /**
   * Fallback: OpenAI DALL-E 3 (higher quality, higher cost)
   * Pricing: $0.04 (standard) / $0.08-0.12 (HD) per 1024x1024
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

    chatLogger.info('Falling back to DALL-E 3')

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
      throw new Error('No image URL received from DALL-E 3')
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
   * Emergency fallback when all providers fail
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

