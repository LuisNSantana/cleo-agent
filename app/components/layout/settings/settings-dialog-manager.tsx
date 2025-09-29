"use client"

import { useCallback } from "react"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { useSettingsStore } from "@/lib/settings/store"
import { SettingsContent } from "./settings-content"

export function SettingsDialogManager() {
  const isMobile = useBreakpoint(768)
  const isOpen = useSettingsStore((state) => state.isOpen)
  const closeSettings = useSettingsStore((state) => state.closeSettings)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeSettings()
      }
    },
    [closeSettings]
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Settings</DrawerTitle>
          </DrawerHeader>
          <SettingsContent isDrawer />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[80dvh] min-h-[480px] w-full flex-col gap-0 p-0 sm:max-w-[768px]">
        <DialogHeader className="border-border border-b px-6 py-5">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsContent />
      </DialogContent>
    </Dialog>
  )
}
