import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Ankie AI — Prompt Library",
  description: "This route moved. You will be redirected to the new prompt library.",
  alternates: { canonical: "/prompts-library" },
  robots: { index: false },
}

export default function LegacyDocsRedirect() {
  redirect("/prompts-library")
}
