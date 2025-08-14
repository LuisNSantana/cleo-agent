/**
 * Context-Aware Drawing Prompts System
 * 
 * This system leverages Cleo's RAG knowledge and user preferences to create
 * intelligent, personalized prompts for drawing interactions that encourage
 * natural conversation flow and deeper user engagement.
 */

import { type UserPreferences } from '@/lib/user-preference-store/provider'
import { type UserProfile } from '@/lib/user/types'

export type DrawingContextType = 'analyze' | 'play' | 'brainstorm' | 'improve' | 'story' | 'quick' | 'custom'

export interface ContextualPromptOptions {
  user?: UserProfile | null
  preferences?: UserPreferences
  chatHistory?: Array<{ role: string; content: string }>
  userLanguage?: string
  drawingContext?: {
    hasShapes: boolean
    hasStrokes: boolean
    complexity: 'simple' | 'moderate' | 'complex'
    dominantColors: string[]
  }
}

/**
 * Generates context-aware prompts that adapt to user's communication style,
 * preferences, and known interests from their RAG documents.
 */
export class ContextAwarePromptGenerator {
  
  /**
   * Generate an intelligent prompt that encourages natural conversation
   * and leverages user context from RAG system
   */
  static generatePrompt(
    context: DrawingContextType, 
    options: ContextualPromptOptions = {},
    customPrompt?: string
  ): string {
    const { user, preferences, userLanguage, drawingContext } = options
    
    // Detect user's language preference or default to English
    const isSpanish = userLanguage?.includes('es') || userLanguage?.includes('spanish') || false
    
    // Base context that will be enriched by RAG
    const basePrompts = this.getBasePrompts(isSpanish)
    
    if (context === 'custom' && customPrompt) {
      return this.enhanceCustomPrompt(customPrompt, options)
    }
    
    const prompt = basePrompts[context]
    return this.personalizePrompt(prompt, options)
  }
  
  /**
   * Enhanced custom prompt that includes context hints for better RAG retrieval
   */
  private static enhanceCustomPrompt(customPrompt: string, options: ContextualPromptOptions): string {
    const { drawingContext } = options
    
    // Add context clues that help RAG understand the user's intent
    let enhancedPrompt = `🎨 ${customPrompt}`
    
    // Add drawing complexity context to help Cleo understand better
    if (drawingContext) {
      const complexityHint = drawingContext.complexity === 'complex' 
        ? 'This is a detailed drawing with multiple elements. '
        : drawingContext.complexity === 'simple' 
        ? 'This is a simple drawing. '
        : 'This drawing has moderate complexity. '
      
      enhancedPrompt += ` ${complexityHint}`
    }
    
    return enhancedPrompt
  }
  
  /**
   * Personalize prompts based on user context and RAG knowledge
   */
  private static personalizePrompt(basePrompt: string, options: ContextualPromptOptions): string {
    const { user, preferences, drawingContext } = options
    
    // Add context that will help RAG retrieve relevant user information
    let personalizedPrompt = basePrompt
    
    // Simplified prompt without technical details - just the core message
    
    // Add conversation starters that encourage user engagement
    personalizedPrompt += this.getConversationStarter(options)
    
    return personalizedPrompt
  }
  
  /**
   * Get base prompts in user's preferred language
   */
  private static getBasePrompts(isSpanish: boolean) {
    if (isSpanish) {
      return {
        analyze: 'Cleo, analiza este dibujo que acabo de crear. ¿Qué elementos ves y qué podrían representar?',
        play: 'Cleo, basándote en mi dibujo, ¿qué juego divertido podríamos crear juntos?',
        brainstorm: 'Cleo, usa mi dibujo como inspiración para generar ideas creativas.',
        improve: 'Cleo, ¿cómo podría mejorar este dibujo o qué elementos adicionales podrían enriquecerlo?',
        story: 'Cleo, crea una historia fascinante basada en lo que ves en mi dibujo.',
        quick: 'Cleo, ¿qué opinas de mi dibujo?',
        custom: 'Cleo, mira mi dibujo y ayúdame con lo que necesito.'
      }
    }
    
    return {
      analyze: 'Cleo, analyze this drawing I just created. What elements do you see and what might they represent?',
      play: 'Cleo, based on my drawing, what fun game could we create together?',
      brainstorm: 'Cleo, use my drawing as inspiration to generate creative ideas.',
      improve: 'Cleo, how could I improve this drawing or what additional elements might enrich it?',
      story: 'Cleo, create a fascinating story based on what you see in my drawing.',
      quick: 'Cleo, what do you think of my drawing?',
      custom: 'Cleo, look at my drawing and help me with what I need.'
    }
  }
  
