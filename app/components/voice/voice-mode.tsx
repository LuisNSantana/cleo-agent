'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoice } from './use-voice'
import { cn } from '@/lib/utils'

// Audio visualizer component with modern design
function AudioVisualizer({ 
  audioLevel, 
  status 
}: { 
  audioLevel: number
  status: 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error' | 'reconnecting'
}) {
  const isActive = status === 'listening' || status === 'speaking' || status === 'active'
  const isSpeaking = status === 'speaking'
  const isListening = status === 'listening'
  const isReconnecting = status === 'reconnecting'

  const bars = Array.from({ length: 32 }, (_, i) => {
    const baseHeight = 0.15 + (Math.sin(i * 0.4) * 0.2)
    const audioHeight = isActive ? audioLevel * 0.85 : 0
    const speakingBoost = isSpeaking ? Math.sin(Date.now() / 80 + i * 0.5) * 0.35 : 0
    const listeningPulse = isListening ? Math.sin(Date.now() / 120 + i * 0.3) * 0.2 : 0
    return Math.max(baseHeight, audioHeight + speakingBoost + listeningPulse)
  })

  return (
    <div className="flex items-center justify-center gap-[3px] h-24 px-6">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-colors duration-300",
            isSpeaking
              ? "bg-gradient-to-t from-cyan-400 via-blue-400 to-purple-400"
              : isListening
              ? "bg-gradient-to-t from-emerald-400 via-teal-400 to-cyan-400"
              : isReconnecting
              ? "bg-gradient-to-t from-amber-400 via-orange-400 to-red-400"
              : "bg-gradient-to-t from-zinc-600 to-zinc-500"
          )}
          initial={{ scaleY: 0.15 }}
          animate={{
            scaleY: height,
            opacity: isActive || isReconnecting ? 1 : 0.4
          }}
          transition={{
            duration: 0.1,
            ease: "easeOut"
          }}
          style={{
            originY: 0.5,
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
    cost,
    provider
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
      case 'reconnecting':
        return 'Reconectando...'
      case 'active':
      case 'listening':
        return 'Te escucho...'
      case 'speaking':
        return 'Respondiendo...'
      case 'error':
        return 'Error de conexión'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return 'from-emerald-400 to-teal-400'
      case 'speaking':
        return 'from-cyan-400 to-blue-400'
      case 'connecting':
        return 'from-amber-400 to-yellow-400'
      case 'reconnecting':
        return 'from-orange-400 to-amber-400'
      case 'error':
        return 'from-red-400 to-rose-400'
      default:
        return 'from-zinc-400 to-zinc-500'
    }
  }

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isActive) {
            onClose?.()
          }
        }}
      >
        <motion.div
          className="relative w-full max-w-sm overflow-hidden"
          initial={{ y: 30, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Glassmorphism card */}
          <div className="relative bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 backdrop-blur-xl rounded-[32px] border border-white/10 shadow-2xl shadow-black/50">
            {/* Animated gradient background */}
            <div className="absolute inset-0 rounded-[32px] overflow-hidden">
              <div className={cn(
                "absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-20 transition-all duration-1000",
                isActive 
                  ? status === 'speaking' 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500" 
                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              )} />
              <div className={cn(
                "absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-15 transition-all duration-1000",
                isActive 
                  ? status === 'speaking' 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500" 
                    : "bg-gradient-to-r from-teal-500 to-cyan-500"
                  : "bg-gradient-to-r from-pink-500 to-orange-500"
              )} />
            </div>

            {/* Close button */}
            {!isActive && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={onClose}
                className="absolute top-5 right-5 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </motion.button>
            )}

            <div className="relative z-10 p-8 space-y-6">
              {/* Status pill */}
              {status !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r backdrop-blur-sm border border-white/10",
                    getStatusColor()
                  )}>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-white"
                    />
                    <span className="text-xs font-semibold text-white">
                      {getStatusText()}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Main content */}
              {!isActive ? (
                <div className="flex flex-col items-center space-y-8">
                  {/* Avatar with glow */}
                  <div className="relative">
                    {/* Animated rings */}
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/30 to-purple-500/30"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <motion.div 
                      className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20"
                      animate={{ scale: [1.1, 1.25, 1.1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                    />
                    
                    {/* Avatar container */}
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
                      <img 
                        src="/img/agents/ankie4.png" 
                        alt="Ankie" 
                        className="w-24 h-24 object-contain drop-shadow-lg"
                      />
                    </div>
                    
                    {/* Mic badge */}
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center ring-4 ring-zinc-900 shadow-lg shadow-emerald-500/30"
                    >
                      <Mic className="w-5 h-5 text-white" />
                    </motion.div>
                  </div>

                  {/* Title */}
                  <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Habla con Ankie
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-[260px] leading-relaxed">
                      Inicia una conversación por voz. Ankie te escuchará y responderá en tiempo real.
                    </p>
                  </div>

                  {/* Start button */}
                  <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleStart}
                      size="lg"
                      disabled={status === 'connecting'}
                      className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-semibold py-6 rounded-2xl shadow-lg shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-0"
                    >
                      {status === 'connecting' ? (
                        <span className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Conectando...</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <Phone className="w-5 h-5" />
                          <span>Iniciar llamada</span>
                          <Sparkles className="w-4 h-4 opacity-70" />
                        </span>
                      )}
                    </Button>
                  </motion.div>

                  {/* Info text */}
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    Se requerirá permiso de micrófono
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-6">
                  {/* Visualizer */}
                  <div className="w-full bg-zinc-800/30 rounded-2xl py-4 border border-white/5">
                    <AudioVisualizer audioLevel={audioLevel} status={status} />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-center gap-8 w-full">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
                        {formatDuration(duration)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">Duración</div>
                    </div>
                    <div className="w-px h-14 bg-gradient-to-b from-transparent via-zinc-600 to-transparent" />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-400 tabular-nums tracking-tight">
                        {formatCost(cost)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">Costo</div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 w-full">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                      <Button
                        onClick={toggleMute}
                        variant="outline"
                        size="lg"
                        className={cn(
                          "w-full h-14 rounded-2xl border-2 transition-all duration-300",
                          isMuted 
                            ? "bg-red-500/10 border-red-500/50 hover:bg-red-500/20" 
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        {isMuted ? (
                          <MicOff className="w-6 h-6 text-red-400" />
                        ) : (
                          <Mic className="w-6 h-6 text-white" />
                        )}
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                      <Button
                        onClick={handleEnd}
                        size="lg"
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 border-0 shadow-lg shadow-red-500/25"
                      >
                        <PhoneOff className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Finalizar</span>
                      </Button>
                    </motion.div>
                  </div>

                  {/* Hint */}
                  <p className="text-xs text-zinc-500 text-center">
                    Habla naturalmente, Ankie te responderá
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                      <span className="text-red-400 text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-sm text-red-400 font-medium">
                        {error.message}
                      </p>
                      {error.message.includes('micrófono') && (
                        <p className="text-xs text-red-300/70 leading-relaxed">
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

