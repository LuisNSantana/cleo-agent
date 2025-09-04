import { tool } from 'ai';
import { z } from 'zod';
import { webSearchTool } from './web-search';
import { listCalendarEventsTool, createCalendarEventTool } from './google-calendar';
import { listDriveFilesTool, searchDriveFilesTool, getDriveFileDetailsTool, createDriveFolderTool, uploadFileToDriveTool } from './google-drive';
import { createDocumentTool } from './create-document';
import { openDocumentTool } from './open-document';
import { memoryAddNoteTool } from './memory';
import { gmailTools, listGmailMessagesTool, getGmailMessageTool, sendGmailMessageTool, trashGmailMessageTool, modifyGmailLabelsTool } from './google-gmail';
import { shopifyTools, shopifyGetProductsTool, shopifyGetOrdersTool, shopifyGetAnalyticsTool, shopifyGetCustomersTool, shopifySearchProductsTool, shopifyUpdateProductPriceTool } from './shopify';

// Types used by tools in this module
interface WeatherResult {
  location: string;
  temperature: number;
  unit: 'celsius' | 'fahrenheit';
  condition?: string;
  humidity?: string;
  windSpeed?: string;
  icon?: string;
  timestamp: string;
}

type WeatherCacheEntry = { data: WeatherResult; expiry: number };

// Grouped exports for better modularity and maintainability
// Utility Tools: General purpose (weather, time, etc.)
// Search Tools: Web and data retrieval
// Google Tools: Calendar and Drive integrations
// Document Tools: Creation and management
// Memory Tools: Note-taking

// Utility Tools

