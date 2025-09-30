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

      // Setup audio analysis
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Create voice session
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create voice session')
      }

      const { sessionId, wsUrl, token } = await response.json()
      sessionIdRef.current = sessionId

      // Connect WebSocket
      const ws = new WebSocket(`${wsUrl}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('active')
        startTimeRef.current = Date.now()
        monitorAudioLevel()

        // Start sending audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 16000
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data)
          }
        }

        mediaRecorder.start(100) // Send chunks every 100ms
      }

      ws.onmessage = (event) => {
        // Handle incoming audio/transcription
        setStatus('speaking')
        
        if (event.data instanceof Blob) {
          // Play audio response
          const audioUrl = URL.createObjectURL(event.data)
          const audio = new Audio(audioUrl)
          audio.play()
          audio.onended = () => {
            setStatus('listening')
            URL.revokeObjectURL(audioUrl)
          }
        }
      }

      ws.onerror = () => {
        setError(new VoiceConnectionError())
        setStatus('error')
      }

      ws.onclose = () => {
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
  }, [status, monitorAudioLevel])

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
