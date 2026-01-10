"use client"

import { motion } from "framer-motion"
import { CheckIcon, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useI18n } from "@/lib/i18n"

// Locale-aware pricing content
const getPricingContent = (locale: string) => {
  const content: Record<string, { badge: string; title: string; subtitle: string; betaTitle: string; betaDescription: string; compareLink: string; mostPopular: string }> = {
    en: {
      badge: "Pricing",
      title: "Plans for every need",
      subtitle: "From free to enterprise. Choose the plan that fits your workflow.",
      betaTitle: "Beta - Preliminary Pricing",
      betaDescription: "We're in beta. Paid subscriptions will be available soon. Final pricing may vary based on community feedback.",
      compareLink: "View full plan comparison",
      mostPopular: "Most Popular",
    },
    es: {
      badge: "Precios",
      title: "Planes para cada necesidad",
      subtitle: "Desde free hasta enterprise. Elige el plan que mejor se adapte a tu flujo de trabajo.",
      betaTitle: "Beta - Precios Preliminares",
      betaDescription: "Estamos en beta. Las suscripciones de pago estarán disponibles próximamente. Los precios finales pueden variar según el feedback de la comunidad.",
      compareLink: "Ver comparación completa de planes",
      mostPopular: "Más Popular",
    },
    pt: {
      badge: "Preços",
      title: "Planos para cada necessidade",
      subtitle: "Do grátis ao enterprise. Escolha o plano que melhor se adapta ao seu fluxo de trabalho.",
      betaTitle: "Beta - Preços Preliminares",
      betaDescription: "Estamos em beta. Assinaturas pagas estarão disponíveis em breve. Os preços finais podem variar com base no feedback da comunidade.",
      compareLink: "Ver comparação completa de planos",
      mostPopular: "Mais Popular",
    },
    fr: {
      badge: "Tarifs",
      title: "Des plans pour chaque besoin",
      subtitle: "Du gratuit à l'entreprise. Choisissez le plan adapté à votre flux de travail.",
      betaTitle: "Bêta - Tarifs Préliminaires",
      betaDescription: "Nous sommes en bêta. Les abonnements payants seront bientôt disponibles. Les prix finaux peuvent varier selon les retours de la communauté.",
      compareLink: "Voir la comparaison complète des plans",
      mostPopular: "Le Plus Populaire",
    },
    de: {
      badge: "Preise",
      title: "Pläne für jeden Bedarf",
      subtitle: "Von kostenlos bis Enterprise. Wählen Sie den Plan, der zu Ihrem Workflow passt.",
      betaTitle: "Beta - Vorläufige Preise",
      betaDescription: "Wir sind in der Beta-Phase. Bezahlte Abonnements werden bald verfügbar sein. Die endgültigen Preise können je nach Community-Feedback variieren.",
      compareLink: "Vollständigen Planvergleich anzeigen",
      mostPopular: "Am Beliebtesten",
    },
  }
  return content[locale] || content.en
}

