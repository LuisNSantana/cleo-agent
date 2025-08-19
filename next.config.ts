import type { NextConfig } from "next"

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const isProd = process.env.NODE_ENV === "production"

const nextConfig: NextConfig = withBundleAnalyzer({
  // Only use standalone in production builds, not in development
  ...(isProd && { output: "standalone" }),
  experimental: {
    // Speed up import resolution for large UI/icon libs
    optimizePackageImports: ["@phosphor-icons/react", "lucide-react"],
  },
  // Ensure server bundles don't try to include native/heavy packages
  serverExternalPackages: ["shiki", "vscode-oniguruma", "canvas", "jsdom"],
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
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
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
