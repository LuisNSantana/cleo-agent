"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import {
  Brain,
  Lightning,
  Users,
  ChartBar,
  Code,
  Palette,
  Database,
  Globe,
  Shield,
  Sparkle,
  Rocket,
  Check,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Brain,
    title: 'Intelligent Orchestration',
    description: 'Multi-agent system that delegates tasks to specialized AI teammates',
    color: 'from-purple-500 to-pink-500',
    features: ['Smart task routing', 'Context-aware decisions', 'Autonomous execution'],
  },
  {
    icon: Lightning,
    title: 'Lightning Fast',
    description: 'Optimized performance with smart caching and parallel processing',
    color: 'from-yellow-500 to-orange-500',
    features: ['Sub-second responses', 'Parallel agent execution', 'Hybrid cache system'],
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Built for teams with real-time collaboration and shared workspaces',
    color: 'from-blue-500 to-cyan-500',
    features: ['Shared projects', 'Real-time sync', 'Role-based access'],
  },
  {
    icon: ChartBar,
    title: 'Analytics & Insights',
    description: 'Deep visibility into agent performance and productivity metrics',
    color: 'from-green-500 to-emerald-500',
    features: ['Performance tracking', 'Usage analytics', 'Custom dashboards'],
  },
  {
    icon: Code,
    title: 'Developer Tools',
    description: 'Powerful APIs and integrations for developers',
    color: 'from-indigo-500 to-purple-500',
    features: ['REST & GraphQL APIs', 'Webhook support', 'SDK libraries'],
  },
  {
    icon: Database,
    title: 'Knowledge Base',
    description: 'RAG-powered search across your documents and data',
    color: 'from-red-500 to-pink-500',
    features: ['Vector search', 'Document indexing', 'Semantic retrieval'],
  },
  {
    icon: Globe,
    title: 'Multi-Language',
    description: 'Works in 10+ languages with auto-detection',
    color: 'from-teal-500 to-cyan-500',
    features: ['Auto language detection', 'Real-time translation', 'Localized UI'],
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption',
    color: 'from-gray-600 to-gray-800',
    features: ['E2E encryption', 'SOC 2 Type II', 'GDPR compliant'],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export function FeaturesSection() {
  const { t } = useI18n()

  return (
    <section id="features" data-landing-search data-landing-search-title="Features" data-landing-search-type="section" className="relative w-full overflow-hidden bg-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl 2xl:max-w-[90rem]">
        {/* Section header */}
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 px-6 py-2.5 text-sm font-bold text-primary shadow-lg shadow-primary/20"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{ 
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 10px 40px rgba(var(--primary), 0.2)",
                "0 10px 50px rgba(var(--primary), 0.3)",
                "0 10px 40px rgba(var(--primary), 0.2)"
              ]
            }}
            transition={{ delay: 0.2, duration: 3, repeat: Infinity, repeatType: "reverse" }}
          >
            <Sparkle weight="fill" className="h-5 w-5" />
            Powerful Features
          </motion.div>
          
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {t.landing.featuresTitle}
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground sm:text-2xl">
            {t.landing.featuresSubtitle}
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card
                data-landing-search
                data-landing-search-title={feature.title}
                data-landing-search-type="feature"
                className="group relative h-full overflow-hidden rounded-2xl border-2 border-border/60 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-8 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20"
              >
                {/* Animated gradient glow on hover */}
                <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 blur transition duration-500 group-hover:opacity-20`} />

                {/* Content wrapper */}
                <div className="relative">
                  {/* Icon with enhanced effects */}
                  <motion.div 
                    className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-xl transition-transform duration-300 group-hover:scale-110`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon weight="duotone" className="h-full w-full text-white" />
                  </motion.div>

                  {/* Title */}
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>

                  {/* Feature list with enhanced styling */}
                  <ul className="space-y-2.5">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${feature.color} p-1`}>
                          <Check weight="bold" className="h-full w-full text-white" />
                        </div>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom accent bar with animation */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r ${feature.color}`}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom highlight + CTA */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="mx-auto max-w-3xl text-balance text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90">
            And hundreds more capabilities ready for you to explore
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Button size="lg" className="group rounded-full px-8 py-6 text-base font-bold shadow-xl transition-all hover:shadow-2xl hover:shadow-primary/30" asChild>
              <a href="/auth" className="flex items-center gap-2">
                Try a live demo
                <Rocket weight="bold" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
