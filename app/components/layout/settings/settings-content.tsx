"use client"

import { Button } from "@/components/ui/button"
import { DrawerClose } from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { cn, isDev } from "@/lib/utils"
import {
  CubeIcon,
  GearSixIcon,
  PaintBrushIcon,
  PlugsConnectedIcon,
  FileTextIcon,
  XIcon,
  ChartLineUpIcon,
  ArrowSquareOutIcon,
  UsersIcon,
  MaskHappy as MaskHappyIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useCallback } from "react"

import { InteractionPreferences } from "./appearance/interaction-preferences"
import { LayoutSettings } from "./appearance/layout-settings"
import { ThemeSelection } from "./appearance/theme-selection"
import { ConnectionsPlaceholder } from "./connections/connections-placeholder"
import { ServiceConnections } from "./connections/service-connections"
import { FilesSection } from "./files/files-section"
// import { DeveloperTools } from "./connections/developer-tools" // Disabled for now
// import { OllamaSection } from "./connections/ollama-section" // Disabled for now
import { AccountManagement } from "./general/account-management"
import { UserProfile } from "./general/user-profile"
import { NotificationsSettings } from "./general/notifications-settings"
import { SimpleModelsInfo } from "./models/simple-models-info"
import { CleoPersonalitySettings } from "./models/cleo-personality-settings"
import { useSettingsStore } from "@/lib/settings/store"
import type { SettingsTab } from "@/lib/settings/store"

type SettingsContentProps = {
  isDrawer?: boolean
}

