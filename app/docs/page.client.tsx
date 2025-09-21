"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { LucideIcon } from "lucide-react"
import {
  Rocket,
  Bot,
  ClipboardList,
  Hammer,
  Plug,
  Search,
  Star,
  Zap,
  Shield,
  Users,
  Palette,
  BarChart3,
  MessageSquare,
  FileText,
  Calendar,
  Image as ImageIcon,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  Lightbulb,
  Settings,
  HelpCircle,
  BookOpen,
  PlayCircle,
  Download,
  Smartphone,
  Globe,
  Lock,
  TrendingUp,
  Clock,
  Eye,
  Edit3,
  Share2,
  Database,
  Code,
  Layers,
  Workflow,
  Cpu,
  Network
} from "lucide-react"
import { AgentRolesGrid } from '@/components/docs/AgentRolesGrid'
import { AgentConfigExamples } from '@/components/docs/AgentConfigExamples'
import { AgentLifecycle } from '@/components/docs/AgentLifecycle'
import { AgentPatternsHeuristics } from '@/components/docs/AgentPatternsHeuristics'
import { AgentCreationCriteria } from '@/components/docs/AgentCreationCriteria'
import { PromptExamplesGrid } from '@/components/docs/PromptExamplesGrid'
import { ModelLatencyTiers } from '@/components/docs/ModelLatencyTiers'
import { ModelSelectionHeuristics } from '@/components/docs/ModelSelectionHeuristics'
import { ModelFallbackCascade } from '@/components/docs/ModelFallbackCascade'
import { MultiAgentArchitecture } from '@/components/docs/MultiAgentArchitecture'
import { OrchestrationPhases } from '@/components/docs/OrchestrationPhases'
import { RoutingStrategies } from '@/components/docs/RoutingStrategies'
import { ArbitrationPatterns } from '@/components/docs/ArbitrationPatterns'
import { SupervisionLoops } from '@/components/docs/SupervisionLoops'
import { ToolPermissionScopes } from '@/components/docs/ToolPermissionScopes'
import { ToolApprovalFlow } from '@/components/docs/ToolApprovalFlow'
import { RateLimitingMatrix } from '@/components/docs/RateLimitingMatrix'
import { AuditLoggingPatterns } from '@/components/docs/AuditLoggingPatterns'
import { RiskClassificationMatrix } from '@/components/docs/RiskClassificationMatrix'
import { TroubleshootingIssueMatrix } from '@/components/docs/TroubleshootingIssueMatrix'
import { DiagnosticCommands } from '@/components/docs/DiagnosticCommands'
import { RecoveryFlows } from '@/components/docs/RecoveryFlows'
import { ErrorTaxonomy } from '@/components/docs/ErrorTaxonomy'

// Locale content interface for safer indexing
interface LocaleContent {
  title: string
  subtitle: string
  searchPlaceholder: string
  backHome: string
  getStarted?: string
  heroTitle?: string
  heroSubtitle?: string
  heroFeatures?: Array<{ icon: LucideIcon; text: string; desc: string }>
  featureCards?: Array<{ icon: LucideIcon; title: string; desc: string; features: string[]; color: string }>
  integrations?: string
  integrationDesc?: string
  integrationCategories?: Array<{ title: string; items: Array<{ name: string; desc: string }> }>
  faq: string
  faqItems: Array<{ question: string; answer: string }>
  guide?: string
  guideSteps?: Array<{ title: string; content: string; icon: LucideIcon }>
  quickStart?: string
  quickStartDesc?: string
  quickSteps?: Array<{ step: number; title: string; desc: string }>
}

