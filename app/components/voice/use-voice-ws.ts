'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceStatus = 'idle' | 'connecting' | 'active' | 'listening' | 'speaking' | 'error'

export interface UseVoiceReturn {
  startSession: (chatId?: string) => Promise<void>
  endSession: () => Promise<void>
  toggleMute: () => void
  status: VoiceStatus
  error: Error | null
  isMuted: boolean
  isActive: boolean
  audioLevel: number
  duration: number
  cost: number
}

// Minimal WS-based implementation compatible with the UI expectations
export function useVoiceWS(): UseVoiceReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [cost] = useState(0)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const stopMeters = useRef<() => void>(() => {})

  useEffect(() => {
    const id = setInterval(() => {
      if (startTimeRef.current && (status === 'active' || status === 'listening' || status === 'speaking')) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(secs)
      }
    }, 500)
    return () => clearInterval(id)
  }, [status])

  const monitorAudioLevel = () => {
    try {
      const stream = localStreamRef.current
      if (!stream) return
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser

      let raf = 0
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setAudioLevel(Math.min(1, avg / 255))
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      stopMeters.current = () => cancelAnimationFrame(raf)
    } catch {}
  }

  const startSession = useCallback(async (chatId?: string) => {
    try {
      setError(null)
      setStatus('connecting')

      const wsUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL
      if (!wsUrl) throw new Error('NEXT_PUBLIC_WS_PROXY_URL no está configurada')

      // Prepare local media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      // PeerConnection for audio via WebRTC transport (negotiated over WS signaling)
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      })
      pcRef.current = pc

      // Remote audio playback
      const audio = document.createElement('audio')
      audio.autoplay = true
      pc.ontrack = (e) => { audio.srcObject = e.streams[0] }

      // Add mic
      const track = stream.getAudioTracks()[0]
      if (track && track.enabled === false) track.enabled = true
      pc.addTrack(track, stream)

      // Data channel (optional; many flows rely purely on WS for control)
      const dc = pc.createDataChannel('oai-events')
      dc.onopen = () => {
        // Optional: can send session.update here via WS in parallel
      }

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Connect WebSocket to proxy (append model if needed)
      const model = 'gpt-4o-mini-realtime-preview-2024-12-17'
      const url = wsUrl.includes('?') ? `${wsUrl}&model=${encodeURIComponent(model)}` : `${wsUrl}?model=${encodeURIComponent(model)}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        // Send WebRTC SDP offer over WS signaling
        ws.send(JSON.stringify({ type: 'webrtc.offer', sdp: offer.sdp }))
      }

      ws.onerror = (evt: Event | any) => {
        setError(new Error(evt?.message || 'WebSocket error'))
        setStatus('error')
      }

      ws.onmessage = async (msg) => {
        try {
          const data = JSON.parse(msg.data)
          if (data.type === 'webrtc.answer' && data.sdp) {
            await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
            startTimeRef.current = Date.now()
            monitorAudioLevel()
            setStatus('listening')
          }
          // Forward other events to UI states if desired
          if (data.type === 'response.output_audio.delta') {
            setStatus('speaking')
          }
          if (data.type === 'response.completed') {
            setStatus('listening')
          }
        } catch (e) {
          // Might receive non-JSON pings
        }
      }

      ws.onclose = () => {
        // Cleanup when server closes
        setStatus('idle')
      }

    } catch (err: any) {
      console.error('Voice WS error:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setStatus('error')
    }
  }, [])

  const endSession = useCallback(async () => {
    try {
      stopMeters.current?.()
      analyserRef.current?.disconnect()
      analyserRef.current = null

      pcRef.current?.getSenders().forEach(s => s.track?.stop())
      pcRef.current?.close()
      pcRef.current = null

      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null

      wsRef.current?.close()
      wsRef.current = null

      setStatus('idle')
      setAudioLevel(0)
      setDuration(0)
      setIsMuted(false)
    } catch {}
  }, [])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }, [])

  const isActive = status === 'connecting' || status === 'listening' || status === 'speaking' || status === 'active'

  return {
    startSession,
    endSession,
    toggleMute,
    status,
    error,
    isMuted,
    isActive,
    audioLevel,
    duration,
    cost,
  }
}
