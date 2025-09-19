"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import CredentialsManager from "@/components/common/CredentialsManager"
import { TwitterCredentialsManager } from "@/components/twitter/twitter-credentials-manager"
import { SerpapiCredentialsManager } from "@/components/serpapi/serpapi-credentials-manager"
import {
  Store,
  Globe,
  FileText,
  Mail,
  Calendar,
  HardDrive,
  Search,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  Zap,
  Bot,
  ShoppingBag,
  MessageSquare,
  Database
} from "lucide-react"

// Tipos de integración disponibles
type IntegrationType = 'google-workspace' | 'twitter' | 'serpapi' | 'shopify' | 'skyvern' | 'notion'
type CredentialType = 'twitter' | 'serpapi' | 'shopify' | 'skyvern' | 'notion'

interface Integration {
  id: IntegrationType
  name: string
  description: string
  icon: React.ReactNode
  status: 'connected' | 'disconnected' | 'configuring'
  category: 'productivity' | 'ecommerce' | 'automation' | 'search' | 'social'
  features: string[]
}

const integrations: Integration[] = [
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Gmail, Calendar, Drive, Docs, Sheets - Full productivity suite',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center shadow-lg">
        <img src="/icons/google.png" alt="Google" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected', // Will be overridden by dynamic status
    category: 'productivity',
    features: ['Gmail integration', 'Calendar management', 'Drive file access', 'Docs & Sheets creation', 'Real-time collaboration']
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Social media management and content posting',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-black to-gray-800 flex items-center justify-center shadow-lg">
        <img src="/icons/x_twitter.png" alt="Twitter/X" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected', // Will be overridden by dynamic status
    category: 'social',
    features: ['Tweet posting', 'Timeline reading', 'DM management', 'Analytics tracking']
  },
  {
    id: 'serpapi',
    name: 'SerpAPI',
    description: 'Advanced web search and data retrieval',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
        <Search className="w-5 h-5 text-white" />
      </div>
    ),
    status: 'disconnected', // Will be overridden by dynamic status
    category: 'search',
    features: ['Web search', 'Local search', 'News search', 'Scholar search', 'Maps integration']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce store management and analytics',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
        <img src="/icons/shopify.png" alt="Shopify" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected', // Will be overridden by dynamic status
    category: 'ecommerce',
    features: ['Store analytics', 'Order management', 'Product updates', 'Customer insights']
  },
  {
    id: 'skyvern',
    name: 'Skyvern',
    description: 'AI-powered web automation and browser interactions',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
        <Bot className="w-5 h-5 text-white" />
      </div>
    ),
    status: 'disconnected', // Will be overridden by dynamic status
    category: 'automation',
    features: ['Web scraping', 'Form filling', 'Data extraction', 'Workflow automation']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace management and content organization',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-black flex items-center justify-center shadow-lg">
        <img src="/icons/notion-icon.svg" alt="Notion" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected', // Will be overridden by dynamic status
    category: 'productivity',
    features: ['Create pages', 'Manage databases', 'Organize content', 'Team collaboration']
  }
]

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<CredentialType | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, Integration['status']>>({
    'google-workspace': 'connected', // Google Workspace siempre conectado
    'twitter': 'disconnected',
    'serpapi': 'disconnected', 
    'shopify': 'disconnected',
    'skyvern': 'disconnected',
    'notion': 'disconnected'
  })

  // Función para verificar el estado de las credenciales
  const checkCredentialStatus = async (serviceType: string): Promise<Integration['status']> => {
    try {
      const response = await fetch(`/api/${serviceType}/credentials`)
      if (!response.ok) {
        console.log(`[${serviceType}] API response not ok:`, response.status)
        return 'disconnected'
      }
      
      const data = await response.json()
      console.log(`[${serviceType}] API response:`, data)
      
      if (data.success && data.credentials && data.credentials.length > 0) {
        // Verificar si hay al menos una credencial activa
        const hasActiveCredential = data.credentials.some((cred: any) => cred.is_active || cred.active)
        console.log(`[${serviceType}] Has active credential:`, hasActiveCredential)
        return hasActiveCredential ? 'connected' : 'disconnected'
      }
      return 'disconnected'
    } catch (error) {
      console.error(`Error checking ${serviceType} credentials:`, error)
      return 'disconnected'
    }
  }

  // Verificar estado de Google Workspace
  const checkGoogleWorkspaceStatus = async (): Promise<Integration['status']> => {
    try {
      const response = await fetch('/api/connections/google-workspace/status')
      if (!response.ok) return 'disconnected'
      
      const data = await response.json()
      return data.connected ? 'connected' : 'disconnected'
    } catch (error) {
      console.error('Error checking Google Workspace status:', error)
      return 'disconnected'
    }
  }

  // Cargar estados reales al montar el componente
  useEffect(() => {
    const loadIntegrationStatuses = async () => {
      const newStatuses: Record<string, Integration['status']> = {}
      
      // Verificar Google Workspace
      newStatuses['google-workspace'] = await checkGoogleWorkspaceStatus()
      
      // Verificar servicios con API keys
      const services = ['twitter', 'serpapi', 'shopify', 'skyvern', 'notion']
      await Promise.all(
        services.map(async (service) => {
          newStatuses[service] = await checkCredentialStatus(service)
        })
      )
      
      setIntegrationStatuses(newStatuses)
    }

    loadIntegrationStatuses()
  }, [])

  // Función para actualizar el estado de una integración específica
  const updateIntegrationStatus = async (integrationId: string) => {
    let newStatus: Integration['status']
    
    if (integrationId === 'google-workspace') {
      newStatus = await checkGoogleWorkspaceStatus()
    } else {
      newStatus = await checkCredentialStatus(integrationId)
    }
    
    setIntegrationStatuses(prev => ({
      ...prev,
      [integrationId]: newStatus
    }))
  }

  // Función para refrescar todos los estados
  const refreshAllStatuses = async () => {
    setIsRefreshing(true)
    
    try {
      const newStatuses: Record<string, Integration['status']> = {}
      
      // Verificar Google Workspace
      newStatuses['google-workspace'] = await checkGoogleWorkspaceStatus()
      
      // Verificar servicios con API keys
      const services = ['twitter', 'serpapi', 'shopify', 'skyvern', 'notion']
      await Promise.all(
        services.map(async (service) => {
          newStatuses[service] = await checkCredentialStatus(service)
        })
      )
      
      setIntegrationStatuses(newStatuses)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-sm dark:text-emerald-400 dark:bg-emerald-900/40 dark:border-emerald-600/60'
      case 'configuring':
        return 'text-amber-700 bg-amber-50 border-amber-200 shadow-sm dark:text-amber-400 dark:bg-amber-900/40 dark:border-amber-600/60'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 shadow-sm dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-600/60'
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4" />
      case 'configuring':
        return <Settings className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: Integration['category']) => {
    switch (category) {
      case 'productivity':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/60'
      case 'ecommerce':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/60'
      case 'automation':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/60'
      case 'search':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/60'
      case 'social':
        return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700/60'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600/60'
    }
  }

  // Integraciones que tienen CredentialsManager disponible
  const availableIntegrations = ['twitter', 'serpapi', 'shopify', 'skyvern', 'notion'] as IntegrationType[]

  // Combinar las integraciones base con los estados dinámicos
  const integrationsWithDynamicStatus = integrations.map(integration => ({
    ...integration,
    status: integrationStatuses[integration.id] || integration.status
  }))

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-6">
              <Settings className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
              Integrations
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Connect your favorite accounts and services to supercharge Cleo Agent's capabilities with productivity, e-commerce, and automation tools
            </p>
            
            {/* Botón de refresh */}
            <div className="flex justify-center mb-6">
              <Button
                onClick={refreshAllStatuses}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
              </Button>
            </div>
            
            {/* Stats de integraciones */}
            <div className="flex justify-center space-x-8 text-sm mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-muted-foreground">
                  {integrationsWithDynamicStatus.filter(i => i.status === 'connected').length} Connected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                <span className="text-muted-foreground">
                  {integrationsWithDynamicStatus.filter(i => i.status === 'disconnected').length} Available
                </span>
              </div>
            </div>

            {/* Botón de refresh */}
            <div className="flex justify-center mb-8">
              <Button
                onClick={refreshAllStatuses}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
              </Button>
            </div>
          </div>

          {/* Grid de integraciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
            {integrationsWithDynamicStatus.map((integration) => (
              <Card 
                key={integration.id} 
                className={`group transition-all duration-500 border-0 relative overflow-hidden
                  bg-gradient-to-br from-background to-muted/20 
                  dark:from-slate-800/90 dark:to-slate-900/50 dark:border dark:border-slate-700/50
                  ${integration.status === 'connected' 
                    ? 'shadow-lg shadow-emerald-100 dark:shadow-emerald-500/20 border-2 border-emerald-200 dark:border-emerald-600/60 hover:shadow-xl hover:shadow-emerald-200 dark:hover:shadow-emerald-500/30' 
                    : 'hover:shadow-2xl hover:scale-[1.03] shadow-md dark:shadow-slate-900/50 dark:hover:shadow-slate-800/50'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {integration.status === 'connected' && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-emerald-500 rounded-full shadow-lg animate-pulse"></div>
                )}
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {integration.icon}
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center space-x-2">
                          <span>{integration.name}</span>
                          {integration.status === 'connected' && (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs border ${getCategoryColor(integration.category)} dark:bg-slate-700/60 dark:border-slate-600/60`}
                          >
                            {integration.category}
                          </Badge>
                          {integration.id === 'google-workspace' && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-700/60">
                              Direct connection
                            </Badge>
                          )}
                          {integration.id !== 'google-workspace' && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700/60">
                              Requires API key
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-2 px-3 py-2 rounded-full border-2 transition-all ${getStatusColor(integration.status)}`}>
                      {getStatusIcon(integration.status)}
                      <span className="text-xs font-semibold capitalize">
                        {integration.status === 'connected' ? 'Connected' :
                         integration.status === 'configuring' ? 'Configuring' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10">
                  <CardDescription className="mb-6 text-base leading-relaxed text-muted-foreground">
                    {integration.description}
                  </CardDescription>

                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-primary" />
                      What you can do:
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {integration.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-primary/60 mt-2 flex-shrink-0"></div>
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                      {integration.features.length > 4 && (
                        <li className="flex items-center space-x-3 text-primary text-xs font-medium">
                          <div className="w-2 h-2 rounded-full bg-primary/30"></div>
                          <span>And {integration.features.length - 4} more features...</span>
                        </li>
                      )}
                    </ul>
                  </div>

                                    {integration.id === 'google-workspace' ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => window.open('/api/connections/google-workspace/connect', '_blank')}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Settings className="w-4 h-4" />
                            <span>Connect Account</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  ) : availableIntegrations.includes(integration.id) ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => setSelectedIntegration(integration.id as CredentialType)}
                        className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? (
                          <div className="flex items-center space-x-2">
                            <Settings className="w-4 h-4" />
                            <span>Manage API Key</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4" />
                            <span>Configure API Key</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Integration not available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This integration will be available soon
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Modal de configuración para integraciones disponibles */}
          {selectedIntegration && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Configure Integration</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Actualizar estado antes de cerrar el modal
                        if (selectedIntegration) {
                          updateIntegrationStatus(selectedIntegration)
                        }
                        setSelectedIntegration(null)
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  {selectedIntegration === 'twitter' && <TwitterCredentialsManager />}
                  {selectedIntegration === 'serpapi' && <SerpapiCredentialsManager />}
                  {(selectedIntegration === 'shopify' || selectedIntegration === 'skyvern' || selectedIntegration === 'notion') && 
                    <CredentialsManager serviceType={selectedIntegration} />}
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-12 p-6 bg-muted/50 dark:bg-slate-800/60 rounded-lg border border-border dark:border-slate-700/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Why connect integrations?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">🤖 Smart Automation</h4>
                <p className="text-sm text-muted-foreground">
                  Enable Cleo Agent to interact directly with your favorite tools,
                  automating repetitive tasks and complex workflows.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔒 Guaranteed Security</h4>
                <p className="text-sm text-muted-foreground">
                  All credentials are stored securely and encrypted.
                  We never share your data with third parties.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">⚡ Enhanced Efficiency</h4>
                <p className="text-sm text-muted-foreground">
                  Reduce time spent on manual tasks and increase your productivity
                  with smart and contextual integrations.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔧 Simple Setup</h4>
                <p className="text-sm text-muted-foreground">
                  Guided configuration process with step-by-step instructions
                  for each integrated service.
                </p>
              </div>
            </div>
          </div>
        </div>
  )
}