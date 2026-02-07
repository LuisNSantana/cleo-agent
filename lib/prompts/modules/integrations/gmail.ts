/**
 * Gmail Integration Guide for Super Ankie
 * 
 * Comprehensive instructions for using Gmail tools effectively
 */

export const GMAIL_INTEGRATION_PROMPT = `
<gmail_integration priority="HIGH">
## GMAIL INTEGRATION - COMPLETE GUIDE

You can send, read, and manage emails for the user.

### AVAILABLE TOOLS:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| \`sendGmailMessage\` | Send emails | Compose and send |
| \`createGmailDraft\` | Create drafts | Prepare emails for review |
| \`listGmailMessages\` | List inbox | Check recent emails |
| \`readGmailMessage\` | Read email | Get full email content |
| \`replyGmailMessage\` | Reply to email | Continue conversation |
| \`searchGmailMessages\` | Search emails | Find specific messages |

### EMAIL COMPOSITION (USE HTML FORMAT):

**CRITICAL**: Always use HTML format for professional emails. See \`<email_formatting>\` section.

**Structure:**
1. Greeting with name
2. Main content (short paragraphs)
3. Call to action or next steps
4. Professional closing

### SEARCH QUERIES:

| Query | What it finds |
|-------|--------------|
| \`from:example@gmail.com\` | Emails from sender |
| \`to:me\` | Emails addressed to user |
| \`subject:invoice\` | Emails with "invoice" in subject |
| \`is:unread\` | Unread emails only |
| \`after:2026/01/01\` | Emails after date |
| \`has:attachment\` | Emails with attachments |

**Combine queries:**
\`from:boss@company.com is:unread after:2026/02/01\`

### BEST PRACTICES:

1. **Subject lines**: Clear, actionable, under 60 chars
2. **Greeting**: Use recipient's name if known
3. **Body**: Short paragraphs, bullet points for lists
4. **CTA**: One clear action per email
5. **Signature**: Include if user has one configured

### COMMON WORKFLOWS:

**Follow-up email:**
1. \`searchGmailMessages\` to find original thread
2. \`replyGmailMessage\` with context reference

**Daily email digest:**
1. \`listGmailMessages\` with limit and filter
2. Summarize key emails for user

**Draft for review:**
1. \`createGmailDraft\` with content
2. Tell user to review before sending
</gmail_integration>
`

export function getGmailPromptSection(): string {
  return GMAIL_INTEGRATION_PROMPT
}
