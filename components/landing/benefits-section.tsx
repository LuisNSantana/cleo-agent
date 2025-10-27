"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import {
  Rocket,
  Clock,
  ShieldCheck,
  Sparkle,
  TrendUp,
  Users,
} from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const benefits = [
  {
    icon: Rocket,
    title: '10x Productivity',
    description: 'Complete tasks in minutes that used to take hours',
    stat: '10x',
    statLabel: 'faster workflows',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Clock,
    title: 'Save 20+ Hours/Week',
    description: 'Automate repetitive work and focus on what matters',
    stat: '20+',
    statLabel: 'hours saved weekly',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: TrendUp,
    title: 'Measurable ROI',
    description: 'Track productivity gains with built-in analytics',
    stat: '300%',
    statLabel: 'average ROI',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Ready',
    description: 'SOC 2 compliant with enterprise-grade security',
    stat: '99.9%',
    statLabel: 'uptime SLA',
    color: 'from-orange-500 to-red-500',
  },
]

const useCases = [
  {
    title: 'Content Marketing',
    description: 'Generate blog posts, social media content, and SEO-optimized articles in minutes',
    agent: {
      name: 'Emma',
      avatar: '/img/agents/emma4.png',
    },
    users: 'Marketing Teams',
    demo: 'Writing viral tweet thread...',
  },
  {
    title: 'Software Development',
    description: 'Write, review, and debug code across multiple languages with AI assistance',
    agent: {
      name: 'Toby',
      avatar: '/img/agents/toby4.png',
    },
    users: 'Dev Teams',
    demo: 'Refactoring React component...',
  },
  {
    title: 'Customer Support',
    description: 'Automate responses, analyze tickets, and improve customer satisfaction',
    agent: {
      name: 'Apu',
      avatar: '/img/agents/apu4.png',
    },
    users: 'Support Teams',
    demo: 'Resolving customer inquiry...',
  },
  {
    title: 'Data Analysis',
    description: 'Extract insights, create visualizations, and generate reports from complex datasets',
    agent: {
      name: 'Peter',
      avatar: '/img/agents/peter4.png',
    },
    users: 'Analysts',
    demo: 'Analyzing quarterly metrics...',
  },
  {
    title: 'Community Management',
    description: 'Engage audiences, moderate discussions, and build thriving online communities',
    agent: {
      name: 'Nora',
      avatar: '/img/agents/nora4.png',
    },
    users: 'Community Managers',
    demo: 'Moderating Discord server...',
  },
  {
    title: 'Web Automation',
    description: 'Automate browser tasks, extract data, and streamline web workflows',
    agent: {
      name: 'Wex',
      avatar: '/img/agents/wex4.png',
    },
    users: 'Automation Specialists',
    demo: 'Scraping product catalog...',
  },
]

export function BenefitsSection() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden bg-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-screen-2xl">
        {/* Benefits */}
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
              <Sparkle weight="fill" className="h-4 w-4" />
              Benefits
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t.landing.benefitsTitle}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {t.landing.benefitsSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${benefit.color} p-2.5 shadow-lg`}>
                  <benefit.icon weight="duotone" className="h-full w-full text-white" />
                </div>

                <div className="mb-2 text-3xl font-bold text-foreground">
                  {benefit.stat}
                </div>
                <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {benefit.statLabel}
                </div>
                
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Use Cases */}
        <motion.div
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
              <Users weight="duotone" className="h-4 w-4" />
              Use Cases
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t.landing.useCasesTitle}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {t.landing.useCasesSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -5 }}
              >
                {/* Agent Avatar with Demo Animation */}
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <AvatarImage 
                      src={useCase.agent.avatar} 
                      alt={useCase.agent.name}
                      className="object-cover"
                      loading="lazy"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold text-sm">
                      {useCase.agent.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground">{useCase.agent.name}</div>
                    <motion.div 
                      className="text-xs text-primary"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {useCase.demo}
                    </motion.div>
                  </div>
                </div>
                
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {useCase.title}
                </h3>
                
                <p className="mb-4 text-sm text-muted-foreground">
                  {useCase.description}
                </p>

                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {useCase.users}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
