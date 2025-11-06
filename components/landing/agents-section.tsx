"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import {
  User,
  Briefcase,
  PaintBrush,
  Code,
  Megaphone,
  ChartLine,
  FileText,
  Lightbulb,
  Sparkle,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useMemo, useState } from 'react'
import { AgentModal } from '@/components/landing/agent-modal'
// Import predefined agent configs to show accurate details in modal
import { CLEO_AGENT } from '@/lib/agents/predefined/cleo'
import { EMMA_AGENT } from '@/lib/agents/predefined/emma'
import { TOBY_AGENT } from '@/lib/agents/predefined/toby'
import { NORA_AGENT } from '@/lib/agents/predefined/nora'
import { APU_AGENT } from '@/lib/agents/predefined/apu'
import { PETER_AGENT } from '@/lib/agents/predefined/peter'
import { WEX_AGENT } from '@/lib/agents/predefined/wex'
import { AMI_AGENT } from '@/lib/agents/predefined/ami'
import { JENN_AGENT } from '@/lib/agents/predefined/jenn'
import { ASTRA_AGENT } from '@/lib/agents/predefined/astra'

const agents = [
  {
    name: 'Cleo',
    role: 'Your AI Orchestrator',
    icon: Sparkle,
    color: 'from-violet-500 to-purple-600',
    skills: ['Multi-agent coordination', 'Task delegation', 'Workflow automation', 'Smart routing'],
    avatar: '/img/agents/logocleo4.png',
    featured: true,
  },
  {
    name: 'Emma',
    role: 'E-commerce & Marketing',
    icon: Megaphone,
    color: 'from-pink-500 to-rose-500',
    skills: ['Content creation', 'SEO optimization', 'Social media', 'Brand voice'],
    avatar: '/img/agents/emma4.png',
    featured: false,
  },
  {
    name: 'Toby',
    role: 'Software Engineering & IoT',
    icon: Code,
    color: 'from-blue-500 to-cyan-500',
    skills: ['Programming', 'Debugging', 'Architecture', 'IoT & Embedded Systems'],
    avatar: '/img/agents/toby4.png',
    featured: false,
  },
  {
    name: 'Nora',
    role: 'Medical Information & Triage',
    icon: FileText,
    color: 'from-cyan-500 to-blue-500',
    skills: ['Health guidance', 'Evidence-based info', 'Risk assessment', 'Patient education'],
    avatar: '/img/agents/nora4.png',
    featured: false,
  },
  {
    name: 'Peter',
    role: 'Financial Advisor & Business Strategy',
    icon: ChartLine,
    color: 'from-orange-500 to-amber-500',
    skills: ['Financial modeling', 'Business strategy', 'Accounting', 'Crypto analysis'],
    avatar: '/img/agents/peter4.png',
    featured: false,
  },
  {
    name: 'Jenn',
    role: 'Community & Social Media Manager',
    icon: Megaphone,
    color: 'from-purple-500 to-pink-500',
    skills: ['Twitter/X management', 'Community engagement', 'Content scheduling', 'Analytics'],
    avatar: '/img/agents/jenn4.png',
    featured: false,
  },
  {
    name: 'Apu',
    role: 'Support Specialist',
    icon: User,
    color: 'from-green-500 to-emerald-500',
    skills: ['Customer support', 'Issue resolution', 'Documentation', 'Training'],
    avatar: '/img/agents/apu4.png',
    featured: false,
  },
  {
    name: 'Wex',
    role: 'Web Automation',
    icon: Briefcase,
    color: 'from-slate-600 to-gray-700',
    skills: ['Web scraping', 'Browser automation', 'Data extraction', 'Testing'],
    avatar: '/img/agents/wex4.png',
    featured: false,
  },
  {
    name: 'Ami',
    role: 'Calendar & Scheduling',
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-500',
    skills: ['Calendar management', 'Meeting scheduling', 'Reminders', 'Time tracking'],
    avatar: '/img/agents/ami4.png',
    featured: false,
  },
  {
    name: 'Astra',
    role: 'Creative Image Generation',
    icon: PaintBrush,
    color: 'from-indigo-500 to-purple-500',
    skills: ['AI image generation', 'Visual content', 'Creative assets', 'Brand imagery'],
    avatar: '/img/agents/astra4.png',
    featured: false,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
    },
  },
}