const getTiers = (locale: string) => {
  const tiers: Record<string, Array<{ name: string; price: string; description: string; features: string[]; cta: string; href: string; popular: boolean }>> = {
    en: [
      { name: "Free", price: "$0", description: "Perfect to get started", features: ["1,000 monthly credits (Beta)", "Basic chat with Ankie", "3 predefined agents", "7-day history"], cta: "Start Free", href: "/chat", popular: false },
      { name: "Pro", price: "Coming Soon", description: "For professionals", features: ["2,500 monthly credits", "All predefined agents", "Unlimited history", "Full integrations", "Priority support"], cta: "View Details", href: "/pricing", popular: true },
      { name: "Business", price: "Custom", description: "For teams", features: ["Unlimited credits", "Custom agents", "On-premise deployment", "SSO & enterprise security", "Dedicated support"], cta: "Contact Us", href: "/pricing", popular: false },
    ],
    es: [
      { name: "Free", price: "$0", description: "Perfecto para empezar", features: ["1,000 créditos mensuales (Beta)", "Chat básico con Ankie", "3 agentes predefinidos", "Historial 7 días"], cta: "Comenzar Gratis", href: "/chat", popular: false },
      { name: "Pro", price: "Próximamente", description: "Para profesionales", features: ["2,500 créditos mensuales", "Todos los agentes predefinidos", "Historial ilimitado", "Integraciones completas", "Soporte prioritario"], cta: "Ver Detalles", href: "/pricing", popular: true },
      { name: "Business", price: "Custom", description: "Para equipos", features: ["Créditos ilimitados", "Agentes personalizados", "On-premise deployment", "SSO y seguridad enterprise", "Soporte dedicado"], cta: "Contactar", href: "/pricing", popular: false },
    ],
    pt: [
      { name: "Free", price: "$0", description: "Perfeito para começar", features: ["1.000 créditos mensais (Beta)", "Chat básico com Ankie", "3 agentes predefinidos", "Histórico de 7 dias"], cta: "Começar Grátis", href: "/chat", popular: false },
      { name: "Pro", price: "Em breve", description: "Para profissionais", features: ["2.500 créditos mensais", "Todos os agentes", "Histórico ilimitado", "Integrações completas", "Suporte prioritário"], cta: "Ver Detalhes", href: "/pricing", popular: true },
      { name: "Business", price: "Personalizado", description: "Para equipes", features: ["Créditos ilimitados", "Agentes personalizados", "Implantação on-premise", "SSO e segurança enterprise", "Suporte dedicado"], cta: "Contato", href: "/pricing", popular: false },
    ],
    fr: [
      { name: "Gratuit", price: "0€", description: "Parfait pour commencer", features: ["1 000 crédits mensuels (Bêta)", "Chat de base avec Ankie", "3 agents prédéfinis", "Historique 7 jours"], cta: "Commencer Gratuit", href: "/chat", popular: false },
      { name: "Pro", price: "Bientôt", description: "Pour les pros", features: ["2 500 crédits mensuels", "Tous les agents", "Historique illimité", "Intégrations complètes", "Support prioritaire"], cta: "Voir les Détails", href: "/pricing", popular: true },
      { name: "Business", price: "Sur mesure", description: "Pour les équipes", features: ["Crédits illimités", "Agents personnalisés", "Déploiement on-premise", "SSO et sécurité enterprise", "Support dédié"], cta: "Nous Contacter", href: "/pricing", popular: false },
    ],
    de: [
      { name: "Kostenlos", price: "0€", description: "Perfekt zum Starten", features: ["1.000 monatliche Credits (Beta)", "Basis-Chat mit Ankie", "3 vordefinierte Agenten", "7-Tage-Verlauf"], cta: "Kostenlos Starten", href: "/chat", popular: false },
      { name: "Pro", price: "Demnächst", description: "Für Profis", features: ["2.500 monatliche Credits", "Alle Agenten", "Unbegrenzter Verlauf", "Volle Integrationen", "Prioritäts-Support"], cta: "Details Ansehen", href: "/pricing", popular: true },
      { name: "Business", price: "Individuell", description: "Für Teams", features: ["Unbegrenzte Credits", "Benutzerdefinierte Agenten", "On-Premise Deployment", "SSO & Enterprise-Sicherheit", "Dedizierter Support"], cta: "Kontakt", href: "/pricing", popular: false },
    ],
  }
  return tiers[locale] || tiers.en
}

export function PricingSection() {
  const { locale } = useI18n()
  const content = getPricingContent(locale)
  const tiers = getTiers(locale)
  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background pointer-events-none" />
      
      <div className="relative max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4">
            <span suppressHydrationWarning>{content.badge}</span>
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span suppressHydrationWarning>{content.title}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <span suppressHydrationWarning>{content.subtitle}</span>
          </p>
        </motion.div>

        {/* Beta Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-12"
        >
          <Card className="border-amber-500/50 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  <span suppressHydrationWarning>{content.betaTitle}</span>
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  <span suppressHydrationWarning>{content.betaDescription}</span>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                tier.popular 
                  ? "border-brand-violet/50 bg-card/80 shadow-xl shadow-brand-violet/10 scale-105 ring-1 ring-brand-violet/20" 
                  : "border-border/50 bg-card/50 hover:bg-card/80 hover:shadow-lg hover:border-border"
              } backdrop-blur-xl`}>
                {tier.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-cyan to-brand-violet border-0"
                    variant="default"
                  >
                    <span suppressHydrationWarning>{content.mostPopular}</span>
                  </Badge>
                )}
                
                <div className="p-8 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tier.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      {tier.price !== "Custom" && tier.price !== "Próximamente" && (
                        <span className="text-muted-foreground">/mes</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    variant={tier.popular ? "default" : "outline"}
                    className={`w-full group ${tier.popular ? 'bg-gradient-to-r from-brand-cyan to-brand-violet hover:opacity-90 border-0' : ''}`}
                  >
                    <Link href={tier.href} className="flex items-center justify-center gap-2">
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button variant="ghost" asChild>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              <span suppressHydrationWarning>{content.compareLink}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
