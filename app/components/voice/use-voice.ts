'use client'

import { useVoiceWebRTC } from './use-voice-webrtc'

/**
 * Main voice hook - uses WebRTC implementation with OpenAI Realtime API
 * This is the most stable and feature-complete implementation
 */
export function useVoice() {
  return useVoiceWebRTC()
}
