/**
 * Approval Message Component
 * 
 * Renders tool approval requests inline in the chat conversation
 * Integrates ToolApprovalPanel with chat message flow
 */

'use client'

import { motion } from 'framer-motion'
import { ToolApprovalPanel } from '@/components/chat/tool-approval-panel'
import { InterruptState } from '@/lib/agents/types/interrupt'
import { useToolApprovals } from '@/hooks/use-tool-approvals'
import { AlertTriangle } from 'lucide-react'

export interface ApprovalMessageProps {
  interrupt: InterruptState
  onApproved?: () => void
  onRejected?: () => void
}

export function ApprovalMessage({ 
  interrupt, 
  onApproved, 
  onRejected 
}: ApprovalMessageProps) {
  const { handleApprovalResponse } = useToolApprovals()

  const handleResponse = async (response: any) => {
    try {
      await handleApprovalResponse(interrupt.executionId, response)
      
      if (response.type === 'accept' || response.type === 'edit' || response.type === 'response') {
        onApproved?.()
      } else {
        onRejected?.()
      }
    } catch (error) {
      console.error('Failed to handle approval response:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="my-4"
    >
      <div className="mb-2 flex items-center gap-2 text-sm text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Agent is requesting approval</span>
      </div>
      
      <ToolApprovalPanel
        executionId={interrupt.executionId}
        threadId={interrupt.threadId}
        interrupt={interrupt.interrupt}
        onResponse={handleResponse}
        disabled={interrupt.status !== 'pending'}
      />
      
      {interrupt.status !== 'pending' && (
        <div className="mt-2 text-sm text-gray-500">
          {interrupt.status === 'approved' && '✅ Approved - execution continuing...'}
          {interrupt.status === 'rejected' && '❌ Rejected - execution cancelled'}
          {interrupt.status === 'edited' && '✏️ Edited - executing with changes...'}
        </div>
      )}
    </motion.div>
  )
}