export function AgentsSection() {
  const { t } = useI18n()
  const [selected, setSelected] = useState<null | any>(null)
  const [open, setOpen] = useState(false)

  // Map landing cards to real predefined agent configs for accurate modal details
  const configByName = useMemo(() => ({
    Cleo: CLEO_AGENT,
    Emma: EMMA_AGENT,
    Toby: TOBY_AGENT,
    Nora: NORA_AGENT,
    Apu: APU_AGENT,
    Peter: PETER_AGENT,
    Wex: WEX_AGENT,
    Ami: AMI_AGENT,
    Jenn: JENN_AGENT,
    Astra: ASTRA_AGENT,
  }), [])

  const hexByName: Record<string, string> = {
    Cleo: '#8B5CF6', // violet-500
    Emma: '#FF6B6B',
    Toby: '#4ECDC4',
    Nora: '#0EA5E9',
    Apu: '#10B981',
    Peter: '#F59E0B',
    Wex: '#64748B',
    Ami: '#F59E0B',
    Jenn: '#E879F9',
    Astra: '#8B5CF6',
  }

  return (
    <section id="agents" data-landing-search data-landing-search-title="Agents" data-landing-search-type="section" className="relative w-full overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl 2xl:max-w-[90rem]">
        {/* Section header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <User weight="duotone" className="h-4 w-4" />
            AI Agents
          </motion.div>

          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t.landing.agentsTitle}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t.landing.agentsSubtitle}
          </p>
        </motion.div>

        {/* Agents grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {agents.map((agent, index) => (
            <motion.div 
              key={index} 
              variants={cardVariants}
              className={agent.featured ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}
            >
              <Card
                data-landing-search
                data-landing-search-title={agent.name}
                data-landing-search-type="agent"
                role="button"
                tabIndex={0}
                onClick={() => {
                  const cfg = (configByName as any)[agent.name]
                  const details = {
                    name: agent.name,
                    role: agent.role,
                    description: cfg?.description || '',
                    avatar: agent.avatar,
                    color: hexByName[agent.name] || '#6366F1',
                    icon: '✨',
                    capabilities: agent.skills,
                    tools: Array.isArray(cfg?.tools) ? cfg.tools as string[] : [],
                    useCases: (
                      agent.name === 'Emma' ? ['Shopify operations', 'Pricing updates with approval', 'Sales analytics'] :
                      agent.name === 'Toby' ? ['Code reviews', 'Debugging sessions', 'API integrations'] :
                      agent.name === 'Apu' ? ['Support KB docs', 'Troubleshooting guides', 'Ticket workflows'] :
                      agent.name === 'Peter' ? ['Financial models', 'Business reports', 'KPI dashboards'] :
                      agent.name === 'Wex' ? ['Browser automations', 'Scraping workflows', 'QA flows'] :
                      agent.name === 'Ami' ? ['Calendar coordination', 'Email triage', 'Task follow-ups'] :
                      agent.name === 'Nora' ? ['Medical info triage (non-diagnostic)', 'Evidence summaries', 'Guideline lookups'] :
                      ['Agent orchestration', 'Delegation', 'Smart routing']
                    ),
                    specialization: (
                      cfg?.tags?.slice(0, 6)?.join(', ') || agent.skills.join(', ')
                    ),
                  }
                  setSelected(details)
                  setOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    ;(e.currentTarget as HTMLDivElement).click()
                  }
                }}
                className={`group relative h-full overflow-hidden backdrop-blur-sm transition-all duration-300 ${
                agent.featured 
                  ? 'border-2 border-primary/30 bg-gradient-to-br from-card/90 to-primary/5 p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20' 
                  : 'border border-border/40 bg-card/60 p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
              }`}
              >
                {/* Subtle gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 transition-opacity duration-500 group-hover:opacity-5`} />

                {/* Featured badge for Cleo */}
                {agent.featured && (
                  <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-primary via-purple-600 to-secondary px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                    ⭐ Main Orchestrator
                  </div>
                )}

                <div className={agent.featured ? 'flex flex-col md:flex-row items-center gap-6' : ''}>
                  {/* Avatar & Icon */}
                  <div className={`relative flex items-center gap-4 ${agent.featured ? 'flex-shrink-0' : 'mb-4'}`}>
                    {/* Avatar using shadcn component */}
                    <div className="relative">
                      {/* Glow effect behind avatar */}
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${agent.color} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`} />
                      
                      {/* Shadcn Avatar component - handles images automatically */}
                      <Avatar className={`relative border-2 border-background/50 shadow-lg transition-transform duration-300 group-hover:scale-110 ${
                        agent.featured ? 'h-24 w-24' : 'h-16 w-16'
                      }`}>
                        <AvatarImage 
                          src={agent.avatar} 
                          alt={agent.name}
                          className="object-cover"
                          loading="lazy"
                        />
                        <AvatarFallback className={`bg-gradient-to-br ${agent.color} text-white font-bold ${
                          agent.featured ? 'text-2xl' : 'text-lg'
                        }`}>
                          {agent.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Icon badge */}
                    <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br ${agent.color} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                      agent.featured ? 'h-14 w-14' : 'h-11 w-11'
                    }`}>
                      <agent.icon weight="duotone" className={`text-white ${agent.featured ? 'h-7 w-7' : 'h-6 w-6'}`} />
                    </div>
                  </div>

                  {/* Agent info */}
                  <div className="relative flex-1">
                    <h3 className={`font-bold text-foreground ${
                      agent.featured ? 'mb-2 text-2xl md:text-3xl' : 'mb-1 text-lg'
                    }`}>
                      {agent.name}
                    </h3>
                    <p className={`font-medium bg-gradient-to-r ${agent.color} bg-clip-text text-transparent ${
                      agent.featured ? 'mb-4 text-lg' : 'mb-4 text-sm'
                    }`}>
                      {agent.role}
                    </p>

                    {agent.featured && (
                      <p className="mb-4 text-sm text-muted-foreground max-w-3xl">
                        Cleo is your central AI coordinator. She intelligently delegates tasks to specialized agents, orchestrates complex workflows, and ensures everything runs smoothly—so you can focus on the big picture.
                      </p>
                    )}

                    {/* Skills tags */}
                    <div className="flex flex-wrap gap-2">
                      {agent.skills.map((skill, i) => (
                        <span
                          key={i}
                          className={`rounded-full border backdrop-blur-sm transition-all duration-200 group-hover:scale-105 ${
                            agent.featured 
                              ? 'border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-foreground/90 group-hover:border-primary/50 group-hover:bg-primary/20' 
                              : 'border-border/30 bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-foreground/80'
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Animated border */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 w-full origin-left bg-gradient-to-r ${agent.color}`}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom highlight + CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="mx-auto max-w-3xl text-balance text-xl sm:text-2xl font-semibold tracking-tight text-foreground/90">
            Create your own custom agents with specific skills for your unique needs
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button size="lg" className="rounded-full px-6" asChild>
              <a href="/auth">Get Started</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-6" asChild>
              <a href="/auth">Try it now</a>
            </Button>
          </div>
        </motion.div>
      </div>
      {/* Details modal */}
      <AgentModal agent={selected} isOpen={open} onClose={() => setOpen(false)} />
    </section>
  )
}
