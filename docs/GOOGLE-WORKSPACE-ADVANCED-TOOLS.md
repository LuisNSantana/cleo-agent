# Google Workspace Advanced Tools - Complete Guide

## Overview

The advanced tools for Google Docs, Slides, and Gmail enable agents to create **professional, production-ready documents, presentations, and emails** with rich formatting, styling, and media.

## 📄 Google Docs Advanced

### Available Tools

#### 1. `formatGoogleDocsText`
**Apply advanced text formatting**

```typescript
await formatGoogleDocsText({
  documentId: "doc123",
  startIndex: 1,
  endIndex: 50,
  formatting: {
    bold: true,
    italic: false,
    fontSize: 14,
    fontFamily: "Arial",
    foregroundColor: { red: 0, green: 0, blue: 0 },
    backgroundColor: { red: 1, green: 1, blue: 0 } // Yellow highlight
  }
})
```

**Options**:
- `bold`, `italic`, `underline`, `strikethrough`
- `fontSize` in points (11, 14, 18, etc.)
- `fontFamily`: "Arial", "Times New Roman", "Calibri", "Georgia"
- `foregroundColor`: Text color (RGB 0-1)
- `backgroundColor`: Highlight color (RGB 0-1)

#### 2. `applyGoogleDocsParagraphStyle`
**Apply paragraph styles and formatting**

```typescript
await applyGoogleDocsParagraphStyle({
  documentId: "doc123",
  startIndex: 1,
  endIndex: 100,
  style: {
    namedStyleType: "HEADING_1", // or HEADING_2, HEADING_3, NORMAL_TEXT, TITLE
    alignment: "CENTER", // or START, END, JUSTIFIED
    lineSpacing: 150, // 150% = 1.5 line spacing
    spaceAbove: 12, // points
    spaceBelow: 6,
    indentFirstLine: 36 // points (0.5 inch)
  }
})
```

**Named Styles**:
- `TITLE`: Document title
- `SUBTITLE`: Subtitle
- `HEADING_1` through `HEADING_6`: Headings
- `NORMAL_TEXT`: Body text

#### 3. `insertGoogleDocsTable`
**Insert tables for structured data**

```typescript
await insertGoogleDocsTable({
  documentId: "doc123",
  insertIndex: 100,
  rows: 3,
  columns: 4,
  data: [
    ["Header 1", "Header 2", "Header 3", "Header 4"],
    ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3", "Row 1 Col 4"],
    ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3", "Row 2 Col 4"]
  ]
})
```

#### 4. `insertGoogleDocsImage`
**Insert images from URLs**

```typescript
await insertGoogleDocsImage({
  documentId: "doc123",
  insertIndex: 200,
  imageUrl: "https://example.com/logo.png",
  width: 200, // points
  height: 150
})
```

#### 5. `createGoogleDocsList`
**Create bulleted or numbered lists**

```typescript
await createGoogleDocsList({
  documentId: "doc123",
  startIndex: 50,
  endIndex: 150,
  listType: "BULLET", // or "NUMBER"
  nestingLevel: 0 // 0 = top level, 1-8 = nested
})
```

---

## 📊 Google Slides Advanced

### Available Tools

#### 1. `insertSlideImage`
**Add images to slides**

```typescript
await insertSlideImage({
  presentationId: "pres123",
  pageObjectId: "slide1",
  imageUrl: "https://example.com/chart.png",
  position: {
    translateX: 1270000, // EMU (100pt * 12700)
    translateY: 635000   // EMU (50pt * 12700)
  },
  size: {
    width: 3810000,  // 300pt in EMU
    height: 2540000  // 200pt in EMU
  }
})
```

**EMU Conversion**: 1 point = 12,700 EMU  
Example: 100 points = 1,270,000 EMU

#### 2. `createSlideShape`
**Create shapes with custom styling**

```typescript
await createSlideShape({
  presentationId: "pres123",
  pageObjectId: "slide1",
  shapeType: "RECTANGLE", // or ROUND_RECTANGLE, ELLIPSE, ARROW, STAR_5
  position: {
    translateX: 50,  // points (will be converted to EMU)
    translateY: 100
  },
  size: {
    width: 200,
    height: 100
  },
  style: {
    backgroundColor: { red: 0.2, green: 0.5, blue: 0.9 }, // Blue
    borderColor: { red: 0, green: 0, blue: 0 }, // Black border
    borderWeight: 2 // points
  },
  text: "Important Note"
})
```

**Shape Types**:
- `RECTANGLE`, `ROUND_RECTANGLE`, `ELLIPSE`
- `TRIANGLE`, `RIGHT_TRIANGLE`
- `ARROW`, `CLOUD`
- `STAR_5`, `HEXAGON`

