"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import {
  User,
  Brain,
  Lightning,
  CheckCircle,
  Sparkle,
  Robot,
  Target,
  Code,
  Repeat,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'

const agentTemplates = [
  {
    name: 'Marketing Assistant',
    role: 'Content creator and social media manager',
    color: 'from-pink-500 to-rose-500',
    icon: '📱',
  },
  {
    name: 'Code Reviewer',
    role: 'Analyzes code quality and suggests improvements',
    color: 'from-blue-500 to-cyan-500',
    icon: '💻',
  },
  {
    name: 'Sales Assistant',
    role: 'Generates leads and manages customer relationships',
    color: 'from-green-500 to-emerald-500',
    icon: '💼',
  },
  {
    name: 'Data Analyst',
    role: 'Processes data and generates insights',
    color: 'from-purple-500 to-indigo-500',
    icon: '📊',
  },
]

const creationSteps = [
  {
    step: 1,
    title: 'Define Your Agent',
    description: 'Name, role, and personality',
    icon: User,
  },
  {
    step: 2,
    title: 'Configure Capabilities',
    description: 'Select tools and permissions',
    icon: Lightning,
  },
  {
    step: 3,
    title: 'Train & Test',
    description: 'Fine-tune with examples',
    icon: Brain,
  },
  {
    step: 4,
    title: 'Deploy & Monitor',
    description: 'Launch and track performance',
    icon: CheckCircle,
  },
]

