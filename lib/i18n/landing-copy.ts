import { Locale } from "./translations"

type AgentId = "Kylio" | "Emma" | "Toby" | "Nora" | "Apu" | "Astra"

type FeatureCard = {
  title: string
  description: string
  bullets: string[]
}

type BenefitStat = {
  stat: string
  statLabel: string
  title: string
  description: string
}

type UseCaseCard = {
  title: string
  description: string
  users: string
  demo: string
}

type TestimonialStat = {
  metric: string
  title: string
  description: string
}

type SecurityFeature = {
  title: string
  description: string
}

type PhilosophyCard = {
  emoji: string
  title: string
  description: string
}

export type LandingCopy = {
  nav: {
    features: string
    agents: string
    builder: string
    demo: string
    benefits: string
    docs: string
    signIn: string
    getStarted: string
    searchPlaceholder: string
  }
  hero: {
    badge: string
    microcopy: string
    trustBadges: [string, string]
    floatingActions: {
      Emma: string
      Toby: string
      Nora: string
      Apu: string
    }
    onboardingTitle: string
    onboardingActive: string
    onboardingTasks: {
      Kylio: string
      Emma: string
      Toby: string
    }
    currentTaskLabel: string
  }
  customAgents: {
    templates: Array<{ name: string; role: string; color: string; icon: string }>
    steps: Array<{ title: string; description: string }>
    capabilityLabels: {
      advanced: string
    }
  }
  features: {
    badge: string
    cards: FeatureCard[]
    highlightHeadline: string
    highlightCta: string
  }
  useCaseDemo: {
    badge: string
    title: string
    subtitle: string
    currentTask: string
    scenarios: Array<{
      agentName: string
      role: string
      title: string
      steps: [string, string, string, string]
    }>
  }
  agents: {
    badge: string
    featuredBadge: string
    featuredDescription: string
    cards: Record<AgentId, { role: string; skills: [string, string, string, string] }>
    ctaHeadline: string
    primaryCta: string
    secondaryCta: string
  }
  benefits: {
    badge: string
    stats: BenefitStat[]
    useCasesBadge: string
    useCases: UseCaseCard[]
  }
  testimonials: {
    badge: string
    stats: TestimonialStat[]
    securityBadge: string
    securityFeatures: SecurityFeature[]
    complianceBadges: [string, string, string]
  }
  finalCta: {
    philosophyBadge: string
    philosophyCards: PhilosophyCard[]
    noCreditCard: string
    trustBullets: [string, string, string]
  }
  footer: {
    tagline: string
    poweredBy: string
    product: string
    company: string
    connect: string
    story: string
    features: string
    agents: string
    documentation: string
    privacy: string
    terms: string
    github: string
    twitter: string
    huminary: string
    builtWith: string
    rights: string
  }
}

