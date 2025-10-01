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

      const { sessionId } = await sessionResponse.json()
      sessionIdRef.current = sessionId

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
      pc.addTrack(audioTrack, stream)

      // Create data channel for events (must be done before createOffer)
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      console.log('📡 Created data channel: oai-events')

      dc.onopen = () => {
        console.log('✅ Data channel opened')
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()

        if (instructions && instructions.length > 0) {
          try {
            dc.send(JSON.stringify({
              type: 'session.update',
              session: {
                instructions
              }
            }))
            console.log('🧠 Sent personalized instructions to OpenAI session')
          } catch (sendError) {
            console.error('Failed to send session.update instructions:', sendError)
          }
        }
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
          }

          if (event.type === 'response.audio.done') {
            setStatus('listening')
          }

          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('📝 Transcription:', event.transcript)
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

      // Fallback: Si el data channel no se abre en 3 segundos, cambiar a listening de todos modos
      setTimeout(() => {
        if (dataChannelRef.current?.readyState !== 'open') {
          console.log('⚠️ Data channel timeout, switching to listening anyway')
          setStatus('listening')
          startTimeRef.current = Date.now()
          monitorAudioLevel()
        }
      }, 3000)

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
