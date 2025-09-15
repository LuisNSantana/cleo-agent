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
  // Guest mode: Fast tier (text-only) + fallbacks
  // Removed GPT-OSS-120B free (policy/tool issues)
  "openrouter:z-ai/glm-4.5", // GLM 4.5 - optional guest model
  "openrouter:deepseek/deepseek-chat-v3.1:free", // DeepSeek V3.1 Free - fallback
  "openrouter:mistralai/mistral-small-3.2-24b-instruct:free", // Mistral Small 3.2 24B (free)
  "openrouter:google/gemma-3-27b-it:free", // Gemma 3 27B IT (free)
  "openrouter:meta-llama/llama-4-maverick:free", // Llama 4 Maverick (free)
  "openrouter:meta-llama/llama-4-scout:free", // Llama 4 Scout (free)
  "gpt-4o-mini", // Emergency fallback (vision)
]

// Modelos gratuitos para usuarios autenticados (Fast + Balanced tiers + fallbacks)
export const FREE_MODELS_IDS = [
  // Free tier: Fast + Balanced with fallbacks
  // Removed GPT-OSS-120B free (policy/tool issues)
  "openrouter:openrouter/sonoma-dusk-alpha", // Fast Vision - Sonoma Dusk (free)
  // Balanced-class free choices via OpenRouter
  "openrouter:mistralai/mistral-small-3.2-24b-instruct:free",
  "openrouter:google/gemma-3-27b-it:free",
  "openrouter:meta-llama/llama-4-maverick:free",
  "openrouter:meta-llama/llama-4-scout:free",
  "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "openrouter:nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
  // Removed DeepSeek Chimera R1T free (no tool endpoints)
  "openrouter:deepseek/deepseek-chat-v3.1:free", // Fast fallback
  "gpt-4o-mini", // Emergency fallback  
  // OpenRouter selected cost-effective models (for authenticated users)
  "openrouter:deepseek/deepseek-r1:free",
  "openrouter:qwen/qwen2.5-32b-instruct",
  // Added core provider models for authenticated users
  // Removed Mistral SDK Small/Medium and Groq Llama variants from default lists
]

// Default authenticated model: GPT-4.1-mini via OpenRouter (majority standard)
export const MODEL_DEFAULT = "openrouter:openai/gpt-4.1-mini"

// MODELO POR DEFECTO PARA GUESTS - DEEPSEEK (herramientas soportadas)
export const MODEL_DEFAULT_GUEST = "openrouter:deepseek/deepseek-chat-v3.1:free"

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
