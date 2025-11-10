# GTM Docs Workspace Implementation Analysis

## Executive Summary

ChatGPT's suggestion is **highly valuable** but needs adaptation to our existing architecture. Our current `documents` table is file-storage focused (base64 content), while the suggestion proposes a **document-authoring** system with rich text editing and metadata.

**Recommendation**: Implement a hybrid approach that extends our existing system rather than replacing it.

---

## Current State Analysis

### Existing Database Schema

```sql
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    content TEXT NOT NULL,              -- Base64 encoded files
    module TEXT NOT NULL,               -- Tab context
    company_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    notes JSONB DEFAULT '[]'
);
```

**Key Observations**:
- ✅ Already has user_id, workspace linkage via user
- ✅ Has basic linking (company_id, contact_id)
- ✅ Has module field for categorization
- ❌ No rich text support (only base64 binary)
- ❌ No document type classification
- ❌ No visibility/sharing controls
- ❌ No full-text search indexing
- ❌ No task/calendar linking

### Existing TypeScript Types

```typescript
export interface Document {
    id: string;
    name: string;
    mimeType: string;
    content: string;                    // base64 encoded
    uploadedAt: number;
    module: TabType;
    companyId?: string;
    contactId?: string;
    uploadedBy?: string;
    uploadedByName?: string;
    notes: Note[];
}
```

### Current Features

1. **File Library Tab** - Basic file upload/download
2. **AI Document Context** - Uses `documentsMetadata` (without content) for AI awareness
3. **Module-Based Organization** - Files tagged by tab (Platform, Investor, CRM, etc.)
4. **Basic Linking** - Files can link to CRM companies/contacts
5. **Auto-Save from AI Chat** - Files attached in chat auto-save to library

---

## Gap Analysis: Current vs. Suggested

| Feature | Current State | Suggested | Priority |
|---------|--------------|-----------|----------|
| **Rich Text Editor** | ❌ None (binary files only) | ✅ Tiptap/Quill editor | **HIGH** |
| **Document Types** | ❌ MIME types only | ✅ GTM types (brief, campaign, etc.) | **HIGH** |
| **Task Linking** | ❌ None | ✅ Bidirectional links | **MEDIUM** |
| **Calendar Linking** | ❌ None | ✅ Event attachments | **MEDIUM** |
| **Visibility Controls** | ❌ Workspace-wide only | ✅ Private/Team options | **HIGH** |
| **Full-Text Search** | ❌ No indexing | ✅ tsvector or AI index | **HIGH** |
| **AI Context Integration** | ✅ Metadata loaded | ✅ "Send to AI" button | **LOW** (exists) |
| **GTM Templates** | ❌ None | ✅ Seeded templates | **MEDIUM** |
| **Chat Attachments** | ✅ File upload | ✅ Library picker | **LOW** (exists) |
| **Folder/Views** | ❌ Module tabs only | ✅ Filters (All, Mine, Shared, etc.) | **MEDIUM** |

---

## Recommended Implementation Plan

### Phase 1: Extend Existing Schema (Database Migration)

**Option A: Single Table Extension** (Recommended for MVP)

```sql
-- Add new columns to existing documents table
ALTER TABLE documents 
ADD COLUMN doc_type TEXT,                           -- 'brief', 'campaign', 'template', 'file'
ADD COLUMN content_json JSONB,                      -- Rich text (Tiptap format)
ADD COLUMN content_plain TEXT,                      -- For search + AI
ADD COLUMN visibility TEXT DEFAULT 'team',          -- 'private' | 'team'
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
ADD COLUMN is_template BOOLEAN DEFAULT false,
ADD COLUMN template_category TEXT,
ADD CONSTRAINT doc_type_check CHECK (doc_type IN ('brief', 'campaign', 'template', 'meeting_notes', 'battlecard', 'outbound_template', 'file'));

-- For backward compatibility: existing rows are 'file' type
UPDATE documents SET doc_type = 'file' WHERE doc_type IS NULL;

-- Add workspace_id based on user's workspace
UPDATE documents d
SET workspace_id = (
    SELECT workspace_id FROM workspace_members wm 
    WHERE wm.user_id = d.user_id LIMIT 1
);

-- Full-text search index
ALTER TABLE documents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_documents_search ON documents USING gin(search_vector);
CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_visibility ON documents(visibility);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION documents_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content_plain, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_update 
BEFORE INSERT OR UPDATE ON documents 
FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();
```

**Option B: Separate Tables** (More scalable, recommended for long-term)

