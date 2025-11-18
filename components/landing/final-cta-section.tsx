"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { ArrowRight, Rocket, Heart } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useLandingCopy } from '@/lib/i18n/use-landing-copy'
import { useMemo } from 'react'

export function FinalCTASection() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const copy = useLandingCopy(locale)

  const philosophy = useMemo(() => copy.finalCta.philosophyCards, [copy, locale])
  const trustBullets = useMemo(() => copy.finalCta.trustBullets, [copy, locale])

  const handleStartFree = () => {
    router.push('/auth')
  }

  return (
    <>
  <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#F7F5FF] via-[#F2F6FF] to-[#F7F5FF] py-16 text-foreground dark:from-[#080B16] dark:via-[#0D1324] dark:to-[#080B16] sm:py-24 lg:py-32">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Heart weight="fill" className="h-4 w-4" />
              {copy.finalCta.philosophyBadge}
            </motion.div>

            <h2 className="mb-4 sm:mb-6 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#1E255E] dark:text-[#F9F6F2]">
              {t.landing.philosophyTitle}
            </h2>

            <p className="text-base sm:text-lg lg:text-xl leading-relaxed text-[#1E255E]/80 dark:text-[#E5E5E5]">{t.landing.philosophySubtitle}</p>

            <motion.div
              className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 sm:grid-cols-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              {philosophy.map((card) => (
                <div key={card.title} className="rounded-xl border border-border/40 bg-white/70 p-4 sm:p-6 backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <div className="mb-3 text-3xl sm:text-4xl">{card.emoji}</div>
                  <h3 className="mb-2 font-semibold text-[#1E255E] dark:text-[#F9F6F2]">{card.title}</h3>
                  <p className="text-xs sm:text-sm text-[#1E255E]/70 dark:text-[#E5E5E5]/70">{card.description}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

  <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#090D1D] via-[#0B1022] to-[#090D1D] py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 -z-10">
          <motion.div
            className="absolute left-1/4 top-1/4 h-64 sm:h-96 w-64 sm:w-96 rounded-full bg-[#A38CFF]/25 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute right-1/4 bottom-1/4 h-64 sm:h-96 w-64 sm:w-96 rounded-full bg-[#64D2FF]/25 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-12">
          <div className="mx-auto max-w-4xl text-center text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <motion.div
                className="mb-6 sm:mb-8 inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Rocket weight="duotone" className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </motion.div>

              <h2 className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                {t.landing.finalCtaTitle}
              </h2>

              <p className="mb-8 sm:mb-10 text-base sm:text-lg lg:text-xl text-white/90">{t.landing.finalCtaSubtitle}</p>

              <motion.div
                className="flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  size="lg"
                  onClick={handleStartFree}
                  className="group h-12 sm:h-14 rounded-2xl bg-white px-6 sm:px-8 text-sm sm:text-base font-semibold text-[#0D1224] shadow-2xl shadow-black/30 transition hover:scale-105 hover:bg-white/90 dark:bg-gradient-to-r dark:from-[#64D2FF] dark:via-[#A38CFF] dark:to-[#FF8FD8] dark:text-[#05070D]"
                >
                  <span className="flex items-center gap-2">
                    {t.landing.finalCta}
                    <ArrowRight weight="bold" className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-white/85">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {copy.finalCta.noCreditCard}
                </div>
              </motion.div>

              <motion.div
                className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-white/75"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                {trustBullets.map((bullet) => (
                  <div key={bullet} className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    {bullet}
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
