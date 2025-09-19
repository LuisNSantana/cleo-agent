import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, ExternalLink, Copy } from 'lucide-react'

export function TwitterSetupGuide() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🐦 Cómo obtener tu API Key de Twitter/X
          <Badge variant="outline" className="text-xs">Guía paso a paso</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Paso 1 */}
        <div className="border rounded-lg">
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto"
            onClick={() => toggleSection('step1')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.step1 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-medium">1. Crear cuenta de desarrollador</span>
            </div>
          </Button>
          {expandedSections.step1 && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Ve a <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  developer.twitter.com <ExternalLink className="w-3 h-3" />
                </a> y solicita acceso de desarrollador.
              </p>
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <strong>Importante:</strong> El proceso toma 1-3 días hábiles para aprobación.
              </div>
            </div>
          )}
        </div>

        {/* Paso 2 */}
        <div className="border rounded-lg">
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto"
            onClick={() => toggleSection('step2')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.step2 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-medium">2. Crear nueva App</span>
            </div>
          </Button>
          {expandedSections.step2 && (
            <div className="px-4 pb-4 space-y-2">
              <div className="space-y-2 text-sm">
                <p>En tu Dashboard de desarrollador:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Haz clic en "Create App"</li>
                  <li>Nombre: "Cleo Agent Integration"</li>
                  <li>Descripción: Tu caso de uso</li>
                  <li>Selecciona "Making a bot or automated system"</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Paso 3 */}
        <div className="border rounded-lg">
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto"
            onClick={() => toggleSection('step3')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.step3 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-medium">3. Configurar permisos</span>
            </div>
          </Button>
          {expandedSections.step3 && (
            <div className="px-4 pb-4 space-y-2">
              <div className="space-y-2 text-sm">
                <p>En la configuración de tu app:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Ve a "User Authentication Settings"</li>
                  <li>Selecciona "Read and Write" permissions</li>
                  <li>Tipo: "Web App, Automated App or Bot"</li>
                  <li>Callback URL: <code className="bg-muted px-1 rounded">https://tudominio.com/callback</code></li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Paso 4 */}
        <div className="border rounded-lg">
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto"
            onClick={() => toggleSection('step4')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.step4 ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-medium">4. Obtener credenciales</span>
            </div>
          </Button>
          {expandedSections.step4 && (
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-2 text-sm">
                <p>En la pestaña "Keys and Tokens":</p>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <span><strong>API Key</strong> (Consumer Key)</span>
                    <Badge variant="secondary">Cópialo</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <span><strong>API Secret</strong> (Consumer Secret)</span>
                    <Badge variant="secondary">Cópialo</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <span><strong>Access Token</strong></span>
                    <Badge variant="secondary">Generar y copiar</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <span><strong>Access Token Secret</strong></span>
                    <Badge variant="secondary">Generar y copiar</Badge>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  💡 Necesitas los 4 valores para completar la configuración abajo
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={() => {
              setExpandedSections({
                step1: true,
                step2: true, 
                step3: true,
                step4: true
              })
            }}
            variant="outline" 
            size="sm"
            className="w-full"
          >
            Expandir todos los pasos
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}