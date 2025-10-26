/**
 * Cleo Landing Page Color Palette - 2025
 * 
 * Based on modern SaaS best practices:
 * - Primary: Tech Blue for trust & action
 * - Secondary: Modern Purple for AI/intelligence
 * - Dark backgrounds for elegance
 * - High contrast for clarity
 */

export const colorPalette = {
  // Primary colors
  primary: {
    main: '#2563EB',      // Tech Blue - CTAs, interactive elements
    light: '#3B82F6',     // Lighter blue for hover states
    dark: '#1D4ED8',      // Darker for active states
  },
  
  // Secondary colors
  secondary: {
    main: '#6366F1',      // Modern Purple - AI accents, intelligence icons
    light: '#818CF8',     // Lighter purple
    dark: '#4F46E5',      // Darker purple
  },
  
  // Background colors
  background: {
    main: '#0B0F19',      // Primary dark background
    secondary: '#111827',  // Alternative dark sections
    card: '#1F2937',      // Card backgrounds
    elevated: '#374151',  // Hover/elevated states
  },
  
  // Text colors
  text: {
    primary: '#F9FAFB',   // High contrast main text
    secondary: '#9CA3AF', // Subtitles, descriptions
    muted: '#6B7280',     // Muted text, labels
  },
  
  // Accent colors for specific agents
  agents: {
    emma: {
      gradient: 'from-pink-500 to-rose-500',
      hex: '#EC4899',
    },
    toby: {
      gradient: 'from-blue-500 to-cyan-500',
      hex: '#3B82F6',
    },
    nora: {
      gradient: 'from-purple-500 to-indigo-500',
      hex: '#8B5CF6',
    },
    apu: {
      gradient: 'from-green-500 to-emerald-500',
      hex: '#10B981',
    },
    peter: {
      gradient: 'from-orange-500 to-amber-500',
      hex: '#F59E0B',
    },
    wex: {
      gradient: 'from-slate-600 to-gray-700',
      hex: '#64748B',
    },
    ami: {
      gradient: 'from-yellow-500 to-orange-500',
      hex: '#EAB308',
    },
    cleo: {
      gradient: 'from-violet-500 to-purple-600',
      hex: '#8B5CF6',
    },
  },
  
  // UI states
  states: {
    success: '#10B981',   // Green
    warning: '#F59E0B',   // Amber
    error: '#EF4444',     // Red
    info: '#3B82F6',      // Blue
  },
  
  // Borders
  border: {
    main: 'rgba(99, 102, 241, 0.2)',     // Primary with opacity
    subtle: 'rgba(156, 163, 175, 0.1)',  // Very subtle
    strong: 'rgba(99, 102, 241, 0.4)',   // Strong borders
  },
}

/**
 * Tailwind CSS classes for the color palette
 * Use these for consistent styling across components
 */
export const tw = {
  // Primary buttons & CTAs
  button: {
    primary: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg shadow-[#2563EB]/25',
    secondary: 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-lg shadow-[#6366F1]/25',
    outline: 'border-2 border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white',
  },
  
  // Backgrounds
  bg: {
    main: 'bg-[#0B0F19]',
    secondary: 'bg-[#111827]',
    card: 'bg-[#1F2937]',
    elevated: 'bg-[#374151]',
  },
  
  // Text
  text: {
    primary: 'text-[#F9FAFB]',
    secondary: 'text-[#9CA3AF]',
    muted: 'text-[#6B7280]',
  },
  
  // Borders
  border: {
    main: 'border-[#6366F1]/20',
    subtle: 'border-gray-400/10',
    strong: 'border-[#6366F1]/40',
  },
  
  // Gradients
  gradient: {
    primary: 'bg-gradient-to-r from-[#2563EB] to-[#6366F1]',
    hero: 'bg-gradient-to-br from-[#0B0F19] via-[#1F2937] to-[#6366F1]/10',
    cta: 'bg-gradient-to-r from-[#2563EB] via-[#6366F1] to-[#8B5CF6]',
  },
}
