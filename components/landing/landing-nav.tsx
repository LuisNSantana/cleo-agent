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
import { getLandingCopy } from '@/lib/i18n/landing-copy'

export function LandingNav() {
  const router = useRouter()
  const { t, locale, setLocale } = useI18n()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobileQuery, setMobileQuery] = useState("")
  const copy = getLandingCopy(locale)
  // Cache-busting for logo assets (helps when replacing files with same name)
  const assetV = (process.env.NEXT_PUBLIC_ASSET_VERSION as string) || '3'

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = () => {
    router.push('/auth')
  }

  const handleStartFree = () => {
    router.push('/auth')
  }

  const handleGetStarted = () => {
    router.push('/auth')
  }

  const currentLang = languages.find((lang) => lang.code === locale)

  // Translations for buttons
  return (
    <motion.header
  className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/60 bg-background/95 dark:bg-[#050507]/95 backdrop-blur-xl"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="mx-auto flex h-16 w-full items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 max-w-[1920px]">
        {/* Logo */}
        <motion.div
          className="flex cursor-pointer items-center gap-2 sm:gap-3"
          whileHover={{ scale: 1.02 }}
          onClick={() => router.push('/')}
        >
          {/* Pure logo (no avatar chrome) */}
          <div className="flex h-3 w-auto items-center sm:h-4 md:h-5 lg:h-6 shrink-0">
            <Image
              src={`/img/logoankie.png?v=${assetV}`}
              alt="Ankie AI"
              width={84}
              height={24}
              priority
              className="h-full w-auto object-contain select-none"
              draggable={false}
              sizes="(max-width: 640px) 56px, (max-width: 768px) 72px, 84px"
            />
          </div>
          {/* Keep header compact: show only the logo image (no wordmark or subtitle) */}
        </motion.div>

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
          <LandingSearch placeholder={copy.nav.searchPlaceholder} />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 p-0"
            >
              {theme === 'dark' ? (
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
              variant="ghost" 
              size="sm" 
              onClick={handleLogin}
              className="text-foreground hover:bg-brand-cyan/10 h-9 text-xs lg:text-sm px-3 lg:px-4"
            >
              {mounted ? copy.nav.signIn : 'Sign In'}
            </Button>
            <Button
              size="sm"
              onClick={handleGetStarted}
              className="bg-brand-cyan text-[#04121A] shadow-lg shadow-brand-cyan/30 transition-all hover:scale-[1.02] hover:bg-[#0096DA] hover:shadow-brand-cyan/50 h-9 text-xs lg:text-sm px-3 lg:px-4"
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
          className="border-t border-border/60 bg-background/98 backdrop-blur-lg dark:bg-[#050507]/98 lg:hidden"
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
                placeholder={mounted ? copy.nav.searchPlaceholder : 'Search content…'}
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
              className="w-full justify-start border-border/70 text-foreground hover:bg-brand-cyan/10 hover:border-brand-cyan"
              onClick={() => {
                handleLogin()
                setMobileMenuOpen(false)
              }}
            >
              {mounted ? copy.nav.signIn : 'Sign In'}
            </Button>
            <Button
              className="w-full bg-brand-cyan text-[#04121A] hover:bg-[#0096DA] shadow-lg shadow-brand-cyan/30"
              onClick={() => {
                handleGetStarted()
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
