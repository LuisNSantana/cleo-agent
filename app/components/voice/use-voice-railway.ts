'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type VoiceStatus = 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error'

interface UseVoiceRailwayReturn {
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

/**
 * Railway WebSocket Implementation for Voice Mode
 * Uses Railway proxy server to connect to OpenAI Realtime API
 * This is more reliable than WebRTC in restrictive networks
 */
export function useVoiceRailway(): UseVoiceRailwayReturn {
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
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const chatIdRef = useRef<string | null>(null)
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
      chatIdRef.current = chatId || null

      console.log('🚂 Starting Railway WebSocket voice session...')

      // Fetch voice configuration
      const configResponse = await fetch('/api/voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!configResponse.ok) {
        const errorData = await configResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get voice configuration')
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
      processorRef.current = processor

      // Create voice session in database
      const sessionResponse = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        throw new Error(errorData.error || 'Failed to create voice session')
      }

      const { sessionId } = await sessionResponse.json()
      sessionIdRef.current = sessionId

      // Connect to Railway WebSocket proxy
      const proxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL || 'ws://localhost:8080'
      const model = config?.model || 'gpt-4o-mini-realtime-preview-2024-12-17'
      const wsUrl = `${proxyUrl}?model=${encodeURIComponent(model)}`
      
      console.log('🔗 Connecting to Railway proxy:', wsUrl)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      let sessionReady = false

      ws.onopen = () => {
        console.log('✅ Railway WebSocket connected')
      }

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Wait for session.created
          if (data.type === 'session.created' && !sessionReady) {
            console.log('✅ Session created by OpenAI')
            
            // Send session.update with configuration
            const sessionUpdate: any = {
              type: 'session.update',
              session: {
                turn_detection: {
                  type: 'server_vad',
                  silence_duration_ms: 500
                },
                input_audio_transcription: {
                  model: 'whisper-1'
                }
              }
            }

            if (config?.instructions) {
              sessionUpdate.session.instructions = config.instructions
            }
            if (config?.voice) {
              sessionUpdate.session.voice = config.voice
            }

            ws.send(JSON.stringify(sessionUpdate))
            console.log('📤 Session configuration sent')
            
            sessionReady = true
            setStatus('listening')
            startTimeRef.current = Date.now()
            monitorAudioLevel()
            
            // Start sending audio
            startAudioProcessor()
            return
          }

          // Handle other events
          if (data.type === 'input_audio_buffer.speech_started') {
            console.log('🎤 User started speaking')
            setStatus('speaking')
          }

          if (data.type === 'input_audio_buffer.speech_stopped') {
            console.log('🎤 User stopped speaking')
            setStatus('listening')
          }

          if (data.type === 'response.audio.delta') {
            setStatus('active')
          }

          if (data.type === 'response.audio.done') {
            setStatus('listening')
          }

          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('📝 User transcript:', data.transcript)
            
            // Save transcript
            if (chatIdRef.current && data.transcript) {
              try {
                await fetch('/api/voice/transcript', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chatId: chatIdRef.current,
                    role: 'user',
                    content: data.transcript,
                    sessionId: sessionIdRef.current
                  })
                })
              } catch (err) {
                console.error('Failed to save transcript:', err)
              }
            }
          }

          if (data.type === 'error') {
            console.error('❌ OpenAI Error:', data)
            setError(new Error(data.error?.message || 'OpenAI error'))
            setStatus('error')
          }
        } catch (err) {
          console.error('Error processing message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setError(new Error('WebSocket connection error'))
        setStatus('error')
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket closed')
        if (status !== 'idle') {
          setStatus('idle')
        }
      }

      // Audio processor function
      const startAudioProcessor = () => {
        if (!processor) return

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

    } catch (err) {
      console.error('Railway voice session error:', err)
      setError(err as Error)
      setStatus('error')
      cleanup()
    }
  }, [monitorAudioLevel, isMuted, status])

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
            audio_input_tokens: 0,
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

    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
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
