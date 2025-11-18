/**
 * Translations for Cleo sidebar and UI
 * Auto-detects browser language and translates without changing URLs
 */

export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'it' | 'de' | 'ja' | 'ko' | 'zh' | 'ar'

export type Translations = {
  // Sidebar navigation
  sidebar: {
    home: string
    agents: string
    tasks: string
    integrations: string
    dashboard: string
    docs: string
    personality: string
    search: string
    newChat: string
    voice: string
    projects: string
    newProject: string
    history: string
    settings: string
    files: string
    newAgent: string
    generatePrompt: string
  }
  
  // Time groupings
  time: {
    today: string
    yesterday: string
    lastWeek: string
    last7Days: string
    lastMonth: string
    last30Days: string
    thisYear: string
    older: string
    thisWeek: string
    thisMonth: string
  }
  
  // Common actions
  actions: {
    delete: string
    edit: string
    rename: string
    share: string
    copy: string
    download: string
    upload: string
    cancel: string
    save: string
    create: string
    open: string
    close: string
  }
  
  // Badges
  badges: {
    new: string
  }
  
  // Projects
  projects: {
    viewAll: string
    new: string
    documents: string
    noDocuments: string
    uploadDocuments: string
    reindex: string
    backToProject: string
    createNew: string
    createDescription: string
    namePlaceholder: string
    folderColor: string
  }
  
  // Settings
  settings: {
    title: string
    general: string
    models: string
    personality: string
    files: string
    appearance: string
    language: string
  }

  // Landing page
  landing: {
    // Hero section
    heroTitle: string
    heroSubtitle: string
    heroCta: string
    heroCtaSecondary: string
    
    // Trust section
    trustedBy: string
    
    // Custom Agents section
    customAgentsBadge: string
    customAgentsTitle: string
    customAgentsSubtitle: string
  customAgentsTagline: string
    customAgentsFormName: string
    customAgentsFormRole: string
    customAgentsFormCapability: string
    customAgentsPreview: string
    customAgentsDeploy: string
    customAgentsBenefitsTitle: string
    customAgentsBenefit1Title: string
    customAgentsBenefit1Desc: string
    customAgentsBenefit2Title: string
    customAgentsBenefit2Desc: string
    customAgentsBenefit3Title: string
    customAgentsBenefit3Desc: string
    customAgentsBenefit4Title: string
    customAgentsBenefit4Desc: string
    customAgentsUseCasesTitle: string
    customAgentsUseCase1: string
    customAgentsUseCase2: string
    customAgentsUseCase3: string
    customAgentsUseCase4: string
    
    // Features section
    featuresTitle: string
    featuresSubtitle: string
    
    // Agents section
    agentsTitle: string
    agentsSubtitle: string
    
    // Benefits section
    benefitsTitle: string
    benefitsSubtitle: string
    
    // Use cases section
    useCasesTitle: string
    useCasesSubtitle: string
    
    // Testimonials section
    testimonialsTitle: string
    testimonialsSubtitle: string
    
    // Security section
    securityTitle: string
    securitySubtitle: string
    
    // Final CTA section
    finalCtaTitle: string
    finalCtaSubtitle: string
    finalCta: string
    tryDemo: string
    getStarted: string
    tryNow: string
    
    // Deploy time badge
    deployTime: string
    under5Minutes: string
    
    // Philosophy section
    philosophyTitle: string
    philosophySubtitle: string
  }
}

const en: Translations = {
  sidebar: {
    home: 'Home',
    agents: 'Agents',
    tasks: 'Tasks',
    integrations: 'Integrations',
    dashboard: 'Dashboard',
    docs: 'Docs',
    personality: 'Personality',
    search: 'Search',
    newChat: 'New Chat',
    voice: 'Voice',
    projects: 'Projects',
    newProject: 'New',
    history: 'History',
    settings: 'Settings',
    files: 'Files',
    newAgent: 'New Agent',
    generatePrompt: 'Generate Prompt',
  },
  time: {
    today: 'Today',
    yesterday: 'Yesterday',
    lastWeek: 'Last 7 days',
    last7Days: 'Last 7 days',
    lastMonth: 'Last 30 days',
    last30Days: 'Last 30 days',
    thisYear: 'This year',
    older: 'Older',
    thisWeek: 'This week',
    thisMonth: 'This month',
  },
  actions: {
    delete: 'Delete',
    edit: 'Edit',
    rename: 'Rename',
    share: 'Share',
    copy: 'Copy',
    download: 'Download',
    upload: 'Upload',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    open: 'Open',
    close: 'Close',
  },
  badges: {
    new: 'New',
  },
  projects: {
    viewAll: 'View all',
    new: 'New',
    documents: 'Documents',
    noDocuments: 'No documents yet',
    uploadDocuments: 'Upload documents',
    reindex: 'Reindex',
    backToProject: 'Back to project',
    createNew: 'Create New Project',
    createDescription: 'Choose a name and color for your new project.',
    namePlaceholder: 'Project name',
    folderColor: 'Folder color:',
  },
  settings: {
    title: 'Settings',
    general: 'General',
    models: 'AI Models',
    personality: 'Personality',
    files: 'Files',
    appearance: 'Aparência',
    language: 'Language',
  },
  landing: {
    heroTitle: 'Let Ankie AI be with you',
    heroSubtitle: 'Deploy your own AI agents in under 5 minutes. No code required. Built on three pillars: Transparency, Personalization, and Simplicity.',
    heroCta: 'Start Free Beta',
    heroCtaSecondary: 'Watch Demo',
    
    trustedBy: 'Join the open beta — Experience the future of AI automation',
    
    // Custom Agents Section
    customAgentsBadge: 'Deploy in Minutes',
    customAgentsTitle: 'Build Your Own AI Agents',
    customAgentsSubtitle: 'Create custom agents tailored to your exact needs. No coding required. Deploy specialized AI teammates in under 5 minutes.',
  customAgentsTagline: 'Deploy faster than frying an egg.',
    customAgentsFormName: 'Agent Name',
    customAgentsFormRole: 'Role & Expertise',
    customAgentsFormCapability: 'Capability Level',
    customAgentsPreview: 'Preview',
    customAgentsDeploy: 'Deploy Agent',
    customAgentsBenefitsTitle: 'Three Core Pillars',
    customAgentsBenefit1Title: 'Transparency',
    customAgentsBenefit1Desc: 'See exactly what your agents are doing in real-time. Full visibility into every action and decision.',
    customAgentsBenefit2Title: 'Personalization',
    customAgentsBenefit2Desc: 'Customize every aspect of your AI team. From personality to capabilities, make them truly yours.',
    customAgentsBenefit3Title: 'Simplicity',
    customAgentsBenefit3Desc: 'No code. No complexity. Deploy production-ready agents in under 5 minutes with our intuitive builder.',
    customAgentsBenefit4Title: 'Sub-Agents & Delegation',
    customAgentsBenefit4Desc: 'Create hierarchies - parent agents can delegate to specialized sub-agents automatically.',
    customAgentsUseCasesTitle: 'Popular Use Cases',
    customAgentsUseCase1: 'Customer support automation with specialized product agents',
    customAgentsUseCase2: 'Content creation pipeline with writer, editor, and publisher agents',
    customAgentsUseCase3: 'Development workflow with code reviewer and documentation agents',
    customAgentsUseCase4: 'Marketing campaigns with research, copywriting, and analytics agents',
    
    featuresTitle: 'Everything You Need to Work Better',
    featuresSubtitle: 'Powerful tools that work together seamlessly',
    
    agentsTitle: 'Meet Your Specialized AI Team',
    agentsSubtitle: 'Each agent is an expert in their domain. Click to learn more about their capabilities.',
    
    benefitsTitle: 'Why Teams Choose Cleo',
    benefitsSubtitle: 'Built for the modern workflow',
    
    useCasesTitle: 'Watch Your AI Team in Action',
    useCasesSubtitle: 'See how Cleo handles real tasks in real-time',
    
    testimonialsTitle: 'What Users Achieve',
    testimonialsSubtitle: 'Results speak louder than promises',
    
    securityTitle: 'Enterprise Security Built-In',
    securitySubtitle: 'Bank-level encryption. Your data stays yours.',
    
    finalCtaTitle: 'Ready to Deploy Your AI Team?',
    finalCtaSubtitle: 'Start your free beta access today. No credit card required.',
    finalCta: 'Start Free Beta',
    tryDemo: 'Try a live demo',
    getStarted: 'Get Started',
    tryNow: 'Try it now',
    
    deployTime: 'Deploy Time',
    under5Minutes: 'Under 5 Minutes ⚡',
    
    philosophyTitle: 'Our Philosophy',
    philosophySubtitle: 'AI should empower, not replace. Cleo augments your capabilities, letting you focus on what matters most while intelligent agents handle the rest.',
  },
}

