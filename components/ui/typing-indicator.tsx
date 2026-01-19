"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import Image from "next/image"
import { useState, useEffect } from "react"

interface TypingIndicatorProps {
  className?: string
  message?: string
  showTimer?: boolean
}

export function TypingIndicator({ 
  className,
  message = "Pensando...",
  showTimer = true
}: TypingIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!showTimer) return
    
    const startTime = Date.now()
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [showTimer])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <motion.div 
      className={cn(
        // Modern glassmorphism card
        "relative inline-flex items-center gap-3 pl-1.5 pr-4 py-1.5",
        "bg-card/80 dark:bg-zinc-900/90",
        "backdrop-blur-xl",
        "border border-border/50 dark:border-zinc-700/60",
        "rounded-full",
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        className
      )}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1] // Apple-like easing
      }}
    >
      {/* Subtle glow effect behind avatar */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-md" />
      
      {/* Avatar with breathing glow ring */}
      <motion.div 
        className="relative flex-shrink-0"
        animate={{ 
          scale: [1, 1.02, 1],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        {/* Glowing ring */}
        <motion.div
          className="absolute inset-[-2px] rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500"
          animate={{
            rotate: [0, 360],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{ padding: '2px' }}
        />
        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-900 ring-2 ring-card">
          <Image 
            src="/img/agents/ankie4.png" 
            alt="Ankie" 
            width={32} 
            height={32}
            className="w-full h-full object-cover"
            priority
          />
        </div>
      </motion.div>
      
      {/* Wave dots animation */}
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-[6px] w-[6px] rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Message and timer */}
      <div className="flex items-center gap-2">
        <motion.span 
          className="text-sm font-medium text-foreground/90"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          {message}
        </motion.span>
        {showTimer && elapsedTime > 0 && (
          <motion.span 
            className="text-[11px] text-muted-foreground/70 tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {formatTime(elapsedTime)}
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}
