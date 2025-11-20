import type { Metadata } from "next"
import PromptLibraryPageClient from "./PromptLibraryPageClient"

export const metadata: Metadata = {
  title: "Ankie AI — Prompt Library",
  description:
    "Community-ready prompt bank for Ankie AI: curated templates, guest-mode boosters, and multi-agent playbooks you can share.",
  alternates: { canonical: "/prompts-library" },
  openGraph: {
    title: "Ankie AI — Prompt Library",
    description:
      "Discover curated prompt packs, guest-mode starters, and best practices to collaborate with Ankie AI.",
    type: "website",
    siteName: "Ankie AI",
    images: [
      {
        url: "/img/logoankie.png",
        width: 512,
        height: 512,
        alt: "Ankie AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ankie AI — Prompt Library",
    description:
      "A living prompt library for your team: onboarding kits, RAG flows, and guest chat recipes.",
    images: ["/img/logoankie.png"],
  },
}

export default function PromptLibraryPage() {
  return <PromptLibraryPageClient />
}
