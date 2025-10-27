"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { ArrowRight, Rocket, Heart } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'

export function FinalCTASection() {
  const router = useRouter()
  const { t } = useI18n()

  const handleStartFree = () => {
    router.push('/chat/guest')
  }

  return (
    <>
      {/* Philosophy Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-blue-500/5 xl:to-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-screen-2xl">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Heart weight="fill" className="h-4 w-4" />
              Our Philosophy
            </motion.div>

            <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t.landing.philosophyTitle}
            </h2>

            <p className="text-xl leading-relaxed text-muted-foreground">
              {t.landing.philosophySubtitle}
            </p>

            {/* Visual representation */}
            <motion.div
              className="mt-12 grid gap-6 sm:grid-cols-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
                <div className="mb-3 text-4xl">🚀</div>
                <h3 className="mb-2 font-semibold text-foreground">Accelerate</h3>
                <p className="text-sm text-muted-foreground">
                  Speed up your work without compromising quality
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
                <div className="mb-3 text-4xl">🎯</div>
                <h3 className="mb-2 font-semibold text-foreground">Focus</h3>
                <p className="text-sm text-muted-foreground">
                  Concentrate on high-value creative work
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
                <div className="mb-3 text-4xl">✨</div>
                <h3 className="mb-2 font-semibold text-foreground">Elevate</h3>
                <p className="text-sm text-muted-foreground">
                  Let AI handle the routine, you handle the magic
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/80 via-primary/70 to-blue-600/60 px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Icon */}
            <motion.div
              className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Rocket weight="duotone" className="h-8 w-8 text-white" />
            </motion.div>

            {/* Heading */}
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              {t.landing.finalCtaTitle}
            </h2>

            {/* Subtitle */}
            <p className="mb-10 text-xl text-white/90">
              {t.landing.finalCtaSubtitle}
            </p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Button
                size="lg"
                onClick={handleStartFree}
                className="group h-14 bg-white px-8 text-base font-semibold text-primary shadow-2xl hover:bg-white/90"
              >
                <span className="flex items-center gap-2">
                  {t.landing.finalCta}
                  <ArrowRight
                    weight="bold"
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </Button>

              <div className="flex items-center gap-2 text-sm text-white/80">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                No credit card required
              </div>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Free forever plan
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                SOC 2 certified
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
