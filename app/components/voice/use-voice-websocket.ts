/**
 * Voice Mode - WebSocket Implementation
 * Uses Railway proxy server for WebSocket connection
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface VoiceWebSocketOptions {
  chatId: string
  onStatusChange?: (status: string) => void
  onError?: (error: Error) => void
}

interface VoiceWebSocketReturn {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error'
  error: Error | null
  startSession: () => Promise<void>
  stopSession: () => void
  audioLevel: number
}

export function useVoiceWebSocket({
  chatId,
  onStatusChange,
  onError
}: VoiceWebSocketOptions): VoiceWebSocketReturn {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const updateStatus = useCallback((newStatus: typeof status) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  const handleError = useCallback((err: Error) => {
    console.error('❌ Voice WebSocket error:', err)
    setError(err)
    updateStatus('error')
    onError?.(err)
  }, [onError, updateStatus])

  const startSession = async () => {
    try {
      updateStatus('connecting')
      console.log('🎤 Starting WebSocket voice session...')

      // Get Railway proxy URL from environment
      const wsProxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL || 'ws://localhost:8080'
      console.log('🔗 Connecting to Railway proxy:', wsProxyUrl)

      // Request microphone access
      console.log('🎤 Requesting microphone access...')
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
      console.log('✅ Microphone access granted')

      // Setup audio context for visualization
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Connect to Railway WebSocket proxy
      const model = 'gpt-4o-mini-realtime-preview-2024-12-17'
      const ws = new WebSocket(`${wsProxyUrl}?model=${encodeURIComponent(model)}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected to Railway proxy')
        updateStatus('connected')

        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              silence_duration_ms: 500
            },
            instructions: `You are a helpful AI assistant. Keep responses concise and natural for voice conversation.`,
            voice: 'alloy',
            modalities: ['text', 'audio']
          }
        }))

        // Start streaming audio from microphone
        startAudioStreaming(stream, ws)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          // Handle different event types
          switch (message.type) {
            case 'session.created':
              console.log('✅ Session created:', message.session.id)
              break
            
            case 'session.updated':
              console.log('✅ Session updated')
              break
            
            case 'input_audio_buffer.speech_started':
              console.log('🎤 User started speaking')
              updateStatus('speaking')
              break
            
            case 'input_audio_buffer.speech_stopped':
              console.log('🎤 User stopped speaking')
              updateStatus('listening')
              break
            
            case 'response.audio.delta':
              // Play audio delta
              if (message.delta) {
                playAudioDelta(message.delta)
              }
              break
            
            case 'response.audio_transcript.delta':
              console.log('📝 AI transcript:', message.delta)
              break
            
            case 'response.done':
              console.log('✅ Response completed')
              updateStatus('connected')
              break
            
            case 'error':
              console.error('❌ Server error:', message.error)
              handleError(new Error(message.error.message || 'Server error'))
              break
          }
        } catch (err) {
          console.error('❌ Failed to parse message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event)
        handleError(new Error('WebSocket connection error'))
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason)
        if (status !== 'idle') {
          updateStatus('idle')
        }
      }

      // Start audio level monitoring
      monitorAudioLevel()

    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to start session'))
    }
  }

  const startAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) {
      console.error('❌ No audio track found')
      return
    }

    // Create MediaRecorder to stream audio
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        // Convert to base64 and send
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1]
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }))
        }
        reader.readAsDataURL(event.data)
      }
    }

    // Send audio chunks every 100ms
    mediaRecorder.start(100)
    console.log('🎤 Started streaming microphone audio to OpenAI')
  }

  const playAudioDelta = (base64Audio: string) => {
    // Decode base64 to audio and play
    const audioData = atob(base64Audio)
    const arrayBuffer = new Uint8Array(audioData.length)
    for (let i = 0; i < audioData.length; i++) {
      arrayBuffer[i] = audioData.charCodeAt(i)
    }

    const audioContext = audioContextRef.current
    if (!audioContext) return

    audioContext.decodeAudioData(arrayBuffer.buffer, (buffer) => {
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start()
    })
  }

  const monitorAudioLevel = () => {
    const analyser = analyserRef.current
    if (!analyser) return

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioLevel(average / 255)
      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }

  const stopSession = useCallback(() => {
    console.log('🛑 Stopping WebSocket voice session...')

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    updateStatus('idle')
    setAudioLevel(0)
  }, [updateStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession()
    }
  }, [stopSession])

  return {
    status,
    error,
    startSession,
    stopSession,
    audioLevel
  }
}
