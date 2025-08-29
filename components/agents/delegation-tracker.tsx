'use client'

import { useClientAgentStore } from '@/lib/agents/client-store'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Clock, User, MessageSquare } from 'lucide-react'

export function DelegationTracker() {
  const { delegationEvents } = useClientAgentStore()

  if (delegationEvents.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Delegation Log</h3>
        </div>
        <div className="text-muted-foreground text-xs">
          No delegations yet. Execute a task to see routing decisions.
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="w-4 h-4 text-blue-500" />
        <h3 className="font-medium text-sm">Delegation Log</h3>
        <Badge variant="secondary" className="text-xs">
          {delegationEvents.length}
        </Badge>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {delegationEvents.slice(-5).reverse().map((event, index) => (
          <div key={`${event.timestamp}-${index}`} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg text-xs">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 text-green-600" />
                <span className="font-mono font-medium text-green-600">{event.from}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono font-medium text-blue-600">{event.to}</span>
              </div>
              
              <div className="text-muted-foreground mb-1">{event.reason}</div>
              
              {event.query && (
                <div className="flex items-start gap-1 text-muted-foreground">
                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="truncate">"{event.query.substring(0, 50)}..."</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
