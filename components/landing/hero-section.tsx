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
    // Redirect to auth page for signup/login
    router.push('/auth')
  }

  const handleDemo = () => {
    router.push('/docs')
  }

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 xl:to-background py-20 sm:py-32">
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

  <div className="mx-auto w-full max-w-screen-2xl 2xl:max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.9fr] lg:gap-16 xl:gap-24 items-center">
          {/* Left column - Text content */}
          <motion.div
            className="flex w-full flex-col justify-center space-y-8"
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

            {/* MEGA PROMINENT 5-MINUTE TAGLINE - FIRST */}
            <motion.div
              className="inline-flex items-center gap-4 rounded-full border-2 border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 px-10 py-5 shadow-xl shadow-primary/30 backdrop-blur-sm w-fit"
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                <CheckCircle weight="fill" className="h-8 w-8 text-primary shrink-0 sm:h-10 sm:w-10" />
              </motion.div>
              <div>
                <p className="text-xs font-bold text-primary/70 uppercase tracking-widest sm:text-sm">{t.landing.deployTime}</p>
                <motion.p 
                  className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl"
                  animate={{
                    textShadow: [
                      "0 0 20px rgba(var(--primary), 0.3)",
                      "0 0 30px rgba(var(--primary), 0.5)",
                      "0 0 20px rgba(var(--primary), 0.3)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                >
                  {t.landing.under5Minutes}
                </motion.p>
              </div>
            </motion.div>

            {/* Main heading with spectacular letter animation */}
            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
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
                      delay: 0.5 + i * 0.05,
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
              className="text-lg text-muted-foreground sm:text-xl lg:text-2xl leading-relaxed"
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
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                <Button
                  size="lg"
                  onClick={handleStartFree}
                  className="group relative h-14 overflow-hidden bg-gradient-to-r from-primary via-primary to-blue-600 px-8 text-base font-semibold text-white shadow-2xl shadow-primary/40 transition-all hover:scale-105 hover:shadow-3xl hover:shadow-primary/50 active:scale-95"
                >
                  {/* Animated shimmer effect */}
                  <motion.div
                    className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: "-100%", skewX: -15 }}
                    animate={{ x: "200%" }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                      ease: "easeInOut",
                    }}
                  />
                  
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/0 via-blue-400/40 to-primary/0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                  
                  <span className="relative z-10 flex items-center gap-2.5">
                    <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text">
                      {t.landing.heroCta}
                    </span>
                    <ArrowRight
                      weight="bold"
                      className="transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110"
                    />
                  </span>
                  
                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 -z-0 bg-gradient-to-r from-blue-600 via-primary to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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

            {/* Speed promise microcopy */}
            <p className="text-xs text-muted-foreground">
              Deploy your first agent in less time than frying an egg 🍳 — under 5 minutes.
            </p>

            {/* Trust indicators */}
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                  <CheckCircle weight="fill" className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    No credit card required
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                  <CheckCircle weight="fill" className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    5-minute setup
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.landing.trustedBy}
              </p>
            </motion.div>

            {/* Small agent chips (relocated from right column to avoid overlap) */}
            <motion.div
              className="mt-6 hidden flex-wrap gap-3 xl:flex"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              {floatingAgents.map((agent, index) => (
                <motion.div
                  key={agent.name}
                  className="flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 shadow-sm backdrop-blur-sm"
                  animate={{
                    y: [0, -3, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: index * 0.2 }}
                >
                  <Avatar className="h-6 w-6 border border-background/60">
                    <AvatarImage src={agent.avatar} alt={agent.name} className="object-cover" loading="lazy" />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-purple-600 text-white">
                      {agent.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground/90">{agent.name}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column - Onboarding Animation */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="relative w-full">
              {/* Main Onboarding Card */}
              <div className="relative z-10 rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
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

                        {/* Removed floating agent cards from this column to avoid overlapping the onboarding card */}

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
          </motion.div>
        </div>
      </div>
    </section>
  )
}
