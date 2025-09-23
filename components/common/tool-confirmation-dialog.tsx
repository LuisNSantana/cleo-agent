'use client'

/**
 * 🔍 Tool Confirmation Dialog
 * Modal para preview y confirmación de acciones sensibles
 */

import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle, X } from 'lucide-react'
import { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'

interface ToolConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ToolConfirmationDialog({ 
  open, 
  onOpenChange 
}: ToolConfirmationDialogProps) {
  const { pendingConfirmations, approve, reject, isLoading } = useUnifiedConfirmation()
  const [isExpanded, setIsExpanded] = useState(false)

  const pendingAction = pendingConfirmations[0]

  if (!pendingAction) {
    return null
  }

  const handleApprove = async () => {
    try {
      await approve(pendingAction.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to approve action:', error)
    }
  }

  const handleReject = async () => {
    try {
      await reject(pendingAction.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to reject action:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg border-2 bg-orange-50 border-orange-300">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {pendingAction.toolName}
              </DialogTitle>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(pendingAction.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {pendingAction.message}
            </div>
          </div>

          {/* Parameters */}
          {isExpanded && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-medium text-gray-900 mb-3">Parameters</h4>
              <div className="space-y-2">
                {Object.entries(pendingAction.params).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="text-sm text-gray-900 max-w-xs truncate">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full text-gray-600"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>

        <DialogFooter className="gap-3">
          <Button
            onClick={handleReject}
            disabled={isLoading}
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
          
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}