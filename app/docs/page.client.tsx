"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LucideIcon } from "lucide-react"
import {
  Rocket,
  Bot,
  ClipboardList,
  Hammer,
  Plug,
  Bell,
  BarChart3,
  Keyboard,
  LifeBuoy,
  HelpCircle,
  ShieldCheck,
} from "lucide-react"

// Minimal i18n content store
const content = {
  en: {
    title: "Cleo Documentation",
    subtitle: "Learn to use Cleo with a practical, visual guide.",
    sections: [
      { id: "getting-started", title: "Getting Started", desc: "Key concepts and a quick tour" },
      { id: "agents", title: "Agent Control", desc: "How agents work and how to manage them" },
      { id: "tasks", title: "Create Tasks", desc: "Workflows, ownership and tracking" },
      { id: "build-agents", title: "Build Agents", desc: "Profiles, capabilities and tools" },
      { id: "integrations", title: "Integrations", desc: "Connect Google, Notion, SerpAPI and more" },
      { id: "pwa", title: "PWA & Notifications", desc: "Install the app and enable push" },
      { id: "dashboard", title: "Dashboard", desc: "Metrics, performance and activity" },
      { id: "shortcuts", title: "Shortcuts & Tips", desc: "Navigate faster and work smarter" },
      { id: "troubleshooting", title: "Troubleshooting", desc: "Common issues and quick fixes" },
      { id: "faq", title: "FAQ", desc: "Answers to frequent questions" },
      { id: "privacy-legal", title: "Privacy & Legal", desc: "Your data, privacy and terms" },
    ],
    chipsLabel: "Sections",
    backHome: "Back to Home",
  },
  es: {
    title: "Documentación de Cleo",
    subtitle: "Aprende a usar Cleo con esta guía visual y práctica.",
    sections: [
      { id: "getting-started", title: "Inicio", desc: "Conceptos clave y tour rápido" },
      { id: "agents", title: "Control de Agentes", desc: "Cómo funcionan y cómo gestionarlos" },
      { id: "tasks", title: "Crear Tareas", desc: "Flujos de trabajo y seguimiento" },
      { id: "build-agents", title: "Crear Agentes", desc: "Perfiles, capacidades y herramientas" },
      { id: "integrations", title: "Integraciones", desc: "Conecta Google, Notion, SerpAPI y más" },
      { id: "pwa", title: "PWA y Notificaciones", desc: "Instalación y activación de push" },
      { id: "dashboard", title: "Dashboard", desc: "Métricas, rendimiento y actividad" },
      { id: "shortcuts", title: "Atajos y Consejos", desc: "Navega más rápido y trabaja mejor" },
      { id: "troubleshooting", title: "Solución de Problemas", desc: "Casos comunes y arreglos rápidos" },
      { id: "faq", title: "Preguntas Frecuentes", desc: "Respuestas a dudas comunes" },
      { id: "privacy-legal", title: "Privacidad y Legal", desc: "Tus datos, privacidad y términos" },
    ],
    chipsLabel: "Secciones",
    backHome: "Volver al inicio",
  },
  pt: {
    title: "Documentação do Cleo",
    subtitle: "Aprenda a usar o Cleo com um guia visual e prático.",
    sections: [
      { id: "getting-started", title: "Início", desc: "Conceitos-chave e tour rápido" },
      { id: "agents", title: "Controle de Agentes", desc: "Como funcionam e como gerenciá-los" },
      { id: "tasks", title: "Criar Tarefas", desc: "Fluxos de trabalho e acompanhamento" },
      { id: "build-agents", title: "Criar Agentes", desc: "Perfis, capacidades e ferramentas" },
      { id: "integrations", title: "Integrações", desc: "Conecte Google, Notion, SerpAPI e mais" },
      { id: "pwa", title: "PWA e Notificações", desc: "Instalação e push" },
      { id: "dashboard", title: "Dashboard", desc: "Métricas, desempenho e atividade" },
      { id: "shortcuts", title: "Atalhos e Dicas", desc: "Navegue mais rápido e trabalhe melhor" },
      { id: "troubleshooting", title: "Solução de Problemas", desc: "Casos comuns e correções rápidas" },
      { id: "faq", title: "FAQ", desc: "Respostas às perguntas frequentes" },
      { id: "privacy-legal", title: "Privacidade e Legal", desc: "Seus dados, privacidade e termos" },
    ],
    chipsLabel: "Seções",
    backHome: "Voltar ao início",
  },
} as const

type Lang = keyof typeof content

