# syntax=docker/dockerfile:1.4
# Optimized multi-stage Dockerfile for Next.js (standalone) using pnpm
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies only when needed
FROM base AS deps

# Install build tools and canvas dependencies required by konva/react-konva
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Enable pnpm via corepack and configure store location
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm config set store-dir /app/.pnpm-store

# Copy package files (prioritize pnpm-lock.yaml for this project)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm for better reproducibility
RUN pnpm install --frozen-lockfile --reporter=silent

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Re-enable pnpm in this stage
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all project files
COPY . .

# Set Next.js telemetry to disabled
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time environment variables (required for Next.js build)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE
ARG OPENAI_API_KEY
ARG ANTHROPIC_API_KEY
ARG GOOGLE_GENERATIVE_AI_API_KEY
ARG MISTRAL_API_KEY
ARG XAI_API_KEY
ARG PERPLEXITY_API_KEY
ARG OPENROUTER_API_KEY
ARG CSRF_SECRET

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE=$SUPABASE_SERVICE_ROLE
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENV GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY
ENV MISTRAL_API_KEY=$MISTRAL_API_KEY
ENV XAI_API_KEY=$XAI_API_KEY
ENV PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY
ENV CSRF_SECRET=$CSRF_SECRET

# Build the application using pnpm
RUN pnpm build

# Verify standalone build was created
RUN ls -la .next/ && \
    if [ ! -d ".next/standalone" ]; then \
      echo "ERROR: .next/standalone directory not found. Make sure output: 'standalone' is set in next.config.ts"; \
      exit 1; \
    fi

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

# Install minimal runtime packages (tini for signal handling, curl for healthcheck)
RUN apk add --no-cache tini curl

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user (Alpine style)
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy standalone application and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json for potential runtime needs
COPY --from=builder /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Set environment variables for runtime
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check using curl (more reliable than wget)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
