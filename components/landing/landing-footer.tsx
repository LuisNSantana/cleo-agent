"use client"

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useI18n } from '@/lib/i18n'
import { getLandingCopy } from '@/lib/i18n/landing-copy'

export function LandingFooter() {
  const { locale } = useI18n()
  const copy = getLandingCopy(locale)

  return (
    <footer className="border-t border-border/40 bg-[#0D0D0D] px-4 py-16 text-[#F9F6F2] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-primary/40 bg-white shadow-lg shadow-primary/20">
                <img src="/img/kyliologo.png" alt="Kylio" className="h-full w-full object-cover" />
              </div>
              <span className="text-xl font-bold uppercase tracking-[0.2em] text-[#A38CFF]">Kylio</span>
            </div>
            <p className="mb-4 text-sm text-[#C9C6E8]">{copy.footer.tagline}</p>
            <div className="flex items-center gap-2 text-xs text-[#C9C6E8]">
              <span>{copy.footer.poweredBy}</span>
              <a
                href="https://huminarylabs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-[#1B1B1B] hover:text-white"
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage src="/img/logo_huminarylabs.png" alt="Huminary Labs" className="object-contain" />
                  <AvatarFallback className="bg-gradient-to-br from-[#A38CFF] to-[#64D2FF] text-[8px] text-white">
                    H
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">{copy.footer.huminary}</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#F9F6F2]">{copy.footer.product}</h3>
            <ul className="space-y-2 text-sm text-[#C9C6E8]">
              <li>
                <a href="#features" className="transition-colors hover:text-foreground">
                  {copy.footer.features}
                </a>
              </li>
              <li>
                <a href="#agents" className="transition-colors hover:text-foreground">
                  {copy.footer.agents}
                </a>
              </li>
              <li>
                <a href="/docs" className="transition-colors hover:text-foreground">
                  {copy.footer.documentation}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#F9F6F2]">{copy.footer.company}</h3>
            <ul className="space-y-2 text-sm text-[#C9C6E8]">
              <li>
                <a href="/privacy" className="transition-colors hover:text-foreground">
                  {copy.footer.privacy}
                </a>
              </li>
              <li>
                <a href="/terms" className="transition-colors hover:text-foreground">
                  {copy.footer.terms}
                </a>
              </li>
              <li>
                <a href="#story" className="transition-colors hover:text-foreground">
                  {copy.footer.story}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-[#F9F6F2]">{copy.footer.connect}</h3>
            <ul className="space-y-2 text-sm text-[#C9C6E8]">
              <li>
                <a
                  href="https://github.com"
                  className="transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.footer.github}
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com"
                  className="transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.footer.twitter}
                </a>
              </li>
              <li>
                <a
                  href="https://huminarylabs.com"
                  className="transition-colors hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.footer.huminary}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#2F2F2F] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-[#C9C6E8] sm:flex-row">
            <p>© {new Date().getFullYear()} Kylio. {copy.footer.rights}</p>
            <p className="flex items-center gap-1">
              {copy.footer.builtWith}
              <a
                href="https://huminarylabs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#F9F6F2] transition-colors hover:text-[#A38CFF]"
              >
                {copy.footer.huminary}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
