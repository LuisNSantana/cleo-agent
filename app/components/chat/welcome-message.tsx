"use client"

import { useUser } from "@/lib/user-store/provider"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Sun, CloudSun, Moon } from "@phosphor-icons/react"

export function WelcomeMessage() {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("Hello")
  const [timeIcon, setTimeIcon] = useState<"morning" | "afternoon" | "evening">("afternoon")
  
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
      {/* Time Icon with animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1
        }}
      >
        <TimeIcon />
      </motion.div>

      {/* Greeting with word-by-word reveal */}
      <div className="text-3xl md:text-4xl font-medium tracking-tight">
        {words.map((word, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.3,
              delay: 0.3 + index * 0.1,
              ease: [0.25, 0.4, 0.25, 1]
            }}
            className="inline-block mr-[0.3em] last:mr-0"
          >
            {word}
          </motion.span>
        ))}
      </div>
      
      {/* Subtitle with gentle fade-in */}
      <motion.p
        className="text-muted-foreground text-sm md:text-base max-w-md"
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ 
          duration: 0.5, 
          delay: 0.3 + words.length * 0.1,
          ease: [0.25, 0.4, 0.25, 1]
        }}
      >
        Let Cleo be with you — your AI companion for work, creativity, and beyond
      </motion.p>
    </div>
  )
}