export default function DocsPageClient({ initialLang = "en" }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>((["en", "es", "pt"].includes(initialLang) ? initialLang : "en") as Lang)
  const t = useMemo(() => content[lang], [lang])
  const icons: Record<string, LucideIcon> = useMemo(
    () => ({
      "getting-started": Rocket,
      agents: Bot,
      tasks: ClipboardList,
      "build-agents": Hammer,
      integrations: Plug,
      pwa: Bell,
      dashboard: BarChart3,
      shortcuts: Keyboard,
      troubleshooting: LifeBuoy,
      faq: HelpCircle,
      "privacy-legal": ShieldCheck,
    }),
    []
  )

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Top bar with logo, language switcher and home */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/img/agents/logocleo4.png" alt="Cleo" width={40} height={40} />
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger>
              <SelectValue aria-label="language" placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/" className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            {t.backHome}
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">{t.subtitle}</p>

      {/* Section chips */}
      <nav className="mb-8 flex flex-wrap items-center gap-2">
        {t.sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="border-border hover:bg-accent/50 text-foreground inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition-colors"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {/* Content grid with visual placeholders; easy to extend with diagrams/images */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {t.sections.map((s) => (
          <section key={s.id} id={s.id} className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = icons[s.id]
                return Icon ? (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                    <Icon className="h-5 w-5 text-white/80" aria-hidden />
                  </span>
                ) : null
              })()}
              <h2 className="text-xl font-semibold">{s.title}</h2>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{s.desc}</p>
            <div className="mt-4 aspect-video w-full rounded-lg bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_60%)] ring-1 ring-white/10" />
            {renderBullets(lang, s.id)}
          </section>
        ))}
      </div>
    </main>
  )
}

