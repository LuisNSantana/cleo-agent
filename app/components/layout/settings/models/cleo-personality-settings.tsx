"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import {
  type PersonalityType,
  type PersonalitySettings,
  defaultPreferences,
} from "@/lib/user-preference-store/utils"
import {
  BrainIcon,
  HeartIcon,
  SmileyIcon,
  MaskHappyIcon,
  GearIcon,
  LightbulbIcon,
  ChatCircleDotsIcon,
  SparkleIcon,
  GraduationCapIcon,
  InfoIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react"
import { motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { debounce } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generatePersonalizedPrompt } from "@/lib/prompts/personality"

const EXAMPLE_INSTRUCTIONS = `Example instructions you can use:

🎯 Role & Context:
"You're my technical advisor for a SaaS startup. Keep responses practical and focused on growth."

📝 Communication Style:
"Be concise and direct. Use bullet points for complex topics. Avoid unnecessary pleasantries."

🚫 Boundaries:
"Don't make assumptions about my technical knowledge. Always explain acronyms first."

💡 Preferences:
"When suggesting code, prefer TypeScript over JavaScript. For design, prioritize accessibility."

Remember: The more specific you are, the better Cleo can adapt to your needs!`

const personalityTypes = [
  {
    id: "empathetic" as PersonalityType,
    name: "Empathetic",
    description: "Warm, supportive responses like a caring friend",
    icon: HeartIcon,
    color: "bg-pink-100 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
    example: "I understand how you feel. I'm here to help you step by step 💙"
  },
  {
    id: "playful" as PersonalityType,
    name: "Playful",
    description: "Cheerful, creative responses with humor and energy",
    icon: MaskHappyIcon,
    color: "bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    example: "Oooh, interesting! 🎉 Let's make something awesome with this ✨"
  },
  {
    id: "professional" as PersonalityType,
    name: "Professional",
    description: "Clear, direct responses focused on efficiency",
    icon: GearIcon,
    color: "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    example: "Let's analyze your query. I propose three effective options:"
  },
  {
    id: "creative" as PersonalityType,
    name: "Creative",
    description: "Imaginative, outside-the-box responses",
    icon: SparkleIcon,
    color: "bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    example: "Fascinating! 🌟 Imagine combining this with... what if we try something different?"
  },
  {
    id: "analytical" as PersonalityType,
    name: "Analytical",
    description: "Detailed, well-reasoned explanations",
    icon: BrainIcon,
    color: "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    example: "Considering factors A, B, and C, the analysis suggests that..."
  },
  {
    id: "friendly" as PersonalityType,
    name: "Friendly",
    description: "Conversational and relaxed replies",
    icon: ChatCircleDotsIcon,
    color: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    example: "Hey! I love your question. Let's check it out together 😊"
  },
]

export function CleoPersonalitySettings() {
  const { preferences, updatePreferences } = useUserPreferences()

  // Local, responsive UI state with optimistic debounced persistence
  const [localSettings, setLocalSettings] = useState<PersonalitySettings>(
    preferences.personalitySettings || defaultPreferences.personalitySettings!
  )

  // Track when user is actively typing to prevent race conditions
  const isTypingRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Keep local state in sync if external preferences change elsewhere
  // BUT only if user is not actively typing (prevents race condition)
  useEffect(() => {
    if (preferences.personalitySettings && !isTypingRef.current) {
      setLocalSettings(preferences.personalitySettings)
    }
  }, [preferences.personalitySettings])

  // Debounced saver to avoid spamming network on every tiny change
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const debouncedSaveRef = useRef(
    debounce((next: PersonalitySettings) => {
      updatePreferences({ personalitySettings: next })
      // optimistic UX: mark saved shortly after debounced call
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1200)
    }, 600)
  )

  const setAndSave = useCallback(
    (partial: Partial<PersonalitySettings>, { debounceSave = true } = {}) => {
      setLocalSettings((prev) => {
        const next = { ...prev, ...partial }
        if (debounceSave) {
          setSaveState("saving")
          debouncedSaveRef.current(next)
        } else {
          updatePreferences({ personalitySettings: next })
          setSaveState("saved")
          setTimeout(() => setSaveState("idle"), 1000)
        }
        return next
      })
    },
    [updatePreferences]
  )

  const handlePersonalityChange = (personality: PersonalityType) => {
    setAndSave({ personalityType: personality }, { debounceSave: false })
    toast({ title: "Style updated", description: "Cleo's personality changed.", status: "success" })
  }

  const handleSliderChange = (key: keyof PersonalitySettings, value: number[]) => {
    setAndSave({ [key]: value[0] } as Partial<PersonalitySettings>)
  }

  const handleSwitchChange = (key: keyof PersonalitySettings, value: boolean) => {
    setAndSave({ [key]: value } as Partial<PersonalitySettings>)
  }

  const resetToDefaults = () => {
    const defaults = defaultPreferences.personalitySettings!
    setLocalSettings(defaults)
    updatePreferences({ personalitySettings: defaults })
    toast({ title: "Defaults restored" })
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Enhanced Header with Better Value Prop */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
            <MaskHappyIcon className="size-6 text-pink-600 dark:text-pink-400" weight="duotone" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Customize Cleo's Personality</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              Make Cleo work exactly how you want—personalized responses, optimized performance
            </p>
          </div>
        </div>
        
        {/* Value Proposition Banner */}
        <div className="mt-4 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-4">
          <div className="flex items-start gap-3">
            <RocketLaunchIcon className="size-5 text-blue-500 shrink-0 mt-0.5" weight="duotone" />
            <div className="space-y-2 flex-1">
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                ✨ Unlock Cleo's Full Potential
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Personalize how Cleo responds to match your workflow. Choose a base personality, fine-tune behavior, 
                and add <strong>custom instructions</strong> to optimize accuracy and relevance for your specific needs.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <SparkleIcon className="size-3" />
                  Better accuracy
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <GraduationCapIcon className="size-3" />
                  Domain expertise
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <GearIcon className="size-3" />
                  Your preferences
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-end">
          <div className="text-xs">
            {saveState === "saving" && (
              <span className="text-muted-foreground">Saving…</span>
            )}
            {saveState === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-400">✓ Saved</span>
            )}
          </div>
        </div>
      </div>

      {/* Personality Types Grid */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Personality style</h4>
        <div className="relative rounded-xl">
          {/* soft background accent */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.07),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.06),transparent_60%)]" />
          <div
            className="grid items-stretch gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]"
            role="radiogroup"
            aria-label="Personality style"
          >
          {personalityTypes.map((personality) => {
            const Icon = personality.icon
            const isSelected = localSettings.personalityType === personality.id
            
            return (
              <motion.div
                key={personality.id}
                layout
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card
                  role="radio"
                  tabIndex={0}
                  aria-checked={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handlePersonalityChange(personality.id)
                    }
                  }}
                  className={`group relative cursor-pointer rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                    isSelected
                      ? "border-primary/60 ring-1 ring-primary/40 bg-gradient-to-b from-primary/10 to-transparent shadow-md"
                      : "hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] hover:bg-muted/40 hover:border-muted-foreground/25"
                  } min-h-[132px]`}
                  onClick={() => handlePersonalityChange(personality.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    {isSelected && (
                      <Badge className="absolute right-2 top-2 shadow" variant="secondary">Active</Badge>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`flex size-9 sm:size-10 items-center justify-center rounded-md border shrink-0 transition-colors ${isSelected ? "bg-primary/10 border-primary/30" : "bg-muted/40"}`}>
                        <Icon className="size-4 sm:size-5"/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="mb-1 text-sm font-medium">{personality.name}</h5>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {personality.description}
                        </p>
                        <blockquote className="rounded-md bg-muted/30 px-2 py-1.5 text-xs italic border-l-2 border-primary/20 max-h-12 overflow-hidden break-words whitespace-normal">
                          “{personality.example}”
                        </blockquote>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
          </div>
        </div>
      </div>

      {/* Fine-tuning Controls */}
      <div className="space-y-6 overflow-x-hidden">
        <h4 className="text-sm font-medium">Fine-tuning</h4>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setAndSave(
                {
                  creativityLevel: 60,
                  formalityLevel: 40,
                  enthusiasmLevel: 70,
                  helpfulnessLevel: 85,
                  proactiveMode: true,
                },
                { debounceSave: false }
              )
            }
          >
            Balanced
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setAndSave(
                {
                  creativityLevel: 90,
                  formalityLevel: 20,
                  enthusiasmLevel: 85,
                  helpfulnessLevel: 80,
                  useEmojis: true,
                  proactiveMode: true,
                },
                { debounceSave: false }
              )
            }
          >
            Creative+
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setAndSave(
                {
                  creativityLevel: 40,
                  formalityLevel: 80,
                  enthusiasmLevel: 45,
                  helpfulnessLevel: 90,
                  proactiveMode: false,
                  useEmojis: false,
                },
                { debounceSave: false }
              )
            }
          >
            Professional
          </Button>
        </div>
        
        {/* Sliders grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Creativity Level */}
          <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
          <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <SparkleIcon className="size-4" />
          Creativity
                  </label>
                </TooltipTrigger>
        <TooltipContent>Original ideas and outside‑the‑box solutions.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground">{localSettings.creativityLevel}%</span>
          </div>
          <Slider
            value={[localSettings.creativityLevel]}
            onValueChange={(value: number[]) => handleSliderChange('creativityLevel', value)}
            max={100}
            min={0}
            step={10}
            className="w-full max-w-full"
          />
            <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative</span>
            <span>Highly creative</span>
          </div>
          </div>

          {/* Formality Level */}
          <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
          <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <GraduationCapIcon className="size-4" />
          Formality
                  </label>
                </TooltipTrigger>
        <TooltipContent>Casual tone vs. professional/technical.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground">{localSettings.formalityLevel}%</span>
          </div>
          <Slider
            value={[localSettings.formalityLevel]}
            onValueChange={(value: number[]) => handleSliderChange('formalityLevel', value)}
            max={100}
            min={0}
            step={10}
            className="w-full max-w-full"
          />
            <div className="flex justify-between text-xs text-muted-foreground">
            <span>Casual</span>
            <span>Highly formal</span>
          </div>
          </div>

          {/* Enthusiasm Level */}
          <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
          <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <SmileyIcon className="size-4" />
          Enthusiasm
                  </label>
                </TooltipTrigger>
        <TooltipContent>Energy and expressiveness in replies.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground">{localSettings.enthusiasmLevel}%</span>
          </div>
          <Slider
            value={[localSettings.enthusiasmLevel]}
            onValueChange={(value: number[]) => handleSliderChange('enthusiasmLevel', value)}
            max={100}
            min={0}
            step={10}
            className="w-full max-w-full"
          />
            <div className="flex justify-between text-xs text-muted-foreground">
            <span>Calm</span>
            <span>Very enthusiastic</span>
          </div>
          </div>

          {/* Helpfulness Level */}
          <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
          <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <LightbulbIcon className="size-4" />
          Helpful proactivity
                  </label>
                </TooltipTrigger>
        <TooltipContent>Degree of solution‑orientation and concrete steps.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground">{localSettings.helpfulnessLevel}%</span>
          </div>
          <Slider
            value={[localSettings.helpfulnessLevel]}
            onValueChange={(value: number[]) => handleSliderChange('helpfulnessLevel', value)}
            max={100}
            min={0}
            step={10}
            className="w-full max-w-full"
          />
            <div className="flex justify-between text-xs text-muted-foreground">
            <span>Basic responses</span>
            <span>Highly solution‑oriented</span>
          </div>
          </div>
        </div>

  {/* Additional Switches */}
  <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Use emojis</label>
              <p className="text-xs text-muted-foreground">
                Include emojis in responses for extra expressiveness
              </p>
            </div>
            <Switch
              checked={localSettings.useEmojis}
              onCheckedChange={(value) => handleSwitchChange('useEmojis', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Proactive mode</label>
              <p className="text-xs text-muted-foreground">
                Offer suggestions and ask follow‑up questions
              </p>
            </div>
            <Switch
              checked={localSettings.proactiveMode}
              onCheckedChange={(value) => handleSwitchChange('proactiveMode', value)}
            />
          </div>
        </div>

        {/* Enhanced Custom Instructions Section */}
        <div className="space-y-4 rounded-xl border-2 border-dashed border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
              <SparkleIcon className="size-5 text-purple-600 dark:text-purple-400" weight="duotone" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold">Custom Instructions (Advanced)</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="size-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Add specific rules, context, or preferences that apply to ALL your conversations with Cleo. 
                        This helps optimize performance and accuracy for your unique needs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 <strong>Pro tip:</strong> Define your role, preferences, and boundaries to get responses 
                tailored exactly to your needs. Be specific for best results!
              </p>

              {/* Expandable Examples */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline list-none flex items-center gap-1">
                  <span>📚 View examples & best practices</span>
                  <span className="text-[10px] opacity-60">(click to expand)</span>
                </summary>
                <div className="mt-3 rounded-lg bg-muted/50 p-3 space-y-3 text-xs border border-border/50">
                  <div>
                    <p className="font-medium mb-1.5 text-blue-600 dark:text-blue-400">💼 For Work:</p>
                    <code className="block bg-background/60 p-2 rounded text-[11px] border">
                      I'm a product manager at a fintech startup. Keep responses practical and actionable. 
                      When discussing features, always consider user privacy and compliance. Prefer frameworks 
                      like Jobs-to-be-Done over generic advice.
                    </code>
                  </div>

                  <div>
                    <p className="font-medium mb-1.5 text-green-600 dark:text-green-400">👨‍💻 For Developers:</p>
                    <code className="block bg-background/60 p-2 rounded text-[11px] border">
                      I'm a TypeScript developer focused on React and Next.js. Always show TypeScript examples, 
                      not JavaScript. Prioritize modern patterns (hooks, server components) and explain trade-offs. 
                      Don't assume I know every library—introduce new tools with context.
                    </code>
                  </div>

                  <div>
                    <p className="font-medium mb-1.5 text-orange-600 dark:text-orange-400">🎨 For Creators:</p>
                    <code className="block bg-background/60 p-2 rounded text-[11px] border">
                      I'm a content creator focused on tech education. Help me simplify complex topics for 
                      beginners. Use analogies and real-world examples. When suggesting content ideas, consider 
                      SEO and engagement potential.
                    </code>
                  </div>

                  <div>
                    <p className="font-medium mb-1.5 text-purple-600 dark:text-purple-400">🎓 For Students:</p>
                    <code className="block bg-background/60 p-2 rounded text-[11px] border">
                      I'm studying computer science. Explain concepts step-by-step, don't just give answers. 
                      When solving problems, show your reasoning process. Use Socratic questioning to help me 
                      learn rather than just memorize.
                    </code>
                  </div>

                  <div className="pt-2 border-t border-border/30">
                    <p className="font-medium mb-2">✨ Best Practices:</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Define your role/context first</li>
                      <li>Specify output preferences (format, length, style)</li>
                      <li>Set clear boundaries (what NOT to do)</li>
                      <li>Mention tools/frameworks you prefer</li>
                      <li>Update as your needs evolve</li>
                    </ul>
                  </div>
                </div>
              </details>

              <Textarea
                value={localSettings.customStyle}
                onChange={(e) => {
                  // Mark as typing to prevent race condition with sync effect
                  isTypingRef.current = true
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current)
                  }
                  typingTimeoutRef.current = setTimeout(() => {
                    isTypingRef.current = false
                  }, 1200) // Reset typing state after 1.2s of inactivity
                  
                  const val = e.target.value.slice(0, 1000)
                  setAndSave({ customStyle: val })
                }}
                placeholder="Example: I'm a startup founder focused on AI products. Keep responses concise and actionable. When discussing technical topics, balance depth with accessibility. Prioritize modern best practices and scalable solutions. Don't make assumptions—ask clarifying questions when needed."
                className="min-h-32 text-sm font-mono resize-y"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {localSettings.customStyle.length === 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      ⚠️ Empty instructions = generic responses. Add context for better results!
                    </span>
                  ) : localSettings.customStyle.length < 50 ? (
                    <span className="text-blue-600 dark:text-blue-400">
                      💡 Add more details to improve accuracy
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ Great! Cleo will use this context for all conversations
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {localSettings.customStyle.length}/1000
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Preview Section */}
      <div className="rounded-xl border-2 bg-gradient-to-br from-background to-muted/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <LightbulbIcon className="size-5 text-yellow-500" weight="duotone" />
            Live Style Preview
          </h4>
          <Badge variant="secondary" className="gap-1.5">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            Active
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Example Response */}
          <div className="rounded-lg bg-background border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Example Response
            </p>
            <div className="text-sm leading-relaxed">
              {(() => {
                const base = personalityTypes.find((p) => p.id === localSettings.personalityType)?.example || ""
                return localSettings.useEmojis ? base : base.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
              })()}
            </div>
            {localSettings.customStyle && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                  + Custom Context Applied:
                </p>
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  "{localSettings.customStyle.slice(0, 120)}{localSettings.customStyle.length > 120 ? '...' : ''}"
                </p>
              </div>
            )}
          </div>

          {/* Settings Summary */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[11px]">
              <SparkleIcon className="size-3 mr-1" />
              Creativity {localSettings.creativityLevel}%
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              <GearIcon className="size-3 mr-1" />
              Formality {localSettings.formalityLevel}%
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              <SmileyIcon className="size-3 mr-1" />
              Enthusiasm {localSettings.enthusiasmLevel}%
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              <LightbulbIcon className="size-3 mr-1" />
              Helpfulness {localSettings.helpfulnessLevel}%
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {localSettings.useEmojis ? "✨ Emojis" : "No Emojis"}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {localSettings.proactiveMode ? "🎯 Proactive" : "Reactive"}
            </Badge>
            {localSettings.customStyle && (
              <Badge variant="outline" className="text-[11px] bg-purple-500/10 border-purple-500/30">
                <SparkleIcon className="size-3 mr-1" />
                Custom Instructions Active
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {localSettings.customStyle 
                ? "✓ Your custom instructions will apply to all conversations"
                : "Add custom instructions above for personalized responses"
              }
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                const prompt = generatePersonalizedPrompt("preview-model", localSettings)
                navigator.clipboard.writeText(prompt)
                toast({ 
                  title: "System prompt copied!", 
                  description: "Paste this to see exactly what Cleo receives",
                  status: "success" 
                })
              }}
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              View Full Prompt
            </Button>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end border-t pt-4">
        <Button variant="outline" onClick={resetToDefaults}>
          Restore defaults
        </Button>
      </div>
    </div>
  )
}
