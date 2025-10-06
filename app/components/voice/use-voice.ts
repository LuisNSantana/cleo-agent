'use client'

import { useVoiceWebRTC } from './use-voice-webrtc'
import { useVoiceWS } from './use-voice-ws'

export function useVoice() {
  const transport = (process.env.NEXT_PUBLIC_VOICE_TRANSPORT || 'ws').toLowerCase()
  if (transport === 'http') {
    return useVoiceWebRTC()
  }
  // default to ws
  return useVoiceWS()
}
