"use client"

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useI18n, languages } from '@/lib/i18n'
import { List, X, Moon, Sun } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LandingNav() {
  const router = useRouter()
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = () => {
    router.push('/auth')
  }

  const handleGetStarted = () => {
    router.push('/chat/guest')
  }

  const currentLang = languages.find((lang) => lang.code === locale)

  // Translations for buttons
  const getButtonText = (key: 'signIn' | 'getStarted') => {
    const translations = {
      signIn: {
        en: 'Sign In',
        es: 'Iniciar Sesión',
        pt: 'Entrar',
        fr: 'Se connecter',
        it: 'Accedi',
        de: 'Anmelden',
        ja: 'ログイン',
        ko: '로그인',
        zh: '登录',
        ar: 'تسجيل الدخول'
      },
      getStarted: {
        en: 'Try Cleo Free →',
        es: 'Prueba Cleo Gratis →',
        pt: 'Experimente Grátis →',
        fr: 'Essayez Gratuitement →',
        it: 'Prova Gratis →',
        de: 'Kostenlos Testen →',
        ja: '無料で試す →',
        ko: '무료 체험 →',
        zh: '免费试用 →',
        ar: 'جرب مجاناً ←'
      }
    }
    return translations[key][locale] || translations[key].en
  }

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
  <nav className="mx-auto flex max-w-screen-2xl 2xl:max-w-[90rem] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-2 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          onClick={() => router.push('/')}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-primary/20 shadow-lg">
            <img 
              src="/img/agents/logocleo4.png" 
              alt="Cleo AI"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-xl font-bold text-foreground">Cleo</span>
        </motion.div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {mounted ? (locale === 'es' ? 'Características' : locale === 'pt' ? 'Recursos' : locale === 'fr' ? 'Fonctionnalités' : 'Features') : 'Features'}
          </a>
          <a
            href="#agents"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {mounted ? (locale === 'es' ? 'Agentes' : locale === 'pt' ? 'Agentes' : locale === 'fr' ? 'Agents' : 'Agents') : 'Agents'}
          </a>
          <a
            href="#benefits"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {mounted ? (locale === 'es' ? 'Beneficios' : locale === 'pt' ? 'Benefícios' : locale === 'fr' ? 'Avantages' : 'Benefits') : 'Benefits'}
          </a>
          <button
            onClick={() => router.push('/docs')}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
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
              <Button variant="ghost" size="sm" className="gap-2">
                <span>{mounted ? currentLang?.flag : '🌐'}</span>
                <span className="hidden sm:inline">{mounted ? currentLang?.code.toUpperCase() : 'EN'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.slice(0, 4).map((lang) => (
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
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" onClick={handleLogin}>
              {mounted ? getButtonText('signIn') : 'Sign In'}
            </Button>
            <Button size="sm" onClick={handleGetStarted} className="shadow-md">
              {mounted ? getButtonText('getStarted') : 'Get Started'}
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X weight="bold" /> : <List weight="bold" />}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          className="border-t border-border/40 bg-background/95 backdrop-blur-lg md:hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="space-y-1 px-4 py-4">
            <a
              href="#features"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#agents"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Agents
            </a>
            <a
              href="#benefits"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Benefits
            </a>
            <button
              onClick={() => {
                router.push('/docs')
                setMobileMenuOpen(false)
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Docs
            </button>
            <div className="my-4 border-t border-border/40" />
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                handleLogin()
                setMobileMenuOpen(false)
              }}
            >
              {mounted ? getButtonText('signIn') : 'Sign In'}
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                handleGetStarted()
                setMobileMenuOpen(false)
              }}
            >
              {mounted ? getButtonText('getStarted') : 'Get Started'}
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
