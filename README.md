# Cleo

**Cleo is an emotionally intelligent AI assistant created by Huminary Labs.**

Cleo is designed to make your daily life easier through empathetic AI interactions, powered by advanced language models like Grok-4 and Llama 4 Maverick.

![cleo cover](./public/logocleo.png)

## Features

- **Multi-model support**: Powered by Grok-4 (xAI) and Llama 4 Maverick (Groq)
- **Emotionally Intelligent**: Designed to understand and respond with empathy and warmth
- **RAG System**: Advanced Retrieval-Augmented Generation for personalized responses using your documents
- **No API Keys Required**: Ready to use without BYOK (Bring Your Own Key)
- **Daily Task Assistant**: Specialized in making your everyday life easier
- **Clean, Modern UI**: Responsive design with light/dark themes
- **Real-time Streaming**: Fast, streaming responses for better UX
- **Guest Mode**: Use without authentication for quick interactions
- **Chat History**: Save and manage your conversations
- **File Uploads**: Share documents and files with Cleo
- **Built with Modern Stack**: Next.js, TypeScript, Tailwind CSS, Supabase

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database)
- API keys for Grok-4 (xAI) and Groq (Llama models)

### Installation / Instalación

#### English
```bash
# Clone the repository
git clone https://github.com/LuisNSantana/cleo-agent.git
cd cleo-agent

# Install dependencies (recommended: pnpm)
pnpm install

# If you have issues with the stable version of Next.js, install the canary version:
pnpm add next@canary

# Install any missing dependencies indicated by the build (e.g., framer-motion):
pnpm add framer-motion

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials and API keys

# Run the development server
pnpm dev
```

#### Español
```bash
# Clona el repositorio
git clone https://github.com/LuisNSantana/cleo-agent.git
cd cleo-agent

# Instala las dependencias (recomendado: pnpm)
pnpm install

# Si tienes problemas con la versión estable de Next.js, instala la versión canary:
pnpm add next@canary

# Instala cualquier dependencia faltante que indique el build (por ejemplo, framer-motion):
pnpm add framer-motion

# Configura las variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales y API keys

# Ejecuta el servidor de desarrollo
pnpm dev
```

### Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Models
XAI_API_KEY=your_xai_api_key
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key  # Required for RAG embeddings

# RAG Enhancement (optional - significantly improves retrieval accuracy)
HUGGINGFACE_API_KEY=your_huggingface_api_key  # For cross-encoder reranking

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

1. Create a new Supabase project
2. Run the database migrations:
   - Execute `supabase_schema.sql` for basic tables
   - Execute `supabase_schema_add_documents.sql` for document management
   - Execute `supabase_schema_rag.sql` for RAG functionality (requires pgvector extension)
   - Execute `supabase_schema_hybrid_rag.sql` for enhanced hybrid search capabilities
3. Update your environment variables

## Personalization with RAG

Cleo features an advanced **Retrieval-Augmented Generation (RAG)** system that learns from your personal documents to provide truly personalized responses:

### How it Works
- **Automatic Learning**: Upload documents through Settings → Files and Cleo automatically indexes them
- **Hybrid Search**: Combines semantic vector search with keyword matching for maximum relevance
- **Smart Reranking**: Uses cross-encoder models to reorder results by actual relevance
- **Intelligent Retrieval**: Searches your documents for relevant context automatically
- **Personalized Responses**: Cleo uses your information to tailor responses to your preferences, interests, and needs

### Getting Started with RAG
1. **Upload Personal Info**: Create a document with your preferences, interests, and personal details
2. **Structure for Best Results**: Use clear headers like "Name:", "Favorite Food:", "Interests:", "Work:"
3. **Chat Naturally**: Ask questions about your preferences and watch Cleo respond with your personal context

### Advanced Features
- **Hybrid Retrieval**: Automatically combines vector similarity and full-text search
- **Cross-Encoder Reranking**: Reorders results using advanced relevance models
- **Multi-Pass Retrieval**: Searches both specific content and general profile information
- **Automatic Fallbacks**: Robust error handling and graceful degradation

