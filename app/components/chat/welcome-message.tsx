"use client"

import { useUser } from "@/lib/user-store/provider"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Sun, CloudSun, Moon } from "@phosphor-icons/react"

export function WelcomeMessage() {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("Hello")
  const [timeIcon, setTimeIcon] = useState<"morning" | "afternoon" | "evening">("afternoon")
  const [isDark, setIsDark] = useState(false)
  
  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])
  
  // Get first name from display_name or email
  const getFirstName = () => {
    if (!user) return ""
    
    if (user.display_name) {
      // Extract first name from full name
      return user.display_name.split(" ")[0]
    }
    
    if (user.email) {
      // Extract name from email (before @)
      const emailName = user.email.split("@")[0]
      // Capitalize first letter
      return emailName.charAt(0).toUpperCase() + emailName.slice(1)
    }
    
    return ""
  }

  const firstName = getFirstName()

  // Set greeting and icon based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting("Good morning")
      setTimeIcon("morning")
    } else if (hour < 18) {
      setGreeting("Good afternoon")
      setTimeIcon("afternoon")
    } else {
      setGreeting("Good evening")
      setTimeIcon("evening")
    }
  }, [])

  // Icon component based on time
  const TimeIcon = () => {
    const iconProps = {
      size: 32,
      weight: "duotone" as const,
      className: "text-primary"
    }

    switch (timeIcon) {
      case "morning":
        return <Sun {...iconProps} className="text-amber-500" />
      case "afternoon":
        return <CloudSun {...iconProps} className="text-blue-400" />
      case "evening":
        return <Moon {...iconProps} className="text-indigo-400" />
    }
  }

  // Split text into words for staggered animation
  const greetingText = firstName ? `${greeting}, ${firstName}` : "What's on your mind?"
  const words = greetingText.split(" ")

  return (
    <div className="flex flex-col items-center text-center space-y-4 mb-6">
      {/* Time Icon with enhanced animation and glow effect */}
      <motion.div
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{ 
          scale: 1, 
          rotate: 0, 
          opacity: 1,
        }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className="relative"
      >
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            filter: "drop-shadow(0 0 8px currentColor)",
          }}
        >
          <motion.div
            animate={{
              filter: [
                "drop-shadow(0 0 8px currentColor)",
                "drop-shadow(0 0 16px currentColor)",
                "drop-shadow(0 0 8px currentColor)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <TimeIcon />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Greeting with word-by-word reveal + gradient effect */}
            {/* Greeting with word-by-word reveal + color transition effect */}
      <div className="text-3xl md:text-4xl font-bold tracking-tight">
        {words.map((word, index) => (
          <motion.span
            key={index}
            initial={{ 
              opacity: 0, 
              y: 20, 
              filter: "blur(8px)", 
              scale: 0.8 
            }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              filter: "blur(0px)", 
              scale: 1,
            }}
            transition={{
              duration: 0.5,
              delay: 0.3 + index * 0.15,
              ease: [0.34, 1.56, 0.64, 1]
            }}
            className="inline-block mr-[0.3em] last:mr-0"
          >
            <motion.span
              animate={{
                color: [
                  "rgb(99, 102, 241)",  // indigo-500
                  "rgb(168, 85, 247)",  // purple-500
                  "rgb(99, 102, 241)",  // back to indigo-500
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.1,
              }}
              className="font-bold"
            >
              {word}
            </motion.span>
          </motion.span>
        ))}
      </div>
      
      {/* Subtitle with gentle fade-in and breathing effect */}
      <motion.p
        className="text-muted-foreground text-sm md:text-base max-w-md"
        initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ 
          duration: 0.6, 
          delay: 0.3 + words.length * 0.15,
          ease: [0.34, 1.56, 0.64, 1]
        }}
      >
        <motion.span
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Let Kylio be with you — your AI companion for work, creativity, and beyond
        </motion.span>
      </motion.p>
    </div>
  )
}
