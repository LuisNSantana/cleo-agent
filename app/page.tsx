import { LandingNav } from "@/components/landing/landing-nav"
import { HeroSection } from "@/components/landing/hero-section"
import { CustomAgentsSection } from "@/components/landing/custom-agents-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { AgentsSection } from "@/components/landing/agents-section"
import { UseCaseDemo } from "@/components/landing/use-case-demo"
import { BenefitsSection } from "@/components/landing/benefits-section"
import { FinalCTASection } from "@/components/landing/final-cta-section"
import { ScrollToTop } from "@/components/landing/scroll-to-top"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
    "name": "Cleo AI",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "description": "Free beta access available"
    },
    "description": "Deploy your own AI agents in under 5 minutes. Built on three pillars: Transparency, Personalization, and Simplicity. No code required.",
    "featureList": [
      "Custom AI Agent Builder",
      "Multi-Agent Orchestration", 
      "Real-time Transparency",
      "No-Code Deployment",
      "Enterprise Security"
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

          {/* Final CTA */}
          <div id="get-started" data-landing-search data-landing-search-title="Start" data-landing-search-type="section">
            <FinalCTASection />
          </div>
      </main>
      
      <ScrollToTop />
      
      {/* Footer */}
      <footer className="border-t border-border/40 bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-2xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-primary/20 shadow-lg">
                  <img 
                    src="/img/agents/logocleo4.png" 
                    alt="Cleo AI"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-xl font-bold">Cleo</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Your intelligent multi-agent AI platform
              </p>
              {/* Powered by Huminary Labs */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Powered by</span>
                <a 
                  href="https://huminarylabs.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted hover:text-foreground group"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage 
                      src="/img/logo_huminarylabs.png" 
                      alt="Huminary Labs"
                      className="object-contain"
                    />
                    <AvatarFallback className="text-[8px] bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      H
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">Huminary Labs</span>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="mb-4 text-sm font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#agents" className="hover:text-foreground transition-colors">Agents</a></li>
                <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4 text-sm font-semibold">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#story" className="hover:text-foreground transition-colors">Our Story</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4 text-sm font-semibold">Connect</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://github.com" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                <li><a href="https://twitter.com" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                <li><a href="https://huminarylabs.com" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">Huminary Labs</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 border-t border-border/40 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
              <p>© {new Date().getFullYear()} Cleo. All rights reserved.</p>
              <p className="flex items-center gap-1">
                Built with ❤️ by
                <a 
                  href="https://huminarylabs.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-foreground transition-colors hover:text-primary"
                >
                  Huminary Labs
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

