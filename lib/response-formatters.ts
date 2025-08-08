/**
 * Response formatters for tools to provide richer, more organized output
 */

// ============================================================================
// DRIVE FILES FORMATTER
// ============================================================================

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  kind: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  lastModifyingUser?: { displayName: string; emailAddress: string };
}

interface FormattedDriveSection {
  type: string;
  icon: string;
  files: DriveFile[];
  count: number;
}

export function formatDriveResults(files: DriveFile[], language: 'es' | 'en' = 'es'): {
  summary: string;
  sections: FormattedDriveSection[];
  suggestions: string[];
} {
  if (!files.length) {
    const messages = {
      es: {
        summary: "No se encontraron archivos en tu Google Drive.",
        suggestions: [
          "Intenta usar términos de búsqueda diferentes",
          "Verifica que tienes permisos para ver los archivos",
          "Explora otras carpetas o ubicaciones"
        ]
      },
      en: {
        summary: "No files found in your Google Drive.",
        suggestions: [
          "Try using different search terms",
          "Check that you have permissions to view the files",
          "Explore other folders or locations"
        ]
      }
    };
    
    return {
      summary: messages[language].summary,
      sections: [],
      suggestions: messages[language].suggestions
    };
  }

  // Group files by type
  const fileGroups: Record<string, DriveFile[]> = {};
  
  files.forEach(file => {
    const type = getFileTypeCategory(file.mimeType);
    if (!fileGroups[type]) {
      fileGroups[type] = [];
    }
    fileGroups[type].push(file);
  });

  // Create formatted sections
  const sections: FormattedDriveSection[] = Object.entries(fileGroups).map(([type, typeFiles]) => ({
    type: getFileTypeDisplay(type, language),
    icon: getFileTypeIcon(type),
    files: typeFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()),
    count: typeFiles.length
  }));

  // Sort sections by file count (most files first)
  sections.sort((a, b) => b.count - a.count);

  const totalFiles = files.length;
  const recentFiles = files.filter(f => {
    const modifiedDate = new Date(f.modifiedTime);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return modifiedDate > weekAgo;
  }).length;

  const messages = {
    es: {
      summary: `Encontré **${totalFiles}** archivo${totalFiles === 1 ? '' : 's'} en tu Google Drive` +
        (recentFiles > 0 ? `, incluyendo **${recentFiles}** modificado${recentFiles === 1 ? '' : 's'} en la última semana.` : '.'),
      suggestions: [
        "🔗 Haz clic en cualquier archivo para abrirlo",
        "📁 ¿Necesitas organizar estos archivos en carpetas?",
        "🔍 ¿Quieres buscar archivos más específicos?",
        "📤 ¿Te gustaría compartir alguno de estos archivos?"
      ]
    },
    en: {
      summary: `Found **${totalFiles}** file${totalFiles === 1 ? '' : 's'} in your Google Drive` +
        (recentFiles > 0 ? `, including **${recentFiles}** modified in the last week.` : '.'),
      suggestions: [
        "🔗 Click on any file to open it",
        "📁 Need to organize these files into folders?",
        "🔍 Want to search for more specific files?",
        "📤 Would you like to share any of these files?"
      ]
    }
  };

  return { 
    summary: messages[language].summary, 
    sections, 
    suggestions: messages[language].suggestions 
  };
}

function getFileTypeCategory(mimeType: string): string {
  if (mimeType.includes('document') || mimeType.includes('text')) return 'documents';
  if (mimeType.includes('spreadsheet')) return 'spreadsheets';
  if (mimeType.includes('presentation')) return 'presentations';
  if (mimeType.includes('image')) return 'images';
  if (mimeType.includes('video')) return 'videos';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdfs';
  if (mimeType.includes('folder')) return 'folders';
  return 'other';
}

function getFileTypeDisplay(type: string, language: 'es' | 'en' = 'es'): string {
  const displays = {
    es: {
      documents: 'Documentos',
      spreadsheets: 'Hojas de cálculo',
      presentations: 'Presentaciones',
      images: 'Imágenes',
      videos: 'Videos',
      audio: 'Audio',
      pdfs: 'PDFs',
      folders: 'Carpetas',
      other: 'Otros archivos'
    },
    en: {
      documents: 'Documents',
      spreadsheets: 'Spreadsheets',
      presentations: 'Presentations',
      images: 'Images',
      videos: 'Videos',
      audio: 'Audio',
      pdfs: 'PDFs',
      folders: 'Folders',
      other: 'Other files'
    }
  };
  
  return displays[language][type as keyof typeof displays.es] || (language === 'es' ? 'Archivos' : 'Files');
}

function getFileTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    documents: '📄',
    spreadsheets: '📊',
    presentations: '📋',
    images: '🖼️',
    videos: '🎥',
    audio: '🎵',
    pdfs: '📕',
    folders: '📁',
    other: '📎'
  };
  return icons[type] || '📄';
}

