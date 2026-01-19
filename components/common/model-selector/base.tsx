"use client"

import { PopoverContentAuth } from "@/app/components/chat-input/popover-content-auth"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useKeyShortcut } from "@/app/hooks/use-key-shortcut"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useModel } from "@/lib/model-store/provider"
import { filterAndSortModels, groupModelsByCategory } from "@/lib/model-store/utils"
import { ModelConfig } from "@/lib/models/types"
import { PROVIDERS } from "@/lib/providers"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  StarIcon,
  WarningCircle,
} from "@phosphor-icons/react"
import { useRef, useState, useEffect, useMemo } from "react"
import { ProModelDialog } from "./pro-dialog"
import { SubMenu } from "./sub-menu"

type ModelSelectorProps = {
  selectedModelId: string
  setSelectedModelIdAction: (modelId: string) => void
  className?: string
  isUserAuthenticated?: boolean
  // When set, only show these two models (Profundo mode restriction)
  profundoModels?: { faster: string; smarter: string }
}

export function ModelSelector({
  selectedModelId,
  setSelectedModelIdAction,
  className,
  isUserAuthenticated = true,
  profundoModels,
}: ModelSelectorProps) {
  // 🎯 PROFUNDO MODE: Show simplified two-button selector (mobile-optimized)
  if (profundoModels) {
    const isFaster = selectedModelId === profundoModels.faster
    const isSmarter = selectedModelId === profundoModels.smarter
    
    return (
      <div className={cn(
        // Base container - responsive padding
        "relative flex items-center gap-0.5 rounded-full p-0.5",
        "bg-zinc-900/90 dark:bg-zinc-800/90",
        "border border-zinc-700/50",
        "shadow-sm",
        className
      )}>
        {/* Faster Button */}
        <button
          onClick={() => setSelectedModelIdAction(profundoModels.faster)}
          className={cn(
            // Base styles with mobile-first sizing
            "relative z-10 flex items-center justify-center gap-1",
            "px-2.5 sm:px-3 py-1.5 sm:py-1",
            "min-h-[32px] sm:min-h-0", // Minimum touch target
            "text-[11px] sm:text-xs font-semibold",
            "rounded-full transition-all duration-200",
            "touch-manipulation", // Optimize for touch
            // Active/selected state
            isFaster 
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30" 
              : "text-zinc-400 hover:text-zinc-200 active:scale-95"
          )}
          aria-pressed={isFaster}
        >
          <span className="hidden sm:inline">⚡</span>
          <span>Faster</span>
        </button>

        {/* Smarter Button */}
        <button
          onClick={() => setSelectedModelIdAction(profundoModels.smarter)}
          className={cn(
            // Base styles with mobile-first sizing
            "relative z-10 flex items-center justify-center gap-1",
            "px-2.5 sm:px-3 py-1.5 sm:py-1",
            "min-h-[32px] sm:min-h-0", // Minimum touch target
            "text-[11px] sm:text-xs font-semibold",
            "rounded-full transition-all duration-200",
            "touch-manipulation", // Optimize for touch
            // Active/selected state
            isSmarter 
              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/30" 
              : "text-zinc-400 hover:text-zinc-200 active:scale-95"
          )}
          aria-pressed={isSmarter}
        >
          <span className="hidden sm:inline">🧠</span>
          <span>Smarter</span>
        </button>
      </div>
    )
  }


  const { models, isLoading: isLoadingModels, favoriteModels } = useModel()
  const { isModelHidden } = useUserPreferences()

  const currentModel = models.find((model) => model.id === selectedModelId)
  const currentProvider = PROVIDERS.find(
    (provider) => provider.id === currentModel?.icon
  )
  const isMobile = useBreakpoint(768)
  
  // Prevent hydration mismatch by deferring mobile layout until after mount
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // En modo guest, siempre mostrar el botón completo para evitar hidratación y mejor UX
  // Ahora también para usuarios autenticados para optimizar espacio y consistencia
  const shouldShowFullButton = true

  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isProDialogOpen, setIsProDialogOpen] = useState(false)
  const [selectedProModel, setSelectedProModel] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Ref for input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  useKeyShortcut(
    (e) => (e.key === "p" || e.key === "P") && e.metaKey && e.shiftKey,
    () => {
      if (isMobile) {
        setIsDrawerOpen((prev) => !prev)
      } else {
        setIsDropdownOpen((prev) => !prev)
      }
    }
  )

  const getModelStableKey = (model: ModelConfig) => `${model.icon || "unknown"}::${model.id}`

  const renderModelItem = (model: ModelConfig) => {
    const isLocked = !model.accessible
    const provider = PROVIDERS.find((provider) => provider.id === model.icon)

    return (
      <div
        key={getModelStableKey(model)}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2",
          selectedModelId === model.id && "bg-accent",
          model.uncensored && "border-l-2 border-l-amber-500/50"
        )}
        onClick={() => {
          if (isLocked) {
            setSelectedProModel(model.id)
            setIsProDialogOpen(true)
            return
          }

          setSelectedModelIdAction(model.id)
          if (isMobile) {
            setIsDrawerOpen(false)
          } else {
            setIsDropdownOpen(false)
          }
        }}
      >
        <div className="flex items-center gap-3">
          {provider?.icon && <provider.icon className="size-5" />}
          <div className="flex flex-col gap-0">
            <span className="text-sm">{model.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {model.uncensored && (
            <span className="text-[9px] px-1 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
              18+
            </span>
          )}
          {isLocked && (
            <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
              <StarIcon className="size-2" />
              <span>Locked</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get the hovered model data
  const hoveredModelData = models.find((model) => model.id === hoveredModel)

  const filteredModels = filterAndSortModels(
    models,
    favoriteModels || [],
    searchQuery,
    isModelHidden
  )

  // Ensure unique entries to avoid duplicate keys (some sources may introduce duplicates)
  const dedupedModels = useMemo(() => {
    const seen = new Set<string>()
    const result: ModelConfig[] = []
    for (const m of filteredModels) {
      const k = getModelStableKey(m)
      if (!seen.has(k)) {
        seen.add(k)
        result.push(m)
      }
    }
    return result
  }, [filteredModels])

  // Group models by category for UI sections
  const modelGroups = useMemo(() => {
    return groupModelsByCategory(dedupedModels)
  }, [dedupedModels])

  const trigger = (
    <Button
      variant="outline"
      className={cn(
        "dark:bg-secondary dark:text-gray-100 dark:hover:text-white",
        // Guest users y desktop: botón completo. Mobile autenticado: círculo
        shouldShowFullButton ? "justify-between" : "size-9 p-0 rounded-full flex items-center justify-center",
        className
      )}
      disabled={isLoadingModels}
    >
      <div className={cn("flex items-center gap-2", !shouldShowFullButton && "justify-center w-full")}> 
        {currentProvider?.icon && (
          <currentProvider.icon className={cn(shouldShowFullButton ? "size-5" : "size-6")} />
        )}
        {shouldShowFullButton && <span>{currentModel?.name || "Select model"}</span>}
      </div>
      {shouldShowFullButton && <CaretDownIcon className="size-4 opacity-50" />}
    </Button>
  )

  // Handle input change without losing focus
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSearchQuery(e.target.value)
  }

  // If user is not authenticated, show the auth popover
  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "border-border dark:bg-secondary text-accent-foreground h-9 border bg-transparent justify-between dark:text-gray-100 dark:hover:text-white",
                  className
                )}
                type="button"
              >
                <div className="flex items-center gap-2">
                  {currentProvider?.icon && (
                    <currentProvider.icon className="size-5" />
                  )}
                  <span>{currentModel?.name || "Select model"}</span>
                </div>
                <CaretDownIcon className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Select a model</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    )
  }

  if (isMobile) {
    return (
      <>
        <ProModelDialog
          isOpen={isProDialogOpen}
          setIsOpen={setIsProDialogOpen}
          currentModel={selectedProModel || ""}
        />
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Model</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <MagnifyingGlassIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search models..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-4 pb-6">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Loading models...
                  </p>
                </div>
              ) : modelGroups.length > 0 ? (
                modelGroups.map((group) => (
                  <div key={group.id} className="mb-3">
                    {/* Section header for mobile */}
                    <div className="px-1 py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.label}
                        </span>
                        {group.id === "free" && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                            $0
                          </span>
                        )}
                        {group.id === "uncensored" && (
                          <WarningCircle className="size-3.5 text-amber-500" weight="fill" />
                        )}
                      </div>
                      {group.warning && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 leading-tight">
                          {group.warning}
                        </p>
                      )}
                    </div>
                    {/* Models in this group */}
                    {group.models.map((model) => renderModelItem(model))}
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    No results found.
                  </p>
                  <a
                    href="https://github.com/ibelick/zola/issues/new?title=Model%20Request%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm underline"
                  >
                    Request a new model
                  </a>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <div>
      <ProModelDialog
        isOpen={isProDialogOpen}
        setIsOpen={setIsProDialogOpen}
        currentModel={selectedProModel || ""}
      />
      <Tooltip>
        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={(open) => {
            setIsDropdownOpen(open)
            if (!open) {
              setHoveredModel(null)
              setSearchQuery("")
            } else {
              if (selectedModelId) setHoveredModel(selectedModelId)
            }
          }}
        >
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs leading-snug">
            Cambiar modelo ⌘⇧P<br />Adjuntar archivos promueve automáticamente a Smarter (visión). Texto puro usa Faster.
          </TooltipContent>
          <DropdownMenuContent
            className="flex h-[320px] w-[300px] flex-col space-y-0.5 overflow-visible p-0"
            align="start"
            sideOffset={4}
            forceMount
            side="top"
          >
            <div className="bg-background sticky top-0 z-10 rounded-t-md border-b px-0 pt-0 pb-0">
              <div className="relative">
                <MagnifyingGlassIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search models..."
                  className="dark:bg-popover rounded-b-none border border-none pl-8 shadow-none focus-visible:ring-0"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-1 pt-0 pb-0">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Loading models...
                  </p>
                </div>
              ) : modelGroups.length > 0 ? (
                modelGroups.map((group) => (
                  <div key={group.id} className="mb-1">
                    {/* Section header */}
                    <div className="sticky top-0 bg-popover px-3 py-1.5 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {group.label}
                        </span>
                        {group.id === "free" && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                            $0
                          </span>
                        )}
                        {group.id === "uncensored" && (
                          <WarningCircle className="size-3.5 text-amber-500" weight="fill" />
                        )}
                      </div>
                      {group.warning && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">
                          {group.warning}
                        </p>
                      )}
                    </div>
                    {/* Models in this group */}
                    {group.models.map((model) => {
                      const isLocked = !model.accessible
                      const provider = PROVIDERS.find(
                        (provider) => provider.id === model.icon
                      )

                      return (
                        <DropdownMenuItem
                          key={getModelStableKey(model)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2",
                            selectedModelId === model.id && "bg-accent",
                            model.uncensored && "border-l-2 border-l-amber-500/50"
                          )}
                          onSelect={() => {
                            if (isLocked) {
                              setSelectedProModel(model.id)
                              setIsProDialogOpen(true)
                              return
                            }

                            setSelectedModelIdAction(model.id)
                            setIsDropdownOpen(false)
                          }}
                          onFocus={() => {
                            if (isDropdownOpen) {
                              setHoveredModel(model.id)
                            }
                          }}
                          onMouseEnter={() => {
                            if (isDropdownOpen) {
                              setHoveredModel(model.id)
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {provider?.icon && <provider.icon className="size-5" />}
                            <div className="flex flex-col gap-0">
                              <span className="text-sm">{model.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {model.uncensored && (
                              <span className="text-[9px] px-1 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
                                18+
                              </span>
                            )}
                            {isLocked && (
                              <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                                <span>Locked</span>
                              </div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-1 text-sm">
                    No results found.
                  </p>
                  <a
                    href="https://github.com/ibelick/zola/issues/new?title=Model%20Request%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm underline"
                  >
                    Request a new model
                  </a>
                </div>
              )}
            </div>

            {/* Submenu positioned absolutely */}
            {hoveredModelData && (
              <div className="absolute top-0 left-[calc(100%+8px)]">
                <SubMenu hoveredModelData={hoveredModelData} />
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </div>
  )
}