const es: Translations = {
  sidebar: {
    home: 'Inicio',
    agents: 'Agentes',
    tasks: 'Tareas',
    integrations: 'Integraciones',
    dashboard: 'Dashboard',
    docs: 'Docs',
    personality: 'Personalidad',
    search: 'Buscar',
    newChat: 'Nuevo Chat',
    voice: 'Voz',
    projects: 'Proyectos',
    newProject: 'Nuevo',
    history: 'Historial',
    settings: 'Configuración',
    files: 'Archivos',
    newAgent: 'Crear Agente',
    generatePrompt: 'Auto-generar Prompt',
  },
  time: {
    today: 'Hoy',
    yesterday: 'Ayer',
    lastWeek: 'Últimos 7 días',
    last7Days: 'Últimos 7 días',
    lastMonth: 'Últimos 30 días',
    last30Days: 'Últimos 30 días',
    thisYear: 'Este año',
    older: 'Más antiguos',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mes',
  },
  actions: {
    delete: 'Eliminar',
    edit: 'Editar',
    rename: 'Renombrar',
    share: 'Compartir',
    copy: 'Copiar',
    download: 'Descargar',
    upload: 'Subir',
    cancel: 'Cancelar',
    save: 'Guardar',
    create: 'Crear',
    open: 'Abrir',
    close: 'Cerrar',
  },
  badges: {
    new: 'Nuevo',
  },
  projects: {
    viewAll: 'Ver todos',
    new: 'Nuevo',
    documents: 'Documentos',
    noDocuments: 'Aún no hay documentos',
    uploadDocuments: 'Subir documentos',
    reindex: 'Reindexar',
    backToProject: 'Volver al proyecto',
    createNew: 'Crear Nuevo Proyecto',
    createDescription: 'Elige un nombre y color para tu nuevo proyecto.',
    namePlaceholder: 'Nombre del proyecto',
    folderColor: 'Color de la carpeta:',
  },
  settings: {
    title: 'Configuración',
    general: 'General',
    models: 'Modelos IA',
    personality: 'Personalidad',
    files: 'Archivos',
    appearance: 'Apariencia',
    language: 'Idioma',
  },
  landing: {
    heroTitle: 'Deja que Ankie AI esté contigo',
    heroSubtitle: 'Despliega tus propios agentes de IA en menos de 5 minutos. Sin código. Basado en tres pilares: Transparencia, Personalización y Simplicidad.',
    heroCta: 'Prueba Beta Gratis',
    heroCtaSecondary: 'Ver Demo',
    
    trustedBy: 'Únete a la beta abierta — Experimenta el futuro de la automatización con IA',
    
    // Custom Agents Section
    customAgentsBadge: 'Despliega en Minutos',
    customAgentsTitle: 'Construye tus Propios Agentes de IA',
    customAgentsSubtitle: 'Crea agentes personalizados adaptados a tus necesidades exactas. Sin programación. Despliega compañeros de IA especializados en menos de 5 minutos.',
  customAgentsTagline: 'Despliega tu agente en menos tiempo de lo que se fríe un huevo.',
    customAgentsFormName: 'Nombre del Agente',
    customAgentsFormRole: 'Rol y Experticia',
    customAgentsFormCapability: 'Nivel de Capacidad',
    customAgentsPreview: 'Vista Previa',
    customAgentsDeploy: 'Desplegar Agente',
    customAgentsBenefitsTitle: 'Tres Pilares Fundamentales',
    customAgentsBenefit1Title: 'Transparencia',
    customAgentsBenefit1Desc: 'Ve exactamente qué están haciendo tus agentes en tiempo real. Visibilidad total de cada acción y decisión.',
    customAgentsBenefit2Title: 'Personalización',
    customAgentsBenefit2Desc: 'Personaliza cada aspecto de tu equipo de IA. Desde la personalidad hasta las capacidades, hazlos verdaderamente tuyos.',
    customAgentsBenefit3Title: 'Simplicidad',
    customAgentsBenefit3Desc: 'Sin código. Sin complejidad. Despliega agentes listos para producción en menos de 5 minutos con nuestro constructor intuitivo.',
    customAgentsBenefit4Title: 'Sub-Agentes y Delegación',
    customAgentsBenefit4Desc: 'Crea jerarquías - los agentes padre pueden delegar a sub-agentes especializados automáticamente.',
    customAgentsUseCasesTitle: 'Casos de Uso Populares',
    customAgentsUseCase1: 'Automatización de soporte al cliente con agentes especializados por producto',
    customAgentsUseCase2: 'Pipeline de creación de contenido con agentes escritor, editor y publicador',
    customAgentsUseCase3: 'Flujo de trabajo de desarrollo con agentes revisor de código y documentación',
    customAgentsUseCase4: 'Campañas de marketing con agentes de investigación, copywriting y analítica',
    
    featuresTitle: 'Todo lo que Necesitas para Trabajar Mejor',
    featuresSubtitle: 'Herramientas potentes que funcionan juntas sin esfuerzo',
    
    agentsTitle: 'Conoce tu Equipo de IA Especializado',
    agentsSubtitle: 'Cada agente es un experto en su dominio. Haz clic para conocer más sobre sus capacidades.',
    
  benefitsTitle: 'Por qué los Equipos Eligen Ankie AI',
    benefitsSubtitle: 'Construido para el flujo de trabajo moderno',
    
    useCasesTitle: 'Observa a tu Equipo de IA Trabajar',
  useCasesSubtitle: 'Mira cómo Ankie AI maneja tareas reales en tiempo real',
    
  testimonialsTitle: 'Lo que logran los usuarios',
    testimonialsSubtitle: 'Los resultados hablan más que las promesas',
    
    securityTitle: 'Seguridad Empresarial Integrada',
    securitySubtitle: 'Cifrado de nivel bancario. Tus datos son tuyos.',
    
    finalCtaTitle: '¿Listo para Desplegar tu Equipo de IA?',
    finalCtaSubtitle: 'Comienza tu acceso beta gratuito hoy. Sin tarjeta de crédito.',
    finalCta: 'Comenzar Beta Gratis',
    tryDemo: 'Prueba en vivo',
    getStarted: 'Comenzar',
    tryNow: 'Pruébalo ahora',
    
    deployTime: 'Tiempo de Despliegue',
    under5Minutes: 'Menos de 5 Minutos ⚡',
    
    philosophyTitle: 'Nuestra Filosofía',
  philosophySubtitle: 'La IA debe potenciar, no reemplazar. Ankie AI aumenta tus capacidades, permitiéndote enfocarte en lo más importante mientras los agentes inteligentes se encargan del resto.',
  },
}

