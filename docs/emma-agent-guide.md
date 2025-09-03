# Emma E-commerce Agent Guide

Emma is Cleo's specialized e-commerce agent, focused on Shopify management, sales analytics, and customer insights. This guide covers Emma's capabilities, setup, and integration with per-user Shopify credentials.

## 🛍️ Emma Overview

Emma is one of Cleo's five default agents, specializing in e-commerce operations and business analytics. She provides:

- **Shopify Store Management**: Product catalog, inventory, orders, customers
- **Sales Analytics**: Revenue insights, conversion tracking, performance metrics  
- **Customer Intelligence**: Behavior analysis, segmentation, lifetime value
- **Multi-Store Support**: Handle multiple Shopify stores per user
- **Real-time Data**: Live synchronization with Shopify APIs

## 🔧 Configuration

### Agent Configuration
```typescript
export const EMMA_AGENT: AgentConfig = {
  id: 'emma-ecommerce',
  name: 'Emma',
  description: 'Specialist in ecommerce and sales with expertise in Shopify management, analytics, and customer insights',
  role: 'specialist',
  model: 'gpt-4o-mini',
  temperature: 0.4,
  maxTokens: 6144,
  tools: ['shopifyGetProducts', 'shopifyGetOrders', 'shopifyGetAnalytics', 'shopifyGetCustomers', 'shopifySearchProducts', 'complete_task'],
  tags: ['ecommerce', 'shopify', 'sales', 'inventory', 'store', 'analytics', 'business', 'customer'],
  color: '#FF6B6B',
  icon: '🛍️'
}
```

### Available Tools

#### Product Management
- **shopifyGetProducts**: Retrieve product catalog with variants, pricing, inventory levels
- **shopifySearchProducts**: Search products by title, SKU, vendor, or tags
- **shopifyGetProductAnalytics**: Get product performance metrics and trends

#### Order Management  
- **shopifyGetOrders**: Fetch order history with filtering by status, date, customer
- **shopifyGetOrderAnalytics**: Analyze order patterns, average order value, conversion rates

#### Customer Intelligence
- **shopifyGetCustomers**: Access customer profiles and purchase history
- **shopifyGetCustomerAnalytics**: Customer segmentation, lifetime value, retention metrics

#### Store Analytics
- **shopifyGetAnalytics**: Comprehensive store performance dashboard
- **shopifyGetSalesReport**: Revenue analysis, growth trends, seasonal patterns

## 📊 Per-User Credential Management

Emma uses the `user_service_connections` table to securely store Shopify credentials per user:

```sql
CREATE TABLE user_service_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id VARCHAR(50) NOT NULL, -- 'shopify'
    
    -- Shopify-specific fields
    access_token TEXT,
    refresh_token TEXT,  
    token_expires_at TIMESTAMP,
    scopes TEXT[],
    connected BOOLEAN DEFAULT false,
    
    -- Store information
    account_info JSONB, -- { "shop_domain": "store.myshopify.com", "shop_name": "My Store" }
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    UNIQUE(user_id, service_id)
);
```

### Setup Process

1. **User Registration**: Access Shopify Partner Dashboard or store admin
2. **OAuth Flow**: Authenticate with required scopes:
   - `read_products` - Product catalog access
   - `read_orders` - Order history and analytics
   - `read_customers` - Customer data and insights
   - `read_analytics` - Store performance metrics
3. **Token Storage**: Encrypted storage with RLS security
4. **Multi-Store Support**: Connect multiple stores with separate credentials

### Security Features

- **Row Level Security (RLS)**: Each user can only access their own connections
- **Token Encryption**: Access tokens encrypted at rest
- **Scope Limitation**: Minimal required permissions only
- **Auto-Refresh**: Automatic token renewal for uninterrupted service
- **Audit Trail**: All API calls logged for compliance

## 🎯 Use Cases

### Product Catalog Management
```
User: "Emma, how many products do I have in stock?"
Emma: "Analyzing your Shopify inventory... You currently have 247 active products with 1,832 variants total. Here's the breakdown:
- In Stock: 198 products (80.2%)  
- Low Stock (<10): 31 products (12.6%)
- Out of Stock: 18 products (7.3%)

Top performing categories:
1. Electronics: 89 products, $45,230 revenue this month
2. Clothing: 76 products, $38,940 revenue this month  
3. Home & Garden: 54 products, $28,660 revenue this month"
```

