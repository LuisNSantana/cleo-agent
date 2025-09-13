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
        url: "/img/agents/logocleo4.png",
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
    images: ["/img/agents/logocleo4.png"],
  },
}

export default function DocsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const raw = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang
  const initialLang = raw === "es" || raw === "pt" || raw === "en" ? raw : "en"
  return <DocsPageClient initialLang={initialLang} />
}