const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    nav: {
      features: "Product",
      agents: "Agents",
      builder: "Studio",
      demo: "Live Demo",
      benefits: "Impact",
      docs: "Docs",
      signIn: "Sign In",
      getStarted: "Launch with Ankie AI →",
      searchPlaceholder: "Search playbooks, agents, sections…",
    },
    hero: {
      badge: "Build & launch today",
      microcopy: "Spin up production-ready AI teammates in under five minutes. Drag. Drop. Deploy.",
      trustBadges: ["No credit card required", "Launch-ready templates"],
      floatingActions: {
        Emma: "Publishing a campaign calendar…",
        Toby: "Shipping a hotfix to production…",
        Nora: "Nurturing your community…",
        Apu: "Resolving the support backlog…",
      },
      onboardingTitle: "Ankie AI Agent Studio",
      onboardingActive: "Live",
      onboardingTasks: {
        Kylio: "Orchestrating your automation roadmap",
        Emma: "Personalizing the go-to-market narrative",
        Toby: "Reviewing your latest merge queue",
      },
      currentTaskLabel: "Currently building",
    },
    customAgents: {
      templates: [
        { name: "Launch Manager", role: "Ships campaigns, socials, and nurture flows", color: "from-[#A38CFF] to-[#7E63F2]", icon: "🚀" },
        { name: "Product Copilot", role: "Reviews pull requests and generates release notes", color: "from-[#64D2FF] to-[#4AA6FF]", icon: "🧠" },
        { name: "Success Specialist", role: "Triages tickets and drafts empathetic replies", color: "from-[#30D158] to-[#0A9F41]", icon: "💬" },
        { name: "Insights Analyst", role: "Turns spreadsheets into executive dashboards", color: "from-[#FFD60A] to-[#FFB800]", icon: "📊" },
      ],
      steps: [
        { title: "Describe the mission", description: "Give your agent a name, voice, and north star" },
        { title: "Wire their stack", description: "Connect docs, APIs, workflows, and guardrails" },
        { title: "Show an example", description: "Drop a message or file—Ankie AI mirrors the tone instantly" },
        { title: "Go live", description: "Publish to chat, workflows, or your product with one click" },
      ],
      capabilityLabels: {
        advanced: "Launch-ready",
      },
    },
    features: {
      badge: "Why teams choose Ankie AI",
      cards: [
        {
          title: "Visual Agent Studio",
          description: "Design multi-step automations with live previews, guardrails, and instant testing.",
          bullets: ["Canvas builder with branching", "Shared playbook library", "Real-time validation"],
        },
        {
          title: "Human-in-the-loop by default",
          description: "Decide when Ankie AI acts autonomously, requests approval, or hands off to a teammate.",
          bullets: ["Granular roles & permissions", "Approval queues", "Conversation takeovers"],
        },
        {
          title: "Deploy anywhere in minutes",
          description: "Embed in chat, schedule workflows, or call agents via API without extra glue code.",
          bullets: ["Chat & shareable links", "Workflow automations", "GraphQL + REST endpoints"],
        },
        {
          title: "Remember every preference",
          description: "Ankie captures names, goals, and custom instructions so every response feels personal.",
          bullets: ["Profile-aware prompts", "Personality & tone controls", "Custom instructions baked in"],
        },
      ],
      highlightHeadline: "Pair Ankie AI agents with your stack: Notion, HubSpot, Linear, Slack, Google Workspace, and more.",
      highlightCta: "Meet your agents",
    },
    useCaseDemo: {
      badge: "Play it live",
      title: "See Ankie AI build an agent in real time",
      subtitle: "Choose a template, plug in data, and launch. Every step is visible so teams trust the workflow.",
      currentTask: "Current task",
      scenarios: [
        {
          agentName: "Emma",
          role: "Go-to-market lead",
          title: "Launch a multichannel announcement",
          steps: [
            "Collecting product release inputs",
            "Drafting email + social copy",
            "Generating asset requests",
            "Scheduling go-live across channels",
          ],
        },
        {
          agentName: "Toby",
          role: "Product engineering copilot",
          title: "Ship a quality gate for a new feature",
          steps: [
            "Reviewing pull requests",
            "Highlighting regression risks",
            "Drafting release notes",
            "Syncing QA owners in Slack",
          ],
        },
        {
          agentName: "Peter",
          role: "Revenue strategist",
          title: "Publish a weekly growth brief",
          steps: [
            "Aggregating CRM + billing data",
            "Spotting churn signals",
            "Summarizing wins & blockers",
            "Sharing actions with leadership",
          ],
        },
      ],
    },
    agents: {
      badge: "AI Agents",
      featuredBadge: "⭐ Lead orchestrator",
      featuredDescription: "Ankie AI delegates to specialists, safeguards your voice, and keeps every decision reviewable.",
      cards: {
        Kylio: {
          role: "Your AI Orchestrator",
          skills: ["Multi-agent coordination", "Task delegation", "Workflow automation", "Smart routing"],
        },
        Emma: {
          role: "Go-to-market & Lifecycle",
          skills: ["Campaign playbooks", "SEO optimization", "Lifecycle copy", "Launch ops"],
        },
        Toby: {
          role: "Engineering & QA",
          skills: ["Code reviews", "Release prep", "Architecture guidance", "IoT workflows"],
        },
        Nora: {
          role: "Community & Support",
          skills: ["Knowledge curation", "Community engagement", "Moderation guidance", "Sentiment analysis"],
        },
        Apu: {
          role: "Success & Support",
          skills: ["Ticket triage", "Solution drafts", "Escalation summaries", "Customer empathy"],
        },
        Astra: {
          role: "Creative Generation",
          skills: ["Image creation", "Brand-safe visuals", "Prompt engineering", "Design variations"],
        },
      },
      ctaHeadline: "Spin up specialists for campaigns, engineering, ops, and support in minutes—not sprints.",
      primaryCta: "Launch Ankie AI Studio",
      secondaryCta: "See starter kits",
    },
    benefits: {
      badge: "Measured impact",
      stats: [
        {
          stat: "5 min",
          statLabel: "from idea to live agent",
          title: "Deploy faster than you prototype",
          description: "Ankie AI Studio handles prompts, guardrails, and hosting automatically.",
        },
        {
          stat: "12h",
          statLabel: "saved per teammate weekly",
          title: "Give teams back focus time",
          description: "Automate the busywork so humans can ship strategy, not status updates.",
        },
        {
          stat: "98%",
          statLabel: "approval confidence",
          title: "Trust every response",
          description: "Transparent context, references, and human override flows build real alignment.",
        },
      ],
      useCasesBadge: "Popular playbooks",
      useCases: [
        {
          title: "Campaign Control Room",
          description: "Pipeline launch emails, landing copy, and paid ads from one workspace.",
          users: "Marketing & growth teams",
          demo: "Coordinating launch briefings…",
        },
        {
          title: "Merge-Ready QA",
          description: "Review pull requests, generate regression tests, and surface release risks.",
          users: "Engineering orgs",
          demo: "Flagging a breaking API change…",
        },
        {
          title: "Customer Success Pulse",
          description: "Summarize health, draft responses, and alert humans when risk escalates.",
          users: "Success & support teams",
          demo: "Escalating an enterprise renewal…",
        },
        {
          title: "Executive Insight Hub",
          description: "Blend product, revenue, and support signals into a single weekly brief.",
          users: "Ops & leadership",
          demo: "Highlighting churn-prevention wins…",
        },
      ],
    },
    testimonials: {
      badge: "Trusted by high-velocity teams",
      stats: [
        {
          metric: "10x",
          title: "Faster project delivery",
          description: "Roadmap items move from backlog to shipped in a fraction of the time.",
        },
        {
          metric: "20+",
          title: "Hours freed every week",
          description: "Teams reclaim strategy time instead of copy/paste busywork.",
        },
        {
          metric: "95%",
          title: "Automation success rate",
          description: "Delegated workflows complete end-to-end with human-grade quality.",
        },
        {
          metric: "5 min",
          title: "Average setup time",
          description: "From signup to your first launch-ready agent in minutes, not weeks.",
        },
      ],
      securityBadge: "Security",
      securityFeatures: [
        { title: "End-to-end encryption", description: "All data secured in transit and at rest with SOC 2 controls." },
        { title: "SOC 2 Type II", description: "Independently audited policies and real-time monitoring." },
        { title: "Privacy first", description: "Your data never trains our models—period." },
      ],
      complianceBadges: ["SOC 2 Type II", "GDPR compliant", "256-bit encryption"],
    },
    finalCta: {
      philosophyBadge: "Why people-first automation wins",
      philosophyCards: [
        { emoji: "🚀", title: "Ship in hours", description: "Move from idea to live agent without tickets or handoffs." },
        { emoji: "🎯", title: "Stay in control", description: "Transparent guardrails mean humans approve every key decision." },
        { emoji: "🤝", title: "Scale trust", description: "Give teams AI copilots that mirror their voice and process." },
      ],
      noCreditCard: "No credit card required",
      trustBullets: ["Free forever sandbox", "Cancel anytime", "SOC 2 certified"],
    },
    footer: {
      tagline: "Ankie AI is the all-in-one studio for production AI agents.",
      poweredBy: "Powered by",
      product: "Product",
      company: "Company",
      connect: "Connect",
      story: "Our Story",
      features: "Features",
      agents: "Agents",
      documentation: "Documentation",
      privacy: "Privacy",
      terms: "Terms",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "Built with ❤️ by",
      rights: "All rights reserved.",
    },
  },
  es: {
    nav: {
      features: "Funciones",
      agents: "Agentes",
      builder: "Constructor",
      demo: "Demo en vivo",
      benefits: "Beneficios",
      docs: "Documentación",
      signIn: "Iniciar sesión",
      getStarted: "Prueba Ankie AI gratis →",
      searchPlaceholder: "Busca funciones, agentes, secciones…",
    },
    hero: {
      badge: "Ahora en beta abierta",
      microcopy: "Lanza tu primer compañero de IA en menos de cinco minutos. En serio.",
      trustBadges: ["Sin tarjeta de crédito", "Configuración en 5 minutos"],
      floatingActions: {
        Emma: "Lanzando una campaña multicanal…",
        Toby: "Refactorizando un servicio crítico…",
        Nora: "Respondiendo preguntas de la comunidad…",
        Apu: "Cerrando tickets de soporte…",
      },
      onboardingTitle: "Onboarding de tu equipo IA",
      onboardingActive: "Activo",
      onboardingTasks: {
        Kylio: "Coordinando tu equipo de agentes",
        Emma: "Personalizando tu estrategia de marketing",
        Toby: "Revisando tu base de código",
      },
      currentTaskLabel: "Tarea actual",
    },
    customAgents: {
      templates: [
        { name: "Asistente de marketing", role: "Creadora de contenido y estratega social", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "Revisor de código", role: "Analiza calidad y propone mejoras", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "Asistente de ventas", role: "Prospección y nutrición de leads", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "Analista de datos", role: "Convierte datos en insights accionables", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "Define tu agente", description: "Nombre, rol y personalidad" },
        { title: "Configura capacidades", description: "Selecciona herramientas y permisos" },
        { title: "Entrena y prueba", description: "Ajusta con ejemplos reales" },
        { title: "Despliega y monitorea", description: "Lanza y sigue su desempeño" },
      ],
      capabilityLabels: {
        advanced: "Avanzado",
      },
    },
    features: {
      badge: "Funciones potentes",
      cards: [
        {
          title: "Orquesta cada flujo de trabajo",
          description: "Delegar trabajo entre especialistas con un solo prompt.",
          bullets: ["Enrutamiento dinámico de tareas", "Colaboración entre agentes", "Ejecución autónoma"],
        },
        {
          title: "Lanza en minutos",
          description: "Despliega agentes listos para producción sin escribir código.",
          bullets: ["Constructor visual", "Plantillas reutilizables", "Historial de versiones"],
        },
        {
          title: "Colabora con tu equipo",
          description: "Comparte espacios, aprobaciones e informes con los interesados.",
          bullets: ["Acceso basado en roles", "Aprobaciones y revisiones", "Actividad en tiempo real"],
        },
        {
          title: "Recuerda cada preferencia",
          description: "Ankie guarda nombres, objetivos e instrucciones para responder con contexto real.",
          bullets: ["Prompts conscientes del perfil", "Controles de personalidad y tono", "Instrucciones personalizadas integradas"],
        },
      ],
      highlightHeadline: "Amplía con integraciones para bases de conocimiento, chat y automatización",
    highlightCta: "Conoce a tus agentes",
    },
    useCaseDemo: {
      badge: "Míralo en acción",
      title: "Observa a tu equipo IA trabajar",
      subtitle: "Escenarios en vivo que muestran cómo los agentes de Kylio resuelven flujos complejos sin supervisión.",
      currentTask: "Tarea actual",
      scenarios: [
        {
          agentName: "Emma",
          role: "Especialista en marketing",
          title: "Lanzar una campaña en redes sociales",
          steps: [
            "Analizando la voz de la marca",
            "Redactando 8 publicaciones alineadas",
            "Diseñando copy para carrusel",
            "Programando para el máximo alcance",
          ],
        },
        {
          agentName: "Toby",
          role: "Experto técnico",
          title: "Refactorizar un servicio legado",
          steps: [
            "Escaneando el repositorio",
            "Detectando problemas de rendimiento",
            "Proponiendo una arquitectura más segura",
            "Escribiendo pruebas de regresión",
          ],
        },
        {
          agentName: "Peter",
          role: "Estratega de investigación",
          title: "Entregar un briefing de mercado",
          steps: [
            "Recopilando inteligencia de competidores",
            "Comparando tendencias",
            "Destacando oportunidades",
            "Publicando resumen ejecutivo",
          ],
        },
      ],
    },
    agents: {
      badge: "Agentes IA",
      featuredBadge: "⭐ Orquestadora principal",
      featuredDescription: "Kylio coordina a cada especialista, delega con criterio y te mantiene al mando.",
      cards: {
        Kylio: {
          role: "Tu orquestadora de IA",
          skills: ["Coordinación multiagente", "Delegación de tareas", "Automatización de flujos", "Enrutamiento inteligente"],
        },
        Emma: {
          role: "E-commerce y marketing",
          skills: ["Creación de contenido", "Optimización SEO", "Analítica de campañas", "Voz de marca"],
        },
        Toby: {
          role: "Ingeniería de software e IoT",
          skills: ["Revisiones de código", "Depuración", "Guía de arquitectura", "Flujos IoT"],
        },
        Nora: {
          role: "Información médica y triaje",
          skills: ["Resúmenes de evidencia", "Triage de riesgos", "Educación al paciente", "Tono con cumplimiento"],
        },
        Apu: {
          role: "Especialista en soporte",
          skills: ["Priorización de tickets", "Redacción de base de conocimiento", "Sugerencias de resolución", "Empatía con clientes"],
        },
        Astra: {
          role: "Generación creativa",
          skills: ["Creación de imágenes IA", "Visuales alineados a marca", "Ingeniería de prompts", "Variaciones de diseño"],
        },
      },
      ctaHeadline: "Crea especialistas a medida para cada flujo",
      primaryCta: "Comienza ahora",
      secondaryCta: "Pruébalo hoy",
    },
    benefits: {
      badge: "Resultados reales que se sienten",
      stats: [
        {
          stat: "10x",
          statLabel: "entrega más rápida",
          title: "Multiplica la productividad",
          description: "Entrega proyectos en horas en lugar de días.",
        },
        {
          stat: "20+",
          statLabel: "horas ahorradas por semana",
          title: "Recupera tiempo",
          description: "Deja que los agentes eliminen el trabajo repetitivo de cada persona.",
        },
        {
          stat: "94%",
          statLabel: "satisfacción de usuarios",
          title: "Encanta a tus clientes",
          description: "Responde más rápido con información precisa y cercana.",
        },
      ],
      useCasesBadge: "Donde Kylio brilla",
      useCases: [
        {
          title: "Marketing de contenidos",
          description: "Planifica, redacta y publica campañas alineadas en cada canal.",
          users: "Equipos de marketing",
          demo: "Programando publicaciones listas para lanzar…",
        },
        {
          title: "Desarrollo de producto",
          description: "Refina especificaciones, revisa código y documenta lanzamientos automáticamente.",
          users: "Producto e ingeniería",
          demo: "Priorizando backlog y resumiendo pull requests…",
        },
        {
          title: "Éxito del cliente",
          description: "Prioriza tickets, redacta respuestas y saca insights en segundos.",
          users: "Equipos de soporte",
          demo: "Resolviendo conversaciones de alta prioridad…",
        },
        {
          title: "Automatización operativa",
          description: "Orquesta flujos recurrentes entre herramientas y fuentes de datos.",
          users: "Operaciones y revenue",
          demo: "Sincronizando actualizaciones de CRM y seguimientos…",
        },
      ],
    },
    testimonials: {
      badge: "Resultados confiables",
      stats: [
        {
          metric: "10x",
          title: "Tareas mucho más rápidas",
          description: "Los operadores terminan flujos en minutos.",
        },
        {
          metric: "20+",
          title: "Horas recuperadas cada semana",
          description: "Los equipos ganan tiempo de enfoque profundo.",
        },
        {
          metric: "95%",
          title: "Tasa de éxito",
          description: "Las automatizaciones delegadas se completan de principio a fin.",
        },
        {
          metric: "5 min",
          title: "Tiempo promedio de puesta en marcha",
          description: "De registrarte a lanzar tu primer agente en minutos.",
        },
      ],
      securityBadge: "Seguridad",
      securityFeatures: [
        { title: "Cifrado de extremo a extremo", description: "Tus datos se protegen en tránsito y en reposo." },
        { title: "SOC 2 Tipo II", description: "Auditorías independientes y controles continuos." },
        { title: "Privacidad primero", description: "Tus datos nunca se usan para entrenar modelos." },
      ],
      complianceBadges: ["SOC 2 Tipo II", "Cumple con GDPR", "Cifrado de 256 bits"],
    },
    finalCta: {
      philosophyBadge: "Nuestra filosofía",
      philosophyCards: [
        { emoji: "🚀", title: "Acelera", description: "Avanza rápido sin sacrificar calidad." },
        { emoji: "🎯", title: "Enfócate", description: "Deja el trabajo repetitivo a los agentes mientras lideras." },
        { emoji: "🤝", title: "Colabora", description: "Mantén a las personas al mando con IA transparente y auditable." },
      ],
      noCreditCard: "Sin tarjeta de crédito",
      trustBullets: ["Plan gratis para siempre", "Cancela cuando quieras", "Certificación SOC 2"],
    },
    footer: {
      tagline: "Tu plataforma inteligente de agentes multi-IA",
      poweredBy: "Impulsado por",
      product: "Producto",
      company: "Compañía",
      connect: "Conecta",
      story: "Nuestra historia",
      features: "Funciones",
      agents: "Agentes",
      documentation: "Documentación",
      privacy: "Privacidad",
      terms: "Términos",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "Creado con ❤️ por",
      rights: "Todos los derechos reservados.",
    },
  },
  pt: {
    nav: {
      features: "Recursos",
      agents: "Agentes",
      builder: "Construtor",
      demo: "Demo ao vivo",
      benefits: "Benefícios",
      docs: "Documentação",
      signIn: "Entrar",
      getStarted: "Experimente a Kylio grátis →",
      searchPlaceholder: "Busque recursos, agentes, seções…",
    },
    hero: {
      badge: "Agora em beta aberto",
      microcopy: "Lance seu primeiro colega de IA em menos de cinco minutos. De verdade.",
      trustBadges: ["Sem cartão de crédito", "Configuração em 5 minutos"],
      floatingActions: {
        Emma: "Lançando uma campanha multicanal…",
        Toby: "Refatorando um serviço crítico…",
        Nora: "Respondendo perguntas da comunidade…",
        Apu: "Encerrando chamados de suporte…",
      },
      onboardingTitle: "Onboarding da sua equipe de IA",
      onboardingActive: "Ativo",
      onboardingTasks: {
        Kylio: "Coordenando sua equipe de agentes",
        Emma: "Personalizando sua estratégia de marketing",
        Toby: "Revisando sua base de código",
      },
      currentTaskLabel: "Tarefa atual",
    },
    customAgents: {
      templates: [
        { name: "Assistente de marketing", role: "Criadora de conteúdo e estrategista social", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "Revisor de código", role: "Analisa qualidade e sugere melhorias", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "Assistente de vendas", role: "Prospecção e nutrição de leads", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "Analista de dados", role: "Transforma dados em insights acionáveis", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "Defina seu agente", description: "Nome, papel e personalidade" },
        { title: "Configure capacidades", description: "Selecione ferramentas e permissões" },
        { title: "Treine e teste", description: "Ajuste com exemplos reais" },
        { title: "Publique e monitore", description: "Lance e acompanhe o desempenho" },
      ],
      capabilityLabels: {
        advanced: "Avançado",
      },
    },
    features: {
      badge: "Recursos poderosos",
      cards: [
        {
          title: "Orquestre todo fluxo de trabalho",
          description: "Delegue tarefas entre especialistas com um único prompt.",
          bullets: ["Roteamento dinâmico", "Colaboração entre agentes", "Execução autônoma"],
        },
        {
          title: "Lance em minutos",
          description: "Coloque agentes prontos para produção sem escrever código.",
          bullets: ["Construtor visual", "Modelos reutilizáveis", "Histórico de versões"],
        },
        {
          title: "Colabore com seu time",
          description: "Compartilhe espaços, aprovações e relatórios com stakeholders.",
          bullets: ["Acesso por função", "Aprovações e revisões", "Feed de atividade ao vivo"],
        },
        {
          title: "Memoriza cada preferência",
          description: "A Ankie guarda nomes, objetivos e instruções personalizadas para manter o contexto vivo.",
          bullets: ["Prompts com consciência de perfil", "Controles de personalidade e tom", "Instruções customizadas embutidas"],
        },
      ],
      highlightHeadline: "Expanda com integrações para bases de conhecimento, chat e automação",
      highlightCta: "Conheça seus agentes",
    },
    useCaseDemo: {
      badge: "Veja na prática",
      title: "Observe sua equipe de IA trabalhando",
      subtitle: "Cenários reais mostrando como os agentes da Kylio resolvem fluxos complexos sem supervisão.",
      currentTask: "Tarefa atual",
      scenarios: [
        {
          agentName: "Emma",
          role: "Especialista em marketing",
          title: "Lançar uma campanha nas redes sociais",
          steps: [
            "Analisando a voz da marca",
            "Redigindo 8 posts alinhados",
            "Criando copy para carrossel",
            "Programando para o maior alcance",
          ],
        },
        {
          agentName: "Toby",
          role: "Especialista técnico",
          title: "Refatorar um serviço legado",
          steps: [
            "Escaneando o repositório",
            "Detectando gargalos de performance",
            "Propondo arquitetura mais segura",
            "Escrevendo testes de regressão",
          ],
        },
        {
          agentName: "Peter",
          role: "Estrategista de pesquisa",
          title: "Entregar um briefing de mercado",
          steps: [
            "Coletando inteligência de concorrentes",
            "Comparando tendências",
            "Destacando oportunidades",
            "Publicando resumo executivo",
          ],
        },
      ],
    },
    agents: {
      badge: "Agentes de IA",
      featuredBadge: "⭐ Orquestradora principal",
      featuredDescription: "Kylio coordena cada especialista, delega com inteligência e mantém você no controle.",
      cards: {
        Kylio: {
          role: "Sua orquestradora de IA",
          skills: ["Coordenação multiagente", "Delegação de tarefas", "Automação de fluxos", "Roteamento inteligente"],
        },
        Emma: {
          role: "E-commerce e marketing",
          skills: ["Criação de conteúdo", "Otimização de SEO", "Analytics de campanhas", "Voz da marca"],
        },
        Toby: {
          role: "Engenharia de software e IoT",
          skills: ["Code review", "Depuração", "Orientação de arquitetura", "Fluxos IoT"],
        },
        Nora: {
          role: "Informações médicas e triagem",
          skills: ["Resumos de evidências", "Triagem de riscos", "Educação do paciente", "Tom compatível com compliance"],
        },
        Apu: {
          role: "Especialista em suporte",
          skills: ["Priorização de tickets", "Base de conhecimento", "Sugestões de resolução", "Empatia com clientes"],
        },
        Astra: {
          role: "Geração criativa",
          skills: ["Criação de imagens com IA", "Visuais alinhados à marca", "Engenharia de prompts", "Variações de design"],
        },
      },
      ctaHeadline: "Crie especialistas sob medida para cada fluxo",
      primaryCta: "Comece agora",
      secondaryCta: "Experimente hoje",
    },
    benefits: {
      badge: "Resultados reais que se sentem",
      stats: [
        {
          stat: "10x",
          statLabel: "entrega mais rápida",
          title: "Multiplique a produtividade",
          description: "Entregue projetos em horas em vez de dias.",
        },
        {
          stat: "20+",
          statLabel: "horas economizadas por semana",
          title: "Recupere tempo",
          description: "Deixe os agentes cuidarem do trabalho repetitivo para cada pessoa.",
        },
        {
          stat: "94%",
          statLabel: "satisfação dos usuários",
          title: "Encante clientes",
          description: "Responda mais rápido com informações precisas e empáticas.",
        },
      ],
      useCasesBadge: "Onde a Kylio brilha",
      useCases: [
        {
          title: "Marketing de conteúdo",
          description: "Planeje, escreva e publique campanhas alinhadas em todos os canais.",
          users: "Times de marketing",
          demo: "Programando posts prontos para lançamento…",
        },
        {
          title: "Desenvolvimento de produto",
          description: "Refine especificações, revise código e documente releases automaticamente.",
          users: "Produto e engenharia",
          demo: "Priorizando backlog e resumindo pull requests…",
        },
        {
          title: "Sucesso do cliente",
          description: "Triagem de tickets, respostas e insights em segundos.",
          users: "Times de suporte",
          demo: "Resolvendo conversas de alta prioridade…",
        },
        {
          title: "Automação operacional",
          description: "Orquestre fluxos recorrentes entre ferramentas e dados.",
          users: "Operações e revenue",
          demo: "Sincronizando atualizações de CRM e follow-ups…",
        },
      ],
    },
    testimonials: {
      badge: "Resultados confiáveis",
      stats: [
        {
          metric: "10x",
          title: "Tarefas concluídas mais rápido",
          description: "Operadores finalizam fluxos em minutos.",
        },
        {
          metric: "20+",
          title: "Horas economizadas toda semana",
          description: "Os times recuperam tempo de foco profundo.",
        },
        {
          metric: "95%",
          title: "Taxa de sucesso",
          description: "Automatizações delegadas terminam de ponta a ponta.",
        },
        {
          metric: "5 min",
          title: "Tempo médio de ativação",
          description: "Do cadastro ao seu primeiro agente em minutos.",
        },
      ],
      securityBadge: "Segurança",
      securityFeatures: [
        { title: "Criptografia de ponta a ponta", description: "Seus dados são protegidos em trânsito e em repouso." },
        { title: "SOC 2 Tipo II", description: "Auditorias independentes e controles contínuos." },
        { title: "Privacidade em primeiro lugar", description: "Seus dados nunca treinam os modelos." },
      ],
      complianceBadges: ["SOC 2 Tipo II", "Compatível com GDPR", "Criptografia de 256 bits"],
    },
    finalCta: {
      philosophyBadge: "Nossa filosofia",
      philosophyCards: [
        { emoji: "🚀", title: "Acelere", description: "Avance rápido sem perder qualidade." },
        { emoji: "🎯", title: "Foque", description: "Deixe os agentes cuidarem do operacional enquanto você lidera." },
        { emoji: "🤝", title: "Parceria", description: "Mantenha as pessoas no comando com IA transparente e auditável." },
      ],
      noCreditCard: "Sem cartão de crédito",
      trustBullets: ["Plano grátis para sempre", "Cancele quando quiser", "Certificação SOC 2"],
    },
    footer: {
      tagline: "Sua plataforma inteligente de agentes multi-IA",
      poweredBy: "Impulsionado por",
      product: "Produto",
      company: "Empresa",
      connect: "Conecte-se",
      story: "Nossa história",
      features: "Recursos",
      agents: "Agentes",
      documentation: "Documentação",
      privacy: "Privacidade",
      terms: "Termos",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "Feito com ❤️ por",
      rights: "Todos os direitos reservados.",
    },
  },
  fr: {
    nav: {
      features: "Fonctionnalités",
      agents: "Agents",
      builder: "Générateur",
      demo: "Démo en direct",
      benefits: "Avantages",
      docs: "Documentation",
      signIn: "Connexion",
      getStarted: "Essayez Kylio gratuitement →",
      searchPlaceholder: "Recherchez fonctionnalités, agents, sections…",
    },
    hero: {
      badge: "Actuellement en bêta ouverte",
      microcopy: "Déployez votre premier coéquipier IA en moins de cinq minutes. Vraiment.",
      trustBadges: ["Sans carte bancaire", "Configuration en 5 minutes"],
      floatingActions: {
        Emma: "Lancement d'une campagne multicanale…",
        Toby: "Refonte d'un service critique…",
        Nora: "Réponse aux questions de la communauté…",
        Apu: "Clôture des tickets de support…",
      },
      onboardingTitle: "Onboarding de votre équipe IA",
      onboardingActive: "Actif",
      onboardingTasks: {
        Kylio: "Coordonne votre équipe d'agents",
        Emma: "Personnalise votre stratégie marketing",
        Toby: "Passe en revue votre code",
      },
      currentTaskLabel: "Tâche en cours",
    },
    customAgents: {
      templates: [
        { name: "Assistante marketing", role: "Créatrice de contenu et stratège social", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "Relecteur de code", role: "Analyse la qualité et propose des améliorations", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "Assistant commercial", role: "Prospection et nurturing de leads", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "Analyste de données", role: "Transforme les données en insights actionnables", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "Définissez votre agent", description: "Nom, rôle et personnalité" },
        { title: "Configurez ses capacités", description: "Sélectionnez outils et permissions" },
        { title: "Entraînez et testez", description: "Ajustez avec des exemples concrets" },
        { title: "Déployez et suivez", description: "Lancez et surveillez la performance" },
      ],
      capabilityLabels: {
        advanced: "Avancé",
      },
    },
    features: {
      badge: "Fonctionnalités puissantes",
      cards: [
        {
          title: "Orchestrez chaque flux de travail",
          description: "Déléguez aux spécialistes avec un simple prompt.",
          bullets: ["Routage dynamique des tâches", "Collaboration inter-agents", "Exécution autonome"],
        },
        {
          title: "Lancez en quelques minutes",
          description: "Déployez des agents prêts pour la production sans code.",
          bullets: ["Constructeur visuel", "Modèles réutilisables", "Historique de versions"],
        },
        {
          title: "Collaborez avec votre équipe",
          description: "Partagez espaces, validations et reporting avec les parties prenantes.",
          bullets: ["Accès basé sur les rôles", "Approbations et revues", "Flux d'activité en direct"],
        },
        {
          title: "Retient chaque préférence",
          description: "Ankie mémorise noms, objectifs et consignes pour répondre avec le bon contexte.",
          bullets: ["Prompts sensibles au profil", "Contrôles de personnalité et de ton", "Instructions personnalisées intégrées"],
        },
      ],
      highlightHeadline: "Rencontrez des agents qui connaissent votre nom, vos objectifs et votre style.",
      highlightCta: "Découvrez vos agents",
    },
    useCaseDemo: {
      badge: "Voyez-le en action",
      title: "Regardez votre équipe IA travailler",
      subtitle: "Des scénarios réels montrant comment les agents Kylio gèrent des flux complexes sans assistance.",
      currentTask: "Tâche en cours",
      scenarios: [
        {
          agentName: "Emma",
          role: "Spécialiste marketing",
          title: "Lancer une campagne sur les réseaux sociaux",
          steps: [
            "Analyse de la voix de marque",
            "Rédaction de 8 publications alignées",
            "Création du texte du carrousel",
            "Programmation pour un impact maximal",
          ],
        },
        {
          agentName: "Toby",
          role: "Expert technique",
          title: "Refactorer un service legacy",
          steps: [
            "Analyse du dépôt",
            "Détection des problèmes de performance",
            "Proposition d'une architecture plus sûre",
            "Écriture des tests de régression",
          ],
        },
        {
          agentName: "Peter",
          role: "Stratège recherche",
          title: "Livrer un briefing de marché",
          steps: [
            "Collecte d'intelligence concurrentielle",
            "Analyse comparative des tendances",
            "Mise en avant des opportunités",
            "Publication du résumé exécutif",
          ],
        },
      ],
    },
    agents: {
      badge: "Agents IA",
      featuredBadge: "⭐ Orchestratrice principale",
      featuredDescription: "Kylio coordonne chaque spécialiste, délègue intelligemment et garde le contrôle entre vos mains.",
      cards: {
        Kylio: {
          role: "Votre orchestratrice IA",
          skills: ["Coordination multi-agents", "Délégation des tâches", "Automatisation des flux", "Routage intelligent"],
        },
        Emma: {
          role: "E-commerce et marketing",
          skills: ["Création de contenu", "Optimisation SEO", "Analytics de campagnes", "Voix de marque"],
        },
        Toby: {
          role: "Ingénierie logicielle et IoT",
          skills: ["Revues de code", "Débogage", "Conseil architectural", "Workflows IoT"],
        },
        Nora: {
          role: "Information médicale et triage",
          skills: ["Synthèses de preuves", "Évaluation des risques", "Éducation des patients", "Ton conforme"],
        },
        Apu: {
          role: "Spécialiste support",
          skills: ["Priorisation des tickets", "Rédaction de base de connaissances", "Suggestions de résolution", "Empathie client"],
        },
        Astra: {
          role: "Génération créative",
          skills: ["Création d'images IA", "Visuels conformes à la marque", "Ingénierie de prompt", "Variantes de design"],
        },
      },
      ctaHeadline: "Créez des spécialistes sur-mesure pour chaque flux",
      primaryCta: "Commencer",
      secondaryCta: "Essayer maintenant",
    },
    benefits: {
      badge: "Des résultats concrets",
      stats: [
        {
          stat: "10x",
          statLabel: "livraison plus rapide",
          title: "Multipliez la productivité",
          description: "Livrez des projets en quelques heures au lieu de plusieurs jours.",
        },
        {
          stat: "20+",
          statLabel: "heures gagnées par semaine",
          title: "Récupérez du temps",
          description: "Laissez les agents éliminer le travail répétitif de chacun.",
        },
        {
          stat: "94%",
          statLabel: "satisfaction des utilisateurs",
          title: "Enchantez vos clients",
          description: "Répondez plus vite avec des informations fiables et humaines.",
        },
      ],
      useCasesBadge: "Là où Kylio excelle",
      useCases: [
        {
          title: "Marketing de contenu",
          description: "Planifiez, rédigez et publiez des campagnes cohérentes sur tous les canaux.",
          users: "Équipes marketing",
          demo: "Programmation de posts prêts au lancement…",
        },
        {
          title: "Développement produit",
          description: "Affinez les specs, révisez le code et documentez les releases automatiquement.",
          users: "Produit & ingénierie",
          demo: "Priorisation du backlog et synthèse des pull requests…",
        },
        {
          title: "Succès client",
          description: "Priorisez les tickets, rédigez des réponses et faites remonter les insights en secondes.",
          users: "Équipes support",
          demo: "Résolution des conversations prioritaires…",
        },
        {
          title: "Automatisation des opérations",
          description: "Orchestrez les workflows récurrents entre outils et données.",
          users: "Ops & revenus",
          demo: "Synchronisation des mises à jour CRM et relances…",
        },
      ],
    },
    testimonials: {
      badge: "Résultats éprouvés",
      stats: [
        {
          metric: "10x",
          title: "Tâches bouclées plus vite",
          description: "Les opérateurs terminent les workflows en quelques minutes.",
        },
        {
          metric: "20+",
          title: "Heures économisées chaque semaine",
          description: "Les équipes récupèrent du temps de concentration.",
        },
        {
          metric: "95%",
          title: "Taux de réussite",
          description: "Les automatisations déléguées vont jusqu'au bout.",
        },
        {
          metric: "5 min",
          title: "Mise en route moyenne",
          description: "De l'inscription au premier agent en quelques minutes.",
        },
      ],
      securityBadge: "Sécurité",
      securityFeatures: [
        { title: "Chiffrement de bout en bout", description: "Vos données sont protégées en transit et au repos." },
        { title: "SOC 2 Type II", description: "Audits indépendants et contrôles continus." },
        { title: "Confidentialité d'abord", description: "Vos données ne servent jamais à entraîner les modèles." },
      ],
      complianceBadges: ["SOC 2 Type II", "Conforme RGPD", "Chiffrement 256 bits"],
    },
    finalCta: {
      philosophyBadge: "Notre philosophie",
      philosophyCards: [
        { emoji: "🚀", title: "Accélérez", description: "Progressez vite sans sacrifier la qualité." },
        { emoji: "🎯", title: "Focalisez", description: "Confiez la routine aux agents pendant que vous dirigez." },
        { emoji: "🤝", title: "Partenariat", description: "Gardez l'humain aux commandes avec une IA transparente et auditable." },
      ],
      noCreditCard: "Sans carte bancaire",
      trustBullets: ["Plan gratuit à vie", "Annulez quand vous voulez", "Certification SOC 2"],
    },
    footer: {
      tagline: "Votre plateforme intelligente d'agents multi-IA",
      poweredBy: "Propulsé par",
      product: "Produit",
      company: "Entreprise",
      connect: "Contact",
      story: "Notre histoire",
      features: "Fonctionnalités",
      agents: "Agents",
      documentation: "Documentation",
      privacy: "Confidentialité",
      terms: "Conditions",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "Créé avec ❤️ par",
      rights: "Tous droits réservés.",
    },
  },
  it: {
    nav: {
      features: "Funzionalità",
      agents: "Agenti",
      builder: "Builder",
      demo: "Demo live",
      benefits: "Vantaggi",
      docs: "Documentazione",
      signIn: "Accedi",
      getStarted: "Prova Kylio gratis →",
      searchPlaceholder: "Cerca funzionalità, agenti, sezioni…",
    },
    hero: {
      badge: "Ora in beta aperta",
      microcopy: "Lancia il tuo primo collega IA in meno di cinque minuti, davvero.",
      trustBadges: ["Nessuna carta richiesta", "Setup in 5 minuti"],
      floatingActions: {
        Emma: "Lancio di una campagna multicanale…",
        Toby: "Refactoring di un servizio critico…",
        Nora: "Risponde alla community…",
        Apu: "Chiude ticket di supporto…",
      },
      onboardingTitle: "Onboarding del tuo team IA",
      onboardingActive: "Attivo",
      onboardingTasks: {
        Kylio: "Coordina il tuo team di agenti",
        Emma: "Personalizza la strategia marketing",
        Toby: "Rivede il tuo codice",
      },
      currentTaskLabel: "Attività corrente",
    },
    customAgents: {
      templates: [
        { name: "Assistente marketing", role: "Creator di contenuti e strategist social", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "Revisore di codice", role: "Analizza la qualità e suggerisce miglioramenti", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "Assistente vendite", role: "Prospezione e nurturing di lead", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "Analista dati", role: "Trasforma i dati in insight azionabili", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "Definisci il tuo agente", description: "Nome, ruolo e personalità" },
        { title: "Configura le capacità", description: "Seleziona strumenti e permessi" },
        { title: "Allena e testa", description: "Affina con esempi reali" },
        { title: "Distribuisci e monitora", description: "Lancia e segui le performance" },
      ],
      capabilityLabels: {
        advanced: "Avanzato",
      },
    },
    features: {
      badge: "Funzionalità potenti",
      cards: [
        {
          title: "Orchestra ogni flusso di lavoro",
          description: "Delega agli specialisti con un unico prompt.",
          bullets: ["Instradamento dinamico", "Collaborazione tra agenti", "Esecuzione autonoma"],
        },
        {
          title: "Lancia in pochi minuti",
          description: "Metti in produzione agenti senza scrivere codice.",
          bullets: ["Builder visivo", "Template riutilizzabili", "Storico versioni"],
        },
        {
          title: "Collabora con il tuo team",
          description: "Condividi workspace, approvazioni e report con gli stakeholder.",
          bullets: ["Accessi basati sui ruoli", "Approvazioni e revisioni", "Feed attività in tempo reale"],
        },
        {
          title: "Ricorda ogni preferenza",
          description: "Ankie memorizza nomi, obiettivi e istruzioni così ogni risposta resta nel tuo tono.",
          bullets: ["Prompt consapevoli del profilo", "Controlli di personalità e tono", "Istruzioni personalizzate integrate"],
        },
      ],
      highlightHeadline: "Incontra agenti che conoscono il tuo nome, i tuoi obiettivi e replicano il tuo stile.",
      highlightCta: "Scopri i tuoi agenti",
    },
    useCaseDemo: {
      badge: "Guardala in azione",
      title: "Guarda lavorare il tuo team IA",
      subtitle: "Scenari reali che mostrano come gli agenti Kylio gestiscono flussi complessi senza supervisione.",
      currentTask: "Attività corrente",
      scenarios: [
        {
          agentName: "Emma",
          role: "Specialista marketing",
          title: "Lanciare una campagna social",
          steps: [
            "Analisi della voce del brand",
            "Scrittura di 8 post coerenti",
            "Creazione del copy per il carosello",
            "Programmazione per la massima copertura",
          ],
        },
        {
          agentName: "Toby",
          role: "Esperto tecnico",
          title: "Refactoring di un servizio legacy",
          steps: [
            "Scansione del repository",
            "Identificazione dei colli di bottiglia",
            "Proposta di architettura più sicura",
            "Scrittura dei test di regressione",
          ],
        },
        {
          agentName: "Peter",
          role: "Strategist di ricerca",
          title: "Consegna di un market briefing",
          steps: [
            "Raccolta intelligence sui competitor",
            "Analisi delle tendenze",
            "Evidenziazione delle opportunità",
            "Pubblicazione del riassunto esecutivo",
          ],
        },
      ],
    },
    agents: {
      badge: "Agenti IA",
      featuredBadge: "⭐ Orchestratrice principale",
      featuredDescription: "Kylio coordina ogni specialista, delega con intelligenza e ti lascia il controllo.",
      cards: {
        Kylio: {
          role: "La tua orchestratrice IA",
          skills: ["Coordinamento multi-agente", "Delegazione delle attività", "Automazione dei flussi", "Instradamento intelligente"],
        },
        Emma: {
          role: "E-commerce e marketing",
          skills: ["Creazione di contenuti", "Ottimizzazione SEO", "Analytics di campagna", "Tono di brand"],
        },
        Toby: {
          role: "Ingegneria software e IoT",
          skills: ["Code review", "Debug", "Linee guida architetturali", "Workflow IoT"],
        },
        Nora: {
          role: "Informazioni mediche e triage",
          skills: ["Sintesi di evidenze", "Valutazione dei rischi", "Educazione del paziente", "Tono conforme"],
        },
        Apu: {
          role: "Specialista supporto",
          skills: ["Priorità dei ticket", "Redazione knowledge base", "Suggerimenti di risoluzione", "Empatia con i clienti"],
        },
        Astra: {
          role: "Generazione creativa",
          skills: ["Creazione di immagini IA", "Visual coerenti con il brand", "Prompt engineering", "Varianti di design"],
        },
      },
      ctaHeadline: "Crea specialisti su misura per ogni flusso",
      primaryCta: "Inizia ora",
      secondaryCta: "Provalo oggi",
    },
    benefits: {
      badge: "Risultati concreti",
      stats: [
        {
          stat: "10x",
          statLabel: "consegna più rapida",
          title: "Moltiplica la produttività",
          description: "Consegna progetti in ore anziché giorni.",
        },
        {
          stat: "20+",
          statLabel: "ore risparmiate a settimana",
          title: "Riprendi tempo",
          description: "Lascia che gli agenti eliminino il lavoro ripetitivo per tutti.",
        },
        {
          stat: "94%",
          statLabel: "soddisfazione utenti",
          title: "Sorprendi i clienti",
          description: "Rispondi più velocemente con informazioni precise e umane.",
        },
      ],
      useCasesBadge: "Dove Kylio eccelle",
      useCases: [
        {
          title: "Content marketing",
          description: "Pianifica, scrivi e pubblica campagne coerenti su ogni canale.",
          users: "Team marketing",
          demo: "Programmazione di post pronti al lancio…",
        },
        {
          title: "Sviluppo prodotto",
          description: "Affina specifiche, rivedi codice e documenta release automaticamente.",
          users: "Prodotto e ingegneria",
          demo: "Prioritizzazione backlog e sintesi pull request…",
        },
        {
          title: "Customer success",
          description: "Smista ticket, prepara risposte e porta insight in pochi secondi.",
          users: "Team supporto",
          demo: "Gestione delle conversazioni prioritarie…",
        },
        {
          title: "Automazione operativa",
          description: "Orchestra workflow ricorrenti tra strumenti e dati.",
          users: "Ops e revenue",
          demo: "Sincronizzazione aggiornamenti CRM e follow-up…",
        },
      ],
    },
    testimonials: {
      badge: "Risultati affidabili",
      stats: [
        {
          metric: "10x",
          title: "Completamento più rapido",
          description: "Gli operatori chiudono i workflow in pochi minuti.",
        },
        {
          metric: "20+",
          title: "Ore risparmiate ogni settimana",
          description: "I team recuperano tempo di concentrazione profonda.",
        },
        {
          metric: "95%",
          title: "Tasso di successo",
          description: "Le automazioni delegate arrivano fino in fondo.",
        },
        {
          metric: "5 min",
          title: "Attivazione media",
          description: "Dalla registrazione al primo agente in pochi minuti.",
        },
      ],
      securityBadge: "Sicurezza",
      securityFeatures: [
        { title: "Crittografia end-to-end", description: "I tuoi dati sono protetti in transito e a riposo." },
        { title: "SOC 2 Tipo II", description: "Audit indipendenti e controlli continui." },
        { title: "Privacy prima di tutto", description: "I tuoi dati non addestrano mai i modelli." },
      ],
      complianceBadges: ["SOC 2 Tipo II", "Conforme GDPR", "Crittografia 256 bit"],
    },
    finalCta: {
      philosophyBadge: "La nostra filosofia",
      philosophyCards: [
        { emoji: "🚀", title: "Accelera", description: "Avanza veloce senza perdere qualità." },
        { emoji: "🎯", title: "Concentrati", description: "Lascia il lavoro ripetitivo agli agenti mentre guidi." },
        { emoji: "🤝", title: "Collabora", description: "Mantieni le persone al comando con IA trasparente e auditabile." },
      ],
      noCreditCard: "Nessuna carta richiesta",
      trustBullets: ["Piano gratuito per sempre", "Annulla quando vuoi", "Certificazione SOC 2"],
    },
    footer: {
      tagline: "La tua piattaforma intelligente di agenti multi-IA",
      poweredBy: "Alimentato da",
      product: "Prodotto",
      company: "Azienda",
      connect: "Contatti",
      story: "La nostra storia",
      features: "Funzionalità",
      agents: "Agenti",
      documentation: "Documentazione",
      privacy: "Privacy",
      terms: "Termini",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "Creato con ❤️ da",
      rights: "Tutti i diritti riservati.",
    },
  },
  de: {
    nav: {
      features: "Funktionen",
      agents: "Agenten",
      builder: "Builder",
      demo: "Live-Demo",
      benefits: "Vorteile",
      docs: "Dokumentation",
      signIn: "Anmelden",
      getStarted: "Teste Kylio gratis →",
      searchPlaceholder: "Suche nach Funktionen, Agenten, Bereichen…",
    },
    hero: {
      badge: "Jetzt in der offenen Beta",
      microcopy: "Starte deinen ersten KI-Teamkollegen in unter fünf Minuten – wirklich.",
      trustBadges: ["Keine Kreditkarte nötig", "In 5 Minuten eingerichtet"],
      floatingActions: {
        Emma: "Startet eine Multichannel-Kampagne…",
        Toby: "Refaktoriert einen kritischen Service…",
        Nora: "Beantwortet Community-Fragen…",
        Apu: "Schließt Support-Tickets…",
      },
      onboardingTitle: "Onboarding deines KI-Teams",
      onboardingActive: "Aktiv",
      onboardingTasks: {
        Kylio: "Koordiniert dein Agententeam",
        Emma: "Personalisiert deine Marketingstrategie",
        Toby: "Überprüft deinen Code",
      },
      currentTaskLabel: "Aktuelle Aufgabe",
    },
    customAgents: {
      templates: [
        { name: "Marketing-Assistentin", role: "Content-Creatorin und Social-Strategin", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "Code-Reviewer", role: "Analysiert Qualität und schlägt Verbesserungen vor", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "Sales-Assistent", role: "Lead-Generierung und Pflege", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "Datenanalyst", role: "Verwandelt Daten in verwertbare Insights", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "Definiere deinen Agenten", description: "Name, Rolle und Persönlichkeit" },
        { title: "Konfiguriere Fähigkeiten", description: "Wähle Tools und Berechtigungen" },
        { title: "Trainiere und teste", description: "Feinabstimmung mit Beispielen" },
        { title: "Bereitstellen und überwachen", description: "Starte und tracke die Performance" },
      ],
      capabilityLabels: {
        advanced: "Fortgeschritten",
      },
    },
    features: {
      badge: "Leistungsstarke Funktionen",
      cards: [
        {
          title: "Orchestriere jeden Workflow",
          description: "Delegiere Aufgaben an Spezialisten mit nur einem Prompt.",
          bullets: ["Dynamisches Task-Routing", "Zusammenarbeit zwischen Agenten", "Autonome Ausführung"],
        },
        {
          title: "In Minuten live",
          description: "Bereitstellung von produktionsreifen Agenten ohne Code.",
          bullets: ["Visueller Builder", "Wiederverwendbare Vorlagen", "Versionshistorie"],
        },
        {
          title: "Arbeite im Team",
          description: "Teile Workspaces, Freigaben und Reports mit Stakeholdern.",
          bullets: ["Rollenbasierter Zugriff", "Freigaben & Reviews", "Live-Aktivitätsfeed"],
        },
        {
          title: "Merkt sich jede Präferenz",
          description: "Ankie speichert Namen, Ziele und Anweisungen, damit jede Antwort den Kontext trifft.",
          bullets: ["Profilbewusste Prompts", "Steuerung von Persönlichkeit & Ton", "Eigene Instruktionen eingebacken"],
        },
      ],
      highlightHeadline: "Erweitere mit Integrationen für Wissensdatenbanken, Chat und Automatisierung",
      highlightCta: "Lerne deine Agenten kennen",
    },
    useCaseDemo: {
      badge: "So funktioniert es",
      title: "Sieh deinem KI-Team bei der Arbeit zu",
      subtitle: "Live-Szenarien, wie Kylio-Agenten komplexe Workflows ohne Hilfe meistern.",
      currentTask: "Aktuelle Aufgabe",
      scenarios: [
        {
          agentName: "Emma",
          role: "Marketing-Spezialistin",
          title: "Social-Media-Kampagne ausrollen",
          steps: [
            "Analyse der Markenstimme",
            "Verfassen von 8 passenden Posts",
            "Gestaltung des Carousel-Copys",
            "Timing für maximale Reichweite",
          ],
        },
        {
          agentName: "Toby",
          role: "Technik-Experte",
          title: "Legacy-Service refaktorieren",
          steps: [
            "Repository scannen",
            "Performanceprobleme erkennen",
            "Sichere Architektur vorschlagen",
            "Regressionstests schreiben",
          ],
        },
        {
          agentName: "Peter",
          role: "Research-Stratege",
          title: "Market-Briefing liefern",
          steps: [
            "Wettbewerbs-Insights sammeln",
            "Trends benchmarken",
            "Chancen hervorheben",
            "Executive Summary veröffentlichen",
          ],
        },
      ],
    },
    agents: {
      badge: "KI-Agenten",
      featuredBadge: "⭐ Leitende Orchestratorin",
      featuredDescription: "Kylio koordiniert alle Spezialisten, delegiert intelligent und hält dich am Steuerrad.",
      cards: {
        Kylio: {
          role: "Deine KI-Orchestratorin",
          skills: ["Multi-Agenten-Koordination", "Aufgaben-Delegation", "Workflow-Automatisierung", "Smart Routing"],
        },
        Emma: {
          role: "E-Commerce & Marketing",
          skills: ["Content-Erstellung", "SEO-Optimierung", "Kampagnen-Analytics", "Markenstimme"],
        },
        Toby: {
          role: "Software Engineering & IoT",
          skills: ["Code Reviews", "Debugging", "Architektur-Guidance", "IoT-Workflows"],
        },
        Nora: {
          role: "Medizinische Information & Triage",
          skills: ["Evidenz-Zusammenfassungen", "Risikotriage", "Patientenaufklärung", "Compliance-gerechter Ton"],
        },
        Apu: {
          role: "Support-Spezialist",
          skills: ["Ticket-Priorisierung", "Knowledge-Base-Erstellung", "Lösungsvorschläge", "Kundenempathie"],
        },
        Astra: {
          role: "Kreative Generierung",
          skills: ["KI-Bilderstellung", "Markenkonforme Visuals", "Prompt Engineering", "Design-Varianten"],
        },
      },
      ctaHeadline: "Erstelle Spezialisten für jeden Workflow",
      primaryCta: "Jetzt starten",
      secondaryCta: "Jetzt testen",
    },
    benefits: {
      badge: "Spürbare Ergebnisse",
      stats: [
        {
          stat: "10x",
          statLabel: "schnellere Lieferung",
          title: "Produktivität vervielfachen",
          description: "Projekte in Stunden statt Tagen liefern.",
        },
        {
          stat: "20+",
          statLabel: "Stunden wöchentlich gespart",
          title: "Zeit zurückgewinnen",
          description: "Agenten übernehmen wiederkehrende Aufgaben für dein Team.",
        },
        {
          stat: "94%",
          statLabel: "Zufriedenheit",
          title: "Kund:innen begeistern",
          description: "Schnellere Antworten mit präzisen, freundlichen Ergebnissen.",
        },
      ],
      useCasesBadge: "Wo Kylio glänzt",
      useCases: [
        {
          title: "Content Marketing",
          description: "Plane, schreibe und publiziere markenkonforme Kampagnen über alle Kanäle.",
          users: "Marketing-Teams",
          demo: "Startbereite Social Posts planen…",
        },
        {
          title: "Produktentwicklung",
          description: "Spezifikationen verfeinern, Code prüfen und Releases automatisch dokumentieren.",
          users: "Produkt & Engineering",
          demo: "Backlog priorisieren und Pull Requests zusammenfassen…",
        },
        {
          title: "Customer Success",
          description: "Tickets triagieren, Antworten entwerfen und Insights in Sekunden liefern.",
          users: "Support-Teams",
          demo: "Dringende Gespräche lösen…",
        },
        {
          title: "Operations-Automatisierung",
          description: "Wiederkehrende Workflows über Tools und Daten orchestrieren.",
          users: "Ops & Revenue",
          demo: "CRM-Updates und Follow-ups synchronisieren…",
        },
      ],
    },
    testimonials: {
      badge: "Vertrauenswürdige Ergebnisse",
      stats: [
        {
          metric: "10x",
          title: "Aufgaben schneller erledigt",
          description: "Operator:innen schließen Workflows in Minuten ab.",
        },
        {
          metric: "20+",
          title: "Stunden jede Woche gespart",
          description: "Teams gewinnen Fokuszeit zurück.",
        },
        {
          metric: "95%",
          title: "Erfolgsquote",
          description: "Delegierte Automationen laufen end-to-end durch.",
        },
        {
          metric: "5 min",
          title: "Ø Einrichtungszeit",
          description: "Von Registrierung bis zum ersten Agenten in Minuten.",
        },
      ],
      securityBadge: "Sicherheit",
      securityFeatures: [
        { title: "Ende-zu-Ende-Verschlüsselung", description: "Deine Daten sind unterwegs und im Ruhezustand geschützt." },
        { title: "SOC 2 Typ II", description: "Unabhängige Audits und kontinuierliche Kontrollen." },
        { title: "Privacy first", description: "Deine Daten trainieren niemals die Modelle." },
      ],
      complianceBadges: ["SOC 2 Typ II", "GDPR-konform", "256-Bit-Verschlüsselung"],
    },
    finalCta: {
      philosophyBadge: "Unsere Philosophie",
      philosophyCards: [
        { emoji: "🚀", title: "Beschleunigen", description: "Schnell vorankommen ohne Qualitätsverlust." },
        { emoji: "🎯", title: "Fokussieren", description: "Agenten erledigen Routinearbeit, während du führst." },
        { emoji: "🤝", title: "Partnerschaft", description: "Menschen bleiben dank transparenter, auditierbarer KI am Steuer." },
      ],
      noCreditCard: "Keine Kreditkarte nötig",
      trustBullets: ["Für immer kostenloser Plan", "Jederzeit kündbar", "SOC-2-zertifiziert"],
    },
    footer: {
      tagline: "Deine intelligente Multi-Agenten-Plattform",
      poweredBy: "Angetrieben von",
      product: "Produkt",
      company: "Unternehmen",
      connect: "Kontakt",
      story: "Unsere Geschichte",
      features: "Funktionen",
      agents: "Agenten",
      documentation: "Dokumentation",
      privacy: "Datenschutz",
      terms: "Bedingungen",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "Mit ❤️ erstellt von",
      rights: "Alle Rechte vorbehalten.",
    },
  },
  ja: {
    nav: {
      features: "機能",
      agents: "エージェント",
      builder: "ビルダー",
      demo: "ライブデモ",
      benefits: "メリット",
      docs: "ドキュメント",
      signIn: "ログイン",
      getStarted: "Kylio を無料で試す →",
      searchPlaceholder: "機能・エージェント・セクションを検索…",
    },
    hero: {
      badge: "現在オープンベータ",
      microcopy: "最初のAIチームメイトを5分以内で稼働。これは本当です。",
      trustBadges: ["クレジットカード不要", "5分でセットアップ"],
      floatingActions: {
        Emma: "マルチチャネルキャンペーンを起動…",
        Toby: "重要なサービスをリファクタリング…",
        Nora: "コミュニティの質問に回答…",
        Apu: "サポートチケットを解決…",
      },
      onboardingTitle: "AIチームのオンボーディング",
      onboardingActive: "稼働中",
      onboardingTasks: {
        Kylio: "AIチームをコーディネート",
        Emma: "マーケ戦略をパーソナライズ",
        Toby: "コードベースをレビュー",
      },
      currentTaskLabel: "現在のタスク",
    },
    customAgents: {
      templates: [
        { name: "マーケティングアシスタント", role: "コンテンツ作成とソーシャル戦略", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "コードレビュアー", role: "品質を分析し改善を提案", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "セールスアシスタント", role: "リード獲得とナーチャリング", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "データアナリスト", role: "データを実用的な洞察へ", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "エージェントを定義", description: "名前・役割・性格" },
        { title: "機能を設定", description: "ツールと権限を選択" },
        { title: "学習とテスト", description: "実例でチューニング" },
        { title: "展開と監視", description: "稼働させ成果を追跡" },
      ],
      capabilityLabels: {
        advanced: "上級",
      },
    },
    features: {
      badge: "強力な機能",
      cards: [
        {
          title: "あらゆるワークフローをオーケストレーション",
          description: "ひと言のプロンプトで専門エージェントに仕事を委任。",
          bullets: ["動的なタスク振り分け", "エージェント間コラボレーション", "自律的な実行"],
        },
        {
          title: "数分でローンチ",
          description: "コード不要で本番レベルのエージェントを構築。",
          bullets: ["ビジュアルビルダー", "再利用できるテンプレート", "バージョン履歴"],
        },
        {
          title: "チームでの共同作業",
          description: "スペース・承認・レポートをステークホルダーと共有。",
          bullets: ["役割ベースの権限", "承認とレビュー", "リアルタイム活動フィード"],
        },
        {
          title: "好みをすべて記憶",
          description: "Ankie が名前や目標、カスタム指示を保存し、文脈に沿った返答を行います。",
          bullets: ["プロフィール意識のプロンプト", "パーソナリティとトーンの調整", "カスタム指示の自動適用"],
        },
      ],
      highlightHeadline: "ナレッジ、チャット、自動化の統合でさらに拡張",
      highlightCta: "エージェントを見る",
    },
    useCaseDemo: {
      badge: "実際の動作",
      title: "AIチームの働きをチェック",
      subtitle: "Kylioエージェントが複雑なワークフローを自律的に処理するライブシナリオ。",
      currentTask: "現在のタスク",
      scenarios: [
        {
          agentName: "Emma",
          role: "マーケティングスペシャリスト",
          title: "SNSキャンペーンを展開",
          steps: [
            "ブランドボイスを分析",
            "8本の投稿案を作成",
            "カルーセルのコピーを設計",
            "最適な時間にスケジュール",
          ],
        },
        {
          agentName: "Toby",
          role: "テクニカルエキスパート",
          title: "レガシーサービスをリファクタリング",
          steps: [
            "リポジトリをスキャン",
            "性能課題を特定",
            "より安全なアーキテクチャを提案",
            "回帰テストを作成",
          ],
        },
        {
          agentName: "Peter",
          role: "リサーチストラテジスト",
          title: "マーケットブリーフを届ける",
          steps: [
            "競合インサイトを収集",
            "トレンドをベンチマーク",
            "機会をハイライト",
            "エグゼクティブサマリーを公開",
          ],
        },
      ],
    },
    agents: {
      badge: "AIエージェント",
      featuredBadge: "⭐ メインオーケストレーター",
      featuredDescription: "Kylioは専門家をまとめ、賢く委任し、あなたにコントロールを残します。",
      cards: {
        Kylio: {
          role: "AIオーケストレーター",
          skills: ["マルチエージェント連携", "タスクの委任", "ワークフロー自動化", "スマートルーティング"],
        },
        Emma: {
          role: "Eコマースとマーケティング",
          skills: ["コンテンツ制作", "SEO最適化", "キャンペーン分析", "ブランドボイス"],
        },
        Toby: {
          role: "ソフトウェアエンジニアリングとIoT",
          skills: ["コードレビュー", "デバッグ", "アーキテクチャ指針", "IoTワークフロー"],
        },
        Nora: {
          role: "医療情報とトリアージ",
          skills: ["エビデンス要約", "リスク評価", "患者教育", "コンプライアンス対応のトーン"],
        },
        Apu: {
          role: "サポートスペシャリスト",
          skills: ["チケット優先順位付け", "ナレッジベース作成", "解決策の提案", "顧客への共感"],
        },
        Astra: {
          role: "クリエイティブ生成",
          skills: ["AI画像生成", "ブランド準拠のビジュアル", "プロンプト設計", "デザインのバリエーション"],
        },
      },
      ctaHeadline: "すべてのフローに合わせた専門家を作成",
      primaryCta: "今すぐ始める",
      secondaryCta: "すぐに試す",
    },
    benefits: {
      badge: "実感できる成果",
      stats: [
        {
          stat: "10x",
          statLabel: "より速いデリバリー",
          title: "生産性を何倍にも",
          description: "プロジェクトを数日ではなく数時間で提供。",
        },
        {
          stat: "20+",
          statLabel: "週あたりの削減時間",
          title: "時間を取り戻す",
          description: "繰り返し作業をエージェントに任せチームの余力を生む。",
        },
        {
          stat: "94%",
          statLabel: "ユーザー満足度",
          title: "顧客を魅了",
          description: "正確で温かい応答をこれまでより速く。",
        },
      ],
      useCasesBadge: "Kylioが輝く領域",
      useCases: [
        {
          title: "コンテンツマーケティング",
          description: "全チャネルで一貫したキャンペーンを企画・執筆・公開。",
          users: "マーケティングチーム",
          demo: "公開準備が整った投稿をスケジュール…",
        },
        {
          title: "プロダクト開発",
          description: "仕様を磨き、コードをレビューし、リリースを自動で記録。",
          users: "プロダクト & エンジニアリング",
          demo: "バックログの優先付けとPRの要約…",
        },
        {
          title: "カスタマーサクセス",
          description: "チケットの振り分け・回答案・インサイト抽出を数秒で。",
          users: "サポートチーム",
          demo: "高優先度の会話を解決…",
        },
        {
          title: "オペレーション自動化",
          description: "ツールとデータを横断する定期処理をオーケストレーション。",
          users: "Ops & レベニュー",
          demo: "CRM更新とフォローアップを同期…",
        },
      ],
    },
    testimonials: {
      badge: "信頼できる成果",
      stats: [
        {
          metric: "10x",
          title: "タスク完了が劇的に高速化",
          description: "オペレーターが数分でワークフローを完了。",
        },
        {
          metric: "20+",
          title: "毎週20時間以上を節約",
          description: "チームが集中のための時間を取り戻す。",
        },
        {
          metric: "95%",
          title: "成功率",
          description: "委任した自動化が端から端まで完了。",
        },
        {
          metric: "5 min",
          title: "平均セットアップ時間",
          description: "登録から最初のエージェント稼働まで数分。",
        },
      ],
      securityBadge: "セキュリティ",
      securityFeatures: [
        { title: "エンドツーエンド暗号化", description: "データは送受信時も保存時も暗号化されています。" },
        { title: "SOC 2 Type II", description: "独立監査と継続的な管理。" },
        { title: "プライバシーファースト", description: "あなたのデータがモデルの学習に使われることはありません。" },
      ],
      complianceBadges: ["SOC 2 Type II", "GDPR準拠", "256ビット暗号化"],
    },
    finalCta: {
      philosophyBadge: "私たちの哲学",
      philosophyCards: [
        { emoji: "🚀", title: "加速", description: "品質を落とさずスピードを上げる。" },
        { emoji: "🎯", title: "集中", description: "単純作業はエージェントに任せ、あなたはリードする。" },
        { emoji: "🤝", title: "協働", description: "透明で監査可能なAIで人間が主導権を保つ。" },
      ],
      noCreditCard: "クレジットカード不要",
      trustBullets: ["永久無料プラン", "いつでも解約可能", "SOC 2認証"],
    },
    footer: {
      tagline: "インテリジェントなマルチエージェントAIプラットフォーム",
      poweredBy: "提供元",
      product: "製品",
      company: "企業情報",
      connect: "つながる",
      story: "私たちのストーリー",
      features: "機能",
      agents: "エージェント",
      documentation: "ドキュメント",
      privacy: "プライバシー",
      terms: "利用規約",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "❤️ を込めて制作",
      rights: "All rights reserved.",
    },
  },
  ko: {
    nav: {
      features: "기능",
      agents: "에이전트",
      builder: "빌더",
      demo: "라이브 데모",
      benefits: "혜택",
      docs: "문서",
      signIn: "로그인",
      getStarted: "Kylio 무료 체험 →",
      searchPlaceholder: "기능·에이전트·섹션 검색…",
    },
    hero: {
      badge: "지금 오픈 베타",
      microcopy: "5분도 안 돼 첫 번째 AI 팀원을 배치하세요. 정말입니다.",
      trustBadges: ["신용카드 불필요", "5분 설정"],
      floatingActions: {
        Emma: "멀티채널 캠페인 실행 중…",
        Toby: "핵심 서비스를 리팩터링…",
        Nora: "커뮤니티 질문 응답…",
        Apu: "지원 티켓 마무리…",
      },
      onboardingTitle: "AI 팀 온보딩",
      onboardingActive: "활성",
      onboardingTasks: {
        Kylio: "AI 팀 전체 조율",
        Emma: "마케팅 전략 개인화",
        Toby: "코드베이스 리뷰",
      },
      currentTaskLabel: "현재 작업",
    },
    customAgents: {
      templates: [
        { name: "마케팅 어시스턴트", role: "콘텐츠 제작 및 소셜 전략", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "코드 리뷰어", role: "품질 분석 및 개선 제안", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "세일즈 어시스턴트", role: "리드 발굴과 육성", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "데이터 애널리스트", role: "데이터를 실행 가능한 인사이트로", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "에이전트 정의", description: "이름, 역할, 성격" },
        { title: "능력 구성", description: "도구와 권한 선택" },
        { title: "학습 및 테스트", description: "실제 예제로 미세 조정" },
        { title: "배포 및 모니터링", description: "실행하고 성과 추적" },
      ],
      capabilityLabels: {
        advanced: "고급",
      },
    },
    features: {
      badge: "강력한 기능",
      cards: [
        {
          title: "모든 워크플로 조율",
          description: "한 번의 프롬프트로 전문가에게 작업 위임.",
          bullets: ["동적 작업 라우팅", "에이전트 간 협업", "자동 실행"],
        },
        {
          title: "몇 분 안에 출시",
          description: "코드 없이도 프로덕션 수준의 에이전트 구축.",
          bullets: ["비주얼 빌더", "재사용 가능한 템플릿", "버전 이력"],
        },
        {
          title: "팀과 함께 협업",
          description: "공유 작업공간, 승인, 리포트 제공.",
          bullets: ["역할 기반 권한", "승인 및 리뷰", "실시간 활동 피드"],
        },
        {
          title: "모든 선호를 기억",
          description: "Ankie가 이름, 목표, 맞춤 지침을 기억해 매 응답이 당신만을 향합니다.",
          bullets: ["프로필 기반 프롬프트", "성격·톤 제어", "맞춤 지침 완전 반영"],
        },
      ],
      highlightHeadline: "이름, 목표, 말투까지 이해하는 맞춤형 AI 팀을 지금 만나보세요.",
      highlightCta: "에이전트 만나보기",
    },
    useCaseDemo: {
      badge: "실제 동작",
      title: "AI 팀이 일하는 모습",
      subtitle: "Kylio 에이전트가 복잡한 워크플로를 스스로 처리하는 라이브 시나리오.",
      currentTask: "현재 작업",
      scenarios: [
        {
          agentName: "Emma",
          role: "마케팅 전문가",
          title: "소셜 캠페인 출시",
          steps: [
            "브랜드 보이스 분석",
            "브랜드에 맞는 8개 게시글 작성",
            "캐러셀 카피 제작",
            "최적 시간에 예약",
          ],
        },
        {
          agentName: "Toby",
          role: "기술 전문가",
          title: "레거시 서비스 리팩터링",
          steps: [
            "레포지토리 스캔",
            "성능 이슈 발견",
            "더 안전한 아키텍처 제안",
            "회귀 테스트 작성",
          ],
        },
        {
          agentName: "Peter",
          role: "리서치 전략가",
          title: "시장 브리핑 제공",
          steps: [
            "경쟁사 인사이트 수집",
            "트렌드 벤치마킹",
            "기회 포인트 강조",
            "임원 요약본 발행",
          ],
        },
      ],
    },
    agents: {
      badge: "AI 에이전트",
      featuredBadge: "⭐ 메인 오케스트레이터",
      featuredDescription: "Kylio는 전문가들을 조율하고 현명하게 위임하며 당신이 주도권을 잡도록 돕습니다.",
      cards: {
        Kylio: {
          role: "AI 오케스트레이터",
          skills: ["멀티 에이전트 조율", "업무 위임", "워크플로 자동화", "스마트 라우팅"],
        },
        Emma: {
          role: "이커머스 & 마케팅",
          skills: ["콘텐츠 제작", "SEO 최적화", "캠페인 분석", "브랜드 보이스"],
        },
        Toby: {
          role: "소프트웨어 엔지니어링 & IoT",
          skills: ["코드 리뷰", "디버깅", "아키텍처 가이드", "IoT 워크플로"],
        },
        Nora: {
          role: "의료 정보 & 트리아지",
          skills: ["근거 요약", "위험 평가", "환자 교육", "컴플라이언스 톤"],
        },
        Apu: {
          role: "지원 전문가",
          skills: ["티켓 우선순위 지정", "지식베이스 작성", "해결 방안 제안", "고객 공감"],
        },
        Astra: {
          role: "크리에이티브 생성",
          skills: ["AI 이미지 생성", "브랜드 일관 비주얼", "프롬프트 엔지니어링", "디자인 변형"],
        },
      },
      ctaHeadline: "모든 흐름에 맞춘 전문가를 만들기",
      primaryCta: "지금 시작",
      secondaryCta: "바로 체험",
    },
    benefits: {
      badge: "체감되는 결과",
      stats: [
        {
          stat: "10x",
          statLabel: "더 빠른 전달",
          title: "생산성 극대화",
          description: "프로젝트를 며칠이 아닌 몇 시간 만에 제공.",
        },
        {
          stat: "20+",
          statLabel: "주당 절약 시간",
          title: "시간을 되찾기",
          description: "반복 업무를 에이전트에 맡겨 팀의 여유를 확보.",
        },
        {
          stat: "94%",
          statLabel: "사용자 만족도",
          title: "고객을 감동시키기",
          description: "정확하고 따뜻한 응답을 누구보다 빠르게.",
        },
      ],
      useCasesBadge: "Kylio가 빛나는 순간",
      useCases: [
        {
          title: "콘텐츠 마케팅",
          description: "전 채널에 걸쳐 일관된 캠페인을 기획·작성·게시.",
          users: "마케팅 팀",
          demo: "출시 준비된 소셜 게시물 예약…",
        },
        {
          title: "제품 개발",
          description: "명세를 다듬고 코드를 검토하며 릴리즈를 자동 문서화.",
          users: "제품 & 엔지니어링",
          demo: "백로그 우선순위와 PR 요약…",
        },
        {
          title: "고객 성공",
          description: "티켓 분류, 답변 초안, 인사이트 도출을 몇 초 만에.",
          users: "지원 팀",
          demo: "고우선 대화 해결…",
        },
        {
          title: "운영 자동화",
          description: "툴과 데이터를 넘나드는 반복 작업을 오케스트레이션.",
          users: "Ops & Revenue",
          demo: "CRM 업데이트와 후속 작업 동기화…",
        },
      ],
    },
    testimonials: {
      badge: "신뢰받는 결과",
      stats: [
        {
          metric: "10x",
          title: "업무 완료 속도 향상",
          description: "운영자가 분 단위로 워크플로 마감.",
        },
        {
          metric: "20+",
          title: "주당 20시간 이상 절약",
          description: "팀이 집중할 시간을 다시 확보.",
        },
        {
          metric: "95%",
          title: "성공률",
          description: "위임된 자동화가 처음부터 끝까지 완료.",
        },
        {
          metric: "5 min",
          title: "평균 설정 시간",
          description: "가입부터 첫 에이전트 실행까지 단 몇 분.",
        },
      ],
      securityBadge: "보안",
      securityFeatures: [
        { title: "엔드투엔드 암호화", description: "데이터는 전송 중과 저장 중 모두 암호화됩니다." },
        { title: "SOC 2 Type II", description: "독립 감사와 지속적인 통제." },
        { title: "프라이버시 우선", description: "데이터는 모델 학습에 사용되지 않습니다." },
      ],
      complianceBadges: ["SOC 2 Type II", "GDPR 준수", "256비트 암호화"],
    },
    finalCta: {
      philosophyBadge: "우리의 철학",
      philosophyCards: [
        { emoji: "🚀", title: "가속", description: "품질을 유지하면서 속도를 높이세요." },
        { emoji: "🎯", title: "집중", description: "반복 업무는 에이전트에게 맡기고 리더십에 집중하세요." },
        { emoji: "🤝", title: "파트너십", description: "투명하고 감사 가능한 AI로 사람이 주도권을 유지합니다." },
      ],
      noCreditCard: "신용카드 불필요",
      trustBullets: ["영구 무료 플랜", "언제든 취소 가능", "SOC 2 인증"],
    },
    footer: {
      tagline: "지능형 멀티 에이전트 AI 플랫폼",
      poweredBy: "제공",
      product: "제품",
      company: "회사",
      connect: "연결하기",
      story: "우리의 이야기",
      features: "기능",
      agents: "에이전트",
      documentation: "문서",
      privacy: "개인정보",
      terms: "이용약관",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "❤️ 로 제작",
      rights: "모든 권리 보유.",
    },
  },
  zh: {
    nav: {
      features: "功能",
      agents: "智能体",
      builder: "构建器",
      demo: "在线演示",
      benefits: "优势",
      docs: "文档",
      signIn: "登录",
      getStarted: "免费体验 Kylio →",
      searchPlaceholder: "搜索功能、智能体、章节…",
    },
    hero: {
      badge: "现已开放测试",
      microcopy: "不到五分钟，部署你的第一位AI队友，真的。",
      trustBadges: ["无需信用卡", "5 分钟完成配置"],
      floatingActions: {
        Emma: "正在启动多渠道营销活动…",
        Toby: "重构关键服务…",
        Nora: "回复社区提问…",
        Apu: "关闭支持工单…",
      },
      onboardingTitle: "AI 团队入职",
      onboardingActive: "运行中",
      onboardingTasks: {
        Kylio: "协调你的智能体团队",
        Emma: "个性化营销策略",
        Toby: "审查代码库",
      },
      currentTaskLabel: "当前任务",
    },
    customAgents: {
      templates: [
        { name: "营销助手", role: "内容创作与社媒策划", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "代码审阅", role: "分析质量并提出改进", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "销售助手", role: "线索发掘与跟进", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "数据分析师", role: "将数据转化为洞察", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "定义你的智能体", description: "名称、角色与个性" },
        { title: "配置能力", description: "选择工具和权限" },
        { title: "训练与测试", description: "用真实案例调优" },
        { title: "上线与监控", description: "发布并追踪表现" },
      ],
      capabilityLabels: {
        advanced: "高级",
      },
    },
    features: {
      badge: "强大功能",
      cards: [
        {
          title: "编排每个流程",
          description: "一句提示即可把任务交给专业智能体。",
          bullets: ["动态任务分发", "智能体协作", "自动执行"],
        },
        {
          title: "几分钟上线",
          description: "无需写代码就能构建生产级智能体。",
          bullets: ["可视化构建器", "可复用模板", "版本历史"],
        },
        {
          title: "团队协同",
          description: "与利益相关者共享空间、审批和报告。",
          bullets: ["基于角色的权限", "审批与审阅", "实时活动流"],
        },
        {
          title: "记住每一条偏好",
          description: "Ankie 会记住姓名、目标和定制指令，让每次回复都像专属助理。",
          bullets: ["基于档案的提示", "性格与语气控制", "内置自定义指令"],
        },
      ],
      highlightHeadline: "让记住你名字、目标和语气的 AI 团队立即上岗。",
      highlightCta: "认识这些智能体",
    },
    useCaseDemo: {
      badge: "实际演示",
      title: "看看 AI 团队如何工作",
      subtitle: "现场场景展示 Kylio 智能体如何独立完成复杂流程。",
      currentTask: "当前任务",
      scenarios: [
        {
          agentName: "Emma",
          role: "营销专家",
          title: "发布社交媒体活动",
          steps: [
            "分析品牌语调",
            "撰写 8 条匹配文案",
            "设计轮播页文案",
            "安排最佳发布时间",
          ],
        },
        {
          agentName: "Toby",
          role: "技术专家",
          title: "重构遗留服务",
          steps: [
            "扫描代码仓库",
            "定位性能瓶颈",
            "提出更安全的架构",
            "编写回归测试",
          ],
        },
        {
          agentName: "Peter",
          role: "研究策略师",
          title: "交付市场简报",
          steps: [
            "收集竞品情报",
            "对比市场趋势",
            "突出机会点",
            "发布管理层摘要",
          ],
        },
      ],
    },
    agents: {
      badge: "AI 智能体",
      featuredBadge: "⭐ 主控协作者",
      featuredDescription: "Kylio 统筹每位专家，智能分配任务，同时由你掌控全局。",
      cards: {
        Kylio: {
          role: "你的 AI 指挥官",
          skills: ["多智能体协同", "任务委派", "流程自动化", "智能路由"],
        },
        Emma: {
          role: "电商与营销",
          skills: ["内容创作", "SEO 优化", "活动分析", "品牌语调"],
        },
        Toby: {
          role: "软件工程与物联网",
          skills: ["代码评审", "调试", "架构指导", "IoT 流程"],
        },
        Nora: {
          role: "医疗信息与分诊",
          skills: ["循证摘要", "风险评估", "患者教育", "合规语气"],
        },
        Apu: {
          role: "支持专家",
          skills: ["工单优先级", "知识库撰写", "解决方案建议", "客户共情"],
        },
        Astra: {
          role: "创意生成",
          skills: ["AI 图像生成", "品牌一致视觉", "提示词工程", "设计变体"],
        },
      },
      ctaHeadline: "为每个流程打造专属专家",
      primaryCta: "立即开始",
      secondaryCta: "马上体验",
    },
    benefits: {
      badge: "看得见的成效",
      stats: [
        {
          stat: "10x",
          statLabel: "交付更迅速",
          title: "生产力倍增",
          description: "项目交付从几天缩短到几小时。",
        },
        {
          stat: "20+",
          statLabel: "每周节省小时数",
          title: "夺回时间",
          description: "让智能体处理重复劳动，释放团队精力。",
        },
        {
          stat: "94%",
          statLabel: "用户满意度",
          title: "打动客户",
          description: "更快地提供准确、友好的回复。",
        },
      ],
      useCasesBadge: "Kylio 的闪光场景",
      useCases: [
        {
          title: "内容营销",
          description: "跨渠道策划、撰写并发布一致的营销活动。",
          users: "营销团队",
          demo: "安排即可发布的社交内容…",
        },
        {
          title: "产品研发",
          description: "完善需求、审查代码并自动文档化版本。",
          users: "产品与工程",
          demo: "优先排序待办并汇总 PR…",
        },
        {
          title: "客户成功",
          description: "快速分流工单、生成回复并提炼洞察。",
          users: "支持团队",
          demo: "解决高优先级对话…",
        },
        {
          title: "运营自动化",
          description: "跨工具与数据源编排循环任务。",
          users: "运营与营收团队",
          demo: "同步 CRM 更新与跟进…",
        },
      ],
    },
    testimonials: {
      badge: "值得信赖的成果",
      stats: [
        {
          metric: "10x",
          title: "任务完成更快",
          description: "操作成员几分钟内完成流程。",
        },
        {
          metric: "20+",
          title: "每周节省 20+ 小时",
          description: "团队重新拥有深度专注时间。",
        },
        {
          metric: "95%",
          title: "成功率",
          description: "委派自动化从头到尾顺利完成。",
        },
        {
          metric: "5 min",
          title: "平均部署时间",
          description: "注册到上线首个智能体仅需几分钟。",
        },
      ],
      securityBadge: "安全",
      securityFeatures: [
        { title: "端到端加密", description: "数据在传输和存储过程中始终加密。" },
        { title: "SOC 2 Type II", description: "独立审计与持续控制。" },
        { title: "隐私优先", description: "你的数据不会用于模型训练。" },
      ],
      complianceBadges: ["SOC 2 Type II", "符合 GDPR", "256 位加密"],
    },
    finalCta: {
      philosophyBadge: "我们的理念",
      philosophyCards: [
        { emoji: "🚀", title: "加速", description: "保持质量的同时提高速度。" },
        { emoji: "🎯", title: "聚焦", description: "让智能体处理重复工作，你专注领导。" },
        { emoji: "🤝", title: "协同", description: "以透明、可审计的 AI 保持人为主导。" },
      ],
      noCreditCard: "无需信用卡",
      trustBullets: ["永久免费计划", "随时可取消", "SOC 2 认证"],
    },
    footer: {
      tagline: "智能的多智能体 AI 平台",
      poweredBy: "技术支持",
      product: "产品",
      company: "公司",
      connect: "联系",
      story: "我们的故事",
      features: "功能",
      agents: "智能体",
      documentation: "文档",
      privacy: "隐私",
      terms: "条款",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "由 ❤️ 打造",
      rights: "版权所有。",
    },
  },
  ar: {
    nav: {
      features: "المزايا",
      agents: "الوكلاء",
      builder: "الباني",
      demo: "عرض مباشر",
      benefits: "الفوائد",
      docs: "الوثائق",
      signIn: "تسجيل الدخول",
      getStarted: "جرّب Kylio مجانًا ←",
      searchPlaceholder: "ابحث عن مزايا أو وكلاء أو أقسام…",
    },
    hero: {
      badge: "الآن في نسخة تجريبية مفتوحة",
      microcopy: "أطلق أول زميل عمل بالذكاء الاصطناعي خلال أقل من خمس دقائق—حرفيًا.",
      trustBadges: ["لا حاجة لبطاقة ائتمان", "إعداد في 5 دقائق"],
      floatingActions: {
        Emma: "تطلق حملة متعددة القنوات…",
        Toby: "تعيد هندسة خدمة حرجة…",
        Nora: "تجيب على أسئلة المجتمع…",
        Apu: "تغلق تذاكر الدعم…",
      },
      onboardingTitle: "تهيئة فريق الذكاء الاصطناعي",
      onboardingActive: "نشط",
      onboardingTasks: {
        Kylio: "تنظم فريق الوكلاء",
        Emma: "تخصص استراتيجية التسويق",
        Toby: "تراجع الشفرة البرمجية",
      },
      currentTaskLabel: "المهمة الحالية",
    },
    customAgents: {
      templates: [
        { name: "مساعد التسويق", role: "ابتكار المحتوى وإدارة الشبكات الاجتماعية", color: "from-pink-500 to-rose-500", icon: "📱" },
        { name: "مراجع الشفرة", role: "تحلل الجودة وتقترح التحسينات", color: "from-blue-500 to-cyan-500", icon: "💻" },
        { name: "مساعد المبيعات", role: "تنمية العملاء المحتملين ورعايتهم", color: "from-green-500 to-emerald-500", icon: "💼" },
        { name: "محلل البيانات", role: "يحّول البيانات إلى رؤى قابلة للتنفيذ", color: "from-purple-500 to-indigo-500", icon: "📊" },
      ],
      steps: [
        { title: "عرّف وكيلك", description: "الاسم والدور والشخصية" },
        { title: "اضبط القدرات", description: "اختر الأدوات والصلاحيات" },
        { title: "درّب واختبر", description: "عدّل باستخدام أمثلة حقيقية" },
        { title: "انشر وراقب", description: "أطلق وتابع الأداء" },
      ],
      capabilityLabels: {
        advanced: "متقدم",
      },
    },
    features: {
      badge: "قدرات قوية",
      cards: [
        {
          title: "تنسيق كل سير عمل",
          description: "فوّض العمل إلى المتخصصين عبر مطالبة واحدة.",
          bullets: ["توجيه ديناميكي للمهام", "تعاون بين الوكلاء", "تنفيذ ذاتي"],
        },
        {
          title: "إطلاق خلال دقائق",
          description: "أنشئ وكلاء جاهزين للإنتاج بدون كتابة كود.",
          bullets: ["منشئ بصري", "قوالب قابلة لإعادة الاستخدام", "سجل للإصدارات"],
        },
        {
          title: "تعاون مع فريقك",
          description: "شارك المساحات والموافقات والتقارير مع أصحاب المصلحة.",
          bullets: ["صلاحيات مبنية على الأدوار", "موافقات ومراجعات", "تغذية نشاط مباشرة"],
        },
        {
          title: "يتذكر كل تفضيل",
          description: "تحفظ Ankie الأسماء والأهداف والتعليمات المخصّصة ليشعر كل رد بأنه مكتوب لك.",
          bullets: ["مطالبات واعية بالملف الشخصي", "ضبط الشخصية ونبرة الصوت", "تعليمات مخصّصة مدمجة"],
        },
      ],
      highlightHeadline: "قابل فريق وكلاء يعرف اسمك وأهدافك ويطابق أسلوبك.",
      highlightCta: "تعرّف على الوكلاء",
    },
    useCaseDemo: {
      badge: "كيف تعمل فعليًا",
      title: "راقب فريقك الذكي أثناء العمل",
      subtitle: "سيناريوهات مباشرة تُظهر كيف تنجز وكلاء Kylio المهام المعقدة دون إشراف.",
      currentTask: "المهمة الحالية",
      scenarios: [
        {
          agentName: "Emma",
          role: "متخصصة تسويق",
          title: "إطلاق حملة عبر وسائل التواصل",
          steps: [
            "تحليل أسلوب العلامة",
            "كتابة ثمانية منشورات متناسقة",
            "تصميم نصوص الكاروسيل",
            "جدولة للوصول في الوقت الأمثل",
          ],
        },
        {
          agentName: "Toby",
          role: "خبير تقني",
          title: "إعادة هيكلة خدمة قديمة",
          steps: [
            "مسح المستودع",
            "تحديد مشكلات الأداء",
            "اقتراح بنية أكثر أمانًا",
            "كتابة اختبارات الانحدار",
          ],
        },
        {
          agentName: "Peter",
          role: "استراتيجي بحوث",
          title: "تقديم موجز السوق",
          steps: [
            "جمع معلومات عن المنافسين",
            "مقارنة الاتجاهات",
            "إبراز الفرص",
            "نشر ملخص تنفيذي",
          ],
        },
      ],
    },
    agents: {
      badge: "وكلاء الذكاء الاصطناعي",
      featuredBadge: "⭐ المنسقة الرئيسية",
      featuredDescription: "تُنسّق Kylio جميع المتخصصين، وتفوّض بذكاء، وتحافظ على مركز القيادة لديك.",
      cards: {
        Kylio: {
          role: "قائدتك الذكية",
          skills: ["تنسيق متعدد الوكلاء", "تفويض المهام", "أتمتة سير العمل", "توجيه ذكي"],
        },
        Emma: {
          role: "التجارة الإلكترونية والتسويق",
          skills: ["إنتاج المحتوى", "تحسين SEO", "تحليلات الحملات", "هوية العلامة"],
        },
        Toby: {
          role: "هندسة البرمجيات وإنترنت الأشياء",
          skills: ["مراجعات الكود", "إصلاح الأخطاء", "إرشاد معماري", "مهام IoT"],
        },
        Nora: {
          role: "المعلومات الطبية والفرز",
          skills: ["ملخصات الأدلة", "تقييم المخاطر", "تثقيف المرضى", "نبرة متوافقة"],
        },
        Apu: {
          role: "خبير دعم",
          skills: ["أولوية التذاكر", "صياغة قاعدة المعرفة", "مقترحات الحلول", "تعاطف مع العملاء"],
        },
        Astra: {
          role: "ابتكار إبداعي",
          skills: ["توليد صور بالذكاء الاصطناعي", "مرئيات متوافقة مع العلامة", "هندسة المطالبات", "تنويعات التصميم"],
        },
      },
      ctaHeadline: "أنشئ متخصصين مخصصين لكل مهمة",
      primaryCta: "ابدأ الآن",
      secondaryCta: "جرّبه اليوم",
    },
    benefits: {
      badge: "نتائج ملموسة",
      stats: [
        {
          stat: "10x",
          statLabel: "تسليم أسرع",
          title: "ضاعف الإنتاجية",
          description: "سلّم المشاريع في ساعات بدلًا من أيام.",
        },
        {
          stat: "20+",
          statLabel: "ساعات موفّرة أسبوعيًا",
          title: "استرجع وقتك",
          description: "دع الوكلاء ينهون الأعمال المكررة عن فريقك.",
        },
        {
          stat: "94%",
          statLabel: "رضا المستخدم",
          title: "أبهِر عملاءك",
          description: "استجب أسرع بإجابات دقيقة ودافئة.",
        },
      ],
      useCasesBadge: "أين تتألق Kylio",
      useCases: [
        {
          title: "تسويق المحتوى",
          description: "خطط واكتب وانشر حملات متناسقة عبر كل القنوات.",
          users: "فرق التسويق",
          demo: "جدولة منشورات جاهزة للإطلاق…",
        },
        {
          title: "تطوير المنتجات",
          description: "صقِل المواصفات، راجع الكود، وأوثّق الإصدارات تلقائيًا.",
          users: "المنتج والهندسة",
          demo: "ترتيب المهام وتلخيص طلبات الدمج…",
        },
        {
          title: "نجاح العملاء",
          description: "فرز التذاكر، كتابة الردود، واستخراج الرؤى في ثوانٍ.",
          users: "فرق الدعم",
          demo: "حل المحادثات ذات الأولوية العالية…",
        },
        {
          title: "أتمتة العمليات",
          description: "نسّق الأعمال المتكررة بين الأدوات ومصادر البيانات.",
          users: "العمليات والإيرادات",
          demo: "مزامنة تحديثات CRM والمتابعة…",
        },
      ],
    },
    testimonials: {
      badge: "نتائج موثوقة",
      stats: [
        {
          metric: "10x",
          title: "إتمام المهام أسرع",
          description: "يُنهي الفريق العمليات في دقائق معدودة.",
        },
        {
          metric: "20+",
          title: "أكثر من 20 ساعة أسبوعيًا",
          description: "يستعيد الفريق وقت التركيز العميق.",
        },
        {
          metric: "95%",
          title: "معدل النجاح",
          description: "الأتمتة المفوّضة تكتمل من البداية للنهاية.",
        },
        {
          metric: "5 min",
          title: "متوسط الإعداد",
          description: "من التسجيل إلى أول وكيل عامل خلال دقائق.",
        },
      ],
      securityBadge: "الأمان",
      securityFeatures: [
        { title: "تشفير شامل", description: "بياناتك محمية أثناء النقل والتخزين." },
        { title: "SOC 2 النوع الثاني", description: "تدقيق مستقل ورقابة مستمرة." },
        { title: "الخصوصية أولًا", description: "لن تُستخدم بياناتك لتدريب النماذج." },
      ],
      complianceBadges: ["SOC 2 النوع الثاني", "متوافق مع GDPR", "تشفير 256-بت"],
    },
    finalCta: {
      philosophyBadge: "فلسفتنا",
      philosophyCards: [
        { emoji: "🚀", title: "تسارع", description: "تحرك بسرعة دون التضحية بالجودة." },
        { emoji: "🎯", title: "تركيز", description: "دع الوكلاء يتعاملون مع الأعمال الروتينية بينما تقود." },
        { emoji: "🤝", title: "شراكة", description: "حافظ على سيطرة البشر مع ذكاء اصطناعي شفاف يمكن تدقيقه." },
      ],
      noCreditCard: "لا حاجة لبطاقة ائتمان",
      trustBullets: ["خطة مجانية للأبد", "يمكن الإلغاء في أي وقت", "معتمد SOC 2"],
    },
    footer: {
      tagline: "منصتك الذكية للوكلاء متعددي الذكاء الاصطناعي",
      poweredBy: "بدعم من",
      product: "المنتج",
      company: "الشركة",
      connect: "تواصل",
      story: "قصتنا",
      features: "المزايا",
      agents: "الوكلاء",
      documentation: "الوثائق",
      privacy: "الخصوصية",
      terms: "الشروط",
      github: "GitHub",
      twitter: "Twitter",
      huminary: "Huminary Labs",
      builtWith: "صُنِع بحب ❤️",
      rights: "جميع الحقوق محفوظة.",
    },
  },
}

const BRAND_NAME = "Ankie AI"
const BRAND_SHORT = "Ankie"

function normalizeBrandTokens<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/Kylio AI/g, BRAND_NAME)
      .replace(/Kylio/g, BRAND_SHORT)
      .replace(/CLEO/g, BRAND_SHORT.toUpperCase()) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeBrandTokens(item)) as T
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      acc[key] = normalizeBrandTokens(entry)
      return acc
    }, {}) as T
  }

  return value
}

export function getLandingCopy(locale: Locale): LandingCopy {
  const copy = landingCopy[locale] ?? landingCopy.en
  return normalizeBrandTokens(copy)
}
