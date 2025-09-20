'use client'

/**
 * 🔍 In-Chat Tool Confirmation
 * Confirmation component that appears within the chat flow
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  Zap,
  Shield,
  Info
} from 'lucide-react'
import { PendingAction, ConfirmationResult } from '@/lib/confirmation/types'
import { confirmationStore } from '@/lib/confirmation/middleware'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface InChatToolConfirmationProps {
  pendingAction: PendingAction
  onConfirm: (result: ConfirmationResult) => void
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
  low: 'bg-green-50 border-green-200 text-green-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
  high: 'bg-orange-50 border-orange-200 text-orange-800',
  critical: 'bg-red-50 border-red-200 text-red-800'
} as const

export default function InChatToolConfirmation({ 
  pendingAction, 
  onConfirm 
}: InChatToolConfirmationProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedParams, setEditedParams] = useState<Record<string, any>>({})
  const [rememberChoice, setRememberChoice] = useState(false)
  const [bulkApproval, setBulkApproval] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Configurar countdown timer si hay timeout
  useEffect(() => {
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
  }, [pendingAction])

  // Reset estado cuando cambia la acción
  useEffect(() => {
    setIsEditing(false)
    setEditedParams(pendingAction.parameters)
    setRememberChoice(false)
    setBulkApproval(false)
  }, [pendingAction])

  const CategoryIcon = CATEGORY_ICONS[pendingAction.category as keyof typeof CATEGORY_ICONS] || Settings
  const sensitivityStyle = SENSITIVITY_STYLES[pendingAction.sensitivity]

  const handleApprove = () => {
    const result: ConfirmationResult = {
      action: 'approve',
      modifiedParameters: isEditing ? editedParams : undefined,
      rememberChoice,
      bulkApproval
    }
    onConfirm(result)
  }

  const handleReject = () => {
    const result: ConfirmationResult = {
      action: 'reject',
      rememberChoice
    }
    onConfirm(result)
  }

  const handleEdit = () => {
    if (isEditing) {
      const result: ConfirmationResult = {
        action: 'edit',
        modifiedParameters: editedParams
      }
      onConfirm(result)
    } else {
      setIsEditing(true)
    }
  }

  const handleTimeout = () => {
    const result: ConfirmationResult = {
      action: 'timeout'
    }
    onConfirm(result)
  }

  const handleParamChange = (key: string, value: any) => {
    setEditedParams(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto my-4"
    >
      <Card className={cn(
        "border-2 shadow-lg",
        sensitivityStyle
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg border-2 bg-white/80 backdrop-blur-sm",
              pendingAction.sensitivity === 'critical' && "border-red-300 bg-red-50",
              pendingAction.sensitivity === 'high' && "border-orange-300 bg-orange-50",
              pendingAction.sensitivity === 'medium' && "border-yellow-300 bg-yellow-50",
              pendingAction.sensitivity === 'low' && "border-green-300 bg-green-50"
            )}>
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">
                  {pendingAction.preview.title}
                </h3>
                {timeLeft !== null && timeLeft > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground bg-white/80 px-2 py-1 rounded-full border">
                    <Clock className="w-3 h-3" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {pendingAction.preview.summary}
              </p>
            </div>
          </div>
          
          {/* Badges de información */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={cn("border-2", sensitivityStyle)}>
              {pendingAction.sensitivity === 'critical' && '🚨 '}
              {pendingAction.sensitivity === 'high' && '⚠️ '}
              {pendingAction.sensitivity === 'medium' && '📋 '}
              {pendingAction.sensitivity === 'low' && '✅ '}
              {pendingAction.sensitivity.charAt(0).toUpperCase() + pendingAction.sensitivity.slice(1)}
            </Badge>
            
            {pendingAction.undoable && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                🔄 Reversible
              </Badge>
            )}
            
            {pendingAction.estimatedDuration && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                ⏱️ {pendingAction.estimatedDuration}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action Details */}
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-sm">Action Details:</h4>
            </div>
            
            <div className="space-y-2">
              {pendingAction.preview.details.map((detail, index) => (
                <div key={index} className="grid grid-cols-3 gap-3 py-1.5">
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
          </div>

          {/* Warnings */}
          {pendingAction.preview.warnings && pendingAction.preview.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="font-medium text-sm text-amber-800">Warnings:</h4>
              </div>
              <ul className="space-y-1 text-sm text-amber-700">
                {pendingAction.preview.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Opciones adicionales */}
          <div className="bg-gray-50 rounded-lg p-3 border">
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

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            {/* Only show edit for non-critical actions */}
            {pendingAction.sensitivity !== 'critical' && (
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? 'Apply Changes' : 'Edit'}
              </Button>
            )}
            
            <Button
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              {isEditing ? 'Approve Changes' : 'Confirm & Execute'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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

// Component for editing fields
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