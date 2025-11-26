# GTM Docs Implementation Progress

## Overview
Implementation of Google Docs-style GTM workspace with rich text editing, templates, and AI integration.

**Status:** Phase 1 Complete (8 of 20 tasks) ✅  
**Started:** 2024-11-10  
**Latest Commit:** af30123

---

## ✅ Completed Tasks (8/20)

### **Task 1: Database Schema Setup** ✅
**Files:**
- `supabase/migrations/20251110201512_create_gtm_docs_tables.sql`
- `GTM_DOCS_MIGRATION_GUIDE.md`

**What was done:**
- Created `gtm_docs` table with:
  - Rich text storage (content_json for Tiptap, content_plain for search/AI)
  - Document types: brief, campaign, meeting_notes, battlecard, outbound_template, icp_sheet, persona, competitive_snapshot
  - Visibility controls: private (owner only) or team (all workspace members)
  - Full-text search using PostgreSQL tsvector with auto-update triggers
  - Template system support (is_template, template_category)
  - Tags array for organization

- Created `gtm_doc_links` table for flexible entity linking:
  - Links docs to tasks, events, CRM items, contacts, chat
  - Enforces referential integrity with CASCADE delete

- Added comprehensive indexes:
  - workspace_id, owner_id (for RLS performance)
  - doc_type, visibility, is_template (for filtering)
  - search_vector (GIN index for full-text search)
  - created_at DESC (for sorting)

- Implemented RLS policies:
  - ✅ Team docs visible to all workspace members
  - ✅ Private docs only visible to owner
  - ✅ Users can only create docs in their workspace
  - ✅ Users can only modify/delete their own docs
  - ✅ Workspace isolation enforced

- Created migration guide with:
  - Pre-deployment checklist
  - Validation tests (table structure, RLS, triggers, search)
  - Rollback plan
  - Performance considerations

---

### **Task 2: TypeScript Types** ✅
**Files:**
- `types.ts` (lines 438-493)

**What was done:**
- Added `DocType` union type (8 GTM document types)
- Added `DocVisibility` type ('private' | 'team')
- Added `LinkedEntityType` type for flexible linking
- Created `GTMDoc` interface (full document with content)
- Created `GTMDocMetadata` interface (lightweight for lists/previews)
- Created `GTMDocLink` interface for link records
- Created `LinkedDoc` interface for displaying docs with link metadata

---

### **Task 3: Workspace Tab UI** ✅
**Files:**
- `constants.ts` (added Tab.Workspace, NAV_ITEMS, doc type metadata)
- `DashboardApp.tsx` (added tab switching with paywall for free users)

**What was done:**
- Added `Tab.Workspace = 'workspace'` to tab constants
- Added "GTM Docs" to navigation menu (appears between Financials and File Library)
- Lazy-loaded WorkspaceTab component for code splitting
- Added paywall for free users with upgrade CTA
- Added doc type metadata constants:
  - `DOC_TYPE_LABELS`: Display names for all doc types
  - `DOC_TYPE_ICONS`: Emoji icons for visual identification
  - `DOC_TYPE_DESCRIPTIONS`: Helper text for each type

---

### **Task 5: Component Scaffold** ✅
**Files:**
- `components/workspace/WorkspaceTab.tsx`
- `components/workspace/DocsList.tsx`
- `components/workspace/DocEditor.tsx`

**WorkspaceTab.tsx:**
- Master component with sidebar + content area layout
- Manages selected doc state
- Handles create new / edit / close flows
- Shows empty state with CTA when no doc selected

**DocsList.tsx:**
- Document list sidebar with search input
- Filter buttons: All / Mine / Team / Templates
- Doc type dropdown filter
- Document cards showing:
  - Title, doc type icon + label
  - Visibility badge (🔒 Private / 👥 Team)
  - Template badge (📋 Template)
- Selected document highlighting
- Empty states with CTAs
- Loading states

**DocEditor.tsx:**
- Full editor interface with header, content area, and metadata sidebar
- Title input in header
- Placeholder textarea (will be replaced with Tiptap in Task 8)
- Metadata panel with:
  - Doc type selector
  - Visibility toggle (Team / Private)
  - Tags input with add/remove
  - AI actions placeholder
- Save/Cancel functionality
- Loading states for existing docs

---

### **Task 4: Install Tiptap Dependencies** ✅
**Files / Commands:**
- `package.json`
- `package-lock.json`

**What was done:**
- Confirmed all baseline editor deps are installed and pinned:
   - `@tiptap/react`, `@tiptap/starter-kit`, and `@tiptap/extension-placeholder`
   - Collaboration helpers (`@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`, `@tiptap/y-tiptap`)
