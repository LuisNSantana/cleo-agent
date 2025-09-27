import { tool } from 'ai'
import { z } from 'zod'

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'

async function fmpRequest(endpoint: string, params: Record<string, string> = {}) {
  if (!FMP_API_KEY) {
    throw new Error('FMP_API_KEY not configured')
  }

  const url = new URL(`${FMP_BASE_URL}${endpoint}`)
  url.searchParams.append('apikey', FMP_API_KEY)
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export const getStockQuoteTool = tool({
  description: 'Get real-time stock quote including price, volume, market cap, and key metrics',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)')
  }),
  execute: async ({ symbol }) => {
    try {
      const data = await fmpRequest(`/quote/${symbol.toUpperCase()}`)
      return {
        success: true,
        data: data[0] || null,
        symbol: symbol.toUpperCase()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol.toUpperCase()
      }
    }
  }
})

export const getCompanyProfileTool = tool({
  description: 'Get comprehensive company profile including business description, sector, industry, and key metrics',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)')
  }),
  execute: async ({ symbol }) => {
    try {
      const data = await fmpRequest(`/profile/${symbol.toUpperCase()}`)
      return {
        success: true,
        data: data[0] || null,
        symbol: symbol.toUpperCase()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol.toUpperCase()
      }
    }
  }
})

export const getFinancialStatementsTool = tool({
  description: 'Get income statement, balance sheet, or cash flow statement for a company',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)'),
    statement: z.enum(['income-statement', 'balance-sheet-statement', 'cash-flow-statement']).describe('Type of financial statement'),
    period: z.enum(['annual', 'quarter']).default('annual').describe('Annual or quarterly data'),
    limit: z.number().default(5).describe('Number of periods to return (1-100)')
  }),
  execute: async ({ symbol, statement, period = 'annual', limit = 5 }) => {
    try {
      const data = await fmpRequest(`/${statement}/${symbol.toUpperCase()}`, {
        period,
        limit: limit.toString()
      })
      return {
        success: true,
        data: data || [],
        symbol: symbol.toUpperCase(),
        statement,
        period
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol.toUpperCase()
      }
    }
  }
})

export const getFinancialRatiosTool = tool({
  description: 'Get key financial ratios including P/E, ROE, ROA, debt ratios, and profitability metrics',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)'),
    period: z.enum(['annual', 'quarter']).default('annual').describe('Annual or quarterly ratios'),
    limit: z.number().default(5).describe('Number of periods to return')
  }),
  execute: async ({ symbol, period = 'annual', limit = 5 }) => {
    try {
      const data = await fmpRequest(`/ratios/${symbol.toUpperCase()}`, {
        period,
        limit: limit.toString()
      })
      return {
        success: true,
        data: data || [],
        symbol: symbol.toUpperCase(),
        period
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol.toUpperCase()
      }
    }
  }
})

export const getDCFValuationTool = tool({
  description: 'Get Discounted Cash Flow (DCF) valuation analysis for a stock',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)')
  }),
  execute: async ({ symbol }) => {
    try {
      const data = await fmpRequest(`/discounted-cash-flow/${symbol.toUpperCase()}`)
      return {
        success: true,
        data: data[0] || null,
        symbol: symbol.toUpperCase()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol.toUpperCase()
      }
    }
  }
})

export const getMarketCapTool = tool({
  description: 'Get historical market capitalization data for analysis',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)'),
    limit: z.number().default(100).describe('Number of data points to return')
  }),
  execute: async ({ symbol, limit = 100 }) => {
    try {
      const data = await fmpRequest(`/historical-market-capitalization/${symbol.toUpperCase()}`, {
        limit: limit.toString()
      })
      return {
        success: true,
        data: data || [],
        symbol: symbol.toUpperCase()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol.toUpperCase()
      }
    }
  }
})

export const getEarningsCalendarTool = tool({
  description: 'Get upcoming earnings announcements and historical earnings data',
  inputSchema: z.object({
    symbol: z.string().optional().describe('Optional stock symbol to filter by specific company'),
    from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    to: z.string().optional().describe('End date in YYYY-MM-DD format')
  }),
  execute: async ({ symbol, from, to }) => {
    try {
      let endpoint = '/earning_calendar'
      const params: Record<string, string> = {}
      
      if (from) params.from = from
      if (to) params.to = to
      if (symbol) {
        endpoint = `/historical/earning_calendar/${symbol.toUpperCase()}`
      }
      
      const data = await fmpRequest(endpoint, params)
      return {
        success: true,
        data: data || [],
        symbol: symbol?.toUpperCase(),
        dateRange: { from, to }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol?.toUpperCase()
      }
    }
  }
})

export const getStockNewsTool = tool({
  description: 'Get latest news articles for a specific stock or general market news',
  inputSchema: z.object({
    symbol: z.string().optional().describe('Stock symbol for company-specific news (optional)'),
    limit: z.number().default(10).describe('Number of news articles to return (1-100)')
  }),
  execute: async ({ symbol, limit = 10 }) => {
    try {
      let endpoint = '/stock_news'
      const params = { limit: limit.toString() }
      
      if (symbol) {
        endpoint = `/stock_news?tickers=${symbol.toUpperCase()}`
      }
      
      const data = await fmpRequest(endpoint, params)
      return {
        success: true,
        data: data || [],
        symbol: symbol?.toUpperCase()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: symbol?.toUpperCase()
      }
    }
  }
})

export const financialModelingPrepTools = {
  getStockQuote: getStockQuoteTool,
  getCompanyProfile: getCompanyProfileTool,
  getFinancialStatements: getFinancialStatementsTool,
  getFinancialRatios: getFinancialRatiosTool,
  getDCFValuation: getDCFValuationTool,
  getMarketCap: getMarketCapTool,
  getEarningsCalendar: getEarningsCalendarTool,
  getStockNews: getStockNewsTool
}