"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useI18n, languages } from '@/lib/i18n'
import { List, X, Moon, Sun } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LandingSearch } from '@/components/landing/landing-search'
import { useLandingCopy } from '@/lib/i18n/use-landing-copy'

export function LandingNav() {
  const router = useRouter()
  const { locale, setLocale } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobileQuery, setMobileQuery] = useState("")
  const copy = useLandingCopy(locale)
  const searchPlaceholder = mounted ? copy.nav.searchPlaceholder : 'Search content…'
  const currentTheme = resolvedTheme ?? 'light'
  // Cache-busting for logo assets (helps when replacing files with same name)
  const assetV = (process.env.NEXT_PUBLIC_ASSET_VERSION as string) || '3'

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = () => router.push('/auth')
  const handlePrimaryCta = () => router.push('/auth')

  const currentLang = languages.find((lang) => lang.code === locale)

  // Translations for buttons
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/40 bg-background/80 text-foreground backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="mx-auto flex h-16 w-full items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 max-w-[1920px]">
        {/* Logo */}
        <motion.button
          className="flex cursor-pointer items-center gap-3 rounded-full border border-transparent px-2 py-1 text-left transition hover:border-border/40"
          whileHover={{ scale: 1.02 }}
          onClick={() => router.push('/')}
          aria-label="Ir al inicio"
        >
          <div className="flex h-5 w-auto items-center sm:h-5 md:h-6 lg:h-7 shrink-0">
            <Image
              src={`/img/logoankie.png?v=${assetV}`}
              alt="Ankie AI logo"
              width={96}
              height={28}
              priority
              className="h-full w-auto select-none object-contain"
              draggable={false}
              sizes="(max-width: 640px) 64px, (max-width: 768px) 84px, 96px"
            />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Ankie AI
          </span>
        </motion.button>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-3 xl:gap-5 lg:flex">
          <a
            href="#features"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-brand-cyan"
          >
            {mounted ? copy.nav.features : 'Features'}
          </a>
          <a
            href="#agents"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-brand-cyan"
          >
            {mounted ? copy.nav.agents : 'Agents'}
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-brand-cyan"
          >
            {mounted ? (locale === 'es' ? 'Precios' : locale === 'pt' ? 'Preços' : locale === 'fr' ? 'Tarifs' : 'Pricing') : 'Pricing'}
          </a>
          <a
            href="#benefits"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-brand-cyan"
          >
            {mounted ? copy.nav.benefits : 'Benefits'}
          </a>
        </div>

        {/* Landing search (desktop) - more compact */}
        <div className="hidden lg:flex lg:ml-4 xl:ml-6">
          <LandingSearch placeholder={searchPlaceholder} />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Cambiar tema"
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 p-0 text-foreground"
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-5 w-5" weight="duotone" />
              ) : (
                <Moon className="h-5 w-5" weight="duotone" />
              )}
            </Button>
          )}

          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-9">
                <span>{mounted ? currentLang?.flag : '🌐'}</span>
                <span className="hidden sm:inline text-xs">{mounted ? currentLang?.code.toUpperCase() : 'EN'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  className="gap-2"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop buttons */}
          <div className="hidden items-center gap-2 lg:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogin}
              className="h-9 px-4 text-sm font-semibold border-2 border-foreground/10 bg-foreground/5 text-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200"
            >
              {mounted ? copy.nav.signIn : 'Sign In'}
            </Button>
            <Button
              size="sm"
              onClick={handlePrimaryCta}
              className="h-9 px-4 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgba(0,118,255,0.39)] hover:shadow-[0_6px_20px_rgba(0,118,255,0.23)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
              }}
            >
              {mounted ? copy.nav.getStarted : 'Get Started'}
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X weight="bold" /> : <List weight="bold" />}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          className="border-t border-border/40 bg-background/95 backdrop-blur-lg lg:hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="space-y-1 px-4 py-4">
            {/* Mobile search */}
            <div className="mb-2">
              <input
                value={mobileQuery}
                onChange={(e) => setMobileQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && mobileQuery.trim()) {
                    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-landing-search]'))
                    const q = mobileQuery.toLowerCase()
                    const match = nodes.find((n) => (n.dataset.landingSearchTitle || n.innerText).toLowerCase().includes(q))
                    if (match) {
                      setMobileMenuOpen(false)
                      setTimeout(() => match.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20"
              />
            </div>
            <a
              href="#pricing"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-brand-cyan/10 hover:text-brand-cyan"
              onClick={() => setMobileMenuOpen(false)}
            >
              {mounted ? (locale === 'es' ? 'Precios' : locale === 'pt' ? 'Preços' : locale === 'fr' ? 'Tarifs' : 'Pricing') : 'Pricing'}
            </a>
            <a
              href="#features"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-brand-cyan/10 hover:text-brand-cyan"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#agents"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-brand-cyan/10 hover:text-brand-cyan"
              onClick={() => setMobileMenuOpen(false)}
            >
              Agents
            </a>
            <a
              href="#benefits"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-brand-cyan/10 hover:text-brand-cyan"
              onClick={() => setMobileMenuOpen(false)}
            >
              Benefits
            </a>
            <div className="my-4 border-t border-[#E5E5E5] dark:border-[#2F2F2F]" />
            <Button
              variant="outline"
              className="w-full justify-center border-2 border-foreground/10 bg-foreground/5 text-foreground font-semibold hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200"
              onClick={() => {
                handleLogin()
                setMobileMenuOpen(false)
              }}
            >
              {mounted ? copy.nav.signIn : 'Sign In'}
            </Button>
            <Button
              className="w-full font-semibold text-white bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-magenta shadow-lg"
              onClick={() => {
                handlePrimaryCta()
                setMobileMenuOpen(false)
              }}
            >
              {mounted ? copy.nav.getStarted : 'Get Started'}
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
