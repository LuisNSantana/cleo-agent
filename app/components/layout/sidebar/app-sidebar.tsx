"use client"

import { groupChatsByDate } from "@/app/components/history/utils"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import {
  ChatTeardropText,
  GithubLogo,
  MagnifyingGlass,
  NotePencilIcon,
  X,
} from "@phosphor-icons/react"
import { useParams, usePathname } from "next/navigation"
import { useMemo, useCallback, useState } from "react"
import { HistoryTrigger } from "../../history/history-trigger"
import { SidebarList } from "./sidebar-list"
import { SidebarProject } from "./sidebar-project"
import Link from "next/link"
import { ThemeToggle } from "@/app/components/layout/theme-toggle"
import { DialogCreateAgent } from './dialog-create-agent'
import { PlusCircle } from '@phosphor-icons/react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  House as HouseIcon,
  Sparkle as AgentsIcon,
  ListChecks as TasksIcon,
  ChartLine as DashboardIcon,
  Plugs as IntegrationsIcon,
  Folder as Folders,
  MaskHappy as MaskHappyIcon,
  CreditCard as CreditsIcon,
  BookOpen as BookOpenIcon,
} from "@phosphor-icons/react"
import { useSettingsStore, type SettingsTab } from "@/lib/settings/store"
import { SidebarVoiceButton } from "@/app/components/voice/sidebar-voice-button"
import { useI18n } from "@/lib/i18n"

