'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

export function SerpAPISetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-800">
              ¿Cómo obtener mi API Key de SerpAPI?
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800"
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
          <div className="text-sm text-blue-700">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium">Crear cuenta en SerpAPI</p>
                  <p className="text-blue-600 mt-1">
                    Ve a{' '}
                    <a
                      href="https://serpapi.com/users/sign_up"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      serpapi.com/users/sign_up
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    y crea tu cuenta gratuita.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium">Acceder al Dashboard</p>
                  <p className="text-blue-600 mt-1">
                    Una vez registrado, inicia sesión y ve a tu{' '}
                    <a
                      href="https://serpapi.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium">Encontrar tu API Key</p>
                  <p className="text-blue-600 mt-1">
                    En el dashboard, busca la sección "Your Private API Key". Copia el valor que aparece allí.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  4
                </span>
                <div>
                  <p className="font-medium">Pegar tu API Key</p>
                  <p className="text-blue-600 mt-1">
                    Copia tu API Key y pégala en el campo "API Key" de abajo. ¡Ya está listo!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-700">
                <p className="font-medium">Límites del plan gratuito:</p>
                <p>El plan gratuito incluye 100 búsquedas por mes. Si necesitas más, puedes actualizar tu plan en cualquier momento.</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}