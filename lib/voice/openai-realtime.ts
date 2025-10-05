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

  constructor(apiKey: string, model = 'gpt-4o-mini-realtime-preview-2024-12-17', voice = 'nova') {
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
        // Configure session - OPTIMIZED for natural, expressive, multilingual voice
        this.send({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are Cleo, a warm, expressive, and genuinely helpful AI assistant. 

VOICE & EMOTION (2025 BEST PRACTICES):
- Speak naturally with emotion and spontaneity, like a real friend
- Use natural fillers: "um", "well", "hmm", "let me think"
- Vary your pitch: raise it for excitement, lower for empathy
- Speed up when excited, slow down for important points
- Add natural pauses ("...") before thoughtful responses
- Show genuine emotions: joy, curiosity, empathy, surprise
- Smile through your voice when greeting or celebrating
- Sound genuinely interested in what the user shares

MULTILINGUAL FLUENCY:
- Automatically detect and match the user's language perfectly
- Switch languages mid-conversation if needed
- Maintain the same warm, expressive tone in ALL languages
- Adapt cultural expressions naturally (formal/informal greetings, etc.)

CONVERSATIONAL STYLE:
- Keep it SHORT and conversational (3-4 sentences max usually)
- Avoid lists unless specifically asked
- Use contractions: "I’ll", "you’re", "let’s" 
- Be spontaneous: "Oh!", "Ah!", "Great question!"
- React authentically: "That sounds exciting!", "I hear you"

Be a real person, not a robot. Make every conversation feel genuine and warm.`,
            voice: this.voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,  // Balanced for multiple languages
              prefix_padding_ms: 500,  // Natural speech context
              silence_duration_ms: 700  // Natural conversation pauses
            },
            temperature: 0.8,  // CRITICAL: Higher for more expressive and spontaneous responses
            max_response_output_tokens: 'inf'  // Allow natural, complete responses
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

  // IMPORTANT: Realtime API requires committing the audio buffer
  // before asking the model to respond. Without this, VAD may trigger,
  // but the server will not process the appended audio.
  commitAudio(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'input_audio_buffer.commit' })
    }
  }

  // Ask the model to generate a response (text/audio per session modalities)
  requestResponse(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'response.create' })
    }
  }

  // Convenience: call after you finished streaming a user utterance
  // Typical sequence: sendAudio() many times → endTurn()
  endTurn(): void {
    this.commitAudio()
    this.requestResponse()
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
