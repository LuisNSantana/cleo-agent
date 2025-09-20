/**
 * 🛡️ Simple Tool Confirmation Component
 * Shows preview and approve/reject buttons in chat
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Check, X } from 'lucide-react'
import type { ToolPreview } from '@/lib/confirmation/simple'

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
          <CardTitle className="text-lg">{preview.title}</CardTitle>
        </div>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          {preview.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Parameters preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Details:</h4>
          <div className="bg-white dark:bg-gray-900 rounded-md p-3 text-sm">
            {Object.entries(preview.parameters).map(([key, value]) => (
              <div key={key} className="flex gap-2 py-1">
                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                  {key}:
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Warnings */}
        {preview.warnings && preview.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300">
              ⚠️ Warnings:
            </h4>
            <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
              {preview.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleApprove}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Approve & Execute
          </Button>
          <Button 
            onClick={handleReject}
            variant="outline"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}