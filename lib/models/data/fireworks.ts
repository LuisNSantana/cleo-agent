import { openproviders } from '@/lib/openproviders'
import { ModelConfig } from '../types'

// Fireworks models (MVP: sólo Scout Instruct Basic). Puedes añadir más luego.
export const fireworksModels: ModelConfig[] = [
  {
    id: 'accounts/fireworks/models/llama4-scout-instruct-basic',
    name: 'Llama 4 Scout (Fireworks)',
    provider: 'Fireworks AI',
    providerId: 'fireworks',
    baseProviderId: 'fireworks',
    modelFamily: 'Llama 4 Scout',
    description: 'Modelo multimodal (texto + imagen) con ventana de 1M tokens para retrieval extensivo.',
    tags: ['llama4','scout','multimodal','long-context','vision','oss-hosted'],
    contextWindow: 1000000, // 1M tokens optimizado para uso práctico
    vision: true,
    tools: false,
    audio: false,
    reasoning: true,
    webSearch: false,
    openSource: true,
    speed: 'Medium',
    intelligence: 'High',
    website: 'https://fireworks.ai',
    apiDocs: 'https://docs.fireworks.ai',
    modelPage: 'https://fireworks.ai/models',
    releasedAt: '2025-01-01',
  icon: 'fireworks',
    apiSdk: () => openproviders('accounts/fireworks/models/llama4-scout-instruct-basic'),
  },
]
