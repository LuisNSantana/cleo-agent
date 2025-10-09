import type { NextConfig } from "next"

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const isProd = process.env.NODE_ENV === "production"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseHost = supabaseUrl && supabaseUrl !== 'your_supabase_project_url' && supabaseUrl.startsWith('http')
  ? new URL(supabaseUrl).host
  : undefined

const nextConfig: NextConfig = withBundleAnalyzer({
  // Only use standalone in production builds, not in development
  ...(isProd && { output: "standalone" }),
  experimental: {
    // Speed up import resolution for large UI/icon libs
    optimizePackageImports: ["@phosphor-icons/react", "lucide-react"],
  },
  // Configure API routes for larger request bodies (Grok-4-Fast 2M token support)
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow up to 50MB for multiple PDF uploads
    },
    responseLimit: false,
  },
  // Allow ngrok origins in development
  ...(!isProd && {
    allowedOrigins: [
      "*.ngrok-free.app",
      "*.ngrok.app", 
      "localhost:3000"
    ]
  }),
  // Ensure server bundles don't try to include native/heavy packages
  serverExternalPackages: ["shiki", "vscode-oniguruma", "canvas", "jsdom", "@langchain/langgraph", "@langchain/core"],
    // Keep Webpack customization only for production builds to avoid Turbopack warnings in dev
  ...(isProd
    ? {
        webpack: (config: any, { isServer }: { isServer: boolean }) => {
          // Handle canvas module for konva/react-konva in server-side builds
          if (isServer) {
            config.externals = [...(config.externals || []), "canvas"]
          }
          return config
        },
      }
    : {
        webpack: (config: any, { isServer }: { isServer: boolean }) => {
          // Exclude LangGraph from client-side bundles to prevent Node.js module issues
          if (!isServer) {
            config.externals = [...(config.externals || []), "@langchain/langgraph", "@langchain/core"]
          }
          return config
        },
      }),
  images: {
    remotePatterns: [
      // Supabase public storage
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
              port: "",
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Avatars and favicons used in Gmail list UI
      {
        protocol: "https",
        hostname: "unavatar.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        port: "",
        pathname: "/s2/favicons/**",
      },
    ],
  },
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
})

export default nextConfig