// ============================================================================
// CALENDAR EVENTS FORMATTER
// ============================================================================

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  organizer?: { email: string; displayName?: string };
  status: string;
  htmlLink?: string;
  created: string;
  updated: string;
}

interface FormattedCalendarDay {
  date: string;
  displayDate: string;
  events: CalendarEvent[];
  isToday: boolean;
  isWeekend: boolean;
}

export function formatCalendarResults(events: CalendarEvent[], language: 'es' | 'en' = 'es'): {
  summary: string;
  days: FormattedCalendarDay[];
  suggestions: string[];
} {
  if (!events.length) {
    const messages = {
      es: {
        summary: "No hay eventos próximos en tu calendario.",
        suggestions: [
          "🗓️ ¿Quieres crear un nuevo evento?",
          "📅 ¿Necesitas revisar eventos pasados?",
          "⏰ ¿Te gustaría configurar recordatorios?"
        ]
      },
      en: {
        summary: "No upcoming events in your calendar.",
        suggestions: [
          "🗓️ Want to create a new event?",
          "📅 Need to review past events?",
          "⏰ Would you like to set up reminders?"
        ]
      }
    };
    
    return {
      summary: messages[language].summary,
      days: [],
      suggestions: messages[language].suggestions
    };
  }

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  events.forEach(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    const dateKey = eventDate.toISOString().split('T')[0];
    
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  // Create formatted days
  const days: FormattedCalendarDay[] = Object.entries(eventsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayEvents]) => {
      const date = new Date(dateKey);
      const isToday = date.getTime() === today.getTime();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      return {
        date: dateKey,
        displayDate: formatDisplayDate(date, isToday, language),
        events: dayEvents.sort((a, b) => {
          const timeA = a.start.dateTime || a.start.date || '';
          const timeB = b.start.dateTime || b.start.date || '';
          return timeA.localeCompare(timeB);
        }),
        isToday,
        isWeekend
      };
    });

  const totalEvents = events.length;
  const todayEvents = eventsByDate[today.toISOString().split('T')[0]]?.length || 0;
  const upcomingDays = days.length;

  const messages = {
    es: {
      summary: `Tienes **${totalEvents}** evento${totalEvents === 1 ? '' : 's'} próximo${totalEvents === 1 ? '' : 's'}` +
        (todayEvents > 0 ? `, incluyendo **${todayEvents}** para hoy` : '') +
        (upcomingDays > 1 ? ` distribuidos en **${upcomingDays}** día${upcomingDays === 1 ? '' : 's'}` : '') + '.',
      suggestions: [
        "📝 ¿Necesitas crear un nuevo evento?",
        "⏰ ¿Quieres ajustar horarios o recordatorios?",
        "👥 ¿Te gustaría invitar a alguien más?",
        "🔗 Haz clic en cualquier evento para ver más detalles"
      ]
    },
    en: {
      summary: `You have **${totalEvents}** upcoming event${totalEvents === 1 ? '' : 's'}` +
        (todayEvents > 0 ? `, including **${todayEvents}** for today` : '') +
        (upcomingDays > 1 ? ` across **${upcomingDays}** day${upcomingDays === 1 ? '' : 's'}` : '') + '.',
      suggestions: [
        "📝 Need to create a new event?",
        "⏰ Want to adjust times or reminders?",
        "👥 Would you like to invite someone else?",
        "🔗 Click on any event to see more details"
      ]
    }
  };

  return { 
    summary: messages[language].summary, 
    days, 
    suggestions: messages[language].suggestions 
  };
}

function formatDisplayDate(date: Date, isToday: boolean, language: 'es' | 'en' = 'es'): string {
  if (isToday) {
    return language === 'es' ? '🌟 Hoy' : '🌟 Today';
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  if (date.getTime() === tomorrow.getTime()) {
    return language === 'es' ? '⭐ Mañana' : '⭐ Tomorrow';
  }

  if (language === 'es') {
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    return `${weekday}, ${day} de ${month}`;
  } else {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    return `${weekday}, ${month} ${day}th`;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '';
  
  const size = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (isNaN(size)) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = size;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(fileSize * 10) / 10} ${units[unitIndex]}`;
}

export function formatRelativeTime(dateString: string, language: 'es' | 'en' = 'es'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (language === 'es') {
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) === 1 ? '' : 's'}`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) === 1 ? '' : 'es'}`;
    return `Hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) === 1 ? '' : 's'}`;
  } else {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
  }
}

export function formatEventTime(start: any, end: any, language: 'es' | 'en' = 'es'): string {
  if (!start) return '';
  
  const startDate = new Date(start.dateTime || start.date);
  const endDate = new Date(end?.dateTime || end?.date);
  
  // All-day event
  if (start.date && !start.dateTime) {
    return language === 'es' ? '📅 Todo el día' : '📅 All day';
  }
  
  // Regular event with time
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const use12Hour = language === 'en';
  
  const startTime = startDate.toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: use12Hour 
  });
  
  const endTime = endDate.toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: use12Hour
  });
  
  return `🕐 ${startTime} - ${endTime}`;
}
