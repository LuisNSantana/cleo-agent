/**
 * Simple i18n hook for Cleo
 * Auto-detects browser language, no URL changes needed (like Grok)
 */

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Locale, type Translations, getTranslations } from './translations'

// Detect browser language
function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  
  const browserLang = navigator.language.toLowerCase()
  
  // Map browser locales to our supported locales
  if (browserLang.startsWith('es')) return 'es'
  if (browserLang.startsWith('pt')) return 'pt'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('it')) return 'it'
  if (browserLang.startsWith('de')) return 'de'
  if (browserLang.startsWith('ja')) return 'ja'
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('zh')) return 'zh'
  if (browserLang.startsWith('ar')) return 'ar'
  
  return 'en' // Default to English
}

interface I18nStore {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale: Locale) => {
        set({ locale, t: getTranslations(locale) })
      },
      t: getTranslations(detectBrowserLocale()),
    }),
    {
      name: 'cleo-locale',
      // Only persist locale, not translations (they're derived)
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        // Update translations when hydrating from storage
        if (state) {
          state.t = getTranslations(state.locale)
        }
      },
    }
  )
)

// Language metadata for UI
export const languages: Array<{ code: Locale; name: string; nativeName: string; flag: string }> = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
]
