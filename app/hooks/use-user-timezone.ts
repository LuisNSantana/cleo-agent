import { useEffect, useState } from 'react'

/**
 * Hook para detectar automáticamente el timezone del usuario
 * Usa las mejores prácticas con Intl.DateTimeFormat para obtener
 * el timezone IANA correcto del usuario
 */
export function useUserTimezone() {
  const [timezone, setTimezone] = useState<string>('UTC')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      // Método más confiable para obtener el timezone del usuario
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      console.log('🌍 Timezone detectado automáticamente:', {
        timezone: userTimezone,
        offset: new Date().getTimezoneOffset(),
        date: new Date().toLocaleString(),
        method: 'Intl.DateTimeFormat().resolvedOptions().timeZone'
      })
      
      setTimezone(userTimezone)
    } catch (error) {
      console.warn('Error detectando timezone del usuario, usando UTC como fallback:', error)
      setTimezone('UTC')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Función para obtener el nombre amigable del timezone
  const getTimezoneDisplayName = (tz: string = timezone) => {
    try {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: tz,
        timeZoneName: 'long'
      })
      
      const parts = formatter.formatToParts(now)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value
      
      // Obtener también el offset actual
      const offset = getTimezoneOffset(tz)
      
      return `${timeZoneName} (${tz}) ${offset}`
    } catch {
      return tz
    }
  }

  // Función para obtener el offset del timezone en formato legible
  const getTimezoneOffset = (tz: string = timezone) => {
    try {
      const now = new Date()
      const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }))
      const localDate = new Date(now.toLocaleString("en-US", { timeZone: tz }))
      const offsetMinutes = (localDate.getTime() - utcDate.getTime()) / 1000 / 60
      
      const hours = Math.floor(Math.abs(offsetMinutes) / 60)
      const minutes = Math.abs(offsetMinutes) % 60
      const sign = offsetMinutes >= 0 ? '+' : '-'
      
      return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch {
      return 'UTC+00:00'
    }
  }

  // Función para verificar si el timezone soporta DST
  const supportsDST = (tz: string = timezone) => {
    try {
      const january = new Date(2024, 0, 1)
      const july = new Date(2024, 6, 1)
      
      const janOffset = getTimezoneOffsetMinutes(tz, january)
      const julOffset = getTimezoneOffsetMinutes(tz, july)
      
      return janOffset !== julOffset
    } catch {
      return false
    }
  }

  const getTimezoneOffsetMinutes = (tz: string, date: Date) => {
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }))
    const localDate = new Date(date.toLocaleString("en-US", { timeZone: tz }))
    return (localDate.getTime() - utcDate.getTime()) / 1000 / 60
  }

  return {
    timezone,
    isLoading,
    getTimezoneDisplayName,
    getTimezoneOffset,
    supportsDST: supportsDST(),
    // Función para formatear fecha en el timezone del usuario
    formatInUserTimezone: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
        ...options
      })
    }
  }
}