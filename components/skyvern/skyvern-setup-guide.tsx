'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

export function SkyvernSetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-sm font-medium text-purple-800">
              ¿Cómo obtener mi API Key de Skyvern?
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-600 hover:text-purple-800"
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
          <div className="text-sm text-purple-700">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium">Crear cuenta en Skyvern</p>
                  <p className="text-purple-600 mt-1">
                    Ve a{' '}
                    <a
                      href="https://app.skyvern.com/auth/sign-up"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-purple-800 inline-flex items-center gap-1"
                    >
                      app.skyvern.com/auth/sign-up
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    y regístrate con tu email.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium">Verificar email</p>
                  <p className="text-purple-600 mt-1">
                    Revisa tu email y verifica tu cuenta haciendo clic en el enlace de confirmación.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium">Acceder al Dashboard</p>
                  <p className="text-purple-600 mt-1">
                    Inicia sesión en{' '}
                    <a
                      href="https://app.skyvern.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-purple-800 inline-flex items-center gap-1"
                    >
                      app.skyvern.com
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    con tu cuenta.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  4
                </span>
                <div>
                  <p className="font-medium">Ir a Settings</p>
                  <p className="text-purple-600 mt-1">
                    En el dashboard, busca el menú "Settings" o "Configuración" (generalmente en la barra lateral o menú de usuario).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  5
                </span>
                <div>
                  <p className="font-medium">Generar API Key</p>
                  <p className="text-purple-600 mt-1">
                    Busca la sección "API Keys" o "Developer Settings" y haz clic en "Generate New API Key" o "Create API Key".
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  6
                </span>
                <div>
                  <p className="font-medium">Copiar tu API Key</p>
                  <p className="text-purple-600 mt-1">
                    Una vez generada, copia tu API Key. ¡Guárdala en un lugar seguro porque solo se muestra una vez!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  7
                </span>
                <div>
                  <p className="font-medium">Obtener Base URL</p>
                  <p className="text-purple-600 mt-1">
                    La Base URL suele ser "https://api.skyvern.com" o similar. Revisa la documentación de la API o los settings para confirmar.
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
                <p>Skyvern es una plataforma de automatización web. Necesitarás tanto la API Key como la Base URL. Mantén tu API Key segura y no la compartas públicamente.</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}