export function CustomAgentsSection() {
  const { t, locale } = useI18n()
  const [currentStep, setCurrentStep] = useState(0)
  const [currentTemplate, setCurrentTemplate] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    capability: '',
  })

  // Cycle through templates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTemplate((prev) => (prev + 1) % agentTemplates.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Simulate form filling
  useEffect(() => {
    const timeout = setTimeout(() => {
      const template = agentTemplates[currentTemplate]
      setFormData({
        name: template.name,
        role: template.role,
        capability: 'Advanced',
      })
    }, 500)
    return () => clearTimeout(timeout)
  }, [currentTemplate])

  // Cycle through creation steps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % creationSteps.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Translation fallbacks for content not yet in translations.ts
  const customAgents = {
    badge: t.landing.customAgentsBadge || 'Most Powerful Feature',
    title: t.landing.customAgentsTitle || 'Build Your Own AI Agents',
    subtitle: t.landing.customAgentsSubtitle || 'Create custom agents tailored to your exact needs. No coding required. Deploy specialized AI teammates in minutes.',
    tagline: t.landing.customAgentsTagline || 'Deploy in under 5 minutes.',
    formName: t.landing.customAgentsFormName || 'Agent Name',
    formRole: t.landing.customAgentsFormRole || 'Role & Expertise',
    formCapability: t.landing.customAgentsFormCapability || 'Capability Level',
    preview: t.landing.customAgentsPreview || 'Preview',
    deploy: t.landing.customAgentsDeploy || 'Deploy Agent',
    benefitsTitle: t.landing.customAgentsBenefitsTitle || 'Why Build Custom Agents?',
    benefit1Title: t.landing.customAgentsBenefit1Title || 'Unlimited Custom Agents',
    benefit1Desc: t.landing.customAgentsBenefit1Desc || 'Create as many specialized agents as you need for different tasks and workflows.',
    benefit2Title: t.landing.customAgentsBenefit2Title || 'Task-Specific Expertise',
    benefit2Desc: t.landing.customAgentsBenefit2Desc || 'Each agent focuses on one domain, ensuring expert-level performance and accuracy.',
    benefit3Title: t.landing.customAgentsBenefit3Title || 'No-Code Builder',
    benefit3Desc: t.landing.customAgentsBenefit3Desc || 'Intuitive interface - no programming required. Build agents in minutes, not hours.',
    benefit4Title: t.landing.customAgentsBenefit4Title || 'Sub-Agents & Delegation',
    benefit4Desc: t.landing.customAgentsBenefit4Desc || 'Create hierarchies - parent agents can delegate to specialized sub-agents automatically.',
    useCasesTitle: t.landing.customAgentsUseCasesTitle || 'Popular Use Cases',
    useCase1: t.landing.customAgentsUseCase1 || 'Customer support automation with specialized product agents',
    useCase2: t.landing.customAgentsUseCase2 || 'Content creation pipeline with writer, editor, and publisher agents',
    useCase3: t.landing.customAgentsUseCase3 || 'Development workflow with code reviewer and documentation agents',
    useCase4: t.landing.customAgentsUseCase4 || 'Marketing campaigns with research, copywriting, and analytics agents',
  }

  const benefits = [
    {
      icon: Robot,
      title: customAgents.benefit1Title,
      description: customAgents.benefit1Desc,
      color: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      icon: Target,
      title: customAgents.benefit2Title,
      description: customAgents.benefit2Desc,
      color: 'from-purple-500/20 to-pink-500/20',
    },
    {
      icon: Code,
      title: customAgents.benefit3Title,
      description: customAgents.benefit3Desc,
      color: 'from-green-500/20 to-emerald-500/20',
    },
    {
      icon: Repeat,
      title: customAgents.benefit4Title,
      description: customAgents.benefit4Desc,
      color: 'from-orange-500/20 to-red-500/20',
    },
  ]

  return (
    <section id="builder" data-landing-search data-landing-search-title="Agent Builder" data-landing-search-type="section" className="relative w-full overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background py-20 sm:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute right-0 top-1/2 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-screen-2xl 2xl:max-w-[90rem] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* PROMINENT 5-MINUTE TAGLINE - HERO BADGE */}
          <motion.div
            className="mb-6 inline-flex items-center gap-3 rounded-full border-2 border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 px-8 py-4 shadow-lg shadow-primary/20"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 10px 40px rgba(var(--primary), 0.2)",
                "0 10px 60px rgba(var(--primary), 0.4)",
                "0 10px 40px rgba(var(--primary), 0.2)"
              ]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <Lightning weight="fill" className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-primary sm:text-xl md:text-2xl">
              {customAgents.tagline}
            </span>
            <Lightning weight="fill" className="h-6 w-6 text-primary" />
          </motion.div>

          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {customAgents.title}
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground sm:text-2xl">
            {customAgents.subtitle}
          </p>
          
          {/* Secondary badge for additional emphasis */}
          <motion.div
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-sm font-medium text-primary"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Sparkle weight="fill" className="h-4 w-4" />
            {customAgents.badge}
          </motion.div>
        </motion.div>

        {/* Main Content - Two Columns */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20 items-start">
          {/* Left: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="sticky top-24">
              {/* Agent Creation Interface - MODERNIZED */}
              <div className="group relative rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-8 shadow-2xl backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-primary/20">
                {/* Glow effect on hover */}
                <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 opacity-0 blur transition duration-500 group-hover:opacity-100" />
                
                <div className="relative">
                  {/* Header with pulse animation */}
                  <div className="mb-8 flex items-center justify-between border-b-2 border-border/40 pb-6">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/30"
                        animate={{ 
                          boxShadow: [
                            "0 0 0 0 rgba(var(--primary), 0)",
                            "0 0 0 8px rgba(var(--primary), 0.1)",
                            "0 0 0 0 rgba(var(--primary), 0)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Robot weight="duotone" className="h-8 w-8 text-primary" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">AI Agent Builder</h3>
                        <p className="text-sm text-muted-foreground">No-code creation wizard</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-red-500/30" />
                      <div className="h-3.5 w-3.5 rounded-full bg-yellow-500 ring-2 ring-yellow-500/30" />
                      <div className="h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-green-500/30" />
                    </div>
                  </div>

                {/* Form Fields with Animation - IMPROVED */}
                <div className="space-y-6">
                  {/* Agent Name */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {customAgents.formName}
                    </label>
                    <motion.div
                      className="rounded-lg border border-border/60 bg-background/60 p-3"
                      key={`name-${currentTemplate}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={formData.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2"
                        >
                          <span className="text-2xl">{agentTemplates[currentTemplate].icon}</span>
                          <span className="font-medium text-foreground">{formData.name}</span>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  {/* Agent Role */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {customAgents.formRole}
                    </label>
                    <motion.div
                      className="rounded-lg border border-border/60 bg-background/60 p-3"
                      key={`role-${currentTemplate}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={formData.role}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-foreground"
                        >
                          {formData.role}
                        </motion.p>
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  {/* Capability Level */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {customAgents.formCapability}
                    </label>
                    <div className="flex gap-2">
                      {['Basic', 'Advanced', 'Expert'].map((level) => (
                        <motion.button
                          key={level}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            formData.capability === level
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {level}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Agent Preview Card */}
                  <motion.div
                    className={`mt-6 rounded-xl bg-gradient-to-br ${agentTemplates[currentTemplate].color} p-4`}
                    key={`preview-${currentTemplate}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="mb-1 text-xs font-medium text-white/80">{customAgents.preview}</p>
                        <h4 className="mb-2 text-lg font-bold text-white">{formData.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                            AI Agent
                          </span>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                            {formData.capability}
                          </span>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="text-4xl"
                      >
                        {agentTemplates[currentTemplate].icon}
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Deploy Button */}
                  <motion.button
                    className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {customAgents.deploy}
                      <CheckCircle weight="bold" className="h-5 w-5" />
                    </span>
                  </motion.button>
                </div>
                </div>
              </div>

              {/* Creation Steps Indicator */}
              <motion.div
                className="mt-6 grid grid-cols-4 gap-2"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                {creationSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div
                      key={step.step}
                      className={`rounded-lg border p-3 text-center transition-all ${
                        index === currentStep
                          ? 'border-primary bg-primary/10'
                          : 'border-border/40 bg-background/40'
                      }`}
                    >
                      <Icon
                        weight="duotone"
                        className={`mx-auto mb-1 h-5 w-5 ${
                          index === currentStep ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <p className={`text-xs font-medium ${
                        index === currentStep ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {step.title.split(' ')[0]}
                      </p>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Benefits */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
              {customAgents.benefitsTitle}
            </h3>

            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`border-border/60 bg-gradient-to-br ${benefit.color} p-6 backdrop-blur-sm transition-all hover:shadow-lg`}>
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background/60">
                        <Icon weight="duotone" className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="mb-2 font-semibold text-foreground">
                          {benefit.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}

            {/* Use Cases */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-8 rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
            >
              <h4 className="mb-4 font-semibold text-foreground">{customAgents.useCasesTitle}</h4>
              <div className="space-y-3">
                {[
                  customAgents.useCase1,
                  customAgents.useCase2,
                  customAgents.useCase3,
                  customAgents.useCase4,
                ].map((useCase, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <CheckCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">{useCase}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
