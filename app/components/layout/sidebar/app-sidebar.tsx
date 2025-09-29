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
  TreeStructure as AgentsIcon,
  CheckSquare as TasksIcon,
  FileText as DocsIcon,
  ChartBar as DashboardIcon,
  Plugs as IntegrationsIcon,
  Folders,
} from "@phosphor-icons/react"
import { useSettingsStore, type SettingsTab } from "@/lib/settings/store"

export function AppSidebar() {
  const isMobile = useBreakpoint(768)
  const { setOpenMobile } = useSidebar()
  const { chats, isLoading } = useChats()
  const params = useParams<{ chatId: string }>()
  const currentChatId = params.chatId
  const pathname = usePathname()
  const openSettings = useSettingsStore((state) => state.openSettings)

  const groupedChats = useMemo(() => {
    const result = groupChatsByDate(chats, "")
    return result
  }, [chats])
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
      label: "Files",
      description: "Upload, organize, and share documents with your agents.",
      icon: Folders,
      action: () => handleOpenSettings("files"),
    },
  ], [handleOpenSettings])

  const primaryNav = [
    { href: "/", label: "Home", icon: HouseIcon },
    { href: "/agents/manage", label: "Agents", icon: AgentsIcon, badge: "New" },
    { href: "/agents/tasks", label: "Tasks", icon: TasksIcon, badge: "New" },
    { href: "/integrations", label: "Integrations", icon: IntegrationsIcon, badge: "New" },
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
    { href: "/docs", label: "Docs", icon: DocsIcon },
  ]

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
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground/80">Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {primaryNav.map(({ href, label, icon: Icon, badge }) => {
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
                        className="flex items-center justify-between w-full"
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-4" />
                          <span>{label}</span>
                        </div>
                        {badge && (
                          <span className="ml-auto px-1 py-px text-[7px] font-medium bg-foreground/6 text-foreground/50 rounded-[2px] tracking-wide">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarSeparator />

          <div className="mt-3 mb-5 flex w-full flex-col items-start gap-0">
            <Link
              href="/"
              className="hover:bg-muted/80 hover:text-foreground text-foreground group/new-chat relative inline-flex w-full items-center radius-md bg-transparent px-2 py-2 text-sm transition-colors"
              prefetch
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false)
                }
              }}
            >
              <div className="flex items-center gap-2">
                <NotePencilIcon size={20} />
                New Chat
              </div>
              <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/new-chat:opacity-100">
                ⌘⇧U
              </div>
            </Link>
            <HistoryTrigger
              hasSidebar={false}
              classNameTrigger="bg-transparent hover:bg-muted/80 hover:text-foreground text-foreground relative inline-flex w-full items-center radius-md px-2 py-2 text-sm transition-colors group/search"
              icon={<MagnifyingGlass size={24} className="mr-2" />}
              label={
                <div className="flex w-full items-center gap-2">
                  <span>Search</span>
                  <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/search:opacity-100">
                    ⌘+K
                  </div>
                </div>
              }
              hasPopover={false}
            />
          </div>
          {quickActions.length > 0 && (
            <SidebarGroup className="mb-5">
              <SidebarGroupLabel className="text-xs text-muted-foreground/80">Quick links</SidebarGroupLabel>
              <div className="mt-2 space-y-2">
                {quickActions.map(({ id, label, description, icon: Icon, action }) => (
                  <Button
                    key={id}
                    type="button"
                    variant="ghost"
                    onClick={action}
                    className="h-auto w-full justify-start rounded-lg border border-border/40 bg-background/60 px-3 py-3 text-left transition hover:bg-background"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">
                      {description}
                    </p>
                  </Button>
                ))}
              </div>
            </SidebarGroup>
          )}
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
      </SidebarFooter>
    </Sidebar>
  )
}
