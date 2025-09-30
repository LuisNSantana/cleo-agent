'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AudioVisualizerProps {
  audioLevel: number
  status: 'idle' | 'connecting' | 'active' | 'speaking' | 'listening' | 'error'
}

export function AudioVisualizer({ audioLevel, status }: AudioVisualizerProps) {
  const isActive = status === 'listening' || status === 'speaking' || status === 'active'
  const isSpeaking = status === 'speaking'

  // Generate bars
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