  /**
   * Add conversation starters that encourage engagement and leverage user context
   */
  private static getConversationStarter(options: ContextualPromptOptions): string {
    const { user, preferences } = options
    
    // These starters help RAG retrieve relevant user context and encourage dialogue
    const starters = [
      ' Feel free to relate this to any of my interests or preferences you know about.',
      ' Consider my personal style and what you know about me when analyzing this.',
      ' You can reference any relevant information from our previous conversations.',
      ' Think about how this connects to my goals or projects you might know about.',
      ' Feel free to be creative and personalize your response based on what you know about me.'
    ]
    
    // Randomly select a starter to keep interactions fresh
    return starters[Math.floor(Math.random() * starters.length)]
  }
  
  /**
   * Analyze drawing content to provide context for better prompting
   */
  static analyzeDrawingContext(canvasState: any): ContextualPromptOptions['drawingContext'] {
    const { paths, shapes } = canvasState
    
    const hasShapes = shapes && shapes.length > 0
    const hasStrokes = paths && paths.length > 0
    
    // Determine complexity based on content
    const totalElements = (paths?.length || 0) + (shapes?.length || 0)
    const complexity = totalElements > 10 ? 'complex' : totalElements > 3 ? 'moderate' : 'simple'
    
    // Extract dominant colors (this could be enhanced with actual color analysis)
    const dominantColors: string[] = []
    if (paths?.length > 0) {
      // Simple color extraction - could be enhanced with actual color analysis
      try {
        const colors: string[] = []
        paths.forEach((path: any) => {
          if (path.color && typeof path.color === 'string') {
            colors.push(path.color)
          }
        })
        const uniqueColors = [...new Set(colors)]
        dominantColors.push(...uniqueColors.slice(0, 3))
      } catch (error) {
        // Fallback if color extraction fails
        dominantColors.push('#000000')
      }
    }
    
    return {
      hasShapes,
      hasStrokes,
      complexity,
      dominantColors
    }
  }
  
  /**
   * Generate prompts that encourage specific types of user engagement
   */
  static generateEngagementPrompt(
    context: DrawingContextType,
    options: ContextualPromptOptions = {}
  ): string {
    const basePrompt = this.generatePrompt(context, options)
    
    // Add engagement enhancers based on context
    const engagementEnhancers = {
      analyze: " What thoughts or emotions does this drawing evoke for you?",
      play: " What rules should our game have, and how can we make it even more fun?",
      brainstorm: " What direction interests you most, and how can we expand on it?",
      improve: " What's your vision for the final result?",
      story: " Should this be an adventure, mystery, or something else entirely?",
      quick: " Tell me about it!",
      custom: " Let me know how I can best help you with this!"
    }
    
    return basePrompt + engagementEnhancers[context]
  }
}

/**
 * Smart prompt selection based on user behavior patterns
 */
export class SmartPromptSelector {
  
  /**
   * Select the most appropriate prompt type based on user history and context
   */
  static selectOptimalPrompt(
    userHistory: Array<{ context: DrawingContextType; timestamp: number }>,
    currentDrawingContext: ContextualPromptOptions['drawingContext']
  ): DrawingContextType {
    
    // Avoid repetitive interactions
    const recentContexts = userHistory
      .filter(h => Date.now() - h.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .map(h => h.context)
    
    const availableContexts: DrawingContextType[] = ['analyze', 'play', 'brainstorm', 'improve', 'story', 'quick']
    
    // Filter out recently used contexts to encourage variety
    const freshContexts = availableContexts.filter(
      context => !recentContexts.includes(context) || recentContexts.filter(c => c === context).length < 2
    )
    
    // Select based on drawing complexity
    if (currentDrawingContext?.complexity === 'complex') {
      return freshContexts.includes('analyze') ? 'analyze' : freshContexts[0] || 'analyze'
    }
    
    if (currentDrawingContext?.complexity === 'simple') {
      return freshContexts.includes('play') ? 'play' : freshContexts[0] || 'play'
    }
    
    // Default to analyze for moderate complexity
    return freshContexts.includes('brainstorm') ? 'brainstorm' : freshContexts[0] || 'analyze'
  }
}