const pt: Translations = {
  sidebar: {
    home: 'Início',
    agents: 'Agentes',
    tasks: 'Tarefas',
    integrations: 'Integrações',
    dashboard: 'Dashboard',
    docs: 'Docs',
    personality: 'Personalidade',
    search: 'Buscar',
    newChat: 'Novo Chat',
    voice: 'Voz',
    projects: 'Projetos',
    newProject: 'Novo',
    history: 'Histórico',
    settings: 'Configurações',
    files: 'Arquivos',
    newAgent: 'Novo Agente',
    generatePrompt: 'Gerar Prompt',
  },
  time: {
    today: 'Hoje',
    yesterday: 'Ontem',
    lastWeek: 'Últimos 7 dias',
    last7Days: 'Últimos 7 dias',
    lastMonth: 'Últimos 30 dias',
    last30Days: 'Últimos 30 dias',
    thisYear: 'Este ano',
    older: 'Mais antigos',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mês',
  },
  actions: {
    delete: 'Excluir',
    edit: 'Editar',
    rename: 'Renomear',
    share: 'Compartilhar',
    copy: 'Copiar',
    download: 'Baixar',
    upload: 'Enviar',
    cancel: 'Cancelar',
    save: 'Salvar',
    create: 'Criar',
    open: 'Abrir',
    close: 'Fechar',
  },
  badges: {
    new: 'Novo',
  },
  projects: {
    viewAll: 'Ver todos',
    new: 'Novo',
    documents: 'Documentos',
    noDocuments: 'Ainda não há documentos',
    uploadDocuments: 'Enviar documentos',
    reindex: 'Reindexar',
    backToProject: 'Voltar ao projeto',
    createNew: 'Criar Novo Projeto',
    createDescription: 'Escolha um nome e cor para seu novo projeto.',
    namePlaceholder: 'Nome do projeto',
    folderColor: 'Cor da pasta:',
  },
  settings: {
    title: 'Configurações',
    general: 'Geral',
    models: 'Modelos IA',
    personality: 'Personalidade',
    files: 'Arquivos',
    appearance: 'Aparência',
    language: 'Idioma',
  },
  landing: {
    heroTitle: 'Let Kylio be with you',
    heroSubtitle: 'Cleo torna sua vida 10x mais fácil. Agentes de IA especializados automatizam tarefas, gerenciam fluxos de trabalho e economizam mais de 20 horas semanais.',
    heroCta: 'Teste Grátis',
    heroCtaSecondary: 'Ver Demo',
    
    trustedBy: 'Junte-se a mais de 1000 profissionais economizando horas todos os dias',
    
    featuresTitle: 'Tudo que Você Precisa para Trabalhar Melhor',
    featuresSubtitle: 'Ferramentas potentes que funcionam juntas sem complicações',
    
    agentsTitle: 'Conheça sua Equipe de IA Especializada',
    agentsSubtitle: 'Cada agente domina uma área. Juntos, transformam sua produtividade.',
    
    benefitsTitle: 'Ganhos Reais de Produtividade',
    benefitsSubtitle: 'Resultados mensuráveis desde o primeiro dia',
    
    useCasesTitle: 'Veja Cleo em Ação',
    useCasesSubtitle: 'Fluxos de trabalho reais, economia de tempo real',
    
    testimonialsTitle: 'O que os Usuários Alcançam',
    testimonialsSubtitle: 'Resultados falam mais alto que promessas',
    
    securityTitle: 'Segurança Empresarial Integrada',
    securitySubtitle: 'Criptografia de nível bancário. Seus dados são seus.',
    
    finalCtaTitle: 'Pronto para 10x sua Produtividade?',
    finalCtaSubtitle: 'Comece grátis hoje. Sem cartão de crédito. Cancele quando quiser.',
    finalCta: 'Experimentar Cleo Grátis',
    tryDemo: 'Demonstração ao vivo',
    getStarted: 'Começar',
    tryNow: 'Experimente agora',
    
    deployTime: 'Tempo de Implantação',
    under5Minutes: 'Menos de 5 Minutos ⚡',

    philosophyTitle: 'Nossa Filosofia',
    philosophySubtitle: 'A IA deve potencializar, não substituir. Cleo aumenta suas capacidades, permitindo que você se concentre no que mais importa enquanto agentes inteligentes cuidam do resto.',
    
    customAgentsBadge: 'Recurso Mais Poderoso',
    customAgentsTitle: 'Crie Seus Próprios Agentes de IA',
    customAgentsSubtitle: 'Crie agentes personalizados adaptados às suas necessidades exatas. Sem codificação necessária. Implante colegas de IA especializados em minutos.',
  customAgentsTagline: 'Implante em menos de 5 minutos.',
    customAgentsFormName: 'Nome do Agente',
    customAgentsFormRole: 'Função e Especialização',
    customAgentsFormCapability: 'Nível de Capacidade',
    customAgentsPreview: 'Visualizar',
    customAgentsDeploy: 'Implantar Agente',
    customAgentsBenefitsTitle: 'Por que Criar Agentes Personalizados?',
    customAgentsBenefit1Title: 'Agentes Personalizados Ilimitados',
    customAgentsBenefit1Desc: 'Crie quantos agentes especializados precisar para diferentes tarefas e fluxos de trabalho.',
    customAgentsBenefit2Title: 'Especialização Específica por Tarefa',
    customAgentsBenefit2Desc: 'Cada agente se concentra em um domínio, garantindo desempenho e precisão de nível especializado.',
    customAgentsBenefit3Title: 'Construtor Sem Código',
    customAgentsBenefit3Desc: 'Interface intuitiva - sem programação necessária. Crie agentes em minutos, não horas.',
    customAgentsBenefit4Title: 'Sub-Agentes e Delegação',
    customAgentsBenefit4Desc: 'Crie hierarquias - agentes pais podem delegar automaticamente para sub-agentes especializados.',
    customAgentsUseCasesTitle: 'Casos de Uso Populares',
    customAgentsUseCase1: 'Automação de suporte ao cliente com agentes de produtos especializados',
    customAgentsUseCase2: 'Pipeline de criação de conteúdo com agentes escritor, editor e publicador',
    customAgentsUseCase3: 'Fluxo de trabalho de desenvolvimento com agentes revisor de código e documentação',
    customAgentsUseCase4: 'Campanhas de marketing com agentes de pesquisa, copywriting e análise',
  },
}

