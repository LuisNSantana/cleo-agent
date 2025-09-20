'use client'

/**
 * ⚙️ Tool Execution Settings Panel
 * Panel de configuración para el sistema de confirmación de herramientas
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Mail, 
  Calendar, 
  FileX, 
  Settings, 
  Zap, 
  AlertTriangle,
  Shield,
  Gauge,
  Layers,
  Clock,
  RotateCcw
} from 'lucide-react'
import { 
  ToolExecutionSettings, 
  ToolExecutionMode, 
  ActionSensitivity,
  DEFAULT_TOOL_SETTINGS 
} from '@/lib/confirmation/types'
import { confirmationStore } from '@/lib/confirmation/middleware'

// Configuración de categorías para la UI
const CATEGORY_CONFIG = {
  emailActions: {
    icon: Mail,
    label: 'Acciones de Email',
    description: 'Enviar emails, responder mensajes',
    examples: ['Enviar Gmail', 'Responder correo', 'Reenviar mensaje']
  },
  calendarActions: {
    icon: Calendar,
    label: 'Acciones de Calendario',
    description: 'Crear eventos, invitaciones',
    examples: ['Crear evento', 'Modificar reunión', 'Enviar invitación']
  },
  fileActions: {
    icon: FileX,
    label: 'Acciones de Archivos',
    description: 'Eliminar, mover, compartir archivos',
    examples: ['Eliminar archivo', 'Mover a papelera', 'Compartir documento']
  },
  dataModification: {
    icon: Settings,
    label: 'Modificación de Datos',
    description: 'Actualizar bases de datos, configuraciones',
    examples: ['Actualizar BD', 'Cambiar configuración', 'Modificar registro']
  },
  socialActions: {
    icon: Zap,
    label: 'Acciones Sociales',
    description: 'Publicar en redes, enviar mensajes',
    examples: ['Publicar tweet', 'Enviar Slack', 'Publicar LinkedIn']
  },
  financeActions: {
    icon: AlertTriangle,
    label: 'Acciones Financieras',
    description: 'Pagos, transacciones, facturas',
    examples: ['Crear pago', 'Transferencia', 'Generar factura']
  }
} as const

export default function ToolExecutionSettingsPanel() {
  const [settings, setSettings] = useState<ToolExecutionSettings>(DEFAULT_TOOL_SETTINGS)
  const [hasChanges, setHasChanges] = useState(false)

  // Cargar configuración actual
  useEffect(() => {
    const currentSettings = confirmationStore.getSettings()
    setSettings(currentSettings)
  }, [])

  const handleModeChange = (mode: ToolExecutionMode) => {
    setSettings(prev => ({ ...prev, defaultMode: mode }))
    setHasChanges(true)
  }

  const handleCategoryChange = (category: keyof typeof CATEGORY_CONFIG, sensitivity: ActionSensitivity) => {
    setSettings(prev => ({ ...prev, [category]: sensitivity }))
    setHasChanges(true)
  }

  const handleAdvancedChange = (key: keyof ToolExecutionSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    confirmationStore.updateSettings(settings)
    setHasChanges(false)
    
    // Feedback visual
    const button = document.getElementById('save-button')
    if (button) {
      button.textContent = '✅ Guardado'
      setTimeout(() => {
        button.textContent = 'Guardar cambios'
      }, 2000)
    }
  }

  const handleReset = () => {
    setSettings(DEFAULT_TOOL_SETTINGS)
    setHasChanges(true)
  }

  const getModeIcon = (mode: ToolExecutionMode) => {
    switch (mode) {
      case 'preventive': return <Shield className="w-4 h-4" />
      case 'auto': return <Gauge className="w-4 h-4" />
      case 'hybrid': return <Layers className="w-4 h-4" />
    }
  }

  const getModeColor = (mode: ToolExecutionMode) => {
    switch (mode) {
      case 'preventive': return 'text-green-600'
      case 'auto': return 'text-blue-600' 
      case 'hybrid': return 'text-purple-600'
    }
  }

  const getSensitivityColor = (sensitivity: ActionSensitivity) => {
    switch (sensitivity) {
      case 'always_confirm': return 'bg-red-100 text-red-800'
      case 'auto': return 'bg-blue-100 text-blue-800'
      case 'inherit': return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración de Herramientas</h2>
          <p className="text-muted-foreground">
            Controla cómo Cleo ejecuta acciones sensibles y cuándo requiere tu confirmación
          </p>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Cambios pendientes
          </Badge>
        )}
      </div>

      {/* Modo Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Modo de Ejecución Principal
          </CardTitle>
          <CardDescription>
            Define el comportamiento por defecto para todas las herramientas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['preventive', 'auto', 'hybrid'] as const).map((mode) => (
              <div
                key={mode}
                className={`
                  p-4 border rounded-lg cursor-pointer transition-all
                  ${settings.defaultMode === mode 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                onClick={() => handleModeChange(mode)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={getModeColor(mode)}>
                    {getModeIcon(mode)}
                  </div>
                  <h3 className="font-medium capitalize">{mode}</h3>
                  {settings.defaultMode === mode && (
                    <Badge className="ml-auto">Activo</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {mode === 'preventive' && 'Confirmar todas las acciones antes de ejecutar (recomendado)'}
                  {mode === 'auto' && 'Ejecutar automáticamente, ideal para usuarios expertos'}
                  {mode === 'hybrid' && 'Confirmar solo acciones críticas, auto para el resto'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuración por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración por Tipo de Acción</CardTitle>
          <CardDescription>
            Personaliza el comportamiento para diferentes categorías de herramientas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const IconComponent = config.icon
            const currentSetting = settings[key as keyof typeof CATEGORY_CONFIG]
            
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-3">
                  <IconComponent className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="font-medium">{config.label}</h4>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  <Select
                    value={currentSetting}
                    onValueChange={(value: ActionSensitivity) => 
                      handleCategoryChange(key as keyof typeof CATEGORY_CONFIG, value)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always_confirm">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Siempre confirmar
                        </div>
                      </SelectItem>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4" />
                          Automático
                        </div>
                      </SelectItem>
                      <SelectItem value="inherit">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Heredar del modo principal
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Ejemplos */}
                <div className="ml-8 flex flex-wrap gap-1">
                  {config.examples.map((example, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {example}
                    </Badge>
                  ))}
                </div>
                
                {key !== 'financeActions' && <Separator />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Configuraciones Avanzadas */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones Avanzadas</CardTitle>
          <CardDescription>
            Opciones adicionales para personalizar el comportamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Timeout de confirmación</Label>
                <p className="text-sm text-muted-foreground">
                  Segundos antes de cancelar automáticamente (0 = sin límite)
                </p>
              </div>
            </div>
            <Input
              type="number"
              min="0"
              max="300"
              value={settings.confirmationTimeout}
              onChange={(e) => handleAdvancedChange('confirmationTimeout', parseInt(e.target.value) || 0)}
              className="w-20"
            />
          </div>
          
          <Separator />
          
          {/* Acciones en lote */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Permitir acciones en lote</Label>
                <p className="text-sm text-muted-foreground">
                  Aprobar múltiples acciones similares de una vez
                </p>
              </div>
            </div>
            <Switch
              checked={settings.allowBulkActions}
              onCheckedChange={(checked) => handleAdvancedChange('allowBulkActions', checked)}
            />
          </div>
          
          <Separator />
          
          {/* Recordar preferencias */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Recordar preferencias de sesión</Label>
                <p className="text-sm text-muted-foreground">
                  Recordar decisiones de "aprobar/rechazar" durante la sesión
                </p>
              </div>
            </div>
            <Switch
              checked={settings.rememberPreferences}
              onCheckedChange={(checked) => handleAdvancedChange('rememberPreferences', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar valores por defecto
        </Button>
        
        <Button 
          id="save-button"
          onClick={handleSave} 
          disabled={!hasChanges}
          className="min-w-[140px]"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}