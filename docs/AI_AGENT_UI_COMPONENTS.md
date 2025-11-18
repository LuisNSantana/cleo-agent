# AI Agent UI Components - Guía Técnica
**Fuente:** Kommunicate, OpenAI, Google ADK, n8n  
**Fecha:** Noviembre 11, 2025

---

## 📦 Core UI Components para AI Agents

### Tabla Completa de Componentes Esenciales

| Component | Purpose | Must-have Interactions | Acceptance Criteria |
|-----------|---------|----------------------|-------------------|
| **Composer** | Input zone for text & controls | Multiline, Cmd/Ctrl+Enter send, attachments, slash-commands | Keyboard-first; paste/drag-drop works; disabled while sending |
| **Streaming renderer** | Token-by-token output | Show "thinking" state, Abort/Retry, Continue | TTFT ≤ **800ms**; Abort stops within 100ms |
| **Citations panel/bar** | Trust layer for factual replies | Footnote chips [1], hover preview, deep link | Max 5 sources, ranked; broken links flagged |
| **Memory surfaces** | Transparent personalization | View/edit profile facts, reset session memory | One-click "Forget this"; change log visible |
| **Context banner** | Shows active system/context | Reveal/hide prompt summary | Non-technical summary |
| **Error & guardrail states** | Safe failure UX | Explain, Retry, escalate to human | No dead-ends; keeps thread state |
| **Feedback widget** | Close the loop on quality | 👍/👎 + reason, free-text | Sends telemetry with message IDs |
| **Session list** | Multisession productivity | Pin, rename, search | Instant switch; last read position remembered |
| **Presence/typing** | Turn-taking clarity | "Assistant is thinking…" | Spinner <300ms, then streaming |
| **Voice Control** | Improved interactions | Click-to-Talk | One button voice interface |
| **Rich rendering** | Readability & actions | Code blocks, tables, copy buttons | Mobile-friendly; no horizontal scroll |

---

## 🗂️ Data Model para AI Agent UI

### Minimal Schema (Backend)

```typescript
// Message Entity
interface Message {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system'
  parts: MessagePart[]
  status: 'pending' | 'streaming' | 'final' | 'failed'
  createdAt: Date
}

// Citation Entity
interface Citation {
  id: string
  messageId: string
  title: string
  url: string
  snippet: string
  score: number
  offsets: number[]  // Position in text
}

// Attachment Entity
interface Attachment {
  id: string
  messageId: string
  name: string
  type: string
  size: number
  url: string
  hash: string  // For deduplication
}

// Memory Entity
interface Memory {
  id: string
  scope: 'session' | 'profile'
  key: string
  value: any
  updatedAt: Date
  source: string
}

// Thread Entity
interface Thread {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  lastMessageId: string
}

// ToolCall Entity
interface ToolCall {
  id: string
  messageId: string
  name: string
  args: Record<string, any>
  result: any
  status: 'pending' | 'running' | 'completed' | 'failed'
}
```

---

## ⚡ Real-Time Streaming Implementation

### Transport Protocols

#### 1. Server-Sent Events (SSE) ⭐ RECOMENDADO

**Cuándo usar:**
- One-way communication (server → client)
- Streaming tokens from LLM
- Simpler than WebSocket
- Built on standard HTTP

**Implementación:**
```typescript
// Backend (Express/Next.js)
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of llmStream) {
        controller.enqueue(
          `data: ${JSON.stringify(chunk)}\n\n`
        )
      }
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

// Frontend
const eventSource = new EventSource('/api/stream')
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data)
  appendToMessage(chunk.text)
}
```

**✅ Ventajas:**
- Fácil implementación
- Auto-reconnect built-in
- HTTP/2 compatible
- Works with CDNs

**❌ Desventajas:**
- One-way only
- Limited browser support for auth headers

---

#### 2. WebSocket

**Cuándo usar:**
- Bidirectional communication needed
- Real-time collaboration
- Multiple simultaneous users
- Gaming, live chat, editing

**Implementación:**
```typescript
// Backend
const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    for await (const chunk of llmStream) {
      ws.send(JSON.stringify(chunk))
    }
  })
})

// Frontend
const ws = new WebSocket('ws://localhost:8080')
ws.onmessage = (event) => {
  const chunk = JSON.parse(event.data)
  appendToMessage(chunk.text)
}
```

**✅ Ventajas:**
- Full duplex
- Lower latency
- Better for complex interactions

**❌ Desventajas:**
- More complex
- Requires WebSocket server
- CDN compatibility issues

---

### Frontend Patterns para Streaming

