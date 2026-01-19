"use client"

import { motion, type Transition } from "framer-motion"
import { useState, useEffect } from "react"
import Image from "next/image"

// Animation constants
const ANIMATION_DURATION = 0.6

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
      className="inline-flex items-center gap-2.5 pl-1 pr-3.5 py-1 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-lg shadow-black/20"
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Compact Avatar with subtle glow ring */}
      <div className="relative flex-shrink-0">
        {/* Animated glow ring */}
        <motion.div
          className="absolute inset-[-1.5px] rounded-full"
          style={{
            background: "linear-gradient(135deg, #06b6d4, #8b5cf6, #06b6d4)",
            backgroundSize: "200% 200%",
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            opacity: [0.6, 0.9, 0.6]
          }}
          transition={{
            backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
            opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-zinc-800 bg-zinc-900">
          <Image 
            src="/img/agents/ankie4.png" 
            alt="Ankie" 
            width={28} 
            height={28}
            className="w-full h-full object-cover"
            priority
          />
        </div>
      </div>

      {/* Minimal wave dots */}
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-[5px] w-[5px] rounded-full"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
            }}
            animate={{
              y: [0, -5, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              ...TRANSITION,
              delay: i * 0.08,
            }}
          />
        ))}
      </div>

      {/* Sleek text */}
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium text-zinc-200">
          Pensando...
        </span>
        {elapsedTime > 0 && (
          <motion.span 
            className="text-[11px] text-zinc-500 tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {formatTime(elapsedTime)}
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}
