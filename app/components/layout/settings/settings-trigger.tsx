"use client"

import { useCallback, useEffect, useRef } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { GearSix } from "@phosphor-icons/react"
import { useSettingsStore, type SettingsTab } from "@/lib/settings/store"

type SettingsTriggerProps = {
  onOpenChangeAction?: (open: boolean) => void
  /**
   * When true, renders a DropdownMenuItem as the trigger (must be used inside a DropdownMenu).
   * When false (default), renders a Button so it can be placed anywhere (e.g., top nav).
   */
  withinDropdown?: boolean
  targetTab?: SettingsTab
}

export function SettingsTrigger({
  onOpenChangeAction,
  withinDropdown = false,
  targetTab,
}: SettingsTriggerProps) {
  const openSettings = useSettingsStore((state) => state.openSettings)
  const isOpen = useSettingsStore((state) => state.isOpen)

  const lastIsOpen = useRef<boolean>(isOpen)

  useEffect(() => {
    if (lastIsOpen.current !== isOpen) {
      onOpenChangeAction?.(isOpen)
      lastIsOpen.current = isOpen
    }
  }, [isOpen, onOpenChangeAction])

  const handleTrigger = useCallback(() => {
    openSettings(targetTab)
  }, [openSettings, targetTab])

  if (withinDropdown) {
    return (
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault()
          handleTrigger()
        }}
      >
        <GearSix className="size-4" />
        <span>Settings</span>
      </DropdownMenuItem>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-slate-300 hover:text-white inline-flex items-center gap-2"
      onClick={handleTrigger}
    >
      <GearSix className="size-4" />
      <span className="hidden sm:inline">Settings</span>
    </Button>
  )
}
