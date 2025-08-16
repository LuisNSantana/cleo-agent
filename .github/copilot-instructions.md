# GitHub Copilot Instructions for Cleo Agent

> **AI-powered assistant with canvas editor, RAG system, Google integrations, and reasoning support**

## Project Overview

**Cleo Agent** is a Next.js 15 AI assistant featuring:
- 🧠 Multi-provider AI chat with reasoning support (GPT-5 Nano, Claude, Llama, etc.)
- 🎨 Interactive canvas editor with drawing, annotations, and shape tools  
- 🔍 Hybrid RAG system with semantic search and document chunking
- 📅 Google Calendar & Drive integrations
- 🔐 Supabase authentication and database
- 📱 Responsive UI with real-time streaming

## Architecture & Stack

- **Framework**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **AI SDK**: AI SDK v5 with tool calling and streaming
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **State Management**: React Context + IndexedDB for persistence
- **UI Components**: Custom components with Framer Motion animations
- **Development**: Docker Compose with hot reload, pnpm package manager

## Core Components & Patterns

### 1. Chat System (`app/components/chat/`)
- **`message-assistant.tsx`**: Main AI response component with reasoning display
- **`reasoning.tsx`**: Handles reasoning UI for supported models (GPT-5 Nano)
- **`message-user.tsx`**: User message display with file attachments
- **`chat-interface.tsx`**: Main chat container with streaming support

### 2. Canvas Editor (`components/canvas-editor/`, `components/interactive-canvas/`)
- **Drawing System**: Vector graphics with pressure sensitivity
- **Shape Tools**: Rectangles, circles, arrows, text annotations
- **Real-time Collaboration**: Multi-user canvas editing
- **File Integration**: Image uploads, PDF annotations

### 3. RAG System (`lib/rag/`)
- **`retrieve.ts`**: Hybrid retrieval (vector + full-text), reranking, and context block assembly
- **`index-document.ts`**: Chunking + embeddings + inserts into `document_chunks`
- **`chunking.ts`**: Markdown-aware chunking with overlap and token estimates
- **`embeddings.ts`**: OpenAI embeddings provider (text-embedding-3-small by default)
- **`reranking.ts`**: Cross-encoder style reranking via embeddings similarity

### 4. Google Integrations (`lib/tools/`)
- **`google-calendar.ts`**: Event listing, creation with timezone support
- **`google-drive.ts`**: File browsing, search, upload with preview
- **Authentication**: OAuth2 with token refresh handling

### 5. Model Management (`lib/models/`)
- **`openai.clean.ts`**: GPT models with reasoning support
- **`anthropic.clean.ts`**: Claude models configuration  
- **`groq.clean.ts`**: Llama models with custom parameters

## Development Guidelines

### Code Style & Patterns

```typescript
// ✅ Use proper TypeScript types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string // For supported models
}

// ✅ Error handling pattern
try {
  const result = await performAction()
  return { success: true, data: result }
} catch (error) {
  console.error('Action failed:', error)
  return { success: false, error: error.message }
}

// ✅ Tool calling pattern (AI SDK v5)
export const myTool = tool({
  description: 'Clear description with emojis',
  inputSchema: z.object({
    param: z.string().describe('Parameter description')
  }),
  execute: async ({ param }) => {
    // Implementation
  }
})
```

### Component Patterns

```tsx
// ✅ React component with proper state management
import { useChat } from '@/lib/hooks/use-chat'

export function ChatComponent() {
  const { messages, sendMessage, isLoading } = useChat()
  
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <MessageComponent key={message.id} message={message} />
      ))}
    </div>
  )
}
```

### File Organization

```
app/
├── api/                 # API routes (chat, auth, tools)
│   ├── chat/route.ts   # Main chat streaming endpoint
│   └── analyze-*/      # Analysis endpoints
├── components/         # Page-level components
└── [dynamic]/          # Dynamic routes

components/
├── ui/                 # Reusable UI components
├── chat/               # Chat-specific components
├── canvas-editor/      # Canvas editing components
└── interactive-canvas/ # Canvas interaction logic

lib/
├── models/             # AI model configurations
├── tools/              # Tool implementations
├── rag/                # RAG system components
├── supabase/           # Database utilities
└── prompts/            # System prompts
```

## Key Features & Implementation

### 1. Reasoning Support
- **Models**: GPT-5 Nano supports reasoning output
- **Backend**: `reasoning_effort` parameter propagation in `/api/chat/route.ts`
- **Frontend**: `reasoning.tsx` displays thinking process with debug logs
- **Configuration**: Set `reasoning: true` in model config

### 2. Canvas Editor
- **Integration**: `interactive-canvas-entry.tsx` handles canvas initialization
- **Tools**: Drawing, shapes, text, image annotations
- **Persistence**: Canvas state saved to Supabase with compression
- **Real-time**: WebSocket updates for collaborative editing

### 3. RAG System
- **Hybrid Search**: Combines semantic similarity + keyword matching
- **Reranking**: AI-powered relevance scoring for better results
- **Document Processing**: Automatic chunking with overlap
- **Vector Storage**: Supabase pgvector for embeddings

