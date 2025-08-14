/**
 * RAG-Enhanced Drawing Context System
 * 
 * This system creates intelligent context for drawing interactions by:
 * 1. Analyzing user's RAG documents for relevant creative preferences
 * 2. Building dynamic prompts that leverage user's personal context
 * 3. Learning from interaction patterns to improve future responses
 * 4. Providing Cleo with rich context about the user's creative style
 */

import { useEffect, useState } from 'react'

export interface DrawingRAGContext {
  userCreativeProfile?: {
    artisticInterests: string[]
    preferredStyles: string[]
    creativeGoals: string[]
    inspirationSources: string[]
  }
  personalContext?: {
    name: string
    communicationStyle: string
    interests: string[]
    background: string[]
  }
  interactionHistory?: {
    frequentContexts: string[]
    preferredInteractionTypes: string[]
    responsePatterns: string[]
  }
}

/**
 * Hook to enhance drawing interactions with RAG context
 */
export function useRAGEnhancedDrawing(userId?: string) {
  const [ragContext, setRAGContext] = useState<DrawingRAGContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return

    const buildRAGContext = async () => {
      setIsLoading(true)
      try {
        // This would integrate with the existing RAG system
        // For now, we'll create a framework that can be enhanced
        const context: DrawingRAGContext = {
          userCreativeProfile: {
            artisticInterests: [], // Would be populated from RAG documents
            preferredStyles: [],   // Would be learned from interactions
            creativeGoals: [],     // Would be extracted from user documents
            inspirationSources: [] // Would be identified from user content
          },
          personalContext: {
            name: 'User',           // Would come from RAG documents
            communicationStyle: 'friendly', // Would be inferred from chat history
            interests: [],          // Would be extracted from documents
            background: []          // Would be built from user profile
          },
          interactionHistory: {
            frequentContexts: [],      // Would track most used drawing contexts
            preferredInteractionTypes: [], // Would learn from user responses
            responsePatterns: []       // Would analyze successful interactions
          }
        }
        
        setRAGContext(context)
      } catch (error) {
        console.error('Failed to build RAG context for drawing:', error)
      } finally {
        setIsLoading(false)
      }
    }

    buildRAGContext()
  }, [userId])

  return {
    ragContext,
    isLoading,
    hasRAGContext: !!ragContext
  }
}

/**
 * Generate context-rich prompts that help RAG retrieve relevant information
 */
export function generateRAGAwarePrompt(
  basePrompt: string,
  ragContext: DrawingRAGContext | null,
  drawingAnalysis: any
): string {
  if (!ragContext) return basePrompt

  // Build context clues that will help RAG retrieve relevant user information
  const contextClues: string[] = []

  // Add creative context clues
  if (ragContext.userCreativeProfile?.artisticInterests?.length) {
    contextClues.push(`Consider my artistic interests in ${ragContext.userCreativeProfile.artisticInterests.join(', ')}.`)
  }

  // Add personal context clues
  if (ragContext.personalContext?.interests?.length) {
    contextClues.push(`Reference my interests in ${ragContext.personalContext.interests.slice(0, 3).join(', ')}.`)
  }

  // Add drawing-specific context
  if (drawingAnalysis?.dominantColors?.length) {
    contextClues.push(`The drawing uses colors like ${drawingAnalysis.dominantColors.join(', ')}.`)
  }

  if (drawingAnalysis?.complexity) {
    contextClues.push(`This is a ${drawingAnalysis.complexity} drawing with ${drawingAnalysis.hasShapes ? 'geometric shapes' : ''} ${drawingAnalysis.hasStrokes ? 'freehand elements' : ''}.`)
  }

  // Combine base prompt with context clues
  const enhancedPrompt = [
    basePrompt,
    ...contextClues,
    'Feel free to personalize your response based on what you know about me from our previous conversations and any documents I\'ve shared.'
  ].join(' ')

  return enhancedPrompt
}

/**
 * System to learn and improve from user interactions
 */
export class DrawingInteractionLearning {
  private static readonly LEARNING_STORAGE_KEY = 'drawing_interaction_learning'

