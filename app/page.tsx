import { LandingNav } from "@/components/landing/landing-nav"
import { HeroSection } from "@/components/landing/hero-section"
import { CustomAgentsSection } from "@/components/landing/custom-agents-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { AgentsSection } from "@/components/landing/agents-section"
import { UseCaseDemo } from "@/components/landing/use-case-demo"
import { BenefitsSection } from "@/components/landing/benefits-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FinalCTASection } from "@/components/landing/final-cta-section"
import { ScrollToTop } from "@/components/landing/scroll-to-top"
import { LandingFooter } from "@/components/landing/landing-footer"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await searchParams as required by Next.js 15
  const params = searchParams ? await searchParams : {}
  
  // Check if user is authenticated via Supabase
  const supabase = await createClient()
  
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Allow landing by default. Redirect only when explicitly requested
    // via query (?go=chat) or env flag HOME_REDIRECT_AUTH=true.
    const wantsChat =
      (typeof params?.go === 'string' && params.go === 'chat') ||
      process.env.HOME_REDIRECT_AUTH === 'true'
    if (user && wantsChat) {
      redirect('/chat')
    }
  }
  
  // Landing page shown to:
  // 1. Unauthenticated users (no Supabase session)
  // 2. Guest users (may have guest chat session but not logged in)
  // 
  // Buttons:
  // - "Prueba Gratis" → /chat/guest (creates/continues guest session)
  // - "Sign In" → /auth (Google OAuth)
  
  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Kylio",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "description": "Free sandbox access available"
    },
    "description": "Kylio lets teams design, launch, and observe AI agents in under five minutes with built-in guardrails, live previews, and human-in-the-loop controls.",
    "featureList": [
      "Visual Agent Studio",
      "Human-in-the-loop Guardrails",
      "Deploy Anywhere (Chat, API, Workflows)",
      "Full Observability & Audit Trails"
    ],
    "provider": {
      "@type": "Organization",
      "name": "Huminary Labs",
      "url": "https://huminarylabs.com"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <LandingNav />
      
      <main className="pt-16">
        {/* 1. Hero Section */}
        <HeroSection />

          {/* 2. Build Your Own Agents — focus on 5‑minute deploy */}
          <div id="builder" data-landing-search data-landing-search-title="Builder" data-landing-search-type="section">
            <CustomAgentsSection />
          </div>

          {/* 3. Live demo – watch your AI team work */}
          <div id="demo" data-landing-search data-landing-search-title="Demo" data-landing-search-type="section">
            <UseCaseDemo />
          </div>

          {/* 4. Meet your specialized AI team */}
          <div id="agents" data-landing-search data-landing-search-title="Agents" data-landing-search-type="section">
            <AgentsSection />
          </div>

          {/* 5. Features */}
          <div id="features" data-landing-search data-landing-search-title="Features" data-landing-search-type="section">
            <FeaturesSection />
          </div>

          {/* 6. Benefits */}
          <div id="benefits" data-landing-search data-landing-search-title="Benefits" data-landing-search-type="section">
            <BenefitsSection />
          </div>

          {/* 7. Proof & Security */}
          <TestimonialsSection />

          {/* 8. Pricing */}
          <div id="pricing" data-landing-search data-landing-search-title="Pricing" data-landing-search-type="section">
            <PricingSection />
          </div>

          {/* Final CTA */}
          <div id="get-started" data-landing-search data-landing-search-title="Start" data-landing-search-type="section">
            <FinalCTASection />
          </div>
      </main>

      <ScrollToTop />
      <LandingFooter />
    </div>
  )
}
