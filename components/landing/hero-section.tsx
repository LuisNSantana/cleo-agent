"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, CheckCircle } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

const floatingAgents = [
  {
    avatar: '/img/agents/emma4.png',
    name: 'Emma',
    action: 'Creating marketing campaign...',
    position: 'top-20 left-[5%]',
  },
  {
    avatar: '/img/agents/toby4.png',
    name: 'Toby',
    action: 'Debugging production code...',
    position: 'top-32 right-[8%]',
  },
  {
    avatar: '/img/agents/nora4.png',
    name: 'Nora',
    action: 'Engaging with community...',
    position: 'bottom-32 left-[10%]',
  },
  {
    avatar: '/img/agents/apu4.png',
    name: 'Apu',
    action: 'Resolving support tickets...',
    position: 'bottom-20 right-[12%]',
  },
]

const onboardingSteps = [
  {
    avatar: '/img/agents/logocleo4.png',
    name: 'Cleo',
    task: 'Coordinating your AI team',
    status: 'completed',
  },
  {
    avatar: '/img/agents/emma4.png',
    name: 'Emma',
    task: 'Analyzing your marketing strategy',
    status: 'in-progress',
  },
  {
    avatar: '/img/agents/toby4.png',
    name: 'Toby',
    task: 'Reviewing your codebase',
    status: 'pending',
  },
]

export function HeroSection() {
  const router = useRouter()
  const { t } = useI18n()
  const [currentStep, setCurrentStep] = useState(0)

  // Cycle through onboarding steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % onboardingSteps.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const handleStartFree = async () => {
    // Redirect to guest chat - users can try immediately without login
    router.push('/chat/guest')
  }

  const handleDemo = () => {
    router.push('/docs')
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      {/* Animated background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -right-20 top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute bottom-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column - Text content */}
          <motion.div
            className="flex flex-col justify-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Now in Open Beta
            </motion.div>

            {/* Main heading with spectacular letter animation */}
            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {t.landing.heroTitle.split('').map((char, i) => {
                // Create gradient color effect across title
                const totalChars = t.landing.heroTitle.length
                const hue = (i / totalChars) * 60 + 220 // Blue to purple gradient
                
                return (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ 
                      opacity: 0, 
                      y: -100,
                      rotateZ: -45,
                      scale: 0.5
                    }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      rotateZ: 0,
                      scale: 1
                    }}
                    transition={{ 
                      delay: i * 0.05,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    style={{
                      display: char === ' ' ? 'inline' : 'inline-block',
                      marginRight: char === ' ' ? '0.5rem' : '0',
                      background: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${hue + 20}, 70%, 50%))`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: `drop-shadow(0 0 ${8 + Math.sin(i * 0.5) * 4}px hsla(${hue}, 80%, 60%, 0.5))`,
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </motion.span>
                )
              })}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-muted-foreground sm:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {t.landing.heroSubtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                <Button
                  size="lg"
                  onClick={handleStartFree}
                  className="group relative overflow-hidden bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/40"
                >
                  {/* Animated shine effect */}
                  <motion.div
                    className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 1,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    {t.landing.heroCta}
                    <ArrowRight
                      weight="bold"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                  <div className="absolute inset-0 -z-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              </motion.div>

              {/* Demo button - Hidden as requested */}
              {/* <Button
                size="lg"
                variant="outline"
                onClick={handleDemo}
                className="group gap-2 border-border/60 bg-background/60 backdrop-blur-sm"
              >
                <Play weight="fill" className="h-4 w-4" />
                {t.landing.heroCtaSecondary}
              </Button> */}
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <p className="text-sm text-muted-foreground">
                {t.landing.trustedBy}
              </p>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/20 to-blue-500/20"
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground">
                  1000+ users worldwide
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right column - Onboarding Animation */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="relative w-full max-w-lg">
              {/* Main Onboarding Card */}
              <div className="relative rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">AI Team Onboarding</h3>
                  <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    Active
                  </div>
                </div>

                {/* Onboarding Steps */}
                <div className="space-y-3">
                  {onboardingSteps.map((step, index) => {
                    const isActive = index === currentStep
                    const isCompleted = index < currentStep || (currentStep === onboardingSteps.length - 1 && index === currentStep)

                    return (
                      <motion.div
                        key={step.name}
                        initial={false}
                        animate={{
                          scale: isActive ? 1.02 : 1,
                          opacity: isCompleted ? 0.6 : 1,
                        }}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                          isActive
                            ? 'border-primary/50 bg-primary/5'
                            : isCompleted
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'border-border/30 bg-muted/20'
                        }`}
                      >
                        {/* Agent Avatar */}
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                            <AvatarImage 
                              src={step.avatar} 
                              alt={step.name}
                              className="object-cover"
                              loading="lazy"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold text-xs">
                              {step.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isCompleted && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-full">
                              <CheckCircle weight="fill" className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{step.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{step.task}</p>
                        </div>

                        {/* Status Indicator */}
                        {isActive && !isCompleted && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="h-5 w-5 shrink-0 rounded-full border-2 border-primary border-t-transparent"
                          />
                        )}
                      </motion.div>
                    )
                  })}
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-blue-600"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Floating Agent Cards */}
              {floatingAgents.map((agent, index) => (
                <motion.div
                  key={agent.name}
                  className={`absolute ${agent.position} hidden rounded-lg border border-border/50 bg-card/90 p-2 shadow-lg backdrop-blur-sm xl:block`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: [0.7, 1, 0.7],
                    scale: [0.95, 1.05, 0.95],
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    delay: index * 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage 
                        src={agent.avatar} 
                        alt={agent.name}
                        className="object-cover"
                        loading="lazy"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-xs font-semibold">
                        {agent.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[150px] min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{agent.action}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
