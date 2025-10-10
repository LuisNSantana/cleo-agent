"use client"

import { FolderPlusIcon, Folders as FoldersIcon } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { DialogCreateProject } from "./dialog-create-project"
import { SidebarProjectItem } from "./sidebar-project-item"
import { SidebarGroup } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
  color?: string | null
  description?: string | null
  notes?: string | null
}

export function SidebarProject() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects")
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      return response.json()
    },
  })



  return (
    <SidebarGroup className="mb-6">
      {/* Clean header with create button */}
      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex items-center gap-2">
          <FoldersIcon size={18} weight="duotone" className="text-foreground/70" />
          <span className="text-sm font-medium text-foreground">Proyectos</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => setIsDialogOpen(true)}
        >
          <FolderPlusIcon size={16} />
          Nuevo
        </Button>
      </div>

      {/* Project list without accordion wrapper */}
      <div className="space-y-0.5 px-1">
        {isLoading ? (
          <div className="text-muted-foreground px-3 py-2 text-xs">Cargando proyectos…</div>
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <SidebarProjectItem key={project.id} project={project} />
          ))
        ) : (
          <div className="text-muted-foreground/70 mx-2 rounded-lg border border-dashed border-border/40 bg-background/30 px-3 py-3 text-center text-xs">
            No tienes proyectos aún
          </div>
        )}
      </div>

      <DialogCreateProject isOpen={isDialogOpen} setIsOpenAction={setIsDialogOpen} />
    </SidebarGroup>
  )
}
