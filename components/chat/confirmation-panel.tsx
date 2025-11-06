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
  editable?: boolean  // ✅ NEW: Marca si este campo es editable
}

export interface EmailData {
  to?: string | string[]
  subject?: string
  body?: string
}

export interface CalendarData {
  summary?: string
  description?: string
  startTime?: string
  endTime?: string
  location?: string
}

export interface NotionData {
  title?: string
  content?: string
  database?: string
}

export interface TweetData {
  text?: string
  media?: string[]
}

export interface ConfirmationItemPreview {
  title?: string
  summary?: string
  details?: ConfirmationItemPreviewDetail[]
  warnings?: string[]
  emailData?: EmailData
  calendarData?: CalendarData
  notionData?: NotionData
  tweetData?: TweetData
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

  // ✅ EDITABLE STATE for different tool types
  const [editedEmailData, setEditedEmailData] = useState<EmailData>({
    to: item.preview?.emailData?.to || '',
    subject: item.preview?.emailData?.subject || '',
    body: item.preview?.emailData?.body || ''
  })
  
  const [editedCalendarData, setEditedCalendarData] = useState<CalendarData>({
    summary: item.preview?.calendarData?.summary || '',
    description: item.preview?.calendarData?.description || '',
    startTime: item.preview?.calendarData?.startTime || '',
    endTime: item.preview?.calendarData?.endTime || '',
    location: item.preview?.calendarData?.location || ''
  })
  
  const [editedNotionData, setEditedNotionData] = useState<NotionData>({
    title: item.preview?.notionData?.title || '',
    content: item.preview?.notionData?.content || '',
    database: item.preview?.notionData?.database || ''
  })
  
  const [editedTweetData, setEditedTweetData] = useState<TweetData>({
    text: item.preview?.tweetData?.text || '',
    media: item.preview?.tweetData?.media || []
  })

  const handleApprove = useCallback(() => {
    // ✅ Pass edited data based on tool type
    let editedData: any = null
    
    if (item.preview?.emailData) {
      console.log('📧 [CONFIRMATION] Sending edited email data:', editedEmailData)
      editedData = editedEmailData
    } else if (item.preview?.calendarData) {
      console.log('📅 [CONFIRMATION] Sending edited calendar data:', editedCalendarData)
      editedData = editedCalendarData
    } else if (item.preview?.notionData) {
      console.log('📝 [CONFIRMATION] Sending edited Notion data:', editedNotionData)
      editedData = editedNotionData
    } else if (item.preview?.tweetData) {
      console.log('🐦 [CONFIRMATION] Sending edited tweet data:', editedTweetData)
      editedData = editedTweetData
    }
    
    onResolve(item.id, true, editedData)
  }, [item.id, item.preview, onResolve, editedEmailData, editedCalendarData, editedNotionData, editedTweetData])
  
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
  const calendarData = item.preview?.calendarData
  const notionData = item.preview?.notionData
  const tweetData = item.preview?.tweetData

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

        {/* ==========================================
            CONDITIONAL FORM RENDERING BY TOOL TYPE
            ========================================== */}
        
