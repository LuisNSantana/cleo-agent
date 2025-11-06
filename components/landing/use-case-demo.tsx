"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Sparkle } from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface UseCaseStep {
  text: string
  status: 'pending' | 'in-progress' | 'completed'
}

interface UseCaseDemo {
  agent: {
    name: string
    avatar: string
    role: string
  }
  title: string
  steps: string[]
}

const demos: UseCaseDemo[] = [
  {
    agent: {
      name: 'Emma',
      avatar: '/img/agents/emma4.png',
      role: 'Marketing Specialist',
    },
    title: 'Creating Social Media Campaign',
    steps: [
      'Analyzing brand voice and target audience',
      'Generating 10 tweet variations',
      'Creating Instagram carousel content',
      'Scheduling posts for optimal engagement',
    ],
  },
  {
    agent: {
      name: 'Toby',
      avatar: '/img/agents/toby4.png',
      role: 'Technical Expert',
    },
    title: 'Code Review & Refactoring',
    steps: [
      'Scanning codebase for patterns',
      'Identifying performance bottlenecks',
      'Suggesting architectural improvements',
      'Generating unit tests',
    ],
  },
  {
    agent: {
      name: 'Peter',
      avatar: '/img/agents/peter4.png',
      role: 'Research Assistant',
    },
    title: 'Market Research Analysis',
    steps: [
      'Gathering competitor data',
      'Analyzing market trends',
      'Extracting key insights',
      'Generating comprehensive report',
    ],
  },
]

export function UseCaseDemo() {
  const [currentDemo, setCurrentDemo] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<UseCaseStep[]>([])

  const demo = demos[currentDemo]

  // Initialize step statuses
  useEffect(() => {
    setStepStatuses(
      demo.steps.map((text, index) => ({
        text,
        status: index === 0 ? 'in-progress' : 'pending',
      }))
    )
    setCurrentStep(0)
  }, [currentDemo, demo.steps])

  // Progress through steps
  useEffect(() => {
    if (currentStep >= demo.steps.length) {
      // Move to next demo after completing all steps
      const timer = setTimeout(() => {
        setCurrentDemo((prev) => (prev + 1) % demos.length)
      }, 2000)
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
    }, 1500)

    return () => clearTimeout(timer)
  }, [currentStep, demo.steps.length])

  return (
    <section id="demo" data-landing-search data-landing-search-title="Live Demo" data-landing-search-type="section" className="relative w-full overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl 2xl:max-w-[90rem]">
        <div className="mb-12 text-center">
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Sparkle weight="fill" className="h-4 w-4" />
            See It In Action
          </motion.div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Watch Your AI Team Work
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Real-time demonstrations of how Cleo's agents complete complex tasks autonomously
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentDemo}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl"
          >
            {/* Agent Header */}
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg">
                  <AvatarImage
                    src={demo.agent.avatar}
                    alt={demo.agent.name}
                    className="object-cover"
                    loading="lazy"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-lg">
                    {demo.agent.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator badge */}
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-green-500 shadow-md">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{demo.agent.name}</h3>
                <p className="text-sm text-muted-foreground">{demo.agent.role}</p>
              </div>
              <div className="ml-auto rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <Clock weight="bold" className="mr-1 inline h-3 w-3" />
                {Math.floor(Math.random() * 3) + 1} min
              </div>
            </div>

            {/* Task Title */}
            <div className="mb-6 rounded-lg border border-border/30 bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Current Task</p>
              <h4 className="text-lg font-semibold text-foreground">{demo.title}</h4>
            </div>

            {/* Steps Progress */}
            <div className="space-y-3">
              {stepStatuses.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                    step.status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : step.status === 'in-progress'
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/30 bg-muted/20'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {step.status === 'completed' ? (
                      <CheckCircle weight="fill" className="h-6 w-6 text-green-500" />
                    ) : step.status === 'in-progress' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                  </div>

                  {/* Step Text */}
                  <p
                    className={`flex-1 text-sm ${
                      step.status === 'completed'
                        ? 'text-muted-foreground line-through'
                        : 'font-medium text-foreground'
                    }`}
                  >
                    {step.text}
                  </p>

                  {/* Timestamp */}
                  {step.status === 'completed' && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs text-muted-foreground"
                    >
                      {index}s ago
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-6 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-2 bg-gradient-to-r from-primary to-blue-600"
                initial={{ width: '0%' }}
                animate={{
                  width: `${(currentStep / demo.steps.length) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Demo Indicators */}
            <div className="mt-6 flex justify-center gap-2">
              {demos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentDemo(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentDemo ? 'w-8 bg-primary' : 'w-2 bg-border hover:bg-primary/50'
                  }`}
                  aria-label={`Go to demo ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