### Sales Analytics
```
User: "Show me this month's sales performance"
Emma: "Here's your September 2025 sales overview:

📈 Revenue: $112,830 (+18% vs last month)
🛒 Orders: 456 (+12% vs last month)  
💰 AOV: $247.44 (+5.3% vs last month)
📦 Conversion Rate: 3.2% (+0.4% vs last month)

🔥 Top Products:
1. Premium Wireless Headphones - 89 sold, $8,900 revenue
2. Smart Home Starter Kit - 67 sold, $10,050 revenue
3. Organic Coffee Blend - 145 sold, $4,350 revenue

⚡ Key Insights:
- Mobile traffic increased 23% - consider mobile-first marketing
- Returning customers show 34% higher AOV - focus on retention"
```

### Customer Intelligence
```
User: "Who are my most valuable customers?"
Emma: "Based on lifetime value analysis, here are your VIP customers:

👑 Top 5 VIP Customers (Last 12 months):
1. Sarah Johnson - $3,240 total, 18 orders (avg $180/order)
2. Michael Chen - $2,890 total, 12 orders (avg $241/order)  
3. Emma Rodriguez - $2,650 total, 15 orders (avg $177/order)
4. David Kumar - $2,420 total, 9 orders (avg $269/order)
5. Lisa Wong - $2,380 total, 14 orders (avg $170/order)

📊 Customer Segments:
- Champions (5%): $2,000+ LTV, regular purchases
- Loyal Customers (15%): $500-2,000 LTV, consistent buyers
- Potential Loyalists (25%): Recent customers with high AOV
- At Risk (20%): Previous buyers, haven't purchased in 90+ days"
```

## 🔄 Integration with Cleo

Emma works as part of Cleo's delegation system:

1. **Task Detection**: Cleo identifies e-commerce related queries
2. **Smart Delegation**: Automatically delegates to Emma using keywords:
   - "sales", "revenue", "orders", "products", "inventory"
   - "shopify", "store", "customers", "analytics"  
   - "ecommerce", "business", "conversion", "metrics"
3. **Contextual Analysis**: Emma analyzes the specific request
4. **Data Retrieval**: Fetches relevant data using Shopify APIs
5. **Insight Generation**: Provides actionable insights and recommendations
6. **Task Completion**: Returns to Cleo for final synthesis

## 📋 Best Practices

### For Users
- **Keep Credentials Updated**: Ensure Shopify tokens don't expire
- **Grant Minimal Scopes**: Only provide necessary permissions
- **Regular Review**: Monitor connected stores and remove unused connections
- **Clear Requests**: Specify date ranges, products, or metrics for better results

### For Developers
- **Rate Limiting**: Implement proper API rate limiting for Shopify calls
- **Error Handling**: Graceful degradation when APIs are unavailable
- **Caching**: Cache frequently requested data to improve performance  
- **Monitoring**: Track API usage and performance metrics

## 🚀 Advanced Features

### Multi-Store Analytics
Emma can compare performance across multiple Shopify stores:
```
"Emma, compare sales performance between my main store and outlet store"
```

### Predictive Analytics
Emma provides forecasting based on historical trends:
```
"Emma, what's the projected revenue for next month based on current trends?"
```

### Automated Insights  
Emma proactively identifies opportunities and issues:
- Low inventory alerts
- Seasonal trend predictions
- Customer churn risk identification
- Product performance anomalies

### Custom Reports
Emma generates tailored reports for specific business needs:
- Weekly executive summaries
- Monthly performance dashboards  
- Quarterly growth analysis
- Annual business reviews

## 🎉 Getting Started

1. **Access Agent Management**: Navigate to Settings > Agents
2. **Find Emma**: Look for the Emma card with 🛍️ icon
3. **Connect Shopify**: Click "Manage Credentials" to set up your store
4. **Start Asking**: Try queries like "Show me today's sales" or "What products need restocking?"
5. **Explore Tools**: Use the agent details modal to see all of Emma's capabilities

Emma makes e-commerce management effortless by bringing your Shopify data directly into your Cleo conversations with intelligent analysis and actionable insights.
