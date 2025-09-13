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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "Cleo - Agent of Agents",
    template: "%s · Cleo",
  },
  description:
    "Cleo is an agent-of-agents AI assistant by Huminary Labs, designed to help you with empathy, context, and powerful tools.",
  applicationName: "Cleo",
  generator: "Next.js",
  keywords: [
    "Cleo",
    "AI Assistant",
    "Huminary Labs",
    "Agent of Agents",
    "Productivity",
  ],
  authors: [{ name: "Huminary Labs" }],
  category: "productivity",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "mask-icon", url: "/android-chrome-512x512.png", color: "#0b1020" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Cleo",
    title: "Cleo - Agent of Agents",
    description:
      "Cleo is an agent-of-agents AI assistant by Huminary Labs, designed to help you with empathy, context, and powerful tools.",
    url: "/",
    images: [
      {
    url: "/img/agents/logocleo4.png",
    width: 512,
    height: 512,
    alt: "Cleo – AI Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@HuminaryLabs",
    title: "Cleo - Agent of Agents",
    description:
      "Cleo is an agent-of-agents AI assistant by Huminary Labs, designed to help you with empathy, context, and powerful tools.",
  images: ["/img/agents/logocleo4.png"],
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TanstackQueryProvider>
          <LayoutClient />
          <UserProvider initialUser={userProfile}>
            <ModelProvider>
              <ChatsProvider userId={userProfile?.id}>
                <ChatSessionProvider>
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
                        enableSystem
                        disableTransitionOnChange
                      >
                        <SidebarProvider defaultOpen>
                          <Toaster position="top-center" />
                          {children}
                        </SidebarProvider>
                      </ThemeProvider>
                    </TooltipProvider>
                  </UserPreferencesProvider>
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