#### 3. `createSlideTable`
**Add tables to slides**

```typescript
await createSlideTable({
  presentationId: "pres123",
  pageObjectId: "slide1",
  rows: 3,
  columns: 3,
  position: {
    translateX: 50,
    translateY: 100
  },
  size: {
    width: 500,
    height: 200
  },
  data: [
    ["Q1", "Q2", "Q3"],
    ["100", "150", "200"],
    ["Sales", "Growth", "Profit"]
  ]
})
```

#### 4. `formatSlideText`
**Format text in text boxes and shapes**

```typescript
await formatSlideText({
  presentationId: "pres123",
  objectId: "textbox1",
  startIndex: 0, // optional
  endIndex: 20,  // optional
  style: {
    bold: true,
    fontSize: 24,
    fontFamily: "Arial",
    foregroundColor: { red: 1, green: 1, blue: 1 } // White
  }
})
```

#### 5. `addSlideSpeakerNotes`
**Add speaker notes for presentations**

```typescript
await addSlideSpeakerNotes({
  presentationId: "pres123",
  pageObjectId: "slide1",
  notes: "Remember to mention the Q3 projections and customer feedback survey results."
})
```

---

## 📧 Gmail Advanced

### Available Tools

#### 1. `sendHtmlGmail`
**Send professional HTML formatted emails**

```typescript
await sendHtmlGmail({
  to: ["client@example.com"],
  subject: "Q4 Financial Report",
  htmlBody: `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h1 style="color: #2c3e50;">Q4 Financial Report</h1>
        <p>Dear Client,</p>
        <p>Please find below the summary of Q4 results:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #3498db; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">Metric</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Value</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">Revenue</td>
            <td style="padding: 10px; border: 1px solid #ddd;">$1.2M</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px; border: 1px solid #ddd;">Growth</td>
            <td style="padding: 10px; border: 1px solid #ddd;">23%</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">Best regards,<br/>Peter</p>
      </body>
    </html>
  `,
  textBody: "Q4 Financial Report - Revenue: $1.2M, Growth: 23%", // Fallback
  cc: ["manager@company.com"],
  replyTo: "support@company.com"
})
```

**HTML Email Best Practices**:
- Use inline CSS (not external stylesheets)
- Use tables for layout (email clients have limited CSS support)
- Test colors in RGB hex or named colors
- Always provide a `textBody` fallback for plain text clients
- Use `<br/>` for line breaks
- Avoid JavaScript (not supported in email)

#### 2. `sendGmailWithAttachments`
**Send emails with file attachments**

```typescript
await sendGmailWithAttachments({
  to: ["client@example.com"],
  subject: "Campaign Budget Proposal",
  body: "Please find attached the detailed budget breakdown.",
  isHtml: false,
  attachments: [
    {
      filename: "Budget_Q4_2024.pdf",
      mimeType: "application/pdf",
      content: base64EncodedPdfContent // Base64 string
    },
    {
      filename: "Analysis.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: base64EncodedExcelContent
    }
  ]
})
```

**Common MIME Types**:
- PDF: `application/pdf`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- PNG: `image/png`
- JPEG: `image/jpeg`
- ZIP: `application/zip`
- CSV: `text/csv`

**Getting Base64 Content**:
```javascript
// From file buffer:
const base64 = Buffer.from(fileBuffer).toString('base64')

// From URL (download first):
const response = await fetch(fileUrl)
const buffer = await response.arrayBuffer()
const base64 = Buffer.from(buffer).toString('base64')
```

#### 3. `createGmailDraft`
**Create email drafts for review**

```typescript
await createGmailDraft({
  to: ["executive@company.com"],
  subject: "Board Meeting Agenda",
  body: "<h1>Board Meeting - January 2025</h1><p>Agenda items...</p>",
  isHtml: true,
  cc: ["secretary@company.com"]
})
```

---

## 🎨 Complete Workflow Examples

### Example 1: Financial Report Package

