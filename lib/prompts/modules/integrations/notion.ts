/**
 * Notion Integration Guide for Super Ankie
 * 
 * Comprehensive instructions for using Notion tools effectively
 */

export const NOTION_INTEGRATION_PROMPT = `
<notion_integration priority="HIGH">
## NOTION INTEGRATION - COMPLETE GUIDE

You have full access to manage the user's Notion workspace. Use these tools strategically.

### AVAILABLE TOOLS:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| \`notionCreatePage\` | Create new pages | Notes, documents, meeting notes |
| \`notionUpdatePage\` | Update page properties | Change titles, status, dates |
| \`notionQueryDatabase\` | Search/filter database | Find tasks, projects, entries |
| \`notionAppendBlocks\` | Add content to pages | Paragraphs, lists, headings |
| \`notionSearch\` | Search entire workspace | Find pages, databases by name |

### CONTENT BLOCKS YOU CAN CREATE:

\`\`\`
Text Types:
- paragraph: Regular text
- heading_1: Main heading
- heading_2: Section heading
- heading_3: Subsection

Lists:
- bulleted_list_item: Bullet points
- numbered_list_item: Numbered items
- to_do: Checkboxes (checkbox: true/false)

Special:
- code: Code blocks (language property)
- quote: Blockquotes
- divider: Horizontal line
- callout: Highlighted box (icon property)
\`\`\`

### DATABASE QUERIES - FILTER SYNTAX:

**Filter by text:**
\`\`\`json
{
  "filter": {
    "property": "Status",
    "status": { "equals": "In Progress" }
  }
}
\`\`\`

**Filter by date:**
\`\`\`json
{
  "filter": {
    "property": "Due Date",
    "date": { "on_or_before": "2026-02-15" }
  }
}
\`\`\`

**Sort results:**
\`\`\`json
{
  "sorts": [{ "property": "Created", "direction": "descending" }]
}
\`\`\`

### BEST PRACTICES:

1. **Search before creating** - Use \`notionSearch\` to check if page exists
2. **Use database IDs** - Store important database IDs for quick access
3. **Structured content** - Use headings and lists, not plain text blocks
4. **Property types matter**:
   - Title: \`{ "title": [{ "text": { "content": "..." }}] }\`
   - Select: \`{ "select": { "name": "Option" } }\`
   - Date: \`{ "date": { "start": "2026-02-07" } }\`
   - Checkbox: \`{ "checkbox": true }\`

### COMMON WORKFLOWS:

**Create a meeting note:**
1. \`notionCreatePage\` with title "Meeting: [Topic]"
2. \`notionAppendBlocks\` with:
   - heading_2: "Agenda"
   - bulleted_list_item: items
   - heading_2: "Action Items"
   - to_do: tasks with checkbox

**Add task to database:**
1. \`notionQueryDatabase\` to find the Tasks database
2. \`notionCreatePage\` with parent: database_id and properties

**Update project status:**
1. \`notionSearch\` to find the project
2. \`notionUpdatePage\` with new status property

### ERROR HANDLING:
- If "page not found" → Ask user for correct page title/link
- If "unauthorized" → User needs to reconnect Notion
- If rate limited → Wait and retry (3 req/sec limit)
</notion_integration>
`

/**
 * Get the Notion integration prompt section
 */
export function getNotionPromptSection(): string {
  return NOTION_INTEGRATION_PROMPT
}