- Ensured lockfile sync via `npm install` so the workspace can `npm run build` without fetching new packages mid-branch.
- Documented the dependency state here so future tasks can move straight into wiring up the editor experience.

---

### **Task 6: DatabaseService CRUD** ✅
**Files:**
- `lib/services/database.ts` (added 10 new methods, lines 2056-2408)

**Methods implemented:**
1. **loadGTMDocs()** - Load docs for workspace with filters (all/mine/team/templates, doc type)
2. **loadGTMDocById()** - Load full document including content
3. **createGTMDoc()** - Create new document with validation
4. **updateGTMDoc()** - Update document fields (partial updates supported)
5. **deleteGTMDoc()** - Delete document (CASCADE removes links)
6. **searchGTMDocs()** - Full-text search with fallback to ILIKE
7. **linkDocToEntity()** - Create link between doc and task/event/CRM/contact/chat
8. **unlinkDocFromEntity()** - Remove link
9. **getLinkedDocs()** - Load all docs linked to an entity

**Key features:**
- All methods return `{ data, error }` pattern for consistent error handling
- Transforms database snake_case to app camelCase
- Includes comprehensive logging
- RLS-compliant queries (no need for user_id checks, Supabase handles it)
- Search with graceful fallback if RPC function not yet deployed

---

### **Task 7: DocsList with Filters** ✅
**Already completed in Task 5** - DocsList component includes:
- ✅ Search input (filters by title)
- ✅ Filter buttons (All/Mine/Team/Templates)
- ✅ Doc type dropdown filter
- ✅ Empty states
- ✅ Loading states
- ✅ Integration with DatabaseService.loadGTMDocs()

---

### **Task 9: Doc Metadata Panel** ✅
**Already completed in Task 5** - DocEditor includes:
- ✅ Doc type selector (dropdown with icons + labels)
- ✅ Visibility toggle (Team / Private buttons)
- ✅ Tags input (comma-separated, chips display, remove buttons)
- ✅ AI actions placeholder section
- ✅ Save functionality updates all metadata

---

### **Task 10: Full-Text Search** ✅
**Already completed in Task 1 & 6:**
- ✅ `search_vector` column in gtm_docs table
- ✅ Trigger auto-updates search_vector on insert/update
- ✅ Weighted search (title: A, content: B, tags: C)
- ✅ DatabaseService.searchGTMDocs() with RPC + ILIKE fallback
- ✅ Search input in DocsList component

---

## 🔄 In Progress (0/20)

_No tasks currently in progress_

---

## ⏳ Remaining Tasks (12/20)

### **Task 8: Tiptap Editor Integration**
**File:** `components/workspace/DocEditor.tsx`

**What to do:**
1. Replace textarea with Tiptap `<EditorContent>` component
2. Create toolbar with buttons:
   - Bold, Italic, Strikethrough
   - Heading 1, Heading 2, Heading 3
   - Bullet list, Ordered list
   - Blockquote
   - Code block
   - Clear formatting
3. Configure editor with:
   - `content: contentJson` (load existing content)
   - `onUpdate: ({ editor })` → extract JSON and plain text
   - Placeholder extension
4. Update save logic:
   - `contentJson = editor.getJSON()`
   - `contentPlain = editor.getText()`
5. Style toolbar to match neo-brutalist theme

---

### **Task 11: Seed GTM Templates**
**Method:** Create SQL script or UI-based seeding

**Templates to create (5-7):**
1. **GTM Launch Brief**
   - Sections: Positioning, Target Audience, Messaging, Channels, Success Metrics
2. **ICP Sheet**
   - Sections: Company Profile, Pain Points, Decision Makers, Buying Process
3. **Campaign Plan**
   - Sections: Goals, Target Segments, Tactics, Timeline, Budget, KPIs
4. **Battlecard**
   - Sections: Competitor Overview, Our Advantages, Objection Handling, Win Stories
5. **Persona Profile**
   - Sections: Demographics, Goals, Challenges, Day in the Life, How We Help
6. **Outbound Email Template**
   - Sections: Subject Line Ideas, Body Template, Call to Action, Follow-up Sequence
7. **Competitive Snapshot**
   - Sections: Market Position, Feature Comparison, Pricing, Messaging

**Implementation:**
- Create `supabase/seed_gtm_templates.sql`
- Set `is_template = true`
- Set `template_category` for grouping
- Populate `content_json` with structured Tiptap JSON (headings + placeholders)
- Set `visibility = 'team'` so all users can clone them

---

### **Task 12: Task Linking Integration**
**Files to modify:**
- `components/shared/TaskForm.tsx` or wherever tasks are created/edited
- `components/*Tab.tsx` (task detail views)

