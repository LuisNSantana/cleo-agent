"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Brain, Lightning, Users, Shield, Sparkle, Check, Rocket } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMemo } from 'react'
import { useLandingCopy } from '@/lib/i18n/use-landing-copy'

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
  const copy = useLandingCopy(locale)

  const filteredCards = useMemo(() => {
    const blockedTitleRegex = /(security|seguridad|gobernanza|governance|governança|sécurité|sicurezza|sicherheit|セキュリティ|보안|安全)/i
    return copy.features.cards.filter((card) => !blockedTitleRegex.test(card.title))
  }, [copy, locale])

  const featureCards = useMemo(
    () =>
      filteredCards.map((card, index) => ({
        ...card,
        icon: featureIcons[index % featureIcons.length],
        color: featureColors[index % featureColors.length],
      })),
    [filteredCards]
  )

  return (
    <section
      id="features"
      data-landing-search
      data-landing-search-title="Features"
      data-landing-search-type="section"
      className="relative w-full overflow-hidden bg-gradient-to-b from-[#F9F6F2] via-white to-[#EEF2FF] dark:from-[#050507] dark:via-[#0B0D15] dark:to-[#050507] py-16 sm:py-24 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-cyan/15 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-brand-violet/15 blur-[180px]" />
      </div>
  <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-8 lg:px-16">
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
                className="group relative h-full overflow-hidden rounded-[28px] border border-white/40 bg-white/90 p-8 shadow-[0_20px_70px_rgba(9,13,30,0.12)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-brand-cyan/40 hover:shadow-[0_30px_90px_rgba(6,10,25,0.18)] dark:border-white/10 dark:bg-white/5"
              >
                <div
                  className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${feature.color} opacity-0 transition duration-500 group-hover:opacity-20`}
                />
                <div className="relative">
                  <motion.div
                    className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-xl ring-4 ring-white/60 transition-transform duration-300 group-hover:scale-110 dark:ring-white/10`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon weight="duotone" className="h-full w-full text-white" />
                  </motion.div>
                  <h3 className="mb-3 text-xl font-bold text-foreground">{feature.title}</h3>
                  <p className="mb-6 text-base leading-relaxed text-muted-foreground">{feature.description}</p>
                  <ul className="space-y-2.5">
                    {feature.bullets.map((item: string, i: number) => (
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
              className="group rounded-full bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-magenta px-10 py-6 text-base font-bold text-white ring-2 ring-white/50 shadow-[0_20px_60px_rgba(23,20,73,0.35)] transition-all hover:scale-[1.02] dark:ring-white/10"
              asChild
            >
              <a href="#agents" className="flex items-center gap-2">
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
