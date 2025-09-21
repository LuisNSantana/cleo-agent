"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
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
import type { LucideIcon } from "lucide-react"
import { Rocket, Bot, ClipboardList, Hammer, Plug } from "lucide-react"

// Minimal i18n content store
const content = {
  en: {
    title: "Cleo Documentation",
    subtitle: "Learn to use Cleo with a practical, visual guide.",
    sections: [
      { id: "overview", title: "Overview", desc: "General description of the application" },
      { id: "models", title: "Models", desc: "What models are and how to use them" },
      { id: "agents", title: "Agents", desc: "How to create and manage agents" },
      { id: "tasks", title: "Tasks", desc: "How to create and track tasks" },
      { id: "tools", title: "Tools", desc: "Integrations, PWA, notifications & more" },
    ],
    chipsLabel: "Sections",
    backHome: "Back to Home",
  },
  es: {
    title: "Documentación de Cleo",
    subtitle: "Aprende a usar Cleo con esta guía visual y práctica.",
    sections: [
      { id: "overview", title: "Descripción general", desc: "Descripción general de la aplicación" },
      { id: "models", title: "Modelos", desc: "Qué son los modelos y cómo usarlos" },
      { id: "agents", title: "Agentes", desc: "Cómo crear y gestionar agentes" },
      { id: "tasks", title: "Tareas", desc: "Cómo crear y seguir tareas" },
      { id: "tools", title: "Herramientas", desc: "Integraciones, PWA, notificaciones y más" },
    ],
    chipsLabel: "Secciones",
    backHome: "Volver al inicio",
  },
  pt: {
    title: "Documentação do Cleo",
    subtitle: "Aprenda a usar o Cleo com um guia visual e prático.",
    sections: [
      { id: "overview", title: "Visão geral", desc: "Descrição geral do aplicativo" },
      { id: "models", title: "Modelos", desc: "O que são modelos e como usá-los" },
      { id: "agents", title: "Agentes", desc: "Como criar e gerenciar agentes" },
      { id: "tasks", title: "Tarefas", desc: "Como criar e acompanhar tarefas" },
      { id: "tools", title: "Ferramentas", desc: "Integrações, PWA, notificações e mais" },
    ],
    chipsLabel: "Seções",
    backHome: "Voltar ao início",
  },
} as const

type Lang = keyof typeof content

export default function DocsPageClient({ initialLang = "en" }: { initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(
    (["en", "es", "pt"].includes(initialLang) ? initialLang : "en") as Lang
  )
  const t = useMemo(() => content[lang], [lang])
  const icons: Record<string, LucideIcon> = useMemo(
    () => ({
      overview: Rocket,
      models: Bot,
      agents: Hammer,
      tasks: ClipboardList,
      tools: Plug,
    }),
    []
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
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
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t.backHome}
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground mb-8 text-center">{t.subtitle}</p>

      {/* Interactive tabs */}
      <Tabs defaultValue={t.sections[0].id} className="space-y-8">
        <TabsList className="justify-center">
          {t.sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {t.sections.map((s) => (
          <TabsContent key={s.id} value={s.id}>
            <section className="space-y-4 rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = icons[s.id]
                  return Icon ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
                      <Icon className="h-5 w-5 text-white/80" aria-hidden />
                    </span>
                  ) : null
                })()}
                <h2 className="text-xl font-semibold">{s.title}</h2>
              </div>
              <p className="text-muted-foreground">{s.desc}</p>
              <div className="mt-4">
                {renderBullets(lang, s.id)}
              </div>
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </main>
  )
}

function renderBullets(lang: Lang, id: string) {
  const L = (en: string, es: string, pt: string) =>
    lang === "es" ? es : lang === "pt" ? pt : en
  const Ul = ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc space-y-2 pl-5 text-sm">{children}</ul>
  )

  switch (id) {
    case "overview":
      return (
        <Ul>
          <li>
            {L(
              "Comprehensive introduction to Cleo and its main capabilities.",
              "Introducción completa a Cleo y sus funciones principales.",
              "Introdução completa ao Cleo e suas capacidades principais."
            )}
          </li>
          <li>
            {L(
              "Quick tour of the interface, menu and navigation.",
              "Tour rápido por la interfaz, menú y navegación.",
              "Tour rápido pela interface, menu e navegação."
            )}
          </li>
          <li>
            {L(
              "Customize your experience: themes, language and settings.",
              "Personaliza tu experiencia: temas, idioma y ajustes.",
              "Personalize sua experiência: temas, idioma e configurações."
            )}
          </li>
        </Ul>
      )
    case "models":
      return (
        <Ul>
          <li>
            {L(
              "Overview of available models and their strengths.",
              "Visión general de modelos disponibles y sus fortalezas.",
              "Visão geral dos modelos disponíveis e seus pontos fortes."
            )}
          </li>
          <li>
            {L(
              "Switch models and adjust parameters like temperature.",
              "Cambia modelos y ajusta parámetros como temperatura.",
              "Altere modelos e ajuste parâmetros como temperatura."
            )}
          </li>
          <li>
            {L(
              "Best practices for choosing the right model per task.",
              "Buenas prácticas para seleccionar el modelo adecuado.",
              "Melhores práticas para escolher o modelo certo por tarefa."
            )}
          </li>
        </Ul>
      )
    case "agents":
      return (
        <Ul>
          <li>
            {L(
              "Create agents with clear roles, goals and constraints.",
              "Crea agentes con roles, objetivos y límites claros.",
              "Crie agentes com papéis, metas e restrições claras."
            )}
          </li>
          <li>
            {L(
              "Assign tools, integrations and data sources securely.",
              "Asigna herramientas, integraciones y fuentes de datos de forma segura.",
              "Atribua ferramentas, integrações e fontes de dados com segurança."
            )}
          </li>
          <li>
            {L(
              "Iterate prompts and guardrails to optimize agent performance.",
              "Itera prompts y límites para optimizar el rendimiento del agente.",
              "Itere prompts e regras de segurança para otimizar o desempenho do agente."
            )}
          </li>
        </Ul>
      )
    case "tasks":
      return (
        <Ul>
          <li>
            {L(
              "Capture context and create tasks directly from chat messages.",
              "Captura contexto y crea tareas directamente desde el chat.",
              "Capture contexto e crie tarefas diretamente de mensagens de chat."
            )}
          </li>
          <li>
            {L(
              "Define title, description, owner, due date and priority.",
              "Define título, descripción, responsable, fecha de entrega y prioridad.",
              "Defina título, descrição, responsável, prazo e prioridade."
            )}
          </li>
          <li>
            {L(
              "Track task status: backlog, in progress, review and done.",
              "Sigue el estado de tareas: backlog, en progreso, revisión y completado.",
              "Acompanhe o status: backlog, em progresso, revisão e concluído."
            )}
          </li>
        </Ul>
      )
    case "tools":
      return (
        <Ul>
          <li>
            {L(
              "Integrate third‑party services: Google, Notion, SerpAPI.",
              "Integra servicios externos: Google, Notion, SerpAPI.",
              "Integre serviços de terceiros: Google, Notion, SerpAPI."
            )}
          </li>
          <li>
            {L(
              "Install the PWA and enable push notifications.",
              "Instala la PWA y activa notificaciones push.",
              "Instale a PWA e ative notificações push."
            )}
          </li>
          <li>
            {L(
              "Manage permissions and revoke access at any time.",
              "Gestiona permisos y revoca acceso en cualquier momento.",
              "Gerencie permissões e revogue acesso a qualquer momento."
            )}
          </li>
        </Ul>
      )
    default:
      return null
  }
}
