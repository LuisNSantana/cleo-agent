"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Star, ShieldCheck, Lock, Eye } from '@phosphor-icons/react'
import { getLandingCopy } from '@/lib/i18n/landing-copy'
import { useMemo } from 'react'

export function TestimonialsSection() {
  const { t, locale } = useI18n()
  const copy = getLandingCopy(locale)

  const stats = useMemo(() => copy.testimonials.stats, [copy, locale])
  const security = useMemo(() => copy.testimonials.securityFeatures, [copy, locale])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F9F6F2] via-[#EDE8FF]/30 to-[#F9F6F2] px-4 py-24 sm:px-6 sm:py-32 lg:px-12">
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
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/85 to-card/60 p-8 shadow-xl shadow-primary/10 backdrop-blur-sm sm:p-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative">
            <div className="mb-8 text-center">
              <motion.div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-[#A38CFF]/20 via-[#8E73FF]/15 to-[#64D2FF]/20 px-4 py-1.5 text-sm font-medium text-primary"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <ShieldCheck weight="duotone" className="h-4 w-4" />
                {copy.testimonials.securityBadge}
              </motion.div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t.landing.securityTitle}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t.landing.securitySubtitle}</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {security.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A38CFF]/20 via-[#64D2FF]/20 to-[#30D158]/20 p-3">
                    {index === 0 ? (
                      <Lock weight="duotone" className="h-full w-full text-primary" />
                    ) : index === 1 ? (
                      <ShieldCheck weight="duotone" className="h-full w-full text-primary" />
                    ) : (
                      <Eye weight="duotone" className="h-full w-full text-primary" />
                    )}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-12 flex flex-wrap items-center justify-center gap-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              {copy.testimonials.complianceBadges.map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground"
                >
                  <ShieldCheck weight="fill" className="h-5 w-5 text-[#30D158]" />
                  {badge}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
