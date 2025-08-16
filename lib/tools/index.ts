import { tool } from 'ai';
import { z } from 'zod';
import { webSearchTool } from './web-search';
import { listCalendarEventsTool, createCalendarEventTool } from './google-calendar';
import { listDriveFilesTool, searchDriveFilesTool, getDriveFileDetailsTool, createDriveFolderTool, uploadFileToDriveTool } from './google-drive';
import { createDocumentTool } from './create-document';
import { memoryAddNoteTool } from './memory';

// simple in-memory cache { key: data, expiry }
interface WeatherResult {
  location: string
  temperature: number
  unit: 'celsius' | 'fahrenheit'
  condition?: string
  humidity?: string
  windSpeed?: string
  icon?: string
  timestamp: string
  error?: string
}
const weatherCache: Record<string, { data: WeatherResult; expiry: number }> = {};

// Weather tool - simulates weather data
export const weatherTool = tool({
  description: 'Get current weather information for any location worldwide. Provides temperature, conditions, humidity, and wind speed.',
  inputSchema: z.object({
    location: z.string().min(1).describe('The city or location to get weather for (e.g., "Madrid", "New York", "London")'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().default('celsius').describe('Temperature unit preference'),
  }),
  outputSchema: z.union([
    z.object({
      location: z.string(),
      temperature: z.number(),
      unit: z.enum(['celsius', 'fahrenheit']),
      condition: z.string().optional(),
      humidity: z.string().optional(),
      windSpeed: z.string().optional(),
      icon: z.string().optional(),
      timestamp: z.string(),
    }),
    z.object({
      error: z.string(),
    })
  ]),
  execute: async ({ location, unit }) => {
    const unitsParam = unit === 'fahrenheit' ? 'imperial' : 'metric'
    const cacheKey = `${location.toLowerCase()}-${unitsParam}`
    const now = Date.now()
    const cached = weatherCache[cacheKey]
    if (cached && cached.expiry > now) {
      return cached.data
    }

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      return { error: 'OPENWEATHER_API_KEY not configured on server' }
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      location
    )}&units=${unitsParam}&lang=es&appid=${apiKey}`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 404) {
          return { error: `Ciudad "${location}" no encontrada` }
        }
        return { error: `OpenWeather error ${res.status}` }
      }
      const data = (await res.json()) as any
      const result: WeatherResult = {
        location: `${data.name}, ${data.sys?.country ?? ''}`.trim(),
        temperature: data.main?.temp,
        unit: unit || 'celsius',
        condition: data.weather?.[0]?.description,
        humidity: data.main?.humidity ? `${data.main.humidity}%` : undefined,
        windSpeed: data.wind?.speed
          ? `${data.wind.speed} ${unit === 'fahrenheit' ? 'mph' : 'm/s'}`
          : undefined,
        icon: data.weather?.[0]?.icon
          ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
          : undefined,
        timestamp: new Date((data.dt ?? Math.floor(now / 1000)) * 1000).toISOString(),
      }
      weatherCache[cacheKey] = { data: result, expiry: now + 10 * 60 * 1000 } // 10 min
      return result
    } catch {
      return { error: 'No se pudo obtener el clima. Verifica tu conexión o API key.' }
    }
  }
});

// Time tool - gets current time for different timezones
export const timeTool = tool({
  description: 'Get current time for a specific timezone or location',
  inputSchema: z.object({
    timezone: z.string().describe('Timezone (e.g., "Europe/Madrid", "America/New_York", "Asia/Tokyo") or city name'),
  }),
  execute: async ({ timezone }) => {
    try {
      // Map common city names to timezones
      const cityToTimezone: Record<string, string> = {
        'madrid': 'Europe/Madrid',
        'barcelona': 'Europe/Madrid',
        'london': 'Europe/London',
        'paris': 'Europe/Paris',
        'berlin': 'Europe/Berlin',
        'rome': 'Europe/Rome',
        'new york': 'America/New_York',
        'los angeles': 'America/Los_Angeles',
        'chicago': 'America/Chicago',
        'tokyo': 'Asia/Tokyo',
        'beijing': 'Asia/Shanghai',
        'sydney': 'Australia/Sydney',
        'mumbai': 'Asia/Kolkata',
      };
      
      const normalizedInput = timezone.toLowerCase();
      const actualTimezone = cityToTimezone[normalizedInput] || timezone;
      
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: actualTimezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
      
      return {
        timezone: actualTimezone,
        currentTime: formatter.format(now),
        utcTime: now.toISOString(),
        timestamp: now.getTime(),
      };
    } catch (error) {
      return {
        error: `Invalid timezone: ${timezone}`,
        validExamples: ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo', 'madrid', 'london', 'tokyo'],
      };
    }
  },
});

// Calculator tool - performs basic math operations
export const calculatorTool = tool({
  description: 'Perform mathematical calculations and operations',
  inputSchema: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 3 * 4", "sqrt(16)", "sin(30)")'),
  }),
  execute: async ({ expression }) => {
    try {
      // Basic security: only allow safe mathematical operations
      const safeExpression = expression
        .replace(/[^0-9+\-*/.^(), ]/g, '') // Allow commas and exponent symbol
        .replace(/\b(sqrt|sin|cos|tan|log|abs|floor|ceil|round|pow)\b/g, 'Math.$1'); // Add Math. prefix
      
      // Use Function constructor for safer evaluation than eval
      const result = new Function('Math', `return ${safeExpression}`)(Math);
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid calculation result');
      }
      
      return {
        expression: expression,
        result: result,
        formattedResult: result.toString(),
      };
    } catch (error) {
      return {
        error: `Cannot calculate "${expression}". Please use valid mathematical expressions.`,
        examples: ['2 + 3 * 4', '(10 + 5) / 3', 'sqrt(16)', 'sin(30)'],
      };
    }
  },
});

// Random fact tool - provides interesting random facts
// Crypto price tool - fetches current crypto prices (CoinGecko)
export const cryptoPriceTool = tool({
  description: 'Get real-time cryptocurrency price and 24h change using CoinGecko',
  inputSchema: z.object({
    coinId: z.string().describe('Coin id on CoinGecko (e.g., "bitcoin", "ethereum", "dogecoin")'),
    vsCurrency: z.string().default('usd').describe('Fiat or crypto currency (e.g., usd, eur, cop, btc) to compare against').transform((v) => v.toLowerCase()),
  }),
  execute: async ({ coinId, vsCurrency }) => {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${vsCurrency}&include_24hr_change=true`
      const res = await fetch(url)
      if (!res.ok) return { error: `CoinGecko error ${res.status}` }
      const data: Record<string, Record<string, number>> = await res.json()
      if (!data[coinId]) return { error: `Coin id "${coinId}" not found` }
      
      const currency = vsCurrency || 'usd'
      return {
        coinId,
        vsCurrency: currency,
        price: data[coinId][currency],
        change24h: (data[coinId] as Record<string, number>)[`${currency}_24h_change`],
        timestamp: new Date().toISOString(),
      }
    } catch {
      return { error: 'Unable to fetch price from CoinGecko' }
    }
  },
})

