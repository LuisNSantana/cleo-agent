import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatsProvider } from "@/lib/chat-store/chats/provider"
import { ChatSessionProvider } from "@/lib/chat-store/session/provider"
import { ModelProvider } from "@/lib/model-store/provider"
import { TanstackQueryProvider } from "@/lib/tanstack-query/tanstack-query-provider"
import { UserPreferencesProvider } from "@/lib/user-preference-store/provider"
import { UserProvider } from "@/lib/user-store/provider"
import { getUserProfile } from "@/lib/user/api"
import { ThemeProvider } from "next-themes"
import Script from "next/script"
import { LayoutClient } from "./layout-client"
import { LayoutApp } from "./components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { Analytics } from "@vercel/analytics/next"
import { ToolConfirmationProvider } from "@/hooks/use-tool-confirmation"
import { SettingsDialogManager } from "./components/layout/settings/settings-dialog-manager"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined) ||
  "https://www.imcleo.com"

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Ankie AI — Deploy Adaptive Agents in Minutes",
    template: "%s · Ankie AI",
  },
  description:
    "Ankie AI is the transparent multi-agent workspace for building, supervising, and shipping autonomous assistants in minutes.",
  applicationName: "Ankie AI",
  generator: "Next.js",
  keywords: [
    // Primary keywords (high intent)
    "AI productivity tool",
    "AI task automation",
    "AI workflow automation",
    "AI assistant for work",
    
    // Long-tail keywords (specific searches)
    "automate repetitive tasks AI",
    "save time with AI agents",
    "AI agents for business",
    "productivity automation software",
    
    // Feature-based keywords
    "multi-agent AI platform",
    "AI orchestration platform",
    "intelligent task management",
    "AI workflow management",
    
    // Solution-focused
    "increase productivity with AI",
    "AI for remote work",
    "business process automation",
    
    // Brand
    "Ankie AI",
    "Huminary Labs",
  ],
  authors: [{ name: "Ankie AI · Huminary Labs" }],
  category: "productivity",
  verification: {
    google: "OXgtx8i5hp6cd3djciZSnVlPzvQDcEE_PnWMQh4iLhQ",
  },
  icons: {
    icon: [
      { url: "/img/favicon.ico", type: "image/x-icon" },
      { url: "/img/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/img/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/img/favicon.ico"],
    apple: [{ url: "/img/apple-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/img/logo.svg", color: "#00B2FF" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Ankie AI",
    title: "Ankie AI — Deploy Adaptive Agents in Minutes",
    description:
      "Launch custom AI agents with full transparency, supervision, and simple controls. Try the free beta — no credit card required.",
  url: appUrl,
    images: [
      {
        // Add version param to bust social cache when image/design changes
        url: "/opengraph-image?v=2",
        width: 1200,
        height: 630,
        alt: "Ankie AI — Multi-agent automation platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@HuminaryLabs",
    title: "Ankie AI — Deploy Adaptive Agents in Minutes",
    description:
      "Design and deploy AI agents in under 5 minutes with human-grade oversight and transparency.",
    // Keep in sync with openGraph.images and include cache-busting param
    images: ["/opengraph-image?v=2"],
  },
  appLinks: {
    web: {
      url: "/",
      should_fallback: true,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    // Warm, premium light tone
    { media: "(prefers-color-scheme: light)", color: "#F5FAFF" },
    // Match premium neutral black used across the app
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0F" },
  ],
  colorScheme: "light dark",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isDev = process.env.NODE_ENV === "development"
  const isOfficialDeployment = process.env.ZOLA_OFFICIAL === "true"
  const userProfile = await getUserProfile()

  return (
    <html lang="en" suppressHydrationWarning>
      {isOfficialDeployment ? (
        <Script
          defer
          src="https://assets.onedollarstats.com/stonks.js"
          {...(isDev ? { "data-debug": "zola.chat" } : {})}
        />
      ) : null}
  <head>
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Dynamic theme-color based on user's color scheme preference */}
    <meta name="theme-color" content="#F5FAFF" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0B0B0F" media="(prefers-color-scheme: dark)" />
        <link rel="manifest" href="/site.webmanifest" />
  <link rel="apple-touch-icon" href="/img/apple-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <TanstackQueryProvider>
          <LayoutClient />
          <UserProvider initialUser={userProfile}>
            <ModelProvider>
              <ChatsProvider userId={userProfile?.id}>
                <ChatSessionProvider>
                  <MessagesProvider>
                    <UserPreferencesProvider
                      userId={userProfile?.id}
                      initialPreferences={userProfile?.preferences}
                    >
                      <TooltipProvider
                        delayDuration={200}
                        skipDelayDuration={500}
                      >
                        <ThemeProvider
                          attribute="class"
                          defaultTheme="light" // Force light as the initial / fallback theme
                          enableSystem={false}  // Ignore OS preference; user must toggle manually
                          themes={['light','dark']}
                          disableTransitionOnChange
                        >
                          <ToolConfirmationProvider>
                            <SidebarProvider defaultOpen>
                              <Toaster position="top-center" />
                              <SettingsDialogManager />
                              <LayoutApp>
                                {children}
                              </LayoutApp>
                              <Analytics />
                            </SidebarProvider>
                          </ToolConfirmationProvider>
                        </ThemeProvider>
                      </TooltipProvider>
                    </UserPreferencesProvider>
                  </MessagesProvider>
                </ChatSessionProvider>
              </ChatsProvider>
            </ModelProvider>
      </UserProvider>
    </TanstackQueryProvider>
      </body>
    </html>
  )
}
// CanvasEditorEntry moved to LayoutClient (client component)
