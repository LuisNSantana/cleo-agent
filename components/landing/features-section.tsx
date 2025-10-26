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
    <section className="relative overflow-hidden bg-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Sparkle weight="fill" className="h-4 w-4" />
            Features
          </motion.div>
          
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t.landing.featuresTitle}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t.landing.featuresSubtitle}
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="group relative h-full overflow-hidden border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

                {/* Icon */}
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} p-2.5 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon weight="duotone" className="h-full w-full text-white" />
                </div>

                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {feature.description}
                </p>

                {/* Feature list */}
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check weight="bold" className={`mt-0.5 h-3 w-3 shrink-0 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Hover indicator */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${feature.color}`}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm text-muted-foreground">
            And hundreds more capabilities...
          </p>
        </motion.div>
      </div>
    </section>
  )
}
