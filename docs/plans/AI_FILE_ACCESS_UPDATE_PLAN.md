# AI File Access & Document Library Update Plan

## Problem Summary

User reported that AI assistants **cannot access or analyze uploaded files** in chat or the file library. After investigation, identified multiple issues:

### Root Causes Identified

1. **Lazy Loading Issue**: Documents are only loaded when user visits Documents tab or Platform tab
2. **Missing Document Context**: AI assistants in other tabs (Marketing, CRM, Financials) don't have document data loaded
3. **File Upload Not Saving**: Files attached in chat are sent to AI but **not automatically saved to file library**
4. **Content Extraction Missing**: When files are uploaded, AI receives base64 data inline but doesn't extract text for analysis
5. **No File Content Access**: `getFileContent` function works only if document already exists in `data.documents` array

## Current Architecture

### File Upload Flow (Current)
```
User attaches file in chat
  ↓
ModuleAssistant encodes file to base64
  ↓
Sends to AI as inlineData part
  ↓
AI receives file but cannot extract/analyze content
  ↓
File is NOT saved to library (unless AI explicitly calls uploadDocument)
  ↓
User cannot reference file later
```

### File Library Access Flow (Current)
```
User asks "What's in file.pdf?"
  ↓
AI system prompt includes documentsMetadata context
  ↓
But documentsMetadata is EMPTY if Documents tab not loaded
  ↓
AI cannot find file ID
  ↓
getFileContent fails because data.documents is empty
```

### Lazy Loading Behavior (Current)
- **Documents Tab**: Loads documents when first opened
- **Platform Tab**: Loads documents when first opened  
- **Other Tabs** (Marketing, CRM, Financials, etc.): **DO NOT load documents**
  - AI assistants in these tabs have empty file library context
  - Cannot access or reference any uploaded files

## Proposed Solutions

### Phase 1: Eager Document Loading (High Priority)

**Goal**: Ensure all AI assistants have access to file library metadata

**Changes Required**:

1. **Load documents on app initialization** (alongside core data)
   - File: `DashboardApp.tsx` - `initializeApp()` function
   - Load documents metadata (ID, name, module, uploadedBy) - NOT full content
   - Lightweight query (~10-50 KB for 100 files vs MB for full content)

2. **Update lazy loading logic**
   - Keep full document content loading lazy (when needed)
   - But always load metadata list for all tabs

**Implementation**:
```typescript
// In DashboardApp.tsx - initializeApp()
const coreData = await loadCoreData();
const documentsMetadata = await loadDocumentsMetadata(); // NEW - just list

setData(prev => ({
    ...prev,
    gamification: coreData.gamification,
    settings: coreData.settings,
    documentsMetadata: documentsMetadata // NEW field
}));
```

**Benefits**:
- ✅ All AI assistants can see what files exist
- ✅ Minimal performance impact (metadata is small)
- ✅ Users can reference files by name across all tabs
- ✅ AI can intelligently suggest using existing files

---

### Phase 2: Auto-Save Uploaded Files (High Priority)

**Goal**: Files uploaded in chat are automatically saved to file library

**Changes Required**:

1. **Add auto-save logic to ModuleAssistant**
   - File: `components/shared/ModuleAssistant.tsx`
   - After encoding file to base64, automatically call `uploadDocument`
   - Show toast: "File uploaded to library: filename.ext"

2. **Prevent duplicate saves**
   - Check if file already exists by name + module
   - If exists, update instead of creating duplicate
   - Or ask user: "File 'x.pdf' already exists. Replace or keep both?"

3. **Add user preference**
   - Settings option: "Auto-save chat attachments to file library" (default: ON)
   - Allow users to disable if they want manual control

