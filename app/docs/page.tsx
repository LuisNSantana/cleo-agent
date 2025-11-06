import type { Metadata } from "next"
import DocsPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Cleo — Documentation",
  description:
    "Complete guide to use Cleo: agents, tasks, PWA & notifications, and analytics dashboard.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Cleo — Documentation",
    description:
      "Complete guide to use Cleo: agents, tasks, PWA & notifications, and analytics dashboard.",
    type: "article",
    siteName: "Cleo",
    images: [
      {
        url: "/img/kyliologo.png",
        width: 512,
        height: 512,
        alt: "Cleo Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Cleo — Documentation",
    description:
      "Complete guide to use Cleo: agents, tasks, PWA & notifications, and analytics dashboard.",
    images: ["/img/kyliologo.png"],
  },
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolved = (await searchParams) ?? {}
  const raw = Array.isArray(resolved.lang) ? resolved.lang[0] : resolved.lang
  const initialLang = raw === "es" || raw === "pt" || raw === "en" ? raw : "en"
  return <DocsPageClient initialLang={initialLang} />
}
