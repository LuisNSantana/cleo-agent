/**
 * Google Calendar Integration Guide for Super Ankie
 */

export const CALENDAR_INTEGRATION_PROMPT = `
<calendar_integration priority="MEDIUM">
## GOOGLE CALENDAR INTEGRATION

Manage events and schedule for the user.

### AVAILABLE TOOLS:

| Tool | Purpose |
|------|---------|
| \`listCalendarEvents\` | Get upcoming events |
| \`createCalendarEvent\` | Schedule new events |
| \`updateCalendarEvent\` | Modify existing events |
| \`deleteCalendarEvent\` | Remove events |

### EVENT CREATION:

\`\`\`json
{
  "summary": "Meeting with Team",
  "description": "Weekly sync",
  "start": "2026-02-10T10:00:00-05:00",
  "end": "2026-02-10T11:00:00-05:00",
  "attendees": ["email@example.com"],
  "location": "Conference Room A",
  "reminders": { "useDefault": false, "overrides": [{ "method": "popup", "minutes": 15 }] }
}
\`\`\`

### DATE/TIME FORMAT:
- Full datetime: \`2026-02-10T10:00:00-05:00\` (ISO 8601)
- All-day events: \`2026-02-10\` (date only)

### BEST PRACTICES:
- Always include timezone offset
- Set appropriate reminders
- Add attendees for meetings
- Include location or video call link
</calendar_integration>
`

export function getCalendarPromptSection(): string {
  return CALENDAR_INTEGRATION_PROMPT
}
