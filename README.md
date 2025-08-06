# Cleo

**Cleo is an emotionally intelligent AI assistant created by Huminary Labs.**

Cleo is designed to make your daily life easier through empathetic AI interactions, powered by advanced language models like Grok-4 and Llama 4 Maverick.

![cleo cover](./public/logocleo.png)

## Features

- **Multi-model support**: Powered by Grok-4 (xAI) and Llama 4 Maverick (Groq)
- **Emotionally Intelligent**: Designed to understand and respond with empathy and warmth
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

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

1. Create a new Supabase project
2. Run the database migrations (see `supabase/migrations/`)
3. Update your environment variables

Open [http://localhost:3000](http://localhost:3000) to start chatting with Cleo!

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with TypeScript
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) and [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) v5
- **Database**: [Supabase](https://supabase.com) (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth
- **AI Models**: 
  - [xAI Grok-4](https://x.ai/) via @ai-sdk/xai
  - [Groq Llama Models](https://groq.com/) via groq-sdk
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
- [ ] Advanced task automation
- [ ] Integration with popular productivity tools

## License

Apache License 2.0

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/LuisNSantana/cleo-agent/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## Notes

Cleo is actively developed and new features are added regularly. The codebase follows modern React and Next.js best practices.
