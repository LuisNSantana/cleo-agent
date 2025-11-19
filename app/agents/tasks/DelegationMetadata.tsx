'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CheckCircle, ArrowRight, Zap, Wrench } from 'lucide-react'

interface DelegationInfo {
  to_agent: string;
  task_description: string;
  timestamp: string;
  result?: string;
}

interface DelegationMetadataProps {
  delegations?: DelegationInfo[];
  toolCalls?: number;
  forwardMessageUsed?: boolean;
  className?: string;
}

const AGENT_DISPLAY_NAMES: Record<string, { name: string; icon: string; color: string }> = {
  'apu': { name: 'Apu', icon: '🔍', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  'astra': { name: 'Astra', icon: '📧', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  'ami': { name: 'Ami', icon: '📅', color: 'bg-green-500/20 text-green-300 border-green-500/40' },
  'peter': { name: 'Peter', icon: '💰', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  'emma': { name: 'Emma', icon: '🛍️', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  'toby': { name: 'Toby', icon: '💻', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  'wex': { name: 'Wex', icon: '🌐', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  'nora': { name: 'Nora', icon: '⚕️', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
  'jenn': { name: 'Jenn', icon: '🐦', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  'iris': { name: 'Iris', icon: '📊', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
};

function getAgentInfo(agentId: string) {
  const normalized = agentId.toLowerCase().replace(/[-_]/g, '');
  
  // Try exact match first
  if (AGENT_DISPLAY_NAMES[normalized]) {
    return AGENT_DISPLAY_NAMES[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(AGENT_DISPLAY_NAMES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Default
  return { name: agentId, icon: '🤖', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
}

export function DelegationMetadata({
  delegations = [],
  toolCalls = 0,
  forwardMessageUsed = false,
  className = ''
}: DelegationMetadataProps) {
  // Si no hay delegaciones ni metadata relevante, no mostrar nada
  if (delegations.length === 0 && !forwardMessageUsed && toolCalls === 0) {
    return null;
  }

  return (
    <Card className={`p-4 bg-muted/30 border-border ${className}`}>
      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Execution Details
      </h4>

      <div className="space-y-3">
        {/* Delegations Timeline */}
        {delegations.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Agent Delegations:</p>
            <div className="space-y-2">
              {delegations.map((delegation, idx) => {
                const agentInfo = getAgentInfo(delegation.to_agent);
                return (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <Badge className={`${agentInfo.color} border text-xs`}>
                        <span className="mr-1">{agentInfo.icon}</span>
                        {agentInfo.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {delegation.task_description}
                      </span>
                    </div>
                    {delegation.result && (
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {toolCalls > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Wrench className="w-3 h-3 mr-1" />
              {toolCalls} tool call{toolCalls > 1 ? 's' : ''}
            </Badge>
          )}
          
          {forwardMessageUsed && (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/40 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Response preserved (forward_message)
            </Badge>
          )}

          {delegations.length > 0 && !forwardMessageUsed && (
            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/40">
              ⚠️ Response synthesized
            </Badge>
          )}
        </div>

        {/* Info Box */}
        {forwardMessageUsed && (
          <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 border border-border">
            <p>
              ✨ <strong>Optimized:</strong> Ankie used <code className="text-foreground">forward_message</code> to preserve 
              the specialist's response without rewriting (LangGraph 2025 best practice).
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
