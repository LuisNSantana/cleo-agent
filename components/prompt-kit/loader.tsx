"use client"

import { motion, type Transition } from "framer-motion"
import { useState, useEffect } from "react"
import Image from "next/image"

// Style constants
const DOT_SIZE = "size-2.5"
const DOT_SPACING = "gap-1.5"

// Animation constants
const ANIMATION_DURATION = 0.8
const DELAY_DOT_1 = 0
const DELAY_DOT_2 = 0.15
const DELAY_DOT_3 = 0.3

// Animation settings
const ANIMATION = {
  y: ["0%", "-60%", "0%"],
  opacity: [0.4, 1, 0.4],
  scale: [1, 1.2, 1],
}

const TRANSITION: Transition = {
  duration: ANIMATION_DURATION,
  ease: "easeInOut",
  repeat: Number.POSITIVE_INFINITY,
  repeatType: "loop",
}

export function Loader() {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <motion.div 
      className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-card/50 via-card/30 to-background/50 backdrop-blur-sm border border-border/40 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ankie Avatar with pulse animation */}
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
          src="/img/agents/ankie4.png" 
          alt="Ankie" 
          width={40} 
          height={40}
          className="relative z-10 rounded-full"
          priority
        />
      </motion.div>

      {/* Animated dots */}
      <div className={`flex items-center justify-center ${DOT_SPACING}`}>
        <Dot delay={DELAY_DOT_1} />
        <Dot delay={DELAY_DOT_2} />
        <Dot delay={DELAY_DOT_3} />
      </div>

      {/* Processing text with elapsed time */}
      <div className="flex flex-col gap-0.5">
        <motion.span 
          className="text-sm font-medium text-foreground/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Procesando...
        </motion.span>
        <motion.span 
          className="text-xs text-muted-foreground font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {formatTime(elapsedTime)}
        </motion.span>
      </div>
    </motion.div>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.div
      className={`${DOT_SIZE} rounded-full bg-gradient-to-r from-primary to-primary/60`}
      animate={ANIMATION}
      transition={{
        ...TRANSITION,
        delay,
      }}
    />
  )
}
