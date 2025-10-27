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
    default: "Cleo AI - Automate Your Work & Save 20+ Hours Weekly",
    template: "%s · Cleo AI",
  },
  description:
    "Let Cleo be with you. AI-powered productivity platform with specialized agents that automate tasks, manage workflows, and boost efficiency 10x. Free trial, no credit card required.",
  applicationName: "Cleo",
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
    "Cleo AI",
    "Huminary Labs",
  ],
  authors: [{ name: "Huminary Labs" }],
  category: "productivity",
  verification: {
    google: "OXgtx8i5hp6cd3djciZSnVlPzvQDcEE_PnWMQh4iLhQ",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", type: "image/x-icon" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=2"],
    apple: "/apple-touch-icon.png?v=2",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Cleo AI",
    title: "Cleo AI - Automate Your Work & Save 20+ Hours Weekly",
    description:
      "Let Cleo be with you. AI agents automate tasks, manage workflows, and make your life 10x easier. Join 1000+ professionals saving time daily. Start free.",
  url: appUrl,
    images: [
      {
        // Add version param to bust social cache when image/design changes
        url: "/opengraph-image?v=2",
        width: 1200,
        height: 630,
        alt: "Cleo - AI Agents Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@HuminaryLabs",
    title: "Cleo AI - Automate Your Work & Save 20+ Hours Weekly",
    description:
      "Let Cleo be with you. AI agents automate tasks, manage workflows, and boost productivity 10x. Start free, no credit card.",
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
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    // Match premium neutral black used across the app
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
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
        <meta name="theme-color" content="#FAF9FF" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#14161C" media="(prefers-color-scheme: dark)" />
        <link rel="manifest" href="/site.webmanifest" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
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
                          defaultTheme="system"
                          enableSystem={true}
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
