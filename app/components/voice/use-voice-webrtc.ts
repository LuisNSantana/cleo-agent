'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type VoiceStatus = 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error'

interface UseVoiceWebRTCReturn {
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

export function useVoiceWebRTC(): UseVoiceWebRTCReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [cost, setCost] = useState(0)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const chatIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const hasActiveResponseRef = useRef<boolean>(false)
  const enableBargeInRef = useRef<boolean>(false)

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

      // Fetch voice configuration with contextual instructions
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
      const instructions = typeof config?.instructions === 'string'
        ? config.instructions.trim()
        : undefined

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      mediaStreamRef.current = stream

      // Setup audio analyzer
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

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

      const { sessionId: voiceSessionId } = await sessionResponse.json()
      sessionIdRef.current = voiceSessionId

      // Create WebRTC peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // Set up audio element for remote audio playback
      const audioElement = document.createElement('audio')
      audioElement.autoplay = true
      audioElementRef.current = audioElement

      // Handle remote audio stream from OpenAI
      pc.ontrack = (e) => {
        console.log('📻 Received remote audio track')
        if (audioElement) {
          audioElement.srcObject = e.streams[0]
        }
      }

      // Add local audio track (microphone)
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack && audioTrack.enabled === false) {
        audioTrack.enabled = true
      }
      pc.addTrack(audioTrack, stream)

      // Create data channel for events (must be done before createOffer)
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      console.log('📡 Created data channel: oai-events, initial state:', dc.readyState)

      dc.onerror = (error) => {
        console.error('❌ Data channel error:', error)
      }

      dc.onclose = () => {
        console.log('🔌 Data channel closed')
      }

      dc.onopen = async () => {
        console.log('✅ Data channel opened')
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()
        
        // 1. First, send session.update with instructions and VAD config
        try {
          const sessionUpdate: any = {
            type: 'session.update',
            session: {
              // Enable server-side VAD turn detection and tune pause before responding
              // 500–700ms yields natural pauses; use 500ms for quicker detection
              turn_detection: {
                type: 'server_vad',
                silence_duration_ms: 500
              }
            }
          }
          if (instructions && instructions.length > 0) {
            sessionUpdate.session.instructions = instructions
          }
          dc.send(JSON.stringify(sessionUpdate))
          console.log('🧠 Sent session.update (VAD config + instructions)')
        } catch (sendError) {
          console.error('Failed to send session.update:', sendError)
        }

        // 2. NUEVO: Agregar mensajes previos del chat como conversation items
        // Siguiendo best practices de ChatGPT y Grok
        if (chatId) {
          try {
            console.log('📝 Fetching conversation context for chat:', chatId)
            const contextResponse = await fetch(`/api/voice/context/${chatId}`)
            
            if (contextResponse.ok) {
              const { messages } = await contextResponse.json()
              
              if (messages && messages.length > 0) {
                console.log(`📚 Adding ${messages.length} previous messages to conversation`)
                
                // Agregar cada mensaje previo como conversation item
                // Esto es lo que hacen ChatGPT y Grok para mantener contexto
                for (const msg of messages) {
                  try {
                    dc.send(JSON.stringify({
                      type: 'conversation.item.create',
                      item: msg.item
                    }))
                  } catch (itemError) {
                    console.error('Failed to add conversation item:', itemError)
                  }
                }
                
                console.log('✅ Conversation context loaded successfully')
              } else {
                console.log('ℹ️ No previous messages found for this chat')
              }
            } else {
              console.log('⚠️ Could not fetch conversation context, continuing without it')
            }
          } catch (contextError) {
            console.error('Error loading conversation context:', contextError)
            // Continue without context - not a critical error
          }
        }
        
        // 3. Now ready to listen
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()
      }

      dc.onclose = () => {
        console.log('❌ Data channel closed')
      }

      dc.onerror = (error) => {
        console.error('❌ Data channel error:', error)
        setError(new Error('Data channel error'))
        setStatus('error')
      }

      dc.onmessage = async (e) => {
        try {
          const event = JSON.parse(e.data)
          console.log('Event:', event.type)

          if (event.type === 'error') {
            console.error('❌ OpenAI Error:', event)
            setError(new Error(event.error?.message || 'OpenAI error'))
            setStatus('error')
            return
          }

          if (event.type === 'input_audio_buffer.speech_started') {
            console.log('🎤 User started speaking')
            setStatus('speaking')
            // Barge-in: cancel any ongoing response so the model stops speaking immediately
            try {
              if (enableBargeInRef.current && hasActiveResponseRef.current) {
                dc.send(JSON.stringify({ type: 'response.cancel' }))
                console.log('⛔ Sent response.cancel for barge-in')
                // Optimistically clear; model will also emit done events later
                hasActiveResponseRef.current = false
              } else {
                console.log('ℹ️ No active response to cancel or barge-in disabled; skipping response.cancel')
              }
            } catch (cancelErr) {
              console.error('Failed to send response.cancel:', cancelErr)
            }
          }

          if (event.type === 'input_audio_buffer.speech_stopped') {
            console.log('🎤 User stopped speaking')
            setStatus('listening')
          }

          if (event.type === 'session.updated') {
            console.log('✅ session.updated acknowledged by OpenAI')
          }

          if (event.type === 'response.audio.delta') {
            setStatus('active')
            hasActiveResponseRef.current = true
          }

          if (event.type === 'response.audio.done') {
            setStatus('listening')
            hasActiveResponseRef.current = false
          }

          // Text-only responses (if used) — set/clear active state too
          if (event.type === 'response.output_text.delta') {
            hasActiveResponseRef.current = true
          }
          if (event.type === 'response.output_text.done' || event.type === 'response.completed') {
            hasActiveResponseRef.current = false
          }

          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('📝 User transcription:', event.transcript)
            
            // NUEVO: Guardar transcripción del usuario en el chat
            if (chatIdRef.current && event.transcript) {
              try {
                await fetch('/api/voice/transcript', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chatId: chatIdRef.current,
                    role: 'user',
                    content: event.transcript,
                    sessionId: sessionIdRef.current
                  })
                })
                console.log('💾 User transcript saved to chat')
              } catch (saveError) {
                console.error('Failed to save user transcript:', saveError)
              }
            }
          }
          
          // NUEVO: Capturar respuesta de Cleo para guardarla
          if (event.type === 'response.audio_transcript.done' || event.type === 'response.text.done') {
            const assistantTranscript = event.transcript || event.text
            
            if (chatIdRef.current && assistantTranscript) {
              console.log('📝 Assistant transcription:', assistantTranscript)
              
              try {
                await fetch('/api/voice/transcript', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chatId: chatIdRef.current,
                    role: 'assistant',
                    content: assistantTranscript,
                    sessionId: sessionIdRef.current
                  })
                })
                console.log('💾 Assistant transcript saved to chat')
              } catch (saveError) {
                console.error('Failed to save assistant transcript:', saveError)
              }
            }
          }

          // Handle tool calls from Realtime API
          if (event.type === 'response.function_call_arguments.done') {
            console.log('🔧 Tool call received:', event.name)
            
            try {
              const toolCall = {
                call_id: event.call_id,
                name: event.name,
                arguments: JSON.parse(event.arguments)
              }
              
              console.log('🔧 Executing tool:', toolCall.name, toolCall.arguments)
              
              // Execute tool via backend
              const toolResponse = await fetch('/api/voice/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolCall })
              })
              
              if (!toolResponse.ok) {
                throw new Error('Tool execution failed')
              }
              
              const toolResult = await toolResponse.json()
              console.log('✅ Tool executed:', toolCall.name, 'Success:', JSON.parse(toolResult.output).success)
              
              // Send result back to Realtime API
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: toolCall.call_id,
                  output: toolResult.output
                }
              }))
              
              // Trigger response generation with the tool result
              dc.send(JSON.stringify({
                type: 'response.create'
              }))
              
              console.log('📤 Tool result sent back to OpenAI')
            } catch (toolError) {
              console.error('❌ Tool execution error:', toolError)
              
              // Send error back to OpenAI
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: event.call_id,
                  output: JSON.stringify({
                    success: false,
                    error: (toolError as Error).message
                  })
                }
              }))
              
              // Still trigger response so Cleo can explain the error
              dc.send(JSON.stringify({
                type: 'response.create'
              }))
            }
          }
        } catch (err) {
          console.error('Error processing event:', err)
        }
      }


      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      console.log('📤 Sending SDP offer to backend...')
      console.log('📤 SDP length:', offer.sdp?.length)
      console.log('📤 SDP preview:', offer.sdp?.substring(0, 100))

      // Send offer to our backend which will forward to OpenAI
      const sdpResponse = await fetch('/api/voice/webrtc/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          session: {
            model: config?.model,
            voice: config?.voice,
            instructions: config?.instructions
          }
        })
      })

      console.log('📥 Response status:', sdpResponse.status)

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text()
        console.error('❌ Backend error:', errorText)
        throw new Error(`Failed to establish WebRTC connection: ${errorText}`)
      }

      // Get answer from OpenAI (via our backend)
      const answerSdp = await sdpResponse.text()
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      }

      await pc.setRemoteDescription(answer)
      console.log('✅ WebRTC connection established')
      console.log('📡 Data channel state after setRemoteDescription:', dc.readyState)
      console.log('🔗 Peer connection state:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState
      })

      // Fallback: Si el data channel no se abre en 5 segundos, cambiar a listening de todos modos
      setTimeout(() => {
        if (dataChannelRef.current?.readyState !== 'open') {
          console.log('⚠️ Data channel timeout! Current state:', dataChannelRef.current?.readyState)
          console.log('🔗 Peer connection info:', {
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            signalingState: pc.signalingState
          })
          setStatus('listening')
          startTimeRef.current = Date.now()
          monitorAudioLevel()
        }
      }, 5000)

    } catch (err) {
      console.error('Voice session error:', err)
      setError(err as Error)
      setStatus('error')
      cleanup()
    }
  }, [monitorAudioLevel])

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

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Remove audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
      audioElementRef.current = null
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