const fr: Translations = {
  sidebar: {
    home: 'Accueil',
    agents: 'Agents',
    tasks: 'Tâches',
    integrations: 'Intégrations',
    dashboard: 'Tableau de bord',
    docs: 'Docs',
    personality: 'Personnalité',
    search: 'Rechercher',
    newChat: 'Nouveau Chat',
    voice: 'Voix',
    projects: 'Projets',
    newProject: 'Nouveau',
    history: 'Historique',
    settings: 'Paramètres',
    files: 'Fichiers',
    newAgent: 'Nouvel Agent',
    generatePrompt: 'Générer Prompt',
  },
  time: {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    lastWeek: '7 derniers jours',
    last7Days: '7 derniers jours',
    lastMonth: '30 derniers jours',
    last30Days: '30 derniers jours',
    thisYear: 'Cette année',
    older: 'Plus anciens',
    thisWeek: 'Cette semaine',
    thisMonth: 'Ce mois-ci',
  },
  actions: {
    delete: 'Supprimer',
    edit: 'Modifier',
    rename: 'Renommer',
    share: 'Partager',
    copy: 'Copier',
    download: 'Télécharger',
    upload: 'Envoyer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    create: 'Créer',
    open: 'Ouvrir',
    close: 'Fermer',
  },
  badges: {
    new: 'Nouveau',
  },
  projects: {
    viewAll: 'Voir tout',
    new: 'Nouveau',
    documents: 'Documents',
    noDocuments: 'Pas encore de documents',
    uploadDocuments: 'Envoyer des documents',
    reindex: 'Réindexer',
    backToProject: 'Retour au projet',
    createNew: 'Créer un Nouveau Projet',
    createDescription: 'Choisissez un nom et une couleur pour votre nouveau projet.',
    namePlaceholder: 'Nom du projet',
    folderColor: 'Couleur du dossier:',
  },
  settings: {
    title: 'Paramètres',
    general: 'Général',
    models: 'Modèles IA',
    personality: 'Personnalité',
    files: 'Fichiers',
    appearance: 'Apparence',
    language: 'Langue',
  },
  landing: {
    heroTitle: 'Let Kylio be with you',
    heroSubtitle: 'Cleo rend votre vie 10x plus facile. Des agents IA spécialisés automatisent les tâches, gèrent les workflows et économisent plus de 20 heures par semaine.',
    heroCta: 'Essai Gratuit',
    heroCtaSecondary: 'Voir la Démo',
    
    trustedBy: 'Rejoignez plus de 1000 professionnels qui économisent des heures chaque jour',
    
    featuresTitle: 'Tout ce dont Vous Avez Besoin pour Mieux Travailler',
    featuresSubtitle: 'Des outils puissants qui fonctionnent ensemble sans complications',
    
    agentsTitle: 'Rencontrez votre Équipe IA Spécialisée',
    agentsSubtitle: 'Chaque agent maîtrise un domaine. Ensemble, ils transforment votre productivité.',
    
    benefitsTitle: 'Gains de Productivité Réels',
    benefitsSubtitle: 'Résultats mesurables dès le premier jour',
    
    useCasesTitle: 'Voyez Cleo en Action',
    useCasesSubtitle: 'Workflows réels, économies de temps réelles',
    
    testimonialsTitle: 'Ce que les Utilisateurs Réalisent',
    testimonialsSubtitle: 'Les résultats parlent plus fort que les promesses',
    
    securityTitle: 'Sécurité d\'Entreprise Intégrée',
    securitySubtitle: 'Chiffrement de niveau bancaire. Vos données vous appartiennent.',
    
    finalCtaTitle: 'Prêt à 10x votre Productivité?',
    finalCtaSubtitle: 'Commencez gratuitement aujourd\'hui. Sans carte bancaire. Annulez quand vous voulez.',
    finalCta: 'Essayer Cleo Gratuitement',
    tryDemo: 'Essayer en direct',
    getStarted: 'Commencer',
    tryNow: 'Essayez maintenant',
    
    deployTime: 'Temps de Déploiement',
    under5Minutes: 'Moins de 5 Minutes ⚡',

    philosophyTitle: 'Notre Philosophie',
    philosophySubtitle: 'L\'IA doit renforcer, pas remplacer. Cleo augmente vos capacités, vous permettant de vous concentrer sur ce qui compte le plus pendant que les agents intelligents s\'occupent du reste.',
    
    customAgentsBadge: 'Fonctionnalité la Plus Puissante',
    customAgentsTitle: 'Créez Vos Propres Agents IA',
    customAgentsSubtitle: 'Créez des agents personnalisés adaptés à vos besoins exacts. Aucun codage requis. Déployez des coéquipiers IA spécialisés en quelques minutes.',
  customAgentsTagline: 'Déployez en moins de 5 minutes.',
    customAgentsFormName: 'Nom de l\'Agent',
    customAgentsFormRole: 'Rôle et Expertise',
    customAgentsFormCapability: 'Niveau de Capacité',
    customAgentsPreview: 'Aperçu',
    customAgentsDeploy: 'Déployer l\'Agent',
    customAgentsBenefitsTitle: 'Pourquoi Créer des Agents Personnalisés?',
    customAgentsBenefit1Title: 'Agents Personnalisés Illimités',
    customAgentsBenefit1Desc: 'Créez autant d\'agents spécialisés que nécessaire pour différentes tâches et flux de travail.',
    customAgentsBenefit2Title: 'Expertise Spécifique par Tâche',
    customAgentsBenefit2Desc: 'Chaque agent se concentre sur un domaine, garantissant des performances et une précision de niveau expert.',
    customAgentsBenefit3Title: 'Constructeur Sans Code',
    customAgentsBenefit3Desc: 'Interface intuitive - aucune programmation requise. Créez des agents en minutes, pas en heures.',
    customAgentsBenefit4Title: 'Sous-Agents et Délégation',
    customAgentsBenefit4Desc: 'Créez des hiérarchies - les agents parents peuvent déléguer automatiquement à des sous-agents spécialisés.',
    customAgentsUseCasesTitle: 'Cas d\'Utilisation Populaires',
    customAgentsUseCase1: 'Automatisation du support client avec des agents de produits spécialisés',
    customAgentsUseCase2: 'Pipeline de création de contenu avec des agents rédacteur, éditeur et éditeur',
    customAgentsUseCase3: 'Flux de travail de développement avec des agents de révision de code et de documentation',
    customAgentsUseCase4: 'Campagnes marketing avec des agents de recherche, de rédaction et d\'analyse',
  },
}

