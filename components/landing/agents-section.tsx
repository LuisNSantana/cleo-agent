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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

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
    role: 'Technical Expert',
    icon: Code,
    color: 'from-blue-500 to-cyan-500',
    skills: ['Code generation', 'Debugging', 'Architecture', 'Documentation'],
    avatar: '/img/agents/toby4.png',
    featured: false,
  },
  {
    name: 'Nora',
    role: 'Community Manager',
    icon: FileText,
    color: 'from-purple-500 to-indigo-500',
    skills: ['Social engagement', 'Community building', 'Content moderation', 'Analytics'],
    avatar: '/img/agents/nora4.png',
    featured: false,
  },
  {
    name: 'Apu',
    role: 'Support Specialist',
    icon: ChartLine,
    color: 'from-green-500 to-emerald-500',
    skills: ['Customer support', 'Issue resolution', 'Documentation', 'Training'],
    avatar: '/img/agents/apu4.png',
    featured: false,
  },
  {
    name: 'Peter',
    role: 'Research Assistant',
    icon: PaintBrush,
    color: 'from-orange-500 to-amber-500',
    skills: ['Research', 'Data analysis', 'Report writing', 'Fact-checking'],
    avatar: '/img/agents/peter4.png',
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

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-primary/5 to-background px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
              <Card className={`group relative h-full overflow-hidden backdrop-blur-sm transition-all duration-300 ${
                agent.featured 
                  ? 'border-2 border-primary/30 bg-gradient-to-br from-card/90 to-primary/5 p-8 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20' 
                  : 'border border-border/40 bg-card/60 p-6 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
              }`}>
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

        {/* Bottom text */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-muted-foreground">
            Create your own custom agents with specific skills for your unique needs
          </p>
        </motion.div>
      </div>
    </section>
  )
}
