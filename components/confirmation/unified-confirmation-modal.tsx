/**
 * 🛡️ Unified Tool Confirmation Modal
 * Modern, responsive confirmation UI like ChatGPT/Claude/Perplexity
 * Optimized for both mobile and desktop
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertTriangle } from 'lucide-react'
import { useUnifiedConfirmation } from '@/hooks/use-unified-confirmation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function UnifiedConfirmationModal() {
  const { pendingConfirmations, approve, reject, isLoading } = useUnifiedConfirmation()
  const [currentConfirmation, setCurrentConfirmation] = useState(pendingConfirmations[0] || null)

  // Update current confirmation when list changes
  useEffect(() => {
    setCurrentConfirmation(pendingConfirmations[0] || null)
  }, [pendingConfirmations])

  const handleApprove = async () => {
    if (!currentConfirmation) return
    try {
      await approve(currentConfirmation.id)
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async () => {
    if (!currentConfirmation) return
    try {
      await reject(currentConfirmation.id)
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  if (!currentConfirmation) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-md mx-auto"
        >
          <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Confirm Action
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    Review the details before proceeding
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Tool Action Description */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Action Details
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {currentConfirmation.message}
                </div>
              </div>

              {/* Tool Parameters Preview (if relevant) */}
              {currentConfirmation.params && Object.keys(currentConfirmation.params).length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2 uppercase tracking-wide">
                    Parameters
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200 font-mono">
                    {Object.entries(currentConfirmation.params)
                      .filter(([key, value]) => value !== undefined && value !== null && value !== '')
                      .slice(0, 3) // Only show first 3 params to avoid clutter
                      .map(([key, value]) => (
                        <div key={key} className="truncate">
                          <span className="opacity-70">{key}:</span> {String(value).substring(0, 50)}
                          {String(value).length > 50 && '...'}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 h-11 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Processing...' : 'Approve'}
                </Button>
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded border">Esc</kbd> to cancel • <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded border">Enter</kbd> to approve
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Keyboard shortcuts support
export function useConfirmationKeyboardShortcuts() {
  const { pendingConfirmations, approve, reject } = useUnifiedConfirmation()
  const currentConfirmation = pendingConfirmations[0]

  useEffect(() => {
    if (!currentConfirmation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        reject(currentConfirmation.id)
      } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        approve(currentConfirmation.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentConfirmation, approve, reject])
}