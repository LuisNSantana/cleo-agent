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
      { avatar: '/img/agents/cleo4.png', name: 'Kylio', task: copy.hero.onboardingTasks.Kylio },
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
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#A38CFF]/15 dark:bg-[#A38CFF]/8 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-[#64D2FF]/15 dark:bg-[#64D2FF]/8 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#30D158]/8 dark:bg-[#30D158]/5 blur-3xl"
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
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#A38CFF]/30 bg-[#A38CFF]/10 dark:bg-[#A38CFF]/5 px-4 py-1.5 text-sm font-medium text-[#1E255E] dark:text-[#A38CFF]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A38CFF] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#A38CFF]" />
              </span>
              {copy.hero.badge}
            </motion.div>

            {/* Time badge */}
            <motion.div
              className="inline-flex max-w-fit items-center gap-4 rounded-2xl border-2 border-[#A38CFF]/40 bg-gradient-to-r from-[#A38CFF]/15 via-[#8E73FF]/10 to-[#64D2FF]/15 dark:from-[#A38CFF]/8 dark:via-[#8E73FF]/5 dark:to-[#64D2FF]/8 px-8 py-4 shadow-xl shadow-[#A38CFF]/20 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <CheckCircle weight="fill" className="h-10 w-10 shrink-0 text-[#A38CFF]" />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-[#1E255E]/70 dark:text-[#A38CFF]/70">
                  {t.landing.deployTime}
                </p>
                <p className="text-4xl font-black text-[#1E255E] dark:text-[#F9F6F2]">
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
              <span className="bg-gradient-to-r from-[#A38CFF] via-[#8E73FF] to-[#64D2FF] bg-clip-text text-transparent">
                {t.landing.heroTitle}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-xl leading-relaxed text-[#1E255E]/80 dark:text-[#E5E5E5]"
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
                className="group h-14 bg-gradient-to-r from-[#A38CFF] via-[#8E73FF] to-[#64D2FF] px-8 text-base font-semibold text-white shadow-2xl shadow-[#A38CFF]/40 hover:scale-105 hover:shadow-3xl hover:shadow-[#A38CFF]/50"
              >
                <span className="flex items-center gap-2">
                  {t.landing.heroCta}
                  <ArrowRight weight="bold" className="transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>

            <p className="text-sm text-[#1E255E]/60 dark:text-[#E5E5E5]/60">{copy.hero.microcopy}</p>

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
                  className="flex items-center gap-2 rounded-full border border-[#A38CFF]/20 bg-[#A38CFF]/10 dark:bg-[#A38CFF]/5 px-4 py-2"
                >
                  <CheckCircle weight="fill" className="h-4 w-4 text-[#A38CFF]" />
                  <p className="text-sm font-medium text-[#1E255E] dark:text-[#F9F6F2]">{badge}</p>
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
            <div className="rounded-2xl border border-[#E5E5E5] dark:border-[#2F2F2F] bg-white/90 dark:bg-[#1B1B1B]/90 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1E255E] dark:text-[#F9F6F2]">
                  {copy.hero.onboardingTitle}
                </h3>
                <div className="flex items-center gap-2 rounded-full bg-[#30D158]/10 px-4 py-2 text-sm font-medium text-[#30D158]">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#30D158]" />
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
                          ? 'border-[#A38CFF]/50 bg-[#A38CFF]/5'
                          : isCompleted
                            ? 'border-[#30D158]/30 bg-[#30D158]/5'
                            : 'border-[#E5E5E5] dark:border-[#2F2F2F] bg-[#F9F6F2]/20 dark:bg-[#1B1B1B]/20'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border-2 border-white dark:border-[#1B1B1B] shadow-md">
                          <AvatarImage src={step.avatar} alt={step.name} />
                          <AvatarFallback className="bg-gradient-to-br from-[#A38CFF] to-[#64D2FF] text-sm font-semibold text-white">
                            {step.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {isCompleted && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#30D158]/90">
                            <CheckCircle weight="fill" className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-[#1E255E] dark:text-[#F9F6F2]">{step.name}</p>
                        <p className="truncate text-sm text-[#1E255E]/60 dark:text-[#E5E5E5]/60">{step.task}</p>
                      </div>

                      {isActive && !isCompleted && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="h-6 w-6 shrink-0 rounded-full border-2 border-[#A38CFF] border-t-transparent"
                        />
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-[#2F2F2F]">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#A38CFF] via-[#8E73FF] to-[#64D2FF]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="mt-6 rounded-lg border border-[#E5E5E5] dark:border-[#2F2F2F] bg-[#F9F6F2]/30 dark:bg-[#1B1B1B]/30 p-4">
                <p className="text-sm font-medium text-[#1E255E]/60 dark:text-[#E5E5E5]/60">
                  {copy.hero.currentTaskLabel}
                </p>
                <h4 className="text-lg font-semibold text-[#1E255E] dark:text-[#F9F6F2]">
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
