# Notion API Configuration Guide

## Overview

Configure your Notion workspace connection to enable Cleo Agent to create pages, manage databases, organize content, and automate your productivity workflows.

## Step 1: Create a Notion Integration

1. **Notion Developers**: Go to [www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. **New Integration**: Click "New integration"
3. **Integration Details**:
   - **Name**: "Cleo Agent Integration"
   - **Logo**: Upload a logo (optional)
   - **Associated workspace**: Select your workspace
4. **Capabilities**: Choose the permissions you need:
   - ✅ **Read content**: View pages and databases
   - ✅ **Update content**: Edit pages and databases
   - ✅ **Insert content**: Create new pages and entries
5. **Submit**: Click "Submit" to create the integration

## Step 2: Get Your Integration Token

1. **Integration Settings**: After creation, you'll see your integration page
2. **Secrets Section**: Find the "Internal Integration Token"
3. **Copy Token**: Click "Show" then copy the token (starts with `secret_`)
4. **Keep Secure**: Store this token securely - it provides access to your workspace

## Step 3: Share Pages/Databases with Integration

**Important**: Your integration can only access pages and databases that have been explicitly shared with it.

### Share Individual Pages
1. **Open Page**: Go to the Notion page you want to share
2. **Share Button**: Click "Share" in the top right
3. **Invite Integration**: Search for your integration name
4. **Grant Access**: Give appropriate permissions (View, Comment, or Edit)

### Share Databases
1. **Open Database**: Navigate to your database
2. **Share Database**: Click the "Share" button
3. **Add Integration**: Search and add your integration
4. **Set Permissions**: Choose the level of access needed

### Share Parent Pages (Recommended)
- Share a parent page to give access to all child pages
- More efficient than sharing individual pages
- Automatically includes new pages created under the parent

## Step 4: Add to Cleo Agent

1. **Open Cleo Agent**: Go to the Integrations page
2. **Notion Card**: Click "Configure API Key"
3. **Enter Credentials**:
   - **Label**: "Default" or custom name for this connection
   - **API Key**: Your integration token (`secret_...`)
4. **Test Connection**: Click "Test Connection" to verify
5. **Save**: Your credentials are encrypted and stored securely

## Available Features

### 📝 **Page Management**
- Create new pages with rich content
- Update existing page content
- Organize pages in hierarchies
- Add blocks (text, headers, lists, etc.)

### 📊 **Database Operations**
- Create and manage databases
- Add, update, and query database entries
- Work with database properties and schemas
- Filter and sort database content

### 🔗 **Content Organization**
- Link pages and databases
- Create page hierarchies
- Manage page properties
- Handle rich text formatting

### 🤖 **Automation Workflows**
- Automated content creation
- Template-based page generation
- Bulk database operations
- Scheduled content updates

## Database Property Types

Notion supports various property types that Cleo Agent can work with:

- **Title**: Page titles and names
- **Rich Text**: Formatted text content
- **Number**: Numerical values and calculations
- **Select**: Single-choice dropdown options
- **Multi-select**: Multiple-choice options
- **Date**: Dates and date ranges
- **People**: User assignments
- **Files**: File attachments
- **Checkbox**: Boolean true/false values
- **URL**: Web links
- **Email**: Email addresses
- **Phone**: Phone numbers
- **Formula**: Calculated values
- **Relation**: Links between databases
- **Rollup**: Aggregate data from relations

## Troubleshooting

### "Unauthorized" Error

- Verify your integration token is correct and complete
- Ensure the integration has been shared with the pages you're trying to access
- Check that your workspace still has the integration enabled

### "Page Not Found"

- Confirm the page has been shared with your integration
- Verify the page ID is correct
- Check that the page hasn't been deleted or moved

### "Insufficient Permissions"

- Review the capabilities granted to your integration
- Ensure the integration has "Insert content" permission for creating
- Check that "Update content" is enabled for editing operations

### "Rate Limit Exceeded"

- Notion has rate limits (3 requests per second per integration)
- Cleo Agent automatically handles rate limiting
- Consider batching operations for efficiency

## Common Use Cases

### Knowledge Management
- Automated meeting notes creation
- Research documentation
- Knowledge base maintenance
- Content organization

### Project Management
- Task and project tracking
- Team collaboration
- Progress reporting
- Resource management

### Content Creation
- Blog post drafts
- Documentation generation
- Template creation
- Content calendars

### Data Management
- CRM data synchronization
- Inventory tracking
- Contact management
- Analytics reporting

## Security Best Practices

🔒 **Token Security**: Keep your integration token private and secure  
🔒 **Minimal Access**: Only share necessary pages with the integration  
🔒 **Regular Audits**: Review integration access periodically  
🔒 **Workspace Control**: Monitor integration activity in workspace settings  
🔒 **Token Rotation**: Regenerate tokens if compromised  

## Rate Limits & Performance

- **Rate Limit**: 3 requests per second per integration
- **Burst Handling**: Short bursts allowed within limits
- **Auto-Throttling**: Cleo Agent automatically manages rate limits
- **Pagination**: Large datasets are automatically paginated
- **Caching**: Frequently accessed data is cached for performance

## Integration Capabilities

### What Cleo Agent Can Do:
✅ Create and update pages  
✅ Manage database entries  
✅ Query and filter data  
✅ Handle rich text formatting  
✅ Work with all property types  
✅ Manage page hierarchies  

### What's Not Supported:
❌ File uploads (use Notion's file properties)  
❌ Real-time collaboration (use webhooks)  
❌ Workspace administration  
❌ User management  

## Need Help?

- [Notion API Documentation](https://developers.notion.com)
- [Integration Setup Guide](https://developers.notion.com/docs/getting-started)
- [API Reference](https://developers.notion.com/reference)
- [Rate Limits Info](https://developers.notion.com/reference/request-limits)
- Contact support if you encounter issues with Cleo Agent integration