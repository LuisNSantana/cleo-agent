import {
  BookOpenText,
  Brain,
  Code,
  Lightbulb,
  Notepad,
  PaintBrush,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr"

export const NON_AUTH_DAILY_MESSAGE_LIMIT = 5
export const AUTH_DAILY_MESSAGE_LIMIT = 1000
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5
export const DAILY_LIMIT_PRO_MODELS = 500

// Modelos disponibles sin autenticación (Fast tier + fallback)
export const NON_AUTH_ALLOWED_MODELS = [
  // Guest mode: only validated tool-capable models
  "openrouter:x-ai/grok-4-fast", // Replaced DeepSeek with Grok 4 Fast (better performance & still free)
  "openrouter:z-ai/glm-4.5",
  "openrouter:mistralai/mistral-small-3.2-24b-instruct:free",
  // Keep one vision-capable emergency fallback
  "gpt-4o-mini",
]

// Modelos gratuitos para usuarios autenticados (Fast + Balanced tiers + fallbacks)
export const FREE_MODELS_IDS = [
  // Curated free/tool-capable list for authenticated users
  // Top tier free models
  "openrouter:x-ai/grok-4-fast",  // New Grok-4 fast model - excellent performance
  "openai/gpt-4o-mini",
  "openrouter:mistralai/mistral-small-3.2-24b-instruct:free",
  "openrouter:deepseek/deepseek-chat-v3.1:free",
  // High-end free options
  // paid Nemotron is excluded from FREE list
  // Economical models for user variety
  "openrouter:google/gemini-2.5-flash-lite", // Multimodal fallback for grok-4-fast
  "gpt-5-nano",
  // Emergency fallback
  "gpt-4o-mini",
]

// Default authenticated model: Grok 4 Fast via OpenRouter
// Nuevo modelo por defecto (solo texto): grok-4-fast (alias interno)
export const MODEL_DEFAULT = "grok-4-fast"

// MODELO POR DEFECTO PARA GUESTS - Grok 4 Fast (mejor rendimiento y herramientas soportadas)
// Guest también usa el nuevo faster por defecto
export const MODEL_DEFAULT_GUEST = "grok-4-fast"

// Globally disabled model IDs (hide old models, keep only 3-tier optimized)
export const DISABLED_MODEL_IDS: string[] = [
  // Hide all old model variants - keeping only optimized Fast/Balanced/Smarter
  "langchain:balanced-local",
  // Hide orchestration pseudo-models from selectors
  "langchain:fast",
  "langchain:balanced",
  "gpt-oss-20b", 
  "llama-3.3-70b-versatile",
  // Hide outdated Google Flash 2.0 variants in favor of 2.5 Flash
  "openrouter:google/gemini-2.0-flash-001",
  // Keep Lite if desired; we disable as outdated per request
  "openrouter:google/gemini-2.0-flash-lite-001",
  // Problematic free models (policy/tool endpoint issues)
  "openrouter:openai/gpt-oss-120b:free",
  "openrouter:tngtech/deepseek-r1t-chimera:free",
  // Remove confusing non-validated freebies from selector
  "openrouter:google/gemma-3-27b-it:free",
  "openrouter:meta-llama/llama-4-maverick:free",
  "openrouter:meta-llama/llama-4-scout:free",
  "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  // Prefer Sky over Dusk in UI
  // "openrouter:openrouter/sonoma-dusk-alpha",
]
export const APP_NAME = "Cleo"
export const APP_DOMAIN = "https://cleo-agent.vercel.app"

export const SUGGESTIONS = [
  {
    label: "Code",
    highlight: "Build",
    prompt: `Build`,
    items: [
      "Create a React component with TypeScript and proper types",
      "Debug this error and explain the root cause with a fix",
      "Review this code for bugs, security issues, and best practices",
      "Refactor this function to be more performant and readable",
    ],
    icon: Code,
  },
  {
    label: "Analyze",
    highlight: "Analyze",
    prompt: `Analyze`,
    items: [
      "Analyze this data and create visualizations with insights",
      "Break down this problem into actionable steps with priorities",
      "Compare these options with pros/cons and recommend the best",
      "Identify patterns and trends in this information",
    ],
    icon: Brain,
  },
  {
    label: "Research",
    highlight: "Research",
    prompt: `Research`,
    items: [
      "Research latest AI developments and summarize with sources",
      "Find the top 5 solutions for this problem with comparisons",
      "Analyze market trends with data, charts, and predictions",
      "Gather recent studies and expert opinions on this topic",
    ],
    icon: BookOpenText,
  },
  {
    label: "Write",
    highlight: "Write",
    prompt: `Write`,
    items: [
      "Write a professional email with clear call-to-action",
      "Create engaging social media content with hashtags",
      "Draft a technical document with proper structure",
      "Generate creative copy for marketing campaign",
    ],
    icon: Notepad,
  },
  {
    label: "Design",
    highlight: "Design",
    prompt: `Design`,
    items: [
      "Design a user flow with wireframes and best UX practices",
      "Create a color palette with accessibility compliance",
      "Suggest UI improvements with specific design principles",
      "Generate component ideas with interaction patterns",
    ],
    icon: PaintBrush,
  },
  {
    label: "Explain",
    highlight: "Explain",
    prompt: `Explain`,
    items: [
      "Explain this concept with simple examples and analogies",
      "Create a step-by-step tutorial with practice exercises",
      "Break down this technical topic for beginners",
      "Build a learning path to master this skill",
    ],
    icon: Lightbulb,
  },
]

// Import the new modular prompt system
import { getCleoPrompt } from './prompts'

// Default system prompt using Cleo's modular system
export const SYSTEM_PROMPT_DEFAULT = getCleoPrompt('default-model', 'default')

export const MESSAGE_MAX_LENGTH = 10000
