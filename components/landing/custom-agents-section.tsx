"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { useMemo, useState, useEffect } from 'react'
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
import { getLandingCopy } from '@/lib/i18n/landing-copy'
import { Button } from '@/components/ui/button'

export function CustomAgentsSection() {
  const { t, locale } = useI18n()
  const copy = getLandingCopy(locale)

  const templates = useMemo(() => copy.customAgents.templates, [locale, copy])
  const setupSteps = useMemo(
    () => [
      { step: 1, icon: User, ...copy.customAgents.steps[0] },
      { step: 2, icon: Lightning, ...copy.customAgents.steps[1] },
      { step: 3, icon: Brain, ...copy.customAgents.steps[2] },
      { step: 4, icon: CheckCircle, ...copy.customAgents.steps[3] },
    ],
    [locale, copy]
  )

  const [currentStep, setCurrentStep] = useState(0)
  const [currentTemplate, setCurrentTemplate] = useState(0)
  const [formData, setFormData] = useState({ name: '', role: '', capability: '' })
  const generatedConfig = useMemo(
    () => ({
      name: formData.name || templates[currentTemplate]?.name,
      mission: formData.role || templates[currentTemplate]?.role,
      capability: formData.capability || copy.customAgents.capabilityLabels.advanced,
      connectors: setupSteps.slice(0, currentStep + 1).map((step) => step.title),
    }),
    [formData, templates, currentTemplate, setupSteps, currentStep, copy.customAgents.capabilityLabels.advanced]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTemplate((prev) => (prev + 1) % templates.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [templates.length])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const template = templates[currentTemplate]
      setFormData({
        name: template.name,
        role: template.role,
        capability: copy.customAgents.capabilityLabels.advanced,
      })
    }, 500)
    return () => clearTimeout(timeout)
  }, [currentTemplate, templates, copy.customAgents.capabilityLabels.advanced])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % setupSteps.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [setupSteps.length])

  const customAgents = {
    badge: t.landing.customAgentsBadge || 'Most Powerful Feature',
    title: t.landing.customAgentsTitle || 'Build Your Own AI Agents',
    subtitle:
      t.landing.customAgentsSubtitle ||
      'Create custom agents tailored to your exact needs. No coding required. Deploy specialized AI teammates in minutes.',
    tagline: t.landing.customAgentsTagline || 'Deploy in under 5 minutes.',
    formName: t.landing.customAgentsFormName || 'Agent Name',
    formRole: t.landing.customAgentsFormRole || 'Role & Expertise',
    formCapability: t.landing.customAgentsFormCapability || 'Capability Level',
    preview: t.landing.customAgentsPreview || 'Preview',
    deploy: t.landing.customAgentsDeploy || 'Deploy Agent',
    benefitsTitle: t.landing.customAgentsBenefitsTitle || 'Why Build Custom Agents?',
    benefit1Title: t.landing.customAgentsBenefit1Title || 'Unlimited Custom Agents',
    benefit1Desc:
      t.landing.customAgentsBenefit1Desc ||
      'Create as many specialized agents as you need for different tasks and workflows.',
    benefit2Title:
      t.landing.customAgentsBenefit2Title || 'Task-Specific Expertise',
    benefit2Desc:
      t.landing.customAgentsBenefit2Desc ||
      'Each agent focuses on one domain, ensuring expert-level performance and accuracy.',
    benefit3Title: t.landing.customAgentsBenefit3Title || 'No-Code Builder',
    benefit3Desc:
      t.landing.customAgentsBenefit3Desc ||
      'Intuitive interface - no programming required. Build agents in minutes, not hours.',
    benefit4Title:
      t.landing.customAgentsBenefit4Title || 'Sub-Agents & Delegation',
    benefit4Desc:
      t.landing.customAgentsBenefit4Desc ||
      'Create hierarchies - parent agents can delegate to specialized sub-agents automatically.',
    useCasesTitle: t.landing.customAgentsUseCasesTitle || 'Popular Use Cases',
    useCase1:
      t.landing.customAgentsUseCase1 ||
      'Customer support automation with specialized product agents',
    useCase2:
      t.landing.customAgentsUseCase2 ||
      'Content creation pipeline with writer, editor, and publisher agents',
    useCase3:
      t.landing.customAgentsUseCase3 ||
      'Development workflow with code reviewer and documentation agents',
    useCase4:
      t.landing.customAgentsUseCase4 ||
      'Marketing campaigns with research, copywriting, and analytics agents',
  }

  const benefits = [
    {
      icon: Robot,
      title: customAgents.benefit1Title,
      description: customAgents.benefit1Desc,
      color: 'from-[#A38CFF]/20 to-[#7E63F2]/20',
    },
    {
      icon: Target,
      title: customAgents.benefit2Title,
      description: customAgents.benefit2Desc,
      color: 'from-[#64D2FF]/20 to-[#4AA6FF]/20',
    },
    {
      icon: Code,
      title: customAgents.benefit3Title,
      description: customAgents.benefit3Desc,
      color: 'from-[#30D158]/20 to-[#0A9F41]/20',
    },
    {
      icon: Repeat,
      title: customAgents.benefit4Title,
      description: customAgents.benefit4Desc,
      color: 'from-[#FFD60A]/20 to-[#FFC300]/20',
    },
  ]

  return (
    <section
      id="builder"
      data-landing-search
      data-landing-search-title="Agent Builder"
      data-landing-search-type="section"
      className="relative w-full overflow-hidden bg-gradient-to-br from-[#F9F6F2] via-[#A38CFF]/10 to-[#64D2FF]/10 py-24 sm:py-36"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute right-0 top-1/2 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="mb-6 inline-flex items-center gap-3 rounded-full border-2 border-primary/40 bg-gradient-to-r from-[#A38CFF]/20 via-[#8E73FF]/15 to-[#64D2FF]/20 px-8 py-4 text-sm font-bold text-primary shadow-lg shadow-primary/20"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 10px 40px rgba(var(--primary), 0.2)',
                '0 10px 60px rgba(var(--primary), 0.4)',
                '0 10px 40px rgba(var(--primary), 0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          >
            <Sparkle weight="fill" className="h-5 w-5" />
            {customAgents.badge}
          </motion.div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {customAgents.title}
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground sm:text-xl">
            {customAgents.subtitle}
          </p>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template, index) => (
                <motion.button
                  key={template.name}
                  onClick={() => setCurrentTemplate(index)}
                  className={`group relative flex h-full flex-col items-start justify-between overflow-hidden rounded-2xl border-2 p-6 text-left transition-all ${
                    index === currentTemplate
                      ? 'border-primary/60 shadow-lg shadow-primary/20'
                      : 'border-border/40 bg-card/60 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10'
                  }`}
                  whileHover={{ y: -4 }}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${template.color} opacity-${
                      index === currentTemplate ? '20' : '0'
                    } transition-opacity duration-300 group-hover:opacity-20`}
                  />
                  <span className="relative text-2xl">{template.icon}</span>
                  <div className="relative">
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.role}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <motion.div
              className="rounded-3xl border-2 border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary/70">
                    {customAgents.tagline}
                  </p>
                  <h3 className="text-xl font-semibold text-foreground">{templates[currentTemplate].name}</h3>
                </div>
                <motion.div
                  className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {copy.hero.onboardingActive}
                </motion.div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    {customAgents.formName}
                  </label>
                  <div className="mt-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-medium">
                    {formData.name}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    {customAgents.formRole}
                  </label>
                  <div className="mt-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                    {formData.role}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground">
                    {customAgents.formCapability}
                  </label>
                  <div className="mt-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                    {formData.capability}
                  </div>
                </div>
                <div className="flex items-end justify-end">
                  <Button size="sm" className="rounded-full bg-[#64D2FF] px-5 text-[#0D0D0D] hover:bg-[#45BAF0]">
                    {customAgents.deploy}
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.pre
              className="overflow-hidden rounded-2xl border border-border/40 bg-card/70 p-5 text-left text-xs font-mono text-muted-foreground"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
{JSON.stringify(generatedConfig, null, 2)}
            </motion.pre>
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {setupSteps.map((step, index) => {
              const isActive = index === currentStep
              return (
                <motion.div
                  key={step.step}
                    className={`flex items-center gap-4 rounded-2xl border p-5 transition-all ${
                    isActive
                      ? 'border-[#A38CFF]/50 bg-[#A38CFF]/10 shadow-lg shadow-primary/10'
                    : 'border-border/50 bg-card/60'
                  }`}
                  animate={{ y: isActive ? -2 : 0, opacity: isActive ? 1 : 0.8 }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A38CFF]/15 to-[#64D2FF]/20">
                    <step.icon weight="duotone" className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-primary/80">
                      {step.step.toString().padStart(2, '0')}
                    </p>
                    <h4 className="text-base font-semibold text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {isActive && (
                    <motion.div
                      className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        <motion.div
          className="mt-16 grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-2 border-border/40 bg-card/70 p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className={`absolute -inset-0.5 bg-gradient-to-br ${benefit.color} opacity-0 blur-md transition duration-500 hover:opacity-20`} />
              <div className="relative">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${benefit.color}`}>
                  <benefit.icon weight="duotone" className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </Card>
          ))}
        </motion.div>

        <motion.div
          className="mt-16 rounded-3xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="mb-6 text-2xl font-bold text-foreground">{customAgents.useCasesTitle}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {[customAgents.useCase1, customAgents.useCase2, customAgents.useCase3, customAgents.useCase4].map(
              (useCase, index) => (
                <motion.div
                  key={index}
                  className="rounded-2xl border border-border/40 bg-background/60 p-5"
                  whileHover={{ y: -4 }}
                >
                  <p className="text-sm text-muted-foreground">{useCase}</p>
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
