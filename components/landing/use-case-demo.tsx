"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState, useEffect } from 'react'
import { CheckCircle, Clock, Sparkle } from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useI18n } from '@/lib/i18n'
import { getLandingCopy } from '@/lib/i18n/landing-copy'

type Scenario = {
  agentName: string
  agentRole: string
  avatar: string
  title: string
  steps: string[]
}

type StepStatus = {
  text: string
  status: 'pending' | 'in-progress' | 'completed'
}

export function UseCaseDemo() {
  const { locale } = useI18n()
  const copy = getLandingCopy(locale)

  const scenarios = useMemo<Scenario[]>(
    () => [
      {
        agentName: copy.useCaseDemo.scenarios[0].agentName,
        agentRole: copy.useCaseDemo.scenarios[0].role,
        avatar: '/img/agents/emma4.png',
        title: copy.useCaseDemo.scenarios[0].title,
        steps: copy.useCaseDemo.scenarios[0].steps,
      },
      {
        agentName: copy.useCaseDemo.scenarios[1].agentName,
        agentRole: copy.useCaseDemo.scenarios[1].role,
        avatar: '/img/agents/toby4.png',
        title: copy.useCaseDemo.scenarios[1].title,
        steps: copy.useCaseDemo.scenarios[1].steps,
      },
      {
        agentName: copy.useCaseDemo.scenarios[2].agentName,
        agentRole: copy.useCaseDemo.scenarios[2].role,
        avatar: '/img/agents/peter4.png',
        title: copy.useCaseDemo.scenarios[2].title,
        steps: copy.useCaseDemo.scenarios[2].steps,
      },
    ],
    [copy, locale]
  )

  const [currentScenario, setCurrentScenario] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([])

  const scenario = scenarios[currentScenario]

  useEffect(() => {
    setStepStatuses(
      scenario.steps.map((text, index) => ({
        text,
        status: index === 0 ? 'in-progress' : 'pending',
      }))
    )
    setCurrentStep(0)
  }, [scenario])

  useEffect(() => {
    if (currentStep >= scenario.steps.length) {
      const timer = setTimeout(() => {
        setCurrentScenario((prev) => (prev + 1) % scenarios.length)
      }, 2200)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      setStepStatuses((prev) =>
        prev.map((step, index) => {
          if (index < currentStep) return { ...step, status: 'completed' }
          if (index === currentStep) return { ...step, status: 'completed' }
          if (index === currentStep + 1) return { ...step, status: 'in-progress' }
          return step
        })
      )
      setCurrentStep((prev) => prev + 1)
    }, 1600)

    return () => clearTimeout(timer)
  }, [currentStep, scenario.steps.length])

  return (
    <section
      id="demo"
      data-landing-search
      data-landing-search-title="Live Demo"
      data-landing-search-type="section"
      className="relative w-full overflow-hidden bg-gradient-to-br from-[#F9F6F2] via-[#A38CFF]/10 to-[#64D2FF]/10 py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12">
        <div className="mb-12 text-center">
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-[#A38CFF]/20 via-[#8E73FF]/15 to-[#64D2FF]/20 px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Sparkle weight="fill" className="h-4 w-4" />
            {copy.useCaseDemo.badge}
          </motion.div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {copy.useCaseDemo.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {copy.useCaseDemo.subtitle}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentScenario}-${locale}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border/50 bg-card/85 p-8 shadow-2xl shadow-primary/10 backdrop-blur-xl"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-[#A38CFF]/30 shadow-lg shadow-primary/20">
                  <AvatarImage src={scenario.avatar} alt={scenario.agentName} className="object-cover" loading="lazy" />
                  <AvatarFallback className="bg-gradient-to-br from-[#A38CFF] to-[#64D2FF] text-lg font-bold text-white">
                    {scenario.agentName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-green-500 shadow-md">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{scenario.agentName}</h3>
                <p className="text-sm text-muted-foreground">{scenario.agentRole}</p>
              </div>
              <div className="ml-auto rounded-full bg-[#64D2FF]/15 px-4 py-1.5 text-xs font-medium text-[#1E255E]">
                <Clock weight="bold" className="mr-1 inline h-3 w-3" />
                {Math.floor(Math.random() * 3) + 1} min
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-border/30 bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">{copy.hero.currentTaskLabel}</p>
              <h4 className="text-lg font-semibold text-foreground">{scenario.title}</h4>
            </div>

            <div className="space-y-3">
              {stepStatuses.map((step, index) => (
                <motion.div
                  key={`${step.text}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                    step.status === 'completed'
                      ? 'border-[#30D158]/30 bg-[#30D158]/10'
                      : step.status === 'in-progress'
                        ? 'border-[#A38CFF]/50 bg-[#A38CFF]/10'
                        : 'border-border/30 bg-muted/20'
                  }`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {step.status === 'completed' ? (
                      <CheckCircle weight="fill" className="h-6 w-6 text-[#30D158]" />
                    ) : step.status === 'in-progress' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="h-5 w-5 rounded-full border-2 border-[#A38CFF] border-t-transparent"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border/50" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{step.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
