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
  message = "Cleo está pensando...",
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
        "flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-card/50 via-card/30 to-background/50 backdrop-blur-sm border border-border/40 rounded-lg",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cleo Avatar with pulse */}
      <motion.div 
        className="relative h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
        animate={{ 
          boxShadow: [
            "0 0 0 0 rgba(168, 85, 247, 0.4)",
            "0 0 0 10px rgba(168, 85, 247, 0)",
          ]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full" />
        <Image 
          src="/img/agents/logocleo4.png" 
          alt="Cleo" 
          width={40} 
          height={40}
          className="relative z-10 rounded-full"
          priority
        />
      </motion.div>
      
      {/* Typing dots with staggered animation */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-primary to-primary/60"
            animate={{
              y: ["0%", "-60%", "0%"],
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Message with timer */}
      <div className="flex flex-col gap-0.5">
        {message && (
          <motion.span 
            className="text-sm font-medium text-foreground/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {message}
          </motion.span>
        )}
        {showTimer && (
          <motion.span 
            className="text-xs text-muted-foreground font-mono"
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
