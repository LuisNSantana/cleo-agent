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

// Enhanced i18n content store with comprehensive content
const content = {
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
    features: "Core Features",
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
    features: "Características Principales",
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

    // Quick Start
    quickStart: "Início Rápido",
    quickStartDesc: "Comece a funcionar em minutos",
    quickSteps: [
      { step: 1, title: "Registrar", desc: "Crie sua conta e escolha seu plano" },
      { step: 2, title: "Conectar Ferramentas", desc: "Vincule Google, Notion e outros serviços" },
      { step: 3, title: "Criar Agente", desc: "Configure seu primeiro agente especializado" },
      { step: 4, title: "Começar Chat", desc: "Inicie seu fluxo de trabalho inteligente" }
    ],

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
    features: "Características Principais"
  }
} as const

type Lang = keyof typeof content

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
    t.featureCards.forEach(card => {
      if (card.title.toLowerCase().includes(query) ||
          card.desc.toLowerCase().includes(query) ||
          card.features.some(f => f.toLowerCase().includes(query))) {
        results.push({ type: 'feature', item: card })
      }
    })

    // Search in FAQ
    t.faqItems.forEach(item => {
      if (item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)) {
        results.push({ type: 'faq', item })
      }
    })

    return results
  }, [searchQuery, t])

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

      {/* Main Content */}
      {!filteredContent && (
        <>
          {/* Hero Section */}
          <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 py-20 text-white">
            <div className="absolute inset-0 bg-black/20" />
            <div className="container relative mx-auto px-4">
              <div className="mx-auto max-w-4xl text-center">
                <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
                  {t.heroTitle}
                </h1>
                <p className="mb-8 text-xl text-blue-100 sm:text-2xl">
                  {t.heroSubtitle}
                </p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {t.heroFeatures.map((feature, index) => (
                    <div key={index} className="rounded-lg bg-white/10 p-6 backdrop-blur">
                      <feature.icon className="mx-auto mb-3 h-8 w-8" />
                      <h3 className="mb-2 font-semibold">{feature.text}</h3>
                      <p className="text-sm text-blue-100">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Start */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                  <h2 className="mb-4 text-3xl font-bold">{t.quickStart}</h2>
                  <p className="text-xl text-muted-foreground">{t.quickStartDesc}</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {t.quickSteps.map((step, index) => (
                    <div key={index} className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4 text-lg font-bold">
                        {step.step}
                      </div>
                      <h3 className="mb-2 font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                      {index < t.quickSteps.length - 1 && (
                        <ArrowRight className="absolute -right-3 top-6 hidden h-6 w-6 text-muted-foreground lg:block" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-6xl">
                <div className="mb-12 text-center">
                  <h2 className="mb-4 text-3xl font-bold">{t.features}</h2>
                  <p className="text-xl text-muted-foreground">
                    Discover the powerful features that make Cleo your ultimate AI workspace companion
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {t.featureCards.map((card, index) => (
                    <Card key={index} className="group hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-${card.color}-100 text-${card.color}-600 mb-4`}>
                          <card.icon className="h-6 w-6" />
                        </div>
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {card.title}
                        </CardTitle>
                        <CardDescription>{card.desc}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {card.features.map((feature, fIndex) => (
                            <li key={fIndex} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Getting Started Guide */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                  <h2 className="mb-4 text-3xl font-bold">{t.guide}</h2>
                  <p className="text-xl text-muted-foreground">
                    Follow this step-by-step guide to unlock the full potential of Cleo
                  </p>
                </div>
                <div className="space-y-8">
                  {t.guideSteps.map((step, index) => (
                    <div key={index} className="flex gap-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
                        <p className="text-muted-foreground">{step.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Integrations */}
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-6xl">
                <div className="mb-12 text-center">
                  <h2 className="mb-4 text-3xl font-bold">{t.integrations}</h2>
                  <p className="text-xl text-muted-foreground">{t.integrationDesc}</p>
                </div>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {t.integrationCategories.map((category, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Network className="h-5 w-5" />
                          {category.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-start gap-3">
                              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                              <div>
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                  <h2 className="mb-4 text-3xl font-bold">{t.faq}</h2>
                  <p className="text-xl text-muted-foreground">
                    Find answers to common questions about Cleo
                  </p>
                </div>
                <Accordion type="single" collapsible className="space-y-4">
                  {t.faqItems.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-primary py-16 text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
              <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
              <p className="mb-8 text-xl opacity-90">
                Join thousands of users who are already transforming their workflow with Cleo
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/signup">
                    {t.getStarted}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
