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
    appearance: 'Appearance',
    language: 'Language',
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
