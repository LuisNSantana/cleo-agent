// OpenAI Realtime API Client
// Handles WebSocket connection to OpenAI Realtime API

interface RealtimeEvent {
  type: string
  [key: string]: any
}

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null
  private apiKey: string
  private model: string
  private voice: string

  constructor(apiKey: string, model = 'gpt-4o-mini-realtime-preview-2024-12-17', voice = 'alloy') {
    this.apiKey = apiKey
    this.model = model
    this.voice = voice
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `wss://api.openai.com/v1/realtime?model=${this.model}`
      
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any)

      this.ws.onopen = () => {
        // Configure session
        this.send({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'Eres Cleo, un asistente de IA amigable y útil. Responde en español de manera natural y conversacional.',
            voice: this.voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        })
        resolve()
      }

      this.ws.onerror = (error) => {
        reject(error)
      }

      this.ws.onclose = () => {
        this.ws = null
      }
    })
  }

  send(event: RealtimeEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    }
  }

  sendAudio(audioData: Int16Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send audio as base64
      const base64Audio = Buffer.from(audioData.buffer).toString('base64')
      this.send({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      })
    }
  }

  onMessage(callback: (event: RealtimeEvent) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          callback(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