```sql
-- Keep existing documents table for binary files
-- Add new gtm_docs table for authored documents

CREATE TABLE gtm_docs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN (
        'brief', 'campaign', 'meeting_notes', 'battlecard', 
        'outbound_template', 'icp_sheet', 'persona', 'competitive_snapshot'
    )),
    
    content_json JSONB,                 -- Tiptap/Slate/Quill editor format
    content_plain TEXT,                 -- Plain text for search + AI
    
    visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team')),
    is_template BOOLEAN DEFAULT false,
    template_category TEXT,
    
    search_vector tsvector,
    
    -- Metadata
    tags TEXT[],
    linked_task_ids UUID[],
    linked_event_ids UUID[],
    linked_crm_ids UUID[]
);

-- Linking table for flexible associations
CREATE TABLE gtm_doc_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    doc_id UUID NOT NULL REFERENCES gtm_docs(id) ON DELETE CASCADE,
    linked_entity_type TEXT NOT NULL CHECK (linked_entity_type IN ('task', 'event', 'crm', 'chat', 'contact')),
    linked_entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doc_id, linked_entity_type, linked_entity_id)
);

-- Indexes
CREATE INDEX idx_gtm_docs_workspace_id ON gtm_docs(workspace_id);
CREATE INDEX idx_gtm_docs_owner_id ON gtm_docs(owner_id);
CREATE INDEX idx_gtm_docs_doc_type ON gtm_docs(doc_type);
CREATE INDEX idx_gtm_docs_visibility ON gtm_docs(visibility);
CREATE INDEX idx_gtm_docs_search ON gtm_docs USING gin(search_vector);
CREATE INDEX idx_gtm_doc_links_doc_id ON gtm_doc_links(doc_id);
CREATE INDEX idx_gtm_doc_links_entity ON gtm_doc_links(linked_entity_type, linked_entity_id);

-- Search trigger
CREATE TRIGGER gtm_docs_search_update 
BEFORE INSERT OR UPDATE ON gtm_docs 
FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();

-- RLS Policies
ALTER TABLE gtm_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_doc_links ENABLE ROW LEVEL SECURITY;

-- Users can see team docs or their own private docs
CREATE POLICY "Users can view team or own docs" ON gtm_docs
    FOR SELECT USING (
        visibility = 'team' 
        OR owner_id = auth.uid()
    );

-- Users can only modify their own docs
CREATE POLICY "Users can modify own docs" ON gtm_docs
    FOR ALL USING (owner_id = auth.uid());

-- Link policies follow doc permissions
CREATE POLICY "Users can manage links for accessible docs" ON gtm_doc_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM gtm_docs 
            WHERE gtm_docs.id = gtm_doc_links.doc_id 
            AND (gtm_docs.visibility = 'team' OR gtm_docs.owner_id = auth.uid())
        )
    );
```

**Recommendation**: Start with **Option B** (separate tables) for cleaner separation of concerns.

---

### Phase 2: TypeScript Types

```typescript
// New types for GTM docs
export type DocType = 
    | 'brief'
    | 'campaign'
    | 'meeting_notes'
    | 'battlecard'
    | 'outbound_template'
    | 'icp_sheet'
    | 'persona'
    | 'competitive_snapshot';

export type DocVisibility = 'private' | 'team';

export interface GTMDoc {
    id: string;
    workspaceId: string;
    ownerId: string;
    ownerName?: string;
    createdAt: number;
    updatedAt: number;
    
    title: string;
    docType: DocType;
    
    contentJson: any;               // Tiptap JSON
    contentPlain: string;           // Plain text for AI
    
    visibility: DocVisibility;
    isTemplate: boolean;
    templateCategory?: string;
    
    tags?: string[];
    linkedTaskIds?: string[];
    linkedEventIds?: string[];
    linkedCrmIds?: string[];
}

export interface GTMDocMetadata extends Omit<GTMDoc, 'contentJson' | 'contentPlain'> {
    // Lightweight version for lists
}

export interface GTMDocLink {
    id: string;
    docId: string;
    linkedEntityType: 'task' | 'event' | 'crm' | 'chat' | 'contact';
    linkedEntityId: string;
    createdAt: number;
}

// Extend existing Document interface for backward compatibility
export interface Document {
    id: string;
    name: string;
    mimeType: string;
    content: string;                // base64 encoded (legacy files)
    uploadedAt: number;
    module: TabType;
    companyId?: string;
    contactId?: string;
    uploadedBy?: string;
    uploadedByName?: string;
    notes: Note[];
    
    // New fields for unified system
    docType?: DocType;              // If null, it's a legacy file
    contentJson?: any;              // Rich text if doc_type set
    contentPlain?: string;          // Plain text version
    visibility?: DocVisibility;
    workspaceId?: string;
}
```

