'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type VoiceStatus = 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error' | 'reconnecting'

// Error classification for handling strategy
type ErrorSeverity = 'transient' | 'recoverable' | 'fatal'

interface VoiceError extends Error {
  severity: ErrorSeverity
  code?: string
  retryable: boolean
}

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

// Connection quality metrics
interface ConnectionMetrics {
  latency: number
  packetsLost: number
  jitter: number
  timestamp: number
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
  
  // Reconnection management
  const reconnectAttemptsRef = useRef<number>(0)
  const maxReconnectAttempts = 3
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionConfigRef = useRef<any>(null)
  
  // Connection quality monitoring
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMetricsRef = useRef<ConnectionMetrics | null>(null)

  // Classify error severity for handling strategy
  const classifyError = (error: any): VoiceError => {
    const voiceError = error as VoiceError
    
    // OpenAI-specific errors
    if (error.error?.type === 'invalid_request_error') {
      voiceError.severity = 'fatal'
      voiceError.retryable = false
      voiceError.code = error.error.code
    } else if (error.error?.type === 'server_error') {
      voiceError.severity = 'recoverable'
      voiceError.retryable = true
    } else if (error.message?.includes('rate limit')) {
      voiceError.severity = 'recoverable'
      voiceError.retryable = true
    } else if (error.message?.includes('Data channel') || error.message?.includes('ICE')) {
      voiceError.severity = 'recoverable'
      voiceError.retryable = true
    } else if (error.message?.includes('permission') || error.message?.includes('NotAllowed')) {
      voiceError.severity = 'fatal'
      voiceError.retryable = false
    } else {
      voiceError.severity = 'recoverable'
      voiceError.retryable = true
    }
    
    return voiceError
  }

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