const it: Translations = {
  sidebar: {
    home: 'Home',
    agents: 'Agenti',
    tasks: 'Attività',
    integrations: 'Integrazioni',
    dashboard: 'Dashboard',
    docs: 'Docs',
    personality: 'Personalità',
    search: 'Cerca',
    newChat: 'Nuova Chat',
    voice: 'Voce',
    projects: 'Progetti',
    newProject: 'Nuovo',
    history: 'Cronologia',
    settings: 'Impostazioni',
    files: 'File',
    newAgent: 'Nuovo Agente',
    generatePrompt: 'Genera Prompt',
  },
  time: {
    today: 'Oggi',
    yesterday: 'Ieri',
    lastWeek: 'Ultimi 7 giorni',
    last7Days: 'Ultimi 7 giorni',
    lastMonth: 'Ultimi 30 giorni',
    last30Days: 'Ultimi 30 giorni',
    thisYear: 'Quest\'anno',
    older: 'Più vecchi',
    thisWeek: 'Questa settimana',
    thisMonth: 'Questo mese',
  },
  actions: {
    delete: 'Elimina',
    edit: 'Modifica',
    rename: 'Rinomina',
    share: 'Condividi',
    copy: 'Copia',
    download: 'Scarica',
    upload: 'Carica',
    cancel: 'Annulla',
    save: 'Salva',
    create: 'Crea',
    open: 'Apri',
    close: 'Chiudi',
  },
  badges: {
    new: 'Nuovo',
  },
  projects: {
    viewAll: 'Vedi tutti',
    new: 'Nuovo',
    documents: 'Documenti',
    noDocuments: 'Nessun documento ancora',
    uploadDocuments: 'Carica documenti',
    reindex: 'Reindicizza',
    backToProject: 'Torna al progetto',
    createNew: 'Crea Nuovo Progetto',
    createDescription: 'Scegli un nome e un colore per il tuo nuovo progetto.',
    namePlaceholder: 'Nome del progetto',
    folderColor: 'Colore della cartella:',
  },
  settings: {
    title: 'Impostazioni',
    general: 'Generale',
    models: 'Modelli IA',
    personality: 'Personalità',
    files: 'File',
    appearance: 'Aspetto',
    language: 'Lingua',
  },
  landing: {
    heroTitle: 'AI Agents That Multiply Your Productivity',
    heroSubtitle: 'Meet Cleo, the intelligent multi-agent platform that transforms how you work.',
    heroCta: 'Try Cleo for Free',
    heroCtaSecondary: 'See How It Works',
    trustedBy: 'Trusted by teams worldwide',
    featuresTitle: 'Everything You Need',
    featuresSubtitle: 'Powerful features that adapt to your workflow',
    agentsTitle: 'Meet Your AI Team',
    agentsSubtitle: 'Specialized agents ready for any task',
    benefitsTitle: 'Why Choose Cleo',
    benefitsSubtitle: 'Real results that transform productivity',
    useCasesTitle: 'Built for Real Work',
    useCasesSubtitle: 'See how teams use Cleo every day',
    testimonialsTitle: 'Loved by Professionals',
    testimonialsSubtitle: 'Join thousands who work smarter',
    securityTitle: 'Enterprise-Grade Security',
    securitySubtitle: 'Your data is safe with us',
    finalCtaTitle: 'Ready to Multiply Your Productivity?',
    finalCtaSubtitle: 'Start free, no credit card required.',
    finalCta: 'Start Free Now',
    tryDemo: 'Prova live',
    getStarted: 'Inizia',
    tryNow: 'Provalo ora',
    
    deployTime: 'Tempo di Distribuzione',
    under5Minutes: 'Meno di 5 Minuti ⚡',
    
    philosophyTitle: 'Our Philosophy',
    philosophySubtitle: 'AI should empower, not replace.',
    
    customAgentsBadge: 'Funzionalità Più Potente',
    customAgentsTitle: 'Crea i Tuoi Agenti IA',
    customAgentsSubtitle: 'Crea agenti personalizzati su misura per le tue esigenze specifiche. Nessuna codifica richiesta. Distribuisci colleghi IA specializzati in pochi minuti.',
  customAgentsTagline: 'Distribuisci in meno di 5 minuti.',
    customAgentsFormName: 'Nome dell\'Agente',
    customAgentsFormRole: 'Ruolo ed Esperienza',
    customAgentsFormCapability: 'Livello di Capacità',
    customAgentsPreview: 'Anteprima',
    customAgentsDeploy: 'Distribuisci Agente',
    customAgentsBenefitsTitle: 'Perché Creare Agenti Personalizzati?',
    customAgentsBenefit1Title: 'Agenti Personalizzati Illimitati',
    customAgentsBenefit1Desc: 'Crea tutti gli agenti specializzati necessari per diverse attività e flussi di lavoro.',
    customAgentsBenefit2Title: 'Competenza Specifica per Attività',
    customAgentsBenefit2Desc: 'Ogni agente si concentra su un dominio, garantendo prestazioni e precisione di livello esperto.',
    customAgentsBenefit3Title: 'Costruttore Senza Codice',
    customAgentsBenefit3Desc: 'Interfaccia intuitiva - nessuna programmazione richiesta. Crea agenti in minuti, non ore.',
    customAgentsBenefit4Title: 'Sotto-Agenti e Delegazione',
    customAgentsBenefit4Desc: 'Crea gerarchie - gli agenti genitori possono delegare automaticamente a sotto-agenti specializzati.',
    customAgentsUseCasesTitle: 'Casi d\'Uso Popolari',
    customAgentsUseCase1: 'Automazione del supporto clienti con agenti di prodotto specializzati',
    customAgentsUseCase2: 'Pipeline di creazione contenuti con agenti scrittore, editore e pubblicatore',
    customAgentsUseCase3: 'Flusso di lavoro di sviluppo con agenti di revisione del codice e documentazione',
    customAgentsUseCase4: 'Campagne di marketing con agenti di ricerca, copywriting e analisi',
  },
}

const de: Translations = {
  sidebar: {
    home: 'Start',
    agents: 'Agenten',
    tasks: 'Aufgaben',
    integrations: 'Integrationen',
    dashboard: 'Dashboard',
    docs: 'Docs',
    personality: 'Persönlichkeit',
    search: 'Suchen',
    newChat: 'Neuer Chat',
    voice: 'Stimme',
    projects: 'Projekte',
    newProject: 'Neu',
    history: 'Verlauf',
    settings: 'Einstellungen',
    files: 'Dateien',
    newAgent: 'Neuer Agent',
    generatePrompt: 'Prompt Erstellen',
  },
  time: {
    today: 'Heute',
    yesterday: 'Gestern',
    lastWeek: 'Letzte 7 Tage',
    last7Days: 'Letzte 7 Tage',
    lastMonth: 'Letzte 30 Tage',
    last30Days: 'Letzte 30 Tage',
    thisYear: 'Dieses Jahr',
    older: 'Älter',
    thisWeek: 'Diese Woche',
    thisMonth: 'Dieser Monat',
  },
  actions: {
    delete: 'Löschen',
    edit: 'Bearbeiten',
    rename: 'Umbenennen',
    share: 'Teilen',
    copy: 'Kopieren',
    download: 'Herunterladen',
    upload: 'Hochladen',
    cancel: 'Abbrechen',
    save: 'Speichern',
    create: 'Erstellen',
    open: 'Öffnen',
    close: 'Schließen',
  },
  badges: {
    new: 'Neu',
  },
  projects: {
    viewAll: 'Alle anzeigen',
    new: 'Neu',
    documents: 'Dokumente',
    noDocuments: 'Noch keine Dokumente',
    uploadDocuments: 'Dokumente hochladen',
    reindex: 'Neu indizieren',
    backToProject: 'Zurück zum Projekt',
    createNew: 'Neues Projekt Erstellen',
    createDescription: 'Wählen Sie einen Namen und eine Farbe für Ihr neues Projekt.',
    namePlaceholder: 'Projektname',
    folderColor: 'Ordnerfarbe:',
  },
  settings: {
    title: 'Einstellungen',
    general: 'Allgemein',
    models: 'KI-Modelle',
    personality: 'Persönlichkeit',
    files: 'Dateien',
    appearance: 'Erscheinungsbild',
    language: 'Sprache',
  },
  landing: {
    heroTitle: 'AI Agents That Multiply Your Productivity',
    heroSubtitle: 'Meet Cleo, the intelligent multi-agent platform that transforms how you work.',
    heroCta: 'Try Cleo for Free',
    heroCtaSecondary: 'See How It Works',
    trustedBy: 'Trusted by teams worldwide',
    featuresTitle: 'Everything You Need',
    featuresSubtitle: 'Powerful features that adapt to your workflow',
    agentsTitle: 'Meet Your AI Team',
    agentsSubtitle: 'Specialized agents ready for any task',
    benefitsTitle: 'Why Choose Cleo',
    benefitsSubtitle: 'Real results that transform productivity',
    useCasesTitle: 'Built for Real Work',
    useCasesSubtitle: 'See how teams use Cleo every day',
    testimonialsTitle: 'Loved by Professionals',
    testimonialsSubtitle: 'Join thousands who work smarter',
    securityTitle: 'Enterprise-Grade Security',
    securitySubtitle: 'Your data is safe with us',
    finalCtaTitle: 'Ready to Multiply Your Productivity?',
    finalCtaSubtitle: 'Start free, no credit card required.',
    finalCta: 'Start Free Now',
    tryDemo: 'Live-Demo',
    getStarted: 'Loslegen',
    tryNow: 'Jetzt testen',
    
    deployTime: 'Bereitstellungszeit',
    under5Minutes: 'Unter 5 Minuten ⚡',
    
    philosophyTitle: 'Our Philosophy',
    philosophySubtitle: 'AI should empower, not replace.',
    
    customAgentsBadge: 'Leistungsstärkste Funktion',
    customAgentsTitle: 'Erstellen Sie Ihre Eigenen KI-Agenten',
    customAgentsSubtitle: 'Erstellen Sie maßgeschneiderte Agenten für Ihre spezifischen Bedürfnisse. Keine Programmierung erforderlich. Stellen Sie spezialisierte KI-Teammitglieder in Minuten bereit.',
  customAgentsTagline: 'Bereitstellung in unter 5 Minuten.',
    customAgentsFormName: 'Agentenname',
    customAgentsFormRole: 'Rolle & Expertise',
    customAgentsFormCapability: 'Fähigkeitsstufe',
    customAgentsPreview: 'Vorschau',
    customAgentsDeploy: 'Agent Bereitstellen',
    customAgentsBenefitsTitle: 'Warum Benutzerdefinierte Agenten Erstellen?',
    customAgentsBenefit1Title: 'Unbegrenzte Benutzerdefinierte Agenten',
    customAgentsBenefit1Desc: 'Erstellen Sie so viele spezialisierte Agenten wie Sie für verschiedene Aufgaben und Workflows benötigen.',
    customAgentsBenefit2Title: 'Aufgabenspezifische Expertise',
    customAgentsBenefit2Desc: 'Jeder Agent konzentriert sich auf eine Domäne und gewährleistet Leistung und Genauigkeit auf Expertenebene.',
    customAgentsBenefit3Title: 'No-Code Builder',
    customAgentsBenefit3Desc: 'Intuitive Oberfläche - keine Programmierung erforderlich. Erstellen Sie Agenten in Minuten, nicht Stunden.',
    customAgentsBenefit4Title: 'Unter-Agenten & Delegation',
    customAgentsBenefit4Desc: 'Erstellen Sie Hierarchien - übergeordnete Agenten können automatisch an spezialisierte Unter-Agenten delegieren.',
    customAgentsUseCasesTitle: 'Beliebte Anwendungsfälle',
    customAgentsUseCase1: 'Kundensupport-Automatisierung mit spezialisierten Produktagenten',
    customAgentsUseCase2: 'Content-Erstellungspipeline mit Autoren-, Redaktions- und Veröffentlichungsagenten',
    customAgentsUseCase3: 'Entwicklungsworkflow mit Code-Review- und Dokumentationsagenten',
    customAgentsUseCase4: 'Marketingkampagnen mit Recherche-, Copywriting- und Analyseagenten',
  },
}

