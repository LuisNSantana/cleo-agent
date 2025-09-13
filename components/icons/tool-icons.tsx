import { 
  CloudIcon, 
  ClockIcon, 
  CalculatorIcon, 
  CurrencyCircleDollarIcon, 
  LightbulbIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  FolderIcon,
  FileIcon,
  MagnifyingGlassIcon as SearchIcon
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
  listDriveFiles: GoogleDriveIcon,
  searchDriveFiles: GoogleDriveIcon,
  getDriveFileDetails: GoogleDriveIcon,
  createDriveFolder: GoogleDriveIcon,
  uploadFileToDrive: GoogleDriveIcon,
  // Google Docs tools
  createGoogleDoc: GoogleDocsIcon,
  readGoogleDoc: GoogleDocsIcon,
  updateGoogleDoc: GoogleDocsIcon,
  // Google Sheets tools
  createGoogleSheet: GoogleSheetsIcon,
  readGoogleSheet: GoogleSheetsIcon,
  updateGoogleSheet: GoogleSheetsIcon,
  appendGoogleSheet: GoogleSheetsIcon,
  // Gmail tools
  listGmailMessages: GmailIcon,
  getGmailMessage: GmailIcon,
  sendGmailMessage: GmailIcon,
  trashGmailMessage: GmailIcon,
  modifyGmailLabels: GmailIcon,
  // Twitter/X tools
  postTweet: XTwitterIcon,
  generateTweet: XTwitterIcon,
  hashtagResearch: XTwitterIcon,
  twitterTrendsAnalysis: XTwitterIcon,
  twitterAnalytics: XTwitterIcon,
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

// Custom Google Drive SVG icon component using the official icon
export function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/icons/google-drive.svg" 
      alt="Google Drive"
      className={className}
      width={16}
      height={16}
      priority // Para iconos que se muestran inmediatamente
    />
  )
}

// Custom Gmail SVG icon component using the official icon
export function GmailIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/icons/gmail-icon.svg" 
      alt="Gmail"
      className={className}
      width={16}
      height={16}
      priority
    />
  )
}

// Custom Google Docs SVG icon component using the official icon
export function GoogleDocsIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/icons/google_docs.png" 
      alt="Google Docs"
      className={className}
      width={16}
      height={16}
      priority
    />
  )
}

// Custom Google Sheets SVG icon component using the official icon
export function GoogleSheetsIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/icons/sheets.png" 
      alt="Google Sheets"
      className={className}
      width={16}
      height={16}
      priority
    />
  )
}

// Custom X/Twitter icon component using the official icon
export function XTwitterIcon({ className }: { className?: string }) {
  return (
    <Image 
      src="/icons/x_twitter.png" 
      alt="X (Twitter)"
      className={className}
      width={16}
      height={16}
      priority
    />
  )
}