export function SettingsContent({
  isDrawer = false,
}: SettingsContentProps) {
  const activeTab = useSettingsStore((state) => state.activeTab)
  const setActiveTab = useSettingsStore((state) => state.setActiveTab)

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as SettingsTab)
    },
    [setActiveTab]
  )

  return (
    <div
      className={cn(
  "flex w-full flex-col overflow-y-auto overflow-x-hidden",
        isDrawer ? "p-0 pb-16" : "py-0"
      )}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2">
          <h2 className="text-lg font-medium">Settings</h2>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <XIcon className="size-4" />
            </Button>
          </DrawerClose>
        </div>
      )}

  <Tabs
    value={activeTab}
    onValueChange={handleTabChange}
        className={cn(
      "flex w-full max-w-full flex-row overflow-x-hidden",
          isDrawer ? "" : "flex min-h-[400px]"
        )}
      >
        {isDrawer ? (
          // Mobile version - tabs on top
          // Allow vertical scrolling inside the drawer and enable smooth touch scrolling on mobile
          <div className="w-full items-start justify-start overflow-y-auto overflow-x-hidden py-4 touch-auto -webkit-overflow-scrolling:touch">
            <div>
              <TabsList className="mb-4 flex w-full min-w-0 flex-nowrap items-center justify-start overflow-x-auto bg-transparent px-0">
                <TabsTrigger
                  value="general"
                  className="ml-6 flex shrink-0 items-center gap-2"
                >
                  <GearSixIcon className="size-4" />
                  <span>General</span>
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="flex shrink-0 items-center gap-2"
                >
                  <ChartLineUpIcon className="size-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="flex shrink-0 items-center gap-2"
                >
                  <PaintBrushIcon className="size-4" />
                  <span>Appearance</span>
                </TabsTrigger>
                
                <TabsTrigger
                  value="personality"
                  className="flex shrink-0 items-center gap-2"
                >
                  <MaskHappyIcon className="size-4" />
                  <span>Personality</span>
                </TabsTrigger>

                <TabsTrigger
                  value="models"
                  className="flex shrink-0 items-center gap-2"
                >
                  <CubeIcon className="size-4" />
                  <span>AI Models</span>
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="flex shrink-0 items-center gap-2"
                >
                  <PlugsConnectedIcon className="size-4" />
                  <span>Connections</span>
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="flex shrink-0 items-center gap-2"
                >
                  <FileTextIcon className="size-4" />
                  <span>Files</span>
                </TabsTrigger>
                <TabsTrigger
                  value="agents"
                  className="flex shrink-0 items-center gap-2"
                >
                  <UsersIcon className="size-4" />
                  <span>Agentes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="docs"
                  className="flex shrink-0 items-center gap-2"
                >
                  <FileTextIcon className="size-4" />
                  <span>Docs</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Mobile tabs content */}
            <TabsContent value="general" className="space-y-6 px-6 overflow-y-auto">
              <UserProfile />
              <NotificationsSettings />
              {isSupabaseEnabled && (
                <>
                  <AccountManagement />
                </>
              )}
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-6 px-6 overflow-y-auto">
              <div className="text-sm text-muted-foreground">
                The analytics dashboard lives in a dedicated page due to the amount of information.
              </div>
              <div>
                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                  <ChartLineUpIcon className="size-4" />
                  Open Dashboard
                  <ArrowSquareOutIcon className="size-4" />
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6 px-6 overflow-y-auto">
              <ThemeSelection />
              <LayoutSettings />
              <InteractionPreferences />
            </TabsContent>
            
            <TabsContent value="personality" className="space-y-6 px-6 overflow-y-auto">
              <CleoPersonalitySettings />
            </TabsContent>

            <TabsContent value="models" className="px-6 overflow-y-auto">
              <SimpleModelsInfo />
            </TabsContent>

            <TabsContent value="connections" className="space-y-6 px-6 overflow-y-auto">
              <ServiceConnections />
              {/* {isDev && <OllamaSection />} */} {/* Disabled for now */}
              {/* {isDev && <DeveloperTools />} */} {/* Disabled for now */}
            </TabsContent>
            <TabsContent value="files" className="space-y-6 px-6 overflow-y-auto">
              <FilesSection />
            </TabsContent>
            <TabsContent value="agents" className="space-y-6 px-6 overflow-y-auto">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UsersIcon className="size-16 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sistema Multi-Agente</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Visualiza y gestiona la arquitectura de LangChain/LangGraph con nuestros agentes especializados
                </p>
                <Link href="/agents">
                  <Button className="flex items-center gap-2">
                    <UsersIcon className="size-4" />
                    Ir al Sistema de Agentes
                  </Button>
                </Link>
              </div>
            </TabsContent>
            <TabsContent value="docs" className="space-y-6 px-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link href="/docs#getting-started" className="rounded-lg border p-4 hover:bg-accent/40">
                  <h4 className="font-medium">Inicio</h4>
                  <p className="text-muted-foreground text-sm">Conceptos clave y tour rápido</p>
                </Link>
                <Link href="/docs#agents" className="rounded-lg border p-4 hover:bg-accent/40">
                  <h4 className="font-medium">Control de Agentes</h4>
                  <p className="text-muted-foreground text-sm">Cómo funcionan y cómo gestionarlos</p>
                </Link>
                <Link href="/docs#tasks" className="rounded-lg border p-4 hover:bg-accent/40">
                  <h4 className="font-medium">Crear Tareas</h4>
                  <p className="text-muted-foreground text-sm">Flujos de trabajo y seguimiento</p>
                </Link>
                <Link href="/docs#build-agents" className="rounded-lg border p-4 hover:bg-accent/40">
                  <h4 className="font-medium">Crear Agentes</h4>
                  <p className="text-muted-foreground text-sm">Perfiles, capacidades y herramientas</p>
                </Link>
                <Link href="/docs#pwa" className="rounded-lg border p-4 hover:bg-accent/40">
                  <h4 className="font-medium">PWA & Notificaciones</h4>
                  <p className="text-muted-foreground text-sm">Instalación y push en tiempo real</p>
                </Link>
                <Link href="/docs#dashboard" className="rounded-lg border p-4 hover:bg-accent/40">
                  <h4 className="font-medium">Dashboard</h4>
                  <p className="text-muted-foreground text-sm">Métricas, rendimiento y actividad</p>
                </Link>
              </div>
            </TabsContent>
          </div>
        ) : (
          // Desktop version - tabs on left
          <>
            <TabsList className="block w-48 min-w-48 rounded-none bg-transparent px-3 pt-4">
              <div className="flex w-full flex-col gap-1">
                <TabsTrigger
                  value="general"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <GearSixIcon className="size-4" />
                    <span>General</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="dashboard"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <ChartLineUpIcon className="size-4" />
                    <span>Dashboard</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="appearance"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <PaintBrushIcon className="size-4" />
                    <span>Appearance</span>
                  </div>
                </TabsTrigger>
                
                <TabsTrigger
                  value="personality"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <MaskHappyIcon className="size-4" />
                    <span>Personality</span>
                  </div>
                </TabsTrigger>

                <TabsTrigger
                  value="models"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <CubeIcon className="size-4" />
                    <span>AI Models</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <PlugsConnectedIcon className="size-4" />
                    <span>Connections</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="size-4" />
                    <span>Files</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="agents"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <UsersIcon className="size-4" />
                    <span>Agentes</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="docs"
                  className="w-full justify-start rounded-md px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="size-4" />
                    <span>Docs</span>
                  </div>
                </TabsTrigger>
              </div>
            </TabsList>

            {/* Desktop tabs content */}
            <div className="flex-1 px-6 pt-4 min-w-0">
              <div className="mx-auto max-w-4xl min-w-0">
              <TabsContent value="general" className="mt-0 space-y-6">
                <UserProfile />
                <NotificationsSettings />
                {isSupabaseEnabled && (
                  <>
                    <AccountManagement />
                  </>
                )}
              </TabsContent>

              <TabsContent value="dashboard" className="mt-0 space-y-6">
                <div className="text-sm text-muted-foreground">
                  The Dashboard lives on a separate page for a better experience.
                </div>
                <div>
                  <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    <ChartLineUpIcon className="size-4" />
                    Open Dashboard
                    <ArrowSquareOutIcon className="size-4" />
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="mt-0 space-y-6">
                <ThemeSelection />
                <LayoutSettings />
                <InteractionPreferences />
              </TabsContent>
              
              <TabsContent value="personality" className="mt-0 space-y-6 overflow-x-hidden">
                <CleoPersonalitySettings />
              </TabsContent>

              <TabsContent value="models" className="mt-0 space-y-6 overflow-x-hidden">
                <SimpleModelsInfo />
              </TabsContent>

              <TabsContent value="connections" className="mt-0 space-y-6">
                <ServiceConnections />
                {/* {isDev && <OllamaSection />} */} {/* Disabled for now */}
                {/* {isDev && <DeveloperTools />} */} {/* Disabled for now */}
              </TabsContent>
              <TabsContent value="files" className="mt-0 space-y-6">
                <FilesSection />
              </TabsContent>
              <TabsContent value="agents" className="mt-0 space-y-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UsersIcon className="size-16 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Sistema Multi-Agente</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Visualiza y gestiona la arquitectura de LangChain/LangGraph con nuestros agentes especializados
                  </p>
                  <Link href="/agents">
                    <Button className="flex items-center gap-2">
                      <UsersIcon className="size-4" />
                      Ir al Sistema de Agentes
                    </Button>
                  </Link>
                </div>
              </TabsContent>
              <TabsContent value="docs" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Link href="/docs#getting-started" className="rounded-lg border p-4 hover:bg-accent/40">
                    <h4 className="font-medium">Inicio</h4>
                    <p className="text-muted-foreground text-sm">Conceptos clave y tour rápido</p>
                  </Link>
                  <Link href="/docs#agents" className="rounded-lg border p-4 hover:bg-accent/40">
                    <h4 className="font-medium">Control de Agentes</h4>
                    <p className="text-muted-foreground text-sm">Cómo funcionan y cómo gestionarlos</p>
                  </Link>
                  <Link href="/docs#tasks" className="rounded-lg border p-4 hover:bg-accent/40">
                    <h4 className="font-medium">Crear Tareas</h4>
                    <p className="text-muted-foreground text-sm">Flujos de trabajo y seguimiento</p>
                  </Link>
                  <Link href="/docs#build-agents" className="rounded-lg border p-4 hover:bg-accent/40">
                    <h4 className="font-medium">Crear Agentes</h4>
                    <p className="text-muted-foreground text-sm">Perfiles, capacidades y herramientas</p>
                  </Link>
                  <Link href="/docs#pwa" className="rounded-lg border p-4 hover:bg-accent/40">
                    <h4 className="font-medium">PWA & Notificaciones</h4>
                    <p className="text-muted-foreground text-sm">Instalación y push en tiempo real</p>
                  </Link>
                  <Link href="/docs#dashboard" className="rounded-lg border p-4 hover:bg-accent/40">
                    <h4 className="font-medium">Dashboard</h4>
                    <p className="text-muted-foreground text-sm">Métricas, rendimiento y actividad</p>
                  </Link>
                </div>
              </TabsContent>
              </div>
            </div>
          </>
        )}
      </Tabs>
    </div>
  )
}
