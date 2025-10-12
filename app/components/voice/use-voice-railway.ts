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
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)

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
      const configRef = { current: config }

      ws.onopen = () => {
        console.log('✅ Railway WebSocket connected, waiting for session.created...')
      }

      ws.onmessage = async (event: MessageEvent) => {
        try {
          let messageText: string
          if (event.data instanceof Blob) {
            messageText = await event.data.text()
          } else if (typeof event.data === 'string') {
            messageText = event.data
          } else {
            return // Skip other types
          }

          const data = JSON.parse(messageText)
          const eventType = data.type
          
          console.log('📨 Event:', eventType)
          
          // Wait for session.created FIRST
          if (eventType === 'session.created' && !sessionReady) {
            console.log('✅ session.created - Sending streamlined configuration...')

            const voice = configRef.current.voice || 'alloy'
            const sessionUpdate: any = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                voice,
                turn_detection: {
                  type: 'server_vad',
                  silence_duration_ms: 500,
                },
                input_audio_format: {
                  format: 'pcm16',
                  sample_rate: 24000,
                },
                output_audio_format: {
                  format: 'pcm16',
                  sample_rate: 24000,
                },
              },
            }

            if (configRef.current.instructions && typeof configRef.current.instructions === 'string') {
              const MAX_INSTRUCTION_LENGTH = 4000
              ;(sessionUpdate.session as Record<string, unknown>).instructions =
                configRef.current.instructions.length > MAX_INSTRUCTION_LENGTH
                  ? configRef.current.instructions.slice(0, MAX_INSTRUCTION_LENGTH)
                  : configRef.current.instructions
            }

            try {
              ws.send(JSON.stringify(sessionUpdate))
              console.log('📤 Sent streamlined session.update (voice + VAD + instructions)')
            } catch (sendError) {
              console.error('Failed to send session.update:', sendError)
            }

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
          
          if (eventType === 'error') {
            console.error('❌ OpenAI Error:', data)
            const errorMessage = data.error?.message || 'OpenAI connection error'
            if (data.error) {
              console.error('OpenAI error payload:', JSON.stringify(data.error, null, 2))
            }
            
            // Check if it's a server error (500)
            if (data.error?.type === 'server_error') {
              console.warn('⚠️ OpenAI server error - this is on their side')
              setError(new Error('OpenAI is experiencing issues. The service may be temporarily unavailable.'))
            } else {
              setError(new Error(errorMessage))
            }
            
            setStatus('error')
            return
          }
          
          if (eventType === 'input_audio_buffer.speech_started') {
            console.log('🎤 User started speaking')
            setStatus('speaking')
          }

          if (eventType === 'input_audio_buffer.speech_stopped') {
            console.log('🎤 User stopped speaking')
            setStatus('listening')
            try {
              // Commit buffered audio and trigger a response when VAD ends
              ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
              ws.send(JSON.stringify({ type: 'response.create' }))
            } catch (commitErr) {
              console.error('Failed to commit audio or create response:', commitErr)
            }
          }

          if ((eventType === 'response.audio.delta' || eventType === 'response.output_audio.delta') && data.delta) {
            setStatus('speaking')
            try {
              // Ensure playback context exists
              if (!playbackContextRef.current) {
                playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
              }
              const ctx = playbackContextRef.current

              // Base64 decode to PCM16
              const b64 = data.delta as string
              const bin = atob(b64)
              const bytes = new Uint8Array(bin.length)
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
              const pcm16 = new Int16Array(bytes.buffer)

              // Convert PCM16 to Float32 in [-1, 1]
              const float32 = new Float32Array(pcm16.length)
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = Math.max(-1, Math.min(1, pcm16[i] / 0x8000))
              }

              // Create and play AudioBuffer
              const buffer = ctx.createBuffer(1, float32.length, 24000)
              buffer.getChannelData(0).set(float32)
              const source = ctx.createBufferSource()
              source.buffer = buffer
              source.connect(ctx.destination)
              source.start()
            } catch (audioError) {
              console.error('Error playing audio:', audioError)
            }
          }

          if (eventType === 'response.audio.done' || eventType === 'response.output_audio.done') {
            setStatus('listening')
          }

          if (eventType === 'conversation.item.input_audio_transcription.completed' || eventType === 'response.output_audio_transcript.done') {
            const transcript =
              data.transcript ||
              data.text ||
              (typeof data.delta === 'string' ? data.delta : undefined) ||
              data.output?.[0]?.content?.[0]?.text

            if (transcript) {
              console.log('📝 User transcript:', transcript)
            }
            
            // Save transcript
            if (chatIdRef.current && transcript) {
              try {
                await fetch('/api/voice/transcript', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chatId: chatIdRef.current,
                    role: 'user',
                    content: transcript,
                    sessionId: sessionIdRef.current
                  })
                })
              } catch (err) {
                console.error('Failed to save transcript:', err)
              }
            }
          }

        } catch (err) {
          console.error('Error processing message:', err)
        }
      }

      ws.onerror = (error: Event) => {
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
        if (!processorRef.current) return

        processorRef.current.onaudioprocess = (e) => {
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

    // Close audio contexts
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (playbackContextRef.current) {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }

    analyserRef.current = null
    audioElementRef.current = null
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
