'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceConnectionError, VoiceStreamError } from '@/lib/voice/types'

type VoiceStatus = 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error'

interface UseVoiceSessionReturn {
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

export function useVoiceSession(): UseVoiceSessionReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [cost, setCost] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Audio level monitoring
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

  // Duration tracking
  useEffect(() => {
    if (status === 'active' || status === 'speaking' || status === 'listening') {
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [status])

  const startSession = useCallback(async (chatId?: string) => {
    try {
      setStatus('connecting')
      setError(null)

      // Get OpenAI configuration with chat context
      const configResponse = await fetch('/api/voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!configResponse.ok) {
        throw new Error('Failed to get voice configuration')
      }

      const config = await configResponse.json()

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      })

      mediaStreamRef.current = stream

      // Setup audio context for processing
      const audioContext = new AudioContext({ sampleRate: 24000 })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      
      analyser.fftSize = 256
      source.connect(analyser)
      source.connect(processor)
      processor.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Create voice session in database
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create voice session')
      }

      const { sessionId } = await response.json()
      sessionIdRef.current = sessionId

      // Connect to WebSocket proxy server
      // The proxy adds the Authorization header that browsers cannot set
      const proxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL || 'ws://localhost:8080'
      const wsUrl = `${proxyUrl}?model=${config.model}`
      const ws = new WebSocket(wsUrl)

      wsRef.current = ws

      let sessionReady = false
      
      // Define audio processor function first
      const startAudioProcessor = () => {
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && !isMuted && sessionReady) {
            const inputData = e.inputBuffer.getChannelData(0)
            
            // Convert Float32 to Int16 PCM
            const pcm16 = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]))
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
            }
            
            // Convert to base64
            const base64 = btoa(
              String.fromCharCode(...new Uint8Array(pcm16.buffer))
            )
            
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64
            }))
          }
        }
      }
      
      ws.onopen = async () => {
        console.log('WebSocket opened, waiting for session.created...')
      }

      ws.onmessage = async (event) => {
        try {
          // Handle both Blob and string data
          let messageText: string
          if (event.data instanceof Blob) {
            messageText = await event.data.text()
          } else {
            messageText = event.data
          }
          
          const data = JSON.parse(messageText)
          const eventType = data.type
          
          console.log('Event:', eventType)
          
          // Wait for session.created
          if (eventType === 'session.created' && !sessionReady) {
            console.log('✅ session.created')
            
            // Now configure session with proper authorization
            ws.send(JSON.stringify({
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: config.instructions,
                voice: config.voice,
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1'
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500
                }
              }
            }))
            
            sessionReady = true
            setStatus('listening')
            startTimeRef.current = Date.now()
            monitorAudioLevel()
            
            // Start sending audio
            startAudioProcessor()
            return
          }
          // Handle other event types
          if (eventType === 'session.updated') {
            console.log('✅ session.updated')
          }
          
          if (eventType === 'input_audio_buffer.speech_started') {
            console.log('🎤 User started speaking')
            setStatus('speaking')
          }
          
          if (eventType === 'input_audio_buffer.speech_stopped') {
            console.log('🎤 User stopped speaking')
            setStatus('listening')
          }
          
          if (eventType === 'response.audio.delta' && data.delta) {
            setStatus('speaking')
            
            // Decode and play audio
            const audioData = atob(data.delta)
            const pcm16 = new Int16Array(audioData.length / 2)
            for (let i = 0; i < pcm16.length; i++) {
              pcm16[i] = (audioData.charCodeAt(i * 2) | (audioData.charCodeAt(i * 2 + 1) << 8))
            }
            
            // Play audio (simplified - in production use Web Audio API buffer)
            const audioBlob = new Blob([pcm16], { type: 'audio/pcm' })
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            audio.play().catch(console.error)
          }
          
          if (data.type === 'response.audio.done') {
            setStatus('listening')
          }
          
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('Transcription:', data.transcript)
          }
        } catch (err) {
          console.error('Error processing message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError(new VoiceConnectionError())
        setStatus('error')
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        if (status !== 'idle') {
          setStatus('idle')
        }
      }

    } catch (err) {
      console.error('Voice session error:', err)
      setError(err as Error)
      setStatus('error')
      cleanup()
    }
  }, [monitorAudioLevel, status])

  const endSession = useCallback(async () => {
    try {
      if (sessionIdRef.current) {
        const finalDuration = startTimeRef.current 
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0

        const response = await fetch(`/api/voice/session/${sessionIdRef.current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration_seconds: finalDuration,
            audio_input_tokens: 0, // Would be tracked in real implementation
            audio_output_tokens: 0,
            text_input_tokens: 0,
            text_output_tokens: 0
          })
        })

        if (response.ok) {
          const { cost: finalCost } = await response.json()
          setCost(finalCost)
        }
      }
    } catch (err) {
      console.error('Error ending session:', err)
    } finally {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    sessionIdRef.current = null
    startTimeRef.current = null

    setStatus('idle')
    setAudioLevel(0)
    setDuration(0)
  }, [])

  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    startSession,
    endSession,
    toggleMute,
    status,
    error,
    isMuted,
    isActive: status !== 'idle' && status !== 'error',
    audioLevel,
    duration,
    cost
  }
}