// Enhanced i18n content store with comprehensive content
const content: Record<string, LocaleContent> = {
  en: {
    // Header
    title: "Cleo Documentation",
    subtitle: "Master your AI workspace with intelligent agents, seamless integrations, and powerful tools",
    searchPlaceholder: "Search documentation...",
    getStarted: "Get Started",
    backHome: "Back to Home",

    // Hero Section
    heroTitle: "Welcome to Cleo",
    heroSubtitle: "Your intelligent workspace companion that adapts to your workflow",
    heroFeatures: [
      { icon: Brain, text: "Multi-Agent System", desc: "Specialized agents for every task" },
      { icon: Zap, text: "Lightning Fast", desc: "Optimized performance with smart caching" },
      { icon: Shield, text: "Secure & Private", desc: "Your data stays yours with enterprise-grade security" },
      { icon: Palette, text: "Beautiful Design", desc: "Intuitive interface that feels natural" }
    ],

    // Quick Start
    quickStart: "Quick Start",
    quickStartDesc: "Get up and running in minutes",
    quickSteps: [
      { step: 1, title: "Sign Up", desc: "Create your account and choose your plan" },
      { step: 2, title: "Connect Tools", desc: "Link Google, Notion, and other services" },
      { step: 3, title: "Create Agent", desc: "Set up your first specialized agent" },
      { step: 4, title: "Start Chatting", desc: "Begin your intelligent workflow" }
    ],

    // Main Features
  // label removed (was 'features') not part of LocaleContent interface
    featureCards: [
      {
        icon: Bot,
        title: "Intelligent Agents",
        desc: "Specialized AI agents that adapt to your needs",
        features: ["Custom personalities", "Tool integration", "Context awareness", "Multi-modal support"],
        color: "blue"
      },
      {
        icon: MessageSquare,
        title: "Smart Chat",
        desc: "Conversational interface with advanced capabilities",
        features: ["Real-time responses", "Multi-language", "Rich formatting", "Voice input"],
        color: "green"
      },
      {
        icon: Palette,
        title: "Interactive Canvas",
        desc: "Visual collaboration and creative tools",
        features: ["Drawing tools", "Shape recognition", "Brainstorming", "Game boards"],
        color: "purple"
      },
      {
        icon: BarChart3,
        title: "Analytics Dashboard",
        desc: "Track usage, performance, and insights",
        features: ["Usage metrics", "Model performance", "Cost tracking", "Custom reports"],
        color: "orange"
      },
      {
        icon: FileText,
        title: "Document Management",
        desc: "Seamless integration with your documents",
        features: ["Google Drive sync", "Notion integration", "RAG search", "Auto-organization"],
        color: "red"
      },
      {
        icon: Calendar,
        title: "Smart Scheduling",
        desc: "AI-powered calendar and task management",
        features: ["Auto-scheduling", "Meeting insights", "Task tracking", "Reminder system"],
        color: "indigo"
      }
    ],

    // Integrations
    integrations: "Integrations",
    integrationDesc: "Connect with your favorite tools and services",
    integrationCategories: [
      {
        title: "Productivity",
        items: [
          { name: "Google Workspace", desc: "Drive, Calendar, Gmail integration" },
          { name: "Notion", desc: "Database and page management" },
          { name: "Microsoft 365", desc: "Office suite integration" }
        ]
      },
      {
        title: "Communication",
        items: [
          { name: "Slack", desc: "Team collaboration" },
          { name: "Discord", desc: "Community engagement" },
          { name: "Teams", desc: "Enterprise communication" }
        ]
      },
      {
        title: "Development",
        items: [
          { name: "GitHub", desc: "Code repository integration" },
          { name: "Jira", desc: "Project management" },
          { name: "Figma", desc: "Design collaboration" }
        ]
      }
    ],

    // FAQ
    faq: "Frequently Asked Questions",
    faqItems: [
      {
        question: "How do I create my first agent?",
        answer: "Click the 'Create Agent' button in your dashboard, choose a template or start from scratch, define the agent's role and capabilities, and start chatting!"
      },
      {
        question: "What models are available?",
        answer: "We support GPT-4, Claude, Gemini, and specialized models through OpenRouter. Each model has different strengths for various tasks."
      },
      {
        question: "Is my data secure?",
        answer: "Yes! We use enterprise-grade encryption, never train on your data, and give you full control over your information and integrations."
      },
      {
        question: "Can I use Cleo offline?",
        answer: "Basic features work offline, but AI responses and integrations require internet connectivity for optimal performance."
      },
      {
        question: "How do I integrate with Google Workspace?",
        answer: "Go to Settings > Integrations, click 'Connect Google', and follow the OAuth flow to grant the necessary permissions."
      }
    ],

    // Getting Started Guide
    guide: "Getting Started Guide",
    guideSteps: [
      {
        title: "Welcome to Cleo",
        content: "Cleo is your intelligent workspace companion designed to enhance productivity through AI-powered agents and seamless integrations.",
        icon: Sparkles
      },
      {
        title: "Choose Your Path",
        content: "Select from pre-built agent templates or create custom agents tailored to your specific needs and workflows.",
        icon: Target
      },
      {
        title: "Connect Your Tools",
        content: "Integrate with Google Drive, Calendar, Notion, and other services to give your agents access to your data.",
        icon: Plug
      },
      {
        title: "Start Creating",
        content: "Begin chatting with your agents, creating tasks, and leveraging the interactive canvas for visual collaboration.",
        icon: Lightbulb
      }
    ]
  },
  es: {
    // Header
    title: "Documentación de Cleo",
    subtitle: "Domina tu espacio de trabajo con agentes inteligentes, integraciones perfectas y herramientas poderosas",
    searchPlaceholder: "Buscar documentación...",
    getStarted: "Comenzar",
    backHome: "Volver al inicio",

    // Hero Section
    heroTitle: "Bienvenido a Cleo",
    heroSubtitle: "Tu compañero inteligente de trabajo que se adapta a tu flujo de trabajo",
    heroFeatures: [
      { icon: Brain, text: "Sistema Multi-Agente", desc: "Agentes especializados para cada tarea" },
      { icon: Zap, text: "Ultra Rápido", desc: "Rendimiento optimizado con caché inteligente" },
      { icon: Shield, text: "Seguro y Privado", desc: "Tus datos son tuyos con seguridad empresarial" },
      { icon: Palette, text: "Diseño Hermoso", desc: "Interfaz intuitiva que se siente natural" }
    ],

    // Main Features
  // label removed (was 'features') not part of LocaleContent interface
    featureCards: [
      {
        icon: Bot,
        title: "Agentes Inteligentes",
        desc: "Agentes de IA especializados que se adaptan a tus necesidades",
        features: ["Personalidades personalizadas", "Integración de herramientas", "Conciencia de contexto", "Soporte multimodal"],
        color: "blue"
      },
      {
        icon: MessageSquare,
        title: "Chat Inteligente",
        desc: "Interfaz conversacional con capacidades avanzadas",
        features: ["Respuestas en tiempo real", "Multiidioma", "Formato rico", "Entrada de voz"],
        color: "green"
      },
      {
        icon: Palette,
        title: "Canvas Interactivo",
        desc: "Herramientas de colaboración visual y creativa",
        features: ["Herramientas de dibujo", "Reconocimiento de formas", "Lluvia de ideas", "Tableros de juegos"],
        color: "purple"
      },
      {
        icon: BarChart3,
        title: "Panel de Analytics",
        desc: "Rastrea uso, rendimiento e insights",
        features: ["Métricas de uso", "Rendimiento de modelos", "Seguimiento de costos", "Reportes personalizados"],
        color: "orange"
      },
      {
        icon: FileText,
        title: "Gestión de Documentos",
        desc: "Integración perfecta con tus documentos",
        features: ["Sincronización con Google Drive", "Integración con Notion", "Búsqueda RAG", "Auto-organización"],
        color: "red"
      },
      {
        icon: Calendar,
        title: "Programación Inteligente",
        desc: "Gestión de calendario y tareas con IA",
        features: ["Programación automática", "Insights de reuniones", "Seguimiento de tareas", "Sistema de recordatorios"],
        color: "indigo"
      }
    ],

    // Integrations
    integrations: "Integraciones",
    integrationDesc: "Conéctate con tus herramientas y servicios favoritos",
    integrationCategories: [
      {
        title: "Productividad",
        items: [
          { name: "Google Workspace", desc: "Integración con Drive, Calendar, Gmail" },
          { name: "Notion", desc: "Gestión de bases de datos y páginas" },
          { name: "Microsoft 365", desc: "Suite de oficina integrada" }
        ]
      },
      {
        title: "Comunicación",
        items: [
          { name: "Slack", desc: "Colaboración en equipo" },
          { name: "Discord", desc: "Participación comunitaria" },
          { name: "Teams", desc: "Comunicación empresarial" }
        ]
      },
      {
        title: "Desarrollo",
        items: [
          { name: "GitHub", desc: "Integración con repositorios de código" },
          { name: "Jira", desc: "Gestión de proyectos" },
          { name: "Figma", desc: "Colaboración en diseño" }
        ]
      }
    ],

    // FAQ
    faq: "Preguntas Frecuentes",
    faqItems: [
      {
        question: "¿Cómo creo mi primer agente?",
        answer: "Haz clic en el botón 'Crear Agente' en tu panel, elige una plantilla o comienza desde cero, define el rol y capacidades del agente, ¡y comienza a chatear!"
      },
      {
        question: "¿Qué modelos están disponibles?",
        answer: "Soportamos GPT-4, Claude, Gemini y modelos especializados a través de OpenRouter. Cada modelo tiene fortalezas diferentes para diversas tareas."
      },
      {
        question: "¿Mis datos están seguros?",
        answer: "¡Sí! Usamos encriptación de nivel empresarial, nunca entrenamos con tus datos, y te damos control total sobre tu información e integraciones."
      },
      {
        question: "¿Puedo usar Cleo sin conexión?",
        answer: "Las funciones básicas funcionan sin conexión, pero las respuestas de IA e integraciones requieren conectividad a internet para un rendimiento óptimo."
      },
      {
        question: "¿Cómo integro con Google Workspace?",
        answer: "Ve a Configuración > Integraciones, haz clic en 'Conectar Google', y sigue el flujo de OAuth para conceder los permisos necesarios."
      }
    ],

    // Getting Started Guide
    guide: "Guía de Inicio",
    guideSteps: [
      {
        title: "Bienvenido a Cleo",
        content: "Cleo es tu compañero inteligente de trabajo diseñado para mejorar la productividad a través de agentes potenciados por IA e integraciones perfectas.",
        icon: Sparkles
      },
      {
        title: "Elige Tu Camino",
        content: "Selecciona entre plantillas de agentes pre-construidas o crea agentes personalizados adaptados a tus necesidades y flujos de trabajo específicos.",
        icon: Target
      },
      {
        title: "Conecta Tus Herramientas",
        content: "Integra con Google Drive, Calendar, Notion y otros servicios para dar acceso a tus agentes a tus datos.",
        icon: Plug
      },
      {
        title: "Comienza a Crear",
        content: "Comienza a chatear con tus agentes, crear tareas y aprovechar el canvas interactivo para colaboración visual.",
        icon: Lightbulb
      }
    ],

    // Quick Start
    quickStart: "Inicio Rápido",
    quickStartDesc: "Comienza a funcionar en minutos",
    quickSteps: [
      { step: 1, title: "Regístrate", desc: "Crea tu cuenta y elige tu plan" },
      { step: 2, title: "Conecta Herramientas", desc: "Vincula Google, Notion y otros servicios" },
      { step: 3, title: "Crea Agente", desc: "Configura tu primer agente especializado" },
      { step: 4, title: "Comienza a Chatear", desc: "Inicia tu flujo de trabajo inteligente" }
    ],

    // Main Features
    // features: "Características Principales" // Duplicate removed
  },
  pt: {
    // Header
    title: "Documentação do Cleo",
    subtitle: "Domine seu espaço de trabalho com agentes inteligentes, integrações perfeitas e ferramentas poderosas",
    searchPlaceholder: "Buscar documentação...",
    getStarted: "Começar",
    backHome: "Voltar ao início",

    // Hero Section
    heroTitle: "Bem-vindo ao Cleo",
    heroSubtitle: "Seu companheiro inteligente de trabalho que se adapta ao seu fluxo de trabalho",
    heroFeatures: [
      { icon: Brain, text: "Sistema Multi-Agente", desc: "Agentes especializados para cada tarefa" },
      { icon: Zap, text: "Ultra Rápido", desc: "Performance otimizada com cache inteligente" },
      { icon: Shield, text: "Seguro e Privado", desc: "Seus dados são seus com segurança empresarial" },
      { icon: Palette, text: "Design Bonito", desc: "Interface intuitiva que parece natural" }
    ],

    // Quick Start (REMOVED duplicate to avoid key collision)
    // quickStart: "Início Rápido",
    // quickStartDesc: "Comece a funcionar em minutos",
    // quickSteps: [
    //   { step: 1, title: "Registrar", desc: "Crie sua conta e escolha seu plano" },
    //   { step: 2, title: "Conectar Ferramentas", desc: "Vincule Google, Notion e outros serviços" },
    //   { step: 3, title: "Criar Agente", desc: "Configure seu primeiro agente especializado" },
    //   { step: 4, title: "Começar Chat", desc: "Inicie seu fluxo de trabalho inteligente" }
    // ],

    // Main Features
    featureCards: [
      {
        icon: Bot,
        title: "Agentes Inteligentes",
        desc: "Agentes de IA especializados que se adaptam às suas necessidades",
        features: ["Personalidades personalizadas", "Integração de ferramentas", "Consciência de contexto", "Suporte multimodal"],
        color: "blue"
      },
      {
        icon: MessageSquare,
        title: "Chat Inteligente",
        desc: "Interface conversacional com capacidades avançadas",
        features: ["Respostas em tempo real", "Multi-idioma", "Formatação rica", "Entrada de voz"],
        color: "green"
      },
      {
        icon: Palette,
        title: "Canvas Interativo",
        desc: "Ferramentas de colaboração visual e criativa",
        features: ["Ferramentas de desenho", "Reconhecimento de formas", "Brainstorming", "Tabuleiros de jogos"],
        color: "purple"
      },
      {
        icon: BarChart3,
        title: "Painel de Analytics",
        desc: "Acompanhe uso, performance e insights",
        features: ["Métricas de uso", "Performance de modelos", "Rastreamento de custos", "Relatórios personalizados"],
        color: "orange"
      },
      {
        icon: FileText,
        title: "Gestão de Documentos",
        desc: "Integração perfeita com seus documentos",
        features: ["Sincronização com Google Drive", "Integração com Notion", "Busca RAG", "Auto-organização"],
        color: "red"
      },
      {
        icon: Calendar,
        title: "Agendamento Inteligente",
        desc: "Gestão de calendário e tarefas com IA",
        features: ["Agendamento automático", "Insights de reuniões", "Rastreamento de tarefas", "Sistema de lembretes"],
        color: "indigo"
      }
    ],

    // Integrations
    integrations: "Integrações",
    integrationDesc: "Conecte-se com suas ferramentas e serviços favoritos",
    integrationCategories: [
      {
        title: "Produtividade",
        items: [
          { name: "Google Workspace", desc: "Integração com Drive, Calendar, Gmail" },
          { name: "Notion", desc: "Gestão de bancos de dados e páginas" },
          { name: "Microsoft 365", desc: "Suite de escritório integrada" }
        ]
      },
      {
        title: "Comunicação",
        items: [
          { name: "Slack", desc: "Colaboração em equipe" },
          { name: "Discord", desc: "Engajamento comunitário" },
          { name: "Teams", desc: "Comunicação empresarial" }
        ]
      },
      {
        title: "Desenvolvimento",
        items: [
          { name: "GitHub", desc: "Integração com repositórios de código" },
          { name: "Jira", desc: "Gestão de projetos" },
          { name: "Figma", desc: "Colaboração em design" }
        ]
      }
    ],

    // FAQ
    faq: "Perguntas Frequentes",
    faqItems: [
      {
        question: "Como criar meu primeiro agente?",
        answer: "Clique no botão 'Criar Agente' no seu painel, escolha um modelo ou comece do zero, defina o papel e capacidades do agente, e comece a conversar!"
      },
      {
        question: "Quais modelos estão disponíveis?",
        answer: "Suportamos GPT-4, Claude, Gemini e modelos especializados através do OpenRouter. Cada modelo tem pontos fortes diferentes para várias tarefas."
      },
      {
        question: "Meus dados estão seguros?",
        answer: "Sim! Usamos criptografia de nível empresarial, nunca treinamos com seus dados, e damos controle total sobre sua informação e integrações."
      },
      {
        question: "Posso usar o Cleo offline?",
        answer: "Recursos básicos funcionam offline, mas respostas de IA e integrações requerem conectividade à internet para performance ótima."
      },
      {
        question: "Como integrar com Google Workspace?",
        answer: "Vá para Configurações > Integrações, clique em 'Conectar Google', e siga o fluxo OAuth para conceder as permissões necessárias."
      }
    ],

    // Getting Started Guide
    guide: "Guia de Início",
    guideSteps: [
      {
        title: "Bem-vindo ao Cleo",
        content: "Cleo é seu companheiro inteligente de trabalho projetado para melhorar produtividade através de agentes impulsionados por IA e integrações perfeitas.",
        icon: Sparkles
      },
      {
        title: "Escolha Seu Caminho",
        content: "Selecione entre modelos de agentes pré-construídos ou crie agentes personalizados adaptados às suas necessidades e fluxos de trabalho específicos.",
        icon: Target
      },
      {
        title: "Conecte Suas Ferramentas",
        content: "Integre com Google Drive, Calendar, Notion e outros serviços para dar acesso aos seus agentes aos seus dados.",
        icon: Plug
      },
      {
        title: "Comece a Criar",
        content: "Comece a conversar com seus agentes, criar tarefas e aproveitar o canvas interativo para colaboração visual.",
        icon: Lightbulb
      }
    ],

    // Main Features
    // features: "Características Principais" // Duplicate removed
  }
}

