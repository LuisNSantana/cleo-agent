# 🧪 Beta Testing Checklist - Cleo Agent System

## 📋 **FEATURE TESTING MATRIX**

### 🤖 **1. Agent Delegation System**

#### **1.1 Cleo ↔ Madison Delegation**
- [ ] **Create Madison Agent**
  - Go to Agents page → Create new agent → Name "Madison" → Save
  - Verify agent appears in agents list
  - Check agent has Google Docs tools assigned

- [ ] **Test Cleo Detection**
  - Send message: _"¿Cleo puede ver a Madison?"_
  - Expected: Cleo should confirm it can see Madison
  - Verify delegation tool exists in response

- [ ] **Test Direct Delegation**
  - Send message: _"Pídele a Madison que cree un documento de Google Docs con un resumen de la conversación"_
  - Expected: Cleo delegates to Madison
  - Expected: Madison uses Google Docs tool (not invents data)
  - Expected: Real Google Doc created

#### **1.2 Real-time Auto-Sync**
- [ ] **Agent Creation Sync**
  - Create new agent → Immediately ask Cleo about delegation
  - Expected: Cleo sees new agent without page refresh
  
- [ ] **Agent Update Sync**  
  - Update agent tools → Test delegation
  - Expected: Updated tools reflected immediately

- [ ] **Agent Deletion Sync**
  - Delete agent → Test delegation
  - Expected: Delegation tool removed immediately

---

### 📎 **2. PDF/Text Attachment System**

#### **2.1 PDF Attachment Preview**
- [ ] **Upload PDF File**
  - Attach PDF to chat message
  - Verify AttachmentPreview component renders
  - Check "Preview", "Edit", "Download" buttons appear

- [ ] **Preview Functionality**
  - Click "Preview" button
  - Expected: PDF content expands in-line
  - Expected: Text extracted and displayed cleanly
  - Expected: Large files show truncation notice

- [ ] **Canvas Editor Integration**
  - Click "Open in Canvas Editor" button
  - Expected: Canvas Editor opens in new tab/window
  - Expected: PDF content loaded as editable markdown
  - Expected: Filename preserved in editor

#### **2.2 Text File Support**
- [ ] **TXT Files** - Upload .txt file → Preview works
- [ ] **MD Files** - Upload .md file → Preview works  
- [ ] **Multiple Formats** - Test various text-based files

#### **2.3 Error Handling**
- [ ] **Large Files** - Upload >30MB file → Graceful error
- [ ] **Corrupted PDF** - Upload invalid PDF → Error message
- [ ] **Network Issues** - Test with slow connection

---

### 📝 **3. File Editing System**

#### **3.1 Canvas Editor Integration**
- [ ] **Direct File Opening**
  - Click "Edit" on attachment → Opens in Canvas Editor
  - Verify content loads correctly
  - Test saving changes

- [ ] **Chat → Canvas Flow**
  - Start editing in chat → Move to Canvas Editor
  - Verify content preservation
  - Test bidirectional sync

#### **3.2 File Processing Pipeline**
- [ ] **PDF → Text Extraction** - Quality and formatting
- [ ] **Content Cleanup** - Remove control characters
- [ ] **Size Limitations** - Handle large files gracefully

---

### 🔗 **4. Google Docs Integration**

#### **4.1 Madison Google Docs Tools**
- [ ] **Tool Assignment**
  - Verify Madison has Google Docs tools
  - Check tools appear in agent configuration

- [ ] **Real Tool Usage**
  - Delegate docs task to Madison
  - Expected: Madison uses actual Google Docs API
  - Expected: No hallucinated/fake responses
  - Expected: Real document URLs returned

#### **4.2 Authentication & Permissions**
- [ ] **Google OAuth** - Authentication flow works
- [ ] **Scope Permissions** - Proper document access
- [ ] **Error Handling** - Auth failures handled gracefully

---

### 🚨 **5. Error Handling & Edge Cases**

#### **5.1 Network Resilience**
- [ ] **API Timeouts** - Graceful handling
- [ ] **Connection Loss** - Retry mechanisms
- [ ] **Rate Limiting** - Proper backoff

#### **5.2 Data Validation**
- [ ] **Invalid File Types** - Proper error messages
- [ ] **Malformed Requests** - API validation
- [ ] **Authentication Failures** - User feedback

#### **5.3 Production Logging**
- [ ] **No Sensitive Data** - Check browser console
- [ ] **Structured Logs** - Backend error tracking
- [ ] **Debug Mode** - Environment-specific logging

---

## 🎯 **REGRESSION TESTING**

### **Core Functionality Verification**
- [ ] **Basic Chat** - Send/receive messages
- [ ] **Agent Selection** - Switch between agents
- [ ] **Tool Execution** - All tools work
- [ ] **Canvas Integration** - Drawing/editing features
- [ ] **Authentication** - Login/logout cycles

### **Performance Verification**
- [ ] **Page Load Speed** - <3 seconds initial load
- [ ] **Chat Response Time** - <2 seconds typical response
- [ ] **File Upload Speed** - Reasonable for file size
- [ ] **Memory Usage** - No significant leaks

---

## 📊 **ACCEPTANCE CRITERIA**

### **🟢 PASS Criteria:**
- ✅ All agent delegation works reliably
- ✅ PDF attachments preview and edit correctly  
- ✅ Real-time sync works without page refresh
- ✅ No console errors in production
- ✅ Madison uses real Google Docs (no hallucination)
- ✅ File editing flow is smooth and intuitive

### **🔴 FAIL Criteria:**
- ❌ Cleo cannot see user agents
- ❌ Madison invents fake Google Docs data
- ❌ PDF attachments don't preview
- ❌ Canvas Editor doesn't open from attachments
- ❌ Real-time sync requires page refresh
- ❌ Console shows sensitive information

---

## 🚀 **EXECUTION WORKFLOW**

### **Phase 1: Core Features (30 min)**
1. Test agent delegation end-to-end
2. Test PDF attachment preview + Canvas Editor
3. Verify real-time sync functionality

### **Phase 2: Integration Testing (20 min)**  
4. Test Madison Google Docs integration
5. Verify file editing pipeline
6. Check error handling edge cases

### **Phase 3: Production Readiness (10 min)**
7. Verify logging cleanup
8. Check performance benchmarks
9. Final regression testing

---

## 📝 **TESTING NOTES**

**Environment Setup:**
- Use clean browser profile
- Test with/without Google authentication
- Try different file sizes and types

**Documentation:**
- Record any issues found
- Note performance observations
- Document workarounds needed

**Sign-off:**
- [ ] **Technical Lead Review**
- [ ] **Product Owner Approval**  
- [ ] **Ready for Production Deployment**