        {/* EMAIL FORM - Gmail */}
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
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Mensaje</span>
              <textarea
                value={editedEmailData.body}
                onChange={(e) => setEditedEmailData({ ...editedEmailData, body: e.target.value })}
                rows={8}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 whitespace-pre-wrap leading-relaxed transition-colors outline-none resize-y min-h-[150px] max-h-[400px]"
                placeholder="Escribe tu mensaje aquí..."
              />
            </div>
          </div>
        ) : null}

        {/* CALENDAR FORM - Google Calendar Events */}
        {calendarData ? (
          <div className="px-4 py-3 space-y-3">
            {/* Summary/Title Field - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Título</span>
              <input
                type="text"
                value={editedCalendarData.summary}
                onChange={(e) => setEditedCalendarData({ ...editedCalendarData, summary: e.target.value })}
                className="flex-1 min-h-[44px] sm:min-h-auto bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 placeholder-slate-500 transition-colors outline-none"
                placeholder="Título del evento"
              />
            </div>

            {/* Start Time - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Inicio</span>
              <input
                type="datetime-local"
                value={editedCalendarData.startTime}
                onChange={(e) => setEditedCalendarData({ ...editedCalendarData, startTime: e.target.value })}
                className="flex-1 min-h-[44px] sm:min-h-auto bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 transition-colors outline-none"
              />
            </div>

            {/* End Time - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Fin</span>
              <input
                type="datetime-local"
                value={editedCalendarData.endTime}
                onChange={(e) => setEditedCalendarData({ ...editedCalendarData, endTime: e.target.value })}
                className="flex-1 min-h-[44px] sm:min-h-auto bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 transition-colors outline-none"
              />
            </div>

            {/* Location - EDITABLE */}
            {editedCalendarData.location !== undefined && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-slate-700/30">
                <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Lugar</span>
                <input
                  type="text"
                  value={editedCalendarData.location}
                  onChange={(e) => setEditedCalendarData({ ...editedCalendarData, location: e.target.value })}
                  className="flex-1 min-h-[44px] sm:min-h-auto bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 transition-colors outline-none"
                  placeholder="Ubicación del evento"
                />
              </div>
            )}

            {/* Description - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Descripción</span>
              <textarea
                value={editedCalendarData.description}
                onChange={(e) => setEditedCalendarData({ ...editedCalendarData, description: e.target.value })}
                rows={6}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 whitespace-pre-wrap leading-relaxed transition-colors outline-none resize-y min-h-[120px] max-h-[300px]"
                placeholder="Descripción del evento..."
              />
            </div>
          </div>
        ) : null}

        {/* NOTION FORM - Notion Pages */}
        {notionData ? (
          <div className="px-4 py-3 space-y-3">
            {/* Title Field - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Título</span>
              <input
                type="text"
                value={editedNotionData.title}
                onChange={(e) => setEditedNotionData({ ...editedNotionData, title: e.target.value })}
                className="flex-1 min-h-[44px] sm:min-h-auto bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 placeholder-slate-500 transition-colors outline-none"
                placeholder="Título de la página"
              />
            </div>

            {/* Database - EDITABLE (optional) */}
            {editedNotionData.database !== undefined && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-b border-slate-700/30">
                <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Base de datos</span>
                <input
                  type="text"
                  value={editedNotionData.database}
                  onChange={(e) => setEditedNotionData({ ...editedNotionData, database: e.target.value })}
                  className="flex-1 min-h-[44px] sm:min-h-auto bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 transition-colors outline-none"
                  placeholder="ID de la base de datos"
                />
              </div>
            )}

            {/* Content - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Contenido</span>
              <textarea
                value={editedNotionData.content}
                onChange={(e) => setEditedNotionData({ ...editedNotionData, content: e.target.value })}
                rows={10}
                className="flex-1 bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 whitespace-pre-wrap leading-relaxed transition-colors outline-none resize-y min-h-[200px] max-h-[500px]"
                placeholder="Contenido de la página en Notion..."
              />
            </div>
          </div>
        ) : null}

        {/* TWEET FORM - Twitter Posts */}
        {tweetData ? (
          <div className="px-4 py-3 space-y-3">
            {/* Tweet Text with Character Counter - EDITABLE */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2">
              <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0 sm:pt-2">Tweet</span>
              <div className="flex-1 relative">
                <textarea
                  value={editedTweetData.text}
                  onChange={(e) => {
                    const text = e.target.value.slice(0, 280) // Hard limit
                    setEditedTweetData({ ...editedTweetData, text })
                  }}
                  maxLength={280}
                  rows={6}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/50 focus:border-blue-500/50 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-500 whitespace-pre-wrap leading-relaxed transition-colors outline-none resize-y min-h-[120px] max-h-[200px]"
                  placeholder="¿Qué está pasando?"
                />
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-slate-900/80 rounded-md">
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    (editedTweetData.text?.length || 0) > 260 
                      ? "text-red-400" 
                      : (editedTweetData.text?.length || 0) > 240
                      ? "text-yellow-400"
                      : "text-slate-500"
                  )}>
                    {editedTweetData.text?.length || 0}/280
                  </span>
                </div>
              </div>
            </div>

            {/* Media Preview (if available) */}
            {editedTweetData.media && editedTweetData.media.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 py-2 border-t border-slate-700/30 pt-3">
                <span className="text-xs text-slate-400 font-medium sm:w-16 flex-shrink-0">Media</span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {editedTweetData.media.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 bg-slate-800 rounded-lg overflow-hidden border border-slate-700/50">
                      <img 
                        src={url} 
                        alt={`Media ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* FALLBACK - Generic details view for other tools */}
        {!emailData && !calendarData && !notionData && !tweetData && (
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
