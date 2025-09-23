/**
 * 🛡️ Simple Tool Confirmation Component
 * Shows preview and approve/reject buttons in chat
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Check, X } from 'lucide-react'

interface ToolPreview {
  summary: string
  title?: string
  warnings?: string[]
}

interface SimpleToolConfirmationProps {
  preview: ToolPreview
  confirmationId: string
  onConfirm: (confirmationId: string, approved: boolean) => void
}

export default function SimpleToolConfirmation({ 
  preview, 
  confirmationId, 
  onConfirm 
}: SimpleToolConfirmationProps) {
  
  const handleApprove = () => {
    onConfirm(confirmationId, true)
  }
  
  const handleReject = () => {
    onConfirm(confirmationId, false)
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">{preview.title || 'Tool Confirmation'}</CardTitle>
        </div>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          {preview.summary}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Warnings */}
        {preview.warnings && preview.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings:</p>
                {preview.warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                    • {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleApprove}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve
          </Button>
          
          <Button 
            onClick={handleReject}
            variant="outline"
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}