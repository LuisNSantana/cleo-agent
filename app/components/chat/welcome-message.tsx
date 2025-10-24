"use client"

import { useUser } from "@/lib/user-store/provider"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function WelcomeMessage() {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("Hello")
  
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

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting("Good morning")
    } else if (hour < 18) {
      setGreeting("Good afternoon")
    } else {
      setGreeting("Good evening")
    }
  }, [])

  return (
    <div className="flex flex-col items-center text-center space-y-4 mb-6">
      <motion.h1
        className="text-3xl md:text-4xl font-medium tracking-tight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {firstName ? `${greeting}, ${firstName}` : "What's on your mind?"}
      </motion.h1>
      
      <motion.p
        className="text-muted-foreground text-sm md:text-base max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        Let Cleo be with you — your AI companion for work, creativity, and beyond
      </motion.p>
    </div>
  )
}
