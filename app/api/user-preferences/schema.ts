import { z } from "zod"

export const PersonalitySettingsSchema = z.object({
  personalityType: z.enum([
    "empathetic",
    "playful",
    "professional",
    "creative",
    "analytical",
    "friendly",
  ]),
  creativityLevel: z.number().min(0).max(100),
  formalityLevel: z.number().min(0).max(100),
  enthusiasmLevel: z.number().min(0).max(100),
  helpfulnessLevel: z.number().min(0).max(100),
  useEmojis: z.boolean(),
  proactiveMode: z.boolean(),
  customStyle: z.string().max(2000),
})

// API payload uses snake_case
export const UserPreferencesUpdateSchema = z.object({
  layout: z.enum(["sidebar", "fullscreen"]).optional(),
  prompt_suggestions: z.boolean().optional(),
  show_tool_invocations: z.boolean().optional(),
  show_conversation_previews: z.boolean().optional(),
  multi_model_enabled: z.boolean().optional(),
  hidden_models: z.array(z.string()).max(200).optional(),
  personality_settings: PersonalitySettingsSchema.optional(),
})
