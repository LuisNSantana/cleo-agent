"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Database,
  Unplug,
  Loader2
} from "lucide-react"
import { TelegramChannelManager } from "@/components/integrations/telegram-channel-manager"

// Tipos de integración disponibles
type IntegrationType = 'google-workspace' | 'twitter' | 'notion' | 'shopify' | 'instagram' | 'facebook' | 'wordpress' | 'telegram'

interface Integration {
  id: IntegrationType
  name: string
  description: string
  icon: string
  iconElement?: React.ReactNode // Para iconos Lucide (opcional)
  status: 'connected' | 'disconnected' | 'configuring'
  category: 'productivity' | 'ecommerce' | 'automation' | 'search' | 'social'
  features: string[]
  requiresOAuth: boolean // Indica si usa OAuth 2.0
}

const integrations: Integration[] = [
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Gmail, Calendar, Drive, Docs, Sheets - Full productivity suite with OAuth 2.0',
    icon: '/icons/google.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center shadow-lg">
        <img src="/icons/google.png" alt="Google" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'productivity',
    features: ['Gmail integration', 'Calendar management', 'Drive file access', 'Docs & Sheets creation', 'OAuth 2.0 secure login'],
    requiresOAuth: true
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Social media management and content posting with OAuth 2.0',
    icon: '/icons/x_twitter.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-black to-gray-800 flex items-center justify-center shadow-lg">
        <img src="/icons/x_twitter.png" alt="Twitter/X" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'social',
    features: ['Tweet posting', 'Timeline reading', 'DM management', 'Analytics tracking', 'Secure OAuth connection'],
    requiresOAuth: true
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Share photos, stories and engage with your Instagram audience',
    icon: '/icons/instagram.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg">
        <img src="/icons/instagram.png" alt="Instagram" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'social',
    features: ['Post photos & videos', 'Stories management', 'Comments & DMs', 'Analytics insights', 'OAuth 2.0 integration'],
    requiresOAuth: true
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Manage your Facebook pages and engage with your community',
    icon: '/icons/facebook.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
        <img src="/icons/facebook.png" alt="Facebook" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'social',
    features: ['Page management', 'Post scheduling', 'Comments & messages', 'Insights & analytics', 'OAuth 2.0 secure'],
    requiresOAuth: true
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace management and content organization with OAuth 2.0',
    icon: '/icons/notion-icon.svg',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-black flex items-center justify-center shadow-lg">
        <img src="/icons/notion-icon.svg" alt="Notion" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'productivity',
    features: ['Create pages', 'Manage databases', 'Organize content', 'Team collaboration', 'OAuth 2.0 connection'],
    requiresOAuth: true
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce store management and analytics with OAuth 2.0',
    icon: '/icons/shopify.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
        <img src="/icons/shopify.png" alt="Shopify" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'ecommerce',
    features: ['Store analytics', 'Order management', 'Product updates', 'Customer insights', 'OAuth 2.0 secure'],
    requiresOAuth: true
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Manage your WordPress blog and publish content automatically',
    icon: '/icons/wordpress.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow-lg">
        <img src="/icons/wordpress.png" alt="WordPress" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'productivity',
    features: ['Post publishing', 'Media management', 'Comments moderation', 'SEO optimization', 'OAuth 2.0 integration'],
    requiresOAuth: true
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Bot management and automated messaging on Telegram',
    icon: '/icons/telegram.png',
    iconElement: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
        <img src="/icons/telegram.png" alt="Telegram" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'social',
    features: ['Bot creation', 'Message automation', 'Group management', 'Channel broadcasting', 'Secure connection'],
    requiresOAuth: false // Telegram uses Bot API token, not OAuth
  }
]