### Example Use Cases
- "What's my favorite type of cuisine?" → Cleo knows from your documents
- "Suggest something based on my interests" → Cleo references your uploaded preferences  
- "How should I be addressed?" → Cleo uses your preferred name and communication style

*The RAG system works automatically with significant accuracy improvements over basic vector search - no configuration needed. Just upload your documents and start chatting!*

Open [http://localhost:3000](http://localhost:3000) to start chatting with Cleo!

## Docker

Run Cleo in an isolated, reproducible environment using Docker.

### Requirements
- Docker Desktop (Windows/macOS) or Docker CE (Linux)
- Docker Compose v2 (included with Docker Desktop)
- On Windows, enable WSL integration for your Ubuntu distro in Docker Desktop

### 1) Configure environment
Create and edit `.env.local` at the project root (Compose will load it automatically):

Required (minimum):
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE
- CSRF_SECRET (32 characters)
- ENCRYPTION_KEY (32‑byte base64)
- OPENAI_API_KEY (for RAG embeddings)

Optional:
- OLLAMA_BASE_URL (e.g., http://localhost:11434) for local models

Tip (optional, to generate a 32‑byte base64 key):
```bash
pnpm gen:key          # prints the base64 key
pnpm gen:key --env    # prints ENCRYPTION_KEY=...
```

### 2) Build
```bash
docker compose build
```

### 3) Run
```bash
docker compose up -d
```

### 4) Verify
```bash
curl -f http://localhost:3000/api/health
```
Open http://localhost:3000

### Logs and lifecycle
```bash
docker compose logs -f cleo
docker compose up -d --force-recreate   # apply env changes
docker compose down                     # stop and remove
```

### Use local models (Ollama) [optional]
Runs Ollama and Cleo together (see `docker-compose.ollama.yml`).
```bash
docker compose -f docker-compose.ollama.yml up -d
```

### Troubleshooting
- Permission denied to Docker daemon on WSL: open Docker Desktop and enable WSL integration, or run with `sudo`, or add your user to the `docker` group.
- Port 3000 already in use: stop the other service or change the mapped port in the compose file.
- Missing ENCRYPTION_KEY/CSRF_SECRET: ensure they’re present in `.env.local` before running.

### Why Docker?
- Reproducible builds with pinned Node 20 and a standalone Next.js output
- Isolation of dependencies and environment variables
- Smaller, production‑oriented runtime image with non‑root user and healthcheck
- One‑command start/stop, easy to update and roll back

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with TypeScript
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) and [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) v5
- **Database**: [Supabase](https://supabase.com) (PostgreSQL with pgvector for RAG)
- **Authentication**: Supabase Auth
- **AI Models**: 
  - [xAI Grok-4](https://x.ai/) via @ai-sdk/xai
  - [Groq Llama Models](https://groq.com/) via groq-sdk
  - [OpenAI Embeddings](https://openai.com/) for RAG vector search
- **RAG System**: Vector embeddings with intelligent chunking and retrieval
- **Deployment**: Vercel-ready
- **Styling**: Responsive design with dark/light theme support

## About Huminary Labs

Cleo is developed by **Huminary Labs**, focusing on creating emotionally intelligent AI assistants that enhance daily productivity and well-being.

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## Roadmap

- [ ] Enhanced file processing capabilities
- [ ] Voice interaction support  
- [ ] Mobile app development
- [ ] Advanced RAG features (multi-document synthesis, temporal understanding)
- [ ] Advanced task automation
- [ ] Integration with popular productivity tools

## License

Apache License 2.0

**Important:** While the source code is licensed under Apache 2.0, the "Cleo" name, logos, and trademarks are owned by Huminary Labs and are not covered by this license. See our [Trademark Policy](./TRADEMARK_POLICY.md) for details on acceptable use of the Cleo brand.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/LuisNSantana/cleo-agent/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

**For trademark or brand-related inquiries:** legal@huminarylabs.com

## Notes

Cleo is actively developed and new features are added regularly. The codebase follows modern React and Next.js best practices.

**Trademark Notice:** Cleo™ is a trademark of Huminary Labs. The source code is available under Apache License 2.0, but trademark rights are separately owned and protected. See our [Trademark Policy](./TRADEMARK_POLICY.md) for usage guidelines.
