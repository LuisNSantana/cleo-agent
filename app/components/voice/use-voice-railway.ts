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
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const sessionUpdateRetryRef = useRef<number>(0)

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
      console.log('🔧 Config received from /api/voice/config')
      console.log('🛠️ Tools in config:', config.tools?.map((t: any) => ({ name: t.name, hasTypeField: 'type' in t })))
      
      // Stage session.update in 3 small updates to avoid server_error due to size/schema
      const trimmedInstructions = typeof config?.instructions === 'string'
        ? String(config.instructions).slice(0, 1500)
        : undefined

      const baseSession = {
        modalities: ['text', 'audio'],
        voice: config?.voice || 'alloy',
        input_audio_format: { type: 'pcm16', sample_rate_hz: 24000 },
        output_audio_format: { type: 'pcm16', sample_rate_hz: 24000 }
      }

      const updates: any[] = [
        { type: 'session.update', session: { ...baseSession } },
        { type: 'session.update', session: { ...baseSession, ...(trimmedInstructions ? { instructions: trimmedInstructions } : {}) } },
        { type: 'session.update', session: { ...baseSession, ...(trimmedInstructions ? { instructions: trimmedInstructions } : {}), tools: Array.isArray(config?.tools) ? config.tools : [] } }
      ]

      let updateStage = 0
      console.log('📦 Prepared staged session.update payloads:', {
        stages: updates.length,
        hasInstructions: !!trimmedInstructions,
        toolsCount: (Array.isArray(config?.tools) ? config.tools.length : 0)
      })

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
  const processor = audioContext.createScriptProcessor(2048, 1, 1)
      
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
      let awaitingSessionUpdate = false

      const finalizeSessionReady = () => {
        if (sessionReady) {
          return
        }

        sessionReady = true
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()
        startAudioProcessor()
      }

      const startAudioProcessor = () => {
        if (!processorRef.current) return

        processorRef.current.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && !isMuted && sessionReady) {
            const inputData = e.inputBuffer.getChannelData(0)

            const pcm16 = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]))
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
            }

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
            console.log('✅ session.created - awaiting configuration setup')

            if (updates.length > 0) {
              try {
                awaitingSessionUpdate = true
                console.log(`📡 Sending staged session.update [stage ${updateStage + 1}/${updates.length}]`)
                console.log('📋 Payload:', JSON.stringify(updates[updateStage], null, 2))
                ws.send(JSON.stringify(updates[updateStage]))
              } catch (updateError) {
                console.error('Failed to send session.update:', updateError)
                awaitingSessionUpdate = false
                finalizeSessionReady()
              }
            } else {
              finalizeSessionReady()
            }
            return
          }

          if (eventType === 'session.updated') {
            console.log('✅ session.updated')
            awaitingSessionUpdate = false
            sessionUpdateRetryRef.current = 0
            // Start audio as soon as the first update is accepted
            if (!sessionReady) {
              finalizeSessionReady()
            }
            // If there are more staged updates, send next
            if (updateStage < updates.length - 1) {
              updateStage += 1
              try {
                awaitingSessionUpdate = true
                console.log(`📡 Sending staged session.update [stage ${updateStage + 1}/${updates.length}]`)
                console.log('📋 Payload:', JSON.stringify(updates[updateStage], null, 2))
                ws.send(JSON.stringify(updates[updateStage]))
              } catch (updateError) {
                console.error('Failed to send next staged session.update:', updateError)
                awaitingSessionUpdate = false
              }
            }
            return
          }
          
          if (eventType === 'error') {
            console.error('❌ OpenAI Error:', data)
            const errorMessage = data.error?.message || 'OpenAI connection error'
            if (data.error) {
              console.error('OpenAI error payload:', JSON.stringify(data.error, null, 2))
            }

            // If session.update failed, try progressive fallbacks before giving up
            if (awaitingSessionUpdate && !sessionReady) {
              const attempt = sessionUpdateRetryRef.current
              console.warn(`⚠️ session.update failed (attempt ${attempt + 1}). Applying fallback...`)

              const minimalSession: Record<string, unknown> = {
                modalities: ['text', 'audio'],
                voice: (config?.voice || 'alloy'),
                input_audio_format: { type: 'pcm16', sample_rate_hz: 24000 },
                output_audio_format: { type: 'pcm16', sample_rate_hz: 24000 }
              }

              try {
                // Special-case: if we failed while sending the tools stage, retry once adding type: 'function' to each tool
                if (typeof updateStage === 'number' && updateStage >= 2 && attempt === 0) {
                  const tools = Array.isArray(config?.tools) ? config.tools : []
                  const toolsWithType = tools.map((t: any) => ({ type: 'function', ...t }))
                  const toolsPayload = {
                    type: 'session.update',
                    session: {
                      modalities: ['text', 'audio'],
                      voice: (config?.voice || 'alloy'),
                      input_audio_format: { type: 'pcm16', sample_rate_hz: 24000 },
                      output_audio_format: { type: 'pcm16', sample_rate_hz: 24000 },
                      ...(typeof config?.instructions === 'string' ? { instructions: String(config.instructions).slice(0, 1500) } : {}),
                      tools: toolsWithType
                    }
                  }
                  console.log('🧪 Retrying tools stage with type:function wrapper on tools')
                  console.log('📋 TOOLS-with-type payload:', JSON.stringify(toolsPayload, null, 2))
                  sessionUpdateRetryRef.current += 1
                  ws.send(JSON.stringify(toolsPayload))
                  return
                }

                if (attempt === 0) {
                  // Retry 1: Minimal session (no tools, no instructions)
                  const minimalPayload = { type: 'session.update', session: minimalSession }
                  console.log('🧪 Retrying session.update with MINIMAL payload (no tools/instructions)')
                  console.log('📋 MINIMAL payload:', JSON.stringify(minimalPayload, null, 2))
                  sessionUpdateRetryRef.current += 1
                  ws.send(JSON.stringify(minimalPayload))
                  return
                }

                if (attempt === 1) {
                  // Retry 2: Minimal + trimmed instructions
                  const trimmed = typeof config?.instructions === 'string'
                    ? config.instructions.slice(0, 1500)
                    : undefined
                  const withInstr = { type: 'session.update', session: { ...minimalSession, ...(trimmed ? { instructions: trimmed } : {}) } }
                  console.log('🧪 Retrying session.update with TRIMMED INSTRUCTIONS only (still no tools)')
                  console.log('📋 TRIMMED payload:', JSON.stringify(withInstr, null, 2))
                  sessionUpdateRetryRef.current += 1
                  ws.send(JSON.stringify(withInstr))
                  return
                }
              } catch (retryErr) {
                console.error('❌ Fallback retry failed to send:', retryErr)
              }

            }

            // If we're already active and a later staged update failed, keep the session alive
            if (sessionReady && awaitingSessionUpdate) {
              console.warn('⚠️ Non-fatal: staged session.update failed after session was ready. Continuing without further staging.')
              awaitingSessionUpdate = false
              return
            }

            // Out of fallbacks or not in session.update phase: surface the error
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
          }

          if ((eventType === 'response.audio.delta' || eventType === 'response.output_audio.delta') && data.delta) {
            setStatus('speaking')
            try {
              const audioData = atob(data.delta)
              const pcm16 = new Int16Array(audioData.length / 2)
              for (let i = 0; i < pcm16.length; i++) {
                pcm16[i] = (audioData.charCodeAt(i * 2) | (audioData.charCodeAt(i * 2 + 1) << 8))
              }

              const audioBlob = new Blob([pcm16], { type: 'audio/pcm' })
              const audioUrl = URL.createObjectURL(audioBlob)
              const audio = new Audio(audioUrl)
              audio.play().catch(console.error)
            } catch (audioError) {
              console.error('Error playing audio:', audioError)
            }
          }

          if (eventType === 'response.audio.done' || eventType === 'response.output_audio.done') {
            setStatus('listening')
          }

          if (eventType === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
            console.log('📝 User transcript:', data.transcript)
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

    } catch (err) {
      console.error('Railway voice session error:', err)
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
