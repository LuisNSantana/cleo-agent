
# 🤖 Cleo - Multi-Agent AI System

**An intelligent multi-agent AI platform tha## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [LangChain](https://langchain.com/)
- Powered by [Supabase](https://supabase.com/) for backend services
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

<div align="center">
  <strong>Made with ❤️ by Huminary Labs</strong>
</div>lized agents for complex tasks and workflows.**

![Cleo Logo](./public/logocleo.png)

## � Quick Start

```bash
# Clone and install
git clone https://github.com/LuisNSantana/cleo-agent.git
cd cleo-agent
pnpm install

# Development with Docker (Recommended)
pnpm docker:dev       # Start development environment
pnpm docker:dev-logs  # View logs in real-time
pnpm docker:dev-down  # Stop and cleanup

# Local development  
pnpm dev              # Start without Docker
```

## 🤖 AI Agents

- **🎯 Cleo**: Main coordinator and emotional intelligence
- **🛍️ Emma**: Shopify e-commerce specialist  
- **📊 Peter**: Google Workspace and research expert
- **🔍 Apu**: Web research specialist
- **🌐 Ami**: Web assistance and support

## ⚡ Performance Modes

| Mode      | Model              | Use Case            | Speed  |
|-----------|-------------------|---------------------|--------|
| Fast      | Groq Llama 3.1    | Quick responses     | ⚡⚡⚡   |
| Balanced  | GPT-4o-mini       | Quality + Speed     | ⚡⚡    |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: LangChain, Supabase, Server-Sent Events
- **AI**: OpenAI, Groq, Anthropic, local Ollama models
- **Tools**: Shopify API, Google Workspace, SerpAPI
- **Emma E-commerce agent** with Shopify integration
- **Per-user credential management** for secure API access
- **Local + cloud hybrid** (Ollama, HuminaryLabs, OpenAI, Groq, etc.)
- **Emotionally intelligent chat** with delegation capabilities
- **Advanced RAG (Retrieval-Augmented Generation)**
- **Tool calling and automation** across all agents
- **Protected supervisor agent** (Cleo cannot be deleted)
- **Universal agent details modal** with comprehensive information
---

## � Features

- **Multi-model orchestration** (LangChain)
- **Local + cloud hybrid** (Ollama, HuminaryLabs, OpenAI, Groq, etc.)
- **Emotionally intelligent chat**
- **Advanced RAG (Retrieval-Augmented Generation)**
- **Tool calling and automation**
- **NotebookLM-compatible docs**
- **Archon-powered project management**
- **Real-time streaming (SSE/WebSocket)**
- **Modern UI (Next.js, Tailwind, TypeScript)**
- **Guest mode, chat history, file uploads**

---

## 🏡 Local Setup (Recommended)

1. **Install [Ollama](https://ollama.com/download)** on your machine.
2. Download the recommended model: `ollama pull llama3.1:8b`
3. Set `OLLAMA_BASE_URL` in `.env.local` (see example).
4. Start Cleo: `pnpm dev`
5. Enjoy private, fast AI with zero cloud cost!

---

## 📚 NotebookLM Integration

- All docs in `/docs` are Markdown and ready for NotebookLM.
- Upload Cleo’s docs to [NotebookLM](https://notebooklm.google.com/) for research, Q&A, and custom workflows.
- Use up to 50 sources, 500k words each. Mix Cleo docs with your own for powerful knowledge graphs.

---

## 🤝 Community & Contribution

- **Open Source:** Fork, contribute, and help Cleo grow smarter.
- **Discord & GitHub:** Join the community, share feedback, and build together.
- **Extensible:** Add new models, tools, and workflows easily.

---

## 📝 Documentation & Guides

- See `/docs/cleo-notebooklm-guide.md` for a full English guide to Cleo’s architecture, models, and NotebookLM usage.
- See `/docs/langchain-integration.md` for technical details on LangChain orchestration.
- All docs are NotebookLM-ready for easy import and Q&A.

---

## 💡 Why Cleo?

- **Privacy-first:** Run locally, keep your data private.
- **Cost-efficient:** Use local models for free, cloud only when needed.
- **Flexible:** Switch between local and cloud seamlessly.
- **Community-driven:** Built for and by users.
- **Research-ready:** NotebookLM integration for advanced workflows.

---

## License

MIT

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
## 🐋 Docker Commands (Recommended)

### Development
```bash
pnpm docker:dev       # Start development server with hot reload
pnpm docker:dev-logs  # View real-time logs
pnpm docker:dev-down  # Stop and cleanup volumes automatically
```

### Production  
```bash
pnpm docker:prod      # Build and run production
pnpm docker:logs      # View production logs
```

### Maintenance
```bash
pnpm docker:clean     # Clean system + volumes
pnpm docker:clean-all # Deep clean everything  
pnpm docker:reset     # Complete reset (nuclear option)
```

> **💡 Pro Tip**: Always use `pnpm docker:dev-down` instead of `docker-compose down` to prevent disk space issues.

## ⚙️ Environment Setup

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key

# Optional OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For ngrok development
NEXT_PUBLIC_APP_URL=https://your-tunnel.ngrok-free.app
```

## 📚 Documentation

- [📖 Installation Guide](./INSTALL.md)
- [📋 Cleo User Guide](./docs/cleo-guide.md)  
- [🏗️ Agent Architecture](./docs/multi-agent-architecture.md)
- [🔧 Local Model Setup](./docs/cleo-local-model-guide.md)
   - Execute `supabase_schema.sql` for basic tables
   - Execute `supabase_schema_add_documents.sql` for document management
## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [LangChain](https://langchain.com/)
- Powered by [Supabase](https://supabase.com/) for backend services
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

<div align="center">
  <strong>Made with ❤️ by Huminary Labs</strong>
</div>
- Profile sync: `app/api/user-preferences/route.ts` → `lib/rag/index-document.ts`
- Retrieval and assembly: `lib/rag/retrieve.ts`, consumed by `app/api/chat/route.ts`

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

### Development with hot-reload (Docker)

If you're actively developing Cleo and want fast iteration without rebuilding the image each time, run Next.js in development mode inside the container with file mounts and hot-reload.

1) Create the override file (we include a sample `docker-compose.override.yml` in the repo that mounts the project into the container and runs `pnpm run dev`). This file mounts your source code into `/app` and starts Next in `dev` mode with polling enabled to ensure file changes are detected inside Docker.

2) Start the stack with the override (this will use your local files and enable HMR):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

Notes and tips:
- The override mounts your repository into the container so edits you make locally are visible immediately inside the container.
- We keep `/app/node_modules` inside the container to avoid cross-platform node_modules issues; the container runs `pnpm install` on start if needed.
- If file changes aren't picked up, the override sets `CHOKIDAR_USEPOLLING=true` to force polling. For better performance, remove polling (or tune the polling interval) if your host supports filesystem events across mounts.
- To run detached (background):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

- To view logs (hot-reload and server logs):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f cleo
```

- To stop and remove containers created by the override:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml down
```

When to rebuild the image instead of using hot-reload
- If you change the Dockerfile, the base image, or native dependencies that require a rebuild (e.g., you changed `package.json` in a way that requires a different binary), you should run:

```bash
docker compose -f docker-compose.yml up --build -d
```

Hot-reload is ideal for code-level iteration (JS/TS, components, API routes). Use the rebuild flow for infra-level or dependency changes.

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
