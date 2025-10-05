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
    label: "Summary",
    highlight: "Summarize",
    prompt: `Summarize`,
    items: [
      "Summarize this article in 3 key points: [paste URL]",
      "Create a TL;DR of this document with actionable insights",
      "Summarize the main arguments for and against [topic]",
      "Extract key takeaways from this meeting transcript",
    ],
    icon: Notepad,
  },
  {
    label: "Code",
    highlight: "Help me",
    prompt: `Help me`,
    items: [
      "Review this code for security vulnerabilities and suggest improvements",
      "Refactor this function to be more performant and readable",
      "Debug this error: [paste error] and explain why it happens",
      "Convert this code to TypeScript with proper types",
    ],
    icon: Code,
  },
  {
    label: "Design",
    highlight: "Design",
    prompt: `Design`,
    items: [
      "Critique this UI design and suggest 5 specific improvements",
      "Create a design system color palette with accessibility ratios",
      "Design a user flow for [feature] with best UX practices",
      "Suggest micro-interactions to improve this component",
    ],
    icon: PaintBrush,
  },
  {
    label: "Research",
    highlight: "Research",
    prompt: `Research`,
    items: [
      "Research the latest developments in [topic] and cite sources",
      "Compare the top 3 solutions for [problem] with pros/cons table",
      "Find recent studies about [topic] from the last 6 months",
      "Analyze market trends for [industry] with data and insights",
    ],
    icon: BookOpenText,
  },
  {
    label: "Get inspired",
    highlight: "Inspire me",
    prompt: `Inspire me`,
    items: [
      "Generate 10 unique startup ideas for [industry] with market analysis",
      "Create a creative brief for a [type] campaign with mood board ideas",
      "Brainstorm innovative features for [product] that competitors don't have",
      "Suggest unconventional marketing strategies for [business]",
    ],
    icon: Sparkle,
  },
  {
    label: "Think deeply",
    highlight: "Analyze",
    prompt: `Analyze`,
    items: [
      "Analyze the root causes of [problem] using first principles thinking",
      "Break down [complex topic] into simple mental models",
      "Identify hidden assumptions in this argument: [paste text]",
      "Apply the 80/20 rule to optimize [process or goal]",
    ],
    icon: Brain,
  },
  {
    label: "Learn gently",
    highlight: "Explain",
    prompt: `Explain`,
    items: [
      "Explain [complex topic] using analogies and examples",
      "Teach me [skill] with a step-by-step beginner guide",
      "What's the difference between [A] and [B]? Use a comparison table",
      "Explain [concept] like I'm 10, then like I'm a college student",
    ],
    icon: Lightbulb,
  },
]

// Import the new modular prompt system
import { getCleoPrompt } from './prompts'

// Default system prompt using Cleo's modular system
export const SYSTEM_PROMPT_DEFAULT = getCleoPrompt('default-model', 'default')

export const MESSAGE_MAX_LENGTH = 10000
