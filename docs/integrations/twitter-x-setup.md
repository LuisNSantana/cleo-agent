# Twitter/X API Configuration Guide

## Overview
Configure your Twitter/X API access to enable Cleo Agent to post tweets, read timelines, manage DMs, and track analytics.

## Step 1: Create a Twitter Developer Account

1. **Visit Twitter Developer Portal**: Go to [developer.twitter.com](https://developer.twitter.com)
2. **Sign Up**: Use your existing Twitter account or create a new one
3. **Apply for Access**: Complete the developer application form
4. **Wait for Approval**: This usually takes 1-3 business days

## Step 2: Create a New App

1. **Dashboard**: Once approved, go to your [Developer Dashboard](https://developer.twitter.com/en/portal/dashboard)
2. **Create App**: Click "Create App" or "New App"
3. **App Details**:
   - **App Name**: Choose a unique name (e.g., "My Cleo Agent")
   - **Description**: Describe your use case
   - **Website**: Your website URL or placeholder
   - **Use Case**: Select "Making a bot or automated system"

## Step 3: Generate API Keys

1. **App Settings**: Click on your newly created app
2. **Keys and Tokens** tab: Navigate to this section
3. **Generate Keys**:
   - **API Key** (Consumer Key): Copy this value
   - **API Secret Key** (Consumer Secret): Copy this value
   - **Access Token**: Generate and copy
   - **Access Token Secret**: Generate and copy

## Step 4: Configure Permissions

1. **App Settings**: In your app dashboard
2. **User Authentication Settings**: Edit settings
3. **App Permissions**: Select "Read and Write" (or "Read, Write, and Direct Messages" if needed)
4. **Type of App**: Choose "Web App, Automated App or Bot"
5. **Callback URLs**: Add `https://yourdomain.com/callback` (can be placeholder)
6. **Website URL**: Your website or app URL

## Step 5: Add to Cleo Agent

1. **Open Cleo Agent**: Go to the Integrations page
2. **Twitter/X Card**: Click "Configure API Key"
3. **Enter Credentials**:
   - **API Key**: Your Consumer Key
   - **API Secret**: Your Consumer Secret  
   - **Access Token**: Your Access Token
   - **Access Token Secret**: Your Access Token Secret
4. **Test Connection**: Click "Test Connection" to verify
5. **Save**: Your credentials are encrypted and stored securely

## Available Features

✅ **Tweet Posting**: Publish tweets with text, images, and hashtags  
✅ **Timeline Reading**: Read and analyze your timeline  
✅ **DM Management**: Send and receive direct messages  
✅ **Analytics**: Track engagement and performance metrics  
✅ **Search**: Search tweets and users  
✅ **Follow/Unfollow**: Manage your following list  

## Troubleshooting

### "Authentication Failed"
- Verify all 4 credentials are correct
- Check that app permissions are set to "Read and Write"
- Ensure your developer account is approved

### "Rate Limit Exceeded"
- Twitter has rate limits (300 requests per 15 minutes for most endpoints)
- Cleo Agent automatically handles rate limiting
- Wait 15 minutes and try again

### "App Not Authorized"
- Make sure your app is approved in the developer portal
- Check that callback URLs are configured
- Verify app permissions include the actions you want to perform

## Security Notes

🔒 **Credentials Storage**: All API keys are encrypted and stored securely  
🔒 **No Sharing**: Your credentials are never shared with third parties  
🔒 **Revocation**: You can revoke access anytime in Twitter Developer Portal  
🔒 **Rotation**: Regenerate keys periodically for better security  

## Rate Limits & Best Practices

- **Posting**: 300 tweets per 3-hour window
- **Reading**: 900 requests per 15 minutes  
- **DMs**: 1000 events per 24 hours
- **Best Practice**: Cleo Agent automatically throttles requests to stay within limits

## Need Help?

- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Rate Limits Reference](https://developer.twitter.com/en/docs/rate-limits)
- Contact support if you encounter issues with Cleo Agent integration