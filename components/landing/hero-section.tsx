"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getLandingCopy } from '@/lib/i18n/landing-copy'

export function HeroSection() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const copy = getLandingCopy(locale)

  const floatingAgents = useMemo(
    () => [
      { avatar: '/img/agents/emma4.png', name: 'Emma', action: copy.hero.floatingActions.Emma },
      { avatar: '/img/agents/toby4.png', name: 'Toby', action: copy.hero.floatingActions.Toby },
      { avatar: '/img/agents/nora4.png', name: 'Nora', action: copy.hero.floatingActions.Nora },
      { avatar: '/img/agents/apu4.png', name: 'Apu', action: copy.hero.floatingActions.Apu },
    ],
    [copy]
  )

  const onboardingSteps = useMemo(
    () => [
      { avatar: '/img/logoankie.png', name: 'Ankie', task: copy.hero.onboardingTasks.Kylio },
      { avatar: '/img/agents/emma4.png', name: 'Emma', task: copy.hero.onboardingTasks.Emma },
      { avatar: '/img/agents/toby4.png', name: 'Toby', task: copy.hero.onboardingTasks.Toby },
    ],
    [copy]
  )

  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % onboardingSteps.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [onboardingSteps.length])

  const handleStartFree = () => {
    router.push('/auth')
  }

  return (
  <section className="relative w-screen min-h-screen flex items-center overflow-hidden bg-background isolation-isolate py-20 md:py-0">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-violet/15 dark:bg-brand-violet/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-brand-cyan/15 dark:bg-brand-cyan/10 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-1/3 h-96 w-96 rounded-full bg-brand-magenta/10 dark:bg-brand-magenta/5 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left column - Content */}
          <motion.div
            className="flex flex-col space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 dark:bg-brand-cyan/5 px-4 py-1.5 text-sm font-medium text-brand-ink dark:text-brand-cyan"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-violet opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-violet" />
              </span>
              {copy.hero.badge}
            </motion.div>

            {/* Time badge */}
            <motion.div
              className="inline-flex max-w-fit items-center gap-4 rounded-2xl border-2 border-brand-cyan/40 bg-gradient-to-r from-brand-cyan/15 via-brand-violet/10 to-brand-magenta/15 dark:from-brand-cyan/8 dark:via-brand-violet/5 dark:to-brand-magenta/8 px-8 py-4 shadow-xl shadow-brand-cyan/20 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <CheckCircle weight="fill" className="h-10 w-10 shrink-0 text-brand-cyan" />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-brand-ink/70 dark:text-brand-cyan/70">
                  {t.landing.deployTime}
                </p>
                <p className="text-4xl font-black text-brand-ink dark:text-foreground">
                  {t.landing.under5Minutes}
                </p>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-magenta bg-clip-text text-transparent">
                {t.landing.heroTitle}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-xl leading-relaxed text-brand-ink/80 dark:text-foreground/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {t.landing.heroSubtitle}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                size="lg"
                onClick={handleStartFree}
                className="group h-14 bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-magenta px-8 text-base font-semibold text-white shadow-2xl shadow-brand-cyan/40 hover:scale-105 hover:shadow-3xl hover:shadow-brand-violet/40"
              >
                <span className="flex items-center gap-2">
                  {t.landing.heroCta}
                  <ArrowRight weight="bold" className="transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>

            <p className="text-sm text-brand-ink/60 dark:text-foreground/60">{copy.hero.microcopy}</p>

            {/* Trust badges */}
            <motion.div
              className="flex flex-wrap items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {copy.hero.trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 dark:bg-brand-cyan/5 px-4 py-2"
                >
                  <CheckCircle weight="fill" className="h-4 w-4 text-brand-cyan" />
                  <p className="text-sm font-medium text-brand-ink dark:text-foreground">{badge}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column - Demo */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="rounded-2xl border border-border/50 bg-white/90 dark:bg-brand-surface/90 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-brand-ink dark:text-foreground">
                  {copy.hero.onboardingTitle}
                </h3>
                <div className="flex items-center gap-2 rounded-full bg-brand-cyan/10 px-4 py-2 text-sm font-medium text-brand-cyan">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-cyan" />
                  {copy.hero.onboardingActive}
                </div>
              </div>

              <div className="space-y-4">
                {onboardingSteps.map((step, index) => {
                  const isActive = index === currentStep
                  const isCompleted = index < currentStep
                  return (
                    <motion.div
                      key={step.name}
                      animate={{ scale: isActive ? 1.02 : 1, opacity: isCompleted ? 0.6 : 1 }}
                      className={`flex items-center gap-4 rounded-lg border p-4 transition-all ${
                        isActive
                          ? 'border-brand-violet/50 bg-brand-violet/5'
                          : isCompleted
                            ? 'border-brand-cyan/30 bg-brand-cyan/5'
                            : 'border-border/50 bg-background/20 dark:bg-brand-surface/20'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border-2 border-white dark:border-brand-surface shadow-md">
                          <AvatarImage src={step.avatar} alt={step.name} />
                          <AvatarFallback className="bg-gradient-to-br from-brand-cyan to-brand-violet text-sm font-semibold text-white">
                            {step.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {isCompleted && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-cyan/90">
                            <CheckCircle weight="fill" className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-brand-ink dark:text-foreground">{step.name}</p>
                        <p className="truncate text-sm text-brand-ink/60 dark:text-foreground/60">{step.task}</p>
                      </div>

                      {isActive && !isCompleted && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="h-6 w-6 shrink-0 rounded-full border-2 border-brand-violet border-t-transparent"
                        />
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border/50 dark:bg-brand-surface">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-magenta"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="mt-6 rounded-lg border border-border/50 bg-background/30 dark:bg-brand-surface/30 p-4">
                <p className="text-sm font-medium text-brand-ink/60 dark:text-foreground/60">
                  {copy.hero.currentTaskLabel}
                </p>
                <h4 className="text-lg font-semibold text-brand-ink dark:text-foreground">
                  {onboardingSteps[currentStep].task}
                </h4>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