export function AppSidebar() {
  const isMobile = useBreakpoint(768)
  const { setOpenMobile } = useSidebar()
  const { chats, isLoading } = useChats()
  const { resetMessages } = useMessages()
  const params = useParams<{ chatId: string }>()
  const currentChatId = params.chatId
  const pathname = usePathname()
  const openSettings = useSettingsStore((state) => state.openSettings)
  const { t } = useI18n()

  const groupedChats = useMemo(() => {
    const result = groupChatsByDate(chats, "", {
      today: t.time.today,
      last7Days: t.time.last7Days,
      last30Days: t.time.last30Days,
      thisYear: t.time.thisYear,
    })
    return result
  }, [chats, t.time])
  const hasChats = chats.length > 0

  const handleOpenSettings = useCallback(
    (tab?: SettingsTab) => {
      openSettings(tab)
      if (isMobile) {
        setOpenMobile(false)
      }
    },
    [openSettings, isMobile, setOpenMobile]
  )

  // Section 1: Platform (Core Navigation)
  const platformNav = useMemo(() => [
    { href: "/", label: t.sidebar.home, icon: HouseIcon, iconWeight: "duotone" as const },
    { href: "/dashboard", label: t.sidebar.dashboard, icon: DashboardIcon, iconWeight: "duotone" as const },
  ], [t.sidebar])

  // Section 2: Workspace (Tools & Agents)
  const workspaceNav = useMemo(() => [
    { href: "/agents/manage", label: t.sidebar.agents, icon: AgentsIcon, iconWeight: "duotone" as const },
    { href: "/agents/tasks", label: t.sidebar.tasks, icon: TasksIcon, iconWeight: "duotone" as const },
  ], [t.sidebar])

  // Section 3: Resources (Integrations & Library)
  const resourcesNav = useMemo(() => [
    { href: "/integrations", label: t.sidebar.integrations, icon: IntegrationsIcon, iconWeight: "duotone" as const },
    { href: "/prompts-library", label: t.sidebar.promptLibrary, icon: BookOpenIcon, iconWeight: "duotone" as const },
    { 
      id: "files", 
      label: t.sidebar.files, 
      icon: Folders, 
      iconWeight: "duotone" as const,
      action: () => handleOpenSettings("files")
    },
  ], [t.sidebar, handleOpenSettings])

  // Section 4: Settings (Account & Personality)
  const settingsNav = useMemo(() => [
    { href: "/account", label: "Credits", icon: CreditsIcon, iconWeight: "duotone" as const },
    { 
      id: "personality", 
      label: t.sidebar.personality, 
      icon: MaskHappyIcon, 
      iconWeight: "duotone" as const,
      action: () => handleOpenSettings("personality")
    },
  ], [t.sidebar, handleOpenSettings])

  const renderNavItem = (item: any) => {
    const isActive = item.href === "/" 
      ? pathname === "/" 
      : item.href && (pathname === item.href || pathname.startsWith(item.href + "/"))

    if (item.action) {
      return (
        <SidebarMenuItem key={item.id || item.label}>
          <SidebarMenuButton 
            tooltip={item.label}
            onClick={item.action}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-3 w-full">
              <item.icon className="size-[18px]" weight={item.iconWeight} />
              <span className="text-[13.5px] font-medium">{item.label}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton 
          asChild
          isActive={isActive} 
          tooltip={item.label}
          className="text-muted-foreground hover:text-foreground data-[active=true]:text-foreground data-[active=true]:bg-sidebar-accent/50 transition-all duration-200"
        >
          <Link
            href={item.href}
            prefetch
            className="flex items-center w-full group/nav-item"
            onClick={() => {
              if (item.href === "/") resetMessages()
              if (isMobile) setOpenMobile(false)
            }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="size-[18px]" weight={item.iconWeight} />
              <span className="text-[13.5px] font-medium">{item.label}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar" className="border-none">
      <SidebarHeader className="h-14 pl-3">
        <div className="flex justify-between">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 items-center justify-center radius-md bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <X size={24} />
            </button>
          ) : (
            <div className="h-full" />
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="mask-t-from-98% mask-t-to-100% mask-b-from-98% mask-b-to-100% px-3">
        <ScrollArea className="flex h-full [&>div>div]:!block">
          
          {/* Platform Section */}
          <SidebarGroup className="mb-2">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50 mb-1 px-2">Platform</SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {platformNav.map(renderNavItem)}
              <SidebarMenuItem>
                <CreateAgentMenuItem
                  isMobile={isMobile}
                  closeSidebar={() => setOpenMobile(false)}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Workspace Section */}
          <SidebarGroup className="mb-2">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50 mb-1 px-2">Workspace</SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {workspaceNav.map(renderNavItem)}
            </SidebarMenu>
            <div className="mt-2">
               <SidebarProject />
            </div>
          </SidebarGroup>

          {/* Resources Section */}
          <SidebarGroup className="mb-2">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50 mb-1 px-2">Resources</SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {resourcesNav.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>

          {/* Settings Section */}
          <SidebarGroup className="mb-2">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50 mb-1 px-2">Settings</SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {settingsNav.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator className="my-4 bg-gradient-to-r from-transparent via-border/30 to-transparent" />

          {/* Chat History Section */}
          <div className="mb-6 flex w-full flex-col items-start gap-1">
            <Link
              href="/"
              className="hover:bg-muted/80 hover:text-foreground text-foreground group/new-chat relative inline-flex w-full items-center radius-md bg-transparent px-3 py-2.5 text-[13.5px] transition-all duration-200 hover:translate-x-0.5"
              prefetch
              onClick={() => {
                resetMessages()
                if (isMobile) {
                  setOpenMobile(false)
                }
              }}
            >
              <div className="flex items-center gap-3">
                <NotePencilIcon size={18} weight="duotone" />
                <span className="font-medium">{t.sidebar.newChat}</span>
              </div>
              <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/new-chat:opacity-100">
                ⌘⇧U
              </div>
            </Link>
            <HistoryTrigger
              hasSidebar={false}
              classNameTrigger="bg-transparent hover:bg-muted/80 hover:text-foreground text-foreground relative inline-flex w-full items-center radius-md px-3 py-2.5 text-[13.5px] transition-all duration-200 hover:translate-x-0.5 group/search"
              icon={<MagnifyingGlass size={18} weight="duotone" className="mr-3" />}
              label={
                <div className="flex w-full items-center gap-3">
                  <span className="font-medium">{t.sidebar.search}</span>
                  <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/search:opacity-100">
                    ⌘+K
                  </div>
                </div>
              }
              hasPopover={false}
            />
          </div>

          {isLoading ? (
            <div className="h-full" />
          ) : hasChats ? (
            <div className="space-y-5">
              {groupedChats?.map((group) => (
                <SidebarList
                  key={group.name}
                  title={group.name}
                  items={group.chats}
                  currentChatId={currentChatId}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center">
              <ChatTeardropText
                size={24}
                className="text-muted-foreground mb-1 opacity-40"
              />
              <div className="text-muted-foreground text-center">
                <p className="mb-1 text-base font-medium">No chats yet</p>
                <p className="text-sm opacity-70">Start a new conversation</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="mb-2 p-3">
        {/* Theme toggle inside sidebar for quick access */}
        <div className="mb-2">
          <ThemeToggle />
        </div>
        {/* Huminary Labs brand (subtle, premium avatar style) */}
        <div className="mb-2 flex items-center gap-1.5 rounded-md p-2">
          <span className="inline-flex size-6 items-center justify-center rounded-full border border-border/40 bg-background/60 backdrop-blur-sm">
            <img
              src="/img/logo_huminarylabs.png"
              alt="Huminary Labs"
              className="h-3 w-3 opacity-80"
              loading="lazy"
              aria-hidden="true"
            />
          </span>
          <span className="text-sidebar-foreground/70 text-xs">Huminary Labs</span>
        </div>
        {/* GitHub callout temporarily commented out per design request
        <a
          href="https://github.com/ibelick/zola"
          className="hover:bg-muted flex items-center gap-2 radius-md p-2"
          target="_blank"
          aria-label="Star the repo on GitHub"
        >
          <div className="rounded-full border p-1">
            <GithubLogo className="size-4" />
          </div>
          <div className="flex flex-col">
            <div className="text-sidebar-foreground text-sm font-medium">
              Ankie by Huminary Labs
            </div>
            <div className="text-sidebar-foreground/70 text-xs">
              Star the repo on GitHub!
            </div>
          </div>
        </a>
        */}
        
        {/* Legal Links */}
        <div className="flex items-center justify-center gap-3 pt-2 text-xs text-muted-foreground border-t border-border/40 mt-2">
          <a 
            href="/privacy" 
            className="hover:text-foreground transition-colors underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          <span className="text-muted-foreground/40">·</span>
          <a 
            href="/terms" 
            className="hover:text-foreground transition-colors underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Service
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function CreateAgentMenuItem({ isMobile, closeSidebar }: { isMobile: boolean; closeSidebar: () => void }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  
  const handleOpenDialog = () => {
    // IMPORTANT: Open dialog first, then close sidebar with delay
    // This prevents the dialog from being unmounted on mobile
    setOpen(true)
    if (isMobile) {
      // Use requestAnimationFrame + timeout to ensure dialog mounts before sidebar closes
      requestAnimationFrame(() => {
        setTimeout(closeSidebar, 150)
      })
    }
  }
  
  return (
    <>
      <SidebarMenuButton 
        tooltip={t.sidebar.newAgent}
        onClick={handleOpenDialog}
      >
        <div className="flex items-center gap-3 w-full relative">
          <PlusCircle className="size-[18px]" weight="duotone" />
          <span className="text-[13.5px]">{t.sidebar.newAgent}</span>
          {/* Subtle floating badge with shimmer effect */}
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 relative overflow-hidden">
            {t.badges.new}
            {/* Shimmer overlay */}
            <span 
              className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{
                animation: 'shimmer 3s ease-in-out infinite'
              }}
            />
          </span>
        </div>
      </SidebarMenuButton>
      <DialogCreateAgent isOpen={open} setIsOpenAction={setOpen} />
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
