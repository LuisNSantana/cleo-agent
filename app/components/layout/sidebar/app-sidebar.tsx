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
import { useMemo, useCallback } from "react"
import { HistoryTrigger } from "../../history/history-trigger"
import { SidebarList } from "./sidebar-list"
import { SidebarProject } from "./sidebar-project"
import Link from "next/link"
import { ThemeToggle } from "@/app/components/layout/theme-toggle"
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
  BookOpen as DocsIcon,
  ChartLine as DashboardIcon,
  Plugs as IntegrationsIcon,
  Folder as Folders,
  MaskHappy as MaskHappyIcon,
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

  const quickActions = useMemo(() => [
    {
      id: "settings-files",
      label: t.sidebar.files,
      description: "Upload, organize, and share documents with your agents.",
      icon: Folders,
      action: () => handleOpenSettings("files"),
    },
  ], [handleOpenSettings, t.sidebar.files])

  // OPTIMIZED: Grok-style navigation - cleaner without excessive badges
  const primaryNav = useMemo(() => [
    { href: "/", label: t.sidebar.home, icon: HouseIcon, iconWeight: "duotone" as const },
    { href: "/agents/manage", label: t.sidebar.agents, icon: AgentsIcon, iconWeight: "duotone" as const },
    { href: "/agents/tasks", label: t.sidebar.tasks, icon: TasksIcon, iconWeight: "duotone" as const },
    { href: "/integrations", label: t.sidebar.integrations, icon: IntegrationsIcon, iconWeight: "duotone" as const },
    { href: "/dashboard", label: t.sidebar.dashboard, icon: DashboardIcon, iconWeight: "duotone" as const },
    { href: "/docs", label: t.sidebar.docs, icon: DocsIcon, iconWeight: "duotone" as const },
  ], [t.sidebar])

  // Personality navigation item (opens settings with personality tab)
  const personalityAction = useMemo(() => ({
    label: t.sidebar.personality,
    icon: MaskHappyIcon,
    iconWeight: "duotone" as const,
    action: () => handleOpenSettings("personality"),
  }), [handleOpenSettings, t.sidebar.personality])

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
          {/* Primary minimal navigation */}
          <SidebarGroup className="mb-1">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 tracking-wide mb-2">Navigation</SidebarGroupLabel>
            <SidebarMenu className="space-y-1">
              {primaryNav.map(({ href, label, icon: Icon, iconWeight }) => {
                const isActive = href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(href + "/")
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive} 
                      tooltip={label}
                    >
                      <Link
                        href={href}
                        prefetch
                        className="flex items-center w-full group/nav-item transition-all duration-200 hover:translate-x-0.5"
                        onClick={() => {
                          // Reset messages when clicking Home
                          if (href === "/") {
                            resetMessages()
                          }
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="size-[18px]" weight={iconWeight} />
                          <span className="text-[13.5px]">{label}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
          
          {/* Personality quick access */}
          <SidebarGroup className="mb-1">
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Customize Cleo's personality"
                  onClick={() => {
                    personalityAction.action()
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <personalityAction.icon className="size-[18px]" weight={personalityAction.iconWeight} />
                    <span className="text-[13.5px]">{personalityAction.label}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          
          <SidebarSeparator className="my-5 bg-gradient-to-r from-transparent via-border/30 to-transparent" />

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
            <SidebarVoiceButton />
          </div>
          {/* OPTIMIZED: Quick links removed for Grok-style minimal sidebar */}
          <SidebarProject />
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
              Cleo by Huminary Labs
            </div>
            <div className="text-sidebar-foreground/70 text-xs">
              Star the repo on GitHub!
            </div>
          </div>
        </a>
        
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
