import { useMemo } from "react"
import { Locale } from "./translations"
import { getLandingCopy, LandingCopy } from "./landing-copy"

export function useLandingCopy(locale: Locale): LandingCopy {
  return useMemo(() => getLandingCopy(locale), [locale])
}