```typescript
// 1. Show "thinking" indicator (<300ms)
const ThinkingIndicator = () => (
  <div className="flex gap-2">
    <div className="animate-pulse">●</div>
    <div className="animate-pulse delay-100">●</div>
    <div className="animate-pulse delay-200">●</div>
  </div>
)

// 2. Stream renderer con abort
function StreamingMessage({ messageId }) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(true)
  const abortController = useRef(new AbortController())
  
  const handleAbort = () => {
    abortController.current.abort()
    setIsStreaming(false)
  }
  
  useEffect(() => {
    fetchStream(messageId, {
      signal: abortController.current.signal,
      onChunk: (chunk) => {
        setContent(prev => prev + chunk)
      },
      onComplete: () => setIsStreaming(false)
    })
  }, [messageId])
  
  return (
    <div>
      <Markdown>{content}</Markdown>
      {isStreaming && (
        <button onClick={handleAbort}>Stop generating</button>
      )}
    </div>
  )
}

// 3. Continue functionality
function ContinueButton({ messageId }) {
  return (
    <button onClick={() => continueGeneration(messageId)}>
      Continue generating →
    </button>
  )
}
```

**Performance Targets:**
- ⏱️ Time-to-First-Token (TTFT): ≤ **800ms**
- ⏹️ Abort response: ≤ **100ms**
- 🔄 Reconnect delay: **2s exponential backoff**

---

## 💾 Memory & Personalization

### Types of Memory

```typescript
// 1. Session Memory (Short-term)
interface SessionMemory {
  conversationHistory: Message[]
  currentContext: {
    topic: string
    entities: string[]
    userIntent: string
  }
  temporaryPreferences: {
    language: string
    verbosity: 'concise' | 'detailed'
  }
}

// 2. Profile Memory (Long-term)
interface ProfileMemory {
  userInfo: {
    name: string
    timezone: string
    language: string
    preferences: Record<string, any>
  }
  learned: {
    communication_style: string
    topics_of_interest: string[]
    common_tasks: string[]
  }
  history: {
    total_sessions: number
    last_interaction: Date
    frequently_used_tools: string[]
  }
}
```

### UI Components para Memory

```tsx
// Memory Inspector Panel
function MemoryPanel({ threadId }) {
  const { sessionMemory, profileMemory } = useMemory(threadId)
  
  return (
    <div className="memory-panel">
      <section>
        <h3>🧠 Session Context</h3>
        <ul>
          <li>Topic: {sessionMemory.currentContext.topic}</li>
          <li>Entities: {sessionMemory.currentContext.entities.join(', ')}</li>
        </ul>
        <button onClick={() => clearSessionMemory(threadId)}>
          Clear Session
        </button>
      </section>
      
      <section>
        <h3>👤 Your Profile</h3>
        <EditableList
          items={profileMemory.userInfo}
          onUpdate={(key, value) => updateProfile(key, value)}
        />
        <button onClick={() => forgetMe()}>
          🗑️ Forget Everything
        </button>
      </section>
      
      <section>
        <h3>📚 What I Remember</h3>
        <ul>
          {profileMemory.learned.topics_of_interest.map(topic => (
            <li key={topic}>
              {topic}
              <button onClick={() => forgetTopic(topic)}>×</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

**Best Practices:**
- ✅ **Transparency:** User can see what's remembered
- ✅ **Control:** One-click forget/edit
- ✅ **Granularity:** Delete specific memories, not all
- ✅ **Change log:** Show when memories were added/updated

---

## 🔗 Citations & Trust

### Citation Component

```tsx
interface Citation {
  id: string
  title: string
  url: string
  snippet: string
  score: number
  position: [number, number]  // Start, end in text
}

function CitationBar({ citations }: { citations: Citation[] }) {
  return (
    <div className="citations-bar">
      <h4>📚 Sources ({citations.length})</h4>
      <div className="citation-chips">
        {citations.map((citation, idx) => (
          <CitationChip
            key={citation.id}
            number={idx + 1}
            citation={citation}
          />
        ))}
      </div>
    </div>
  )
}

