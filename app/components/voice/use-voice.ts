'use client'

import { useState, useCallback, useEffect } from 'react'
import { useVoiceRailway } from './use-voice-railway'
import { useVoiceWebRTC } from './use-voice-webrtc'
import { useVoiceElevenLabs } from './use-voice-elevenlabs'

/**
 * Main voice hook - uses OpenAI with ElevenLabs fallback
 * 
 * OpenAI Realtime API (Primary):
 * - Railway WebSocket or WebRTC transport
 * - Full conversation context and tools
 * 
 * ElevenLabs Conversational AI (Fallback):
 * - Activates when OpenAI fails with server errors
 * - More reliable voice quality
 * - Uses "Allison" voice (fun, millennial, friendly)
 */
export function useVoice() {
  const [provider, setProvider] = useState<'openai' | 'elevenlabs'>('openai')
  
  const openaiRailway = useVoiceRailway()
  const openaiWebRTC = useVoiceWebRTC()
  const elevenlabs = useVoiceElevenLabs()
  
  // Select OpenAI transport
  const transport = process.env.NEXT_PUBLIC_VOICE_TRANSPORT?.toLowerCase()
  const openai = transport === 'webrtc' ? openaiWebRTC : openaiRailway
  
  // Monitor OpenAI errors and fallback to ElevenLabs
  useEffect(() => {
    if (openai.error) {
      const errorMessage = openai.error.message.toLowerCase()
      // Fallback on server errors or connection issues
      if (errorMessage.includes('experiencing issues') || 
          errorMessage.includes('server error') ||
          errorMessage.includes('connection error') ||
          errorMessage.includes('websocket')) {
        console.warn('⚠️ OpenAI failed, switching to ElevenLabs fallback')
        setProvider('elevenlabs')
      }
    }
  }, [openai.error])
  
  // Wrapper functions to handle provider switching
  const startSession = useCallback(async (chatId?: string) => {
    if (provider === 'elevenlabs') {
      console.log('🎙️ Using ElevenLabs (fallback mode)')
      return elevenlabs.startSession(chatId)
    }
    
    console.log('🤖 Using OpenAI (primary mode)')
    try {
      await openai.startSession(chatId)
    } catch (err) {
      console.warn('⚠️ OpenAI failed, trying ElevenLabs...')
      setProvider('elevenlabs')
      return elevenlabs.startSession(chatId)
    }
  }, [provider, openai, elevenlabs])
  
  const endSession = useCallback(() => {
    // Reset provider to OpenAI for next session after ending
    if (provider === 'elevenlabs') {
      const result = elevenlabs.endSession()
      // Try OpenAI first next time
      setTimeout(() => setProvider('openai'), 100)
      return result
    }
    return openai.endSession()
  }, [provider, openai, elevenlabs])
  
  const toggleMute = useCallback(() => {
    if (provider === 'elevenlabs') {
      return elevenlabs.toggleMute()
    }
    return openai.toggleMute()
  }, [provider, openai, elevenlabs])
  
  // Return active provider's state
  const activeProvider = provider === 'elevenlabs' ? elevenlabs : openai
  
  return {
    ...activeProvider,
    startSession,
    endSession,
    toggleMute,
    provider // Expose current provider for UI
  }
}
