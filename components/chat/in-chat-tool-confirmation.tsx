'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Settings, Clock, AlertTriangle, CheckCircle, X, Edit3 } from 'lucide-react'
import { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'

interface InChatToolConfirmationProps {
  onSettingsClick?: () => void
}

export function InChatToolConfirmation({ onSettingsClick }: InChatToolConfirmationProps) {
  const { pendingConfirmations, approve, reject, isLoading } = useUnifiedConfirmation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Show the most recent pending confirmation
  const pendingAction = pendingConfirmations[0]

  if (!pendingAction) {
    return null
  }

  const handleApprove = async () => {
    try {
      await approve(pendingAction.id)
    } catch (error) {
      console.error('Failed to approve action:', error)
    }
  }

  const handleReject = async () => {
    try {
      await reject(pendingAction.id)
    } catch (error) {
      console.error('Failed to reject action:', error)
    }
  }

  return (
    <Card className="border-orange-200 bg-orange-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">Action Requires Confirmation</span>
          </div>
          <div className="flex items-center gap-1">
            {onSettingsClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Tool Information */}
          <div className="bg-white rounded-lg p-3 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">
                {pendingAction.toolName}
              </h4>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {new Date(pendingAction.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            {/* Message Preview */}
            <div className="text-sm text-gray-700 whitespace-pre-line mb-2">
              {pendingAction.message}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            
            <Button
              onClick={handleReject}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between text-orange-700 hover:bg-orange-100"
            >
              <span>Advanced Options</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            
            {isExpanded && (
              <div className="space-y-3 mt-3">
                {/* Parameters Preview */}
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">Parameters</h5>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)}
                      className="h-6 px-2 text-gray-600 hover:text-gray-700"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      {isEditMode ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                  
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

                {/* Edit Mode Actions */}
                {isEditMode && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={isLoading}
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Apply Changes
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
