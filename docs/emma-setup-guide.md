# Emma E-commerce Setup Guide

This guide walks you through setting up Emma, Cleo's e-commerce specialist agent, including Shopify integration and credential management.

## 🚀 Quick Start

Emma comes pre-installed as one of Cleo's default agents. Once you have Cleo v3.0 running, Emma is automatically available in your agent roster.

### Prerequisites
- Cleo v3.0 or later
- Supabase database with agents table
- Active Shopify store (for e-commerce features)

## 🔧 Initial Setup

### 1. Verify Emma is Available
1. Navigate to **Settings > Agents**
2. Look for Emma in your agent list (🛍️ icon)
3. Emma should appear automatically with other default agents (Cleo, Toby, Ami, Peter)

### 2. Connect Your Shopify Store
1. Click on Emma's agent card
2. Select **"Manage Credentials"** 
3. Click **"Connect Shopify Store"**
4. Follow the OAuth flow to authorize Emma

### 3. Required Shopify Permissions
Emma requests minimal required scopes:
- **read_products**: Access product catalog and inventory
- **read_orders**: View order history and analytics  
- **read_customers**: Access customer data for insights
- **read_analytics**: Retrieve store performance metrics

## 🏪 Shopify App Setup (Optional)

For enhanced security and control, you can create a dedicated Shopify app:

### Creating a Shopify App
1. Go to your **Shopify Partner Dashboard** or **Store Admin**
2. Navigate to **Apps > Develop apps**
3. Click **"Create an app"**
4. Fill in app details:
   - **App name**: "Cleo Emma Integration"
   - **App URL**: `https://your-cleo-instance.com`
   - **Allowed redirection URLs**: `https://your-cleo-instance.com/api/auth/shopify/callback`

### Configure App Permissions
Set the following scopes:
```json
{
  "read_products": true,
  "read_orders": true, 
  "read_customers": true,
  "read_analytics": true,
  "read_inventory": true
}
```

### Environment Variables
Add to your `.env.local`:
```env
# Shopify Integration
SHOPIFY_CLIENT_ID=your_shopify_app_key
SHOPIFY_CLIENT_SECRET=your_shopify_app_secret  
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/auth/shopify/callback
```

## 🔐 Security Configuration

### Database Setup
The `user_service_connections` table stores encrypted Shopify credentials:

```sql
-- Verify Emma's credential storage
SELECT service_id, connected, account_info 
FROM user_service_connections 
WHERE user_id = auth.uid() AND service_id = 'shopify';
```

### Row Level Security (RLS)
Emma's credentials are protected by RLS policies:
- Users can only access their own Shopify connections
- All tokens are encrypted at rest
- Automatic token refresh prevents service interruption

## 🧪 Testing Emma

### Basic Functionality Test
1. **Chat with Emma directly**:
   ```
   "Emma, are you connected to my Shopify store?"
   ```

2. **Test product queries**:
   ```
   "Emma, how many products do I have?"
   ```

3. **Try sales analytics**:
   ```
   "Emma, show me this week's sales performance"
   ```

### Delegation Test
Emma works through Cleo's delegation system:
1. **Ask Cleo an e-commerce question**:
   ```
   "Show me my best-selling products this month"
   ```
2. Cleo should automatically delegate to Emma
3. Emma will analyze your Shopify data and return insights

## 🎯 Common Use Cases

### Inventory Management
```
"Emma, which products are running low on inventory?"
"Show me products that need restocking"
"What's my current inventory value?"
```

### Sales Analytics  
```
"Emma, compare this month's sales to last month"
"What's my average order value this quarter?"
"Which products have the highest conversion rate?"
```

### Customer Insights
```
"Emma, who are my top customers by lifetime value?"
"Show me customer behavior trends"
"Which customers haven't purchased in 90 days?"
```

### Product Performance
```
"Emma, what are my best-performing product categories?"
"Which products have the highest margins?"
"Show me seasonal sales trends"
```

## 🔧 Troubleshooting

### Connection Issues
**Problem**: Emma says "Not connected to Shopify"
**Solution**: 
1. Go to Settings > Agents > Emma
2. Click "Manage Credentials"
3. Re-authorize your Shopify store

### Permission Errors
**Problem**: "Insufficient permissions" error
**Solution**:
1. Verify all required scopes are granted
2. Check if your Shopify plan supports API access
3. Re-authorize with updated permissions

### Rate Limiting
**Problem**: "API rate limit exceeded" 
**Solution**:
1. Emma automatically handles rate limiting
2. Try again in a few minutes
3. Consider upgrading your Shopify plan for higher limits

### Token Expiration
**Problem**: "Authentication expired"
**Solution**:
1. Emma should auto-refresh tokens
2. If issues persist, manually re-authorize
3. Check token expiration in database

## 📊 Advanced Configuration

### Multiple Store Support
Emma can manage multiple Shopify stores per user:
1. Connect additional stores through the credentials manager
2. Specify store in queries: `"Emma, show sales for my outlet store"`
3. Emma will automatically identify the correct store context

### Custom Analytics
Configure custom reporting periods and metrics:
```
"Emma, create a monthly executive summary"
"Set up weekly inventory alerts for products below 10 units"
```

### Integration with Other Tools
Emma can work alongside other Cleo agents:
- **Toby**: Technical analysis of e-commerce data
- **Ami**: Creative product descriptions and marketing content
- **Peter**: Mathematical analysis of sales trends and forecasting

## 🎉 Best Practices

### Security
- Regularly review connected stores and remove unused connections
- Monitor API usage through Shopify's admin panel  
- Grant minimal required permissions only

### Performance
- Use specific date ranges in queries for faster responses
- Cache frequently requested data when possible
- Batch related queries for efficiency

### Insights
- Ask follow-up questions to dive deeper into data
- Request trend analysis for strategic planning
- Use Emma's insights for data-driven decision making

## 📚 Additional Resources

- [Emma Agent Guide](./emma-agent-guide.md) - Complete functionality reference
- [Shopify API Documentation](https://shopify.dev/docs/api) - Official API docs
- [Multi-Agent Architecture](./multi-agent-architecture.md) - System overview
- [Database Guide](./database.md) - Schema and security details

---

Emma transforms your Shopify store data into actionable business insights, making e-commerce management effortless through natural conversation with Cleo! 🛍️✨
