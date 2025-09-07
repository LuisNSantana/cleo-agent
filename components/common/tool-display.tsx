import React from 'react'
import { GoogleCalendarIcon } from '@/components/icons/google-calendar'
import Icon from '@/components/icons/google'

interface ToolWithIcon {
  name: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  description: string
  category: 'productivity' | 'utility' | 'information' | 'research'
}

export const availableTools: ToolWithIcon[] = [
  {
    name: 'Google Calendar',
    icon: GoogleCalendarIcon,
    description: 'View and create calendar events',
    category: 'productivity'
  },
  {
    name: 'serpGeneralSearch',
    icon: ({ className, size = 24 }: { className?: string; size?: number }) => (
      <Icon className={className} width={size} height={size} />
    ),
    description: 'General Google search with structured results',
    category: 'research'
  },
  {
    name: 'serpNewsSearch',
    icon: ({ className, size = 24 }: { className?: string; size?: number }) => (
      <Icon className={className} width={size} height={size} />
    ),
    description: 'Google News search for recent articles',
    category: 'research'
  },
  {
    name: 'serpScholarSearch',
    icon: ({ className, size = 24 }: { className?: string; size?: number }) => (
      <Icon className={className} width={size} height={size} />
    ),
    description: 'Google Scholar search for academic papers',
    category: 'research'
  },
  {
    name: 'serpAutocomplete',
    icon: ({ className, size = 24 }: { className?: string; size?: number }) => (
      <Icon className={className} width={size} height={size} />
    ),
    description: 'Google search autocomplete suggestions',
    category: 'research'
  },
  {
    name: 'serpLocationSearch',
    icon: ({ className, size = 24 }: { className?: string; size?: number }) => (
      <Icon className={className} width={size} height={size} />
    ),
    description: 'Google Maps location and business search',
    category: 'research'
  },
  {
    name: 'serpRaw',
    icon: ({ className, size = 24 }: { className?: string; size?: number }) => (
      <Icon className={className} width={size} height={size} />
    ),
    description: 'Raw SerpAPI search with custom parameters',
    category: 'research'
  }
]

interface ToolDisplayProps {
  tool: ToolWithIcon
  onClick?: () => void
  className?: string
}

export function ToolDisplay({ tool, onClick, className = '' }: ToolDisplayProps) {
  const IconComponent = tool.icon
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors ${className}`}
      onClick={onClick}
    >
      <IconComponent size={24} className="flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{tool.name}</h3>
        <p className="text-sm text-gray-600">{tool.description}</p>
      </div>
    </div>
  )
}

interface ToolGridProps {
  tools?: ToolWithIcon[]
  onToolSelect?: (tool: ToolWithIcon) => void
  className?: string
}

export function ToolGrid({ 
  tools = availableTools, 
  onToolSelect, 
  className = '' 
}: ToolGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {tools.map((tool, index) => (
        <ToolDisplay
          key={index}
          tool={tool}
          onClick={() => onToolSelect?.(tool)}
        />
      ))}
    </div>
  )
}

export default ToolGrid