  /**
   * Record successful interaction patterns
   */
  static recordSuccessfulInteraction(
    contextType: string,
    userResponse: string,
    cleoResponse: string,
    userSatisfaction?: 'positive' | 'neutral' | 'negative'
  ) {
    try {
      const learningData = this.getLearningData()
      
      const interaction = {
        contextType,
        userResponse: userResponse.slice(0, 200), // Store snippet for pattern recognition
        cleoResponse: cleoResponse.slice(0, 200),
        userSatisfaction,
        timestamp: Date.now(),
        success: userSatisfaction === 'positive' || !userSatisfaction // Default to successful if not specified
      }

      learningData.interactions.push(interaction)

        // Keep only recent interactions (last 100)
        if (learningData.interactions.length > 100) {
          learningData.interactions = learningData.interactions
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, 100)
        }      // Update patterns
      this.updateLearningPatterns(learningData)
      
      localStorage.setItem(this.LEARNING_STORAGE_KEY, JSON.stringify(learningData))
    } catch (error) {
      console.error('Failed to record interaction learning:', error)
    }
  }

  /**
   * Get learned patterns for better future interactions
   */
  static getLearningInsights(): {
    preferredContexts: string[]
    successfulPromptPatterns: string[]
    communicationPreferences: string[]
  } {
    try {
      const learningData = this.getLearningData()
      return {
        preferredContexts: learningData.patterns.preferredContexts || [],
        successfulPromptPatterns: learningData.patterns.successfulPrompts || [],
        communicationPreferences: learningData.patterns.communicationStyle || []
      }
    } catch (error) {
      console.error('Failed to get learning insights:', error)
      return {
        preferredContexts: [],
        successfulPromptPatterns: [],
        communicationPreferences: []
      }
    }
  }

  private static getLearningData() {
    try {
      const stored = localStorage.getItem(this.LEARNING_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {
        interactions: [],
        patterns: {
          preferredContexts: [],
          successfulPrompts: [],
          communicationStyle: []
        }
      }
    } catch (error) {
      return {
        interactions: [],
        patterns: {
          preferredContexts: [],
          successfulPrompts: [],
          communicationStyle: []
        }
      }
    }
  }

  private static updateLearningPatterns(learningData: any) {
    const successfulInteractions = learningData.interactions.filter((i: any) => i.success)
    
    // Analyze preferred contexts
    const contextCounts = successfulInteractions.reduce((acc: any, interaction: any) => {
      acc[interaction.contextType] = (acc[interaction.contextType] || 0) + 1
      return acc
    }, {})
    
    learningData.patterns.preferredContexts = Object.entries(contextCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([context]: any) => context)

    // Analyze successful prompt patterns (basic keyword extraction)
    const successfulPrompts = successfulInteractions
      .map((i: any) => i.userResponse)
      .join(' ')
      .toLowerCase()
    
    // Simple pattern recognition - this could be enhanced with NLP
    const commonWords = successfulPrompts
      .split(/\W+/)
      .filter((word: string) => word.length > 3)
      .reduce((acc: any, word: string) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      }, {})
    
    learningData.patterns.successfulPrompts = Object.entries(commonWords)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 10)
      .map(([word]: any) => word)
  }
}

/**
 * Smart prompt suggestion system based on learned patterns
 */
export class SmartPromptSuggestions {
  
  /**
   * Generate intelligent suggestions based on user history and current context
   */
  static generateSuggestions(
    drawingAnalysis: any,
    userContext: DrawingRAGContext | null
  ): Array<{
    context: string
    suggestion: string
    reason: string
  }> {
    const suggestions = []
    const insights = DrawingInteractionLearning.getLearningInsights()

    // Suggest based on drawing complexity
    if (drawingAnalysis?.complexity === 'complex') {
      suggestions.push({
        context: 'analyze',
        suggestion: 'Analyze the details and meaning',
        reason: 'Complex drawings often benefit from detailed analysis'
      })
    }

    if (drawingAnalysis?.complexity === 'simple') {
      suggestions.push({
        context: 'play',
        suggestion: 'Turn this into a fun game',
        reason: 'Simple drawings are great starting points for creative games'
      })
    }

    // Suggest based on user preferences
    if (insights.preferredContexts.includes('story')) {
      suggestions.push({
        context: 'story',
        suggestion: 'Create a story from this drawing',
        reason: 'You often enjoy storytelling interactions'
      })
    }

    // Suggest based on colors
    if (drawingAnalysis?.dominantColors?.includes('#FF0000')) {
      suggestions.push({
        context: 'brainstorm',
        suggestion: 'Brainstorm bold, energetic ideas',
        reason: 'Red colors suggest energy and passion'
      })
    }

    // Default suggestions if no specific patterns
    if (suggestions.length === 0) {
      suggestions.push(
        {
          context: 'analyze',
          suggestion: 'Analyze my drawing',
          reason: 'Understanding what you\'ve created'
        },
        {
          context: 'improve',
          suggestion: 'Help me improve this',
          reason: 'Learning and growing as an artist'
        }
      )
    }

    return suggestions.slice(0, 3) // Return top 3 suggestions
  }
}
