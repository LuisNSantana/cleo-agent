import type { Metadata } from "next"
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
    default: "Cleo – AI Assistant by Huminary Labs",
    template: "%s · Cleo",
  },
  description:
    "Cleo es un asistente de IA emocionalmente inteligente creado por Huminary Labs. Diseñado para ayudarte con empatía, contexto y herramientas avanzadas.",
  applicationName: "Cleo",
  generator: "Next.js",
  keywords: [
    "Cleo",
    "AI Assistant",
    "Huminary Labs",
    "IA Emocional",
    "Productividad",
  ],
  authors: [{ name: "Huminary Labs" }],
  themeColor: "#0b1020",
  colorScheme: "dark",
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
    title: "Cleo – AI Assistant",
    description:
      "Cleo es un asistente de IA emocionalmente inteligente creado por Huminary Labs.",
    url: "/",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "Cleo – AI Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@HuminaryLabs",
    title: "Cleo – AI Assistant",
    description:
      "Cleo es un asistente de IA emocionalmente inteligente creado por Huminary Labs.",
    images: [
      {
        url: "/opengraph-image.jpg",
        alt: "Cleo – AI Assistant",
      },
    ],
  },
  appLinks: {
    web: {
      url: "/",
      should_fallback: true,
    },
  },
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
    <html lang="en" suppressHydrationWarning className="dark">
      {isOfficialDeployment ? (
        <Script
          defer
          src="https://assets.onedollarstats.com/stonks.js"
          {...(isDev ? { "data-debug": "zola.chat" } : {})}
        />
      ) : null}
      <head>
        <meta name="theme-color" content="#0b1020" />
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
                        defaultTheme="dark"
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
