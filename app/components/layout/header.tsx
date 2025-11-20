"use client"

import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { AppInfoTrigger } from "@/app/components/layout/app-info/app-info-trigger"
import { ButtonNewChat } from "@/app/components/layout/button-new-chat"
import { UserMenu } from "@/app/components/layout/user-menu"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/config"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { cn } from "@/lib/utils"
import { Info, ArrowsOut, Sidebar as SidebarIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { NotificationBell } from "@/components/notifications/notification-bell"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { CreditDisplay } from "@/app/components/credits/credit-display"
import { useCreditBalance } from "@/app/hooks/use-credit-balance"

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

  // Credit balance using custom hook
  const { balance: creditBalance, loading: loadingCredits } = useCreditBalance()

  return (
    <header className="app-fixed-header">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="-ml-0.5 flex flex-1 items-center gap-3 lg:-ml-2.5">
            <div className="flex flex-1 items-center gap-2">
              {canToggleSidebar && (
                  <HeaderSidebarTrigger className="size-9 border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm" />
              )}
                <Link
                  href="/"
                  className="group pointer-events-auto inline-flex items-center gap-2 text-xl font-medium tracking-tight"
                  onClick={() => resetMessages()}
                >
                  {/* Simplified logo wrapper: remove backdrop blur, heavy border and shadow that created visual artifacts */}
                  <div className="flex h-6 w-auto items-center justify-center rounded-md bg-transparent sm:h-7 md:h-8 lg:h-9 shrink-0">
                    <div className="flex items-center gap-2">
                      <Image
                        src={`/img/logoankie.png?v=${assetV}`}
                        alt="Ankie AI logo"
                        width={92}
                        height={28}
                        className="h-6 sm:h-7 object-contain select-none"
                        priority
                      />
                      <div className="flex items-baseline gap-1 leading-none">
                        {(() => {
                          const isDarkMode = mounted && (resolvedTheme ?? theme) === 'dark'
                          const wordmarkBase = cn(
                            "font-black uppercase tracking-[0.4em] text-[0.65rem] sm:text-[0.72rem] transition-colors duration-300",
                            isDarkMode ? "text-white" : "text-brand-ink"
                          )
                          const wordmarkAccent = cn(
                            "font-semibold uppercase tracking-[0.25em] text-[0.6rem] sm:text-[0.7rem] transition-colors duration-300",
                            isDarkMode ? "text-brand-cyan" : "text-brand-violet"
                          )
                          return (
                            <>
                              <span className={wordmarkBase}>ANKIE</span>
                              <span className={wordmarkAccent}>AI</span>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* Only show the compact logo in the header; remove wordmark/BETA to keep header slim */}
                </Link>
              </div>
          </div>
          <div />
          {!isLoggedIn ? (
            <div className="pointer-events-auto flex flex-1 items-center justify-end gap-4">
              <Link
                href="/prompts-library"
                className="font-base text-foreground/80 hover:text-foreground text-base transition-colors"
              >
                Prompt Library
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
