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
import { ThemeToggle } from "./theme-toggle"
import { NotificationBell } from "@/components/notifications/notification-bell"

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
                <CleoIcon size={56} src="/img/agents/logocleo4.png" className="" />
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
              <Link
                href="/docs"
                className="font-base text-muted-foreground hover:text-foreground text-base transition-colors"
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
              {/* Tasks CTA - Nueva funcionalidad destacada */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="task-cta pulse-init relative h-8 w-8 rounded-full overflow-hidden bg-background hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
              >
                <Link href="/agents/tasks" aria-label="Task Management" title="Task Management" className="group">
                  <CheckSquare className="h-5 w-5 opacity-90 transition-all group-hover:opacity-100 group-hover:scale-105" />
                </Link>
              </Button>
              
              {/* Agent Control - Premium feature destacada */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="agent-cta pulse-init relative h-8 w-8 rounded-full overflow-hidden bg-background hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20"
              >
                <Link href="/agents" aria-label="Agent Control Center" title="Agent Control Center" className="group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/ai-agents.png"
                    alt="Agent Control Center"
                    width={20}
                    height={20}
                    className="h-5 w-5 opacity-90 transition-all group-hover:opacity-100 group-hover:scale-105"
                  />
                </Link>
              </Button>
              
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
        
        /* Estilos compartidos para CTAs principales */
        .agent-cta, .task-cta {
          position: relative;
          transition: all 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        
        /* Glow effect mejorado para Agent CTA */
        .agent-cta::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          background: radial-gradient(60% 60% at 50% 50%, rgba(147, 51, 234, 0.3), transparent 70%);
          opacity: 0;
          z-index: 1;
          pointer-events: none;
          transition: opacity 300ms ease;
        }
        .agent-cta:hover::before, .agent-cta:focus-visible::before { 
          opacity: 0.8; 
          animation: glow-pulse 1500ms ease-in-out infinite;
        }
        
        /* Glow effect para Task CTA */
        .task-cta::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          background: radial-gradient(60% 60% at 50% 50%, rgba(59, 130, 246, 0.3), transparent 70%);
          opacity: 0;
          z-index: 1;
          pointer-events: none;
          transition: opacity 300ms ease;
        }
        .task-cta:hover::before, .task-cta:focus-visible::before { 
          opacity: 0.8;
          animation: glow-pulse 1500ms ease-in-out infinite;
        }
        
        /* Pulse inicial para ambos CTAs */
        .agent-cta.pulse-init::before {
          animation: agent-pulse 2500ms ease-out 500ms 2;
        }
        .task-cta.pulse-init::before {
          animation: task-pulse 2500ms ease-out 800ms 2;
        }
        
        /* Efectos de sweep mejorados */
        .agent-cta::after, .task-cta::after {
          content: "";
          position: absolute;
          top: -10%;
          bottom: -10%;
          left: -35%;
          width: 40%;
          border-radius: 9999px;
          transform: skewX(-22deg) translateX(-140%);
          opacity: 0;
          filter: blur(0.5px);
          z-index: 2;
          pointer-events: none;
          transition: transform 600ms cubic-bezier(.2,.6,.2,1), opacity 300ms ease;
        }
        
        .agent-cta::after {
          background: linear-gradient(90deg, rgba(147, 51, 234, 0) 0%, rgba(147, 51, 234, 0.6) 50%, rgba(147, 51, 234, 0) 100%);
        }
        
        .task-cta::after {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0.6) 50%, rgba(59, 130, 246, 0) 100%);
        }
        
        .agent-cta:hover::after, .agent-cta:focus-visible::after,
        .task-cta:hover::after, .task-cta:focus-visible::after {
          opacity: 0.8;
          transform: skewX(-22deg) translateX(220%);
        }
        
        /* Efectos de hover mejorados */
        .agent-cta:hover, .agent-cta:focus-visible,
        .task-cta:hover, .task-cta:focus-visible {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .agent-cta:hover img, .agent-cta:focus-visible img { 
          filter: brightness(1.2) saturate(1.1) drop-shadow(0 0 8px rgba(147, 51, 234, 0.4)); 
          transform: scale(1.05); 
        }
        
        .task-cta:hover .phosphor-icon, .task-cta:focus-visible .phosphor-icon {
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
          color: rgb(59, 130, 246);
        }
        
        @keyframes brand-pop-in {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); filter: blur(2px); }
          40% { opacity: 1; transform: translateY(-6px) scale(1.03); filter: blur(0); }
          70% { transform: translateY(3px) scale(0.998); }
          100% { transform: translateY(0) scale(1); }
        }
        
        @keyframes agent-pulse {
          0% { opacity: 0; box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 0 12px rgba(147, 51, 234, 0); }
          100% { opacity: 0; box-shadow: 0 0 0 0 rgba(147, 51, 234, 0); }
        }
        
        @keyframes task-pulse {
          0% { opacity: 0; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
          100% { opacity: 0; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .brand-text { animation: none; opacity: 1; transform: none; }
          .agent-cta::before, .task-cta::before { display: none; }
          .agent-cta::after, .task-cta::after { display: none; }
          .agent-cta.pulse-init::before, .task-cta.pulse-init::before { animation: none; }
          .agent-cta:hover, .task-cta:hover { transform: none; }
        }
      `}</style>
    </header>
  )
}
