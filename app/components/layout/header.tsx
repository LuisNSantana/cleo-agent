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
import { Info } from "@phosphor-icons/react"
import Link from "next/link"
import { DialogPublish } from "./dialog-publish"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { ThemeToggle } from "./theme-toggle"

export function Header({ hasSidebar }: { hasSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const isMultiModelEnabled = preferences.multiModelEnabled

  const isLoggedIn = !!user

  return (
    <header className="h-app-header pointer-events-none fixed top-0 right-0 left-0 z-50">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="-ml-0.5 flex flex-1 items-center gap-2 lg:-ml-2.5">
            <div className="flex flex-1 items-center gap-2">
              <Link
                href="/"
                className="group pointer-events-auto inline-flex items-center gap-2 text-xl font-medium tracking-tight"
              >
                <CleoIcon size={56} src="/logocleo4.png" className="" />
                <span className="brand-text relative bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent text-xl font-extrabold tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] sm:text-2xl">
                  Cleo
                </span>
              </Link>
              {hasSidebar && isMobile && <HeaderSidebarTrigger />}
            </div>
          </div>
          <div />
          {!isLoggedIn ? (
            <div className="pointer-events-auto flex flex-1 items-center justify-end gap-4">
              <ThemeToggle />
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
              {!isMultiModelEnabled && <DialogPublish />}
              <ButtonNewChat />
              {!hasSidebar && <HistoryTrigger hasSidebar={hasSidebar} />}
              <ThemeToggle />
              <UserMenu />
            </div>
          )}
        </div>
      </div>
      {/* One-time premium pop-in animation for brand text */}
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
