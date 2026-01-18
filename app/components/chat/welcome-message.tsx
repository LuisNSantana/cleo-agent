"use client"

import { useUser } from "@/lib/user-store/provider"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useMemo } from "react"
import { Sparkle, Code, PenNib, Brain, RocketLaunch } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const FOCUS_OPTIONS = [
  { id: "coding", label: "Coding", icon: Code, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "writing", label: "Writing", icon: PenNib, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "brainstorm", label: "Planning", icon: Brain, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "launch", label: "Shipping", icon: RocketLaunch, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
]

// 🎨 Creative greeting templates with personality
const GREETING_TEMPLATES = {
  morning: [
    (name: string) => `Buenos días, ${name}. ☀️`,
    (name: string) => `Rise and shine, ${name}! 🌅`,
    (name: string) => `¡Arriba, ${name}! El café está listo. ☕`,
    (name: string) => `Good morning, ${name}. Ready to create? ✨`,
    (name: string) => `Hey ${name}, let's make today count. 🚀`,
    (name: string) => `Morning, ${name}! What shall we build? 🛠️`,
  ],
  afternoon: [
    (name: string) => `Buenas tardes, ${name}. 🌤️`,
    (name: string) => `Hey ${name}, how's the day going? 💪`,
    (name: string) => `What's up, ${name}? Ready to ship? 📦`,
    (name: string) => `Hola ${name}, ¿en qué te ayudo? 🤝`,
    (name: string) => `Good afternoon, ${name}. Let's do this! ⚡`,
    (name: string) => `${name}! Perfect timing. What's the mission? 🎯`,
  ],
  evening: [
    (name: string) => `Buenas noches, ${name}. 🌙`,
    (name: string) => `Evening, ${name}. Night owl mode? 🦉`,
    (name: string) => `Hey ${name}, burning the midnight oil? 🔥`,
    (name: string) => `Good evening, ${name}. Let's wrap up strong. 💫`,
    (name: string) => `Hola ${name}, ¿una última cosa antes de dormir? 😴`,
    (name: string) => `${name}! Still at it? I admire the hustle. 🌟`,
  ],
}

// Sub-messages that appear after the greeting
const SUB_MESSAGES = [
  "Tu asistente AI está listo para ayudarte.",
  "Ready when you are.",
  "Let's turn ideas into reality.",
  "Your AI copilot is here.",
  "¿Qué construimos hoy?",
  "The possibilities are endless.",
  "Ask me anything.",
  "Creatividad sin límites.",
  "From concept to code.",
  "Tu segundo cerebro.",
]

export function WelcomeMessage() {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("")
  const [showFocus, setShowFocus] = useState(false)
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null)
  
  // Get first name
  const firstName = user?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Creator"
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  // Select random greeting and sub-message (memoized to stay consistent during session)
  const { selectedGreeting, subMessage } = useMemo(() => {
    const hour = new Date().getHours()
    let templates: ((name: string) => string)[]
    
    if (hour < 12) templates = GREETING_TEMPLATES.morning
    else if (hour < 18) templates = GREETING_TEMPLATES.afternoon
    else templates = GREETING_TEMPLATES.evening

    const randomGreeting = templates[Math.floor(Math.random() * templates.length)]
    const randomSubMessage = SUB_MESSAGES[Math.floor(Math.random() * SUB_MESSAGES.length)]
    
    return {
      selectedGreeting: randomGreeting(capitalizedName),
      subMessage: randomSubMessage,
    }
  }, [capitalizedName])

  // Typing effect logic
  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      setGreeting(selectedGreeting.slice(0, i + 1))
      i++
      if (i === selectedGreeting.length) {
        clearInterval(timer)
        setTimeout(() => setShowFocus(true), 500)
      }
    }, 50)

    return () => clearInterval(timer)
  }, [selectedGreeting])

  return (
    <div className="flex flex-col items-center text-center space-y-8 mb-8 w-full max-w-2xl mx-auto">
      
      {/* Main Greeting Area */}
      <div className="relative z-10">
        {/* Ambient Glow Behind Text */}
        <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl opacity-30 animate-pulse" />
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight relative">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {greeting}
          </span>
          <span className="animate-pulse text-primary ml-1">|</span>
        </h1>
        
        {/* Sub-message with fade-in animation */}
        <AnimatePresence>
          {showFocus && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-muted-foreground text-lg mt-4 font-light"
            >
              {subMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Focus Selector */}
      <AnimatePresence>
        {showFocus && (
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase opacity-70">
              What is your focus today?
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedFocus(option.id)}
                  className={cn(
                    "group relative flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    selectedFocus === option.id
                      ? cn(option.bg, option.border, "ring-1 ring-offset-1 ring-offset-background", option.color.replace("text-", "ring-"))
                      : "bg-background/50 border-border/50 hover:border-border hover:bg-background"
                  )}
                >
                  <option.icon 
                    weight={selectedFocus === option.id ? "fill" : "duotone"} 
                    className={cn("size-4 transition-colors", selectedFocus === option.id ? option.color : "text-muted-foreground group-hover:text-foreground")} 
                  />
                  <span className={cn("text-sm font-medium transition-colors", selectedFocus === option.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    {option.label}
                  </span>
                  
                  {/* Subtle shine effect on hover */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Subtitle based on selection */}
      <AnimatePresence mode="wait">
        {selectedFocus && (
          <motion.div
            key={selectedFocus}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80 bg-muted/30 px-4 py-2 rounded-lg border border-border/30 backdrop-blur-sm">
              <Sparkle className="size-4 text-amber-400" weight="fill" />
              <span>
                {selectedFocus === "coding" && "Ankie is ready to debug and architect."}
                {selectedFocus === "writing" && "Let's craft compelling narratives."}
                {selectedFocus === "brainstorm" && "Unlocking creative potential."}
                {selectedFocus === "launch" && "Systems go. Let's ship this."}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