export const randomFactTool = tool({
  description: 'Get a random interesting fact on various topics',
  inputSchema: z.object({
    category: z.enum(['general', 'science', 'history', 'nature', 'technology', 'space'])
      .optional()
      .default('general')
      .describe('Category of fact to retrieve'),
  }),
  execute: async ({ category }) => {
    const facts = {
      general: [
        "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
        "A group of flamingos is called a 'flamboyance'.",
        "The shortest war in history lasted only 38-45 minutes between Britain and Zanzibar in 1896.",
      ],
      science: [
        "A single cloud can weigh more than a million pounds.",
        "Your stomach gets an entirely new lining every 3-5 days because stomach acid would otherwise digest it.",
        "There are more possible games of chess than there are atoms in the observable universe.",
      ],
      history: [
        "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid of Giza.",
        "The Great Wall of China isn't visible from space with the naked eye, despite popular belief.",
        "Napoleon Bonaparte was actually average height for his time at 5'7\".",
      ],
      nature: [
        "Octopuses have three hearts and blue blood.",
        "A shrimp's heart is in its head.",
        "Butterflies taste with their feet and smell with their antennae.",
      ],
      technology: [
        "The first computer bug was an actual bug - a moth trapped in a Harvard computer in 1947.",
        "More than 90% of the world's currency exists only on computers.",
        "The first webcam was created to monitor a coffee pot at Cambridge University.",
      ],
      space: [
        "One day on Venus is longer than one year on Venus.",
        "Jupiter has 95 known moons, with four large ones discovered by Galileo in 1610.",
        "If you could drive a car to space at highway speeds, it would take about an hour to reach space.",
      ],
    };
    
    const categoryFacts = facts[category as keyof typeof facts] ?? facts.general;
    const randomFact = categoryFacts[Math.floor(Math.random() * categoryFacts.length)];
    
    return {
      category,
      fact: randomFact,
      timestamp: new Date().toISOString(),
    };
  },
});

// Export all tools as a collection
export const tools = {
  weather: weatherTool,
  time: timeTool,
  calculator: calculatorTool,
  cryptoPrice: cryptoPriceTool,
  randomFact: randomFactTool,
  webSearch: webSearchTool,
  createDocument: createDocumentTool,
  listCalendarEvents: listCalendarEventsTool,
  createCalendarEvent: createCalendarEventTool,
  listDriveFiles: listDriveFilesTool,
  searchDriveFiles: searchDriveFilesTool,
  getDriveFileDetails: getDriveFileDetailsTool,
  createDriveFolder: createDriveFolderTool,
  uploadFileToDrive: uploadFileToDriveTool,
  memoryAddNote: memoryAddNoteTool,
};

export type ToolName = keyof typeof tools;
