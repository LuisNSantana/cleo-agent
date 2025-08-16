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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { debounce } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generatePersonalizedPrompt } from "@/lib/prompts/personality"

const personalityTypes = [
  {
    id: "empathetic" as PersonalityType,
    name: "Empática",
    description: "Respuestas cálidas y comprensivas, como una buena amiga",
    icon: HeartIcon,
    color: "bg-pink-100 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
    example: "Entiendo cómo te sientes. Estoy aquí para ayudarte paso a paso 💙"
  },
  {
    id: "playful" as PersonalityType,
    name: "Divertida",
    description: "Respuestas alegres y creativas, con humor y energía",
    icon: MaskHappyIcon,
    color: "bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    example: "¡Oh, qué interesante! 🎉 Vamos a hacer algo genial con esto ✨"
  },
  {
    id: "professional" as PersonalityType,
    name: "Profesional",
    description: "Respuestas claras y directas, enfocada en eficiencia",
    icon: GearIcon,
    color: "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    example: "Analicemos tu consulta. Te propongo tres opciones efectivas:"
  },
  {
    id: "creative" as PersonalityType,
    name: "Creativa",
    description: "Respuestas imaginativas y fuera de lo común",
    icon: SparkleIcon,
    color: "bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    example: "¡Qué fascinante! 🌟 Imagina si combinamos esto con... ¿y si probamos algo diferente?"
  },
  {
    id: "analytical" as PersonalityType,
    name: "Analítica",
    description: "Respuestas detalladas y bien fundamentadas",
    icon: BrainIcon,
    color: "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    example: "Considerando los factores A, B y C, el análisis sugiere que..."
  },
  {
    id: "friendly" as PersonalityType,
    name: "Amigable",
    description: "Respuestas conversacionales y relajadas",
    icon: ChatCircleDotsIcon,
    color: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    example: "¡Hola! Me encanta tu pregunta. Vamos a verlo juntos 😊"
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
    toast({ title: "Estilo actualizado", description: "La personalidad de Cleo cambió.", status: "success" })
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
    toast({ title: "Valores restaurados" })
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div>
        <h3 className="mb-2 text-lg font-medium">Personalidad de Cleo</h3>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Personaliza cómo Cleo se comunica contigo. Elige un estilo base y ajusta los detalles.
          </p>
          <div className="text-xs">
            {saveState === "saving" && (
              <span className="text-muted-foreground">Guardando…</span>
            )}
            {saveState === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-400">Guardado</span>
            )}
          </div>
        </div>
      </div>

      {/* Personality Types Grid */}
      <div>
        <h4 className="mb-4 text-sm font-medium">Estilo de personalidad</h4>
        <div
          className="grid items-stretch gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"
          role="radiogroup"
          aria-label="Estilo de personalidad"
        >
          {personalityTypes.map((personality) => {
            const Icon = personality.icon
            const isSelected = localSettings.personalityType === personality.id
            
            return (
              <motion.div
                key={personality.id}
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
                  className={`group relative cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:bg-muted/40 hover:border-muted-foreground/20"
                  }`}
                  onClick={() => handlePersonalityChange(personality.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    {isSelected && (
                      <Badge className="absolute right-2 top-2" variant="secondary">Activa</Badge>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`flex size-8 sm:size-9 items-center justify-center rounded-md border shrink-0 ${isSelected ? "bg-primary/10 border-primary/20" : "bg-muted/40"}`}>
                        <Icon className="size-4 sm:size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="mb-1 text-sm font-medium">{personality.name}</h5>
                        <p className="text-xs text-muted-foreground mb-2 truncate">
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

      {/* Fine-tuning Controls */}
      <div className="space-y-6">
        <h4 className="text-sm font-medium">Ajustes finos</h4>

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
            Equilibrada
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
            Creativa+
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
            Profesional
          </Button>
        </div>
        
        {/* Creativity Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <SparkleIcon className="size-4" />
                    Creatividad
                  </label>
                </TooltipTrigger>
                <TooltipContent>Ideas originales y soluciones fuera de lo común.</TooltipContent>
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
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservadora</span>
            <span>Muy creativa</span>
          </div>
        </div>

        {/* Formality Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <GraduationCapIcon className="size-4" />
                    Formalidad
                  </label>
                </TooltipTrigger>
                <TooltipContent>Tono casual vs. profesional y técnico.</TooltipContent>
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
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Casual</span>
            <span>Muy formal</span>
          </div>
        </div>

        {/* Enthusiasm Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <SmileyIcon className="size-4" />
                    Entusiasmo
                  </label>
                </TooltipTrigger>
                <TooltipContent>Energía y expresividad en las respuestas.</TooltipContent>
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
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Calmada</span>
            <span>Muy entusiasta</span>
          </div>
        </div>

        {/* Helpfulness Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex cursor-help items-center gap-2 text-sm font-medium">
                    <LightbulbIcon className="size-4" />
                    Proactividad útil
                  </label>
                </TooltipTrigger>
                <TooltipContent>Grado de orientación a soluciones y pasos concretos.</TooltipContent>
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
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Respuestas básicas</span>
            <span>Muy orientada a soluciones</span>
          </div>
        </div>

        {/* Additional Switches */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Usar emojis</label>
              <p className="text-xs text-muted-foreground">
                Incluir emojis en las respuestas para mayor expresividad
              </p>
            </div>
            <Switch
              checked={localSettings.useEmojis}
              onCheckedChange={(value) => handleSwitchChange('useEmojis', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Modo proactivo</label>
              <p className="text-xs text-muted-foreground">
                Ofrecer sugerencias y hacer preguntas de seguimiento
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
          <label className="text-sm font-medium">Instrucciones de estilo personalizadas</label>
          <Textarea
            value={localSettings.customStyle}
            onChange={(e) => {
              const val = e.target.value.slice(0, 500)
              setAndSave({ customStyle: val })
            }}
            placeholder="Opcional: añade indicaciones específicas sobre el tono, vocabulario o límites."
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
          Vista previa del estilo actual
        </h4>
        <div className="rounded-md bg-muted/30 p-3 text-sm">
          <p className="mb-2 font-medium">Ejemplo de respuesta:</p>
          <div className="italic">
            {(() => {
              const base = personalityTypes.find((p) => p.id === localSettings.personalityType)?.example || ""
              // Simple preview adaptation: remove emojis if disabled
              return localSettings.useEmojis ? base : base.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
            })()}
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge variant="outline">
              Creatividad: {localSettings.creativityLevel}%
            </Badge>
            <Badge variant="outline">
              Formalidad: {localSettings.formalityLevel}%
            </Badge>
            <Badge variant="outline">
              Entusiasmo: {localSettings.enthusiasmLevel}%
            </Badge>
            <Badge variant="outline">
              Utilidad: {localSettings.helpfulnessLevel}%
            </Badge>
            <Badge variant="outline">Emojis: {localSettings.useEmojis ? "Sí" : "No"}</Badge>
            <Badge variant="outline">Proactiva: {localSettings.proactiveMode ? "Sí" : "No"}</Badge>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const prompt = generatePersonalizedPrompt("preview-model", localSettings)
                navigator.clipboard.writeText(prompt)
                toast({ title: "Prompt copiado al portapapeles" })
              }}
            >
              Copiar prompt
            </Button>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end border-t pt-4">
        <Button variant="outline" onClick={resetToDefaults}>
          Restaurar valores por defecto
        </Button>
      </div>
    </div>
  )
}
