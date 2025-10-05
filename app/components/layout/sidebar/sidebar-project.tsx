"use client"

import { FolderPlusIcon, Folders as FoldersIcon } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { DialogCreateProject } from "./dialog-create-project"
import { SidebarProjectItem } from "./sidebar-project-item"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar"
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

  const projectCountLabel = useMemo(() => {
    if (isLoading) return "Projects"
    return projects.length === 1 ? "1 project" : `${projects.length} projects`
  }, [isLoading, projects.length])

  return (
    <SidebarGroup className="mb-6">
      {/* GROK-STYLE: Header con icono */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <FoldersIcon size={20} weight="duotone" className="text-foreground" />
        <span className="text-base font-semibold text-foreground">Proyectos</span>
      </div>
      <Accordion type="single" collapsible defaultValue="project-library" className="w-full">
        <AccordionItem value="project-library" className="border-none">
          <AccordionTrigger className="px-2 text-sm font-medium text-foreground/70 hover:text-foreground hover:no-underline">
            {projectCountLabel}
          </AccordionTrigger>
          <AccordionContent className="space-y-1.5 px-1 pb-1 pt-0">
            {isLoading ? (
              <div className="text-muted-foreground px-3 py-2 text-xs">Cargando proyectos…</div>
            ) : projects.length > 0 ? (
              <>
                <div className="space-y-0.5">
                  {projects.map((project) => (
                    <SidebarProjectItem key={project.id} project={project} />
                  ))}
                </div>
                {/* GROK-STYLE: Ver todas button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 mt-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Ver todas
                </Button>
              </>
            ) : (
              <>
                <div className="text-muted-foreground/70 rounded-lg border border-dashed border-border/40 bg-background/30 px-3 py-4 text-center text-xs">
                  No tienes proyectos aún
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 mt-2 rounded-md border border-border/40 bg-background/60 px-2.5 py-2 text-sm"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <FolderPlusIcon size={18} />
                  Nuevo proyecto
                </Button>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <DialogCreateProject isOpen={isDialogOpen} setIsOpenAction={setIsDialogOpen} />
    </SidebarGroup>
  )
}
