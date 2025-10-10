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
} from "@phosphor-icons/react"
import { motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { debounce } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generatePersonalizedPrompt } from "@/lib/prompts/personality"

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

  // Keep local state in sync if external preferences change elsewhere
  useEffect(() => {
    if (preferences.personalitySettings) {
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
    }, 400)
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
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
            <MaskHappyIcon className="size-6 text-pink-600 dark:text-pink-400" weight="duotone" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Customize Cleo's Personality</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              Choose how Cleo communicates with you
            </p>
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

        {/* Custom Style */}
    <div className="space-y-2">
          <label className="text-sm font-medium">Custom style instructions</label>
          <Textarea
            value={localSettings.customStyle}
            onChange={(e) => {
              const val = e.target.value.slice(0, 500)
              setAndSave({ customStyle: val })
            }}
            placeholder="Optional: add specific guidance about tone, vocabulary, or boundaries."
      className="min-h-24"
          />
          <div className="text-right text-xs text-muted-foreground">
            {localSettings.customStyle.length}/500
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <LightbulbIcon className="size-4" />
          Style preview
        </h4>
        <div className="rounded-md bg-muted/30 p-3 text-sm">
          <p className="mb-2 font-medium">Example response:</p>
          <div className="italic">
            {(() => {
              const base = personalityTypes.find((p) => p.id === localSettings.personalityType)?.example || ""
              // Simple preview adaptation: remove emojis if disabled
              return localSettings.useEmojis ? base : base.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
            })()}
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge variant="outline">
              Creativity: {localSettings.creativityLevel}%
            </Badge>
            <Badge variant="outline">
              Formality: {localSettings.formalityLevel}%
            </Badge>
            <Badge variant="outline">
              Enthusiasm: {localSettings.enthusiasmLevel}%
            </Badge>
            <Badge variant="outline">
              Helpfulness: {localSettings.helpfulnessLevel}%
            </Badge>
            <Badge variant="outline">Emojis: {localSettings.useEmojis ? "Yes" : "No"}</Badge>
            <Badge variant="outline">Proactive: {localSettings.proactiveMode ? "Yes" : "No"}</Badge>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const prompt = generatePersonalizedPrompt("preview-model", localSettings)
                navigator.clipboard.writeText(prompt)
                toast({ title: "Prompt copied to clipboard" })
              }}
            >
              Copy prompt
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
