'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

export function ShopifySetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-sm font-medium text-green-800">
              ¿Cómo obtener mi API Key de Shopify?
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-green-600 hover:text-green-800"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="text-sm text-green-700">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium">Acceder a tu tienda Shopify</p>
                  <p className="text-green-600 mt-1">
                    Inicia sesión en tu panel de administración de Shopify en{' '}
                    <a
                      href="https://admin.shopify.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-800 inline-flex items-center gap-1"
                    >
                      admin.shopify.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium">Ir a Apps</p>
                  <p className="text-green-600 mt-1">
                    En el menú lateral, busca y haz clic en "Apps" (o "Aplicaciones").
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium">Desarrollar apps</p>
                  <p className="text-green-600 mt-1">
                    Haz clic en "Desarrollar apps" (o "Develop apps") al final de la página de Apps.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  4
                </span>
                <div>
                  <p className="font-medium">Crear una app privada</p>
                  <p className="text-green-600 mt-1">
                    Haz clic en "Crear una app" y dale un nombre como "Cleo Agent API".
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  5
                </span>
                <div>
                  <p className="font-medium">Configurar permisos</p>
                  <p className="text-green-600 mt-1">
                    Ve a "Configuración de la API" → "Admin API access tokens" y configura los permisos que necesites (productos, pedidos, clientes, etc.).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  6
                </span>
                <div>
                  <p className="font-medium">Obtener Access Token</p>
                  <p className="text-green-600 mt-1">
                    Haz clic en "Instalar app" y luego copia el "Admin API access token" que se genera.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  7
                </span>
                <div>
                  <p className="font-medium">Obtener tu Shop Domain</p>
                  <p className="text-green-600 mt-1">
                    Tu Shop Domain es el nombre de tu tienda, por ejemplo: "mi-tienda.myshopify.com"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-700">
                <p className="font-medium">Información importante:</p>
                <p>Necesitarás tanto el Access Token como tu Shop Domain. El Access Token es como una contraseña, manténlo seguro y nunca lo compartas.</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}