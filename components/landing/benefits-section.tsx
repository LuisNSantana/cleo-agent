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
    <section id="benefits" data-landing-search data-landing-search-title="Benefits" data-landing-search-type="section" className="relative w-full overflow-hidden bg-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl 2xl:max-w-[90rem]">
        {/* Benefits */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-16 text-center">
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
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            >
              <Sparkle weight="fill" className="h-5 w-5" />
              Real Results
            </motion.div>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              {t.landing.benefitsTitle}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground sm:text-2xl">
              {t.landing.benefitsSubtitle}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="group relative overflow-hidden rounded-3xl border-2 border-border/60 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-8 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Animated gradient background on hover */}
                <div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${benefit.color} opacity-0 blur transition duration-500 group-hover:opacity-20`} />
                
                {/* Content wrapper */}
                <div className="relative">
                  {/* Icon with enhanced glow */}
                  <motion.div 
                    className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${benefit.color} p-3 shadow-xl`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <benefit.icon weight="duotone" className="h-full w-full text-white" />
                  </motion.div>

                  {/* Large stat number with gradient */}
                  <div className={`mb-2 bg-gradient-to-br ${benefit.color} bg-clip-text text-5xl font-black text-transparent sm:text-6xl`}>
                    {benefit.stat}
                  </div>
                  
                  {/* Stat label */}
                  <div className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {benefit.statLabel}
                  </div>
                  
                  {/* Title */}
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    {benefit.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>

                {/* Bottom accent bar */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r ${benefit.color}`}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                />
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
          <div className="mb-16 text-center">
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 px-6 py-2.5 text-sm font-bold text-primary shadow-lg shadow-primary/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={{ 
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            >
              <Users weight="duotone" className="h-5 w-5" />
              Real Use Cases
            </motion.div>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              {t.landing.useCasesTitle}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground sm:text-2xl">
              {t.landing.useCasesSubtitle}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                className="group relative overflow-hidden rounded-2xl border-2 border-border/60 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-8 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Gradient glow on hover */}
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 opacity-0 blur transition duration-500 group-hover:opacity-100" />
                
                <div className="relative">
                  {/* Agent Avatar with Demo Animation */}
                  <div className="mb-6 flex items-center gap-4">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <Avatar className="h-14 w-14 border-2 border-background shadow-xl ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
                        <AvatarImage 
                          src={useCase.agent.avatar} 
                          alt={useCase.agent.name}
                          className="object-cover"
                          loading="lazy"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold text-base">
                          {useCase.agent.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-foreground">{useCase.agent.name}</div>
                      <motion.div 
                        className="text-xs font-medium text-primary"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        ⚡ {useCase.demo}
                      </motion.div>
                    </div>
                  </div>
                  
                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    {useCase.title}
                  </h3>
                  
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground">
                    {useCase.description}
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                      <Users weight="bold" className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {useCase.users}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
