/**
 * 🛡️ In-Chat Tool Confirmation
 * Inline confirmation component that appears within the chat flow
 * Like ChatGPT/Claude - seamless integration with conversation
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock, AlertTriangle } from 'lucide-react'
import { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'
import { Button } from '@/components/ui/button'

interface InChatConfirmationProps {
  className?: string
}

export function InChatConfirmation({ className = '' }: InChatConfirmationProps) {
  const { pendingConfirmations, approve, reject, isLoading } = useUnifiedConfirmation()
  const confirmation = pendingConfirmations[0]

  if (!confirmation) return null

  const handleApprove = async () => {
    try {
      await approve(confirmation.id)
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async () => {
    try {
      await reject(confirmation.id)
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 my-3 ${className}`}
    >
      {/* Header with icon and status */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
            {isLoading ? 'Executing...' : 'Action requires confirmation'}
          </div>
          <div className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            {confirmation.message}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isLoading && (
        <div className="flex items-center gap-2 pl-9">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            className="h-8 px-3 text-xs border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            <X className="w-3 h-3 mr-1.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Check className="w-3 h-3 mr-1.5" />
            Confirm
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 pl-9 text-sm text-amber-700 dark:text-amber-300">
          <Clock className="w-4 h-4" />
          <span>Processing your request...</span>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Compact version for mobile or tight spaces
 */
export function InChatConfirmationCompact({ className = '' }: InChatConfirmationProps) {
  const { pendingConfirmations, approve, reject, isLoading } = useUnifiedConfirmation()
  const confirmation = pendingConfirmations[0]

  if (!confirmation) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 my-2 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-900 dark:text-blue-100 truncate">
            {confirmation.toolName} requires confirmation
          </span>
        </div>
        
        {!isLoading ? (
          <div className="flex gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => reject(confirmation.id)}
              className="h-7 w-7 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={() => approve(confirmation.id)}
              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
    </motion.div>
  )
}