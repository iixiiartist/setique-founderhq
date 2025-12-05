# GTM Docs User Guide

## Overview

GTM Docs is a rich-text document authoring system designed for Go-To-Market workflows. Create professional documents like briefs, battlecards, campaign plans, and more with real-time collaboration support.

## Document Types

| Type | Icon | Description | Use Case |
|------|------|-------------|----------|
| **Brief** | 📋 | Strategic overview documents | Executive summaries, product briefs, launch plans |
| **Campaign** | 📢 | Marketing campaign plans | Campaign strategy, channel mix, timeline |
| **Meeting Notes** | 📝 | Structured meeting documentation | Team meetings, client calls, all-hands |
| **Battlecard** | ⚔️ | Competitive analysis cards | Win/loss analysis, competitor comparison |
| **Outbound Template** | 💼 | Sales outreach templates | Email sequences, pitch decks |
| **ICP Sheet** | 🎯 | Ideal Customer Profile docs | Target audience definition |
| **Persona** | 👤 | Buyer persona documentation | User research, buyer journey |
| **Competitive Snapshot** | 📊 | Quick competitive intel | Market positioning, feature comparison |

## Features

### Rich Text Editing
- Full formatting: bold, italic, headings, lists
- Tables for structured data
- Task lists with checkboxes
- Blockquotes for callouts
- Code blocks for technical content
- Highlights and marks

### Templates
Pre-built templates for common GTM documents:
- Executive Summary
- Product Brief  
- Product Launch Plan
- Competitive Analysis
- Sales Deck
- Ideal Customer Profile
- Marketing Campaign Plan
- Meeting Notes
- Quarterly Business Review

To use a template:
1. Click "New Document"
2. Select "From Template"
3. Choose your template
4. Customize content

### Visibility Controls

| Setting | Who Can See | Who Can Edit |
|---------|-------------|--------------|
| **Team** | All workspace members | Document owner |
| **Private** | Only document owner | Document owner |

### Document Linking

Link documents to other workspace entities:
- **Tasks** - Reference docs from task details
- **Calendar Events** - Attach docs to meetings
- **CRM Items** - Link to investors, customers, partners
- **Contacts** - Associate docs with specific people
- **Chat/Huddle** - Share docs in conversations

### Search

Full-text search across all your documents:
- Search by title
- Search within content
- Filter by document type
- Results ranked by relevance

**Tips for effective search:**
- Use specific keywords from your document
- Try multiple search terms
- Filter by doc type to narrow results

### AI Integration

Documents can be attached to AI conversations for context:
1. Open Huddle AI chat
2. Click "Attach Document"
3. Select relevant GTM docs
4. AI uses document content for context

**Note:** Document content is truncated to ~8000 characters for AI context to avoid token limits.

### Real-Time Collaboration

Multiple users can view documents simultaneously:
- See who's currently viewing
- Changes sync automatically
- Offline edits sync when reconnected

**Status indicators:**
- 🟢 Connected - Real-time sync active
- 🟡 Connecting - Establishing connection
- 🔴 Disconnected - Working offline

## Limits & Best Practices

### Document Size
- Maximum content size: ~10MB per document
- Recommended: Keep documents focused and under 50 pages
- Large documents may slow editor performance

### Pagination
- Document lists show 20 items at a time
- Click "Load More" to see additional documents
- Search returns up to 50 results

### Templates
- Templates are seeded automatically per workspace
- Template content updates on app version changes
- Custom templates coming soon

### Performance Tips
1. **Keep documents focused** - Split large docs into multiple smaller ones
2. **Use doc types** - Proper categorization improves search
3. **Add tags** - Tags improve discoverability
4. **Archive old docs** - Delete documents you no longer need

## Troubleshooting

### Document won't save
1. Check internet connection
2. Verify you own the document
3. Ensure content isn't too large
4. Try refreshing the page

### Search not finding documents
1. Check spelling of search terms
2. Try broader search terms
3. Verify document visibility (private docs only visible to owner)
4. Wait a moment for search index to update after changes

### Collaboration not working
1. Check internet connection status
2. Look for the collaboration status indicator
3. Try refreshing the page
4. Check if multiple tabs are open (can cause conflicts)

### Templates not loading
1. Templates are auto-seeded on first workspace access
2. Try refreshing the document library
3. Check console for errors

## Mobile Usage

GTM Docs work on mobile browsers with some differences:
- Simplified toolbar
- Touch-optimized editing
- Reduced collaboration features
- Pagination for performance

For best experience, use desktop for complex document editing.

## Data & Privacy

### Content Storage
- Documents stored in Supabase PostgreSQL
- Content encrypted at rest
- Workspace isolation enforced via RLS

### Backups
- Database backed up by Supabase
- Consider exporting critical documents

### Sharing
- No public sharing currently supported
- Documents only visible within workspace
- Future: External sharing with access controls

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + S` | Save document |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + /` | Toggle code block |

## Getting Help

- Check this guide for common issues
- Contact support via the Help menu
- Report bugs through the feedback form

---

*Last updated: December 2025*