**What to do:**
1. Add "Attach Document" button/section in TaskForm
2. Create `DocLibraryPicker` modal component:
   - Reuses DocsList logic
   - Shows only team docs (not private unless owned by user)
   - Allows multi-select
   - Confirm button to attach
3. On attach:
   - Call `DatabaseService.linkDocToEntity(docId, 'task', taskId)`
4. Display linked docs in task detail:
   - Show doc title, type icon, visibility badge
   - "View" button to open doc
   - "Unlink" button to remove link
5. Load linked docs:
   - Call `DatabaseService.getLinkedDocs('task', taskId)`

---

### **Task 13: Calendar Event Linking**
**Files to modify:**
- `components/CalendarTab.tsx` or event form component

**What to do:**
- Same pattern as Task 12 but for calendar events
- Use `linkedEntityType = 'event'`
- Great for attaching meeting notes, agendas, briefs to calendar events

---

### **Task 14: Send to AI Button**
**File:** `components/workspace/DocEditor.tsx`

**What to do:**
1. Add "Send to AI" button in editor header or metadata panel
2. On click:
   - Extract `contentPlain` from editor
   - Open FloatingAIAssistant (or navigate to AI chat)
   - Pre-populate chat with:
     - System message: "User attached document: {title}"
     - User message: Include contentPlain as context
   - Alternative: Add doc to documentsMetadata for next AI query

---

### **Task 15: Attach from Library in AI**
**Files to modify:**
- `components/assistant/FloatingAIAssistant.tsx` or ModuleAssistant

**What to do:**
1. Add "Attach from Library" button in AI chat interface
2. Opens DocLibraryPicker modal
3. On selection:
   - Load full doc via `DatabaseService.loadGTMDocById()`
   - Add to documentsMetadata context (without base64 content, just metadata + plain text)
4. Display attached docs in chat UI (chips with "X" to remove)
5. Include in AI prompts as context

---

### **Task 16: Update AI System Prompts**
**Files to modify:**
- AI system prompt files (wherever prompts are defined)

**What to add:**
- Mention GTM Docs library in base system prompt
- Include instructions like: "User has access to a GTM Docs library. If they ask about documents, campaigns, ICP, personas, etc., refer to those docs."
- When docs attached, format like:
  ```
  Attached Documents:
  - [Brief] Q1 Launch Strategy (345 words)
  - [ICP Sheet] Enterprise SaaS Buyers (512 words)
  ```

---

### **Task 17: RLS Policy Testing**
**Create test file:** `supabase/test_gtm_docs_rls.sql`

**Tests to write:**
1. User A can see their own private docs
2. User A can see team docs in their workspace
3. User A CANNOT see User B's private docs (same workspace)
4. User A CANNOT see any docs from Workspace 2
5. User A can create docs in their workspace
6. User A CANNOT create docs in another workspace
7. User A can update their own docs
8. User A CANNOT update other users' docs
9. User A can delete their own docs
10. User A CANNOT delete other users' docs

**How to test:**
- Use Supabase SQL Editor with `SET LOCAL role TO 'authenticated'; SET LOCAL "request.jwt.claim.sub" TO 'user-id';`
- Run queries as different users
- Verify expected results

---

### **Task 18: Mobile Optimization**
**Files to modify:**
- `components/workspace/DocsList.tsx`
- `components/workspace/DocEditor.tsx`
- `components/workspace/WorkspaceTab.tsx`

**What to do:**
1. **WorkspaceTab:** Collapsible sidebar on mobile (hamburger menu or slide-out)
2. **DocsList:** Switch to card grid on mobile (2 columns on phones)
3. **DocEditor:**
   - Hide metadata sidebar on mobile (use tabs or bottom sheet)
   - Make Tiptap toolbar responsive (wrap or horizontal scroll)
   - Ensure touch-friendly button sizes (min 44x44px)
4. Add media queries with Tailwind breakpoints (`sm:`, `md:`, `lg:`)
5. Test on actual mobile browsers (Safari iOS, Chrome Android)

---

### **Task 19: User Documentation**
**Create file:** `docs/GTM_DOCS_USER_GUIDE.md` or in-app help section

**Topics to cover:**
1. What are GTM Docs?
2. Creating your first document
3. Using templates (how to clone, customize)
4. Document types explained (when to use each)
5. Sharing docs (Private vs Team visibility)
6. Linking docs to tasks and calendar events
7. Using "Send to AI" feature
8. Searching documents (full-text search tips)
9. Best practices for organizing docs with tags
10. Keyboard shortcuts (if implemented)

---

