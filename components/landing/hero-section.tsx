"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect, useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useLandingCopy } from '@/lib/i18n/use-landing-copy'

export function HeroSection() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const copy = useLandingCopy(locale)

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
      { avatar: '/img/agents/ankie4.png', name: 'Ankie', task: copy.hero.onboardingTasks.Ankie },
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
  <section className="relative flex w-full min-h-screen items-center overflow-hidden bg-background py-20 text-foreground md:py-0">
      {/* Aurora Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-40 dark:opacity-20">
            <motion.div
              className="absolute -top-[40%] left-[10%] w-[600px] h-[600px] rounded-full bg-brand-cyan blur-[120px] mix-blend-screen dark:mix-blend-screen"
              animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-brand-violet blur-[120px] mix-blend-screen dark:mix-blend-screen"
              animate={{ x: [0, -30, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute -bottom-[20%] left-[30%] w-[700px] h-[700px] rounded-full bg-brand-magenta blur-[140px] mix-blend-screen dark:mix-blend-screen"
              animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
        </div>
        {/* Noise overlay for texture */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

    <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left column - Content */}
          <motion.div
            className="flex flex-col space-y-8 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/5 px-3 py-1 text-xs font-medium text-brand-cyan backdrop-blur-sm mx-auto lg:mx-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan" />
              </span>
              {copy.hero.badge}
            </motion.div>

            {/* Time badge */}
            <motion.div
              className="inline-flex max-w-fit items-center gap-4 rounded-2xl border-2 border-brand-cyan/40 bg-gradient-to-r from-brand-cyan/15 via-brand-violet/10 to-brand-magenta/15 dark:from-brand-cyan/8 dark:via-brand-violet/5 dark:to-brand-magenta/8 px-8 py-4 shadow-xl shadow-brand-cyan/20 backdrop-blur-sm mx-auto lg:mx-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <CheckCircle weight="fill" className="h-10 w-10 shrink-0 text-brand-cyan" />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {t.landing.deployTime}
                </p>
                <p className="text-4xl font-black text-foreground tracking-tight">
                  {t.landing.under5Minutes}
                </p>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight text-center lg:text-left"
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
              className="text-xl leading-relaxed text-muted-foreground max-w-xl mx-auto lg:mx-0 px-4 sm:px-0 break-words"
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
              className="flex flex-col gap-3 sm:flex-row justify-center lg:justify-start"
            >
              <Button
                size="lg"
                onClick={handleStartFree}
                aria-label={t.landing.heroCta}
                className="group h-14 flex-1 rounded-2xl px-8 text-base font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#64D2FF 0%,#8F91FF 50%,#FF7AEA 100%)' }}
              >
                <span className="flex items-center justify-center gap-2">
                  {t.landing.heroCta}
                  <ArrowRight weight="bold" className="transition-transform group-hover:translate-x-1" />
                </span>
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={() => {
                  const section = document.getElementById('agents')
                  if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                aria-label={copy.features.highlightCta}
                className="group flex-1 rounded-2xl border border-brand-violet/20 bg-brand-violet/5 text-brand-violet shadow-sm transition-all duration-300 hover:bg-brand-violet/10 hover:border-brand-violet/30 hover:scale-[1.02] active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
              >
                <span className="flex items-center justify-center gap-2 text-base font-semibold">
                  {copy.features.highlightCta}
                  <ArrowRight weight="bold" className="text-current transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>

            <p className="text-sm text-muted-foreground/80">{copy.hero.microcopy}</p>

            {/* Trust badges */}
            <motion.div
              className="flex flex-wrap items-center gap-3 justify-center lg:justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {copy.hero.trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2 transition-colors hover:border-brand-cyan/30 hover:bg-brand-cyan/5"
                >
                  <CheckCircle weight="fill" className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-brand-cyan" />
                  <p className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">{badge}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="grid gap-4 pt-4 sm:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              {floatingAgents.map((agent, index) => (
                <motion.div
                  key={agent.name}
                  className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-lg shadow-brand-ink/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
                  initial={{ opacity: 0, y: 10 * (index + 1) }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + index * 0.1 }}
                >
                  <Avatar className="h-10 w-10 border border-white shadow-md">
                    <AvatarImage src={agent.avatar} alt={agent.name} />
                    <AvatarFallback className="bg-gradient-to-br from-brand-cyan to-brand-magenta text-xs font-semibold text-white">
                      {agent.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{agent.action}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column - Demo */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="rounded-3xl border border-border/50 bg-white/80 p-8 shadow-2xl shadow-black/5 backdrop-blur-xl dark:bg-card/80 dark:shadow-black/20">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-foreground">
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
                      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                        isActive
                          ? 'border-brand-violet/40 bg-brand-violet/10'
                          : isCompleted
                            ? 'border-brand-cyan/30 bg-brand-cyan/5'
                            : 'border-border/50 bg-muted/20'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-md dark:border-[#0C1020]">
                          <AvatarImage src={step.avatar} alt={step.name} />
                          <AvatarFallback className="bg-gradient-to-br from-brand-cyan to-brand-violet text-sm font-semibold text-white">
                            {step.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {isCompleted && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet shadow-lg shadow-brand-cyan/20">
                            <CheckCircle weight="fill" className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-foreground">{step.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{step.task}</p>
                      </div>

                      {isActive && !isCompleted && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                          className="h-6 w-6 shrink-0 rounded-full border-[3px] border-brand-violet/20 border-t-brand-violet"
                        />
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-magenta"
                  initial={{ width: '0%' }}
                  animate={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-border/50 bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {copy.hero.currentTaskLabel}
                </p>
                <h4 className="text-lg font-semibold text-foreground">
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