function CitationChip({ number, citation }) {
  const [showPreview, setShowPreview] = useState(false)
  
  return (
    <div
      className="citation-chip"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <a href={citation.url} target="_blank">
        [{number}] {citation.title}
      </a>
      
      {showPreview && (
        <div className="citation-preview">
          <p>{citation.snippet}</p>
          <span className="citation-score">
            Relevance: {(citation.score * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

// Inline citations en el texto
function MessageWithCitations({ text, citations }) {
  const renderWithCitations = () => {
    let result = text
    citations.forEach((citation, idx) => {
      const [start, end] = citation.position
      result = result.slice(0, end) + `[${idx + 1}]` + result.slice(end)
    })
    return result
  }
  
  return <Markdown>{renderWithCitations()}</Markdown>
}
```

**Best Practices:**
- 📌 **Max 5 sources** - Más = overwhelming
- 🔢 **Numbered footnotes** - [1], [2], [3]...
- 👁️ **Hover preview** - Show snippet on hover
- ⚠️ **Broken link handling** - Show alternative or flag
- 📊 **Relevance score** - Show confidence visually

---

## ♿ Accessibility Features

### ARIA Live Regions
```tsx
function StreamingMessage({ content, isStreaming }) {
  return (
    <div
      aria-live="polite"
      aria-busy={isStreaming}
      role="status"
    >
      {content}
      {isStreaming && (
        <span className="sr-only">
          Assistant is generating response...
        </span>
      )}
    </div>
  )
}
```

### Keyboard Navigation
```tsx
// Todos los controles accesibles con teclado
<button
  aria-label="Stop generating response"
  onClick={handleStop}
  className="focus:ring-2 focus:ring-blue-500"
>
  <StopIcon />
</button>

// Focus management
useEffect(() => {
  if (messageComplete) {
    composerRef.current?.focus()
  }
}, [messageComplete])
```

### Error States
```tsx
function ErrorMessage({ error, onRetry }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="error-state"
    >
      <AlertTriangleIcon aria-hidden="true" />
      <div>
        <h4>Something went wrong</h4>
        <p>{error.message}</p>
        <button onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  )
}
```

---

## 🎨 Design System Recommendations

### Color System
```css
/* Estados del agente */
--agent-thinking: #3b82f6;    /* Blue - pensando */
--agent-success: #10b981;     /* Green - completado */
--agent-error: #ef4444;       /* Red - error */
--agent-warning: #f59e0b;     /* Amber - warning */
--agent-idle: #6b7280;        /* Gray - idle */

/* Interacciones */
--interactive-primary: #6366f1;
--interactive-hover: #4f46e5;
--interactive-active: #4338ca;
```

### Typography
```css
/* Mensajes del usuario */
.user-message {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-primary);
}

/* Respuestas del agente */
.agent-message {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* Code blocks */
.code-block {
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.7;
}
```

### Spacing System
```css
/* Consistencia en espaciado */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */

/* Messages spacing */
.message + .message {
  margin-top: var(--space-4);
}

.message-group + .message-group {
  margin-top: var(--space-8);
}
```

---

## 🚀 Performance Optimization

### Virtualization para Long Threads
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedMessageList({ messages }) {
  const parentRef = useRef()
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5
  })
  
  return (
    <div ref={parentRef} className="message-list">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <Message message={messages[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Image Lazy Loading
```tsx
function LazyImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="message-image"
    />
  )
}
```

### Debounced Typing Indicators
```tsx
function TypingIndicator() {
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef()
  
  const handleTyping = useMemo(
    () => debounce(() => {
      setIsTyping(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 1000)
    }, 300),
    []
  )
  
  return isTyping ? <ThinkingDots /> : null
}
```

---

## 📱 Mobile-First Considerations

### Touch-Friendly Targets
```css
/* Minimum 44x44px touch targets */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-3) var(--space-4);
}

/* Swipe gestures */
.message {
  touch-action: pan-y;
}
```

### Responsive Breakpoints
```css
/* Mobile First */
.chat-container {
  max-width: 100%;
}

@media (min-width: 640px) {
  .chat-container {
    max-width: 640px;
  }
}

@media (min-width: 1024px) {
  .chat-container {
    max-width: 768px;
  }
  
  .sidebar {
    display: block;
  }
}
```

---

## 🎯 Métricas de Éxito

### UX Metrics
- ⏱️ **TTFT (Time to First Token):** < 800ms
- 🎯 **Completion Rate:** > 85%
- 😊 **CSAT (Customer Satisfaction):** > 4.5/5
- 🔄 **Retry Rate:** < 10%
- 📊 **Engagement:** > 3 messages per session

### Technical Metrics
- 🚀 **FCP (First Contentful Paint):** < 1.5s
- ⚡ **LCP (Largest Contentful Paint):** < 2.5s
- 📏 **CLS (Cumulative Layout Shift):** < 0.1
- ⏰ **INP (Interaction to Next Paint):** < 200ms

---

**Actualizado:** Nov 11, 2025  
**Mantenido por:** Kylio Team
