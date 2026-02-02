// Voice Mode Types
// Comprehensive type definitions for the voice mode system

export type VoiceProvider = 'openai' | 'deepgram' | 'elevenlabs'

export type VoiceQuality = 'standard' | 'hd'

export type VoiceSessionStatus = 'active' | 'completed' | 'error' | 'cancelled'

export type VoiceModel = 
  | 'gpt-realtime-2025-12-15'       // Latest GA model (recommended)
  | 'gpt-realtime-mini-2025-12-15'  // Cost-effective mini model
  | 'gpt-4o-realtime-preview'       // Legacy
  | 'gpt-4o-mini-realtime-preview'  // Legacy mini
  | 'deepgram-nova-3'
  | 'deepgram-enhanced'

export type OpenAIVoice = 
  | 'cedar'   // NEW 2025 - Warm and professional
  | 'marin'   // NEW 2025 - Friendly and expressive
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer'

export interface VoiceSession {
  id: string
  user_id: string
  chat_id: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number
  audio_input_tokens: number
  audio_output_tokens: number
  text_input_tokens: number
  text_output_tokens: number
  cost_usd: number
  provider: VoiceProvider
  model: VoiceModel
  voice: OpenAIVoice
  quality: VoiceQuality
  status: VoiceSessionStatus
  error_message: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface VoiceMessage {
  id: string
  session_id: string
  message_id: string | null
  role: 'user' | 'assistant'
  transcription: string
  audio_url: string | null
  audio_duration_ms: number
  created_at: string
}

// WebSocket message types
export type VoiceWSMessageType = 
  | 'session.created'
  | 'session.updated'
  | 'audio.input'
  | 'audio.output'
  | 'audio.delta'
  | 'transcription.delta'
  | 'transcription.done'
  | 'response.created'
  | 'response.done'
  | 'error'
  | 'ping'
  | 'pong'

export interface VoiceWSMessage {
  type: VoiceWSMessageType
  data?: any
  error?: {
    code: string
    message: string
  }
}

// Session creation request
export interface CreateVoiceSessionRequest {
  chatId?: string
  model?: VoiceModel
  voice?: OpenAIVoice
  quality?: VoiceQuality
  systemPrompt?: string
}

// Session creation response
export interface CreateVoiceSessionResponse {
  sessionId: string
  wsUrl: string
  token: string
  expiresAt: string
}

// Session end request
export interface EndVoiceSessionRequest {
  sessionId: string
}

// Session end response
export interface EndVoiceSessionResponse {
  duration: number
  cost: number
  tokens: {
    audioInput: number
    audioOutput: number
    textInput: number
    textOutput: number
  }
  messages: VoiceMessage[]
}

// Usage stats
export interface VoiceUsageStats {
  totalMinutes: number
  totalSessions: number
  totalCost: number
  monthlyMinutes: number
  monthlySessions: number
  monthlyCost: number
  remainingMinutes: number
  limit: number
}

// Rate limit info
export interface VoiceRateLimitInfo {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: string
  message?: string
}

// Audio processing options
export interface AudioProcessingOptions {
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  sampleRate?: number
  channelCount?: number
}

// Voice preferences
export interface VoicePreferences {
  enabled: boolean
  defaultVoice: OpenAIVoice
  defaultQuality: VoiceQuality
  autoTranscribe: boolean
  saveAudio: boolean
  pushToTalk: boolean
  audioProcessing: AudioProcessingOptions
}

// OpenAI Realtime API specific types
export interface OpenAIRealtimeSession {
  id: string
  object: 'realtime.session'
  model: string
  modalities: string[]
  instructions: string
  voice: OpenAIVoice
  input_audio_format: string
  output_audio_format: string
  input_audio_transcription: {
    model: string
  } | null
  turn_detection: {
    type: string
    threshold: number
    prefix_padding_ms: number
    silence_duration_ms: number
  } | null
  tools: any[]
  tool_choice: string
  temperature: number
  max_response_output_tokens: number | 'inf'
}

export interface OpenAIRealtimeEvent {
  event_id: string
  type: string
  [key: string]: any
}

// Voice visualization data
export interface AudioVisualizationData {
  volumes: number[]
  frequency: number[]
  waveform: number[]
  timestamp: number
}

// Error types
export class VoiceError extends Error {
  code: string
  
  constructor(message: string, code: string) {
    super(message)
    this.name = 'VoiceError'
    this.code = code
  }
}

export class VoicePermissionError extends VoiceError {
  constructor(message: string = 'Microphone permission denied') {
    super(message, 'PERMISSION_DENIED')
  }
}

export class VoiceRateLimitError extends VoiceError {
  constructor(message: string = 'Voice rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED')
  }
}

export class VoiceConnectionError extends VoiceError {
  constructor(message: string = 'Failed to connect to voice service') {
    super(message, 'CONNECTION_ERROR')
  }
}

export class VoiceStreamError extends VoiceError {
  constructor(message: string = 'Audio stream error') {
    super(message, 'STREAM_ERROR')
  }
}
