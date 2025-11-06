"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, CheckCircle, ArrowRight } from "@phosphor-icons/react"
import { motion, AnimatePresence } from "framer-motion"

export interface AgentDetails {
  name: string
  role: string
  description: string
  avatar: string
  color: string
  icon: string
  capabilities: string[]
  tools: string[]
  useCases: string[]
  specialization: string
}

interface AgentModalProps {
  agent: AgentDetails | null
  isOpen: boolean
  onClose: () => void
}

export function AgentModal({ agent, isOpen, onClose }: AgentModalProps) {
  if (!agent) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarImage src={agent.avatar} alt={agent.name} className="object-cover" />
              <AvatarFallback 
                className="text-xl font-bold text-white"
                style={{ background: agent.color }}
              >
                {agent.icon}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {agent.name}
                <span className="text-2xl">{agent.icon}</span>
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                {agent.role}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full" style={{ background: agent.color }} />
              Overview
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {agent.description}
            </p>
          </div>

          {/* Specialization */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full" style={{ background: agent.color }} />
              Specialization
            </h3>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm leading-relaxed">{agent.specialization}</p>
            </div>
          </div>

          {/* Core Capabilities */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full" style={{ background: agent.color }} />
              Core Capabilities
            </h3>
            <div className="grid gap-2">
              {agent.capabilities.map((capability, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/50 p-3"
                >
                  <CheckCircle 
                    weight="fill" 
                    className="h-5 w-5 shrink-0 mt-0.5"
                    style={{ color: agent.color }}
                  />
                  <span className="text-sm">{capability}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Available Tools */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full" style={{ background: agent.color }} />
              Available Tools
            </h3>
            <div className="flex flex-wrap gap-2">
              {agent.tools.slice(0, 12).map((tool, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="px-3 py-1"
                  style={{ 
                    borderColor: agent.color + '40',
                    backgroundColor: agent.color + '10'
                  }}
                >
                  {tool}
                </Badge>
              ))}
              {agent.tools.length > 12 && (
                <Badge variant="outline" className="px-3 py-1">
                  +{agent.tools.length - 12} more
                </Badge>
              )}
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full" style={{ background: agent.color }} />
              Perfect For
            </h3>
            <div className="space-y-2">
              {agent.useCases.map((useCase, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: agent.color }} />
                  <span>{useCase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 border-t">
            <Button
              className="w-full group"
              style={{ 
                background: agent.color,
                color: 'white'
              }}
              onClick={() => {
                window.location.href = '/chat'
              }}
            >
              Start Working with {agent.name}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
