"use client"

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import {
  Sparkle,
  Megaphone,
  Code,
  FileText,
  User as UserIcon,
  PaintBrush,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useMemo, useState } from 'react'
import { AgentModal } from '@/components/landing/agent-modal'
import { CLEO_AGENT } from '@/lib/agents/predefined/cleo'
import { EMMA_AGENT } from '@/lib/agents/predefined/emma'
import { TOBY_AGENT } from '@/lib/agents/predefined/toby'
import { NORA_AGENT } from '@/lib/agents/predefined/nora'
import { APU_AGENT } from '@/lib/agents/predefined/apu'
import { ASTRA_AGENT } from '@/lib/agents/predefined/astra'
import { getLandingCopy } from '@/lib/i18n/landing-copy'

type AgentId = 'Kylio' | 'Emma' | 'Toby' | 'Nora' | 'Apu' | 'Astra'

const agentMeta: Record<
  AgentId,
  { avatar: string; icon: any; color: string; featured?: boolean }
> = {
  Kylio: {
    avatar: '/img/agents/cleo4.png',
    icon: Sparkle,
    color: 'from-[#A38CFF] to-[#7E63F2]',
    featured: true,
  },
  Emma: {
    avatar: '/img/agents/emma4.png',
    icon: Megaphone,
    color: 'from-[#64D2FF] to-[#4AA6FF]',
  },
  Toby: {
    avatar: '/img/agents/toby4.png',
    icon: Code,
    color: 'from-[#30D158] to-[#0A9F41]',
  },
  Nora: {
    avatar: '/img/agents/nora4.png',
    icon: FileText,
    color: 'from-[#FFD60A] to-[#FFB800]',
  },
  Apu: {
    avatar: '/img/agents/apu4.png',
    icon: UserIcon,
    color: 'from-[#64D2FF] to-[#4AA6FF]',
  },
  Astra: {
    avatar: '/img/agents/astra4.png',
    icon: PaintBrush,
    color: 'from-[#A38CFF] to-[#7E63F2]',
  },
}

const configs: Record<AgentId, any> = {
  Kylio: CLEO_AGENT,
  Emma: EMMA_AGENT,
  Toby: TOBY_AGENT,
  Nora: NORA_AGENT,
  Apu: APU_AGENT,
  Astra: ASTRA_AGENT,
}

export function AgentsSection() {
  const { t, locale } = useI18n()
  const copy = getLandingCopy(locale)
  const [selected, setSelected] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  const agents = useMemo(() => {
    const order: AgentId[] = ['Kylio', 'Emma', 'Toby', 'Nora', 'Apu', 'Astra']
    return order.map((id) => ({
      id,
      ...agentMeta[id],
      role: copy.agents.cards[id].role,
      skills: copy.agents.cards[id].skills,
    }))
  }, [copy, locale])

  return (
    <section
      id="agents"
      data-landing-search
      data-landing-search-title="Agents"
      data-landing-search-type="section"
      className="relative w-full overflow-hidden bg-gradient-to-b from-background via-primary/10 to-background py-20 sm:py-32"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12">
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
          >
            <Sparkle weight="duotone" className="h-4 w-4" />
            {copy.agents.badge}
          </motion.div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t.landing.agentsTitle}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{t.landing.agentsSubtitle}</p>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={agent.featured ? 'sm:col-span-2 lg:col-span-3' : ''}
            >
              <Card
                data-landing-search
                data-landing-search-title={agent.id}
                data-landing-search-type="agent"
                role="button"
                tabIndex={0}
                onClick={() => {
                  const cfg = configs[agent.id]
                  setSelected({
                    name: agent.id,
                    role: agent.role,
                    description: cfg?.description || '',
                    avatar: agent.avatar,
                    color: agent.color.replace('from-', '').split(' ')[0],
                    icon: '✨',
                    capabilities: agent.skills,
                    tools: Array.isArray(cfg?.tools) ? (cfg.tools as string[]) : [],
                    useCases: cfg?.meta?.useCases || [],
                    specialization: cfg?.tags?.slice(0, 6)?.join(', ') || agent.skills.join(', '),
                  })
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
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 transition-opacity duration-500 group-hover:opacity-5`}
                />

                {agent.featured && (
                  <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-primary via-purple-600 to-secondary px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                    {copy.agents.featuredBadge}
                  </div>
                )}

                <div className={agent.featured ? 'flex flex-col gap-6 lg:flex-row' : ''}>
                  <div className={`relative mb-4 flex items-center gap-4 ${agent.featured ? 'mb-0 flex-shrink-0' : ''}`}>
                    <div className="relative">
                      <div
                        className={`absolute inset-0 rounded-full bg-gradient-to-br ${agent.color} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}
                      />
                      <Avatar
                        className={`relative border-2 border-background/50 shadow-lg transition-transform duration-300 group-hover:scale-110 ${
                          agent.featured ? 'h-24 w-24' : 'h-16 w-16'
                        }`}
                      >
                        <AvatarImage src={agent.avatar} alt={agent.id} className="object-cover" loading="lazy" />
                        <AvatarFallback
                          className={`bg-gradient-to-br ${agent.color} text-white font-bold ${
                            agent.featured ? 'text-2xl' : 'text-lg'
                          }`}
                        >
                          {agent.id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div
                      className={`flex items-center justify-center rounded-xl bg-gradient-to-br ${agent.color} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        agent.featured ? 'h-14 w-14' : 'h-11 w-11'
                      }`}
                    >
                      <agent.icon weight="duotone" className={`text-white ${agent.featured ? 'h-7 w-7' : 'h-6 w-6'}`} />
                    </div>
                  </div>

                  <div className="relative flex-1">
                    <h3 className={`font-bold text-foreground ${agent.featured ? 'mb-2 text-2xl md:text-3xl' : 'mb-1 text-lg'}`}>
                      {agent.id}
                    </h3>
                    <p
                      className={`bg-gradient-to-r ${agent.color} bg-clip-text font-medium text-transparent ${
                        agent.featured ? 'mb-4 text-lg' : 'mb-4 text-sm'
                      }`}
                    >
                      {agent.role}
                    </p>

                    {agent.featured && (
                      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
                        {copy.agents.featuredDescription}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {agent.skills.map((skill) => (
                        <span
                          key={skill}
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

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="mx-auto max-w-3xl text-balance text-xl font-semibold tracking-tight text-foreground/90 sm:text-2xl">
            {copy.agents.ctaHeadline}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button size="lg" className="rounded-full px-6" asChild>
              <a href="/auth">{copy.agents.primaryCta}</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-6" asChild>
              <a href="/auth">{copy.agents.secondaryCta}</a>
            </Button>
          </div>
        </motion.div>
      </div>
      <AgentModal agent={selected} isOpen={open} onClose={() => setOpen(false)} />
    </section>
  )
}
