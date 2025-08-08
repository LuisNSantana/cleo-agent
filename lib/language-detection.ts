/**
 * Language detection utilities for automatic language adaptation
 */

export type SupportedLanguage = 'es' | 'en';

/**
 * Detects the language of a text string
 * Returns 'es' for Spanish, 'en' for English
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English for empty text
  }

  const normalizedText = text.toLowerCase().trim();

  // Spanish indicators (more specific patterns first)
  const spanishIndicators = [
    // Common Spanish words and phrases
    'gracias', 'hola', 'buenos días', 'buenas tardes', 'buenas noches',
    'por favor', 'disculpa', 'perdón', 'cómo', 'qué', 'cuál', 'cuándo',
    'dónde', 'por qué', 'porque', 'sí', 'también', 'muy', 'más',
    'menos', 'bien', 'mal', 'bueno', 'malo', 'grande', 'pequeño',
    'nuevo', 'viejo', 'joven', 'mayor', 'menor', 'mejor', 'peor',
    'primero', 'último', 'cada', 'todo', 'todos', 'nada', 'algo',
    'alguien', 'nadie', 'siempre', 'nunca', 'ahora', 'después',
    'antes', 'aquí', 'allí', 'arriba', 'abajo', 'dentro', 'fuera',
    
    // Spanish action words
    'necesito', 'quiero', 'puedes', 'ayuda', 'ayudar', 'hacer',
    'crear', 'escribir', 'buscar', 'encontrar', 'mostrar', 'ver',
    'abrir', 'cerrar', 'guardar', 'borrar', 'cambiar', 'editar',
    
    // Spanish file/document related
    'archivo', 'documento', 'carpeta', 'ensayo', 'artículo',
    'historia', 'cuento', 'reporte', 'informe', 'guía', 'manual',
    
    // Spanish calendar/time related
    'calendario', 'evento', 'reunión', 'cita', 'horario', 'fecha',
    'hora', 'día', 'semana', 'mes', 'año', 'hoy', 'mañana', 'ayer',
    
    // Spanish Drive related
    'archivos', 'documentos', 'fotos', 'imágenes', 'videos',
    'música', 'descargar', 'compartir', 'subir',
    
    // Spanish question words and connectors
    'y', 'o', 'pero', 'sin embargo', 'aunque', 'si', 'entonces',
    'para', 'por', 'con', 'sin', 'de', 'del', 'en', 'sobre',
    
    // Spanish tech terms
    'correo', 'email', 'internet', 'página', 'sitio', 'web',
    'aplicación', 'programa', 'software', 'datos', 'información'
  ];

  // English indicators
  const englishIndicators = [
    // Common English words and phrases
    'thanks', 'thank you', 'hello', 'hi', 'good morning', 'good afternoon',
    'good evening', 'please', 'sorry', 'excuse me', 'how', 'what',
    'which', 'when', 'where', 'why', 'because', 'yes', 'also', 'very',
    'more', 'less', 'well', 'good', 'bad', 'big', 'small',
    'new', 'old', 'young', 'older', 'younger', 'better', 'worse',
    'first', 'last', 'each', 'all', 'nothing', 'something',
    'someone', 'nobody', 'always', 'never', 'now', 'after',
    'before', 'here', 'there', 'above', 'below', 'inside', 'outside',
    
    // English action words
    'i need', 'i want', 'can you', 'help', 'do', 'make',
    'create', 'write', 'search', 'find', 'show', 'see',
    'open', 'close', 'save', 'delete', 'change', 'edit',
    
    // English file/document related
    'file', 'document', 'folder', 'essay', 'article',
    'story', 'report', 'guide', 'manual',
    
    // English calendar/time related
    'calendar', 'event', 'meeting', 'appointment', 'schedule', 'date',
    'time', 'day', 'week', 'month', 'year', 'today', 'tomorrow', 'yesterday',
    
    // English Drive related
    'files', 'documents', 'photos', 'images', 'videos',
    'music', 'download', 'share', 'upload',
    
    // English question words and connectors
    'and', 'or', 'but', 'however', 'although', 'if', 'then',
    'for', 'with', 'without', 'of', 'in', 'on', 'about',
    
    // English tech terms
    'email', 'internet', 'page', 'site', 'website',
    'application', 'app', 'program', 'software', 'data', 'information'
  ];

  // Count Spanish indicators
  let spanishScore = 0;
  for (const indicator of spanishIndicators) {
    if (normalizedText.includes(indicator)) {
      spanishScore += indicator.length; // Longer matches get higher scores
    }
  }

  // Count English indicators
  let englishScore = 0;
  for (const indicator of englishIndicators) {
    if (normalizedText.includes(indicator)) {
      englishScore += indicator.length;
    }
  }

  // Spanish-specific character patterns (ñ, accents)
  const spanishCharacters = /[ñáéíóúü]/g;
  const spanishCharMatches = (normalizedText.match(spanishCharacters) || []).length;
  spanishScore += spanishCharMatches * 3; // Weight Spanish characters heavily

  // Common Spanish verb endings and patterns
  const spanishPatterns = /\b\w*(ar|er|ir|ando|iendo|ción|sión|dad|mente)\b/g;
  const spanishPatternMatches = (normalizedText.match(spanishPatterns) || []).length;
  spanishScore += spanishPatternMatches * 2;

  // Common English patterns
  const englishPatterns = /\b\w*(ing|ed|tion|sion|ly|ness)\b/g;
  const englishPatternMatches = (normalizedText.match(englishPatterns) || []).length;
  englishScore += englishPatternMatches * 2;

  // Articles and determiners (strong indicators)
  if (/\b(el|la|los|las|un|una|unos|unas)\b/.test(normalizedText)) {
    spanishScore += 5;
  }
  if (/\b(the|a|an)\b/.test(normalizedText)) {
    englishScore += 5;
  }

  // Return the language with higher score, defaulting to English for ties
  return spanishScore > englishScore ? 'es' : 'en';
}

/**
 * Detects language from user message and previous context
 */
