"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fetchClient } from "@/lib/fetch"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Check } from "@phosphor-icons/react"

type DialogCreateProjectProps = {
  isOpen: boolean
  setIsOpenAction: (isOpen: boolean) => void
}

type CreateProjectData = {
  id: string
  name: string
  user_id: string
  created_at: string
  color?: string | null
}

const PRESET_COLORS = [
  '#6b7280', // Gray (default)
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#6366f1', // Indigo
]

export function DialogCreateProject({
  isOpen,
  setIsOpenAction,
}: DialogCreateProjectProps) {
  const [projectName, setProjectName] = useState("")
  const [selectedColor, setSelectedColor] = useState('#6b7280')
  const queryClient = useQueryClient()
  const router = useRouter()
  const createProjectMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }): Promise<CreateProjectData> => {
      const response = await fetchClient("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, color }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      router.push(`/p/${data.id}`)
      setProjectName("")
      setSelectedColor('#6b7280')
      setIsOpenAction(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectName.trim()) {
      createProjectMutation.mutate({ name: projectName.trim(), color: selectedColor })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpenAction}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
            <DialogDescription>
              Elige un nombre y color para tu nuevo proyecto.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="Nombre del proyecto"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
            />
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Color de la carpeta:</label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="relative w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: color,
                      borderColor: selectedColor === color ? 'var(--foreground)' : 'var(--border)'
                    }}
                  >
                    {selectedColor === color && (
                      <Check 
                        size={14} 
                        className="absolute inset-0 m-auto text-white drop-shadow-lg" 
                        weight="bold"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpenAction(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!projectName.trim() || createProjectMutation.isPending}
            >
              {createProjectMutation.isPending
                ? "Creando..."
                : "Crear Proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