---

### Phase 3: UI Components & Routes

#### New Tab: "Workspace" or "Docs"

```typescript
// Add to constants.ts
export enum Tab {
    Dashboard = 'Dashboard',
    Platform = 'Platform',
    Investor = 'Investor',
    CRM = 'CRM',
    Marketing = 'Marketing',
    Financials = 'Financials',
    Calendar = 'Calendar',
    FileLibrary = 'File Library',
    Workspace = 'Workspace',        // NEW
    Achievements = 'Achievements',
    Settings = 'Settings',
}
```

#### Component Structure

```
components/
├── workspace/
│   ├── WorkspaceTab.tsx              # Main container
│   ├── DocsList.tsx                  # Left sidebar with filters
│   ├── DocEditor.tsx                 # Rich text editor (Tiptap)
│   ├── DocMetadataPanel.tsx          # Right panel
│   ├── DocTemplateSelector.tsx       # Template chooser
│   ├── DocLinkManager.tsx            # Link to tasks/events
│   └── SendToAIButton.tsx            # Context injection
```

#### Rich Text Editor: Tiptap

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

**Why Tiptap?**
- ✅ Headless (no styling conflicts with Tailwind)
- ✅ JSON output (stores well in JSONB)
- ✅ Extensible (custom nodes for GTM-specific content)
- ✅ Active development
- ✅ TypeScript support

---

### Phase 4: AI Integration

#### 1. "Send to AI" from Document

```typescript
// In DocEditor.tsx
const handleSendToAI = async () => {
    const plainText = editor.getText();
    
    // Open AI chat with document context
    openAIChat({
        initialContext: `**Document Context: ${doc.title}**\n\n${plainText}`,
        initialMessage: "How can I help with this document?"
    });
};
```

#### 2. "Attach from Library" in AI Chat

```typescript
// In ModuleAssistant.tsx - add button next to file upload
<button onClick={() => setShowDocLibrary(true)}>
    📄 Attach from Library
</button>

{showDocLibrary && (
    <DocLibraryPicker
        onSelect={(doc) => {
            // Add doc.contentPlain to message context
            setAttachedDocs([...attachedDocs, doc]);
        }}
        onClose={() => setShowDocLibrary(false)}
    />
)}
```

#### 3. Update AI System Prompts

```typescript
const systemPrompt = `
...existing prompt...

**Available GTM Documents** (${documentsMetadata.length} docs):
${documentsMetadata
    .filter(doc => doc.docType) // Only authored docs
    .map(doc => `- ${doc.title} (${doc.docType}) [ID: ${doc.id}]`)
    .join('\n')}

You can reference these documents or ask the user to attach them for detailed context.
`;
```

---

### Phase 5: Task & Calendar Integration

#### Task Form Enhancement

```typescript
// In TaskForm.tsx
interface TaskFormData {
    // ...existing fields
    attachedDocIds?: string[];      // NEW
}

<DocAttachmentSelector
    selectedDocs={formData.attachedDocIds}
    onChange={(docIds) => setFormData({ ...formData, attachedDocIds: docIds })}
/>
```

#### Calendar Event Enhancement

```typescript
// Similar pattern for CalendarEvent
interface CalendarEvent {
    // ...existing fields
    attachedDocIds?: string[];      // NEW
}
```

When saving, create entries in `gtm_doc_links` table.

---

### Phase 6: GTM Templates

#### Seed Templates

```typescript
const GTM_TEMPLATES = [
    {
        title: "Product Launch Brief",
        docType: "brief" as const,
        templateCategory: "launch",
        contentJson: {
            type: "doc",
            content: [
                { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Product Launch Brief" }] },
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Executive Summary" }] },
                { type: "paragraph", content: [{ type: "text", text: "What are we launching and why?" }] },
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Target Audience" }] },
                { type: "paragraph" },
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key Messages" }] },
                { type: "bulletList", content: [
                    { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Message 1" }] }] }
                ]},
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Timeline" }] },
                { type: "paragraph" }
            ]
        }
    },
    {
        title: "ICP / Persona Sheet",
        docType: "persona" as const,
        templateCategory: "sales",
        contentJson: {
            type: "doc",
            content: [
                { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Ideal Customer Profile" }] },
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Demographics" }] },
                { type: "bulletList", content: [
                    { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Company size: " }] }] },
                    { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Industry: " }] }] },
                    { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Location: " }] }] }
                ]},
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pain Points" }] },
                { type: "bulletList", content: [
                    { type: "listItem", content: [{ type: "paragraph" }] }
                ]},
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
                { type: "paragraph" }
            ]
        }
    },
    // Add more templates...
];
```

