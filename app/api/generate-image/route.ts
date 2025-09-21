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
    // Use the correct OpenRouter model ID as per user instruction
    const modelId = 'openrouter:google/gemini-2.5-flash-image-preview'
    
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
    let result
    let generatedText
    
    try {
      result = await generateText({
        model: openRouterModel,
        prompt: enhancedPrompt,
      })
      generatedText = result.text
      
      // Log the raw response for debugging
      console.log('🔍 Raw model response (first 200 chars):', generatedText.substring(0, 200))
      
    } catch (modelError) {
      console.error('Model generation failed:', modelError)
      throw new Error(`Image generation model failed: ${modelError instanceof Error ? modelError.message : 'Unknown model error'}`)
    }

    // Validate that we have a meaningful response
    if (!generatedText || generatedText.trim().length === 0) {
      throw new Error('Model returned empty response')
    }

    // Since this is an image generation model, the response should contain image data
    // We need to check if it's a base64 image or a URL
    let imageUrl = ''
    
    if (generatedText.includes('data:image')) {
      imageUrl = generatedText
    } else if (generatedText.includes('http')) {
      imageUrl = generatedText.trim()
    } else if (generatedText.length > 100 && /^[A-Za-z0-9+/]*={0,2}$/.test(generatedText.trim())) {
      // If it looks like base64 data (long string of valid base64 characters)
      imageUrl = `data:image/png;base64,${generatedText.trim()}`
    } else {
      // Model returned text instead of image data
      console.error('Model returned text instead of image:', generatedText.substring(0, 200))
      throw new Error('Model returned text instead of image data. This might indicate the model is not properly configured for image generation.')
    }

    // Final validation that we have a valid image URL
    if (!imageUrl || imageUrl === 'data:image/png;base64,') {
      throw new Error('Failed to extract valid image data from model response')
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
    
    // Provide specific error messages based on the error type
    let userMessage = "Failed to generate image"
    let statusCode = 500
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userMessage = "Service temporarily unavailable. Please try again later."
        statusCode = 503
      } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        userMessage = "Daily image generation limit reached. Please try again tomorrow."
        statusCode = 429
      } else if (errorMessage.includes('model returned text')) {
        userMessage = "Image generation service is currently unavailable. Please try again in a few minutes."
        statusCode = 503
      } else if (errorMessage.includes('empty response') || errorMessage.includes('no image data')) {
        userMessage = "Failed to generate image. Please try with a different description."
        statusCode = 422
      } else if (errorMessage.includes('timeout')) {
        userMessage = "Image generation timed out after 2 minutes. Please try again with a simpler description."
        statusCode = 408
      } else {
        userMessage = "Image generation failed. Please try again or contact support if the problem persists."
      }
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        success: false,
        canRetry: statusCode !== 429, // Don't retry if it's a rate limit error
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : "Unknown error")
          : undefined // Only show technical details in development
      },
      { status: statusCode }
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

    const modelId = 'openrouter:google/gemini-2.5-flash-image-preview'
    
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
