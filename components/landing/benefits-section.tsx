"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Rocket, Clock, ShieldCheck, Sparkle, Users } from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useLandingCopy } from '@/lib/i18n/use-landing-copy'
import { useMemo } from 'react'

const statIcons = [Rocket, Clock, ShieldCheck]
const statColors = ['from-brand-violet to-brand-magenta', 'from-brand-cyan to-brand-violet', 'from-brand-magenta to-brand-cyan']

const useCaseAgents = [
  { name: 'Emma', avatar: '/img/agents/emma4.png' },
  { name: 'Toby', avatar: '/img/agents/toby4.png' },
  { name: 'Apu', avatar: '/img/agents/apu4.png' },
  { name: 'Ankie', avatar: '/img/agents/ankie4.png' },
]

export function BenefitsSection() {
  const { t, locale } = useI18n()
  const copy = useLandingCopy(locale)

  const stats = useMemo(
    () =>
      copy.benefits.stats.map((item, index) => ({
        ...item,
        icon: statIcons[index % statIcons.length],
        color: statColors[index % statColors.length],
      })),
    [copy, locale]
  )

  const useCases = useMemo(
    () =>
      copy.benefits.useCases.map((useCase, index) => ({
        ...useCase,
        agent: useCaseAgents[index % useCaseAgents.length],
      })),
    [copy, locale]
  )

  return (
    <section
      id="benefits"
      data-landing-search
      data-landing-search-title="Benefits"
      data-landing-search-type="section"
      className="relative w-full overflow-hidden bg-gradient-to-b from-background via-white/60 to-background dark:via-[#07070a]/70 py-24 sm:py-36"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12">
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-16 text-center">
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-brand-cyan/40 bg-gradient-to-r from-brand-cyan/20 via-brand-violet/15 to-brand-magenta/20 px-6 py-2.5 text-sm font-bold text-brand-cyan shadow-lg shadow-brand-cyan/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={{
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 10px 40px rgba(var(--primary), 0.2)',
                  '0 10px 50px rgba(var(--primary), 0.3)',
                  '0 10px 40px rgba(var(--primary), 0.2)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
            >
              <Sparkle weight="fill" className="h-5 w-5" />
              {copy.benefits.badge}
            </motion.div>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {t.landing.benefitsTitle}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground sm:text-2xl">
              {t.landing.benefitsSubtitle}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="group relative overflow-hidden rounded-[28px] border border-white/50 bg-white/90 p-8 shadow-[0_20px_60px_rgba(4,14,39,0.08)] backdrop-blur-2xl transition-all hover:-translate-y-2 hover:border-brand-cyan/40 hover:shadow-[0_25px_80px_rgba(16,24,56,0.18)] dark:border-white/10 dark:bg-white/5 dark:shadow-brand-cyan/10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${benefit.color} opacity-0 transition duration-500 group-hover:opacity-10`} />
                <div className="relative z-10">
                  <motion.div
                    className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${benefit.color} p-3 shadow-xl ring-4 ring-white/60 dark:ring-white/10`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <benefit.icon weight="duotone" className="h-full w-full text-white" />
                  </motion.div>
                  <div className={`mb-2 bg-gradient-to-br ${benefit.color} bg-clip-text text-5xl font-black text-transparent sm:text-6xl`}>
                    {benefit.stat}
                  </div>
                  <div className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {benefit.statLabel}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-foreground">{benefit.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{benefit.description}</p>
                </div>
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${benefit.color}`}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="mb-16 text-center">
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-brand-cyan/40 bg-gradient-to-r from-brand-cyan/20 via-brand-violet/15 to-brand-magenta/20 px-6 py-2.5 text-sm font-bold text-brand-cyan shadow-lg shadow-brand-cyan/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
            >
              <Users weight="duotone" className="h-5 w-5" />
              {copy.benefits.useCasesBadge}
            </motion.div>
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {t.landing.useCasesTitle}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground sm:text-2xl">
              {t.landing.useCasesSubtitle}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/90 p-8 shadow-[0_15px_50px_rgba(4,14,39,0.08)] backdrop-blur-xl transition-all hover:-translate-y-2 hover:border-brand-cyan/40 hover:shadow-[0_25px_70px_rgba(8,20,45,0.16)] dark:border-white/10 dark:bg-white/5"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-cyan/15 via-brand-violet/15 to-brand-magenta/15 opacity-0 transition duration-500 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-6 flex items-center gap-4">
                    <motion.div whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }} transition={{ duration: 0.4 }}>
                      <Avatar className="h-14 w-14 border-2 border-white/80 shadow-xl ring-2 ring-brand-cyan/20 transition-all duration-300 group-hover:ring-brand-violet/40 dark:border-white/10">
                        <AvatarImage src={useCase.agent.avatar} alt={useCase.agent.name} className="object-cover" loading="lazy" />
                        <AvatarFallback className="bg-gradient-to-br from-brand-cyan to-brand-violet text-base font-semibold text-white">
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
                  <h3 className="mb-3 text-xl font-bold text-foreground">{useCase.title}</h3>
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground">{useCase.description}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                      <Users weight="bold" className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{useCase.users}</span>
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
