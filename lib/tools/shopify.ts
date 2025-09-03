/**
 * Shopify E-commerce Tools
 * Comprehensive suite of tools for Shopify store management, analytics, and operations
 * Integrates with user-specific Shopify credentials for secure multi-store access
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getActiveShopifyCredentials, getDecryptedAccessToken } from '@/lib/shopify/credentials'
import { getCurrentUserIdForShopify } from '@/lib/shopify/user-context'

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

const ShopifyStoreSelector = z.object({
  store_identifier: z.string().default('default').describe('Identifier for the specific store (use "default" for primary store)')
})

const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  status: z.enum(['active', 'archived', 'draft']),
  vendor: z.string().optional(),
  product_type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  price: z.string(),
  compare_at_price: z.string().optional(),
  inventory_quantity: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
})

// =============================================================================
// SHOPIFY API CLIENT UTILITIES
// =============================================================================

/**
 * Get authenticated Shopify client for a user
 */
async function getShopifyClientForUser(userId: string, storeIdentifier?: string) {
  try {
    // Get active credentials for the user
    const credentialsResult = await getActiveShopifyCredentials(userId)
    
    if (!credentialsResult.success || !credentialsResult.credentials || credentialsResult.credentials.length === 0) {
      throw new Error('No Shopify store credentials found. Please configure your store credentials in the agent management section.')
    }

    // Find the specific store or use the first one
    let selectedCredential = credentialsResult.credentials[0]
    if (storeIdentifier && storeIdentifier !== 'default') {
      const found = credentialsResult.credentials.find(c => c.store_identifier === storeIdentifier)
      if (found) {
        selectedCredential = found
      }
    }

    // Get decrypted access token
    const tokenResult = await getDecryptedAccessToken(userId, selectedCredential.id)
    
    if (!tokenResult.success || !tokenResult.accessToken) {
      throw new Error('Failed to decrypt access token. Please check your store configuration.')
    }

    return {
      domain: selectedCredential.store_domain,
      accessToken: tokenResult.accessToken!,
      apiVersion: '2024-01',
      makeRequest: async (endpoint: string, options: RequestInit = {}) => {
        const url = `https://${selectedCredential.store_domain}/admin/api/2024-01/${endpoint}`
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'X-Shopify-Access-Token': tokenResult.accessToken!,
            'Content-Type': 'application/json',
            ...options.headers
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Shopify API Error (${response.status}): ${errorText}`)
        }

        return response.json()
      }
    }
  } catch (error) {
    throw new Error(`Failed to initialize Shopify client: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get user ID from context (placeholder - implement based on your auth system)
 */
async function getCurrentUserId(): Promise<string> {
  return await getCurrentUserIdForShopify()
}

// =============================================================================
// DATA FORMATTING UTILITIES
// =============================================================================

/**
 * Format product data for consistent output
 */
function formatProduct(product: any): any {
  const variant = product.variants?.[0] || {}
  
  return {
    id: product.id?.toString(),
    title: product.title,
    handle: product.handle,
    status: product.status,
    vendor: product.vendor,
    product_type: product.product_type,
    tags: product.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean) || [],
    price: variant.price || '0.00',
    compare_at_price: variant.compare_at_price,
    inventory_quantity: variant.inventory_quantity || 0,
    sku: variant.sku,
    barcode: variant.barcode,
    created_at: product.created_at,
    updated_at: product.updated_at
  }
}

/**
 * Format order data for consistent output
 */
function formatOrder(order: any): any {
  return {
    id: order.id?.toString(),
    order_number: order.order_number,
    email: order.email,
    total_price: order.total_price,
    subtotal_price: order.subtotal_price,
    total_tax: order.total_tax,
    currency: order.currency,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status || 'unfulfilled',
    customer: order.customer ? {
      id: order.customer.id?.toString(),
      email: order.customer.email,
      first_name: order.customer.first_name,
      last_name: order.customer.last_name
    } : null,
    line_items: order.line_items?.map((item: any) => ({
      id: item.id?.toString(),
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      total: (parseFloat(item.price) * item.quantity).toFixed(2)
    })) || [],
    created_at: order.created_at,
    updated_at: order.updated_at
  }
}

/**
 * Format customer data for consistent output
 */
function formatCustomer(customer: any): any {
  return {
    id: customer.id?.toString(),
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    orders_count: customer.orders_count || 0,
    total_spent: customer.total_spent || '0.00',
    tags: customer.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean) || [],
    state: customer.state,
    created_at: customer.created_at,
    updated_at: customer.updated_at
  }
}

// =============================================================================
// SHOPIFY TOOLS
// =============================================================================

/**
 * Get products from Shopify store
 * Retrieve and filter products with various parameters
 */
export const shopifyGetProductsTool = tool({
  description: 'Retrieve products from a Shopify store with filtering options. Can get active, draft, or archived products, filter by vendor, and limit results.',
  inputSchema: z.object({
    ...ShopifyStoreSelector.shape,
    limit: z.number().min(1).max(250).default(50).describe('Maximum number of products to retrieve'),
    status: z.enum(['active', 'archived', 'draft']).optional().describe('Filter products by status'),
    vendor: z.string().optional().describe('Filter products by vendor name'),
    searchTerm: z.string().optional().describe('Search term to filter products by title')
  }),
  execute: async ({ store_identifier = 'default', limit = 50, status, vendor, searchTerm }) => {
    try {
      const userId = await getCurrentUserId()
      const client = await getShopifyClientForUser(userId, store_identifier)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('limit', limit.toString())
      if (status) searchParams.set('status', status)
      if (vendor) searchParams.set('vendor', vendor)
      if (searchTerm) searchParams.set('title', searchTerm)

      const response = await client.makeRequest(`products.json?${searchParams.toString()}`)
      const products = response.products || []

      return {
        success: true,
        count: products.length,
        products: products.map((product: any) => formatProduct(product)),
        store_domain: client.domain,
        query: {
          limit,
          status,
          vendor,
          searchTerm
        }
      }
    } catch (error) {
      return {
        success: false,
        count: 0,
        products: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
})

/**
 * Get orders from Shopify store
 * Retrieve orders with various filtering options
 */
export const shopifyGetOrdersTool = tool({
  description: 'Retrieve orders from a Shopify store with filtering by status, payment status, and fulfillment status. Useful for order management and analytics.',
  inputSchema: z.object({
    ...ShopifyStoreSelector.shape,
    limit: z.number().min(1).max(250).default(50).describe('Maximum number of orders to retrieve'),
    status: z.enum(['open', 'closed', 'cancelled', 'any']).default('any').describe('Filter orders by status'),
    financial_status: z.enum(['pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided']).optional().describe('Filter by payment status'),
    fulfillment_status: z.enum(['shipped', 'partial', 'unshipped', 'any']).optional().describe('Filter by fulfillment status')
  }),
  execute: async ({ store_identifier = 'default', limit = 50, status = 'any', financial_status, fulfillment_status }) => {
    try {
      const userId = await getCurrentUserId()
      const client = await getShopifyClientForUser(userId, store_identifier)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('limit', limit.toString())
      if (status !== 'any') searchParams.set('status', status)
      if (financial_status) searchParams.set('financial_status', financial_status)
      if (fulfillment_status && fulfillment_status !== 'any') searchParams.set('fulfillment_status', fulfillment_status)

      const response = await client.makeRequest(`orders.json?${searchParams.toString()}`)
      const orders = response.orders || []

      return {
        success: true,
        count: orders.length,
        orders: orders.map((order: any) => formatOrder(order)),
        store_domain: client.domain,
        query: {
          limit,
          status,
          financial_status,
          fulfillment_status
        }
      }
    } catch (error) {
      return {
        success: false,
        count: 0,
        orders: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
})

/**
 * Get customers from Shopify store
 * Retrieve customer information with filtering options
 */
export const shopifyGetCustomersTool = tool({
  description: 'Retrieve customers from a Shopify store. Useful for customer analysis and support.',
  inputSchema: z.object({
    ...ShopifyStoreSelector.shape,
    limit: z.number().min(1).max(250).default(50).describe('Maximum number of customers to retrieve'),
    searchEmail: z.string().optional().describe('Search for customers by email address')
  }),
  execute: async ({ store_identifier = 'default', limit = 50, searchEmail }) => {
    try {
      const userId = await getCurrentUserId()
      const client = await getShopifyClientForUser(userId, store_identifier)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('limit', limit.toString())
      if (searchEmail) searchParams.set('email', searchEmail)

      const response = await client.makeRequest(`customers.json?${searchParams.toString()}`)
      const customers = response.customers || []

      return {
        success: true,
        count: customers.length,
        customers: customers.map((customer: any) => formatCustomer(customer)),
        store_domain: client.domain,
        query: {
          limit,
          searchEmail
        }
      }
    } catch (error) {
      return {
        success: false,
        count: 0,
        customers: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
})

/**
 * Get store analytics and metrics
 * Provides key business metrics from the Shopify store
 */
export const shopifyGetAnalyticsTool = tool({
  description: 'Get key analytics and metrics from a Shopify store including recent sales, top products, and performance indicators.',
  inputSchema: z.object({
    ...ShopifyStoreSelector.shape,
    days: z.number().min(1).max(365).default(30).describe('Number of days to analyze (default: 30)')
  }),
  execute: async ({ store_identifier = 'default', days = 30 }) => {
    try {
      const userId = await getCurrentUserId()
      const client = await getShopifyClientForUser(userId, store_identifier)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)
      
      const dateFilter = `created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}`
      
      // Get recent orders for analytics
      const ordersResponse = await client.makeRequest(`orders.json?limit=250&${dateFilter}`)
      const orders = ordersResponse.orders || []
      
      // Get products for inventory analysis
      const productsResponse = await client.makeRequest('products.json?limit=50&status=active')
      const products = productsResponse.products || []
      
      // Calculate metrics
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0)
      const totalOrders = orders.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      
      // Top products by order frequency
      const productSales: { [key: string]: { count: number, revenue: number, title: string } } = {}
      
      orders.forEach((order: any) => {
        order.line_items?.forEach((item: any) => {
          const productId = item.product_id?.toString()
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = { count: 0, revenue: 0, title: item.title }
            }
            productSales[productId].count += item.quantity
            productSales[productId].revenue += parseFloat(item.price) * item.quantity
          }
        })
      })
      
      const topProducts = Object.entries(productSales)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([id, data]) => ({ product_id: id, ...data }))

      return {
        success: true,
        store_domain: client.domain,
        period: `${days} days`,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        metrics: {
          total_revenue: totalRevenue.toFixed(2),
          total_orders: totalOrders,
          average_order_value: averageOrderValue.toFixed(2),
          total_products: products.length
        },
        top_products: topProducts,
        recent_orders: orders.slice(0, 5).map((order: any) => formatOrder(order))
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
})

/**
 * Search products with advanced filtering
 * Powerful product search across multiple fields
 */
export const shopifySearchProductsTool = tool({
  description: 'Advanced product search with filtering by price range, inventory, and multiple criteria. Perfect for product discovery and inventory management.',
  inputSchema: z.object({
    ...ShopifyStoreSelector.shape,
    query: z.string().describe('Search query (searches in title, tags, vendor, product type)'),
    limit: z.number().min(1).max(250).default(50).describe('Maximum number of products to retrieve'),
    min_price: z.number().min(0).optional().describe('Minimum price filter'),
    max_price: z.number().min(0).optional().describe('Maximum price filter'),
    min_inventory: z.number().min(0).optional().describe('Minimum inventory quantity'),
    status: z.enum(['active', 'archived', 'draft']).optional().describe('Product status filter')
  }),
  execute: async ({ store_identifier = 'default', query, limit = 50, min_price, max_price, min_inventory, status }) => {
    try {
      const userId = await getCurrentUserId()
      const client = await getShopifyClientForUser(userId, store_identifier)
      
      // Get all products and filter client-side for advanced search
      const searchParams = new URLSearchParams()
      searchParams.set('limit', '250') // Get more for filtering
      if (status) searchParams.set('status', status)

      const response = await client.makeRequest(`products.json?${searchParams.toString()}`)
      let products = response.products || []

      // Apply text search filter
      if (query) {
        const searchTerm = query.toLowerCase()
        products = products.filter((product: any) => {
          const title = product.title?.toLowerCase() || ''
          const vendor = product.vendor?.toLowerCase() || ''
          const productType = product.product_type?.toLowerCase() || ''
          const tags = product.tags?.toLowerCase() || ''
          
          return title.includes(searchTerm) ||
                 vendor.includes(searchTerm) ||
                 productType.includes(searchTerm) ||
                 tags.includes(searchTerm)
        })
      }

      // Apply price filters
      if (min_price !== undefined || max_price !== undefined) {
        products = products.filter((product: any) => {
          const variant = product.variants?.[0]
          if (!variant) return false
          
          const price = parseFloat(variant.price || '0')
          
          if (min_price !== undefined && price < min_price) return false
          if (max_price !== undefined && price > max_price) return false
          
          return true
        })
      }

      // Apply inventory filter
      if (min_inventory !== undefined) {
        products = products.filter((product: any) => {
          const variant = product.variants?.[0]
          if (!variant) return false
          
          const inventory = variant.inventory_quantity || 0
          return inventory >= min_inventory
        })
      }

      // Limit results
      products = products.slice(0, limit)

      return {
        success: true,
        count: products.length,
        products: products.map((product: any) => formatProduct(product)),
        store_domain: client.domain,
        search_query: {
          query,
          min_price,
          max_price,
          min_inventory,
          status,
          limit
        }
      }
    } catch (error) {
      return {
        success: false,
        count: 0,
        products: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
})

// =============================================================================
// TOOL COLLECTION EXPORT
// =============================================================================

export const shopifyTools = {
  shopifyGetProducts: shopifyGetProductsTool,
  shopifyGetOrders: shopifyGetOrdersTool,
  shopifyGetCustomers: shopifyGetCustomersTool,
  shopifyGetAnalytics: shopifyGetAnalyticsTool,
  shopifySearchProducts: shopifySearchProductsTool
}
