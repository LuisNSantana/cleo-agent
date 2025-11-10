"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CreditDisplay } from "@/app/components/credits/credit-display"
import { useCreditBalance } from "@/app/hooks/use-credit-balance"
import { 
  CreditCard, 
  User, 
  Crown, 
  TrendingUp,
  Calendar,
  AlertCircle,
  ExternalLink,
  Info
} from "lucide-react"
// Alert component will be created if it doesn't exist
import Link from "next/link"

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("credits")
  
  // Credit balance using custom hook - same as header
  const { balance: creditBalance, loading: loadingCredits } = useCreditBalance()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Mi Cuenta
          </h1>
          <p className="text-muted-foreground">
            Administra tus créditos, suscripción y configuración de cuenta
          </p>
        </motion.div>

        {/* Beta Notice */}
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  Beta - Funcionalidades Limitadas
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  Estamos en beta. Las suscripciones y compra de créditos estarán disponibles próximamente. 
                  Los precios finales pueden variar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Créditos</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Suscripción</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6 md:grid-cols-2"
            >
              {/* Current Balance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Balance Actual
                  </CardTitle>
                  <CardDescription>
                    Tus créditos disponibles para usar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreditDisplay 
                    balance={creditBalance} 
                    loading={loadingCredits}
                    variant="full"
                  />
                </CardContent>
              </Card>

              {/* Usage Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Uso Mensual
                  </CardTitle>
                  <CardDescription>
                    Estadísticas de este mes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingCredits ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : creditBalance ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Créditos usados</span>
                          <span className="font-semibold">
                            {creditBalance.used_credits.toLocaleString()} / {creditBalance.total_credits.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={creditBalance.usage_percentage} className="h-2" />
                      </div>
                      
                      <div className="pt-4 border-t space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Plan actual</span>
                          <span className="font-medium capitalize">{creditBalance.plan}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Créditos restantes</span>
                          <span className="font-medium">{creditBalance.remaining_credits.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No se pudo cargar el balance
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Buy Credits CTA */}
            <Card className="border-dashed border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="font-semibold text-lg">¿Necesitas más créditos?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Compra créditos adicionales o actualiza tu plan
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" disabled>
                      Comprar Créditos
                      <Badge variant="secondary" className="ml-2">Próximamente</Badge>
                    </Button>
                    <Button asChild>
                      <Link href="/pricing">
                        Ver Planes
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Plan Actual
                  </CardTitle>
                  <CardDescription>
                    Administra tu suscripción y plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Plan */}
                  {loadingCredits ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : creditBalance ? (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <h3 className="font-semibold text-lg capitalize">Plan {creditBalance.plan}</h3>
                        <p className="text-sm text-muted-foreground">
                          {creditBalance.total_credits.toLocaleString()} créditos mensuales
                        </p>
                      </div>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {creditBalance.plan === 'free' ? '$0/mes' : 'Próximamente'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No se pudo cargar el plan
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Incluye:</h4>
                    <ul className="space-y-2">
                      {[
                        "Chat básico con Cleo",
                        "3 agentes predefinidos",
                        "Historial 7 días",
                        "Soporte comunitario"
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Upgrade CTA */}
                  <div className="pt-6 border-t">
                    <Card className="border-blue-500/30 bg-blue-500/5">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-sm mb-1">Beta - Suscripciones Próximamente</h4>
                            <p className="text-sm text-muted-foreground">
                              Las suscripciones de pago estarán disponibles pronto. Explora nuestros planes disponibles.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Button className="w-full mt-4" asChild>
                      <Link href="/pricing">
                        Ver Todos los Planes
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Información de Cuenta
                  </CardTitle>
                  <CardDescription>
                    Administra tu información personal y preferencias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          La gestión completa de perfil estará disponible próximamente. 
                          Mientras tanto, puedes actualizar tu configuración en{" "}
                          <button 
                            className="font-medium underline underline-offset-4"
                            onClick={() => {
                              const event = new CustomEvent('open-settings', { detail: { tab: 'general' } })
                              window.dispatchEvent(event)
                            }}
                          >
                            Settings
                          </button>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