// Weather tool - Enhanced with error handling, caching, and company-specific defaults (e.g., Madrid for Huminary Labs)
export const weatherTool = tool({
  description: 'Get current weather information for any location worldwide. Provides temperature, conditions, humidity, and wind speed. Defaults to Madrid for Huminary Labs if no location specified.',
  inputSchema: z.object({
    location: z.string().min(1).default('Madrid').describe('The city or location (e.g., "Madrid", "New York"). Defaults to Madrid.'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().default('celsius').describe('Temperature unit.'),
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
  execute: async ({ location = 'Madrid', unit = 'celsius' }) => {
    // Ensure location is a string before calling toLowerCase to avoid TS "possibly undefined"
    const loc = String(location)
    const unitsParam = unit === 'fahrenheit' ? 'imperial' : 'metric'
    const cacheKey = `${loc.toLowerCase()}-${unitsParam}`
    const now = Date.now()
    const cached = weatherCache[cacheKey]
    if (cached && cached.expiry > now) {
      return cached.data
    }

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      return { error: 'Weather API not configured' }
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(loc)}&units=${unitsParam}&lang=es&appid=${apiKey}`

    try {
      const res = await fetch(url, { next: { revalidate: 600 } })  // ISR for 10 min (Next.js optimization)
      if (!res.ok) {
        if (res.status === 404) return { error: `Location "${loc}" not found` }
        throw new Error(`API error ${res.status}`)
      }
      const data = await res.json() as any
      const result: WeatherResult = {
        location: `${data.name}, ${data.sys?.country ?? ''}`.trim(),
        temperature: data.main?.temp,
        unit,
        condition: data.weather?.[0]?.description,
        humidity: data.main?.humidity ? `${data.main.humidity}%` : undefined,
        windSpeed: data.wind?.speed ? `${data.wind.speed} ${unit === 'fahrenheit' ? 'mph' : 'm/s'}` : undefined,
        icon: data.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : undefined,
        timestamp: new Date(data.dt * 1000).toISOString(),
      }
      weatherCache[cacheKey] = { data: result, expiry: now + 15 * 60 * 1000 }  // 15 min cache
      return result
    } catch (error) {
      console.error('[Weather] Failed:', error)
      return { error: 'Unable to fetch weather. Try again or check location.' }
    }
  }
});

// Time tool - Optimized with company timezones (e.g., Madrid default)
export const timeTool = tool({
  description: 'Get current time for a specific timezone or location. Defaults to Europe/Madrid for Huminary Labs.',
  inputSchema: z.object({
    timezone: z.string().default('Europe/Madrid').describe('Timezone (e.g., "Europe/Madrid") or city.'),
  }),
  execute: async ({ timezone }) => {
    try {
      // Expanded city mapping with Huminary-relevant locations
      const cityToTimezone: Record<string, string> = {
        madrid: 'Europe/Madrid',
        barcelona: 'Europe/Madrid',
        london: 'Europe/London',
        paris: 'Europe/Paris',
        berlin: 'Europe/Berlin',
        rome: 'Europe/Rome',
        'new york': 'America/New_York',
        'los angeles': 'America/Los_Angeles',
        tokyo: 'Asia/Tokyo',
        // Add more as needed
      };
      
      const normalized = String(timezone ?? 'Europe/Madrid').toLowerCase();
      const actualTimezone = cityToTimezone[normalized] || timezone || 'Europe/Madrid';
      
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
        error: `Invalid timezone: ${String(timezone ?? 'Europe/Madrid')}`,
        validExamples: ['Europe/Madrid', 'America/New_York', 'madrid', 'new york'],
      };
    }
  },
});

// Calculator tool - Enhanced with advanced functions and error handling
export const calculatorTool = tool({
  description: 'Perform mathematical calculations, including advanced functions like trig, logs, matrices. Useful for Huminary Labs data analysis.',
  inputSchema: z.object({
    expression: z.string().describe('Math expression (e.g., "2 + 3 * 4", "sin(30)", "log(100)", "matrix operations via numpy if needed").'),
  }),
  execute: async ({ expression }) => {
    try {
      // Safe eval with Math and limited scope
      const safeExpression = expression
        .replace(/[^0-9+\-*/.^(), sin cos tan log abs sqrt pi e ]/g, '') // Strict whitelist
        .replace(/\b(sin|cos|tan|log|abs|sqrt)\b/g, 'Math.$1')
        .replace(/pi/g, 'Math.PI')
        .replace(/e/g, 'Math.E');
      
      const result = new Function(`return ${safeExpression}`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result');
      }
      
      return {
        expression,
        result,
        formattedResult: result.toFixed(4),  // Precision for analysis
      };
    } catch (error) {
      return {
        error: `Cannot calculate "${expression}". Use valid math.`,
        examples: ['2 + 3 * 4 (Huminary revenue calc)', 'sin(30)', 'log(100) for error rates'],
      };
    }
  },
});

// Crypto price tool - Optimized with batch support for multiple coins
export const cryptoPriceTool = tool({
  description: 'Get real-time cryptocurrency prices and 24h changes using CoinGecko. Supports multiple coins for Huminary Labs portfolio tracking.',
  inputSchema: z.object({
    coinIds: z.array(z.string()).default(['bitcoin']).describe('Coin ids (e.g., ["bitcoin", "ethereum"])'),
    vsCurrency: z.string().default('usd').describe('Currency (usd, eur, btc).'),
  }),
  execute: async ({ coinIds, vsCurrency }) => {
    try {
      const safeCoinIds = coinIds ?? ['bitcoin']
      const currency = vsCurrency ?? 'usd' // ensure a defined currency for indexing
      const ids = safeCoinIds.join(',')
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`CoinGecko error ${res.status}`)
      const data: Record<string, Record<string, number>> = await res.json()
      
      const results = safeCoinIds.map(id => ({
        coinId: id,
        vsCurrency: currency,
        price: data[id]?.[currency] ?? null,
        change24h: data[id]?.[`${currency}_24h_change`] ?? null,
        timestamp: new Date().toISOString(),
      }))
      
      return { results }
    } catch {
      return { error: 'Unable to fetch prices' }
    }
  },
});

// Random fact tool - Customized with Huminary Labs categories (e.g., AI facts)
export const randomFactTool = tool({
  description: 'Get a random interesting fact. Includes Huminary Labs-relevant categories like AI and tech.',
  inputSchema: z.object({
    category: z.enum(['general', 'science', 'history', 'nature', 'technology', 'space', 'ai'])
      .optional()
      .default('general')
      .describe('Category of fact.'),
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
      ai: [  // New category for Huminary Labs
        "Huminary Labs' Cleo AI can process complex queries in seconds, simplifying developers' workflows.",
        "AI models like those at Huminary Labs can analyze millions of data points faster than traditional methods.",
        "Huminary Labs focuses on ethical AI, ensuring tools like Cleo prioritize user privacy and accuracy.",
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

// Task completion tool - For specialist agents to signal task completion
export const completeTaskTool = tool({
  description: 'Signal that a specialist task has been completed and results are ready for final synthesis. Used by specialist agents to return control to the supervisor.',
  inputSchema: z.object({
    summary: z.string().describe('Brief summary of the completed work'),
    status: z.enum(['completed', 'ready', 'done']).default('completed').describe('Task completion status'),
    nextSteps: z.string().optional().describe('Suggested next steps or follow-up actions'),
  }),
  execute: async ({ summary, status, nextSteps }) => {
    return {
      taskCompleted: true,
      status,
      summary,
      nextSteps: nextSteps || null,
      timestamp: new Date().toISOString(),
      message: `Task ${status}: ${summary}${nextSteps ? ` Next steps: ${nextSteps}` : ''}`,
    };
  },
});

// Export all tools as a collection with categories for modularity
export const tools = {
  // Core Web Search
  webSearch: webSearchTool,
  
  // Date/Time
  getCurrentDateTime: timeTool,
  
  // Weather
  weatherInfo: weatherTool,
  
  // Math
  calculator: calculatorTool,
  
  // Crypto
  cryptoPrices: cryptoPriceTool,
  
  // Random Fun
  randomFact: randomFactTool,

  // Task Management
  complete_task: completeTaskTool,

  // Document Tools
  createDocument: createDocumentTool,
  openDocument: openDocumentTool,

  // Google Tools - Calendar
  listCalendarEvents: listCalendarEventsTool,
  createCalendarEvent: createCalendarEventTool,

  // Google Tools - Drive
  listDriveFiles: listDriveFilesTool,
  searchDriveFiles: searchDriveFilesTool,
  getDriveFileDetails: getDriveFileDetailsTool,
  createDriveFolder: createDriveFolderTool,
  uploadFileToDrive: uploadFileToDriveTool,

  // Google Tools - Gmail
  listGmailMessages: listGmailMessagesTool,
  getGmailMessage: getGmailMessageTool,
  sendGmailMessage: sendGmailMessageTool,
  trashGmailMessage: trashGmailMessageTool,
  modifyGmailLabels: modifyGmailLabelsTool,
  
  // Memory Tools
  memoryAddNote: memoryAddNoteTool,

  // Shopify Tools - E-commerce
  shopifyGetProducts: shopifyGetProductsTool,
  shopifyGetOrders: shopifyGetOrdersTool,
  shopifyGetAnalytics: shopifyGetAnalyticsTool,
  shopifyGetCustomers: shopifyGetCustomersTool,
  shopifySearchProducts: shopifySearchProductsTool,
  shopifyUpdateProductPrice: shopifyUpdateProductPriceTool,
};

export type ToolName = keyof typeof tools;

// Simple cache for weather (moved outside tool for global access if needed)
const weatherCache: Record<string, { data: WeatherResult; expiry: number }> = {};