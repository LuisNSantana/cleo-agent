/**
 * Tool Approval Panel Component
 * Based on LangGraph official agent-chat-ui patterns
 * 
 * Displays human-in-the-loop approval requests for sensitive tools
 * Supports: Accept, Edit, Response, Ignore actions
 */

'use client'

import React, { useState } from 'react'
import { HumanInterrupt, HumanResponse, HumanResponseType } from '@/lib/agents/types/interrupt'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Edit3, MessageSquare, AlertTriangle } from 'lucide-react'

export interface ToolApprovalPanelProps {
  executionId: string
  threadId: string
  interrupt: HumanInterrupt
  onResponse: (response: HumanResponse) => Promise<void>
  disabled?: boolean
}

export function ToolApprovalPanel({
  executionId,
  threadId,
  interrupt,
  onResponse,
  disabled = false
}: ToolApprovalPanelProps) {
  const [selectedAction, setSelectedAction] = useState<HumanResponseType>('accept')
  const [editedArgs, setEditedArgs] = useState<Record<string, string>>(
    interrupt.action_request.args
  )
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { action_request, config, description } = interrupt

  // Handle Accept
  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      await onResponse({
        type: 'accept',
        args: null
      })
    } catch (error) {
      console.error('Failed to accept:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit
  const handleEdit = async () => {
    setIsSubmitting(true)
    try {
      await onResponse({
        type: 'edit',
        args: {
          action: action_request.action,
          args: editedArgs
        }
      })
    } catch (error) {
      console.error('Failed to edit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Response
  const handleRespond = async () => {
    setIsSubmitting(true)
    try {
      await onResponse({
        type: 'response',
        args: responseText
      })
    } catch (error) {
      console.error('Failed to respond:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Ignore
  const handleIgnore = async () => {
    setIsSubmitting(true)
    try {
      await onResponse({
        type: 'ignore',
        args: null
      })
    } catch (error) {
      console.error('Failed to ignore:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    switch (selectedAction) {
      case 'accept':
        await handleAccept()
        break
      case 'edit':
        await handleEdit()
        break
      case 'response':
        await handleRespond()
        break
      case 'ignore':
        await handleIgnore()
        break
    }
  }

  // Render args for display/editing
  const renderArgs = () => {
    return Object.entries(action_request.args).map(([key, value]) => {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      
      return (
        <div key={key} className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </label>
          {selectedAction === 'edit' && config.allow_edit ? (
            <Textarea
              value={editedArgs[key] || stringValue}
              onChange={(e) => setEditedArgs(prev => ({ ...prev, [key]: e.target.value }))}
              rows={Math.max(3, Math.ceil(stringValue.length / 50))}
              disabled={disabled || isSubmitting}
              className="font-mono text-sm"
            />
          ) : (
            <div className="rounded-md bg-gray-50 p-3 font-mono text-sm">
              {stringValue}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Approval Required</h3>
            <p className="text-sm text-gray-600">
              Tool: <Badge variant="secondary">{action_request.action}</Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="mb-4 rounded-md bg-white p-3 text-sm text-gray-700">
          {description}
        </div>
      )}

      {/* Tool Arguments */}
      <div className="mb-6 space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Tool Arguments:</h4>
        {renderArgs()}
      </div>

      {/* Action Selector */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {config.allow_accept && (
          <button
            onClick={() => setSelectedAction('accept')}
            disabled={disabled || isSubmitting}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
              selectedAction === 'accept'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium">Accept</span>
          </button>
        )}

        {config.allow_edit && (
          <button
            onClick={() => setSelectedAction('edit')}
            disabled={disabled || isSubmitting}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
              selectedAction === 'edit'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <Edit3 className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium">Edit</span>
          </button>
        )}

        {config.allow_respond && (
          <button
            onClick={() => setSelectedAction('response')}
            disabled={disabled || isSubmitting}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
              selectedAction === 'response'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <span className="text-xs font-medium">Respond</span>
          </button>
        )}

        {config.allow_ignore && (
          <button
            onClick={() => setSelectedAction('ignore')}
            disabled={disabled || isSubmitting}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
              selectedAction === 'ignore'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-xs font-medium">Ignore</span>
          </button>
        )}
      </div>

      {/* Response Input (only for 'response' action) */}
      {selectedAction === 'response' && config.allow_respond && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Your Response:
          </label>
          <Textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Provide additional context or instructions..."
            rows={4}
            disabled={disabled || isSubmitting}
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleIgnore}
          disabled={!config.allow_ignore || disabled || isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={disabled || isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2">
            {JSON.stringify({ executionId, threadId, interrupt }, null, 2)}
          </pre>
        </details>
      )}
    </Card>
  )
}
