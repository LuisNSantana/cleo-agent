/**
 * Voice Mode - Pure WebSocket Implementation
 * Works with Railway proxy server for direct OpenAI Realtime API connection
 */

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

export function useVoiceWS(): UseVoiceReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [cost] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Duration tracking
  useEffect(() => {
    const id = setInterval(() => {
      if (startTimeRef.current && (status === 'active' || status === 'listening' || status === 'speaking')) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(secs)
      }
    }, 500)
    return () => clearInterval(id)
  }, [status])

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    
    const updateLevel = () => {
      if (!analyserRef.current || status === 'idle') return

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioLevel(average / 255)

      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }, [status])

  const startSession = useCallback(async (chatId?: string) => {
    try {
      setError(null)
      setStatus('connecting')
      console.log('🎤 Starting WebSocket voice session...')

      // Get Railway proxy URL from environment
      const wsProxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL
      if (!wsProxyUrl) {
        throw new Error('NEXT_PUBLIC_WS_PROXY_URL no está configurada')
      }

      console.log('🔗 Connecting to Railway proxy:', wsProxyUrl)

      // Request microphone access
      console.log('🎤 Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 24000 // OpenAI prefers 24kHz
        } 
      })
      mediaStreamRef.current = stream
      console.log('✅ Microphone access granted')

      // Setup audio context for visualization
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Connect to Railway WebSocket proxy
      const model = 'gpt-4o-mini-realtime-preview-2024-12-17'
      const wsUrl = wsProxyUrl.includes('?') 
        ? `${wsProxyUrl}&model=${encodeURIComponent(model)}`
        : `${wsProxyUrl}?model=${encodeURIComponent(model)}`
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected to Railway proxy')
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()

        // Send session configuration immediately (like the working version)
        console.log('📤 Sending session.update...')
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              silence_duration_ms: 500
            },
            instructions: 'You are a helpful AI assistant. Keep responses concise and natural for voice conversation.',
            voice: 'alloy',
            modalities: ['text', 'audio'],
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }))

        // Start streaming audio from microphone immediately
        console.log('🎤 Starting audio stream...')
        startAudioStreaming(stream, ws)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📨 Received:', message.type)
          
          // Handle different event types
          switch (message.type) {
            case 'session.created':
              console.log('✅ Session created:', message.session?.id)
              break
            
            case 'session.updated':
              console.log('✅ Session updated - ready to receive audio')
              break
            
            case 'input_audio_buffer.speech_started':
              console.log('🎤 User started speaking')
              setStatus('speaking')
              break
            
            case 'input_audio_buffer.speech_stopped':
              console.log('🎤 User stopped speaking')
              setStatus('listening')
              break
            
            case 'response.audio.delta':
            case 'response.audio_transcript.delta':
              setStatus('active')
              break
            
            case 'response.audio.done':
            case 'response.done':
              console.log('✅ Response completed')
              setStatus('listening')
              break
            
            case 'conversation.item.input_audio_transcription.completed':
              console.log('📝 User transcript:', message.transcript)
              break
            
            case 'error':
              console.error('❌ OpenAI Error:', {
                type: message.error?.type,
                code: message.error?.code,
                message: message.error?.message,
                param: message.error?.param,
                event_id: message.error?.event_id
              })
              setError(new Error(message.error?.message || 'Server error'))
              setStatus('error')
              break
            
            default:
              // Log unknown message types for debugging
              if (!message.type.includes('delta') && !message.type.includes('done')) {
                console.log('ℹ️ Unhandled message type:', message.type)
              }
              break
          }
        } catch (err) {
          // Might receive non-JSON pings, ignore
          console.log('⚠️ Non-JSON message received (probably ping/pong)')
        }
      }

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event)
        setError(new Error('WebSocket connection error'))
        setStatus('error')
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed')
        console.log('  Code:', event.code)
        console.log('  Reason:', event.reason || '(no reason provided)')
        console.log('  Clean:', event.wasClean)
        
        if (status !== 'idle') {
          setStatus('idle')
        }
      }

    } catch (err: any) {
      console.error('❌ Voice WS error:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setStatus('error')
    }
  }, [monitorAudioLevel, status])

  const startAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) {
      console.error('❌ No audio track found')
      return
    }

    console.log('🎤 Audio track:', {
      enabled: audioTrack.enabled,
      muted: audioTrack.muted,
      readyState: audioTrack.readyState
    })

    try {
      // Create MediaRecorder to stream audio
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      })
      mediaRecorderRef.current = mediaRecorder

      let chunkCount = 0

      mediaRecorder.ondataavailable = (event) => {
        chunkCount++
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          // Log every 10th chunk to avoid spam
          if (chunkCount % 10 === 0) {
            console.log(`📤 Sending audio chunk #${chunkCount}, size: ${event.data.size} bytes`)
          }
          
          // Convert to base64 and send
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1]
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            }))
          }
          reader.readAsDataURL(event.data)
        } else if (ws.readyState !== WebSocket.OPEN) {
          console.warn('⚠️ WebSocket not open, cannot send audio')
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event)
      }

      mediaRecorder.onstart = () => {
        console.log('✅ MediaRecorder started')
      }

      mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder stopped')
      }

      // Send audio chunks every 100ms
      mediaRecorder.start(100)
      console.log('🎤 MediaRecorder configured and started')
    } catch (err) {
      console.error('❌ Failed to start MediaRecorder:', err)
    }
  }

  const endSession = useCallback(async () => {
    try {
      console.log('🛑 Stopping WebSocket voice session...')

      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
      }

      // Disconnect analyser
      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      setStatus('idle')
      setAudioLevel(0)
      setDuration(0)
      setIsMuted(false)
    } catch (err) {
      console.error('❌ Error ending session:', err)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const stream = mediaStreamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession()
    }
  }, [endSession])

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
