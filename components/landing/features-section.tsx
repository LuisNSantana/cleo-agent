"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Brain, Lightning, Users, Shield, Sparkle, Check, Rocket } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMemo } from 'react'
import { getLandingCopy } from '@/lib/i18n/landing-copy'

const featureIcons = [Brain, Lightning, Users, Shield]
const featureColors = [
  'from-[#A38CFF] to-[#7E63F2]',
  'from-[#64D2FF] to-[#4AA6FF]',
  'from-[#30D158] to-[#0A9F41]',
  'from-[#FFD60A] to-[#FFB800]',
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function FeaturesSection() {
  const { t, locale } = useI18n()
  const copy = getLandingCopy(locale)

  const featureCards = useMemo(
    () =>
      copy.features.cards.map((card, index) => ({
        ...card,
        icon: featureIcons[index % featureIcons.length],
        color: featureColors[index % featureColors.length],
      })),
    [copy, locale]
  )

  return (
    <section
      id="features"
      data-landing-search
      data-landing-search-title="Features"
      data-landing-search-type="section"
      className="relative w-full overflow-hidden bg-[#F9F6F2] dark:bg-[#0D0D0D] py-16 sm:py-24 lg:py-32"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
        <motion.div
          className="mb-12 sm:mb-16 lg:mb-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border-2 border-[#A38CFF]/30 bg-gradient-to-r from-[#A38CFF]/20 via-[#8E73FF]/15 to-[#64D2FF]/20 dark:from-[#A38CFF]/10 dark:via-[#8E73FF]/8 dark:to-[#64D2FF]/10 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-[#A38CFF] shadow-lg shadow-[#A38CFF]/20"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: [
                '0 10px 40px rgba(163, 140, 255, 0.2)',
                '0 10px 50px rgba(163, 140, 255, 0.3)',
                '0 10px 40px rgba(163, 140, 255, 0.2)',
              ],
            }}
            transition={{ delay: 0.2, duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          >
            <Sparkle weight="fill" className="h-4 w-4 sm:h-5 sm:w-5" />
            {copy.features.badge}
          </motion.div>

          <h2 className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#1E255E] dark:text-[#F9F6F2]">
            {t.landing.featuresTitle}
          </h2>
          <p className="mx-auto max-w-3xl text-base sm:text-lg lg:text-xl xl:text-2xl text-[#1E255E]/80 dark:text-[#E5E5E5]">
            {t.landing.featuresSubtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid gap-8 md:grid-cols-2 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {featureCards.map((feature, index) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card
                data-landing-search
                data-landing-search-title={feature.title}
                data-landing-search-type="feature"
                className="group relative h-full overflow-hidden rounded-2xl border-2 border-border/60 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-8 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20"
              >
                <div
                  className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 blur transition duration-500 group-hover:opacity-20`}
                />
                <div className="relative">
                  <motion.div
                    className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-xl transition-transform duration-300 group-hover:scale-110`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon weight="duotone" className="h-full w-full text-white" />
                  </motion.div>
                  <h3 className="mb-3 text-xl font-bold text-foreground">{feature.title}</h3>
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground">{feature.description}</p>
                  <ul className="space-y-2.5">
                    {feature.bullets.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${feature.color} p-1`}
                        >
                          <Check weight="bold" className="h-full w-full text-white" />
                        </div>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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

        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="mx-auto max-w-3xl text-balance text-2xl font-bold tracking-tight text-foreground/90 sm:text-3xl">
            {copy.features.highlightHeadline}
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Button
              size="lg"
              className="group rounded-full bg-[#A38CFF] px-8 py-6 text-base font-bold text-white shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40"
              asChild
            >
              <a href="/auth" className="flex items-center gap-2">
                {copy.features.highlightCta}
                <Rocket weight="bold" className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
