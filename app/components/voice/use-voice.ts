'use client'

import { useVoiceRailway } from './use-voice-railway'
import { useVoiceWebRTC } from './use-voice-webrtc'

/**
 * Main voice hook - uses Railway WebSocket as primary with WebRTC as fallback
 * 
 * Railway WebSocket (Default):
 * - More reliable in restrictive networks (corporate, VPN, etc.)
 * - Works on all networks that allow WebSocket (TCP-based)
 * - Uses Railway proxy server to add authentication headers
 * 
 * WebRTC (Fallback - set NEXT_PUBLIC_VOICE_TRANSPORT=webrtc):
 * - Direct browser-to-OpenAI connection
 * - Lower latency when network allows
 * - Requires STUN servers for NAT traversal
 * - May fail on restrictive networks
 */
export function useVoice() {
  const transport = process.env.NEXT_PUBLIC_VOICE_TRANSPORT?.toLowerCase()
  
  if (transport === 'webrtc') {
    console.log('🎯 Using WebRTC transport (experimental)')
    return useVoiceWebRTC()
  }
  
  // Default to Railway WebSocket (most reliable)
  console.log('🚂 Using Railway WebSocket transport (recommended)')
  return useVoiceRailway()
}
