'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

export function NotionSetupGuide() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-sm font-medium text-gray-800">
              ¿Cómo obtener mi API Key de Notion?
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-gray-800"
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
          <div className="text-sm text-gray-700">
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium">Ir a Notion Developers</p>
                  <p className="text-gray-600 mt-1">
                    Ve a{' '}
                    <a
                      href="https://www.notion.so/my-integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-800 inline-flex items-center gap-1"
                    >
                      notion.so/my-integrations
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    e inicia sesión con tu cuenta de Notion.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium">Crear nueva integración</p>
                  <p className="text-gray-600 mt-1">
                    Haz clic en "New integration" (Nueva integración).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium">Configurar integración</p>
                  <p className="text-gray-600 mt-1">
                    Dale un nombre como "Cleo Agent", selecciona el workspace que deseas y haz clic en "Submit".
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  4
                </span>
                <div>
                  <p className="font-medium">Copiar Internal Integration Token</p>
                  <p className="text-gray-600 mt-1">
                    En la página de tu integración, busca "Internal Integration Token" y haz clic en "Show" para ver el token. Cópialo.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  5
                </span>
                <div>
                  <p className="font-medium">Compartir páginas con la integración</p>
                  <p className="text-gray-600 mt-1">
                    Ve a las páginas/bases de datos de Notion que quieres que acceda Cleo. Haz clic en "Share" → "Invite" y busca tu integración para darle acceso.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                  6
                </span>
                <div>
                  <p className="font-medium">Obtener Database ID (opcional)</p>
                  <p className="text-gray-600 mt-1">
                    Si quieres trabajar con una base de datos específica, copia su ID de la URL. Por ejemplo: en "notion.so/database/abc123", el ID es "abc123".
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">Permisos importantes:</p>
                <p>Recuerda compartir específicamente las páginas y bases de datos que quieres que Cleo pueda acceder. Sin esto, la integración no funcionará.</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}