const ja: Translations = {
  sidebar: {
    home: 'ホーム',
    agents: 'エージェント',
    tasks: 'タスク',
    integrations: '統合',
    dashboard: 'ダッシュボード',
    docs: 'ドキュメント',
    personality: '性格',
    search: '検索',
    newChat: '新しいチャット',
    voice: '音声',
    projects: 'プロジェクト',
    newProject: '新規',
    history: '履歴',
    settings: '設定',
    files: 'ファイル',
    newAgent: '新しいエージェント',
    generatePrompt: 'プロンプト生成',
  },
  time: {
    today: '今日',
    yesterday: '昨日',
    lastWeek: '過去7日間',
    last7Days: '過去7日間',
    lastMonth: '過去30日間',
    last30Days: '過去30日間',
    thisYear: '今年',
    older: 'それ以前',
    thisWeek: '今週',
    thisMonth: '今月',
  },
  actions: {
    delete: '削除',
    edit: '編集',
    rename: '名前変更',
    share: '共有',
    copy: 'コピー',
    download: 'ダウンロード',
    upload: 'アップロード',
    cancel: 'キャンセル',
    save: '保存',
    create: '作成',
    open: '開く',
    close: '閉じる',
  },
  badges: {
    new: '新規',
  },
  projects: {
    viewAll: 'すべて表示',
    new: '新規',
    documents: 'ドキュメント',
    noDocuments: 'まだドキュメントがありません',
    uploadDocuments: 'ドキュメントをアップロード',
    reindex: '再インデックス',
    backToProject: 'プロジェクトに戻る',
    createNew: '新しいプロジェクトを作成',
    createDescription: '新しいプロジェクトの名前と色を選択してください。',
    namePlaceholder: 'プロジェクト名',
    folderColor: 'フォルダの色:',
  },
  settings: {
    title: '設定',
    general: '一般',
    models: 'AIモデル',
    personality: '性格',
    files: 'ファイル',
    appearance: '外観',
    language: '言語',
  },
  landing: {heroTitle:'AI Agents That Multiply Your Productivity',heroSubtitle:'Meet Cleo, the intelligent multi-agent platform that transforms how you work.',heroCta:'Try Cleo for Free',heroCtaSecondary:'See How It Works',trustedBy:'Trusted by teams worldwide',featuresTitle:'Everything You Need',featuresSubtitle:'Powerful features that adapt to your workflow',agentsTitle:'Meet Your AI Team',agentsSubtitle:'Specialized agents ready for any task',benefitsTitle:'Why Choose Cleo',benefitsSubtitle:'Real results that transform productivity',useCasesTitle:'Built for Real Work',useCasesSubtitle:'See how teams use Cleo every day',testimonialsTitle:'Loved by Professionals',testimonialsSubtitle:'Join thousands who work smarter',securityTitle:'Enterprise-Grade Security',securitySubtitle:'Your data is safe with us',finalCtaTitle:'Ready to Multiply Your Productivity?',finalCtaSubtitle:'Start free, no credit card required.',finalCta:'Start Free Now',tryDemo:'ライブデモ',getStarted:'始める',tryNow:'今すぐ試す',deployTime:'展開時間',under5Minutes:'5分以内 ⚡',philosophyTitle:'Our Philosophy',philosophySubtitle:'AI should empower, not replace.',customAgentsBadge:'最も強力な機能',customAgentsTitle:'独自のAIエージェントを構築',customAgentsSubtitle:'ニーズに合わせたカスタムエージェントを作成。コーディング不要。数分で専門的なAIチームメイトを展開。',customAgentsTagline:'5分以内でデプロイ。',customAgentsFormName:'エージェント名',customAgentsFormRole:'役割と専門知識',customAgentsFormCapability:'能力レベル',customAgentsPreview:'プレビュー',customAgentsDeploy:'エージェントを展開',customAgentsBenefitsTitle:'カスタムエージェントを構築する理由',customAgentsBenefit1Title:'無制限のカスタムエージェント',customAgentsBenefit1Desc:'さまざまなタスクとワークフローに必要な数の専門エージェントを作成。',customAgentsBenefit2Title:'タスク固有の専門知識',customAgentsBenefit2Desc:'各エージェントは1つのドメインに焦点を当て、専門家レベルのパフォーマンスと精度を保証。',customAgentsBenefit3Title:'ノーコードビルダー',customAgentsBenefit3Desc:'直感的なインターフェース - プログラミング不要。時間ではなく分でエージェントを構築。',customAgentsBenefit4Title:'サブエージェントと委任',customAgentsBenefit4Desc:'階層を作成 - 親エージェントは専門のサブエージェントに自動的に委任可能。',customAgentsUseCasesTitle:'人気のユースケース',customAgentsUseCase1:'専門製品エージェントによるカスタマーサポートの自動化',customAgentsUseCase2:'ライター、エディター、パブリッシャーエージェントによるコンテンツ作成パイプライン',customAgentsUseCase3:'コードレビューとドキュメントエージェントによる開発ワークフロー',customAgentsUseCase4:'リサーチ、コピーライティング、分析エージェントによるマーケティングキャンペーン'},
}