function renderBullets(lang: Lang, id: string) {
  const L = (en: string, es: string, pt: string) => (lang === "es" ? es : lang === "pt" ? pt : en)

  const Ul = ({ children }: { children: React.ReactNode }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{children}</ul>
  )

  switch (id) {
    case "getting-started":
      return (
        <Ul>
          <li>
            {L("Create your account and log in.", "Crea tu cuenta e inicia sesión.", "Crie sua conta e faça login.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Use email or OAuth if available.", "Usa email u OAuth si está disponible.", "Use e-mail ou OAuth se disponível.")}</li>
              <li>{L("Verify your email if prompted.", "Verifica tu correo si se solicita.", "Verifique seu e-mail se solicitado.")}</li>
              <li>{L("Set display name and time zone in Settings.", "Configura nombre y zona horaria en Ajustes.", "Defina nome e fuso horário em Configurações.")}</li>
            </ul>
          </li>
          <li>
            {L("Tour the header: Chat, Agents, Dashboard, Settings.", "Tour por el header: Chat, Agentes, Dashboard, Ajustes.", "Tour pelo cabeçalho: Chat, Agentes, Dashboard, Configurações.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Try the command menu (Ctrl/Cmd+K).", "Prueba el menú de comandos (Ctrl/Cmd+K).", "Teste o menu de comandos (Ctrl/Cmd+K).")}</li>
              <li>{L("Open Docs from header when logged out.", "Abre Docs desde el header cuando no estés logueado.", "Abra Docs no cabeçalho quando não estiver logado.")}</li>
            </ul>
          </li>
          <li>
            {L("Start a conversation in Chat and try a simple task.", "Empieza una conversación en Chat y crea una tarea simple.", "Comece uma conversa no Chat e crie uma tarefa simples.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Example: ‘Summarize this link and give 3 bullets’.", "Ejemplo: ‘Resume este enlace y da 3 puntos’.", "Exemplo: ‘Resuma este link e dê 3 tópicos’.")}</li>
              <li>{L("Tag the conversation for later search.", "Etiqueta la conversación para buscar luego.", "Marque a conversa para buscar depois.")}</li>
            </ul>
          </li>
          <li>
            {L("Open Settings → Appearance to switch theme and layout.", "Abre Ajustes → Apariencia para cambiar tema y layout.", "Abra Configurações → Aparência para trocar tema e layout.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Choose light/dark and compact/comfortable.", "Elige claro/oscuro y compacto/cómodo.", "Escolha claro/escuro e compacto/confortável.")}</li>
              <li>{L("Enable reduced animations if needed.", "Activa animaciones reducidas si quieres.", "Ative animações reduzidas se preferir.")}</li>
            </ul>
          </li>
          <li>
            {L("Install the PWA and enable notifications for updates.", "Instala la PWA y activa notificaciones para novedades.", "Instale a PWA e ative notificações para novidades.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Use ‘Add to Home Screen’ (mobile) or install (desktop).", "Usa ‘Añadir a la pantalla’ (móvil) o instalar (desktop).", "Use ‘Adicionar à Tela’ (móvel) ou instalar (desktop).")}</li>
              <li>{L("Allow notifications when prompted.", "Permite notificaciones cuando se te pida.", "Permita notificações quando solicitado.")}</li>
            </ul>
          </li>
        </Ul>
      )
    case "agents":
      return (
        <Ul>
          <li>
            {L("Agent Control shows status, recent work and connected tools.", "El Control de Agentes muestra estado, trabajo reciente y herramientas conectadas.", "O Controle de Agentes mostra status, trabalhos recentes e ferramentas conectadas.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Green = active, Gray = idle.", "Verde = activo, Gris = inactivo.", "Verde = ativo, Cinza = inativo.")}</li>
              <li>{L("Click an agent to view timeline and audit trail.", "Haz clic para ver la línea de tiempo y auditoría.", "Clique para ver a linha do tempo e auditoria.")}</li>
            </ul>
          </li>
          <li>
            {L("Create agents with clear roles (e.g. Research, Writing, Ops).", "Crea agentes con roles claros (Investigación, Redacción, Operaciones).", "Crie agentes com papéis claros (Pesquisa, Redação, Operações).")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Keep purpose one sentence.", "Mantén el propósito en una frase.", "Mantenha o propósito em uma frase.")}</li>
              <li>{L("Add capabilities and guardrails.", "Añade capacidades y límites.", "Adicione capacidades e limites.")}</li>
            </ul>
          </li>
          <li>
            {L("Delegate step-by-step: plan → research → draft → review.", "Delega por pasos: planear → investigar → redactar → revisar.", "Delegue por etapas: planejar → pesquisar → rascunhar → revisar.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Attach files/links as context.", "Adjunta archivos/enlaces como contexto.", "Anexe arquivos/links como contexto.")}</li>
              <li>{L("Ask for a summary before final output.", "Pide un resumen antes del final.", "Peça um resumo antes do final.")}</li>
            </ul>
          </li>
          <li>{L("Tip: keep prompts short; share context as bullet notes.", "Tip: prompts cortos; comparte contexto en viñetas.", "Dica: prompts curtos; compartilhe contexto em tópicos.")}</li>
          <li>
            <Link className="underline" href="/agents">{L("Open Agent Center","Abrir Centro de Agentes","Abrir Central de Agentes")}</Link>
          </li>
        </Ul>
      )
    case "tasks":
      return (
        <Ul>
          <li>
            {L("Create tasks from Chat or the Tasks panel.", "Crea tareas desde Chat o el panel de Tareas.", "Crie tarefas pelo Chat ou pelo painel de Tarefas.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Use ‘Create task’ from a message to capture context.", "Usa ‘Crear tarea’ desde un mensaje para capturar contexto.", "Use ‘Criar tarefa’ de uma mensagem para capturar contexto.")}</li>
              <li>{L("Link tasks to agents for ownership.", "Vincula tareas a agentes como responsables.", "Ligue tarefas a agentes como responsáveis.")}</li>
            </ul>
          </li>
          <li>
            {L("Fill title, description, owner, due date and priority.", "Completa título, descripción, responsable, fecha y prioridad.", "Preencha título, descrição, responsável, prazo e prioridade.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Be explicit about deliverables.", "Sé explícito con entregables.", "Seja explícito nos entregáveis.")}</li>
              <li>{L("Attach files or URLs if relevant.", "Adjunta archivos o URLs si aplica.", "Anexe arquivos ou URLs se necessário.")}</li>
            </ul>
          </li>
          <li>
            {L("Workflow states: Backlog → In Progress → Review → Done.", "Estados: Backlog → En Progreso → Revisión → Hecho.", "Estados: Backlog → Em Progresso → Revisão → Concluída.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Move to Review when awaiting approval.", "Pasa a Revisión al esperar aprobación.", "Mova para Revisão ao aguardar aprovação.")}</li>
              <li>{L("Add comments for blockers and decisions.", "Añade comentarios por bloqueos y decisiones.", "Adicione comentários sobre bloqueios e decisões.")}</li>
            </ul>
          </li>
          <li>{L("You’ll get notifications on state changes.", "Recibirás notificaciones al cambiar de estado.", "Você receberá notificações ao mudar de estado.")}</li>
          <li>{L("Example: ‘Summarize this document and propose next steps’.", "Ejemplo: ‘Resume este documento y propone próximos pasos’.", "Exemplo: ‘Resuma este documento e proponha próximos passos’.")}</li>
        </Ul>
      )
    case "build-agents":
      return (
        <Ul>
          <li>
            {L("Define name, purpose, capabilities and guardrails.", "Define nombre, propósito, capacidades y límites.", "Defina nome, propósito, capacidades e limites.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Keep purpose specific (e.g., ‘B2B research analyst’).", "Propósito específico (p.ej., ‘analista de investigación B2B’).", "Propósito específico (ex.: ‘analista de pesquisa B2B’).")}</li>
              <li>{L("Guardrails: forbidden sources, tone, escalation rules.", "Límites: fuentes prohibidas, tono, reglas de escalado.", "Limites: fontes proibidas, tom, regras de escalonamento.")}</li>
            </ul>
          </li>
          <li>
            {L("Attach tools the agent can use (search, docs, email, etc.).", "Adjunta herramientas (búsqueda, docs, email, etc.).", "Anexe ferramentas (busca, docs, e-mail, etc.).")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Grant minimal required scopes.", "Otorga los mínimos permisos necesarios.", "Conceda os escopos mínimos necessários.")}</li>
              <li>{L("Test each tool individually first.", "Prueba cada herramienta por separado primero.", "Teste cada ferramenta separadamente primeiro.")}</li>
            </ul>
          </li>
          <li>
            {L("Test with small tasks; iterate prompts and instructions.", "Prueba con tareas pequeñas; itera prompts e instrucciones.", "Teste com tarefas pequenas; itere prompts e instruções.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Start with 2–3 step tasks.", "Empieza con tareas de 2–3 pasos.", "Comece com tarefas de 2–3 passos.")}</li>
              <li>{L("Collect examples of good outputs.", "Colecciona ejemplos de buenos outputs.", "Colete exemplos de bons outputs.")}</li>
            </ul>
          </li>
          <li>{L("Version profiles so you can roll back easily.", "Versiona perfiles para poder revertir fácilmente.", "Versione perfis para poder reverter facilmente.")}</li>
        </Ul>
      )
    case "integrations":
      return (
        <Ul>
          <li>
            {L("Connect Google, Notion, SerpAPI and more from Settings.", "Conecta Google, Notion, SerpAPI y más desde Ajustes.", "Conecte Google, Notion, SerpAPI e mais em Configurações.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Follow OAuth prompts and confirm scopes.", "Sigue los prompts de OAuth y confirma permisos.", "Siga os prompts de OAuth e confirme os escopos.")}</li>
              <li>{L("Revoke access anytime in Settings.", "Revoca acceso en cualquier momento en Ajustes.", "Revogue acesso a qualquer momento em Configurações.")}</li>
            </ul>
          </li>
          <li>{L("Grant only the permissions you need.", "Otorga solo los permisos necesarios.", "Conceda apenas as permissões necessárias.")}</li>
          <li>{L("Tip: test each integration with a tiny task first.", "Tip: prueba cada integración con una tarea mínima.", "Dica: teste cada integração com uma tarefa mínima.")}</li>
        </Ul>
      )
    case "pwa":
      return (
        <Ul>
          <li>
            {L("Install the PWA (Add to Home Screen).", "Instala la PWA (Añadir a la pantalla de inicio).", "Instale a PWA (Adicionar à tela inicial).")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Chrome: three-dots menu → Install.", "Chrome: menú tres puntos → Instalar.", "Chrome: menu de três pontos → Instalar.")}</li>
              <li>{L("iOS: Share → Add to Home Screen.", "iOS: Compartir → Añadir a la pantalla.", "iOS: Compartilhar → Adicionar à Tela de Início.")}</li>
            </ul>
          </li>
          <li>
            {L("Enable push and allow notifications in the browser.", "Activa push y permite notificaciones en el navegador.", "Ative push e permita notificações no navegador.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Check OS-level focus modes.", "Revisa modos de concentración del SO.", "Verifique modos de foco do SO.")}</li>
              <li>{L("Verify site permissions are ‘Allowed’.", "Verifica permisos del sitio en ‘Permitido’.", "Verifique permissões do site em ‘Permitido’.")}</li>
            </ul>
          </li>
          <li>{L("Notifications link back to specific tasks or chats.", "Las notificaciones enlazan a tareas o chats específicos.", "As notificações levam a tarefas ou chats específicos.")}</li>
        </Ul>
      )
    case "dashboard":
      return (
        <Ul>
          <li>
            {L("Usage by agent and model with trends and history.", "Uso por agente y modelo con tendencias e historial.", "Uso por agente e modelo com tendências e histórico.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Filter by date range and user.", "Filtra por fecha y usuario.", "Filtre por período e usuário.")}</li>
              <li>{L("Export CSV for analysis.", "Exporta CSV para análisis.", "Exporte CSV para análise.")}</li>
            </ul>
          </li>
          <li>{L("Spot bottlenecks and iterate on prompts or workflows.", "Detecta cuellos de botella y mejora prompts o flujos.", "Identifique gargalos e itere prompts ou fluxos.")}</li>
          <li>
            <Link href="/dashboard" className="underline">
              /dashboard
            </Link>
          </li>
        </Ul>
      )
    case "shortcuts":
      return (
        <Ul>
          <li>{L("Ctrl/Cmd+K: Command menu.", "Ctrl/Cmd+K: Menú de comandos.", "Ctrl/Cmd+K: Menu de comandos.")}</li>
          <li>{L("Ctrl/Cmd+/: Quick help.", "Ctrl/Cmd+/: Ayuda rápida.", "Ctrl/Cmd+/: Ajuda rápida.")}</li>
          <li>{L("Shift+Enter: New line in chat.", "Shift+Enter: Nueva línea en chat.", "Shift+Enter: Nova linha no chat.")}</li>
          <li>{L("Ctrl/Cmd+F: Search within current view.", "Ctrl/Cmd+F: Buscar en la vista actual.", "Ctrl/Cmd+F: Buscar na visão atual.")}</li>
          <li>{L("Alt/Option: Reveal tooltips on focus.", "Alt/Opción: Muestra tooltips al enfocar.", "Alt/Option: Mostra tooltips ao focar.")}</li>
        </Ul>
      )
    case "troubleshooting":
      return (
        <Ul>
          <li>
            {L("I can’t log in → Check network and try OAuth/email again.", "No puedo iniciar sesión → Revisa red y prueba OAuth/email.", "Não consigo logar → Verifique rede e tente OAuth/e-mail.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Clear cache/cookies and retry.", "Limpia caché/cookies y reintenta.", "Limpe cache/cookies e tente novamente.")}</li>
              <li>{L("Try another browser or device.", "Prueba otro navegador o dispositivo.", "Tente outro navegador ou dispositivo.")}</li>
            </ul>
          </li>
          <li>
            {L("No notifications → Ensure permissions and PWA installed.", "Sin notificaciones → Verifica permisos y PWA instalada.", "Sem notificações → Verifique permissões e PWA instalada.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Verify site permissions and OS focus modes.", "Verifica permisos del sitio y modos de enfoque del SO.", "Verifique permissões do site e modos de foco do SO.")}</li>
              <li>{L("Re-install PWA if needed.", "Reinstala la PWA si es necesario.", "Reinstale a PWA se necessário.")}</li>
            </ul>
          </li>
          <li>
            {L("Agents idle → Verify integrations and task details.", "Agentes inactivos → Verifica integraciones y detalle de tarea.", "Agentes inativos → Verifique integrações e detalhes da tarefa.")}
            <ul className="list-[circle] pl-5 mt-1 space-y-1">
              <li>{L("Reconnect integrations and re-auth if expired.", "Reconecta integraciones y reautentica si expiró.", "Reconecte integrações e reautentique se expirou.")}</li>
              <li>{L("Ensure tasks have clear deliverables.", "Asegura entregables claros en tareas.", "Garanta entregáveis claros nas tarefas.")}</li>
            </ul>
          </li>
        </Ul>
      )
    case "faq":
      return (
        <Ul>
          <li>{L("Is my data private? See Privacy & Terms.", "¿Mis datos son privados? Ver Privacidad y Términos.", "Meus dados são privados? Veja Privacidade e Termos.")}</li>
          <li>{L("Can I invite teammates? Multi-user is planned.", "¿Puedo invitar a mi equipo? Modo multiusuario está en plan.", "Posso convidar equipe? Modo multiusuário está nos planos.")}</li>
          <li>{L("Which models are supported? See Models in Settings.", "¿Qué modelos hay? Ver Modelos en Ajustes.", "Quais modelos há? Veja Modelos em Configurações.")}</li>
          <li>{L("Do you support mobile? Yes, via PWA installation.", "¿Soportan móvil? Sí, vía instalación PWA.", "Suportam mobile? Sim, via instalação PWA.")}</li>
        </Ul>
      )
    case "privacy-legal":
      return (
        <Ul>
          <li>
            <Link href="/privacy" className="underline">{L("Privacy Policy","Política de Privacidad","Política de Privacidade")}</Link>
          </li>
          <li>
            <Link href="/terms" className="underline">{L("Terms of Service","Términos de Servicio","Termos de Serviço")}</Link>
          </li>
          <li>
            <a href="mailto:information@huminarylabs.com" className="underline">{L("Contact us","Contáctanos","Fale conosco")}</a>
          </li>
        </Ul>
      )
    default:
      return null
  }
}
