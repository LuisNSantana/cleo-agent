"use client"

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchClient } from "@/lib/fetch"
import { useState } from "react"
import { Check } from "@phosphor-icons/react"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
  color?: string | null
  description?: string | null
  notes?: string | null
}

type DialogProjectColorProps = {
  isOpen: boolean
  onOpenChangeAction: (open: boolean) => void
  project: Project
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

export function DialogProjectColor({
  isOpen,
  onOpenChangeAction,
  project,
}: DialogProjectColorProps) {
  const [selectedColor, setSelectedColor] = useState(project.color || '#6b7280')
  const queryClient = useQueryClient()

  const updateProjectMutation = useMutation({
    mutationFn: async (color: string) => {
      const response = await fetchClient(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name: project.name,
          description: project.description,
          notes: project.notes,
          color 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update project color")
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["project", project.id] })
      onOpenChangeAction(false)
    },
  })

  const handleSave = () => {
    if (selectedColor !== project.color) {
      updateProjectMutation.mutate(selectedColor)
    } else {
      onOpenChangeAction(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar color de carpeta</DialogTitle>
          <DialogDescription>
            Elige un color para la carpeta "{project.name}" para organizarte mejor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className="relative w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform"
                style={{ 
                  backgroundColor: color,
                  borderColor: selectedColor === color ? 'var(--foreground)' : 'var(--border)'
                }}
              >
                {selectedColor === color && (
                  <Check 
                    size={16} 
                    className="absolute inset-0 m-auto text-white drop-shadow-lg" 
                    weight="bold"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color personalizado:</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-12 h-8 rounded border cursor-pointer"
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                placeholder="#6b7280"
                className="flex-1 px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChangeAction(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateProjectMutation.isPending}
          >
            {updateProjectMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}