const ko: Translations = {
  sidebar: {
    home: '홈',
    agents: '에이전트',
    tasks: '작업',
    integrations: '통합',
    dashboard: '대시보드',
    docs: '문서',
    personality: '성격',
    search: '검색',
    newChat: '새 채팅',
    voice: '음성',
    projects: '프로젝트',
    newProject: '새로 만들기',
    history: '기록',
    settings: '설정',
    files: '파일',
    newAgent: '새 에이전트',
    generatePrompt: '프롬프트 생성',
  },
  time: {
    today: '오늘',
    yesterday: '어제',
    lastWeek: '지난 7일',
    last7Days: '지난 7일',
    lastMonth: '지난 30일',
    last30Days: '지난 30일',
    thisYear: '올해',
    older: '이전',
    thisWeek: '이번 주',
    thisMonth: '이번 달',
  },
  actions: {
    delete: '삭제',
    edit: '편집',
    rename: '이름 바꾸기',
    share: '공유',
    copy: '복사',
    download: '다운로드',
    upload: '업로드',
    cancel: '취소',
    save: '저장',
    create: '만들기',
    open: '열기',
    close: '닫기',
  },
  badges: {
    new: '새로운',
  },
  projects: {
    viewAll: '모두 보기',
    new: '새로 만들기',
    documents: '문서',
    noDocuments: '아직 문서가 없습니다',
    uploadDocuments: '문서 업로드',
    reindex: '재색인',
    backToProject: '프로젝트로 돌아가기',
    createNew: '새 프로젝트 만들기',
    createDescription: '새 프로젝트의 이름과 색상을 선택하세요.',
    namePlaceholder: '프로젝트 이름',
    folderColor: '폴더 색상:',
  },
  settings: {
    title: '설정',
    general: '일반',
    models: 'AI 모델',
    personality: '성격',
    files: '파일',
    appearance: '외관',
    language: '언어',
  },
  landing: {heroTitle:'AI Agents That Multiply Your Productivity',heroSubtitle:'Meet Cleo, the intelligent multi-agent platform that transforms how you work.',heroCta:'Try Cleo for Free',heroCtaSecondary:'See How It Works',trustedBy:'Trusted by teams worldwide',featuresTitle:'Everything You Need',featuresSubtitle:'Powerful features that adapt to your workflow',agentsTitle:'Meet Your AI Team',agentsSubtitle:'Specialized agents ready for any task',benefitsTitle:'Why Choose Cleo',benefitsSubtitle:'Real results that transform productivity',useCasesTitle:'Built for Real Work',useCasesSubtitle:'See how teams use Cleo every day',testimonialsTitle:'Loved by Professionals',testimonialsSubtitle:'Join thousands who work smarter',securityTitle:'Enterprise-Grade Security',securitySubtitle:'Your data is safe with us',finalCtaTitle:'Ready to Multiply Your Productivity?',finalCtaSubtitle:'Start free, no credit card required.',finalCta:'Start Free Now',tryDemo:'라이브 데모',getStarted:'시작하기',tryNow:'지금 시도',deployTime:'배포 시간',under5Minutes:'5분 이내 ⚡',philosophyTitle:'Our Philosophy',philosophySubtitle:'AI should empower, not replace.',customAgentsBadge:'가장 강력한 기능',customAgentsTitle:'자신만의 AI 에이전트 구축',customAgentsSubtitle:'정확한 요구에 맞춘 맞춤 에이전트를 만드세요. 코딩 불필요. 몇 분 안에 전문화된 AI 팀원을 배포하세요.',customAgentsTagline:'5분 안에 배포하세요.',customAgentsFormName:'에이전트 이름',customAgentsFormRole:'역할 및 전문성',customAgentsFormCapability:'능력 수준',customAgentsPreview:'미리보기',customAgentsDeploy:'에이전트 배포',customAgentsBenefitsTitle:'맞춤 에이전트를 구축하는 이유',customAgentsBenefit1Title:'무제한 맞춤 에이전트',customAgentsBenefit1Desc:'다양한 작업과 워크플로에 필요한 만큼 전문화된 에이전트를 만드세요.',customAgentsBenefit2Title:'작업별 전문 지식',customAgentsBenefit2Desc:'각 에이전트는 하나의 도메인에 집중하여 전문가 수준의 성능과 정확성을 보장합니다.',customAgentsBenefit3Title:'노코드 빌더',customAgentsBenefit3Desc:'직관적인 인터페이스 - 프로그래밍 불필요. 시간이 아닌 분 단위로 에이전트를 구축하세요.',customAgentsBenefit4Title:'하위 에이전트 및 위임',customAgentsBenefit4Desc:'계층 구조 생성 - 상위 에이전트가 전문화된 하위 에이전트에 자동으로 위임할 수 있습니다.',customAgentsUseCasesTitle:'인기 사용 사례',customAgentsUseCase1:'전문 제품 에이전트를 통한 고객 지원 자동화',customAgentsUseCase2:'작가, 편집자 및 게시자 에이전트를 통한 콘텐츠 제작 파이프라인',customAgentsUseCase3:'코드 리뷰 및 문서화 에이전트를 통한 개발 워크플로',customAgentsUseCase4:'리서치, 카피라이팅 및 분석 에이전트를 통한 마케팅 캠페인'},
}

const zh: Translations = {
  sidebar: {
    home: '首页',
    agents: '代理',
    tasks: '任务',
    integrations: '集成',
    dashboard: '仪表板',
    docs: '文档',
    personality: '个性',
    search: '搜索',
    newChat: '新对话',
    voice: '语音',
    projects: '项目',
    newProject: '新建',
    history: '历史',
    settings: '设置',
    files: '文件',
    newAgent: '新建代理',
    generatePrompt: '生成提示',
  },
  time: {
    today: '今天',
    yesterday: '昨天',
    lastWeek: '最近7天',
    last7Days: '最近7天',
    lastMonth: '最近30天',
    last30Days: '最近30天',
    thisYear: '今年',
    older: '更早',
    thisWeek: '本周',
    thisMonth: '本月',
  },
  actions: {
    delete: '删除',
    edit: '编辑',
    rename: '重命名',
    share: '分享',
    copy: '复制',
    download: '下载',
    upload: '上传',
    cancel: '取消',
    save: '保存',
    create: '创建',
    open: '打开',
    close: '关闭',
  },
  badges: {
    new: '新',
  },
  projects: {
    viewAll: '查看全部',
    new: '新建',
    documents: '文档',
    noDocuments: '还没有文档',
    uploadDocuments: '上传文档',
    reindex: '重新索引',
    backToProject: '返回项目',
    createNew: '创建新项目',
    createDescription: '为您的新项目选择名称和颜色。',
    namePlaceholder: '项目名称',
    folderColor: '文件夹颜色：',
  },
  settings: {
    title: '设置',
    general: '通用',
    models: 'AI模型',
    personality: '个性',
    files: '文件',
    appearance: '外观',
    language: '语言',
  },
  landing: {heroTitle:'AI Agents That Multiply Your Productivity',heroSubtitle:'Meet Cleo, the intelligent multi-agent platform that transforms how you work.',heroCta:'Try Cleo for Free',heroCtaSecondary:'See How It Works',trustedBy:'Trusted by teams worldwide',featuresTitle:'Everything You Need',featuresSubtitle:'Powerful features that adapt to your workflow',agentsTitle:'Meet Your AI Team',agentsSubtitle:'Specialized agents ready for any task',benefitsTitle:'Why Choose Cleo',benefitsSubtitle:'Real results that transform productivity',useCasesTitle:'Built for Real Work',useCasesSubtitle:'See how teams use Cleo every day',testimonialsTitle:'Loved by Professionals',testimonialsSubtitle:'Join thousands who work smarter',securityTitle:'Enterprise-Grade Security',securitySubtitle:'Your data is safe with us',finalCtaTitle:'Ready to Multiply Your Productivity?',finalCtaSubtitle:'Start free, no credit card required.',finalCta:'Start Free Now',tryDemo:'实时演示',getStarted:'开始',tryNow:'立即尝试',deployTime:'部署时间',under5Minutes:'5分钟内 ⚡',philosophyTitle:'Our Philosophy',philosophySubtitle:'AI should empower, not replace.',customAgentsBadge:'最强大的功能',customAgentsTitle:'构建您自己的AI代理',customAgentsSubtitle:'创建针对您确切需求的定制代理。无需编码。几分钟内部署专业AI团队成员。',customAgentsTagline:'5分钟内完成部署。',customAgentsFormName:'代理名称',customAgentsFormRole:'角色和专长',customAgentsFormCapability:'能力水平',customAgentsPreview:'预览',customAgentsDeploy:'部署代理',customAgentsBenefitsTitle:'为什么要构建自定义代理？',customAgentsBenefit1Title:'无限自定义代理',customAgentsBenefit1Desc:'为不同任务和工作流创建所需数量的专业代理。',customAgentsBenefit2Title:'任务特定专长',customAgentsBenefit2Desc:'每个代理专注于一个领域，确保专家级的性能和准确性。',customAgentsBenefit3Title:'无代码构建器',customAgentsBenefit3Desc:'直观界面 - 无需编程。在几分钟而非几小时内构建代理。',customAgentsBenefit4Title:'子代理和委派',customAgentsBenefit4Desc:'创建层次结构 - 父代理可以自动委派给专业的子代理。',customAgentsUseCasesTitle:'热门用例',customAgentsUseCase1:'使用专业产品代理实现客户支持自动化',customAgentsUseCase2:'使用撰稿人、编辑和发布者代理创建内容流水线',customAgentsUseCase3:'使用代码审查和文档代理开发工作流',customAgentsUseCase4:'使用研究、文案和分析代理开展营销活动'},
}

