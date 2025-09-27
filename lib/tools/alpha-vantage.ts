import { tool } from 'ai'
import { z } from 'zod'

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VENTAGE_API_KEY
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

async function alphaVantageRequest(params: Record<string, string>) {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VENTAGE_API_KEY not configured')
  }

  const url = new URL(ALPHA_VANTAGE_BASE_URL)
  url.searchParams.append('apikey', ALPHA_VANTAGE_API_KEY)
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage Error: ${data['Error Message']}`)
  }
  
  if (data['Note']) {
    throw new Error(`Alpha Vantage Rate Limit: ${data['Note']}`)
  }

  return data
}

export const getStockTimeSeresTool = tool({
  description: 'Get stock time series data (intraday, daily, weekly, monthly) with technical analysis',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)'),
    function: z.enum(['TIME_SERIES_INTRADAY', 'TIME_SERIES_DAILY', 'TIME_SERIES_WEEKLY', 'TIME_SERIES_MONTHLY']).default('TIME_SERIES_DAILY').describe('Type of time series data'),
    interval: z.enum(['1min', '5min', '15min', '30min', '60min']).optional().describe('Interval for intraday data'),
    outputsize: z.enum(['compact', 'full']).default('compact').describe('Data size (compact = last 100 points, full = 20+ years)')
  }),
  execute: async ({ symbol, function: func = 'TIME_SERIES_DAILY', interval, outputsize = 'compact' }) => {
    try {
      const params: Record<string, string> = {
        function: func,
        symbol: symbol.toUpperCase(),
        outputsize
      }
      
      if (func === 'TIME_SERIES_INTRADAY' && interval) {
        params.interval = interval
      }
      
      const data = await alphaVantageRequest(params)
      return {
        success: true,
        data,
        symbol: symbol.toUpperCase(),
        function: func,
        outputsize
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

export const getTechnicalIndicatorTool = tool({
  description: 'Get technical indicators like RSI, MACD, SMA, EMA, Bollinger Bands for stock analysis',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)'),
    function: z.enum(['RSI', 'MACD', 'SMA', 'EMA', 'BBANDS', 'ADX', 'CCI', 'AROON', 'STOCH']).describe('Technical indicator function'),
    interval: z.enum(['1min', '5min', '15min', '30min', '60min', 'daily', 'weekly', 'monthly']).default('daily').describe('Time interval'),
    time_period: z.number().default(14).describe('Time period for indicator calculation'),
    series_type: z.enum(['close', 'open', 'high', 'low']).default('close').describe('Price series to use')
  }),
  execute: async ({ symbol, function: func, interval = 'daily', time_period = 14, series_type = 'close' }) => {
    try {
      const params: Record<string, string> = {
        function: func,
        symbol: symbol.toUpperCase(),
        interval,
        time_period: time_period.toString(),
        series_type
      }
      
      const data = await alphaVantageRequest(params)
      return {
        success: true,
        data,
        symbol: symbol.toUpperCase(),
        indicator: func,
        interval,
        time_period
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

export const getCompanyOverviewTool = tool({
  description: 'Get comprehensive company overview including fundamentals, valuation ratios, and financial metrics',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)')
  }),
  execute: async ({ symbol }) => {
    try {
      const data = await alphaVantageRequest({
        function: 'OVERVIEW',
        symbol: symbol.toUpperCase()
      })
      
      return {
        success: true,
        data,
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

export const getEarningsTool = tool({
  description: 'Get quarterly and annual earnings data for fundamental analysis',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, MSFT, TSLA)')
  }),
  execute: async ({ symbol }) => {
    try {
      const data = await alphaVantageRequest({
        function: 'EARNINGS',
        symbol: symbol.toUpperCase()
      })
      
      return {
        success: true,
        data,
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

export const getForexRatesTool = tool({
  description: 'Get real-time and historical forex exchange rates',
  inputSchema: z.object({
    from_currency: z.string().describe('Base currency code (e.g., USD, EUR, GBP)'),
    to_currency: z.string().describe('Target currency code (e.g., USD, EUR, GBP)'),
    function: z.enum(['CURRENCY_EXCHANGE_RATE', 'FX_DAILY', 'FX_WEEKLY', 'FX_MONTHLY']).default('CURRENCY_EXCHANGE_RATE').describe('Type of forex data')
  }),
  execute: async ({ from_currency, to_currency, function: func = 'CURRENCY_EXCHANGE_RATE' }) => {
    try {
      const data = await alphaVantageRequest({
        function: func,
        from_symbol: from_currency.toUpperCase(),
        to_symbol: to_currency.toUpperCase()
      })
      
      return {
        success: true,
        data,
        from_currency: from_currency.toUpperCase(),
        to_currency: to_currency.toUpperCase(),
        function: func
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        from_currency: from_currency.toUpperCase(),
        to_currency: to_currency.toUpperCase()
      }
    }
  }
})

export const getCryptoPricesTool = tool({
  description: 'Get cryptocurrency prices and technical analysis data',
  inputSchema: z.object({
    symbol: z.string().describe('Cryptocurrency symbol (e.g., BTC, ETH, ADA)'),
    market: z.string().default('USD').describe('Market currency (e.g., USD, EUR)'),
    function: z.enum(['DIGITAL_CURRENCY_DAILY', 'DIGITAL_CURRENCY_WEEKLY', 'DIGITAL_CURRENCY_MONTHLY']).default('DIGITAL_CURRENCY_DAILY').describe('Type of crypto data')
  }),
  execute: async ({ symbol, market = 'USD', function: func = 'DIGITAL_CURRENCY_DAILY' }) => {
    try {
      const data = await alphaVantageRequest({
        function: func,
        symbol: symbol.toUpperCase(),
        market: market.toUpperCase()
      })
      
      return {
        success: true,
        data,
        symbol: symbol.toUpperCase(),
        market: market.toUpperCase(),
        function: func
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

export const getEconomicIndicatorsTool = tool({
  description: 'Get economic indicators like GDP, inflation, unemployment rate, federal funds rate',
  inputSchema: z.object({
    function: z.enum(['REAL_GDP', 'INFLATION', 'UNEMPLOYMENT', 'FEDERAL_FUNDS_RATE', 'CPI', 'TREASURY_YIELD']).describe('Economic indicator type'),
    interval: z.enum(['annual', 'quarterly', 'monthly']).default('quarterly').describe('Data frequency')
  }),
  execute: async ({ function: func, interval = 'quarterly' }) => {
    try {
      const data = await alphaVantageRequest({
        function: func,
        interval
      })
      
      return {
        success: true,
        data,
        indicator: func,
        interval
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        indicator: func
      }
    }
  }
})

export const alphaVantageTools = {
  getStockTimeSeries: getStockTimeSeresTool,
  getTechnicalIndicator: getTechnicalIndicatorTool,
  getCompanyOverview: getCompanyOverviewTool,
  getEarnings: getEarningsTool,
  getForexRates: getForexRatesTool,
  getCryptoPrices: getCryptoPricesTool,
  getEconomicIndicators: getEconomicIndicatorsTool
}