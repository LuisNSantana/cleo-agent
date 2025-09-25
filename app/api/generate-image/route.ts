import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dailyLimits } from "@/lib/daily-limits"
import { z } from "zod"
import { MODELS } from "@/lib/models"
import { GoogleGenerativeAI } from '@google/generative-ai'

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
  console.log('🎯 [DEBUG] POST /api/generate-image endpoint called')
  
  try {
    const { prompt, userId } = await request.json()
    console.log('🎯 [DEBUG] Request data:', { prompt: prompt?.substring(0, 50), userId })

    if (!prompt) {
      console.log('❌ [DEBUG] No prompt provided')
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
    // Usar solo el modelo Nano Banana para generación de imágenes
    const modelId = 'openrouter:google/gemini-2.5-flash-image-preview'
    console.log('🎯 [DEBUG] Using modelId:', modelId)

    // Obtener la configuración del modelo
    const modelConfig = MODELS.find(m => m.id === modelId)
    console.log('🎯 [DEBUG] Model config found:', !!modelConfig)
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Image generation model not found" },
        { status: 500 }
      )
    }

    // Solo aplicar daily limit para este modelo de imagen
    if (user?.id) {
      const limitCheck = await dailyLimits.canUseModel(user.id, modelId, modelConfig)
      if (!limitCheck.canUse) {
        return NextResponse.json(
          { 
            error: `Daily limit reached for Nano Banana. You have used all ${limitCheck.limit} images for today. Try again tomorrow.`,
            limitReached: true,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining
          },
          { status: 429 }
        )
      }
    }

    // Get Google API key (accept both legacy GOOGLE_API_KEY and preferred GOOGLE_GENERATIVE_AI_API_KEY)
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY
    if (!googleApiKey) {
      console.log('❌ [DEBUG] Google API key not configured (tried GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY)')
      return NextResponse.json(
        { error: "Missing Google Gemini API key. Set env var GOOGLE_GENERATIVE_AI_API_KEY." },
        { status: 500 }
      )
    }

    // Initialize Google Gemini AI
    const genAI = new GoogleGenerativeAI(googleApiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" })

    // Enhanced prompt for better image generation in English (works better according to docs)
    const enhancedPrompt = `Generate a high-quality image: ${prompt}. Make it visually appealing, well-composed, and detailed.`

    console.log('🎨 Generating image with Google Gemini SDK:', enhancedPrompt)

    // Generate image using official Google Gemini SDK
    let imageData
    
    try {
      console.log('🎯 [DEBUG] Making direct call to Google Gemini API')
      
      const result = await model.generateContent([enhancedPrompt])
      const response = await result.response
      
      console.log('🎯 [DEBUG] Google API response received')
      console.log('🔍 Response candidates length:', response.candidates?.length || 0)
      
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0]
        console.log('🔍 Candidate content parts:', candidate.content?.parts?.length || 0)
        
        // Look for image data in the response parts
        for (const part of candidate.content?.parts || []) {
          console.log('🔍 Part type:', typeof part)
          console.log('🔍 Part keys:', Object.keys(part))
          
          if (part.text) {
            console.log('🔍 Part text (first 100 chars):', part.text.substring(0, 100))
          }
          
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ Found image data in inlineData')
            imageData = part.inlineData.data
            break
          }
        }
        
        if (!imageData) {
          console.error('❌ No image data found in response parts')
          throw new Error('No image data found in Gemini response')
        }
      } else {
        console.error('❌ [DEBUG] No candidates in response')
        throw new Error('No candidates in Gemini response')
      }
      
    } catch (modelError) {
      console.error('Google Gemini API failed:', modelError)
      throw new Error(`Image generation model failed: ${modelError instanceof Error ? modelError.message : 'Unknown model error'}`)
    }

    // Validate that we have meaningful image data
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Model returned invalid image data')
    }

    // The imageData from Google Gemini should be base64 encoded
    let imageUrl = ''
    
    if (imageData.startsWith('data:image')) {
      // Already a data URL
      imageUrl = imageData
    } else {
      // Raw base64 data, add proper data URL prefix
      imageUrl = `data:image/png;base64,${imageData}`
    }

    console.log('✅ [DEBUG] Successfully processed image data, length:', imageData.length)

    // Final validation that we have a valid image URL
    if (!imageUrl || imageUrl === 'data:image/png;base64,') {
      throw new Error('Failed to create valid image data URL')
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

    const modelId = 'gemini-2.5-flash-image-preview'
    
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
