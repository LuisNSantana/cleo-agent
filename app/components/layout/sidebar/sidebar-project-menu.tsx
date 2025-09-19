"use client"

import { DialogDeleteProject } from "@/app/components/layout/sidebar/dialog-delete-project"
import { DialogProjectColor } from "@/app/components/layout/sidebar/dialog-project-color"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThree, PencilSimple, Trash, Palette } from "@phosphor-icons/react"
import { useState } from "react"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
  color?: string | null
  description?: string | null
  notes?: string | null
}

type SidebarProjectMenuProps = {
  project: Project
  onStartEditingAction: () => void
  onMenuOpenChangeAction?: (open: boolean) => void
}

export function SidebarProjectMenu({
  project,
  onStartEditingAction,
  onMenuOpenChangeAction,
}: SidebarProjectMenuProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false)
  const isMobile = useBreakpoint(768)

  return (
    <>
      <DropdownMenu
        // shadcn/ui / radix pointer-events-none issue
        modal={isMobile ? true : false}
        onOpenChange={onMenuOpenChangeAction}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="hover:bg-secondary flex size-7 items-center justify-center rounded-md p-1 transition-colors duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsThree size={18} className="text-primary" weight="bold" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onStartEditingAction()
            }}
          >
            <PencilSimple size={16} className="mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsColorDialogOpen(true)
            }}
          >
            <Palette size={16} className="mr-2" />
            Change Color
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            variant="destructive"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDeleteDialogOpen(true)
            }}
          >
            <Trash size={16} className="mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogDeleteProject
        isOpen={isDeleteDialogOpen}
        setIsOpenAction={setIsDeleteDialogOpen}
        project={project}
      />
      
      <DialogProjectColor
        isOpen={isColorDialogOpen}
        onOpenChangeAction={setIsColorDialogOpen}
        project={project}
      />
    </>
  )
}