export function detectUserLanguage(
  currentMessage: string, 
  previousMessages: string[] = []
): SupportedLanguage {
  // First, try to detect from current message
  if (currentMessage && currentMessage.trim().length > 0) {
    const currentLang = detectLanguage(currentMessage);
    
    // If current message has strong indicators, use it
    const hasStrongIndicators = 
      /[ñáéíóúü]/.test(currentMessage) || // Spanish accents
      /\b(gracias|hola|por favor|ayuda|necesito|quiero)\b/i.test(currentMessage) || // Strong Spanish
      /\b(thanks|thank you|hello|please|help|i need|i want)\b/i.test(currentMessage); // Strong English
    
    if (hasStrongIndicators) {
      return currentLang;
    }
  }

  // If current message is ambiguous, check previous messages
  if (previousMessages.length > 0) {
    const recentMessages = previousMessages.slice(-3); // Check last 3 messages
    const combinedText = recentMessages.join(' ') + ' ' + currentMessage;
    return detectLanguage(combinedText);
  }

  // Default to the current message detection or English
  return currentMessage ? detectLanguage(currentMessage) : 'en';
}

/**
 * Gets appropriate greeting based on detected language
 */
export function getGreeting(language: SupportedLanguage): string {
  const greetings = {
    es: '¡Hola! ¿En qué puedo ayudarte hoy?',
    en: 'Hello! How can I help you today?'
  };
  
  return greetings[language];
}

/**
 * Gets appropriate error message based on language
 */
export function getErrorMessage(language: SupportedLanguage, type: 'general' | 'permission' | 'notFound' = 'general'): string {
  const messages = {
    es: {
      general: 'Lo siento, algo salió mal. ¿Puedes intentar de nuevo?',
      permission: 'No tengo permisos para acceder a esa información.',
      notFound: 'No pude encontrar lo que buscas.'
    },
    en: {
      general: 'Sorry, something went wrong. Can you try again?',
      permission: "I don't have permission to access that information.",
      notFound: "I couldn't find what you're looking for."
    }
  };
  
  return messages[language][type];
}

/**
 * Helper to format numbers with appropriate language
 */
export function formatNumber(num: number, language: SupportedLanguage): string {
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  return num.toLocaleString(locale);
}