export default function IntegrationsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [oauthMessage, setOauthMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [disconnectDialog, setDisconnectDialog] = useState<{
    isOpen: boolean
    service: IntegrationType | null
    serviceName: string
    isDisconnecting: boolean
  }>({
    isOpen: false,
    service: null,
    serviceName: '',
    isDisconnecting: false
  })
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, Integration['status']>>({
    'google-workspace': 'disconnected',
    'twitter': 'disconnected',
    'notion': 'disconnected',
    'shopify': 'disconnected',
    'instagram': 'disconnected',
    'facebook': 'disconnected',
    'wordpress': 'disconnected',
    'telegram': 'disconnected'
  })
  const [expandedIntegration, setExpandedIntegration] = useState<IntegrationType | null>(null)

  // Handler for OAuth-based connections
  const handleOAuthConnect = (service: IntegrationType) => {
    // Prevenir múltiples clics mientras hay una conexión en progreso
    const connectingFlag = sessionStorage.getItem(`${service}_connecting`)
    if (connectingFlag) {
      const timestamp = parseInt(connectingFlag)
      const elapsed = Date.now() - timestamp
      
      // Si han pasado menos de 30 segundos, no permitir reconexión
      if (elapsed < 30000) {
        console.warn(`⚠️ Connection to ${service} already in progress (${Math.floor(elapsed / 1000)}s ago)`)
        setOauthMessage({
          type: 'error',
          text: `⏳ Connection to ${service} is already in progress. Please wait...`
        })
        setTimeout(() => setOauthMessage(null), 5000)
        return
      }
    }
    
    // Marcar que estamos conectando
    sessionStorage.setItem(`${service}_connecting`, Date.now().toString())
    console.log(`🔗 Initiating OAuth connection for ${service}`)
    
    // Twitter requiere redirección completa debido a políticas de cookies
    // No funciona bien en popups
    if (service === 'twitter') {
      window.location.href = `/api/connections/${service}/connect`
      return
    }
    
    // Para otros servicios, usar popup
    const width = 600
    const height = 700
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    
    const popup = window.open(
      `/api/connections/${service}/connect`,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )
    
    if (!popup) {
      setOauthMessage({
        type: 'error',
        text: '❌ Please allow popups for this site'
      })
      return
    }

    // Listen for OAuth completion message
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'oauth-success' && event.data.service) {
        console.log(`✅ OAuth success for ${event.data.service}`)
        setOauthMessage({
          type: 'success',
          text: `✅ ${service} connected successfully!`
        })
        // Refresh status for this service
        updateIntegrationStatus(event.data.service)
        window.removeEventListener('message', messageHandler)
        
        // Auto-hide success message
        setTimeout(() => setOauthMessage(null), 7000)
      } else if (event.data.type === 'oauth-error') {
        console.error(`❌ OAuth error for ${event.data.service}`)
        setOauthMessage({
          type: 'error',
          text: `❌ Failed to connect ${service}. Please try again.`
        })
        window.removeEventListener('message', messageHandler)
        
        // Auto-hide error message
        setTimeout(() => setOauthMessage(null), 7000)
      }
    }
    
    window.addEventListener('message', messageHandler)
  }

  // Abrir modal de confirmación para desconectar
  const handleDisconnectClick = (service: IntegrationType, serviceName: string) => {
    setDisconnectDialog({
      isOpen: true,
      service,
      serviceName,
      isDisconnecting: false
    })
  }

  // Ejecutar desconexión
  const handleDisconnectConfirm = async () => {
    const { service } = disconnectDialog
    if (!service) return

    setDisconnectDialog(prev => ({ ...prev, isDisconnecting: true }))

    try {
      const response = await fetch(`/api/connections/${service}/disconnect`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      // Actualizar estado local
      setIntegrationStatuses(prev => ({
        ...prev,
        [service]: 'disconnected'
      }))

      // Mostrar mensaje de éxito
      setOauthMessage({
        type: 'success',
        text: `✅ ${disconnectDialog.serviceName} disconnected successfully`
      })

      setTimeout(() => setOauthMessage(null), 5000)

      // Cerrar modal
      setDisconnectDialog({
        isOpen: false,
        service: null,
        serviceName: '',
        isDisconnecting: false
      })
    } catch (error) {
      console.error(`Error disconnecting ${service}:`, error)
      
      setOauthMessage({
        type: 'error',
        text: `❌ Failed to disconnect ${disconnectDialog.serviceName}. Please try again.`
      })

      setTimeout(() => setOauthMessage(null), 7000)

      setDisconnectDialog(prev => ({ ...prev, isDisconnecting: false }))
    }
  }

  // Cancelar desconexión
  const handleDisconnectCancel = () => {
    setDisconnectDialog({
      isOpen: false,
      service: null,
      serviceName: '',
      isDisconnecting: false
    })
  }

  // Verificar parámetros de URL para mensajes de OAuth
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    // Limpiar flags de conexión en progreso
    if (success || error) {
      const services: IntegrationType[] = ['google-workspace', 'twitter', 'notion', 'shopify', 'instagram', 'facebook', 'wordpress', 'telegram']
      services.forEach(service => {
        sessionStorage.removeItem(`${service}_connecting`)
      })
    }
    
    if (success) {
      const messages: Record<string, string> = {
        'twitter_connected': '✅ Twitter conectado exitosamente!',
        'notion_connected': '✅ Notion conectado exitosamente!',
        'shopify_connected': '✅ Shopify conectado exitosamente!',
        'instagram_connected': '✅ Instagram conectado exitosamente!',
        'facebook_connected': '✅ Facebook conectado exitosamente!',
        'wordpress_connected': '✅ WordPress conectado exitosamente!',
        'telegram_connected': '✅ Telegram conectado exitosamente!',
        'google_connected': '✅ Google Workspace conectado exitosamente!'
      }
      setOauthMessage({type: 'success', text: messages[success] || '✅ Integración conectada exitosamente!'})
      
      // Actualizar el estado de la integración que se conectó
      const serviceName = success.replace('_connected', '') as IntegrationType
      if (serviceName) {
        updateIntegrationStatus(serviceName)
      }
      
      // Limpiar URL
      window.history.replaceState({}, '', '/integrations')
      // Auto-cerrar después de 5 segundos
      setTimeout(() => setOauthMessage(null), 5000)
    }
    
    if (error) {
      // Mensajes específicos por tipo de error
      const errorMessages: Record<string, string> = {
        'rate_limit_exceeded': '⏱️ Twitter está limitando las solicitudes. Por favor espera 15 minutos e intenta de nuevo.',
        'authorization_failed': '❌ Autorización fallida. Verifica tus credenciales en el Developer Portal.',
        'session_expired': '⏰ La sesión expiró. Por favor intenta conectar de nuevo.',
        'connection_failed': '❌ Error de conexión. Por favor intenta de nuevo.',
        'callback_failed': '❌ Error en el proceso de autorización. Por favor intenta de nuevo.',
        'no_code': '❌ No se recibió código de autorización. Por favor intenta de nuevo.',
        'unsupported_service': '❌ Servicio no soportado.',
        'database_error': '❌ Error de base de datos. Por favor contacta soporte.'
      }
      
      const errorText = errorMessages[error] || `❌ Error al conectar. Por favor intenta de nuevo.`
      setOauthMessage({type: 'error', text: errorText})
      
      // Limpiar URL
      window.history.replaceState({}, '', '/integrations')
      // Auto-cerrar después de 10 segundos para rate limit, 7 para otros
      const timeout = error === 'rate_limit_exceeded' ? 15000 : 7000
      setTimeout(() => setOauthMessage(null), timeout)
    }
  }, [])

  // Función para verificar el estado de cualquier conexión OAuth
  const checkConnectionStatus = async (service: IntegrationType): Promise<Integration['status']> => {
    try {
      const response = await fetch(`/api/connections/${service}/status`)
      if (!response.ok) {
        console.log(`[${service}] Status API response not ok:`, response.status)
        return 'disconnected'
      }
      
      const data = await response.json()
      console.log(`[${service}] Status API response:`, data)
      
      return data.connected ? 'connected' : 'disconnected'
    } catch (error) {
      console.error(`Error checking ${service} status:`, error)
      return 'disconnected'
    }
  }

  // Actualizar estado de una integración específica
  const updateIntegrationStatus = async (service: IntegrationType) => {
    const status = await checkConnectionStatus(service)
    setIntegrationStatuses(prev => ({ ...prev, [service]: status }))
  }

  // Cargar estados reales al montar el componente
  useEffect(() => {
    const loadIntegrationStatuses = async () => {
      const newStatuses: Record<string, Integration['status']> = {}
      
      // Verificar todas las integraciones usando el endpoint unificado /api/connections/[service]/status
      const services: IntegrationType[] = ['google-workspace', 'twitter', 'notion', 'shopify', 'instagram', 'facebook', 'wordpress', 'telegram']
      
      await Promise.all(
        services.map(async (service) => {
          newStatuses[service] = await checkConnectionStatus(service)
        })
      )
      
      setIntegrationStatuses(newStatuses)
    }

    loadIntegrationStatuses()
  }, [])

  // Función para refrescar todos los estados
  const refreshAllStatuses = async () => {
    setIsRefreshing(true)
    
    try {
      const newStatuses: Record<string, Integration['status']> = {}
      
      const services: IntegrationType[] = ['google-workspace', 'twitter', 'notion', 'shopify', 'instagram', 'facebook', 'wordpress', 'telegram']
      
      await Promise.all(
        services.map(async (service) => {
          newStatuses[service] = await checkConnectionStatus(service)
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

  // Combinar las integraciones base con los estados dinámicos
  const integrationsWithDynamicStatus = integrations.map(integration => ({
    ...integration,
    status: integrationStatuses[integration.id] || integration.status
  }))

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Mensaje de OAuth (success/error) */}
          {oauthMessage && (
            <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-2xl border-2 animate-in slide-in-from-right-5 ${
              oauthMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-100' 
                : 'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/40 dark:border-red-600 dark:text-red-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{oauthMessage.text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOauthMessage(null)}
                  className="ml-4"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-6">
              <Settings className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
              Integrations
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Connect your favorite accounts and services to supercharge Ankie's capabilities with productivity, e-commerce, and automation tools
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
                      {integration.iconElement}
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

                  {/* Botones de conexión */}
                  {integration.requiresOAuth ? (
                    <div className="space-y-3">
                      {integration.status === 'connected' ? (
                        <>
                          {/* Botón de estado conectado */}
                          <Button
                            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50 font-semibold cursor-default"
                            disabled
                          >
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span>Connected</span>
                            </div>
                          </Button>
                          
                          {/* Botón de desconectar */}
                          <Button
                            onClick={() => handleDisconnectClick(integration.id, integration.name)}
                            variant="outline"
                            className="w-full border-2 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-700/50 transition-all duration-300 font-medium group"
                          >
                            <div className="flex items-center space-x-2">
                              <Unplug className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                              <span>Disconnect</span>
                            </div>
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleOAuthConnect(integration.id)}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                        >
                          <div className="flex items-center space-x-2">
                            <Settings className="w-4 h-4" />
                            <span>Connect Account</span>
                          </div>
                        </Button>
                      )}
                    </div>
                  ) : integration.id === 'telegram' ? (
                    // Telegram custom UI (non-OAuth)
                    <div className="space-y-3">
                      {expandedIntegration === 'telegram' ? (
                        <div className="space-y-4">
                          <Button
                            variant="ghost"
                            onClick={() => setExpandedIntegration(null)}
                            className="w-full text-sm"
                          >
                            ← Back
                          </Button>
                          <TelegramChannelManager />
                        </div>
                      ) : (
                        <Button
                          onClick={() => setExpandedIntegration('telegram')}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                        >
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>Manage Channels</span>
                          </div>
                        </Button>
                      )}
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

          {/* Información adicional */}
          <div className="mt-12 p-6 bg-muted/50 dark:bg-slate-800/60 rounded-lg border border-border dark:border-slate-700/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Why connect integrations?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">🤖 Smart Automation</h4>
                <p className="text-sm text-muted-foreground">
                  Enable Ankie to interact directly with your favorite tools,
                  automating repetitive tasks and complex workflows.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔒 Guaranteed Security</h4>
                <p className="text-sm text-muted-foreground">
                  All credentials are stored securely and encrypted using OAuth 2.0.
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
                  One-click connection with secure OAuth 2.0 authentication.
                  No API keys or passwords to copy-paste.
                </p>
              </div>
            </div>
          </div>

          {/* Modal de confirmación para desconectar */}
          <Dialog open={disconnectDialog.isOpen} onOpenChange={(open) => {
            if (!open && !disconnectDialog.isDisconnecting) {
              handleDisconnectCancel()
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Unplug className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Disconnect {disconnectDialog.serviceName}?</DialogTitle>
                  </div>
                </div>
                <DialogDescription className="text-base pt-2">
                  This will remove the connection to your {disconnectDialog.serviceName} account. 
                  You can reconnect anytime, but you'll need to authorize access again.
                </DialogDescription>
              </DialogHeader>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 my-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">What happens when you disconnect:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-300">
                      <li>Ankie will no longer be able to access your {disconnectDialog.serviceName} account</li>
                      <li>Any scheduled automations using this integration will stop working</li>
                      <li>Your data remains safe in your {disconnectDialog.serviceName} account</li>
                    </ul>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleDisconnectCancel}
                  disabled={disconnectDialog.isDisconnecting}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnectConfirm}
                  disabled={disconnectDialog.isDisconnecting}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 order-1 sm:order-2"
                >
                  {disconnectDialog.isDisconnecting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Disconnecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Unplug className="w-4 h-4" />
                      <span>Disconnect</span>
                    </div>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
  )
}