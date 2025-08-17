import Anthropic from "@/components/icons/anthropic"
import Claude from "@/components/icons/claude"
import DeepSeek from "@/components/icons/deepseek"
import Gemini from "@/components/icons/gemini"
import Google from "@/components/icons/google"
import Grok from "@/components/icons/grok"
import Meta from "@/components/icons/meta"
import Mistral from "@/components/icons/mistral"
import Ollama from "@/components/icons/ollama"
import OpenAI from "@/components/icons/openai"
import OpenRouter from "@/components/icons/openrouter"
import Preplexity from "@/components/icons/perplexity"
import Xai from "@/components/icons/xai"
import { BrainIcon, RocketLaunch } from "@phosphor-icons/react"
/**
 * Provider definitions for Cleo Agent models
 * Maps model providers to their display names and icons
 */

export type Provider = {
  id: string
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export const PROVIDERS: Provider[] = [
  {
    id: "smarter",
    name: "Smarter",
    icon: BrainIcon,
  },
  {
    id: "faster",
    name: "Faster",
    icon: RocketLaunch,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: OpenRouter,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: OpenAI,
  },
  {
    id: "mistral",
    name: "Mistral",
    icon: Mistral,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: DeepSeek,
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: Gemini,
  },
  {
    id: "claude",
    name: "Claude",
    icon: Claude,
  },
  {
    id: "grok",
    name: "Grok",
    icon: Grok,
  },
  {
    id: "xai",
    name: "XAI",
    icon: Xai,
  },
  {
    id: "google",
    name: "Google",
    icon: Google,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: Anthropic,
  },
  {
    id: "ollama",
    name: "Ollama",
    icon: Ollama,
  },
  {
    id: "meta",
    name: "Meta",
    icon: Meta,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: Preplexity,
  },
] as Provider[]
