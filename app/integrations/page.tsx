"use client"

import { useState } from "react"
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
    status: 'connected',
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
    status: 'disconnected',
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
    status: 'disconnected',
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
    status: 'disconnected',
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
    status: 'disconnected',
    category: 'automation',
    features: ['Web scraping', 'Form filling', 'Data extraction', 'Workflow automation']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace management and content organization',
    icon: (
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-black flex items-center justify-center shadow-lg">
        <img src="/icons/notion.png" alt="Notion" className="w-5 h-5" />
      </div>
    ),
    status: 'disconnected',
    category: 'productivity',
    features: ['Create pages', 'Manage databases', 'Organize content', 'Team collaboration']
  }
]

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<CredentialType | null>(null)

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-sm'
      case 'configuring':
        return 'text-amber-700 bg-amber-50 border-amber-200 shadow-sm'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200 shadow-sm'
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
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'ecommerce':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'automation':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'search':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'social':
        return 'bg-pink-100 text-pink-700 border-pink-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  // Integraciones que tienen CredentialsManager disponible
  const availableIntegrations = ['twitter', 'serpapi', 'shopify', 'skyvern', 'notion'] as IntegrationType[]

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-6">
              <Settings className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
              Integraciones
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Conecta tus cuentas y servicios favoritos para potenciar las capacidades de Cleo Agent con herramientas de productividad, e-commerce y automatización
            </p>
          </div>

          {/* Grid de integraciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
            {integrations.map((integration) => (
              <Card key={integration.id} className="group hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-background to-muted/20 hover:scale-[1.03] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {integration.icon}
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{integration.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={`text-xs mt-1 ${getCategoryColor(integration.category)}`}
                        >
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border-2 transition-all ${getStatusColor(integration.status)}`}>
                      {getStatusIcon(integration.status)}
                      <span className="text-xs font-medium capitalize">
                        {integration.status === 'connected' ? 'Conectado' :
                         integration.status === 'configuring' ? 'Configurando' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10">
                  <CardDescription className="mb-6 text-base leading-relaxed">
                    {integration.description}
                  </CardDescription>

                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-primary" />
                      Características principales:
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      {integration.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {integration.id === 'google-workspace' ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => window.open('/api/connections/google-workspace/connect', '_blank')}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? '✓ Conectado' : 'Conectar cuenta'}
                      </Button>
                    </div>
                  ) : availableIntegrations.includes(integration.id) ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => setSelectedIntegration(integration.id as CredentialType)}
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? 'Administrar API Key' : 'Configurar API Key'}
                      </Button>
                    </div>
                  ) : (
                    <Button disabled className="w-full" variant="outline">
                      Próximamente
                    </Button>
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
                    <h2 className="text-xl font-semibold">Configurar Integración</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIntegration(null)}
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
          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">¿Por qué conectar integraciones?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">🤖 Automatización Inteligente</h4>
                <p className="text-sm text-muted-foreground">
                  Permite a Cleo Agent interactuar directamente con tus herramientas favoritas,
                  automatizando tareas repetitivas y flujos de trabajo complejos.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔒 Seguridad Garantizada</h4>
                <p className="text-sm text-muted-foreground">
                  Todas las credenciales se almacenan de forma segura y encriptada.
                  Nunca compartimos tus datos con terceros.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">⚡ Eficiencia Mejorada</h4>
                <p className="text-sm text-muted-foreground">
                  Reduce el tiempo dedicado a tareas manuales y aumenta tu productividad
                  con integraciones inteligentes y contextuales.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔧 Configuración Simple</h4>
                <p className="text-sm text-muted-foreground">
                  Proceso de configuración guiado con instrucciones paso a paso
                  para cada servicio integrado.
                </p>
              </div>
            </div>
          </div>
        </div>
  )
}