**Implementation**:
```typescript
// In ModuleAssistant.tsx - sendMessage()
if (file && fileContent) {
    // Send to AI as inline data (existing)
    userMessageParts.push({
        inlineData: { mimeType: file.type, data: fileContent }
    });
    
    // NEW: Auto-save to library
    if (data.settings.autoSaveAttachments !== false) {
        try {
            await actions.uploadDocument(
                file.name,
                file.type,
                fileContent,
                currentTab,
                null, // companyId
                null  // contactId
            );
            handleToast(`📎 File saved to library: ${file.name}`, 'success');
        } catch (error) {
            logger.warn('Auto-save failed:', error);
            // Don't block chat if save fails
        }
    }
}
```

**Benefits**:
- ✅ Files are preserved for later reference
- ✅ User doesn't need to manually save each file
- ✅ AI can reference files in future conversations
- ✅ File library becomes central knowledge base

---

### Phase 3: Text Content Extraction (Medium Priority)

**Goal**: Extract readable text from uploaded files for better AI analysis

**Why Needed**:
- AI models can't directly parse PDF, DOCX, XLSX files from base64
- Need to extract text content first
- Enables semantic search, summarization, Q&A

**Changes Required**:

1. **Add file parsing service**
   - File: `lib/services/fileParserService.ts` (NEW)
   - Support common formats:
     - PDF: Use PDF.js library
     - DOCX: Use mammoth.js library
     - TXT/MD: Direct read
     - CSV/JSON: Parse to structured text
     - Images: Use OCR (optional, future)

2. **Store extracted content**
   - Add `extracted_text` column to `documents` table
   - Extract on upload, store alongside base64 content
   - Use extracted text for AI context instead of base64

3. **Update AI context**
   - Instead of sending base64 to AI
   - Send extracted_text to AI
   - Much smaller token usage
   - Better understanding by AI

**Implementation**:
```typescript
// lib/services/fileParserService.ts
export class FileParserService {
    static async extractText(mimeType: string, base64Content: string): Promise<string> {
        switch (mimeType) {
            case 'application/pdf':
                return await this.extractPDFText(base64Content);
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return await this.extractDOCXText(base64Content);
            case 'text/plain':
            case 'text/markdown':
                return atob(base64Content);
            case 'application/json':
                return JSON.stringify(JSON.parse(atob(base64Content)), null, 2);
            default:
                return '[Binary file - text extraction not supported]';
        }
    }
}
```

**Benefits**:
- ✅ AI can actually read and understand file contents
- ✅ Reduced token usage (text vs base64)
- ✅ Better semantic understanding
- ✅ Enables Q&A on documents

---

### Phase 4: Enhanced File Context System (Medium Priority)

**Goal**: Provide rich, structured file context to AI assistants

**Changes Required**:

1. **Improve documentsMetadata structure**
   ```typescript
   interface DocumentMetadata {
       id: string;
       name: string;
       module: string;
       mimeType: string;
       uploadedBy: string;
       uploadedByName: string;
       uploadedAt: Date;
       fileSize: number;
       companyName?: string; // If linked to CRM
       extractedTextPreview?: string; // First 500 chars
   }
   ```

2. **Smart file suggestions**
   - When user asks about topic, AI checks if relevant files exist
   - "I found 3 files related to Q4 strategy: ..."
   - Proactively offer to analyze them

3. **File search capability**
   - Add semantic search across extracted_text
   - User: "Find files about marketing"
   - AI searches and returns relevant files

**Benefits**:
- ✅ AI becomes proactive file assistant
- ✅ Better file discovery
- ✅ Contextual file recommendations

---

### Phase 5: Mobile File Upload Support (Low Priority)

**Goal**: Ensure file upload works on mobile devices

**Changes Required**:

1. **Test mobile file picker**
   - iOS Safari, Android Chrome
   - Camera upload, photo library access
   - File manager access

2. **Add mobile-optimized UI**
   - Larger touch targets for attach button
   - Show file preview before sending
   - Progress indicator for large uploads

3. **Handle mobile limitations**
   - File size limits (mobile networks)
   - Format support (iOS restrictions)
   - Storage warnings

---

## Implementation Roadmap

### Week 1: Critical Fixes
- [ ] Phase 1: Eager document loading (metadata only)
- [ ] Phase 2: Auto-save uploaded files to library
- [ ] Test on mobile and desktop
- [ ] Deploy and gather feedback

