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
  // Guest mode: Fast tier with vision support
  "claude-3-5-haiku-20241022", // Fast - Claude 3.5 Haiku (primary)
  "gpt-oss-120b", // Balanced - GPT-OSS 120B as default for guests (text-only)
  "grok-3-mini-fallback", // Fast - Grok-3 Mini (fallback, text-only)
  "gpt-4o-mini", // Emergency fallback
  "langchain:fast",
]

// Modelos gratuitos para usuarios autenticados (Fast + Balanced tiers + fallbacks)
export const FREE_MODELS_IDS = [
  // Free tier: Fast + Balanced with fallbacks
  "claude-3-5-haiku-20241022", // Fast - Claude 3.5 Haiku (vision support)
  "gpt-oss-120b", // Balanced - GPT-OSS 120B via Groq
  "grok-3-mini-fallback", // Fast fallback
  "mistral-large-latest-fallback", // Balanced fallback
  "gpt-4o-mini", // Emergency fallback  
  "langchain:fast",
  // OpenRouter selected cost-effective models (for authenticated users)
  "openrouter:deepseek/deepseek-r1:free",
  "openrouter:qwen/qwen2.5-32b-instruct",
  // Added core provider models for authenticated users
  "mistral-large-latest",
  "mistral-small-latest",
  "llama-4-maverick",
  "llama-3-3-70b-groq",
  "llama-3-1-8b-groq",
]

// Default authenticated model: use Fast tier (best for most users)
export const MODEL_DEFAULT = "claude-3-5-haiku-20241022"

// Modelo predeterminado para invitados: Balanced text model for cost-effectiveness
export const MODEL_DEFAULT_GUEST = "gpt-oss-120b"

// Globally disabled model IDs (hide old models, keep only 3-tier optimized)
export const DISABLED_MODEL_IDS: string[] = [
  // Hide all old model variants - keeping only optimized Fast/Balanced/Smarter
  "langchain:balanced-local",
  "gpt-oss-20b", 
  "llama-3.3-70b-versatile",
  // Hide outdated Google Flash 2.0 variants in favor of 2.5 Flash
  "openrouter:google/gemini-2.0-flash-001",
  // Keep Lite if desired; we disable as outdated per request
  "openrouter:google/gemini-2.0-flash-lite-001",
]

export const APP_NAME = "Cleo"
export const APP_DOMAIN = "https://zola.chat"

export const SUGGESTIONS = [
  {
    label: "Summary",
    highlight: "Summarize",
    prompt: `Summarize`,
    items: [
      "Summarize the French Revolution",
      "Summarize the plot of Inception",
      "Summarize World War II in 5 sentences",
      "Summarize the benefits of meditation",
    ],
    icon: Notepad,
  },
  {
    label: "Code",
    highlight: "Help me",
    prompt: `Help me`,
    items: [
      "Help me write a function to reverse a string in JavaScript",
      "Help me create a responsive navbar in HTML/CSS",
      "Help me write a SQL query to find duplicate emails",
      "Help me convert this Python function to JavaScript",
    ],
    icon: Code,
  },
  {
    label: "Design",
    highlight: "Design",
    prompt: `Design`,
    items: [
      "Design a color palette for a tech blog",
      "Design a UX checklist for mobile apps",
      "Design 5 great font pairings for a landing page",
      "Design better CTAs with useful tips",
    ],
    icon: PaintBrush,
  },
  {
    label: "Research",
    highlight: "Research",
    prompt: `Research`,
    items: [
      "Research the pros and cons of remote work",
      "Research the differences between Apple Vision Pro and Meta Quest",
      "Research best practices for password security",
      "Research the latest trends in renewable energy",
    ],
    icon: BookOpenText,
  },
  {
    label: "Get inspired",
    highlight: "Inspire me",
    prompt: `Inspire me`,
    items: [
      "Inspire me with a beautiful quote about creativity",
      "Inspire me with a writing prompt about solitude",
      "Inspire me with a poetic way to start a newsletter",
      "Inspire me by describing a peaceful morning in nature",
    ],
    icon: Sparkle,
  },
  {
    label: "Think deeply",
    highlight: "Reflect on",
    prompt: `Reflect on`,
    items: [
      "Reflect on why we fear uncertainty",
      "Reflect on what makes a conversation meaningful",
      "Reflect on the concept of time in a simple way",
      "Reflect on what it means to live intentionally",
    ],
    icon: Brain,
  },
  {
    label: "Learn gently",
    highlight: "Explain",
    prompt: `Explain`,
    items: [
      "Explain quantum physics like I'm 10",
      "Explain stoicism in simple terms",
      "Explain how a neural network works",
      "Explain the difference between AI and AGI",
    ],
    icon: Lightbulb,
  },
]

// Import the new modular prompt system
import { getCleoPrompt } from './prompts'

// Default system prompt using Cleo's modular system
export const SYSTEM_PROMPT_DEFAULT = getCleoPrompt('default-model', 'default')

export const MESSAGE_MAX_LENGTH = 10000
