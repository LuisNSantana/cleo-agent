"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Star, ShieldCheck } from '@phosphor-icons/react'
import { useLandingCopy } from '@/lib/i18n/use-landing-copy'
import { useMemo } from 'react'

export function TestimonialsSection() {
  const { t, locale } = useI18n()
  const copy = useLandingCopy(locale)

  const stats = useMemo(() => copy.testimonials.stats, [copy, locale])
  const complianceBadges = useMemo(() => copy.testimonials.complianceBadges, [copy, locale])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F9F6FF] via-[#F2F6FF] to-[#F9F6FF] px-4 py-24 text-foreground dark:from-[#070912] dark:via-[#0B1020] dark:to-[#070912] sm:px-6 sm:py-32 lg:px-12">
      <div className="mx-auto max-w-[1600px]">
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-12 text-center">
            <motion.div
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-[#A38CFF]/20 via-[#8E73FF]/15 to-[#64D2FF]/20 px-4 py-1.5 text-sm font-medium text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Star weight="fill" className="h-4 w-4" />
              {copy.testimonials.badge}
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t.landing.testimonialsTitle}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {t.landing.testimonialsSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/85 p-6 shadow-lg shadow-primary/10 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -5 }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Star weight="fill" className="h-5 w-5 text-primary" />
                  <div className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                    {stat.metric}
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{stat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="rounded-3xl border border-border/40 bg-card/80 p-6 shadow-xl shadow-primary/10 backdrop-blur sm:p-10 dark:border-white/5 dark:bg-white/5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <ShieldCheck weight="duotone" className="h-4 w-4" />
            {copy.testimonials.securityBadge}
          </motion.div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-foreground">{t.landing.securityTitle}</h3>
              <p className="text-sm text-muted-foreground">{t.landing.securitySubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {complianceBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5"
                >
                  <ShieldCheck weight="fill" className="h-4 w-4 text-[#30D158]" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
