import { useGuestMemory } from "@/app/hooks/use-guest-memory"
import { Button } from "@/components/ui/button"
import { useCallback } from "react"
import { toast } from "@/components/ui/toast"
import { Trash } from "@phosphor-icons/react"

interface GuestMemoryManagerProps {
  className?: string
}

/**
 * Componente para gestionar la memoria de chat en modo guest
 * Muestra información sobre los mensajes almacenados y permite limpiar la memoria
 */
export function GuestMemoryManager({ className }: GuestMemoryManagerProps) {
  const { messageCount, clearMemory, hasMemory } = useGuestMemory()

  const handleClearMemory = useCallback(() => {
    clearMemory()
    toast({
      title: "Memoria de chat limpiada",
      description: "El historial de conversación ha sido eliminado",
      status: "success",
    })
  }, [clearMemory])

  if (!hasMemory) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span>
        Conversación guardada localmente ({messageCount} mensajes)
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearMemory}
        className="h-6 px-2 hover:bg-destructive/10 hover:text-destructive"
        title="Limpiar historial de conversación"
      >
        <Trash size={12} />
      </Button>
    </div>
  )
}