---

## Implementation Roadmap

### Sprint 1: Foundation (2 weeks)
- [ ] Database migration (Option B - separate tables)
- [ ] TypeScript types
- [ ] Basic Workspace tab with list view
- [ ] Simple editor integration (Tiptap)
- [ ] Create/Edit/Delete docs

### Sprint 2: Core Features (2 weeks)
- [ ] Document type selector
- [ ] Visibility controls (private/team)
- [ ] Full-text search
- [ ] Metadata panel
- [ ] Template system

### Sprint 3: Integrations (2 weeks)
- [ ] Task linking
- [ ] Calendar event linking
- [ ] AI "Send to AI" button
- [ ] AI chat "Attach from Library"
- [ ] CRM document associations

### Sprint 4: Polish & Templates (1 week)
- [ ] GTM templates (5-7 templates)
- [ ] Folder/filter views
- [ ] Document sharing UI
- [ ] Search improvements
- [ ] Mobile optimization

---

## Technical Considerations

### 1. Backward Compatibility

Keep existing `documents` table functional:
- Legacy files (PDFs, images, etc.) continue to work
- `docType` field distinguishes authored docs from uploaded files
- File Library tab shows both types

### 2. Performance

- Use `documentsMetadata` for AI context (no heavy content)
- Lazy-load `contentJson` only when editing
- Index search_vector for fast queries
- Consider pagination for large doc lists

### 3. Storage Limits

- Rich text JSON is much smaller than base64 files
- Typical doc: 5-50KB vs. 500KB-5MB for PDFs
- Can safely store thousands of authored docs

### 4. Search Strategy

**Option A: Postgres tsvector** (Recommended for MVP)
- ✅ Built-in, no extra dependencies
- ✅ Fast full-text search
- ✅ Works with existing infrastructure
- ❌ English-only out of box

**Option B: Separate AI indexing**
- ✅ Better semantic search
- ✅ Multi-language support
- ❌ Requires external service (Pinecone, Weaviate)
- ❌ More complex to maintain

Start with tsvector, migrate to AI indexing if needed.

---

## Migration Path

### Step 1: Add columns to existing table (non-breaking)
```sql
ALTER TABLE documents ADD COLUMN doc_type TEXT;
ALTER TABLE documents ADD COLUMN content_json JSONB;
-- etc.
```

### Step 2: Create UI in parallel (feature flag)
```typescript
const ENABLE_WORKSPACE_TAB = import.meta.env.VITE_ENABLE_WORKSPACE === 'true';
```

### Step 3: Migrate File Library to show both types
- Filter by `doc_type IS NULL` for legacy files
- Show authored docs with special icon

### Step 4: Gradual rollout
- Enable for power users first
- Collect feedback
- Iterate

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Editor complexity | High | Start with basic Tiptap, add features incrementally |
| RLS misconfiguration | Critical | Comprehensive tests, audit logs |
| Search performance | Medium | Proper indexes, pagination |
| User adoption | Medium | Templates, onboarding, tooltips |
| Backward compatibility | High | Keep both systems running, gradual migration |

---

## Confidence Assessment

**Overall Confidence: 88%**

**High Confidence (95%)**:
- Database schema design
- TypeScript types
- Tiptap integration
- Basic CRUD operations

**Medium Confidence (80%)**:
- Full-text search performance at scale
- Template system adoption
- Mobile editor experience

**Lower Confidence (70%)**:
- AI integration complexity with large docs
- User workflow for linking docs everywhere
- Cross-module visibility (when to show which docs)

**Blockers**:
- Need to decide: Option A (extend table) vs. Option B (separate tables)
- Need UI/UX mockups for editor layout
- Need to validate rich text storage size limits in Supabase

---

## Next Steps

1. **Review & Approve** this analysis with team
2. **Choose schema approach** (A or B)
3. **Create UI mockups** for Workspace tab
4. **Set up feature flag** for gradual rollout
5. **Start Sprint 1** with database migration
6. **Create templates** content with GTM expert
7. **Test RLS policies** thoroughly before production

---

## Conclusion

ChatGPT's suggestion is **excellent** and aligns well with GTM workflow needs. The implementation is **feasible** with our current architecture. The key is to:

1. ✅ Build it as an **extension** of existing documents system
2. ✅ Use **separate tables** for cleaner separation
3. ✅ Maintain **backward compatibility** with file uploads
4. ✅ Integrate **gradually** with feature flags
5. ✅ Focus on **GTM templates** for quick value

**Estimated effort**: 6-8 weeks for full implementation with 1-2 developers.

**Expected ROI**: High - provides unique GTM-focused value that competitors don't have.
