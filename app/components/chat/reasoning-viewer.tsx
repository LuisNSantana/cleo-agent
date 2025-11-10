"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Brain, Lightbulb, Target, CheckCircle, List } from "@phosphor-icons/react";
import type { ReasoningBlock } from '@/lib/types/definitions';


export type ReasoningViewerProps = {
  blocks: ReasoningBlock[]
  className?: string
  enableTypingEffect?: boolean
}

/**
 * ReasoningViewer - Visualiza bloques de razonamiento del agente
 * 
 * Características:
 * - Typing effect progresivo para simular pensamiento en tiempo real
 * - Iconos visuales por tipo de razonamiento
 * - Animaciones suaves siguiendo principios de NN/G
 */
export function ReasoningViewer({ 
  blocks, 
  className,
  enableTypingEffect = true 
}: ReasoningViewerProps) {
  const [visibleBlocks, setVisibleBlocks] = useState<number>(0)
  const [typingIndex, setTypingIndex] = useState<number>(0)
  
  useEffect(() => {
    if (!enableTypingEffect || blocks.length === 0) {
      setVisibleBlocks(blocks.length)
      return
    }

    // Progressive reveal: Show one block every 500ms
    if (visibleBlocks < blocks.length) {
      const timer = setTimeout(() => {
        setVisibleBlocks(prev => prev + 1)
        setTypingIndex(0)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [blocks.length, visibleBlocks, enableTypingEffect])

  const getBlockIcon = (type: ReasoningBlock['type']) => {
    switch (type) {
      case 'thought':
        return <Brain className="h-4 w-4" weight="duotone" />;
      case 'observation':
        return <Target className="h-4 w-4" weight="duotone" />;
      case 'plan':
        return <List className="h-4 w-4" weight="duotone" />;
      case 'final_answer':
        return <CheckCircle className="h-4 w-4" weight="duotone" />;
      default:
        return <Brain className="h-4 w-4" weight="duotone" />;
    }
  };

  const getBlockLabel = (type: ReasoningBlock['type']) => {
    switch (type) {
      case 'thought': return 'Pensamiento';
      case 'observation': return 'Observación';
      case 'plan': return 'Plan de Acción';
      case 'final_answer': return 'Respuesta Final';
      default: return type;
    }
  };

  const getBlockColor = (type: ReasoningBlock['type']) => {
    switch (type) {
      case 'thought': return 'blue';
      case 'observation': return 'purple';
      case 'plan': return 'cyan';
      case 'final_answer': return 'green';
      default: return 'gray';
    }
  };

  if (blocks.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No reasoning data available
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
        <Brain className="h-4 w-4" weight="duotone" />
        <span>Agent Reasoning</span>
        <span className="text-xs text-muted-foreground">
          ({blocks.length} {blocks.length === 1 ? 'block' : 'blocks'})
        </span>
      </div>

      <div className="space-y-2">
        {blocks.slice(0, visibleBlocks).map((block, index) => {
          const color = getBlockColor(block.type)
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "relative rounded-lg border p-3 transition-all",
                "hover:shadow-sm",
                color === 'blue' && "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20",
                color === 'purple' && "border-purple-200 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/20",
                color === 'green' && "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20",
                color === 'cyan' && "border-cyan-200 bg-cyan-50/50 dark:border-cyan-900/50 dark:bg-cyan-950/20"
              )}
            >
              {/* Type Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  color === 'blue' && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                  color === 'purple' && "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
                  color === 'green' && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                  color === 'cyan' && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300"
                )}>
                  {getBlockIcon(block.type)}
                  <span>{getBlockLabel(block.type)}</span>
                </div>
              </div>

              {/* Content with Typing Effect */}
              <ReasoningContent 
                content={block.content}
                enableTyping={enableTypingEffect && index === visibleBlocks - 1}
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ReasoningContent - Componente interno con typing effect
 */
function ReasoningContent({ 
  content, 
  enableTyping 
}: { 
  content: string
  enableTyping: boolean 
}) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!enableTyping) {
      setDisplayedContent(content)
      setIsTyping(false)
      return
    }

    setIsTyping(true)
    setDisplayedContent('')
    
    let currentIndex = 0
    const typingSpeed = Math.max(15, Math.min(40, content.length / 80))
    
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, typingSpeed)
    
    return () => clearInterval(interval)
  }, [content, enableTyping])

  return (
    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
      {displayedContent}
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="ml-0.5 text-primary"
        >
          ▊
        </motion.span>
      )}
    </div>
  )
}
