import { Metadata } from 'next'
import ToolExecutionSettingsPanel from '@/components/common/tool-execution-settings'

export default function ToolSettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <ToolExecutionSettingsPanel />
    </div>
  )
}

export const metadata: Metadata = {
  title: "Configuración de Herramientas",
  description: "Configura cómo Cleo ejecuta acciones y cuándo requiere confirmación"
}