### 3.1 Personality-aware Memory Pipeline
- **User Preferences → Prompt + Memory**
  - Client builds a system prompt with personality settings: `app/components/chat/use-chat-core.ts` using `lib/prompts/personality.ts` (includes customStyle, language adaptation, and sliders like formality/creativity).
  - Server logs active personality for each chat: `app/api/chat/route.ts` parses the prompt and logs `[ChatAPI] Active personality`.
- **Auto “User Profile” Document**
  - On `PUT /api/user-preferences`, we upsert a lightweight `user_profile_auto.md` summarizing personality and customStyle and index it into RAG: `app/api/user-preferences/route.ts` → calls `lib/rag/index-document.ts`.
  - This provides persistent, retrievable memory across sessions.
- **Retrieval Strategy**
  - Auto-RAG is enabled in `app/api/chat/route.ts`: retrieves relevant chunks for the last user query.
  - If initial retrieval is sparse, a secondary “perfil del usuario” query runs to pull profile context.
  - Final system prompt = `[Retrieved Context]\n\n[Personalization instruction]\n\n[Personality prompt]`.

### 3.2 Observability & Logging Conventions
- `[Prefs][PUT]` — preferences updates and saved personalityType
- `[Prefs][GET]` — preferences retrieval and personalityType returned
- `[CHUNK]` — chunking diagnostics (count, token estimates)
- `[HYBRID]` / `[RERANK]` — retrieval and reranking diagnostics
- `[ChatAPI] Active personality` — inferred personality used in chat
- `[RAG]` — retrieval flow and context usage details

### 3.3 Implementation Notes
- Profile doc filename: `user_profile_auto.md` (per-user upsert)
- Index is forced on preference changes to keep embeddings fresh
- Retrieval APIs: `retrieveRelevant` (hybrid/vector fallback) and `buildContextBlock`
- Safe fallbacks and extra retrieval pass improve recall of personal context

### 4. Google Integrations
- **Authentication**: OAuth2 flow with secure token storage
- **Calendar Tools**: Event listing with date validation, event creation
- **Drive Tools**: File listing, search, upload with MIME type handling
- **Error Handling**: Graceful fallbacks when services unavailable

## Development Workflow

### Environment Setup
```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Configure: OPENAI_API_KEY, SUPABASE_URL, GOOGLE_CLIENT_ID, etc.

# Development with Docker
pnpm docker:dev     # Start with hot reload
pnpm docker:logs    # View container logs
pnpm docker:down    # Stop containers

# Production build
pnpm docker:prod    # Build and run production container
```

### Database Schema
- **Supabase**: Use provided schema files (`supabase_schema*.sql`)
- **Tables**: `messages`, `canvas_data`, `documents`, `user_service_connections`
- **Vector Extension**: Enable pgvector for semantic search
- **RLS**: Row Level Security policies for user data isolation

### Testing Patterns
```typescript
// ✅ Test tool functionality
import { myTool } from '@/lib/tools/my-tool'

describe('MyTool', () => {
  it('should handle valid input', async () => {
    const result = await myTool.execute({ param: 'test' })
    expect(result.success).toBe(true)
  })
})
```

## Common Tasks & Solutions

### Adding New AI Models
1. Create config file in `lib/models/data/`
2. Add to model registry in `lib/models/`  
3. Update UI selection in components
4. Test streaming and tool calling

### Implementing New Tools
1. Create tool file in `lib/tools/`
2. Use `tool()` from AI SDK with proper schema
3. Add to tool registry in `app/api/chat/route.ts`
4. Update prompts in `lib/prompts/index.ts`

### Canvas Features
1. Add drawing tools in `components/canvas-editor/tools/`
2. Update toolbar in `interactive-canvas-toolbar.tsx`
3. Handle state in canvas context
4. Test persistence and real-time sync

### RAG Improvements  
1. Update chunking logic in `lib/rag/documents.ts`
2. Modify search algorithms in `lib/rag/hybrid-search.ts`
3. Adjust reranking in `lib/rag/semantic-rerank.ts`
4. Test with various document types

## Performance Guidelines

- **Streaming**: Use AI SDK streaming for real-time responses
- **Caching**: Cache model responses and vector embeddings
- **Optimization**: Lazy load canvas components, paginate file lists
- **Monitoring**: Log performance metrics for chat, search, and canvas operations

## Security Considerations

- **Authentication**: Always validate user sessions
- **API Keys**: Store securely, never expose in client code  
- **File Uploads**: Validate file types and sizes
- **SQL Injection**: Use parameterized queries with Supabase
- **CORS**: Configure properly for production domains

## Deployment Notes

- **Environment**: Production uses `docker-compose.yml` (override for dev)
- **Secrets**: Use environment variables for all sensitive data
- **Database**: Supabase hosted instance with proper backups
- **CDN**: Consider for static assets and file uploads
- **Monitoring**: Set up error tracking and performance monitoring

---

**Remember**: This is an AI assistant focused on reasoning, creativity, and productivity. Prioritize user experience, reliable integrations, and intelligent responses over complexity.
