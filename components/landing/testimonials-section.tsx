"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Star, ShieldCheck, Lock, Eye } from '@phosphor-icons/react'

// Real productivity metrics - No fake testimonials
const productivityStats = [
  {
    metric: '10x',
    title: 'Faster Task Completion',
    description: 'Tasks that took hours now complete in minutes with AI agent automation',
    icon: Star,
  },
  {
    metric: '20+',
    title: 'Hours Saved Weekly',
    description: 'Average time saved per user by delegating repetitive work to AI agents',
    icon: Star,
  },
  {
    metric: '95%',
    title: 'Task Success Rate',
    description: 'AI agents complete delegated tasks accurately without human intervention',
    icon: Star,
  },
  {
    metric: '5min',
    title: 'Average Setup Time',
    description: 'From signup to first successful task delegation',
    icon: Star,
  },
  {
    metric: '24/7',
    title: 'Always Available',
    description: 'Your AI team never sleeps, takes breaks, or needs vacation days',
    icon: Star,
  },
  {
    metric: '8',
    title: 'Specialized Agents',
    description: 'Each expert in their domain: marketing, code, support, research, and more',
    icon: Star,
  },
]

const securityFeatures = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data encrypted in transit and at rest',
  },
  {
    icon: ShieldCheck,
    title: 'SOC 2 Type II',
    description: 'Independently audited and certified',
  },
  {
    icon: Eye,
    title: 'Privacy First',
    description: 'Your data never used for training',
  },
]

export function TestimonialsSection() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Testimonials */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-12 text-center">
            <motion.div
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Star weight="fill" className="h-4 w-4" />
              Testimonials
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t.landing.testimonialsTitle}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {t.landing.testimonialsSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productivityStats.map((stat, index) => (
              <motion.div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -5 }}
              >
                {/* Metric */}
                <div className="mb-3 flex items-center gap-2">
                  <stat.icon weight="fill" className="h-5 w-5 text-primary" />
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {stat.metric}
                  </div>
                </div>

                {/* Title */}
                <h3 className="mb-2 font-semibold text-foreground">
                  {stat.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-8 backdrop-blur-sm sm:p-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Gradient orb */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative">
            <div className="mb-8 text-center">
              <motion.div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <ShieldCheck weight="duotone" className="h-4 w-4" />
                Security
              </motion.div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t.landing.securityTitle}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                {t.landing.securitySubtitle}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {securityFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 p-3">
                    <feature.icon weight="duotone" className="h-full w-full text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Badges */}
            <motion.div
              className="mt-12 flex flex-wrap items-center justify-center gap-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-4 py-2">
                <ShieldCheck weight="fill" className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-4 py-2">
                <ShieldCheck weight="fill" className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-4 py-2">
                <Lock weight="fill" className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">256-bit Encryption</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
