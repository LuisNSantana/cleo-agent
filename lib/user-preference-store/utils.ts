export type LayoutType = "sidebar" | "fullscreen"

export type PersonalityType = "empathetic" | "playful" | "professional" | "creative" | "analytical" | "friendly"

export type PersonalitySettings = {
  personalityType: PersonalityType
  creativityLevel: number // 0-100
  formalityLevel: number // 0-100
  enthusiasmLevel: number // 0-100
  helpfulnessLevel: number // 0-100
  useEmojis: boolean
  proactiveMode: boolean
  customStyle: string
}

export type UserPreferences = {
  layout: LayoutType
  promptSuggestions: boolean
  showToolInvocations: boolean
  showConversationPreviews: boolean
  multiModelEnabled: boolean
  hiddenModels: string[]
  personalitySettings?: PersonalitySettings
}

export const defaultPreferences: UserPreferences = {
  layout: "sidebar",
  promptSuggestions: true,
  showToolInvocations: true,
  showConversationPreviews: true,
  multiModelEnabled: false,
  hiddenModels: [],
  personalitySettings: {
    personalityType: "empathetic",
    creativityLevel: 70,
    formalityLevel: 30,
    enthusiasmLevel: 80,
    helpfulnessLevel: 90,
    useEmojis: true,
    proactiveMode: true,
    customStyle: "",
  },
}

// Helper functions to convert between API format (snake_case) and frontend format (camelCase)
export function convertFromApiFormat(apiData: any): UserPreferences {
  return {
    layout: apiData.layout || "sidebar",
    promptSuggestions: apiData.prompt_suggestions ?? true,
    showToolInvocations: apiData.show_tool_invocations ?? true,
    showConversationPreviews: apiData.show_conversation_previews ?? true,
    multiModelEnabled: apiData.multi_model_enabled ?? false,
    hiddenModels: apiData.hidden_models || [],
    personalitySettings: apiData.personality_settings || defaultPreferences.personalitySettings,
  }
}

export function convertToApiFormat(preferences: Partial<UserPreferences>) {
  const apiData: any = {}
  if (preferences.layout !== undefined) apiData.layout = preferences.layout
  if (preferences.promptSuggestions !== undefined)
    apiData.prompt_suggestions = preferences.promptSuggestions
  if (preferences.showToolInvocations !== undefined)
    apiData.show_tool_invocations = preferences.showToolInvocations
  if (preferences.showConversationPreviews !== undefined)
    apiData.show_conversation_previews = preferences.showConversationPreviews
  if (preferences.multiModelEnabled !== undefined)
    apiData.multi_model_enabled = preferences.multiModelEnabled
  if (preferences.hiddenModels !== undefined)
    apiData.hidden_models = preferences.hiddenModels
  if (preferences.personalitySettings !== undefined)
    apiData.personality_settings = preferences.personalitySettings
  return apiData
}
