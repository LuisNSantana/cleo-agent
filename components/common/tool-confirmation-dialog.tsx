'use client'

/**
 * 🔍 Tool Confirmation Dialog
 * Modal para preview y confirmación de acciones sensibles
 */

import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  Calendar, 
  Mail, 
  FileX, 
  Clock, 
  Edit3,
  Check,
  X,
  Settings,
  Zap
} from 'lucide-react'
import { PendingAction, ConfirmationResult } from '@/lib/confirmation/types'
import { confirmationStore } from '@/lib/confirmation/middleware'
import { cn } from '@/lib/utils'

interface ToolConfirmationDialogProps {
  open: boolean
  onClose: () => void
  pendingAction: PendingAction | null
}

// Iconos por categoría de herramienta
const CATEGORY_ICONS = {
  emailActions: Mail,
  calendarActions: Calendar,
  fileActions: FileX,
  dataModification: Settings,
  socialActions: Zap,
  financeActions: AlertTriangle
} as const

// Colores por nivel de sensibilidad
const SENSITIVITY_STYLES = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
} as const

export default function ToolConfirmationDialog({ 
  open, 
  onClose, 
  pendingAction 
}: ToolConfirmationDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedParams, setEditedParams] = useState<Record<string, any>>({})
  const [rememberChoice, setRememberChoice] = useState(false)
  const [bulkApproval, setBulkApproval] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Configurar countdown timer si hay timeout
  useEffect(() => {
    if (!open || !pendingAction) return

    const settings = confirmationStore.getSettings()
    if (settings.confirmationTimeout > 0) {
      setTimeLeft(settings.confirmationTimeout)
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            handleTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [open, pendingAction])

  // Reset estado cuando cambia la acción
  useEffect(() => {
    if (pendingAction) {
      setIsEditing(false)
      setEditedParams(pendingAction.parameters)
      setRememberChoice(false)
      setBulkApproval(false)
    }
  }, [pendingAction])

  if (!pendingAction) return null

  const CategoryIcon = CATEGORY_ICONS[pendingAction.category as keyof typeof CATEGORY_ICONS] || Settings
  const sensitivityStyle = SENSITIVITY_STYLES[pendingAction.sensitivity]

  const handleApprove = () => {
    const result: ConfirmationResult = {
      action: 'approve',
      modifiedParameters: isEditing ? editedParams : undefined,
      rememberChoice,
      bulkApproval
    }
    confirmationStore.resolveConfirmation(pendingAction.id, result)
    onClose()
  }

  const handleReject = () => {
    const result: ConfirmationResult = {
      action: 'reject',
      rememberChoice
    }
    confirmationStore.resolveConfirmation(pendingAction.id, result)
    onClose()
  }

  const handleEdit = () => {
    if (isEditing) {
      const result: ConfirmationResult = {
        action: 'edit',
        modifiedParameters: editedParams
      }
      confirmationStore.resolveConfirmation(pendingAction.id, result)
      onClose()
    } else {
      setIsEditing(true)
    }
  }

  const handleTimeout = () => {
    const result: ConfirmationResult = {
      action: 'timeout'
    }
    confirmationStore.resolveConfirmation(pendingAction.id, result)
    onClose()
  }

  const handleParamChange = (key: string, value: any) => {
    setEditedParams(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg border",
              sensitivityStyle
            )}>
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">
                {pendingAction.preview.title}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {pendingAction.preview.summary}
              </p>
            </div>
            {timeLeft !== null && timeLeft > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges de información */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={sensitivityStyle}>
              {pendingAction.sensitivity === 'critical' && '🚨 '}
              {pendingAction.sensitivity === 'high' && '⚠️ '}
              {pendingAction.sensitivity === 'medium' && '📋 '}
              {pendingAction.sensitivity === 'low' && '✅ '}
              {pendingAction.sensitivity.charAt(0).toUpperCase() + pendingAction.sensitivity.slice(1)}
            </Badge>
            
            {pendingAction.undoable && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                🔄 Reversible
              </Badge>
            )}
            
            {pendingAction.estimatedDuration && (
              <Badge variant="outline">
                ⏱️ {pendingAction.estimatedDuration}
              </Badge>
            )}
          </div>

          {/* Detalles de la acción */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detalles de la acción:</h4>
            
            {pendingAction.preview.details.map((detail, index) => (
              <div key={index} className="grid grid-cols-3 gap-3 py-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {detail.label}:
                </Label>
                <div className="col-span-2">
                  {isEditing ? (
                    <EditableField
                      type={detail.type}
                      value={editedParams[detail.label.toLowerCase()] || detail.value}
                      onChange={(value) => handleParamChange(detail.label.toLowerCase(), value)}
                    />
                  ) : (
                    <DisplayField type={detail.type} value={detail.value} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {pendingAction.preview.warnings && pendingAction.preview.warnings.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h4 className="font-medium text-sm">Advertencias:</h4>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  {pendingAction.preview.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Opciones adicionales */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember"
                checked={rememberChoice}
                onCheckedChange={(checked) => setRememberChoice(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm">
                Recordar mi decisión para acciones similares
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="bulk"
                checked={bulkApproval}
                onCheckedChange={(checked) => setBulkApproval(checked === true)}
              />
              <Label htmlFor="bulk" className="text-sm">
                Auto-aprobar todas las acciones de este tipo en esta sesión
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {/* Botones principales */}
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            
            {/* Solo mostrar editar para acciones editables */}
            {pendingAction.sensitivity !== 'critical' && (
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex-1"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? 'Aplicar cambios' : 'Editar'}
              </Button>
            )}
            
            <Button
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              {isEditing ? 'Aprobar cambios' : 'Aprobar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Componente para mostrar campos según su tipo
function DisplayField({ type, value }: { type?: string; value: string | string[] }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    )
  }

  if (type === 'email') {
    return (
      <Badge variant="secondary" className="text-xs">
        {value}
      </Badge>
    )
  }

  if (type === 'code') {
    return (
      <code className="text-xs bg-muted p-1 rounded block overflow-x-auto">
        {value}
      </code>
    )
  }

  return (
    <span className="text-sm break-words">
      {value}
    </span>
  )
}

// Componente para editar campos
function EditableField({ 
  type, 
  value, 
  onChange 
}: { 
  type?: string
  value: string | string[]
  onChange: (value: any) => void 
}) {
  if (Array.isArray(value)) {
    return (
      <Textarea
        value={value.join(', ')}
        onChange={(e) => onChange(e.target.value.split(', ').filter(Boolean))}
        className="text-xs"
        rows={2}
      />
    )
  }

  if (type === 'text' && value.length > 50) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs"
        rows={3}
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs"
    />
  )
}