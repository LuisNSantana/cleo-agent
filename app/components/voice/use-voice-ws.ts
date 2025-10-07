'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type VoiceStatus = 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error'

interface UseVoiceReturn {
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

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !mediaStreamRef.current) return
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
        : 'You are a helpful AI assistant. Keep responses concise and natural for voice conversation.'

      // Request microphone permission
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

      // Setup audio analyzer for visualization
      const audioContext = new AudioContext({ sampleRate: 24000 })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
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
      if (audioTrack && audioTrack.enabled === false) {
        audioTrack.enabled = true
      }
      pc.addTrack(audioTrack, stream)

      // Create data channel for events (must be done before createOffer)
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

      dc.onopen = () => {
        console.log('✅ Data channel opened')
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()

        // Send session configuration immediately after data channel opens
        try {
          const sessionUpdate = {
            type: 'session.update',
            session: {
              turn_detection: {
                type: 'server_vad',
                silence_duration_ms: 500
              },
              instructions: instructions,
              voice: config?.voice || 'nova',
              modalities: ['text', 'audio'],
              input_audio_transcription: {
                model: 'whisper-1'
              }
            }
          }

          // Add tools if available
          if (config?.tools && config.tools.length > 0) {
            (sessionUpdate.session as any).tools = config.tools
          }

          dc.send(JSON.stringify(sessionUpdate))
          console.log('📤 Session configuration sent')
        } catch (sendError) {
          console.error('Failed to send session.update:', sendError)
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

          switch (event.type) {
            case 'session.created':
              console.log('✅ Session created:', event.session?.id)
              break

            case 'session.updated':
              console.log('✅ Session updated')
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
              setStatus('active')
              break

            case 'response.audio.done':
              console.log('✅ Response completed')
              setStatus('listening')
              break

            case 'conversation.item.input_audio_transcription.completed':
              console.log('📝 User transcript:', event.transcript)
              break

            case 'error':
              console.error('❌ OpenAI Error:', event)
              setError(new Error(event.error?.message || 'OpenAI error'))
              setStatus('error')
              break

            default:
              console.log('ℹ️ Event:', event.type)
              break
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

      // Send offer to our backend which will forward to OpenAI
      const sdpResponse = await fetch('/api/voice/webrtc/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          sessionId: sessionId,
          session: {
            model: config?.model,
            voice: config?.voice,
            instructions: instructions
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

      // Fallback: Si el data channel no se abre en 5 segundos, cambiar a listening de todos modos
      setTimeout(() => {
        if (dataChannelRef.current?.readyState !== 'open') {
          console.log('⚠️ Data channel timeout, switching to listening anyway')
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
      mediaStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
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
