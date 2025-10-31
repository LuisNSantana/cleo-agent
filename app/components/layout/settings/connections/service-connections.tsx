import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { fetchClient } from "@/lib/fetch"
import { 
  CheckCircleIcon,
  LinkBreakIcon,
  ArrowSquareOutIcon
} from "@phosphor-icons/react"
import { useState, useEffect } from "react"
import type { Tables } from '@/app/types/database.types'
import Image from 'next/image'

type ServiceStatus = "connected" | "disconnected" | "connecting"
type UserServiceConnection = Tables<'user_service_connections'>

// Service icon components
const GoogleWorkspaceIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/google.png" 
    alt="Google Workspace"
    width={24}
    height={24}
    className={className}
  />
)

const TwitterIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/icons/x_twitter.png" 
    alt="X (Twitter)"
    width={24}
    height={24}
    className={className}
  />
)

const NotionIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
  </svg>
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
      id: "google-workspace",
      name: "Google Workspace",
      description: "Connect your Google account to access Gmail, Drive, Calendar, Docs, Sheets, and Slides",
      icon: GoogleWorkspaceIcon,
      status: "disconnected",
      scopes: ["gmail", "drive", "calendar", "docs", "sheets", "slides"]
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      description: "Connect your X account to post tweets, read timelines, and manage your social presence with OAuth 2.0",
      icon: TwitterIcon,
      status: "disconnected",
      scopes: ["tweet.read", "tweet.write", "users.read"]
    },
    {
      id: "notion",
      name: "Notion",
      description: "Connect your Notion workspace to create pages, manage databases, and organize knowledge",
      icon: NotionIcon,
      status: "disconnected",
      scopes: ["read_content", "update_content", "insert_content"]
    }
  ])

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // First, clean up any stale connections
      await fetchClient('/api/connections/cleanup', { method: 'POST' })
      
      // Check status for each service individually
      const statusPromises = services.map(async (service) => {
        try {
          console.log(`[SERVICE CONNECTIONS] Fetching status for ${service.id}...`)
          const response = await fetchClient(`/api/connections/${service.id}/status`)
          console.log(`[SERVICE CONNECTIONS] Response for ${service.id}:`, response.status, response.statusText)
          
          if (response.ok) {
            const contentType = response.headers.get('content-type')
            console.log(`[SERVICE CONNECTIONS] Content-Type for ${service.id}:`, contentType)
            
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json()
              console.log(`[SERVICE CONNECTIONS] Data for ${service.id}:`, data)
              return {
                serviceId: service.id,
                connected: data.connected,
                account: data.account
              }
            } else {
              const text = await response.text()
              console.error(`[SERVICE CONNECTIONS] Non-JSON response for ${service.id}:`, text.substring(0, 200))
            }
          } else {
            const text = await response.text()
            console.error(`[SERVICE CONNECTIONS] Error response for ${service.id}:`, response.status, text.substring(0, 200))
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
      const response = await fetchClient(`/api/connections/${serviceId}/connect`, {
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
      
      const response = await fetchClient(`/api/connections/${serviceId}/disconnect`, {
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
