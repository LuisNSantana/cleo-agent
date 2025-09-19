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
  Zap
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
    icon: <Mail className="w-8 h-8" />,
    status: 'connected',
    category: 'productivity',
    features: ['Gmail integration', 'Calendar management', 'Drive file access', 'Docs & Sheets creation', 'Real-time collaboration']
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Social media management and content posting',
    icon: <Globe className="w-8 h-8" />,
    status: 'disconnected',
    category: 'social',
    features: ['Tweet posting', 'Timeline reading', 'DM management', 'Analytics tracking']
  },
  {
    id: 'serpapi',
    name: 'SerpAPI',
    description: 'Advanced web search and data retrieval',
    icon: <Search className="w-8 h-8" />,
    status: 'disconnected',
    category: 'search',
    features: ['Web search', 'Local search', 'News search', 'Scholar search', 'Maps integration']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce store management and analytics',
    icon: <Store className="w-8 h-8" />,
    status: 'disconnected',
    category: 'ecommerce',
    features: ['Store analytics', 'Order management', 'Product updates', 'Customer insights']
  },
  {
    id: 'skyvern',
    name: 'Skyvern',
    description: 'AI-powered web automation and browser interactions',
    icon: <Globe className="w-8 h-8" />,
    status: 'disconnected',
    category: 'automation',
    features: ['Web scraping', 'Form filling', 'Data extraction', 'Workflow automation']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace management and content organization',
    icon: <FileText className="w-8 h-8" />,
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
        return 'text-green-600 bg-green-50 border-green-200'
      case 'configuring':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
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
        return 'bg-blue-100 text-blue-800'
      case 'ecommerce':
        return 'bg-green-100 text-green-800'
      case 'automation':
        return 'bg-purple-100 text-purple-800'
      case 'search':
        return 'bg-orange-100 text-orange-800'
      case 'social':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Integraciones que tienen CredentialsManager disponible
  const availableIntegrations = ['twitter', 'serpapi', 'shopify', 'skyvern', 'notion'] as IntegrationType[]

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Integraciones</h1>
            <p className="text-muted-foreground">
              Conecta tus cuentas y servicios para potenciar las capacidades de Cleo Agent
            </p>
          </div>

          {/* Grid de integraciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {integrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {integration.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getCategoryColor(integration.category)}`}
                        >
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border ${getStatusColor(integration.status)}`}>
                      {getStatusIcon(integration.status)}
                      <span className="text-xs font-medium capitalize">
                        {integration.status === 'connected' ? 'Conectado' :
                         integration.status === 'configuring' ? 'Configurando' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <CardDescription className="mb-4">
                    {integration.description}
                  </CardDescription>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Características:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {integration.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {integration.id === 'google-workspace' ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => window.open('/api/connections/google-workspace/connect', '_blank')}
                        className="w-full"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? '✓ Conectado' : 'Conectar cuenta'}
                      </Button>
                    </div>
                  ) : availableIntegrations.includes(integration.id) ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => setSelectedIntegration(integration.id as CredentialType)}
                        className="w-full"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? 'Administrar API Key' : 'Configurar API Key'}
                      </Button>
                      <Button
                        onClick={() => {
                          const docsMap = {
                            'twitter': '/docs/integrations/twitter-x-setup.md',
                            'notion': '/docs/integrations/notion-setup.md'
                          };
                          const docUrl = docsMap[integration.id as keyof typeof docsMap];
                          if (docUrl) {
                            window.open(docUrl, '_blank');
                          }
                        }}
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={!['twitter', 'notion'].includes(integration.id)}
                      >
                        📖 Guía de configuración
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