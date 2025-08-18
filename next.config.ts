import type { NextConfig } from "next"

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const nextConfig: NextConfig = withBundleAnalyzer({
  // Only use standalone in production builds, not in development
  ...(process.env.NODE_ENV === "production" && { output: "standalone" }),
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  serverExternalPackages: ["shiki", "vscode-oniguruma"],
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Handle canvas module for konva/react-konva in server-side builds
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas']
    }
    return config
  },
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
