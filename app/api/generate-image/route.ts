import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dailyLimits } from "@/lib/daily-limits"
import { z } from "zod"
import { MODELS } from "@/lib/models"
import { generateText } from "ai"

// Schema for image generation response
const ImageGenerationSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string(),
  description: z.string(),
  style: z.string().optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    // Get user from Supabase if userId provided
    let user = null
    if (userId) {
      const supabase = await createClient()
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser()
        user = userData.user
      }
    }

    const effectiveUserId = user?.id || 'anonymous'
    const modelId = 'openrouter:google/gemini-2.5-flash-image-preview' // Usar OpenRouter Gemini Nano Banana
    
    // Get the actual model configuration
    const modelConfig = MODELS.find(m => m.id === modelId)
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }

    // Check daily limits for authenticated users
    if (user?.id) {
      const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)
      
      if (!limitCheck.canUse) {
        return NextResponse.json(
          { 
            error: `Daily limit reached for image generation. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`,
            limitReached: true,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          },
          { status: 429 }
        )
      }
    }

    // Get OpenRouter API key
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      )
    }

    // Get the model's SDK instance for OpenRouter
    const openRouterModel = modelConfig.apiSdk?.(openRouterApiKey)
    if (!openRouterModel) {
      return NextResponse.json(
        { error: "OpenRouter model SDK not available" },
        { status: 500 }
      )
    }

    // Enhanced prompt for better image generation
    const enhancedPrompt = `Create a high-quality image with the following description: "${prompt}". 
    Make it visually appealing, well-composed, and detailed. If no specific style is mentioned, use a modern, professional style.`

    console.log('🎨 Generating image with OpenRouter Gemini:', enhancedPrompt)

    // Generate image using OpenRouter Gemini 2.5 Flash Image Preview via AI SDK
    const result = await generateText({
      model: openRouterModel,
      prompt: enhancedPrompt,
    })

    // For image generation models through OpenRouter, the response should contain image data
    const generatedText = result.text

    // Since this is an image generation model, the response should contain image data
    // We need to check if it's a base64 image or a URL
    let imageUrl = ''
    
    if (generatedText.includes('data:image')) {
      imageUrl = generatedText
    } else if (generatedText.includes('http')) {
      imageUrl = generatedText.trim()
    } else {
      // If it's base64 without data URL prefix, add it
      imageUrl = `data:image/png;base64,${generatedText}`
    }

    const imageResponse = {
      imageUrl,
      title: `Generated Image: ${prompt.slice(0, 50)}`,
      description: `AI-generated image based on: "${prompt}"`,
      style: "AI Generated",
      dimensions: {
        width: 1024,
        height: 1024
      }
    }

    // Record usage if user is authenticated
    if (user?.id) {
      try {
        await dailyLimits.recordUsage(user.id, modelId)
      } catch (error) {
        console.error('Failed to record image generation usage:', error)
      }
    }

    return NextResponse.json({
      success: true,
      result: imageResponse,
      model: modelId,
      usage: user?.id ? {
        userId: user.id,
        remaining: (await dailyLimits.canUseModel(user.id, modelId, modelConfig)).remaining - 1
      } : null
    })

  } catch (error) {
    console.error('Image generation error:', error)
    
    return NextResponse.json(
      { 
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check daily limits
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const modelId = 'google:gemini-2.5-flash-image-preview'
    
    // Get the actual model configuration
    const modelConfig = MODELS.find(m => m.id === modelId)
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }
    
    const limitCheck = await dailyLimits.canUseModel(userId, modelId, modelConfig)
    
    return NextResponse.json({
      canGenerate: limitCheck.canUse,
      remaining: limitCheck.remaining,
      limit: limitCheck.limit,
      model: modelId
    })

  } catch (error) {
    console.error('Error checking image generation limits:', error)
    return NextResponse.json(
      { error: "Failed to check limits" },
      { status: 500 }
    )
  }
}