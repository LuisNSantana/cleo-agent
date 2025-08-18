"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { 
  CheckCircleIcon,
  LinkBreakIcon,
  ArrowSquareOutIcon
} from "@phosphor-icons/react"
import { useState, useEffect } from "react"
import { Tables } from '@/lib/database.types'
import Image from 'next/image'

type ServiceStatus = "connected" | "disconnected" | "connecting"
type UserServiceConnection = Tables<'user_service_connections'>

// Custom icon components using the SVG files
const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/google-calendar.svg" 
    alt="Google Calendar"
    width={24}
    height={24}
    className={className}
  />
)

const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/google-drive.svg" 
    alt="Google Drive"
    width={24}
    height={24}
    className={className}
  />
)

const NotionIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/notion-icon.svg" 
    alt="Notion"
    width={24}
    height={24}
    className={className}
  />
)

const GmailIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/gmail-icon.svg" 
    alt="Gmail"
    width={24}
    height={24}
    className={className}
  />
)

interface ServiceConnection {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: ServiceStatus
  connectedAccount?: string
  scopes: string[]
}

export function ServiceConnections() {
  const [services, setServices] = useState<ServiceConnection[]>([
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Connect your Google Calendar to manage events and schedule meetings",
      icon: GoogleCalendarIcon,
      status: "disconnected",
      scopes: ["calendar.readonly", "calendar.events"]
    },
    {
      id: "google-drive",
      name: "Google Drive",
      description: "Access and manage your Google Drive files and documents",
      icon: GoogleDriveIcon,
      status: "disconnected",
      scopes: ["drive.readonly", "drive.file"]
    },
    {
      id: "gmail",
      name: "Gmail",
      description: "Read, label, and send emails from your Gmail account",
      icon: GmailIcon,
      status: "disconnected",
      scopes: ["gmail.readonly", "gmail.modify", "gmail.send"]
    },
    {
      id: "notion",
      name: "Notion",
      description: "Connect to your Notion workspace to read and create pages",
      icon: NotionIcon,
      status: "disconnected",
      scopes: ["read_content", "insert_content"]
    }
  ])

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // First, clean up any stale connections
      await fetch('/api/connections/cleanup', { method: 'POST' })
      
      // Check status for each service individually
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
          // Open OAuth flow in popup window with specific features to prevent double windows
          const authWindow = window.open(
            data.authUrl, 
            `oauth-${serviceId}`, 
            "width=500,height=600,scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no"
          )
          
          // Check if window was blocked
          if (!authWindow) {
            throw new Error("Popup window was blocked. Please allow popups for this site.")
          }

          // Focus the popup window to prevent background opening
          authWindow.focus()

          // Listen for OAuth success message from callback
          const handleMessage = async (event: MessageEvent) => {
            // Only accept messages from same-origin for security
            if (event.origin !== window.location.origin) return
            console.log('🔧 [OAuth] Received message:', event.data)
            
            if ((event.data.type === 'oauth-success' || event.data.type === 'oauth-error') && event.data.service === serviceId) {
              console.log('🔧 [OAuth] Processing OAuth result:', event.data)
              window.removeEventListener('message', handleMessage)
              window.removeEventListener('focus', handleFocus)
              
              // Close the auth window
              try {
                authWindow.close()
              } catch (e) {
                console.warn('Could not close auth window:', e)
              }
              
              if (event.data.success) {
                // Update UI immediately to show success
                setServices(prevServices =>
                  prevServices.map(service =>
                    service.id === serviceId ? { ...service, status: "connected" } : service
                  )
                )
                
                // Wait briefly for the callback to persist tokens, then re-check
                setTimeout(async () => {
                  await checkConnectionStatus()
                  // Notify other components about the connection update
                  localStorage.setItem('connection-updated', Date.now().toString())
                  window.dispatchEvent(new StorageEvent('storage', { 
                    key: 'connection-updated', 
                    newValue: Date.now().toString() 
                  }))
                  toast({
                    title: "Connection successful",
                    description: `Successfully connected to ${serviceId.replace('-', ' ')}`,
                  })
                }, 800)
              } else {
                // Handle error case
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

          // Fallback: Listen for window focus to detect when user returns from OAuth
          const handleFocus = async () => {
            console.log('🔧 [OAuth] Window focus detected, checking if auth window is closed')
            // Check if the auth window is closed
            if (authWindow.closed) {
              console.log('🔧 [OAuth] Auth window is closed, cleaning up')
              window.removeEventListener('focus', handleFocus)
              window.removeEventListener('message', handleMessage)
              
              // Reset status if still connecting (user might have cancelled)
              setServices(prevServices =>
                prevServices.map(service =>
                  service.id === serviceId && service.status === "connecting"
                    ? { ...service, status: "disconnected" }
                    : service
                )
              )
              
              // Wait a moment for the callback to process
              setTimeout(async () => {
                await checkConnectionStatus()
              }, 1000)
            }
          }

          window.addEventListener('message', handleMessage)
          window.addEventListener('focus', handleFocus)
          
          // Fallback: Stop checking after 5 minutes
          setTimeout(() => {
            window.removeEventListener('focus', handleFocus)
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
          }, 300000)
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

  const handleDisconnect = async (serviceId: string) => {
    try {
      // Update UI immediately to show disconnecting
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === serviceId 
            ? { ...service, status: "disconnected", connectedAccount: undefined }
            : service
        )
      )
      
      const response = await fetch(`/api/connections/${serviceId}/disconnect`, {
        method: "POST"
      })
      
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: `Successfully disconnected from ${services.find(s => s.id === serviceId)?.name}`,
        })
        // Refresh status to confirm and notify other components
        await checkConnectionStatus()
        localStorage.setItem('connection-updated', Date.now().toString())
        window.dispatchEvent(new StorageEvent('storage', { 
          key: 'connection-updated', 
          newValue: Date.now().toString() 
        }))
      } else {
        throw new Error("Failed to disconnect")
      }
    } catch (error) {
      console.error("Error disconnecting service:", error)
      // Revert UI on error
      await checkConnectionStatus()
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect from the service. Please try again.",
      })
    }
  }

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircleIcon className="mr-1 size-3" />
            Connected
          </Badge>
        )
      case "connecting":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <ArrowSquareOutIcon className="mr-1 size-3" />
            Connecting...
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <LinkBreakIcon className="mr-1 size-3" />
            Not connected
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Service Connections</h3>
        <p className="text-muted-foreground text-sm">
          Connect external services to extend Cleo's capabilities
        </p>
      </div>
      
      <div className="space-y-4">
        {services.map((service) => {
          const IconComponent = service.icon
          
          return (
            <Card key={service.id} className="relative" data-service-id={service.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <IconComponent className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    {service.connectedAccount && (
                      <p className="text-sm text-muted-foreground">
                        Connected as: {service.connectedAccount}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {service.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {service.status === "connected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(service.id)}
                      >
                        <LinkBreakIcon className="mr-2 size-4" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(service.id)}
                        disabled={service.status === "connecting"}
                      >
                        {service.status === "connecting" ? (
                          <>
                            <ArrowSquareOutIcon className="mr-2 size-4" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="mr-2 size-4" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
