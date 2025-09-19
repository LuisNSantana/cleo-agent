"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { GearSix } from "@phosphor-icons/react"
import type React from "react"
import { useState } from "react"
import { SettingsContent } from "./settings-content"

type SettingsTriggerProps = {
  onOpenChangeAction: (open: boolean) => void
  /**
   * When true, renders a DropdownMenuItem as the trigger (must be used inside a DropdownMenu).
   * When false (default), renders a Button so it can be placed anywhere (e.g., top nav).
   */
  withinDropdown?: boolean
}

export function SettingsTrigger({ onOpenChangeAction, withinDropdown = false }: SettingsTriggerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useBreakpoint(768)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    onOpenChangeAction(isOpen)
  }

  const trigger = withinDropdown ? (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <GearSix className="size-4" />
      <span>Settings</span>
    </DropdownMenuItem>
  ) : (
    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white inline-flex items-center gap-2">
      <GearSix className="size-4" />
      <span className="hidden sm:inline">Settings</span>
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex h-[80dvh] min-h-[480px] w-full flex-col gap-0 p-0 sm:max-w-[768px]">
        <DialogHeader className="border-border border-b px-6 py-5">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsContent />
      </DialogContent>
    </Dialog>
  )
}
