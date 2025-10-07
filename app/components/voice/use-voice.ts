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
    if (openai.error && openai.error.message.includes('experiencing issues')) {
      console.warn('⚠️ OpenAI failed, switching to ElevenLabs fallback')
      setProvider('elevenlabs')
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
    if (provider === 'elevenlabs') {
      return elevenlabs.endSession()
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