### Week 2: Content Extraction
- [ ] Phase 3: Text extraction service
- [ ] PDF parser integration
- [ ] DOCX parser integration
- [ ] Update database schema (extracted_text column)
- [ ] Migration for existing documents

### Week 3: Enhanced Experience
- [ ] Phase 4: Rich metadata system
- [ ] Smart file suggestions
- [ ] File search capability
- [ ] Performance optimization

### Week 4: Polish & Mobile
- [ ] Phase 5: Mobile upload testing
- [ ] UI improvements
- [ ] Documentation
- [ ] User guide

---

## Database Changes Required

### New Columns for `documents` Table

```sql
-- Add extracted text column for AI analysis
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Add file size tracking
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Create full-text search index
CREATE INDEX IF NOT EXISTS documents_extracted_text_idx 
ON documents USING gin(to_tsvector('english', extracted_text));
```

### New Table for Document Metadata Cache

```sql
-- Lightweight metadata table for fast loading
CREATE TABLE IF NOT EXISTS documents_metadata (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_by_name TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    file_size_bytes BIGINT,
    has_extracted_text BOOLEAN DEFAULT FALSE,
    preview_text TEXT, -- First 500 chars
    FOREIGN KEY (id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX documents_metadata_workspace_idx ON documents_metadata(workspace_id);
CREATE INDEX documents_metadata_module_idx ON documents_metadata(module);
```

---

## API Changes Required

### New Endpoints

1. **GET /api/documents/metadata**
   - Returns lightweight list of all documents
   - Used for initial app load
   - Response: `{ id, name, module, uploadedBy, uploadedAt }`

2. **POST /api/documents/extract-text**
   - Accepts document ID
   - Extracts text from file content
   - Stores in extracted_text column
   - Returns extracted text

3. **GET /api/documents/:id/content**
   - Replaces current getFileContent
   - Returns extracted_text if available
   - Falls back to base64 content if not

---

## Settings Updates

### New User Preferences

```typescript
interface SettingsData {
    // ... existing settings
    
    // NEW file handling settings
    autoSaveAttachments: boolean; // Default: true
    extractTextOnUpload: boolean; // Default: true
    maxFileSizeMB: number; // Default: 10
    allowedFileTypes: string[]; // Default: ['pdf', 'docx', 'txt', 'csv', 'json']
}
```

---

## Testing Checklist

### File Upload Testing
- [ ] Upload PDF in Platform tab chat → Verify saved to library
- [ ] Upload DOCX in Marketing tab chat → Verify saved to library
- [ ] Upload same file twice → Verify duplicate handling
- [ ] Upload large file (>5MB) → Verify performance
- [ ] Upload unsupported format → Verify error handling

### File Access Testing
- [ ] Ask "What files do I have?" in CRM tab → Verify lists all files
- [ ] Ask "What's in report.pdf?" without loading Documents tab → Verify AI can access
- [ ] Reference file by name → Verify AI finds correct file ID
- [ ] Ask AI to analyze file content → Verify reads extracted_text

### Cross-Tab Testing
- [ ] Upload file in Marketing tab → Access from CRM tab AI
- [ ] Upload file in Platform tab → Access from Financials tab AI
- [ ] Upload file linked to company → Verify company context preserved

### Mobile Testing
- [ ] Upload photo from camera → Verify works
- [ ] Upload document from Files app → Verify works
- [ ] Upload on slow connection → Verify progress indicator
- [ ] Upload large file on mobile → Verify size warning

---

## Performance Considerations

### Before Changes
- Documents only loaded when Documents/Platform tab opened
- Full content loaded every time (includes base64)
- Slow initial load if many/large documents

### After Phase 1 (Metadata Loading)
- Metadata loaded once on app init (~10KB for 100 files)
- Full content still lazy loaded when needed
- Fast initial load, minimal overhead

### After Phase 3 (Text Extraction)
- Extracted text stored separately
- AI receives text instead of base64
- Faster AI responses (smaller prompts)
- Better semantic understanding

