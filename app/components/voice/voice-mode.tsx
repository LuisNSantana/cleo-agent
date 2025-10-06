'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoice } from './use-voice'
import { cn } from '@/lib/utils'

// Audio visualizer component (inline to avoid import issues)
function AudioVisualizer({ 
  audioLevel, 
  status 
}: { 
  audioLevel: number
  status: 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error'
}) {
  const isActive = status === 'listening' || status === 'speaking' || status === 'active'
  const isSpeaking = status === 'speaking'

  const bars = Array.from({ length: 40 }, (_, i) => {
    const baseHeight = 0.2 + (Math.sin(i * 0.5) * 0.3)
    const audioHeight = isActive ? audioLevel * 0.8 : 0
    const speakingBoost = isSpeaking ? Math.sin(Date.now() / 100 + i) * 0.3 : 0
    return Math.max(baseHeight, audioHeight + speakingBoost)
  })

  return (
    <div className="flex items-center justify-center gap-1 h-32 px-4">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 rounded-full",
            isSpeaking
              ? "bg-gradient-to-t from-blue-500 to-purple-500"
              : status === 'listening'
              ? "bg-gradient-to-t from-emerald-500 to-green-400"
              : "bg-gradient-to-t from-zinc-700 to-zinc-600"
          )}
          initial={{ scaleY: 0.2 }}
          animate={{
            scaleY: height,
            opacity: isActive ? 1 : 0.3
          }}
          transition={{
            duration: 0.15,
            ease: "easeOut"
          }}
          style={{
            originY: 1,
            height: '100%'
          }}
        />
      ))}
    </div>
  )
}

interface VoiceModeProps {
  chatId?: string
  onClose?: () => void
}

export function VoiceMode({ chatId, onClose }: VoiceModeProps) {
  const [mounted, setMounted] = useState(false)
  
  const {
    startSession,
    endSession,
    toggleMute,
    status,
    error,
    isMuted,
    isActive,
    audioLevel,
    duration,
    cost
  } = useVoice()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const handleStart = async () => {
    try {
      // Check if microphone is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso al micrófono. Por favor usa Chrome, Edge o Safari.')
      }

      // Check microphone permissions before starting
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        console.log('🎤 Microphone permission status:', permissionStatus.state)
        
        if (permissionStatus.state === 'denied') {
          throw new Error('Acceso al micrófono denegado. Por favor permite el acceso en la configuración de tu navegador.')
        }
      } catch (permErr) {
        // Permission API might not be available in all browsers, continue anyway
        console.log('⚠️ Could not check microphone permissions, will request during session start')
      }

      await startSession(chatId)
    } catch (err) {
      console.error('Failed to start voice session:', err)
      // Error will be displayed via the error state in useVoiceWebRTC
    }
  }

  const handleEnd = async () => {
    await endSession()
    onClose?.()
  }

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Conectando...'
      case 'active':
      case 'listening':
        return 'Escuchando...'
      case 'speaking':
        return 'Cleo está hablando...'
      case 'error':
        return 'Error en la conexión'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return 'bg-emerald-500'
      case 'speaking':
        return 'bg-blue-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-zinc-500'
    }
  }

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isActive) {
            onClose?.()
          }
        }}
      >
        <motion.div
          className="relative w-full max-w-md bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
        >
          {/* Close button */}
          {!isActive && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          )}

          {/* Header gradient */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-purple-500/10 to-transparent" />

          <div className="relative p-8 space-y-6">
            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                getStatusColor()
              )} />
              <span className="text-sm font-medium text-zinc-300">
                {getStatusText()}
              </span>
            </div>

            {/* Main content */}
            {!isActive ? (
              <div className="flex flex-col items-center space-y-6">
                {/* Cleo Avatar */}
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-600/10 backdrop-blur-sm flex items-center justify-center ring-4 ring-purple-500/20 overflow-hidden">
                    <img 
                      src="/img/agents/logocleo4.png" 
                      alt="Cleo" 
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-zinc-900">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    Habla con Cleo
                  </h2>
                  <p className="text-sm text-zinc-400 max-w-xs">
                    Inicia una conversación por voz. Cleo te escuchará y responderá como en una llamada.
                  </p>
                </div>

                {/* Start button */}
                <Button
                  onClick={handleStart}
                  size="lg"
                  disabled={status === 'connecting'}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-6 rounded-2xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'connecting' ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Conectando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Iniciar llamada
                    </span>
                  )}
                </Button>

                {/* Info */}
                <div className="text-xs text-zinc-500 text-center">
                  Se requerirá permiso de micrófono
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                {/* Visualizer */}
                <div className="w-full">
                  <AudioVisualizer audioLevel={audioLevel} status={status} />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {formatDuration(duration)}
                    </div>
                    <div className="text-xs text-zinc-500">Duración</div>
                  </div>
                  <div className="w-px h-12 bg-zinc-700" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {formatCost(cost)}
                    </div>
                    <div className="text-xs text-zinc-500">Costo</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 w-full">
                  <Button
                    onClick={toggleMute}
                    variant="outline"
                    size="lg"
                    className={cn(
                      "flex-1 border-zinc-700 hover:border-zinc-600",
                      isMuted && "bg-red-500/10 border-red-500/50"
                    )}
                  >
                    {isMuted ? (
                      <MicOff className="w-5 h-5 text-red-400" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleEnd}
                    size="lg"
                    variant="destructive"
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    <PhoneOff className="w-5 h-5 mr-2" />
                    Finalizar
                  </Button>
                </div>

                {/* Hint */}
                <p className="text-xs text-zinc-500 text-center">
                  Habla naturalmente, Cleo te responderá
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                    <span className="text-red-400 text-xs font-bold">!</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-red-400 font-medium">
                      {error.message}
                    </p>
                    {error.message.includes('micrófono') && (
                      <p className="text-xs text-red-300/70">
                        • Verifica que tu micrófono esté conectado<br/>
                        • Permite el acceso al micrófono cuando el navegador lo solicite<br/>
                        • Revisa la configuración de permisos en tu navegador
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
