# FounderHQ Document Studio — Full Redesign

> **Status**: Planning  
> **Created**: December 4, 2025  
> **Goal**: Build a premium, AI-powered document creator that's simple yet powerful—capable of creating any document type with shareable public/private links.  
> **Vision**: "Notion meets Gamma meets Canva" — beautiful, intelligent, shareable.

---

## Table of Contents

1. [Vision & Philosophy](#vision--philosophy)
2. [Current State Analysis](#current-state-analysis)
3. [Competitive Landscape](#competitive-landscape)
4. [Product Requirements](#product-requirements)
5. [Core Features](#core-features)
6. [AI Integration Strategy](#ai-integration-strategy)
7. [Sharing & Publishing](#sharing--publishing)
8. [UI/UX Design System](#uiux-design-system)
9. [Technical Architecture](#technical-architecture)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Vision & Philosophy

### The Problem

Current document editors fall into three camps:
1. **Word processors** (Google Docs, Word) — functional but ugly, no AI, boring
2. **Design tools** (Canva, Gamma) — beautiful but limited editing, templates-first
3. **Knowledge bases** (Notion, Coda) — powerful but complex, steep learning curve

**FounderHQ Document Studio** should be the intersection:

```
                    ┌─────────────────┐
                    │   BEAUTIFUL     │
                    │   (Canva/Gamma) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   POWERFUL    │    │  DOCUMENT     │    │  INTELLIGENT  │
│   (Notion)    │◄───│   STUDIO      │───►│  (ChatGPT)    │
└───────────────┘    └───────────────┘    └───────────────┘
                             │
                    ┌────────┴────────┐
                    │   SHAREABLE     │
                    │   (Medium/Substack)│
                    └─────────────────┘
```

### Design Principles

1. **Start Simple, Scale Complex** — Empty doc feels like a blank page, not an overwhelming dashboard
2. **AI as Co-Creator** — Not just a tool, but a thinking partner that understands your GTM context
3. **One-Click Publish** — Any doc can become a beautiful public page instantly
4. **Context-Aware** — Knows your company, ICP, industry, and past docs
5. **Delightful Details** — Smooth animations, thoughtful micro-interactions, premium feel

### Target Use Cases

| Use Case | Current Pain | Studio Solution |
|----------|--------------|-----------------|
| Pitch deck narrative | Switch between Figma/Slides/Docs | Rich doc with embeddable slides |
| Investor update | Manual formatting, no templates | AI-drafted, branded, one-click share |
| Sales battlecard | Static PDF, hard to update | Living doc with AI research refresh |
| Product brief | Scattered across tools | Structured blocks + AI suggestions |
| Blog/thought leadership | Export to Medium awkward | Native publish with custom domain |
| Team wiki page | Notion-like but siloed | Workspace-aware, linked entities |

---

## Current State Analysis

### Current Doc Editor (`DocEditor.tsx`)

**Stats**: ~2,800 lines, 50+ imports, heavily feature-loaded

**What's There**:
- TipTap rich text editor with full formatting
- Canvas mode for visual layouts (feature-flagged)
- AI Command Palette (feature-flagged)
- Research Copilot sidebar
- Real-time collaboration (Yjs)
- Export (PDF, Markdown, HTML, Text)
- Templates system
- Image upload + charts + shapes
- Share modal (link to entities, visibility toggle)

**What's Missing**:
| Gap | Impact |
|-----|--------|
| No public link sharing | Can't share docs outside workspace |
| No document themes/styling | All docs look the same |
| AI is sidebar-only | Not integrated into writing flow |
| No version history | Can't see or restore previous versions |
| No comments/annotations | No async feedback loop |
| Complex UI | Toolbar overload, modes confusion |
| No mobile editing | Desktop-only experience |

### Current DocVisibility Model

```typescript
type DocVisibility = 'private' | 'team';  // No 'public' option!
```

The `agent_reports` table has `share_token` for public links, but GTM docs don't.

### Current AI Models

| Component | Model | Provider |
|-----------|-------|----------|
| Web Search | `groq/compound` | Groq API |
| Fast Search | `groq/compound-mini` | Groq API |
| AI Writer | You.com `research_briefing` | You.com API |
| Vision | `llama-4-scout-17b` | Groq |
| Chat | `llama-3.3-70b-versatile` | Groq |

---

## Competitive Landscape

### Direct Competitors

| Product | Strengths | Weaknesses | Learn From |
|---------|-----------|------------|------------|
| **Notion** | Blocks, databases, wiki | Complex, slow, ugly exports | Block-based editing |
| **Gamma** | Beautiful AI presentations | Limited doc features | One-click publish, themes |
| **Coda** | Formulas, automations | Steep learning curve | Connected data |
| **Canva Docs** | Visual, templates | Basic text editing | Drag-drop, templates |
| **Google Docs** | Collaboration, familiar | No AI, ugly | Real-time collab |
| **Craft** | Beautiful, Apple-native | No web, expensive | Typography, export |

### AI Document Tools

| Product | AI Approach | Learn From |
|---------|------------|------------|
| **Jasper** | Marketing copy generation | Tone/brand settings |
| **Copy.ai** | Templates + AI fill | Workflow automation |
| **Tome** | AI-first slide generation | Generative layouts |
| **Lex** | Writing assistant sidebar | Inline suggestions |
| **Gemini Docs** | Deep research integration | Research → writing flow |

### What Makes Premium Feel Premium?

1. **Typography** — Professional font pairs, proper spacing
2. **Themes** — Light/dark, brand colors, preset styles  
3. **Animations** — Smooth transitions, delightful micro-interactions
4. **White space** — Breathing room, not cramped
5. **One-click magic** — Complex actions feel effortless
6. **Instant publish** — Beautiful public pages without export

---

## Product Requirements

### Must Have (MVP)

- [ ] **Simplified editor UI** — Clean toolbar, slash commands, focus mode
- [ ] **Public link sharing** — Generate shareable link with optional password
- [ ] **AI writing assistant** — Inline suggestions, not just sidebar
- [ ] **Document themes** — 5-10 professional themes to start
- [ ] **Mobile-responsive viewer** — Read on any device
- [ ] **Version history** — View and restore previous versions

### Should Have (V1.1)

- [ ] **Custom branding** — Logo, colors, fonts per workspace
- [ ] **Comments & mentions** — Inline feedback with @mentions
- [ ] **AI research integration** — Research flows into writing seamlessly
- [ ] **Template marketplace** — Curated GTM templates
- [ ] **SEO settings** — Meta tags, OG images for public docs
- [ ] **Analytics** — View counts, time on page for public docs

### Could Have (V1.2+)

- [ ] **Custom domains** — `docs.yourcompany.com`
- [ ] **Embeddable widgets** — Embed docs in websites
- [ ] **Multiplayer cursors** — See collaborators in real-time
- [ ] **AI voice dictation** — Speak to write
- [ ] **Scheduled publishing** — Auto-publish at specific time
- [ ] **Integrations** — Slack, email, CRM notifications

---

## Core Features

### 1. Simplified Editor Experience

**Current Problem**: Toolbar has 30+ buttons, canvas mode toggle, multiple dropdowns.

**Solution**: Progressive disclosure + slash commands

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Untitled Document                              [Share ▾] [⋯]       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  # Start typing here...                                             │    │
│  │                                                                     │    │
│  │  Type / for commands, or just start writing.                        │    │
│  │                                                                     │    │
│  │                                                                     │    │
│  │                                                                     │    │
│  │                                                                     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ✨ AI is ready  │  📊 Research  │  🎨 Theme: Modern  │  💬 0       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Slash Command Menu**:
```
/                                   ← User types /
┌─────────────────────────────────┐
│  BASICS                         │
│  ┌─────────────────────────────┐│
│  │ ¶  Text          Paragraph  ││
│  │ #  Heading 1     Large title││
│  │ ## Heading 2     Section    ││
│  │ •  Bullet list   Unordered  ││
│  │ 1. Numbered      Ordered    ││
│  │ ☐  Checklist     Tasks      ││
│  └─────────────────────────────┘│
│  MEDIA                          │
│  ┌─────────────────────────────┐│
│  │ 🖼  Image        Upload/URL ││
│  │ 📊 Chart         Data viz   ││
│  │ 📹 Video         YouTube    ││
│  │ 📄 File          Attachment ││
│  └─────────────────────────────┘│
│  AI ✨                          │
│  ┌─────────────────────────────┐│
│  │ ✨ Write with AI  Generate  ││
│  │ 🔍 Research       Find data ││
│  │ 📝 Summarize      Condense  ││
│  │ 🔄 Improve        Rewrite   ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 2. Public Link Sharing

**URL Structure**:
```
https://app.founderhq.com/d/{share_token}
https://app.founderhq.com/d/{share_token}?theme=dark
```

**Share Modal Redesign**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Share "Q4 Investor Update"                              [×]   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔗 PUBLISH TO WEB                                              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Anyone with the link can view this document.                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  https://app.founderhq.com/d/abc123xyz         [Copy]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ Public — Anyone with link                            │    │
│  │  ○ Password protected — Require password                │    │
│  │  ● Team only — Workspace members only                   │    │
│  │  ○ Private — Only you                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⚙️ OPTIONS                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ☐ Allow downloading (PDF, Word)                                │
│  ☐ Show author name                                             │
│  ☐ Enable comments                                              │
│  ☐ Expires after: [Never ▾]                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👥 TEAM ACCESS                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🟢 You (Owner)                          Can edit       │    │
│  │  🟢 Sarah Chen                           Can edit  [▾]  │    │
│  │  🟡 Mike Johnson                         Can view  [▾]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [+ Invite team member]                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                              [Cancel]  [Save & Copy Link]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Document Themes

**Theme Selector**:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Document Theme                                       [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  ░░░░░░░  │  │  ▓▓▓▓▓▓▓  │  │  ░▓░▓░▓░  │  │  ▓░▓░▓░▓  │    │
│  │  ░ Aa ░░  │  │  ▓ Aa ▓▓  │  │  ░ Aa ░░  │  │  ▓ Aa ▓▓  │    │
│  │  ░░░░░░░  │  │  ▓▓▓▓▓▓▓  │  │  ░░░░░░░  │  │  ▓▓▓▓▓▓▓  │    │
│  │  ───────  │  │  ───────  │  │  ───────  │  │  ───────  │    │
│  │  Modern   │  │  Dark     │  │  Minimal  │  │  Bold     │    │
│  │    ✓      │  │           │  │           │  │           │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  ▒▒▒▒▒▒▒  │  │  ████████ │  │  ░░░░░░░  │  │  ▓▓▓▓▓▓▓  │    │
│  │  ▒ Aa ▒▒  │  │  █ Aa ██  │  │  ░ Aa ░░  │  │  ▓ Aa ▓▓  │    │
│  │  ▒▒▒▒▒▒▒  │  │  ████████ │  │  ░░░░░░░  │  │  ▓▓▓▓▓▓▓  │    │
│  │  ───────  │  │  ───────  │  │  ───────  │  │  ───────  │    │
│  │  Warm     │  │  Startup  │  │  Paper    │  │  Pro      │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  CUSTOMIZE                                                      │
│                                                                 │
│  Font: [Inter ▾]           Heading: [Playfair Display ▾]        │
│  Accent: [████ #6366F1]    Background: [████ #FFFFFF]           │
│                                                                 │
│  [Preview]                                   [Apply Theme]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. AI Writing Integration (Inline)

**Not just a sidebar — AI woven into the writing experience:**

```
User types: "Write an introduction about our product"
                                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  # Product Overview                                             │
│                                                                 │
│  Write an introduction about our product|                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✨ AI is writing...                                      │   │
│  │                                                          │   │
│  │ "Acme Analytics is the first AI-powered business        │   │
│  │ intelligence platform designed specifically for         │   │
│  │ early-stage startups. We help founders make data-       │   │
│  │ driven decisions without requiring a data team..."      │   │
│  │                                                          │   │
│  │ [Accept]  [Regenerate]  [Shorter]  [More formal]  [×]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**AI Trigger Points**:
1. **Explicit**: `/ai` or `Cmd+J` opens AI command
2. **Contextual**: Select text → bubble menu has "✨ Improve" 
3. **Proactive**: AI notices patterns, suggests continuations
4. **Research → Write**: Research findings flow directly into doc

### 5. Version History

```
┌─────────────────────────────────────────────────────────────────┐
│  📜 Version History                                      [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ● Current version                           Just now   │    │
│  │    You · 2,847 words                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ Added pricing section                    2 hours ago │    │
│  │    You · 2,412 words · +435 words                       │    │
│  │                                    [Preview] [Restore]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ Initial draft                            Yesterday   │    │
│  │    You · 1,203 words                                    │    │
│  │                                    [Preview] [Restore]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ○ Auto-save                            Dec 2, 4:32 PM  │    │
│  │    System · 856 words                                   │    │
│  │                                    [Preview] [Restore]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Show all versions...]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Integration Strategy

### AI Architecture

**Three Layers of AI Assistance**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  LAYER 3: RESEARCH INTELLIGENCE                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Deep research → synthesized insights → auto-citations          │
│  Model: groq/compound + You.com research_briefing               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LAYER 2: WRITING ASSISTANT                                     │
│  ─────────────────────────────────────────────────────────────  │
│  Generate sections, rewrite, expand, condense, translate        │
│  Model: llama-3.3-70b-versatile (fast) + claude-3.5 (quality)  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LAYER 1: CONTEXTUAL SUGGESTIONS                                │
│  ─────────────────────────────────────────────────────────────  │
│  Auto-complete, grammar, formatting hints, quick fixes          │
│  Model: llama-3.1-8b-instant (ultra-fast, local-feel)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Context Injection

Every AI call includes workspace context:

```typescript
interface AIDocumentContext {
  // Workspace context
  companyName: string;
  industry: string;
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth';
  icp: string;
  productDescription: string;
  
  // Document context
  docType: DocType;
  docTitle: string;
  currentContent: string; // Last 2000 chars for context
  cursorPosition: number;
  selectedText?: string;
  
  // Style context
  tone: 'formal' | 'conversational' | 'technical' | 'persuasive';
  targetAudience: string;
  
  // History context
  recentDocs: Array<{ title: string; summary: string }>;
}
```

### Model Routing

| Task | Latency Needs | Model | Provider |
|------|---------------|-------|----------|
| Auto-suggestions | <500ms | `llama-3.1-8b-instant` | Groq |
| Quick rewrite | <2s | `llama-3.3-70b-versatile` | Groq |
| Section generation | <10s | `claude-3.5-sonnet` | Anthropic |
| Deep research | <30s | `groq/compound` | Groq |
| Research synthesis | <15s | You.com `research_briefing` | You.com |
| Image analysis | <5s | `llama-4-scout-17b` | Groq |

---

## Sharing & Publishing

### Database Schema Changes

```sql
-- Add to gtm_docs table
ALTER TABLE gtm_docs ADD COLUMN IF NOT EXISTS
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  share_password_hash TEXT,
  share_expires_at TIMESTAMPTZ,
  allow_download BOOLEAN DEFAULT TRUE,
  allow_comments BOOLEAN DEFAULT FALSE,
  show_author BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  theme_id TEXT DEFAULT 'modern',
  custom_og_image TEXT,
  custom_og_title TEXT,
  custom_og_description TEXT;

-- Create share_token index
CREATE INDEX IF NOT EXISTS idx_gtm_docs_share_token 
  ON gtm_docs(share_token) WHERE share_token IS NOT NULL;

-- Document versions table
CREATE TABLE IF NOT EXISTS doc_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id UUID REFERENCES gtm_docs(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  content_json JSONB,
  word_count INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version_note TEXT,
  is_auto_save BOOLEAN DEFAULT FALSE
);

-- Create index for version history
CREATE INDEX idx_doc_versions_doc_id ON doc_versions(doc_id, created_at DESC);

-- Document themes table
CREATE TABLE IF NOT EXISTS doc_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  font_body TEXT DEFAULT 'Inter',
  font_heading TEXT DEFAULT 'Inter',
  color_primary TEXT DEFAULT '#6366F1',
  color_background TEXT DEFAULT '#FFFFFF',
  color_text TEXT DEFAULT '#1F2937',
  css_overrides TEXT,
  is_system BOOLEAN DEFAULT TRUE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default themes
INSERT INTO doc_themes (id, name, description, font_body, font_heading, color_primary) VALUES
  ('modern', 'Modern', 'Clean and professional', 'Inter', 'Inter', '#6366F1'),
  ('dark', 'Dark Mode', 'Easy on the eyes', 'Inter', 'Inter', '#818CF8'),
  ('minimal', 'Minimal', 'Simple and focused', 'system-ui', 'system-ui', '#000000'),
  ('bold', 'Bold', 'Make a statement', 'Inter', 'Plus Jakarta Sans', '#DC2626'),
  ('warm', 'Warm', 'Friendly and approachable', 'Lora', 'Playfair Display', '#D97706'),
  ('startup', 'Startup', 'Modern tech aesthetic', 'Space Grotesk', 'Space Grotesk', '#7C3AED'),
  ('paper', 'Paper', 'Classic document feel', 'Merriweather', 'Merriweather', '#374151'),
  ('pro', 'Pro', 'Executive style', 'IBM Plex Sans', 'IBM Plex Serif', '#1E40AF')
ON CONFLICT (id) DO NOTHING;
```

### Visibility Types

```typescript
type DocVisibility = 
  | 'private'     // Only owner can view/edit
  | 'team'        // Workspace members can view/edit based on role
  | 'public'      // Anyone with link can view (no auth required)
  | 'password';   // Anyone with link + password can view

interface DocShareSettings {
  visibility: DocVisibility;
  shareToken?: string;
  passwordHash?: string;
  expiresAt?: Date;
  allowDownload: boolean;
  allowComments: boolean;
  showAuthor: boolean;
}
```

### Public Document Viewer

New route: `/d/[shareToken]`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  📄 FounderHQ                                    [Download ▾]       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│                      Q4 2025 Investor Update                                │
│                                                                             │
│                         Acme Analytics, Inc.                                │
│                           December 2025                                     │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  ## Executive Summary                                                       │
│                                                                             │
│  Q4 marked a pivotal quarter for Acme Analytics. We achieved               │
│  $1.2M ARR (+47% QoQ), signed 12 new enterprise customers, and            │
│  launched our AI-powered forecasting module...                             │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                             │
│                        [Read time: 8 min]                                   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Created with FounderHQ · Try it free →                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI/UX Design System

### Component Library

**New Components Needed**:

| Component | Purpose |
|-----------|---------|
| `SlashCommandMenu` | Slash command palette for block insertion |
| `InlineAIPanel` | Floating AI suggestion panel |
| `ThemePicker` | Theme selection modal |
| `ShareSettings` | Enhanced share modal |
| `VersionHistory` | Version history sidebar |
| `PublicDocViewer` | Read-only themed doc viewer |
| `DocHeader` | Simplified top bar with title + actions |
| `StatusBar` | Bottom bar with AI status, word count, etc. |

### Design Tokens

```typescript
// lib/design/tokens.ts

export const documentThemes = {
  modern: {
    fontBody: 'Inter, system-ui, sans-serif',
    fontHeading: 'Inter, system-ui, sans-serif',
    colorPrimary: '#6366F1',
    colorBackground: '#FFFFFF',
    colorSurface: '#F9FAFB',
    colorText: '#1F2937',
    colorTextMuted: '#6B7280',
    borderRadius: '12px',
    spacing: 1.5,
  },
  dark: {
    fontBody: 'Inter, system-ui, sans-serif',
    fontHeading: 'Inter, system-ui, sans-serif',
    colorPrimary: '#818CF8',
    colorBackground: '#111827',
    colorSurface: '#1F2937',
    colorText: '#F9FAFB',
    colorTextMuted: '#9CA3AF',
    borderRadius: '12px',
    spacing: 1.5,
  },
  // ... other themes
};

export const editorStyles = {
  toolbar: {
    height: '48px',
    background: 'white',
    borderBottom: '1px solid #E5E7EB',
  },
  content: {
    maxWidth: '720px',
    padding: '48px 24px',
    lineHeight: 1.75,
  },
  statusBar: {
    height: '32px',
    background: '#F9FAFB',
    borderTop: '1px solid #E5E7EB',
  },
};
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+J` | Open AI assistant |
| `Cmd+K` | Insert link |
| `Cmd+/` | Toggle formatting toolbar |
| `Cmd+Shift+P` | Open slash command menu |
| `Cmd+S` | Save document |
| `Cmd+Shift+S` | Share document |
| `Cmd+E` | Toggle focus mode |
| `Cmd+Shift+H` | Open version history |
| `Cmd+Shift+E` | Export document |

---

## Technical Architecture

### File Structure

```
components/
├── document-studio/
│   ├── DocumentStudio.tsx          ← Main container (replaces DocEditor.tsx)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── EditorCore.tsx      ← TipTap wrapper
│   │   │   ├── EditorToolbar.tsx   ← Simplified toolbar
│   │   │   ├── EditorBubbleMenu.tsx
│   │   │   ├── SlashCommandMenu.tsx
│   │   │   └── EditorStatusBar.tsx
│   │   ├── ai/
│   │   │   ├── InlineAIPanel.tsx
│   │   │   ├── AICommandPalette.tsx
│   │   │   ├── ResearchPanel.tsx
│   │   │   └── AISuggestionBubble.tsx
│   │   ├── share/
│   │   │   ├── ShareModal.tsx
│   │   │   ├── ShareSettings.tsx
│   │   │   └── EmbedCodeGenerator.tsx
│   │   ├── theme/
│   │   │   ├── ThemePicker.tsx
│   │   │   ├── ThemePreview.tsx
│   │   │   └── CustomThemeEditor.tsx
│   │   ├── history/
│   │   │   ├── VersionHistorySidebar.tsx
│   │   │   ├── VersionCompare.tsx
│   │   │   └── VersionPreview.tsx
│   │   └── header/
│   │       ├── DocumentHeader.tsx
│   │       └── DocumentBreadcrumb.tsx
│   ├── hooks/
│   │   ├── useDocumentAI.ts
│   │   ├── useDocumentShare.ts
│   │   ├── useDocumentTheme.ts
│   │   ├── useVersionHistory.ts
│   │   └── useSlashCommands.ts
│   └── types/
│       └── document.types.ts
│
pages/
├── d/
│   └── [shareToken].tsx            ← Public document viewer
│
lib/
├── document/
│   ├── themes.ts                   ← Theme definitions
│   ├── shareService.ts             ← Share link management
│   └── versionService.ts           ← Version history management
```

### API Endpoints

```typescript
// Existing - keep
POST /functions/v1/ai-search          // Web research
POST /functions/v1/you-agent-run      // AI writing

// New - document studio
POST /functions/v1/doc-share          // Create/update share link
GET  /functions/v1/doc-public/:token  // Get public doc (no auth)
POST /functions/v1/doc-version        // Create version snapshot
GET  /functions/v1/doc-versions/:id   // List versions
POST /functions/v1/doc-ai-write       // Inline AI writing
POST /functions/v1/doc-ai-suggest     // Quick suggestions
```

### State Management

```typescript
// contexts/DocumentStudioContext.tsx

interface DocumentStudioState {
  // Document data
  doc: GTMDoc | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  
  // Editor state
  editor: Editor | null;
  isFullscreen: boolean;
  isFocusMode: boolean;
  
  // AI state
  aiPanelOpen: boolean;
  aiLoading: boolean;
  aiSuggestion: string | null;
  researchPanelOpen: boolean;
  
  // Theme state
  currentTheme: DocumentTheme;
  themePickerOpen: boolean;
  
  // Share state
  shareSettings: DocShareSettings;
  shareModalOpen: boolean;
  
  // Version state
  versions: DocVersion[];
  versionHistoryOpen: boolean;
  comparingVersionId: string | null;
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: New editor shell with simplified UI

- [ ] Create `DocumentStudio.tsx` container
- [ ] Implement simplified `EditorToolbar.tsx`
- [ ] Build `SlashCommandMenu.tsx`
- [ ] Create `EditorStatusBar.tsx`
- [ ] Add focus mode toggle
- [ ] Migrate core TipTap setup from `DocEditor.tsx`
- [ ] Feature flag: `docs.studio-v2`

### Phase 2: Public Sharing (Week 2-3)

**Goal**: Generate shareable links for any document

- [ ] Add `share_token` to `gtm_docs` schema
- [ ] Create `doc-share` edge function
- [ ] Build new `ShareModal.tsx` with visibility options
- [ ] Create `/d/[shareToken]` public viewer page
- [ ] Implement password protection
- [ ] Add expiration dates
- [ ] Track view counts

### Phase 3: Document Themes (Week 3-4)

**Goal**: Beautiful, professional document appearance

- [ ] Create `doc_themes` table with defaults
- [ ] Build `ThemePicker.tsx` component
- [ ] Implement theme CSS injection
- [ ] Add custom font loading
- [ ] Create print-friendly styles
- [ ] Theme public viewer page

### Phase 4: AI Integration (Week 4-5)

**Goal**: Inline AI writing, not just sidebar

- [ ] Build `InlineAIPanel.tsx`
- [ ] Implement `/ai` slash command
- [ ] Add "✨ Improve" to bubble menu
- [ ] Create `doc-ai-write` edge function
- [ ] Build quick suggestions system
- [ ] Integrate research → writing flow

### Phase 5: Version History (Week 5-6)

**Goal**: Track and restore document history

- [ ] Create `doc_versions` table
- [ ] Build `VersionHistorySidebar.tsx`
- [ ] Implement auto-save versioning
- [ ] Add version comparison view
- [ ] Create restore functionality
- [ ] Show diff visualization

### Phase 6: Polish & Launch (Week 6-7)

- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Mobile responsive viewer
- [ ] Analytics tracking
- [ ] Documentation
- [ ] Migration path from old editor
- [ ] Remove feature flag, full rollout

---

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Doc creation rate | Unknown | +40% | Docs created per workspace per week |
| Time to publish | N/A | <30s | Time from "Share" click to copied link |
| Public doc views | 0 | >1000/mo | Total public doc pageviews |
| AI usage rate | ~15% | >50% | % of docs using AI features |
| NPS for docs | Unknown | >50 | In-app survey |
| Share conversion | N/A | 30% | % of docs that get shared publicly |

---

## Open Questions

1. **Custom domains**: Support `docs.company.com`? (Complex, maybe V2)
2. **Comments on public docs**: Allow anonymous or require sign-up?
3. **Real-time collab**: Keep Yjs or simplify for V1?
4. **Migration**: Auto-migrate old docs or parallel systems?
5. **Pricing**: Which features are free vs. paid tier?

---

## Research Copilot Integration

The Research Copilot becomes a **panel within Document Studio**, not a separate component:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Document Studio                                                            │
├─────────────────────────────────────┬───────────────────────────────────────┤
│                                     │                                       │
│       EDITOR (80%)                  │      RESEARCH PANEL (20%)            │
│                                     │                                       │
│  ┌─────────────────────────────┐    │   ┌───────────────────────────────┐   │
│  │                             │    │   │  🔍 Search the web...        │   │
│  │  # Product Brief            │    │   └───────────────────────────────┘   │
│  │                             │    │                                       │
│  │  ## Overview                │    │   📊 SOURCES (4)                     │
│  │                             │    │   ┌───────────────────────────────┐   │
│  │  Our product helps...       │    │   │ ⭐⭐⭐ McKinsey Report        │   │
│  │                             │    │   │ [Insert] [Cite]              │   │
│  │                             │    │   └───────────────────────────────┘   │
│  │  ## Market Analysis         │    │                                       │
│  │                             │    │   ✨ AI SYNTHESIS                     │
│  │  |                          │    │   "Key finding: 47% of..."           │
│  │                             │    │   [Insert]                            │
│  │                             │    │                                       │
│  └─────────────────────────────┘    │                                       │
│                                     │                                       │
├─────────────────────────────────────┴───────────────────────────────────────┤
│  ✨ AI ready │ 📊 Research │ 🎨 Modern │ 1,234 words │ Saved 2m ago        │
└─────────────────────────────────────────────────────────────────────────────┘
```

The original Research Copilot redesign plan (canvas, plan, synthesis) becomes the **Research Panel** within this larger Document Studio vision.

---

## References

- [Notion](https://notion.so) — Block-based editing, databases
- [Gamma](https://gamma.app) — AI-first presentations, beautiful defaults
- [Canva Docs](https://canva.com/docs) — Visual, drag-drop, templates
- [Craft](https://craft.do) — Typography, Apple-native experience
- [Lex](https://lex.page) — AI writing assistant
- [Substack](https://substack.com) — Simple publish, email integration
- [Medium](https://medium.com) — Clean reader experience

---

*Document last updated: December 4, 2025*