      // Create WebRTC peer connection with multiple STUN servers for redundancy
      // PRODUCTION BEST PRACTICE: Multiple STUN servers ensure connectivity across different network conditions
      // - Google STUN: Primary, highly reliable
      // - Twilio STUN: Backup for redundancy
      // TODO: Add TURN server for restrictive corporate networks (requires credentials)
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ],
        // Optimize for low-latency audio
        iceCandidatePoolSize: 10
      })
      peerConnectionRef.current = pc

      // Monitor ICE candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate generated:', event.candidate.candidate.substring(0, 50))
        } else {
          console.log('✅ ICE candidate gathering complete (null candidate)')
        }
      }

      // Monitor connection state changes with auto-recovery
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState)
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('⚠️ Connection failed/disconnected, attempting recovery...')
          handleConnectionFailure()
        } else if (pc.connectionState === 'connected') {
          console.log('✅ Connection established successfully')
          reconnectAttemptsRef.current = 0 // Reset reconnect counter on success
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState)
        
        if (pc.iceConnectionState === 'failed') {
          console.warn('⚠️ ICE connection failed, initiating ICE restart...')
          restartICE()
        } else if (pc.iceConnectionState === 'disconnected') {
          console.warn('⚠️ ICE disconnected, monitoring for recovery...')
          // Give it 5 seconds to recover before attempting restart
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.warn('⚠️ ICE still disconnected after 5s, restarting...')
              restartICE()
            }
          }, 5000)
        }
      }

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

      // Helper to attach handlers to a data channel
      const bindDataChannel = (channel: RTCDataChannel) => {
        dataChannelRef.current = channel
        channel.onopen = () => {
          console.log('✅ Data channel opened')
          setStatus('listening')
          startTimeRef.current = Date.now()
          monitorAudioLevel()
        }
        channel.onclose = () => {
          console.log('🔌 Data channel closed')
        }
        channel.onerror = (error) => {
          console.error('❌ Data channel error:', error)
          setError(new Error('Data channel error'))
          setStatus('error')
        }
        // Attach message handler below after definition
      }

      // Prefer remote-created channel if the server provides it
      pc.ondatachannel = (e) => {
        console.log('📡 Remote data channel received:', e.channel.label, 'state:', e.channel.readyState)
        bindDataChannel(e.channel)
        // message handler is assigned after definition below
      }

      // Create data channel for events (must be done before createOffer). Some providers expect client-initiated.
      const dc = pc.createDataChannel('oai-events')
      bindDataChannel(dc)
      console.log('📡 Created data channel: oai-events, initial state:', dc.readyState)

      dc.onopen = async () => {
        console.log('✅ Data channel opened')
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()
        
        // 1. First, send session.update with instructions, VAD config, and transcription
        try {
          const sessionUpdate: any = {
            type: 'session.update',
            session: {
              // Enable server-side VAD turn detection and tune pause before responding
              // 500–700ms yields natural pauses; use 500ms for quicker detection
              turn_detection: {
                type: 'server_vad',
                silence_duration_ms: 500
              },
              // CRÍTICO: Habilitar transcripción de audio del usuario
              // Sin esto, OpenAI NO transcribe la voz del usuario
              input_audio_transcription: {
                model: 'whisper-1'
              },
              // Set explicit audio formats as strings (OpenAI expects 'pcm16', not objects)
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16'
            }
          }
          if (instructions && instructions.length > 0) {
            sessionUpdate.session.instructions = instructions
          }
          dc.send(JSON.stringify(sessionUpdate))
          console.log('🧠 Sent session.update (VAD config + transcription + instructions)')
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

      const onDCMessage = async (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data)
          console.log('Event:', event.type)

          // PRODUCTION: Enhanced error handling with classification
          if (event.type === 'error') {
            console.error('❌ OpenAI Error:', event)
            const classifiedError = classifyError(event)
            
            console.error('📊 Error Details:', {
              type: event.error?.type,
              code: event.error?.code,
              message: event.error?.message,
              param: event.error?.param,
              severity: classifiedError.severity,
              retryable: classifiedError.retryable
            })

            // Only set error state for fatal errors
            if (classifiedError.severity === 'fatal') {
              setError(classifiedError)
              setStatus('error')
            } else if (classifiedError.severity === 'recoverable') {
              console.warn('⚠️ Recoverable error, continuing session...')
              // Log but don't interrupt the session
            }
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
            try {
              // Commit any buffered audio and ask the model to respond
              dataChannelRef.current?.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
              dataChannelRef.current?.send(JSON.stringify({ type: 'response.create' }))
            } catch (commitErr) {
              console.error('Failed to commit audio or create response:', commitErr)
            }
          }

          if (event.type === 'session.updated') {
            console.log('✅ session.updated acknowledged by OpenAI')
            // Start monitoring connection quality after session is ready
            startConnectionMonitoring()
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
      // Assign message handler to whichever channel is active now
      dc.onmessage = onDCMessage
      if (dataChannelRef.current && dataChannelRef.current !== dc) {
        dataChannelRef.current.onmessage = onDCMessage
      }


      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // CRITICAL: Wait for ICE gathering to complete before sending offer
      // This ensures all ICE candidates are included in the SDP
      console.log('⏳ Waiting for ICE gathering... Current state:', pc.iceGatheringState)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          console.log('✅ ICE gathering already complete')
          return resolve()
        }
        const timeout = setTimeout(() => {
          console.log('⚠️ ICE gathering timeout after 5s, proceeding anyway')
          resolve()
        }, 5000)
        const check = () => {
          console.log('📡 ICE gathering state changed:', pc.iceGatheringState)
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check)
            clearTimeout(timeout)
            console.log('✅ ICE gathering complete')
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', check)
      })

      // Get the updated local description with all ICE candidates
      const finalOffer = pc.localDescription
      if (!finalOffer || !finalOffer.sdp) {
        throw new Error('Failed to get local description with ICE candidates')
      }

      console.log('📤 Sending SDP offer to backend...')
      console.log('📤 SDP length:', finalOffer.sdp.length)
      console.log('📤 SDP preview:', finalOffer.sdp.substring(0, 100))
      console.log('📤 ICE candidates in SDP:', (finalOffer.sdp.match(/a=candidate/g) || []).length)

      // Send offer (with gathered ICE candidates) to our backend which will forward to OpenAI
      const sdpResponse = await fetch('/api/voice/webrtc/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sdp: finalOffer.sdp,
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
      const classifiedError = classifyError(err)
      setError(classifiedError)
      
      // Attempt reconnection for recoverable errors
      if (classifiedError.retryable && reconnectAttemptsRef.current < maxReconnectAttempts) {
        console.log(`🔄 Attempting reconnection (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`)
        setStatus('reconnecting')
        reconnectAttemptsRef.current++
        
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000
        reconnectTimeoutRef.current = setTimeout(() => {
          startSession(chatIdRef.current || undefined)
        }, delay)
      } else {
        setStatus('error')
        cleanup()
      }
    }
  }, [monitorAudioLevel])

  // Handle connection failures with auto-recovery
  const handleConnectionFailure = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached, giving up')
      setStatus('error')
      setError(new Error('Connection failed after multiple attempts'))
      cleanup()
      return
    }

    console.log(`🔄 Connection failed, attempting recovery (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`)
    setStatus('reconnecting')
    reconnectAttemptsRef.current++

    // Exponential backoff
    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000
    reconnectTimeoutRef.current = setTimeout(() => {
      startSession(chatIdRef.current || undefined)
    }, delay)
  }, [])

  // ICE restart for connection recovery
  const restartICE = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc) return

    try {
      console.log('🔄 Initiating ICE restart...')
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)

      // Send new offer through signaling (implementation depends on your signaling mechanism)
      // For now, we'll just log it
      console.log('📤 ICE restart offer created, signaling required for full restart')
      // TODO: Implement full ICE restart with signaling when needed
    } catch (err) {
      console.error('❌ ICE restart failed:', err)
      handleConnectionFailure()
    }
  }, [handleConnectionFailure])

  // Monitor connection quality metrics
  const startConnectionMonitoring = useCallback(() => {
    if (metricsIntervalRef.current) return // Already monitoring

    console.log('📊 Starting connection quality monitoring...')
    
    metricsIntervalRef.current = setInterval(async () => {
      const pc = peerConnectionRef.current
      if (!pc) return

      try {
        const stats = await pc.getStats()
        let packetsLost = 0
        let jitter = 0
        let rtt = 0

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            packetsLost = report.packetsLost || 0
            jitter = report.jitter || 0
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0
          }
        })

        const metrics: ConnectionMetrics = {
          latency: rtt * 1000, // Convert to ms
          packetsLost,
          jitter: jitter * 1000, // Convert to ms
          timestamp: Date.now()
        }

        lastMetricsRef.current = metrics

        // Log warnings for poor connection quality
        if (metrics.latency > 300) {
          console.warn(`⚠️ High latency detected: ${metrics.latency.toFixed(0)}ms`)
        }
        if (metrics.packetsLost > 100) {
          console.warn(`⚠️ Packet loss detected: ${metrics.packetsLost} packets`)
        }
        if (metrics.jitter > 50) {
          console.warn(`⚠️ High jitter detected: ${metrics.jitter.toFixed(0)}ms`)
        }

        // Log periodic health check (every 30 seconds)
        if (metrics.timestamp % 30000 < 5000) {
          console.log('💚 Connection health:', {
            latency: `${metrics.latency.toFixed(0)}ms`,
            packetsLost: metrics.packetsLost,
            jitter: `${metrics.jitter.toFixed(2)}ms`
          })
        }
      } catch (err) {
        console.error('Failed to get connection stats:', err)
      }
    }, 5000) // Check every 5 seconds
  }, [])

  // Stop connection monitoring
  const stopConnectionMonitoring = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current)
      metricsIntervalRef.current = null
      console.log('📊 Stopped connection quality monitoring')
    }
  }, [])

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
    console.log('🧹 Cleaning up voice session...')
    
    // Stop all monitoring
    stopConnectionMonitoring()
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close data channel
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close()
      } catch (err) {
        console.warn('Error closing data channel:', err)
      }
      dataChannelRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close()
      } catch (err) {
        console.warn('Error closing peer connection:', err)
      }
      peerConnectionRef.current = null
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.warn('Error stopping media track:', err)
        }
      })
      mediaStreamRef.current = null
    }

    // Remove audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
      audioElementRef.current = null
    }

    // Clear refs
    analyserRef.current = null
    sessionIdRef.current = null
    startTimeRef.current = null
    sessionConfigRef.current = null
    lastMetricsRef.current = null

    setStatus('idle')
    setAudioLevel(0)
    setDuration(0)
    
    console.log('✅ Cleanup complete')
  }, [stopConnectionMonitoring])

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
