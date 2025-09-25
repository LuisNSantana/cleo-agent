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
import { Info, CheckSquare } from "@phosphor-icons/react"
import Link from "next/link"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { ArrowsInSimple as FullscreenIcon } from "@phosphor-icons/react"
import { PanelLeftIcon } from "lucide-react"

export function Header({ hasSidebar }: { hasSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const { user } = useUser()
  const { preferences, setLayout } = useUserPreferences()
  const isMultiModelEnabled = preferences.multiModelEnabled

  const isLoggedIn = !!user
  const canToggleSidebar = isLoggedIn && (hasSidebar || isMobile)

  return (
    <header className="app-fixed-header">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="-ml-0.5 flex flex-1 items-center gap-3 lg:-ml-2.5">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                {canToggleSidebar && (
                  <HeaderSidebarTrigger className="-ml-1 size-9 border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm" />
                )}
                <Link
                  href="/"
                  className="group pointer-events-auto inline-flex items-center gap-2 text-xl font-medium tracking-tight"
                >
                  <CleoIcon size={56} src="/img/agents/logocleo4.png" className="" />
                  <span className="brand-text relative bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent text-xl font-extrabold tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] sm:text-2xl">
                    Cleo
                  </span>
                  <span
                    aria-label="Beta"
                    title="Cleo is in Beta"
                    className="mt-1 hidden select-none items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide text-foreground/80 sm:inline-flex bg-secondary/70 border-border/60 backdrop-blur-sm"
                  >
                    BETA
                  </span>
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
                aria-label={hasSidebar ? "Switch to Chat-only" : "Show Sidebar"}
                title={hasSidebar ? "Switch to Chat-only" : "Show Sidebar"}
                aria-pressed={hasSidebar}
                onClick={() => {
                  // On mobile: avoid server updates; sidebar sheet is mounted independently
                  if (isMobile) return
                  setLayout(hasSidebar ? "fullscreen" : "sidebar")
                }}
              >
                {hasSidebar ? <FullscreenIcon className="size-4" /> : <PanelLeftIcon className="size-4" />}
              </button>
              <ButtonNewChat />
              {!hasSidebar && <HistoryTrigger hasSidebar={hasSidebar} />}
              <NotificationBell />
              <UserMenu />
            </div>
          )}
        </div>
      </div>
      {/* Estilos premium para CTAs principales */}
      <style jsx>{`
        .brand-text {
          animation: brand-pop-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
          will-change: transform, opacity;
          display: inline-block;
        }
        @keyframes brand-pop-in {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); filter: blur(2px); }
          40% { opacity: 1; transform: translateY(-6px) scale(1.03); filter: blur(0); }
          70% { transform: translateY(3px) scale(0.998); }
          100% { transform: translateY(0) scale(1); }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .brand-text { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </header>
  )
}
