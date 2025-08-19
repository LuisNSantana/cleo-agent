"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { 
  CheckCircleIcon,
  LinkBreakIcon,
  ArrowSquareOutIcon,
  PuzzlePieceIcon,
  CirclesFourIcon,
  LinkIcon
} from "@phosphor-icons/react"
import { useState, useEffect } from "react"
import Image from 'next/image'

type ServiceStatus = "connected" | "disconnected" | "connecting"

interface ServiceConnection {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  status: ServiceStatus
  connectedAccount?: string
}

// Custom icon components
const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/google-calendar.svg" 
    alt="Google Calendar"
    width={16}
    height={16}
    className={className}
  />
)

const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/google-drive.svg" 
    alt="Google Drive"
    width={16}
    height={16}
    className={className}
  />
)

const NotionIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/notion-icon.svg" 
    alt="Notion"
    width={16}
    height={16}
    className={className}
  />
)

const GmailIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/gmail-icon.svg" 
    alt="Gmail"
    width={16}
    height={16}
    className={className}
  />
)

export function ConnectionStatus({ asPanel = false }: { asPanel?: boolean }) {
  const [services, setServices] = useState<ServiceConnection[]>([
    {
      id: "google-calendar",
      name: "Google Calendar",
      icon: GoogleCalendarIcon,
      status: "disconnected"
    },
    {
      id: "google-drive", 
      name: "Google Drive",
      icon: GoogleDriveIcon,
      status: "disconnected"
    },
    {
      id: "gmail",
      name: "Gmail",
      icon: GmailIcon,
      status: "disconnected"
    },
    {
      id: "notion",
      name: "Notion", 
      icon: NotionIcon,
      status: "disconnected"
    }
  ])

  const [isOpen, setIsOpen] = useState(false)
  const [lastCheck, setLastCheck] = useState<number>(0)

  useEffect(() => {
    checkConnectionStatus()
    
    // Auto-refresh every 30 seconds and when popover opens
    const interval = setInterval(checkConnectionStatus, 30000)
    
    // Listen for connection updates from other parts of the app
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'connection-updated') {
        checkConnectionStatus()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const checkConnectionStatus = async () => {
    // Prevent too frequent checks
    const now = Date.now()
    if (now - lastCheck < 2000) return // Min 2 seconds between checks
    setLastCheck(now)
    
    try {
      const statusPromises = services.map(async (service) => {
        try {
          const response = await fetch(`/api/connections/${service.id}/status`)
          if (response.ok) {
            const data = await response.json()
            return {
              serviceId: service.id,
              connected: data.connected,
              account: data.account
            }
          }
        } catch (error) {
          console.error(`Error checking ${service.id} status:`, error)
        }
        return {
          serviceId: service.id,
          connected: false,
          account: null
        }
      })

      const results = await Promise.all(statusPromises)
      
      setServices(prevServices => 
        prevServices.map(service => {
          const result = results.find(r => r.serviceId === service.id)
          return {
            ...service,
            status: result?.connected ? "connected" : "disconnected",
            connectedAccount: result?.account
          }
        })
      )
    } catch (error) {
      console.error("Error checking connection status:", error)
    }
  }

  const handleConnect = async (serviceId: string) => {
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === serviceId ? { ...service, status: "connecting" } : service
      )
    )

    try {
      const response = await fetch(`/api/connections/${serviceId}/connect`, {
        method: "POST"
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          // Open OAuth flow in popup window
          const authWindow = window.open(
            data.authUrl, 
            `oauth-${serviceId}`, 
            "width=500,height=600,scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no"
          )
          
          if (!authWindow) {
            throw new Error("Popup window was blocked. Please allow popups for this site.")
          }

          authWindow.focus()

          // Listen for OAuth success message from callback
          const handleMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            
            if ((event.data.type === 'oauth-success' || event.data.type === 'oauth-error') && event.data.service === serviceId) {
              window.removeEventListener('message', handleMessage)
              
              try {
                authWindow.close()
              } catch (e) {
                console.warn('Could not close auth window:', e)
              }
              
              if (event.data.success) {
                setServices(prevServices =>
                  prevServices.map(service =>
                    service.id === serviceId ? { ...service, status: "connected" } : service
                  )
                )
                
                setTimeout(async () => {
                  await checkConnectionStatus()
                  // Notify other components
                  localStorage.setItem('connection-updated', Date.now().toString())
                  window.dispatchEvent(new StorageEvent('storage', { 
                    key: 'connection-updated', 
                    newValue: Date.now().toString() 
                  }))
                  toast({
                    title: "Connected successfully",
                    description: `${serviceId.replace('-', ' ')} is now available for use`,
                  })
                }, 800)
              } else {
                setServices(prevServices =>
                  prevServices.map(service =>
                    service.id === serviceId ? { ...service, status: "disconnected" } : service
                  )
                )
                toast({
                  title: "Connection failed",
                  description: event.data.error || "Please try connecting again.",
                })
              }
            }
          }

          window.addEventListener('message', handleMessage)
          
          // Cleanup after timeout
          setTimeout(() => {
            window.removeEventListener('message', handleMessage)
            if (!authWindow.closed) {
              authWindow.close()
            }
            setServices(prevServices =>
              prevServices.map(service =>
                service.id === serviceId && service.status === "connecting"
                  ? { ...service, status: "disconnected" }
                  : service
              )
            )
          }, 300000) // 5 minutes timeout
        }
      } else {
        throw new Error("Failed to initiate connection")
      }
    } catch (error) {
      console.error("Error connecting service:", error)
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === serviceId ? { ...service, status: "disconnected" } : service
        )
      )
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to connect service",
      })
    }
  }

  const connectedCount = services.filter(s => s.status === "connected").length
  const connectingCount = services.filter(s => s.status === "connecting").length
  const totalCount = services.length

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case "connected": return "text-green-600 dark:text-green-400"
      case "connecting": return "text-yellow-600 dark:text-yellow-400"  
      default: return "text-gray-500 dark:text-gray-400"
    }
  }

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case "connected": return <CheckCircleIcon className="size-3 text-green-600 dark:text-green-400" />
      case "connecting": return <ArrowSquareOutIcon className="size-3 text-orange-500 dark:text-orange-400 animate-pulse" />
      default: return <LinkIcon className="size-3 text-gray-400 dark:text-gray-500" />
    }
  }

  const panelContent = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Service Integrations</h3>
        <Badge variant="outline" className="text-xs">
          {connectedCount}/{totalCount} active
        </Badge>
      </div>
      
      <div className="space-y-3">
        {services.map((service) => {
          const IconComponent = service.icon
          const isConnected = service.status === "connected"
          const isConnecting = service.status === "connecting"
          
          return (
            <div key={service.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <IconComponent className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {service.name}
                  </div>
                  {service.connectedAccount && (
                    <div className="text-xs text-muted-foreground truncate">
                      {service.connectedAccount}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-1 ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                  <span className="text-xs">
                    {service.status === "connected" ? "Active" : 
                     service.status === "connecting" ? "Connecting..." : "Inactive"}
                  </span>
                </div>
                {!isConnected && !isConnecting && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleConnect(service.id)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">
          {connectedCount === 0 
            ? "Connect services to unlock powerful integrations with your data."
            : connectedCount === totalCount 
              ? "🎉 All integrations active! Your data is fully connected."
              : `${connectedCount} of ${totalCount} integrations connected. Connect more for full functionality.`
          }
        </p>
        {connectedCount > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400">
            💡 Try asking: "Show my unread emails", "Show my recent files", or "What's on my calendar today?"
          </p>
        )}
      </div>
    </div>
  )

  if (asPanel) {
    return (
      <div className="w-full">
        {panelContent}
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (open) {
        // Refresh status when opening popover
        checkConnectionStatus()
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`size-9 p-0 rounded-full relative transition-colors ${
            connectingCount > 0
              ? 'border-orange-200 hover:border-orange-300 dark:border-orange-800 dark:hover:border-orange-700 animate-pulse' 
              : connectedCount === 0 
                ? 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700' 
                : connectedCount < totalCount
                  ? 'border-orange-200 hover:border-orange-300 dark:border-orange-800 dark:hover:border-orange-700' 
                  : 'border-green-200 hover:border-green-300 dark:border-green-800 dark:hover:border-green-700'
          }`}
          aria-label={
            connectingCount > 0
              ? `Service integrations - ${connectingCount} connecting, ${connectedCount} active`
              : connectedCount === 0 
                ? "Service integrations - No connections active"
                : connectedCount === totalCount 
                  ? `Service integrations - All ${totalCount} services connected`
                  : `Service integrations - ${connectedCount} of ${totalCount} services connected`
          }
        >
          {connectingCount > 0 ? (
            <CirclesFourIcon className="size-4 text-orange-500 dark:text-orange-400 animate-pulse" />
          ) : connectedCount === 0 ? (
            <PuzzlePieceIcon className="size-4 text-gray-500 dark:text-gray-400" />
          ) : connectedCount < totalCount ? (
            <CirclesFourIcon className="size-4 text-orange-500 dark:text-orange-400" />
          ) : (
            <CirclesFourIcon className="size-4 text-green-600 dark:text-green-400" />
          )}
          {(connectedCount > 0 || connectingCount > 0) && (
            <Badge 
              variant="secondary"
              className={`absolute -top-1 -right-1 size-4 p-0 text-[10px] border-0 ${
                connectingCount > 0 
                  ? 'bg-orange-500 text-white animate-pulse' 
                  : connectedCount === totalCount 
                    ? 'bg-green-500 text-white' 
                    : 'bg-orange-500 text-white'
              }`}
            >
              {connectingCount > 0 ? connectingCount : connectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start" 
        side="top"
        sideOffset={8}
      >
        {panelContent}
      </PopoverContent>
    </Popover>
  )
}