type Lang = keyof typeof content

// Sidebar section anchor IDs constant
const DOC_SECTION_ORDER = [
  'overview',
  'quick-start',
  'agents',
  'prompts',
  'models',
  'tools-safety',
  'multi-agent',
  'image-generation',
  'troubleshooting',
  'faq'
] as const

type DocSectionId = typeof DOC_SECTION_ORDER[number]

// Reusable layout shell for sections (premium style)
function DocSectionContainer({ id, children, title, subtitle }: { id: DocSectionId, children: React.ReactNode, title: string, subtitle?: string }) {
  return (
    <section id={id} className="scroll-mt-28 relative">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-base text-muted-foreground max-w-2xl">{subtitle}</p>}
      </div>
      <div className="relative rounded-xl border border-border/50 bg-gradient-to-b from-background/40 to-background/10 backdrop-blur-sm p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.25)]">
        {children}
      </div>
    </section>
  )
}

// Premium skeleton placeholder block
function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/40" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

// Sidebar component with scroll spy
function DocsSidebar({ active }: { active: DocSectionId }) {
  return (
    <nav aria-label="Documentation navigation" className="sticky top-20 hidden h-[calc(100vh-6rem)] w-56 shrink-0 lg:block">
      <ul className="space-y-2 text-sm">
        {DOC_SECTION_ORDER.map(section => {
          const labelMap: Record<DocSectionId, string> = {
            'overview': 'Overview',
            'quick-start': 'Quick Start',
            'agents': 'Agents',
            'prompts': 'Prompt Examples',
            'models': 'Model Strategy',
            'tools-safety': 'Tool Safety',
            'multi-agent': 'Multi-Agent',
            'image-generation': 'Image Generation',
            'troubleshooting': 'Troubleshooting',
            'faq': 'FAQ'
          }
          const isActive = active === section
          return (
            <li key={section}>
              <a
                href={`#${section}`}
                className={`group flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted/60 ${isActive ? 'bg-muted font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                <span className="truncate">{labelMap[section]}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Hook: scroll spy (lightweight)
function useScrollSpy(ids: string[], offset = 160) {
  const [active, setActive] = useState<string>(ids[0])
  useEffect(() => {
    function onScroll() {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top - offset <= 0) current = id
      }
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [ids, offset])
  return active
}

export default function DocsPageClient({ initialLang = "en" }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(
    (["en", "es", "pt"].includes(initialLang) ? initialLang : "en") as Lang
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSection, setActiveSection] = useState("overview")

  const t = useMemo(() => content[lang], [lang])

  // Filter content based on search
  const filteredContent = useMemo(() => {
    if (!searchQuery) return null

    const query = searchQuery.toLowerCase()
    const results: Array<{ type: 'feature' | 'faq'; item: any }> = []

    // Search in features
    t.featureCards?.forEach((card) => {
      if (card.title.toLowerCase().includes(query) ||
          card.desc.toLowerCase().includes(query) ||
          card.features.some(f => f.toLowerCase().includes(query))) {
        results.push({ type: 'feature', item: card })
      }
    })

    // Search in FAQ
    t.faqItems.forEach((item) => {
      if (item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)) {
        results.push({ type: 'faq', item })
      }
    })

    return results
  }, [searchQuery, t])

  const activeSpy = useScrollSpy(Array.from(DOC_SECTION_ORDER))

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image src="/img/agents/logocleo4.png" alt="Cleo" width={32} height={32} />
            <h1 className="text-lg font-semibold">{t.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="es">ES</SelectItem>
                <SelectItem value="pt">PT</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/">
              <Button variant="outline" size="sm">
                {t.backHome}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Search */}
      <div className="border-b bg-background md:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Search Results */}
      {filteredContent && (
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Search Results</h2>
            <p className="text-muted-foreground">
              Found {filteredContent.length} results for "{searchQuery}"
            </p>
          </div>
          <div className="space-y-4">
            {filteredContent.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{result.type}</Badge>
                    <CardTitle className="text-lg">
                      {result.type === 'feature' ? result.item.title : result.item.question}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {result.type === 'feature' ? result.item.desc : result.item.answer}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New layout grid with sidebar */}
      <div className="container mx-auto px-4 py-12 flex gap-10">
        <DocsSidebar active={activeSpy as DocSectionId} />
        <div className="flex-1 space-y-32">
          <DocSectionContainer id="overview" title="Overview" subtitle={t.subtitle}>
            <p className="text-sm leading-relaxed text-muted-foreground">Cleo centraliza agentes inteligentes, herramientas conectadas y flujos de trabajo productivos en una sola experiencia premium. Usa el menú lateral para explorar cada área.</p>
          </DocSectionContainer>
          <DocSectionContainer id="quick-start" title="Quick Start" subtitle="Launch in minutes and build momentum">
            <div className="space-y-10">
              <ol className="list-decimal ml-6 space-y-6 text-sm">
                <li className="leading-relaxed">
                  <span className="font-medium text-foreground">Crea tu cuenta / inicia sesión.</span>
                  <div className="mt-2 text-muted-foreground">Accede a la app y ve a <code className="rounded bg-muted px-1 py-0.5 text-xs">Settings → API & Keys</code>.</div>
                </li>
                <li className="leading-relaxed">
                  <span className="font-medium text-foreground">Configura tus claves de modelo.</span>
                  <div className="mt-2 text-muted-foreground">Introduce al menos una clave (OpenAI, Anthropic, Groq u OpenRouter). Cleo autodetectará disponibilidad y latencias.</div>
                  <div className="mt-3 rounded-md border bg-background/60 p-4 text-xs font-mono leading-relaxed">
{`# Ejemplo (.env.local)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...`}
                  </div>
                </li>
                <li className="leading-relaxed">
                  <span className="font-medium text-foreground">Crea tu primer agente.</span>
                  <div className="mt-2 text-muted-foreground">Ve a <code className="rounded bg-muted px-1 py-0.5 text-xs">Agents</code> y pulsa “New Agent”. Elige rol <code className="bg-muted px-1 py-0.5 rounded text-xs">specialist</code> para tareas concretas.</div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border bg-gradient-to-br from-muted/20 to-background p-4">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-primary">Config JSON (UI equivalente)</p>
                      <pre className="overflow-x-auto text-[11px] leading-relaxed font-mono">
{`{
  "name": "Research Scout",
  "description": "Busca y resume información actual",
  "role": "specialist",
  "model": "gpt-4o-mini",
  "temperature": 0.4,
  "tools": ["web_search", "web_fetch"],
  "prompt": "Eres un agente que verifica, contrasta y sintetiza fuentes creíbles." ,
  "memoryEnabled": true,
  "memoryType": "short_term"
}`}
                      </pre>
                    </div>
                    <div className="rounded-lg border bg-gradient-to-br from-muted/20 to-background p-4">
                      <p className="mb-2 text-xs font-semibold tracking-wide text-primary">Creación vía API (POST)</p>
                      <pre className="overflow-x-auto text-[11px] leading-relaxed font-mono">
{`curl -X POST https://api.tu-dominio.com/api/agents/create \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{
    "name": "Research Scout",
    "description": "Busca y resume información actual",
    "role": "specialist",
    "model": "gpt-4o-mini",
    "tools": ["web_search", "web_fetch"],
    "prompt": "Eres un agente que verifica y sintetiza fuentes confiables",
    "memoryEnabled": true,
    "memoryType": "short_term"
  }'`}
                      </pre>
                    </div>
                  </div>
                </li>
                <li className="leading-relaxed">
                  <span className="font-medium text-foreground">Ejecuta un prompt de prueba.</span>
                  <div className="mt-2 text-muted-foreground">Selecciona el agente recién creado en el panel de conversación y pregunta: <em className="italic">“Resume en 5 viñetas las tendencias actuales en IA para edge computing”</em>.</div>
                  <div className="mt-3 rounded-md border bg-background/60 p-4 text-xs font-mono leading-relaxed">
{`curl -X POST https://api.tu-dominio.com/api/agents/execute \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{
    "agentId": "<AGENT_ID>",
    "input": "Resume en 5 viñetas las tendencias actuales en IA para edge computing"
  }'`}
                  </div>
                </li>
                <li className="leading-relaxed">
                  <span className="font-medium text-foreground">Crea una mini cadena (workflow).</span>
                  <div className="mt-2 text-muted-foreground">Agrega un segundo agente evaluador (rol <code className="rounded bg-muted px-1 py-0.5 text-xs">evaluator</code>) para refinar calidad. El supervisor puede delegar automáticamente.</div>
                  <div className="mt-3 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4 bg-muted/10">
                      <p className="text-xs font-semibold mb-1 text-primary">1. Specialist</p>
                      <p className="text-[11px] text-muted-foreground">Recolecta y sintetiza info cruda.</p>
                    </div>
                    <div className="rounded-lg border p-4 bg-muted/10">
                      <p className="text-xs font-semibold mb-1 text-primary">2. Evaluator</p>
                      <p className="text-[11px] text-muted-foreground">Verifica, limpia sesgos, estructura.</p>
                    </div>
                    <div className="rounded-lg border p-4 bg-muted/10">
                      <p className="text-xs font-semibold mb-1 text-primary">3. Output Final</p>
                      <p className="text-[11px] text-muted-foreground">Supervisor integra y entrega.</p>
                    </div>
                  </div>
                </li>
                <li className="leading-relaxed">
                  <span className="font-medium text-foreground">Guarda y reutiliza.</span>
                  <div className="mt-2 text-muted-foreground">Exporta la configuración de agentes o clónala para nuevas variantes (baja temperatura para datos, alta para ideación).</div>
                </li>
              </ol>

              <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-6">
                <h4 className="mb-2 text-sm font-semibold tracking-wide text-primary">Checklist de validación</h4>
                <ul className="grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
                  <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>Clave de modelo válida</li>
                  <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>Primer agente creado</li>
                  <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>Ejecución exitosa</li>
                  <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>Delegación configurada</li>
                  <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>Workflow guardado</li>
                  <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>Ajuste de temperatura probado</li>
                </ul>
              </div>

              <div className="rounded-lg border bg-background/80 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Consejos rápidos</p>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li><strong>0.2–0.4</strong> temperatura: respuesta estable / factual. <strong>0.7–0.9</strong>: ideación / creatividad.</li>
                  <li>Incluye <code className="bg-muted px-1 py-0.5 rounded">objetivo claro</code> en el prompt: mejora delegación.</li>
                  <li>Activa memoria corta para contexto de sesión; evita memoria larga si no necesitas persistencia.</li>
                  <li>Limita herramientas: 2–3 por agente max para precisión.</li>
                </ul>
              </div>
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="agents" title="Agents" subtitle="Design, specialize and orchestrate autonomous assistants">
            <div className="space-y-12 text-sm leading-relaxed">
              <p className="text-muted-foreground max-w-3xl">Agents in Cleo are modular, typed entities with a defined <code className="bg-muted px-1 py-0.5 rounded text-[10px]">role</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">model</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">prompt</code>, and an allowed tool set. The multi‑agent graph routes tasks between them via the supervisor.</p>
              <AgentRolesGrid />
              <AgentConfigExamples />
              <AgentLifecycle />
              <AgentPatternsHeuristics />
              <AgentCreationCriteria />
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="prompts" title="Prompt Examples" subtitle="High‑quality prompt patterns for reliable outputs">
            <div className="space-y-8 text-sm">
              <p className="text-muted-foreground max-w-3xl">A curated set of production‑grade prompt archetypes covering system conditioning, structured extraction, reasoning, delegation, and evaluation. All outputs are designed for deterministic parsing and multi‑agent chaining.</p>
              <PromptExamplesGrid />
              <div className="rounded-lg border p-4 bg-background/70">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Guidelines</p>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  <li>Prefer explicit JSON schemas for extraction & handoff.</li>
                  <li>Bound reasoning tokens: reduces drift + cost.</li>
                  <li>Separate evaluation from generation for higher factuality.</li>
                  <li>Use lower temperature for system / evaluator prompts.</li>
                  <li>Never mix natural language + JSON in machine‑consumable outputs.</li>
                </ul>
              </div>
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="models" title="Model Strategy" subtitle="Choose the optimal model per intent, cost and latency">
            <div className="space-y-10 text-sm">
              <p className="text-muted-foreground max-w-3xl">Model selection in Cleo balances latency, determinism, reasoning depth and cost. Use fast tiers for routing & control loops, balanced for planning & synthesis, and escalate only when confidence or structure thresholds fail.</p>
              <ModelLatencyTiers />
              <ModelSelectionHeuristics />
              <ModelFallbackCascade />
              <div className="rounded-lg border p-5 bg-background/70">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Caching & Cost Control</p>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  <li>Deduplicate identical structured extraction prompts via hash cache.</li>
                  <li>Use temperature 0–0.3 for parse‑critical tasks to reduce retries.</li>
                  <li>Persist intermediate balanced-tier outputs for heavy escalation reuse.</li>
                  <li>Track token usage per agent role to spot misalignment.</li>
                  <li>Batch low priority tasks during off-peak windows.</li>
                </ul>
              </div>
              <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-background">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Confidence Signals</p>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  <li><strong>Structural</strong>: JSON schema validation pass/fail.</li>
                  <li><strong>Self-estimated certainty</strong>: Model returns numeric confidence (sanity bound).</li>
                  <li><strong>Evaluator score</strong>: Independent pass for factuality & coherence.</li>
                  <li><strong>Time budget</strong>: Abort escalation if nearing SLA limit.</li>
                  <li><strong>Cost guardrail</strong>: Hard ceiling per user/session triggers degrade mode.</li>
                </ul>
              </div>
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="tools-safety" title="Tool Safety" subtitle="Approval workflows and secure execution model">
            <div className="space-y-10 text-sm">
              <p className="text-muted-foreground max-w-3xl">Tool execution is governed by scoped permissions, real‑time policy checks, human approval escalation and immutable audit trails. Minimize blast radius by constraining agents to least privilege.</p>
              <ToolPermissionScopes />
              <div className="grid gap-6 lg:grid-cols-2">
                <ToolApprovalFlow />
                <RiskClassificationMatrix />
              </div>
              <RateLimitingMatrix />
              <AuditLoggingPatterns />
              <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-background">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Best Practices</p>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  <li>Create separate agents for high‑risk tools (isolate scope).</li>
                  <li>Hash + diff args for write operations to show intent clarity.</li>
                  <li>Enable human queue only for sensitive+execute not routine writes.</li>
                  <li>Alert on unusual burst patterns (entropy of tool sequence).</li>
                  <li>Rotate API keys & enforce per‑agent tokens when possible.</li>
                </ul>
              </div>
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="multi-agent" title="Multi-Agent" subtitle="Delegation, supervision and collaboration patterns">
            <div className="space-y-10 text-sm">
              <p className="text-muted-foreground max-w-3xl">Cleo orchestrates agents through an adaptive supervisor that performs intent routing, delegation, arbitration and evaluation. The system emphasizes minimal escalation, deterministic structure, and explicit confidence signals.</p>
              <MultiAgentArchitecture />
              <div className="grid gap-6 lg:grid-cols-2">
                <OrchestrationPhases />
                <RoutingStrategies />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ArbitrationPatterns />
                <SupervisionLoops />
              </div>
              <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-background">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Optimization Tips</p>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  <li>Cache classification & routing decisions by normalized query signature.</li>
                  <li>Short‑circuit evaluator when structural parse already passes high confidence.</li>
                  <li>Limit refinement loops (N ≤ 2) to prevent cost spirals.</li>
                  <li>Track per‑role token + latency metrics to prune underperforming agents.</li>
                  <li>Fallback to single‑agent mode in degraded / high load states.</li>
                </ul>
              </div>
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="image-generation" title="Image Generation" subtitle="Creative rendering with model selection & limits">
            <SkeletonBlock lines={4} />
          </DocSectionContainer>
          <DocSectionContainer id="troubleshooting" title="Troubleshooting" subtitle="Common issues, diagnostics and recovery steps">
            <div className="space-y-10 text-sm">
              <p className="text-muted-foreground max-w-3xl">Use this guide to quickly isolate issues across routing, delegation, tooling, memory and cost. Patterns are designed for rapid triage with structured remediation.</p>
              <TroubleshootingIssueMatrix />
              <div className="grid gap-6 lg:grid-cols-2">
                <DiagnosticCommands />
                <ErrorTaxonomy />
              </div>
              <RecoveryFlows />
              <div className="rounded-lg border p-5 bg-gradient-to-br from-primary/5 to-background">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-primary">Preventative Monitoring</p>
                <ul className="text-[11px] space-y-1 text-muted-foreground">
                  <li>Alert on escalation chain length {'>'} 2.</li>
                  <li>Track JSON parse failure rate; auto‑lower temperature if spike detected.</li>
                  <li>Log per‑tool p95 latency & throttle anomalies.</li>
                  <li>Capture evaluator disagreement rate as drift signal.</li>
                  <li>Budget guard: emit event at 80% daily cost threshold.</li>
                </ul>
              </div>
            </div>
          </DocSectionContainer>
          <DocSectionContainer id="faq" title={t.faq} subtitle="Answers to recurring questions">
            <div className="space-y-6">
              <Accordion type="single" collapsible className="w-full">
                {t.faqItems.slice(0,2).map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="rounded-md border p-4 bg-background/60">
                <p className="text-xs text-muted-foreground">Showing 2 of {t.faqItems.length} questions. Full FAQ expansion coming next (pricing, limits, privacy, roadmap, enterprise).</p>
              </div>
            </div>
          </DocSectionContainer>
        </div>
      </div>
    </div>
  )
}