```typescript
// 1. Create detailed spreadsheet
const sheet = await createGoogleSheet({
  title: "Q4 2024 Financial Analysis",
  sheetTitle: "Dashboard"
})

// 2. Add tabs and charts
await addGoogleSheetTab({
  spreadsheetId: sheet.spreadsheet.id,
  sheetTitle: "Data"
})

await createGoogleSheetChart({
  spreadsheetId: sheet.spreadsheet.id,
  sheetId: 0,
  chartType: "BAR",
  title: "Revenue by Quarter"
})

// 3. Create summary document
const doc = await createGoogleDoc({
  title: "Q4 2024 Executive Summary"
})

await applyGoogleDocsParagraphStyle({
  documentId: doc.document.id,
  startIndex: 1,
  endIndex: 30,
  style: { namedStyleType: "TITLE" }
})

// 4. Create presentation
const pres = await createGoogleSlidesPresentation({
  title: "Q4 2024 Board Presentation"
})

await insertSlideImage({
  presentationId: pres.presentation.id,
  pageObjectId: pres.firstSlideId,
  imageUrl: "https://company.com/logo.png"
})

// 5. Send HTML email with links
await sendHtmlGmail({
  to: ["board@company.com"],
  subject: "Q4 2024 Financial Package",
  htmlBody: `
    <h1>Q4 2024 Financial Package</h1>
    <p>Please review the following materials:</p>
    <ul>
      <li><a href="${sheet.webViewLink}">Financial Analysis (Spreadsheet)</a></li>
      <li><a href="${doc.webViewLink}">Executive Summary (Document)</a></li>
      <li><a href="${pres.webViewLink}">Board Presentation (Slides)</a></li>
    </ul>
  `
})
```

### Example 2: Campaign Presentation

```typescript
// Create presentation
const pres = await createGoogleSlidesPresentation({
  title: "Electoral Campaign Strategy - Luis Santana 2024"
})

// Add title slide with logo
await insertSlideImage({
  presentationId: pres.presentation.id,
  pageObjectId: pres.firstSlideId,
  imageUrl: "https://campaign.com/logo.png",
  position: { translateX: 2540000, translateY: 635000 }
})

// Add budget overview slide
await addGoogleSlide({
  presentationId: pres.presentation.id,
  layout: "TITLE_AND_BODY"
})

// Create budget breakdown table
await createSlideTable({
  presentationId: pres.presentation.id,
  pageObjectId: "slide2",
  rows: 5,
  columns: 3,
  position: { translateX: 50, translateY: 150 },
  size: { width: 600, height: 250 },
  data: [
    ["Category", "Budget (COP)", "% of Total"],
    ["Digital", "72M", "40%"],
    ["Events", "54M", "30%"],
    ["Logistics", "36M", "20%"],
    ["Contingency", "18M", "10%"]
  ]
})

// Add speaker notes
await addSlideSpeakerNotes({
  presentationId: pres.presentation.id,
  pageObjectId: "slide2",
  notes: "Emphasize the digital-first strategy and efficient resource allocation."
})
```

---

## 🎯 Best Practices

### Google Docs
1. **Always use indexes correctly**: Document starts at index 1
2. **Apply formatting AFTER inserting text**: Format text that already exists
3. **Use named styles**: Headings, titles for consistent formatting
4. **Test with small ranges**: Before formatting large sections

### Google Slides
1. **EMU conversion**: Multiply points by 12,700 for EMU
2. **Position carefully**: Slide dimensions are typically 10" x 7.5" (7,200,000 x 5,400,000 EMU)
3. **Use appropriate shape types**: Choose shapes that fit your content
4. **Add speaker notes**: Essential for presentation preparation

### Gmail
1. **HTML emails**:
   - Always provide plain text fallback
   - Use inline CSS only
   - Test colors and layout
   - Use tables for structure
2. **Attachments**:
   - Verify MIME types
   - Keep total size under 25MB
   - Use descriptive filenames
3. **Drafts for review**: Create drafts for important emails before sending

---

## 🚀 Quick Reference: Color Palettes

### Professional Colors (RGB 0-1)

```typescript
const COLORS = {
  // Primary
  BLUE: { red: 0.26, green: 0.52, blue: 0.96 },
  RED: { red: 0.96, green: 0.26, blue: 0.21 },
  GREEN: { red: 0.30, green: 0.69, blue: 0.31 },
  
  // Neutrals
  BLACK: { red: 0, green: 0, blue: 0 },
  WHITE: { red: 1, green: 1, blue: 1 },
  GRAY_LIGHT: { red: 0.96, green: 0.96, blue: 0.96 },
  GRAY: { red: 0.62, green: 0.62, blue: 0.62 },
  
  // Highlights
  YELLOW: { red: 1, green: 0.92, blue: 0.23 },
  ORANGE: { red: 1, green: 0.60, blue: 0 },
  PURPLE: { red: 0.61, green: 0.15, blue: 0.69 }
}
```

---

## 📚 Additional Resources

- [Google Docs API Reference](https://developers.google.com/docs/api/reference/rest)
- [Google Slides API Reference](https://developers.google.com/slides/api/reference/rest)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)

---

## Changelog

**v1.0 (2025-01-06)**
- ✨ Added 5 advanced Google Docs tools
- ✨ Added 5 advanced Google Slides tools
- ✨ Added 3 advanced Gmail tools
- 📊 Support for rich formatting, tables, images
- 📧 HTML emails with inline styles and attachments
- 🎨 Professional color palettes and styling options