---

## User Experience Impact

### Before
❌ Upload file in chat → Lost after conversation ends  
❌ Ask about file in CRM tab → "I don't see any files"  
❌ Upload PDF → AI cannot read contents  
❌ Need to manually save each file to library  

### After
✅ Upload file in chat → Auto-saved to library  
✅ Ask about file in any tab → AI knows all files  
✅ Upload PDF → AI reads and analyzes contents  
✅ Files persist as organizational knowledge base  
✅ AI can reference files across conversations  

---

## Migration Strategy

### For Existing Documents

1. **Backfill extracted text**
   - Run batch job on existing documents
   - Extract text from all PDFs, DOCX files
   - Store in new extracted_text column
   - Mark as processed

2. **Update metadata cache**
   - Populate documents_metadata table
   - Copy relevant fields from documents table
   - Create indexes

3. **No user action required**
   - Migration runs automatically
   - Transparent to users
   - Improves experience immediately

---

## Success Metrics

### Quantitative
- **File Upload Success Rate**: Target 99%+
- **AI File Access Success Rate**: Target 95%+ (from current ~0%)
- **Text Extraction Success Rate**: Target 90%+ for supported formats
- **Average Time to Load Documents**: Target <500ms for metadata

### Qualitative
- Users can reference files across conversations
- AI provides relevant file-based answers
- File library becomes go-to knowledge base
- Reduced "I can't find that file" complaints

---

## Security & Privacy

### Data Handling
- Files stored in Supabase with RLS policies
- Only workspace members can access files
- Extracted text stored securely (same table)
- No external API calls for parsing (client-side only)

### File Size Limits
- Default: 10MB per file
- Prevents abuse and storage bloat
- Configurable per workspace plan
- Clear error messages for oversized files

---

## Future Enhancements (Post-Launch)

1. **OCR for Images**
   - Extract text from screenshots, photos
   - Use Tesseract.js or cloud OCR service

2. **Smart File Linking**
   - Auto-link uploaded invoices to financial logs
   - Auto-link contracts to CRM companies
   - ML-based classification

3. **Version Control**
   - Track file changes over time
   - Show diff between versions
   - Restore previous versions

4. **Collaborative Annotations**
   - Team members can comment on files
   - Highlight sections
   - AI incorporates annotations in analysis

5. **Advanced Search**
   - Full-text search across all files
   - Filter by module, date, uploader
   - Semantic similarity search

---

## Open Questions

1. **Should we limit extracted_text length?**
   - Very large files could create huge text
   - Option: Store first 10,000 words only
   - Or: Chunk and create summaries

2. **How to handle non-text files?**
   - Images: Store as-is, maybe add OCR later
   - Videos: Extract metadata only
   - Audio: Transcription (future feature)

3. **Duplicate file detection?**
   - By name only? Or content hash?
   - What if user wants multiple versions?

4. **File organization?**
   - Add folders/categories?
   - Tags for files?
   - Smart collections?

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Prioritize phases** based on user impact
3. **Create tickets** for Phase 1 & 2 (critical)
4. **Start implementation** with eager document loading
5. **Test thoroughly** on mobile and desktop
6. **Deploy incrementally** with feature flags
7. **Monitor metrics** and gather user feedback

---

## Conclusion

The current file upload and AI access system has significant gaps that prevent users from effectively using their document library with AI assistants. The proposed 5-phase approach will:

1. **Immediate fix**: Eager document metadata loading (Phase 1)
2. **Core functionality**: Auto-save chat attachments (Phase 2)
3. **Enhanced intelligence**: Text extraction for AI analysis (Phase 3)
4. **Better UX**: Smart suggestions and search (Phase 4)
5. **Platform coverage**: Mobile optimization (Phase 5)

**Estimated Total Implementation Time**: 3-4 weeks for Phases 1-3, additional 1-2 weeks for Phases 4-5.

**Recommended Start**: Phase 1 & 2 immediately (critical for user experience), Phase 3 as soon as possible (enables true AI document analysis).
