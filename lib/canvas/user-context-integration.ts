/**
 * User Context Integration for Drawing Interactions
 * 
 * This module integrates with Cleo's RAG system to provide context-aware
 * drawing interactions that leverage user's personal information, preferences,
 * and communication style.
 */

import { useUser } from '@/lib/user-store/provider'
import { useUserPreferences } from '@/lib/user-preference-store/provider'
import { useState, useEffect } from 'react'

export interface UserContextProfile {
  // Basic user info
  userId: string
  name?: string
  language?: string
  
  // Communication preferences
  communicationStyle?: 'formal' | 'casual' | 'friendly' | 'enthusiastic'
  preferredTopics?: string[]
  
  // Drawing & creative preferences
  artisticInterests?: string[]
  favoriteColors?: string[]
  preferredCreativeActivities?: string[]
  
  // Context from RAG documents
  personalInterests?: string[]
  professionalBackground?: string[]
  goals?: string[]
  hobbies?: string[]
}

/**
 * Hook to gather comprehensive user context for drawing interactions
 */
export function useUserDrawingContext() {
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const [contextProfile, setContextProfile] = useState<UserContextProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Build user context profile
  useEffect(() => {
    if (!user?.id) return

    const buildContextProfile = async () => {
      setIsLoading(true)
      
      try {
        const profile: UserContextProfile = {
          userId: user.id,
          name: user.email || undefined, // Use email as fallback identifier
          
          // Infer communication style from user preferences
          communicationStyle: inferCommunicationStyle(user, preferences),
          
          // Basic context that will be enriched by RAG
          language: 'en', // This could be detected from previous interactions
        }
        
        setContextProfile(profile)
      } catch (error) {
        console.error('Failed to build user context profile:', error)
        setContextProfile({
          userId: user.id,
          communicationStyle: 'friendly'
        })
      } finally {
        setIsLoading(false)
      }
    }

    buildContextProfile()
  }, [user, preferences])

  return {
    contextProfile,
    isLoading,
    hasContext: !!contextProfile
  }
}

/**
 * Infer communication style from user data and preferences
 */
function inferCommunicationStyle(
  user: any,
  preferences: any
): UserContextProfile['communicationStyle'] {
  // This could be enhanced with ML or pattern recognition
  // For now, use simple heuristics
  
  if (preferences?.promptSuggestions === false) {
    return 'formal' // Users who disable suggestions might prefer more formal interactions
  }
  
  if (preferences?.showToolInvocations === true) {
    return 'enthusiastic' // Users interested in technical details might enjoy enthusiastic explanations
  }
  
  return 'friendly' // Default to friendly
}

/**
 * Generate context hints for RAG retrieval based on drawing interaction
 */
export function generateRAGContextHints(
  contextType: string,
  drawingAnalysis?: any
): string[] {
  const hints: string[] = []
  
  // Add interaction-specific context hints
  switch (contextType) {
    case 'analyze':
      hints.push(
        'artistic preferences',
        'creative interests',
        'visual interpretation style',
        'color preferences',
        'artistic background'
      )
      break
      
    case 'play':
      hints.push(
        'favorite games',
        'hobbies',
        'entertainment preferences',
        'interactive activities',
        'fun interests'
      )
      break
      
    case 'brainstorm':
      hints.push(
        'creative projects',
        'professional goals',
        'interests',
        'innovation style',
        'problem-solving approach'
      )
      break
      
    case 'improve':
      hints.push(
        'learning style',
        'skill development goals',
        'artistic techniques',
        'improvement areas',
        'growth mindset'
      )
      break
      
    case 'story':
      hints.push(
        'favorite genres',
        'storytelling preferences',
        'narrative interests',
        'imagination style',
        'creative writing'
      )
      break
  }
  
  // Add drawing-specific context if available
  if (drawingAnalysis?.dominantColors?.length > 0) {
    hints.push(`color ${drawingAnalysis.dominantColors[0]} preferences`)
  }
  
  if (drawingAnalysis?.complexity === 'complex') {
    hints.push('detailed artistic work', 'complex creative projects')
  }
  
  return hints
}

/**
 * Smart interaction history to avoid repetitive responses
 */
export class DrawingInteractionHistory {
  private static readonly STORAGE_KEY = 'drawing_interaction_history'
  private static readonly MAX_HISTORY = 50
  
  static addInteraction(contextType: string, userResponse?: string) {
    try {
      const history = this.getHistory()
      history.push({
        contextType,
        timestamp: Date.now(),
        userResponse: userResponse?.slice(0, 100), // Store first 100 chars for pattern recognition
      })
      
      // Keep only recent interactions
      const recentHistory = history
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.MAX_HISTORY)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentHistory))
    } catch (error) {
      console.error('Failed to save drawing interaction history:', error)
    }
  }
  
  static getHistory(): Array<{
    contextType: string
    timestamp: number
    userResponse?: string
  }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load drawing interaction history:', error)
      return []
    }
  }
  
  static getRecentContexts(hours = 24): string[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.getHistory()
      .filter(item => item.timestamp > cutoff)
      .map(item => item.contextType)
  }
  
  static shouldSuggestVariety(): boolean {
    const recent = this.getRecentContexts(72) // Last 3 days
    const contextCounts = recent.reduce((acc, context) => {
      acc[context] = (acc[context] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Suggest variety if any context appears more than 3 times
    return Object.values(contextCounts).some(count => count > 3)
  }
}

/**
 * Enhanced error handling and fallbacks for user context
 */
export function getContextFallback(userId?: string): UserContextProfile {
  return {
    userId: userId || 'anonymous',
    communicationStyle: 'friendly',
    language: 'en'
  }
}

/**
 * Utility to format context for RAG prompts
 */
export function formatContextForRAG(
  contextProfile: UserContextProfile,
  contextHints: string[]
): string {
  const formatParts: string[] = []
  
  if (contextProfile.name) {
    formatParts.push(`User's name: ${contextProfile.name}`)
  }
  
  if (contextProfile.communicationStyle) {
    formatParts.push(`Preferred communication style: ${contextProfile.communicationStyle}`)
  }
  
  if (contextHints.length > 0) {
    formatParts.push(`Relevant context areas: ${contextHints.join(', ')}`)
  }
  
  return formatParts.join('. ')
}
