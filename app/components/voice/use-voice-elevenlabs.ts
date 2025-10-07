'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error'

export function useVoiceElevenLabs() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [duration, setDuration] = useState(0)
  const [cost, setCost] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chatIdRef = useRef<string | null>(null)

  // Monitor audio level
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    
    const checkLevel = () => {
      if (!analyserRef.current || status !== 'listening' && status !== 'speaking') {
        return
      }

      analyserRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      const normalized = Math.min(average / 128, 1)
      setAudioLevel(normalized)
      
      animationFrameRef.current = requestAnimationFrame(checkLevel)
    }

    checkLevel()
  }, [status])

  // Update duration counter
  useEffect(() => {
    if (status === 'listening' || status === 'speaking') {
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

      console.log('🎤 Starting ElevenLabs voice session...')

      // Get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })

      mediaStreamRef.current = stream

      // Setup audio context
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Get ElevenLabs config
      const configResponse = await fetch('/api/voice/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!configResponse.ok) {
        throw new Error('Failed to get voice configuration')
      }

      const config = await configResponse.json()

      // Create voice session in database
      const sessionResponse = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, provider: 'elevenlabs' })
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create voice session')
      }

      const { sessionId } = await sessionResponse.json()
      sessionIdRef.current = sessionId

      // Get ElevenLabs signed URL
      const signedUrlResponse = await fetch('/api/voice/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agent_id: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID 
        })
      })

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get ElevenLabs signed URL')
      }

      const { signed_url } = await signedUrlResponse.json()

      console.log('🔗 Connecting to ElevenLabs WebSocket...')
      const ws = new WebSocket(signed_url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ ElevenLabs WebSocket connected')
        setStatus('listening')
        startTimeRef.current = Date.now()
        monitorAudioLevel()

        // Start sending audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            // Convert to base64 and send
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1]
              ws.send(JSON.stringify({
                type: 'audio',
                audio: base64
              }))
            }
            reader.readAsDataURL(event.data)
          }
        }

        mediaRecorder.start(100) // Send chunks every 100ms
      }

      ws.onmessage = async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'audio') {
            setStatus('speaking')
            // Play audio response
            const audioData = atob(data.audio)
            const audioArray = new Uint8Array(audioData.length)
            for (let i = 0; i < audioData.length; i++) {
              audioArray[i] = audioData.charCodeAt(i)
            }

            const audioBlob = new Blob([audioArray], { type: 'audio/pcm' })
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            audio.play()

            audio.onended = () => {
              setStatus('listening')
              URL.revokeObjectURL(audioUrl)
            }
          }

          if (data.type === 'transcript') {
            console.log('📝 Transcript:', data.text)
          }

          if (data.type === 'error') {
            console.error('❌ ElevenLabs Error:', data)
            throw new Error(data.message || 'ElevenLabs error')
          }
        } catch (err) {
          console.error('Error processing message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ ElevenLabs WebSocket error:', error)
        setError(new Error('Connection error'))
        setStatus('error')
      }

      ws.onclose = () => {
        console.log('🔌 ElevenLabs WebSocket closed')
        cleanup()
      }
    } catch (err) {
      console.error('❌ Error starting ElevenLabs session:', err)
      setError(err as Error)
      setStatus('error')
      cleanup()
    }
  }, [monitorAudioLevel])

  const endSession = useCallback(async () => {
    console.log('🛑 Ending ElevenLabs voice session...')
    
    cleanup()
    
    if (sessionIdRef.current) {
      const finalDuration = startTimeRef.current 
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0

      try {
        const response = await fetch(`/api/voice/session/${sessionIdRef.current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration_seconds: finalDuration,
            provider: 'elevenlabs'
          })
        })

        if (response.ok) {
          const { cost: finalCost } = await response.json()
          setCost(finalCost)
        }
      } catch (err) {
        console.error('Error ending session:', err)
      }
    }
  }, [])

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

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
