import { 
  CloudIcon, 
  ClockIcon, 
  CalculatorIcon, 
  CurrencyCircleDollarIcon, 
  LightbulbIcon,
  MagnifyingGlassIcon,
  CalendarIcon
} from "@phosphor-icons/react"
import Image from "next/image"

// Map tool names to their corresponding icons
export const toolIconMap = {
  weather: CloudIcon,
  time: ClockIcon,
  calculator: CalculatorIcon,
  cryptoPrice: CurrencyCircleDollarIcon,
  randomFact: LightbulbIcon,
  webSearch: MagnifyingGlassIcon,
  listCalendarEvents: GoogleCalendarIcon,
  createCalendarEvent: GoogleCalendarIcon,
} as const

export type ToolName = keyof typeof toolIconMap

// Get icon component for a tool
export function getToolIcon(toolName: string) {
  const normalizedName = toolName as ToolName
  return toolIconMap[normalizedName] || MagnifyingGlassIcon // Default fallback
}

// Custom Google Calendar SVG icon component using the official icon
export function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/icons/google-calendar.svg" 
      alt="Google Calendar"
      className={className}
      width={16}
      height={16}
      priority // Para iconos que se muestran inmediatamente
    />
  )
}
