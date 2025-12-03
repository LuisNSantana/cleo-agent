"use client"

import { useUser } from "@/lib/user-store/provider"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Sparkle, Code, PenNib, Brain, RocketLaunch } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const FOCUS_OPTIONS = [
  { id: "coding", label: "Coding", icon: Code, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "writing", label: "Writing", icon: PenNib, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "brainstorm", label: "Planning", icon: Brain, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "launch", label: "Shipping", icon: RocketLaunch, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
]

export function WelcomeMessage() {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("")
  const [showFocus, setShowFocus] = useState(false)
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null)
  
  // Get first name
  const firstName = user?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Creator"
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  // Typing effect logic
  useEffect(() => {
    const hour = new Date().getHours()
    let text = ""
    if (hour < 12) text = `Good morning, ${capitalizedName}.`
    else if (hour < 18) text = `Good afternoon, ${capitalizedName}.`
    else text = `Good evening, ${capitalizedName}.`

    let i = 0
    const timer = setInterval(() => {
      setGreeting(text.slice(0, i + 1))
      i++
      if (i === text.length) {
        clearInterval(timer)
        setTimeout(() => setShowFocus(true), 500)
      }
    }, 50)

    return () => clearInterval(timer)
  }, [capitalizedName])

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