const ar: Translations = {
  sidebar: {
    home: 'الرئيسية',
    agents: 'الوكلاء',
    tasks: 'المهام',
    integrations: 'التكاملات',
    dashboard: 'لوحة التحكم',
    docs: 'المستندات',
    personality: 'الشخصية',
    search: 'بحث',
    newChat: 'محادثة جديدة',
    voice: 'الصوت',
    projects: 'المشاريع',
    newProject: 'جديد',
    history: 'السجل',
    settings: 'الإعدادات',
    files: 'الملفات',
    newAgent: 'وكيل جديد',
    generatePrompt: 'توليد موجه',
  },
  time: {
    today: 'اليوم',
    yesterday: 'أمس',
    lastWeek: 'آخر 7 أيام',
    last7Days: 'آخر 7 أيام',
    lastMonth: 'آخر 30 يومًا',
    last30Days: 'آخر 30 يومًا',
    thisYear: 'هذا العام',
    older: 'أقدم',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
  },
  actions: {
    delete: 'حذف',
    edit: 'تحرير',
    rename: 'إعادة تسمية',
    share: 'مشاركة',
    copy: 'نسخ',
    download: 'تنزيل',
    upload: 'رفع',
    cancel: 'إلغاء',
    save: 'حفظ',
    create: 'إنشاء',
    open: 'فتح',
    close: 'إغلاق',
  },
  badges: {
    new: 'جديد',
  },
  projects: {
    viewAll: 'عرض الكل',
    new: 'جديد',
    documents: 'المستندات',
    noDocuments: 'لا توجد مستندات بعد',
    uploadDocuments: 'رفع المستندات',
    reindex: 'إعادة الفهرسة',
    backToProject: 'العودة إلى المشروع',
    createNew: 'إنشاء مشروع جديد',
    createDescription: 'اختر اسمًا ولونًا لمشروعك الجديد.',
    namePlaceholder: 'اسم المشروع',
    folderColor: 'لون المجلد:',
  },
  settings: {
    title: 'الإعدادات',
    general: 'عام',
    models: 'نماذج الذكاء الاصطناعي',
    personality: 'الشخصية',
    files: 'الملفات',
    appearance: 'المظهر',
    language: 'اللغة',
  },
  landing: {heroTitle:'AI Agents That Multiply Your Productivity',heroSubtitle:'Meet Cleo, the intelligent multi-agent platform that transforms how you work.',heroCta:'Try Cleo for Free',heroCtaSecondary:'See How It Works',trustedBy:'Trusted by teams worldwide',featuresTitle:'Everything You Need',featuresSubtitle:'Powerful features that adapt to your workflow',agentsTitle:'Meet Your AI Team',agentsSubtitle:'Specialized agents ready for any task',benefitsTitle:'Why Choose Cleo',benefitsSubtitle:'Real results that transform productivity',useCasesTitle:'Built for Real Work',useCasesSubtitle:'See how teams use Cleo every day',testimonialsTitle:'Loved by Professionals',testimonialsSubtitle:'Join thousands who work smarter',securityTitle:'Enterprise-Grade Security',securitySubtitle:'Your data is safe with us',finalCtaTitle:'Ready to Multiply Your Productivity?',finalCtaSubtitle:'Start free, no credit card required.',finalCta:'Start Free Now',tryDemo:'تجربة مباشرة',getStarted:'ابدأ',tryNow:'جرب الآن',deployTime:'وقت النشر',under5Minutes:'أقل من 5 دقائق ⚡',philosophyTitle:'Our Philosophy',philosophySubtitle:'AI should empower, not replace.',customAgentsBadge:'الميزة الأقوى',customAgentsTitle:'قم ببناء وكلاء الذكاء الاصطناعي الخاصة بك',customAgentsSubtitle:'إنشاء وكلاء مخصصين مصممين لاحتياجاتك الدقيقة. لا حاجة للبرمجة. نشر زملاء ذكاء اصطناعي متخصصين في دقائق.',customAgentsTagline:'انشر خلال أقل من 5 دقائق.',customAgentsFormName:'اسم الوكيل',customAgentsFormRole:'الدور والخبرة',customAgentsFormCapability:'مستوى القدرة',customAgentsPreview:'معاينة',customAgentsDeploy:'نشر الوكيل',customAgentsBenefitsTitle:'لماذا بناء وكلاء مخصصين؟',customAgentsBenefit1Title:'وكلاء مخصصون غير محدودون',customAgentsBenefit1Desc:'إنشاء عدد غير محدود من الوكلاء المتخصصين لمختلف المهام وسير العمل.',customAgentsBenefit2Title:'خبرة خاصة بالمهمة',customAgentsBenefit2Desc:'يركز كل وكيل على مجال واحد، مما يضمن أداء ودقة على مستوى الخبراء.',customAgentsBenefit3Title:'منشئ بدون كود',customAgentsBenefit3Desc:'واجهة بديهية - لا حاجة للبرمجة. بناء الوكلاء في دقائق، وليس ساعات.',customAgentsBenefit4Title:'الوكلاء الفرعيون والتفويض',customAgentsBenefit4Desc:'إنشاء تسلسلات هرمية - يمكن للوكلاء الرئيسيين التفويض تلقائيًا للوكلاء الفرعيين المتخصصين.',customAgentsUseCasesTitle:'حالات الاستخدام الشائعة',customAgentsUseCase1:'أتمتة دعم العملاء مع وكلاء منتجات متخصصين',customAgentsUseCase2:'خط أنابيب إنشاء المحتوى مع وكلاء الكاتب والمحرر والناشر',customAgentsUseCase3:'سير عمل التطوير مع وكلاء مراجعة الكود والتوثيق',customAgentsUseCase4:'حملات التسويق مع وكلاء البحث والكتابة والتحليل'},
}

export const translations: Record<Locale, Translations> = {
  en,
  es,
  pt,
  fr,
  it,
  de,
  ja,
  ko,
  zh,
  ar,
}

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || translations.en
}
