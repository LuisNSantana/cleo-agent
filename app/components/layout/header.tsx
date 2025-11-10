"use client"

import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { AppInfoTrigger } from "@/app/components/layout/app-info/app-info-trigger"
import { ButtonNewChat } from "@/app/components/layout/button-new-chat"
import { UserMenu } from "@/app/components/layout/user-menu"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { CleoIcon } from "@/components/icons/cleo"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { Info, CheckSquare, ArrowsOut, Sidebar as SidebarIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { NotificationBell } from "@/components/notifications/notification-bell"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { CreditDisplay, type CreditBalance } from "@/app/components/credits/credit-display"

export function Header({ hasSidebar }: { hasSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const { user } = useUser()
  const { resetMessages } = useMessages()
  const { preferences, setLayout } = useUserPreferences()
  const isMultiModelEnabled = preferences.multiModelEnabled
  const { theme, resolvedTheme } = useTheme()
  const assetV = (process.env.NEXT_PUBLIC_ASSET_VERSION as string) || '3'

  const isLoggedIn = !!user
  const canToggleSidebar = isLoggedIn && (hasSidebar || isMobile)

  // ✅ Fix hydration: Wait for client-side mount before determining theme
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Credit balance state
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(false)

  // Fetch credit balance when user is logged in
  useEffect(() => {
    if (!isLoggedIn) return

    const fetchBalance = async () => {
      try {
        setLoadingCredits(true)
        const response = await fetch('/api/credits/balance')
        if (response.ok) {
          const data = await response.json()
          setCreditBalance(data)
        }
      } catch (error) {
        console.error('Failed to fetch credit balance:', error)
      } finally {
        setLoadingCredits(false)
      }
    }

    fetchBalance()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  return (
    <header className="app-fixed-header">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="-ml-0.5 flex flex-1 items-center gap-3 lg:-ml-2.5">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                {canToggleSidebar && (
                  <HeaderSidebarTrigger className="size-9 border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm" />
                )}
                <Link
                  href="/"
                  className="group pointer-events-auto inline-flex items-center gap-2 text-xl font-medium tracking-tight"
                  onClick={() => resetMessages()}
                >
                  {/* Simplified logo wrapper: remove backdrop blur, heavy border and shadow that created visual artifacts */}
                  <div className="flex h-5 w-auto items-center justify-center rounded-md bg-transparent sm:h-6 md:h-7 lg:h-8 shrink-0">
                    {!mounted ? (
                      // ✅ Server-side & initial render: show neutral/light logo to avoid hydration mismatch
                      <Image
                        src={`/img/kyliologo.png?v=${assetV}`}
                        alt="Kylio"
                        width={84}
                        height={22}
                        className="h-full w-auto object-contain select-none"
                        priority
                        sizes="(max-width: 640px) 54px, (max-width: 768px) 68px, 84px"
                      />
                    ) : (
                      // ✅ Client-side only: use theme-aware logo
                      (() => {
                        const isDark = (resolvedTheme ?? theme) === 'dark'
                        const logoSrc = isDark
                          ? `/img/kyliologodarkmode.png?v=${assetV}`
                          : `/img/kyliologo.png?v=${assetV}`
                        return (
                          <Image
                            src={logoSrc}
                            alt="Kylio"
                            width={84}
                            height={22}
                            className="h-full w-auto object-contain select-none"
                            priority
                            sizes="(max-width: 640px) 54px, (max-width: 768px) 68px, 84px"
                          />
                        )
                      })()
                    )}
                  </div>
                  {/* Only show the compact logo in the header; remove wordmark/BETA to keep header slim */}
                </Link>
              </div>
            </div>
          </div>
          <div />
          {!isLoggedIn ? (
            <div className="pointer-events-auto flex flex-1 items-center justify-end gap-4">
              <Link
                href="/docs"
                className="font-base text-foreground/80 hover:text-foreground text-base transition-colors"
              >
                Docs
              </Link>
              <AppInfoTrigger
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background hover:bg-muted text-muted-foreground h-8 w-8 rounded-full"
                    aria-label={`About ${APP_NAME}`}
                  >
                    <Info className="size-4" />
                  </Button>
                }
              />
              <Link
                href="/auth"
                className="font-base text-muted-foreground hover:text-foreground text-base transition-colors"
              >
                Login
              </Link>
            </div>
          ) : (
            <div className="pointer-events-auto flex flex-1 items-center justify-end gap-2">
              {/* Quick toggle: Sidebar vs Chat-only (desktop only) */}
              <button
                type="button"
                className="hidden md:inline-flex bg-background text-foreground/80 hover:text-foreground hover:bg-muted h-8 w-8 items-center justify-center rounded-md transition-colors"
                aria-label={hasSidebar ? "Modo Enfoque" : "Ver Barra"}
                title={hasSidebar ? "Modo Enfoque" : "Ver Barra"}
                aria-pressed={hasSidebar}
                onClick={() => {
                  // On mobile: avoid server updates; sidebar sheet is mounted independently
                  if (isMobile) return
                  setLayout(hasSidebar ? "fullscreen" : "sidebar")
                }}
              >
                {hasSidebar ? <ArrowsOut className="size-4" /> : <SidebarIcon className="size-4" />}
              </button>
              <ButtonNewChat />
              {!hasSidebar && <HistoryTrigger hasSidebar={hasSidebar} />}
              
              {/* Credit Display - Minimal badge */}
              <div className="hidden sm:flex">
                <CreditDisplay 
                  balance={creditBalance} 
                  loading={loadingCredits}
                  variant="badge"
                  className="transition-all hover:scale-105"
                />
              </div>
              
              <NotificationBell />
              <UserMenu />
            </div>
          )}
        </div>
      </div>
      {/* No additional brand animations needed; keep header lean */}
    </header>
  )
}
