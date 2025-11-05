"use client"

import React, { useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { 
  Check, 
  X, 
  AlertTriangle, 
  Mail, 
  Calendar, 
  FileText, 
  Settings,
  Zap,
  Shield,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmationItemPreviewDetail {
  label: string
  value: string
  type?: string
  important?: boolean
}

export interface EmailData {
  to?: string | string[]
  subject?: string
  body?: string
}

export interface ConfirmationItemPreview {
  title?: string
  summary?: string
  details?: ConfirmationItemPreviewDetail[]
  warnings?: string[]
  emailData?: EmailData
}

export interface ConfirmationItem {
  id: string
  toolName: string
  category: string
  sensitivity: 'low'|'medium'|'high'|'critical'
  undoable: boolean
  preview: ConfirmationItemPreview
  message?: string
  timestamp: string | number
}

interface ConfirmationPanelProps {
  items: ConfirmationItem[]
  onResolve: (id: string, approved: boolean, editedData?: any) => Promise<void> | void
  loadingId?: string | null
  minimal?: boolean
}

const toolIconsMap: Record<string, { type: 'svg' | 'component', value: string | React.ReactNode }> = {
  sendGmailMessage: { type: 'svg', value: '/icons/gmail-icon.svg' },
  sendEmail: { type: 'svg', value: '/icons/gmail-icon.svg' },
  createCalendarEvent: { type: 'svg', value: '/icons/google-calendar.svg' },
  updateCalendarEvent: { type: 'svg', value: '/icons/google-calendar.svg' },
  createDocument: { type: 'svg', value: '/icons/google-drive.svg' },
  updateDocument: { type: 'svg', value: '/icons/google-drive.svg' },
  createNotionPage: { type: 'svg', value: '/icons/notion-icon.svg' },
  updateNotionPage: { type: 'svg', value: '/icons/notion-icon.svg' },
  getWeather: { type: 'component', value: <Mail className="h-4 w-4" /> },
  searchWeb: { type: 'svg', value: '/icons/tavily-color.png' },
  deleteItem: { type: 'component', value: <AlertTriangle className="h-4 w-4" /> },
  default: { type: 'component', value: <Zap className="h-4 w-4" /> }
}

function ToolIcon({ toolName }: { toolName: string }) {
  const iconConfig = toolIconsMap[toolName] || toolIconsMap.default
  
  if (iconConfig.type === 'svg') {
    return (
      <Image 
        src={iconConfig.value as string} 
        alt={toolName}
        width={18}
        height={18}
        className="object-contain"
      />
    )
  }
  
  return <>{iconConfig.value}</>
}

const sensitivityConfig = {
  low: { 
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: <Info className="h-3.5 w-3.5" />,
    label: 'Low Risk',
    gradient: 'from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10',
    borderColor: 'border-blue-500/20'
  },
  medium: { 
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    icon: <Shield className="h-3.5 w-3.5" />,
    label: 'Medium Risk',
    gradient: 'from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10',
    borderColor: 'border-amber-500/20'
  },
  high: { 
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: 'High Risk',
    gradient: 'from-orange-50/50 to-red-50/30 dark:from-orange-950/20 dark:to-red-950/10',
    borderColor: 'border-orange-500/20'
  },
  critical: { 
    color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    label: 'Critical',
    gradient: 'from-red-50/50 to-pink-50/30 dark:from-red-950/20 dark:to-pink-950/10',
    borderColor: 'border-red-500/20'
  }
}

function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function ConfirmationItemCard({ 
  item, 
  onResolve, 
  isLoading 
}: { 
  item: ConfirmationItem
  onResolve: (id: string, approved: boolean, editedData?: any) => void
  isLoading: boolean
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const sensitivity = item.sensitivity || 'medium'
  const config = sensitivityConfig[sensitivity]

  // ✅ EDITABLE EMAIL STATE
  const [editedEmailData, setEditedEmailData] = useState<EmailData>({
    to: item.preview?.emailData?.to || '',
    subject: item.preview?.emailData?.subject || '',
    body: item.preview?.emailData?.body || ''
  })

  const handleApprove = useCallback(() => {
    // ✅ Pass edited email data to backend
    if (item.preview?.emailData) {
      console.log('📧 [CONFIRMATION] Sending edited email data:', editedEmailData)
      onResolve(item.id, true, editedEmailData)
    } else {
      onResolve(item.id, true)
    }
  }, [item.id, onResolve, editedEmailData, item.preview])
  
  const handleReject = useCallback(() => onResolve(item.id, false), [item.id, onResolve])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        e.preventDefault()
        handleApprove()
      } else if (e.key === 'Escape' && !isLoading) {
        e.preventDefault()
        handleReject()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleApprove, handleReject, isLoading])

  const details = item.preview?.details || []
  const hasDetails = details.length > 0
  const emailData = item.preview?.emailData

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* iOS-inspired Card */}
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
        {/* Header Bar - iOS style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            <h3 className="text-sm font-medium text-slate-200">
              {item.preview?.title || 'Approval Required'}
            </h3>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] font-medium border",
              sensitivity === 'critical' || sensitivity === 'high'
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-blue-500/10 text-blue-400 border-blue-500/30"
            )}
          >
            {config.label}
          </Badge>
        </div>

        {/* Email Content - iOS Gmail Style with EDITABLE inputs */}
        {emailData ? (
          <div className="px-4 py-3 space-y-3">
            {/* To Field - EDITABLE */}
            <div className="flex items-start gap-3 py-2 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium w-16 flex-shrink-0 pt-2">Para</span>
              <input
                type="email"
                value={Array.isArray(editedEmailData.to) ? editedEmailData.to.join(', ') : editedEmailData.to}
                onChange={(e) => setEditedEmailData({ ...editedEmailData, to: e.target.value })}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 transition-colors outline-none"
                placeholder="destinatario@ejemplo.com"
              />
            </div>

            {/* Subject Field - EDITABLE */}
            <div className="flex items-start gap-3 py-2 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium w-16 flex-shrink-0 pt-2">Asunto</span>
              <input
                type="text"
                value={editedEmailData.subject}
                onChange={(e) => setEditedEmailData({ ...editedEmailData, subject: e.target.value })}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 placeholder-slate-500 transition-colors outline-none"
                placeholder="Asunto del correo"
              />
            </div>

            {/* Body Field - EDITABLE textarea */}
            <div className="flex items-start gap-3 py-2">
              <span className="text-xs text-slate-400 font-medium w-16 flex-shrink-0 pt-2">Mensaje</span>
              <textarea
                value={editedEmailData.body}
                onChange={(e) => setEditedEmailData({ ...editedEmailData, body: e.target.value })}
                rows={8}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 whitespace-pre-wrap leading-relaxed transition-colors outline-none resize-y min-h-[150px] max-h-[400px]"
                placeholder="Escribe tu mensaje aquí..."
              />
            </div>
          </div>
        ) : (
          /* Non-email generic view */
          <div className="px-4 py-3">
            <p className="text-sm text-slate-300 mb-2">{item.preview?.summary}</p>
            {hasDetails && details.slice(0, 3).map((detail, idx) => (
              <div key={idx} className="flex gap-2 py-2 border-b border-slate-700/30 last:border-0">
                <span className="text-xs text-slate-400 font-medium w-20 flex-shrink-0">{detail.label}</span>
                <span className="text-sm text-slate-200 flex-1">{truncateText(detail.value, 100)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons - iOS style */}
        <div className="flex gap-0 border-t border-slate-700/50">
          <button
            onClick={handleReject}
            disabled={isLoading}
            className="flex-1 py-3.5 text-sm font-semibold text-red-400 hover:bg-slate-800/50 active:bg-slate-800 transition-colors border-r border-slate-700/50 disabled:opacity-50"
          >
            Rechazar
          </button>
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 py-3.5 text-sm font-semibold text-blue-400 hover:bg-slate-800/50 active:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Enviando...' : 'Aprobar y Enviar'}
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-700/30">
          <p className="text-[10px] text-slate-500 text-center">
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[9px] font-mono">↵</kbd> aprobar · 
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[9px] font-mono ml-2">Esc</kbd> rechazar
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function ConfirmationPanel({ 
  items, 
  onResolve, 
  loadingId 
}: ConfirmationPanelProps) {
  if (!items || items.length === 0) return null

  const currentItem = items[0]
  const isLoading = loadingId === currentItem.id

  return (
    <AnimatePresence mode="wait">
      <ConfirmationItemCard
        key={currentItem.id}
        item={currentItem}
        onResolve={onResolve}
        isLoading={isLoading}
      />
    </AnimatePresence>
  )
}