### **Task 20: End-to-End Testing**
**Test workflows:**
1. **Create from Template**
   - Select template → Clone → Edit → Save
   - Verify template remains unchanged
2. **Edit with Tiptap**
   - Create doc → Format text (bold, lists, headings) → Save
   - Reload page → Verify formatting persists
3. **Link to Task**
   - Create task → Attach doc → View task → See linked doc
   - Click linked doc → Opens editor
4. **Send to AI**
   - Open doc → Click "Send to AI" → Verify AI receives content
   - Ask AI about doc → Verify intelligent response
5. **Search**
   - Create doc with unique term → Search for term → Verify doc appears
6. **Share with Team**
   - User A creates team doc → User B logs in → Verify User B sees doc
7. **Private Doc Isolation**
   - User A creates private doc → User B logs in → Verify User B CANNOT see it
8. **Mobile UX**
   - Repeat above workflows on mobile browser
   - Test touch interactions, scrolling, keyboard

---

## 📊 Progress Summary

| Status | Count | Percentage |
|--------|-------|-----------|
| ✅ Completed | 7 | 35% |
| 🔄 In Progress | 0 | 0% |
| ⏳ Remaining | 13 | 65% |

---

## 🏗️ Architecture Decisions Made

### **Option B: Separate gtm_docs Table**
✅ **Chosen over extending existing documents table**

**Rationale:**
- Clean separation of concerns (binary files vs. rich text)
- Independent schema evolution
- Better performance (no heavy base64 in gtm_docs)
- Easier to optimize (separate indexes, triggers)
- Reduced migration risk

### **Database Design:**
- PostgreSQL tsvector for full-text search (no external service needed)
- JSONB for Tiptap content (flexible, queryable, validated by app)
- Flexible linking via gtm_doc_links (future-proof for new entity types)
- RLS policies at database level (security enforced, not trusted to app)

### **Frontend Design:**
- Lazy-loaded components for code splitting
- Neo-brutalist styling consistent with app theme
- Sidebar + content layout (familiar pattern like Notion, Coda)
- Optimistic UI updates where possible
- Graceful error handling and loading states

---

## 🚀 Next Steps

### **Immediate (Next 1-2 Sessions):**
1. Install Tiptap dependencies (Task 4)
2. Integrate Tiptap editor (Task 8)
3. Test database migration on staging/production
4. Seed GTM templates (Task 11)

### **Short-term (Next Week):**
5. Task and calendar linking (Tasks 12-13)
6. AI integration (Tasks 14-16)
7. RLS testing (Task 17)

### **Medium-term (Next 2 Weeks):**
8. Mobile optimization (Task 18)
9. User documentation (Task 19)
10. E2E testing (Task 20)

---

## 📝 Notes

### **Migration Deployment:**
- Database migration file ready: `supabase/migrations/20251110201512_create_gtm_docs_tables.sql`
- **DO NOT apply to production yet** - needs local/staging testing first
- Follow `GTM_DOCS_MIGRATION_GUIDE.md` for safe deployment
- Validate RLS policies thoroughly before going live

### **Performance Considerations:**
- Full-text search uses GIN index (fast, but indexes take space)
- Pagination needed for workspaces with 100+ docs
- Consider lazy-loading doc content (load metadata first, content on open)

### **Security Notes:**
- RLS policies tested locally but need multi-user validation
- Private docs visibility is critical - verify thoroughly
- Workspace isolation enforced at database level (can't be bypassed by app bugs)

---

## 🔗 Related Files

**Documentation:**
- `DOCS_WORKSPACE_IMPLEMENTATION_ANALYSIS.md` - Original 450-line analysis
- `GTM_DOCS_MIGRATION_GUIDE.md` - Database migration instructions

**Database:**
- `supabase/migrations/20251110201512_create_gtm_docs_tables.sql` - Tables, indexes, RLS
- `supabase/schema.sql` - Main schema (workspaces, profiles references)

**Types:**
- `types.ts` - GTMDoc, GTMDocMetadata, LinkedDoc, DocType, etc.
- `constants.ts` - Tab.Workspace, DOC_TYPE_LABELS, etc.

**Components:**
- `components/workspace/WorkspaceTab.tsx` - Master component
- `components/workspace/DocsList.tsx` - Document list sidebar
- `components/workspace/DocEditor.tsx` - Document editor
- `DashboardApp.tsx` - Tab switching integration

**Services:**
- `lib/services/database.ts` - All GTM Docs CRUD methods

**Git:**
- Commit `af30123` - "feat: GTM Docs Phase 1"

---

**Last Updated:** 2024-11-10  
**Next Review:** After Task 8 (Tiptap integration) completion
