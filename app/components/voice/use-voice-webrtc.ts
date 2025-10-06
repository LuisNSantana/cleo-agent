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

      // Request microphone permission with detailed constraints
      console.log('🎤 Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 48000 }
        }
      })

      console.log('✅ Microphone access granted')
      console.log('📊 Stream info:', {
        active: stream.active,
        tracks: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length
      })

      // Verify we got audio tracks
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('No se pudo acceder al micrófono. Por favor verifica los permisos.')
      }

      const audioTrack = audioTracks[0]
      console.log('🎙️ Audio track info:', {
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        readyState: audioTrack.readyState,
        settings: audioTrack.getSettings()
      })

      // Ensure track is enabled
      if (!audioTrack.enabled) {
        console.log('⚠️ Audio track was disabled, enabling it...')
        audioTrack.enabled = true
      }

      mediaStreamRef.current = stream

      // Setup audio analyzer for visual feedback
      const audioContext = new AudioContext()
      console.log('🎵 AudioContext created:', {
        state: audioContext.state,
        sampleRate: audioContext.sampleRate
      })
      
      // Resume AudioContext if suspended (required in some browsers)
      if (audioContext.state === 'suspended') {
        console.log('🔄 Resuming suspended AudioContext...')
        await audioContext.resume()
      }
      
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser
      
      console.log('🔊 Audio analyzer configured:', {
        fftSize: analyser.fftSize,
        frequencyBinCount: analyser.frequencyBinCount,
        smoothingTimeConstant: analyser.smoothingTimeConstant
      })
      
      // Wait a bit for microphone to warm up (especially for Bluetooth/Continuity devices)
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Test if we're getting audio data
      const testDataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(testDataArray)
      const testAvg = testDataArray.reduce((a, b) => a + b) / testDataArray.length
      console.log('🎤 Initial audio level test:', testAvg > 0 ? `${testAvg.toFixed(1)}/255 (DETECTED)` : '0 (silent - mic may need warm-up time)')
      
      // If still silent, log a warning but continue
      if (testAvg === 0) {
        console.warn('⚠️ No audio detected initially. This is common for Bluetooth/Continuity mics. Will continue anyway.')
      }

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
      
      // Create WebRTC peer connection WITHOUT iceServers configuration
      // OpenAI provides STUN/TURN servers automatically via Trickle ICE
      // This is the configuration that worked in commit 5619f66f
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc
      console.log('🔗 Peer connection created (OpenAI will provide STUN/TURN automatically)')
      console.log('💡 Using default config - OpenAI handles ICE candidates via Trickle ICE')

      // Setup audio element for remote audio
      const audioElement = new Audio()
      audioElement.autoplay = true
      audioElementRef.current = audioElement

      pc.ontrack = (e) => {
        console.log('📻 Received remote audio track')
        if (audioElement) {
          audioElement.srcObject = e.streams[0]
        }
      }
      
      // Monitor ICE candidates gathering (critical for debugging)
      pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', pc.iceGatheringState)
      }
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate
          console.log('🧊 ICE candidate:', {
            type: candidate.type,
            protocol: candidate.protocol,
            address: candidate.address,
            port: candidate.port,
            relatedAddress: candidate.relatedAddress,
            relatedPort: candidate.relatedPort
          })
          
          // Highlight TURN relay candidates (critical for debugging)
          if (candidate.type === 'relay') {
            console.log('✅ TURN relay candidate found! This means TURN is working.')
          }
        } else {
          console.log('🧊 ICE gathering complete')
          
          // Check if we got relay candidates
          const stats = pc.getStats()
          stats.then(report => {
            let hasRelay = false
            report.forEach(stat => {
              if (stat.type === 'local-candidate' && stat.candidateType === 'relay') {
                hasRelay = true
              }
            })
            if (!hasRelay) {
              console.warn('⚠️ WARNING: No TURN relay candidates found. This may cause connection issues in restrictive networks.')
            }
          })
        }
      }
      
      // Monitor ICE connection state (critical for data channel)
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState)
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed! This prevents data channel from opening.')
          console.error('💡 Possible causes: Firewall blocking UDP, symmetric NAT, no STUN/TURN access')
          setError(new Error('Conexión de red fallida (ICE). Verifica tu firewall o red.'))
          setStatus('error')
        }
        if (pc.iceConnectionState === 'connected') {
          console.log('✅ ICE connection established - data channel should open soon')
        }
      }
      
      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState)
        if (pc.connectionState === 'failed') {
          console.error('❌ Peer connection failed!')
          setError(new Error('Conexión fallida con el servidor de voz.'))
          setStatus('error')
        }
        if (pc.connectionState === 'connected') {
          console.log('✅ Peer connection established successfully')
        }
      }

      // Add local audio track (microphone) to peer connection
      const micTrack = stream.getAudioTracks()[0]
      
      if (!micTrack) {
        throw new Error('No se encontró track de audio en el stream')
      }
      
      console.log('🎤 Adding microphone track to peer connection:', {
        id: micTrack.id,
        label: micTrack.label,
        enabled: micTrack.enabled,
        muted: micTrack.muted
      })
      
      // Double-check track is enabled before adding
      if (!micTrack.enabled) {
        console.warn('⚠️ Track was disabled, enabling...')
        micTrack.enabled = true
      }
      
      // Add track to peer connection
      const sender = pc.addTrack(micTrack, stream)
      console.log('✅ Microphone track added to peer connection')
      console.log('📡 RTC Sender info:', {
        track: sender.track?.id,
        trackEnabled: sender.track?.enabled,
        trackLabel: sender.track?.label,
        trackMuted: sender.track?.muted
      })
      
      // Verify track is being sent
      const parameters = sender.getParameters()
      console.log('📤 Sender parameters:', {
        encodings: parameters.encodings,
        transactionId: parameters.transactionId
      })
      
      // Monitor track state changes
      micTrack.onmute = () => {
        console.warn('⚠️ Microphone track muted')
      }
      micTrack.onunmute = () => {
        console.log('✅ Microphone track unmuted')
      }
      micTrack.onended = () => {
        console.error('❌ Microphone track ended')
        setError(new Error('El micrófono se desconectó'))
        setStatus('error')
      }

      // Create data channel for events (must be done before createOffer)
      const dc = pc.createDataChannel('oai-events', {
        ordered: true
      })
      dataChannelRef.current = dc
      console.log('📡 Created data channel: oai-events, initial state:', dc.readyState)

      dc.onopen = async () => {
        console.log('✅ Data channel opened, state:', dc.readyState)
        
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
      console.log('📥 Received SDP answer length:', answerSdp.length)
      console.log('📥 SDP answer preview:', answerSdp.substring(0, 100))
      
      // Check if answer includes data channel (SCTP)
      const hasDataChannel = answerSdp.includes('m=application')
      console.log('📡 SDP answer includes data channel:', hasDataChannel)
      
      if (!hasDataChannel) {
        console.warn('⚠️ WARNING: SDP answer does not include data channel! This may cause issues.')
      }
      
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      }

      await pc.setRemoteDescription(answer)
      console.log('✅ WebRTC connection established')
      console.log('📡 Data channel state after setRemoteDescription:', dataChannelRef.current?.readyState)
      
      // Log peer connection state
      console.log('🔗 Peer connection state:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState
      })

      // Fallback: Si el data channel no se abre en 5 segundos, mostrar error más claro
      setTimeout(() => {
        if (dataChannelRef.current?.readyState !== 'open') {
          const dcState = dataChannelRef.current?.readyState || 'null'
          console.error(`❌ Data channel timeout! Current state: ${dcState}`)
          console.error('🔗 Peer connection info:', {
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            signalingState: pc.signalingState
          })
          
          // If data channel never opened, this is a critical error
          if (dcState === 'connecting') {
            setError(new Error('No se pudo establecer la conexión con OpenAI. El data channel no se abrió.'))
            setStatus('error')
          } else {
            // Try to continue anyway
            console.log('⚠️ Data channel timeout, attempting to continue anyway')
            setStatus('listening')
            startTimeRef.current = Date.now()
            monitorAudioLevel()
          }
        }
      }, 5000)

    } catch (err) {
      console.error('Voice session error:', err)
      
      // Handle specific error types
      let errorMessage = 'Error al iniciar la sesión de voz'
      
      if (err instanceof Error) {
        const errName = err.name
        const errMsg = err.message.toLowerCase()
        
        // Microphone permission denied
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          errorMessage = 'Acceso al micrófono denegado. Por favor permite el acceso en tu navegador.'
        }
        // No microphone found
        else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          errorMessage = 'No se encontró ningún micrófono. Por favor conecta uno e intenta de nuevo.'
        }
        // Microphone in use by another app
        else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          errorMessage = 'El micrófono está siendo usado por otra aplicación. Ciérrala e intenta de nuevo.'
        }
        // Browser not supported
        else if (errMsg.includes('getusermedia') || errMsg.includes('not supported')) {
          errorMessage = 'Tu navegador no soporta acceso al micrófono. Usa Chrome, Edge o Safari.'
        }
        // Use original message if available
        else if (err.message) {
          errorMessage = err.message
        }
      }
      
      setError(new Error(errorMessage))
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
        const newMutedState = !audioTrack.enabled
        audioTrack.enabled = !newMutedState
        setIsMuted(newMutedState)
        console.log(newMutedState ? '🔇 Micrófono silenciado' : '🔊 Micrófono activado')
      } else {
        console.error('❌ No audio track found for mute toggle')
      }
    } else {
      console.error('❌ No media stream found for mute toggle')
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
