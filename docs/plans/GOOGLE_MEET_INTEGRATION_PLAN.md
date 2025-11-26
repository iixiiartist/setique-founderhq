# Google Meet Integration Plan for FounderHQ

**Created:** November 26, 2025  
**Status:** Planning Phase  
**Priority:** Future Enhancement

---

## Executive Summary

This document outlines a comprehensive plan to integrate Google Meet with FounderHQ, enabling:
- Automatic meeting transcript capture and storage
- AI-powered meeting summarization via Groq
- Automatic action item extraction and task creation
- Pre-meeting attendee research via You.com
- Unified Meetings Tab for managing all video conferences

---

## 1. Current Infrastructure Assessment

### ✅ Existing Meeting System

**Database Schema (`meetings` table):**
```sql
meetings: {
  id: UUID PRIMARY KEY
  user_id: UUID (FK → profiles)
  contact_id: UUID (FK → contacts)  
  workspace_id: UUID (FK → workspaces)
  timestamp: TIMESTAMPTZ
  title: TEXT
  attendees: TEXT
  summary: TEXT (Markdown)
  created_at / updated_at: TIMESTAMPTZ
}
```

**TypeScript Interface:**
```typescript
interface Meeting {
    id: string;
    timestamp: number;
    title: string;
    attendees: string;
    summary: string; // Markdown
}
```

**Existing AI/Groq Tools:**
- `createMeeting` - Creates meeting with title, date, attendees, summary
- `updateMeeting` - Updates meeting details
- `deleteMeeting` - Removes meetings
- `searchContacts` - Finds contacts for meeting association

**Existing Edge Functions:**
- `groq-chat/index.ts` - Proxies Groq API, handles tool calls
- `ai-search/index.ts` - You.com search integration (RAG ready)

### 🔴 Gaps for Google Meet Integration

| Component | Current Status | Required |
|-----------|----------------|----------|
| Meeting storage | ✅ Basic fields | Need: `meet_link`, `transcript_id`, `recording_url` |
| Transcript storage | ❌ Missing | Need: `meeting_transcripts` table |
| Google OAuth | ❌ Missing | Need: Google Workspace API integration |
| Calendar sync | 🟡 Partial | Need: External calendar sync |
| Action item extraction | 🟡 Manual | Need: Automatic trigger from transcripts |
| You.com context | ✅ Ready | Need: Pre-meeting enrichment flow |

---

## 2. Proposed Database Schema

### New Table: `meeting_transcripts`

```sql
CREATE TABLE IF NOT EXISTS meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Transcript data
    raw_transcript TEXT,                    -- Full transcript text
    structured_transcript JSONB,            -- Speaker-segmented JSON
    transcript_source TEXT CHECK (transcript_source IN ('google_meet', 'manual', 'upload')),
    
    -- AI-generated content
    summary TEXT,                           -- AI-generated summary
    key_decisions JSONB,                    -- [{decision, context, timestamp}]
    action_items JSONB,                     -- [{task, assignee, due_date, created_task_id}]
    sentiment_analysis JSONB,               -- Meeting mood/engagement metrics
    
    -- Search context (You.com enrichment)
    participant_context JSONB,              -- Pre-meeting research on attendees
    company_context JSONB,                  -- Company news/funding data
    
    -- Metadata
    duration_minutes INTEGER,
    participant_count INTEGER,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transcripts_meeting ON meeting_transcripts(meeting_id);
CREATE INDEX idx_transcripts_workspace ON meeting_transcripts(workspace_id);
CREATE INDEX idx_transcripts_status ON meeting_transcripts(processing_status);

-- RLS Policies
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transcripts in their workspace"
    ON meeting_transcripts FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert transcripts in their workspace"
    ON meeting_transcripts FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update transcripts in their workspace"
    ON meeting_transcripts FOR UPDATE
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));
```

### Schema Extension: `meetings` table

```sql
-- Add Google Meet fields to existing meetings table
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS meet_link TEXT,
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS has_transcript BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'internal' 
    CHECK (meeting_type IN ('internal', 'external', 'client', 'investor', 'partner'));

-- Index for Google Calendar sync
CREATE INDEX IF NOT EXISTS idx_meetings_google_event ON meetings(google_event_id);
```

### New Table: `google_integrations`

```sql
CREATE TABLE IF NOT EXISTS google_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- OAuth tokens (encrypted)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    
    -- Scopes granted
    scopes TEXT[] DEFAULT '{}',
    
    -- Sync settings
    sync_calendar BOOLEAN DEFAULT TRUE,
    sync_transcripts BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, workspace_id)
);

-- RLS
ALTER TABLE google_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integrations"
    ON google_integrations FOR ALL
    USING (user_id = auth.uid());
```

---

## 3. Architecture Overview

### End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GOOGLE MEET INTEGRATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Google     │    │  Supabase   │    │   Groq      │    │  FounderHQ  │  │
│  │  Meet API   │───►│  Edge Fn    │───►│  (via proxy)│───►│    UI       │  │
│  │  + Calendar │    │  webhook    │    │             │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                 │                   │                   │         │
│         │                 │                   │                   │         │
│  1. Meeting ends   2. Store        3. Summarize &      4. Display in       │
│     + transcript      transcript      extract actions     Meetings Tab      │
│     available                                                               │
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  You.com    │◄──── Pre-meeting enrichment (attendee research)           │
│  │  AI Search  │                                                            │
│  └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Supabase Edge Functions Required

| Function | Purpose |
|----------|---------|
| `google-auth/index.ts` | OAuth 2.0 flow for Google Workspace |
| `google-calendar-sync/index.ts` | Bidirectional calendar sync |
| `process-transcript/index.ts` | Transcript ingestion + AI processing |
| `meeting-webhook/index.ts` | Google Calendar webhook receiver |

---

## 4. Proposed Meetings Tab UI

### Tab Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎥 Meetings                                              [+ New Meeting]    │
├──────────────┬──────────────┬──────────────┬──────────────────────────────┤
│  Upcoming    │   Past       │  Transcripts │         Filter & Search       │
├──────────────┴──────────────┴──────────────┴──────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Tomorrow, 2:00 PM                                    🟢 Google Meet  │   │
│  │ Q4 Planning with Apollo Ventures                                     │   │
│  │ 👤 John Smith (Partner), Jane Doe (CFO)                             │   │
│  │ 🏢 Apollo Ventures • Investor                                        │   │
│  │ ┌──────────────────────────────────────────────────────────────┐    │   │
│  │ │ 📋 Pre-Meeting Intel (via You.com)                           │    │   │
│  │ │ • Apollo led $25M SaaS round last month                      │    │   │
│  │ │ • John Smith promoted to Managing Partner                    │    │   │
│  │ └──────────────────────────────────────────────────────────────┘    │   │
│  │ [Join Meet] [View CRM] [Add Agenda] [Research Attendees]            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Yesterday, 3:30 PM                                   ✅ Completed    │   │
│  │ Product Demo with Acme Corp                                          │   │
│  │ 👤 Sarah Johnson (Head of Product)                                   │   │
│  │ 🏢 Acme Corp • Customer                                              │   │
│  │ ┌──────────────────────────────────────────────────────────────┐    │   │
│  │ │ 📝 AI Summary                                                 │    │   │
│  │ │ Discussed pricing tiers. Sarah interested in Enterprise.      │    │   │
│  │ │ Key Decision: Proceed with pilot program in January.          │    │   │
│  │ └──────────────────────────────────────────────────────────────┘    │   │
│  │ ┌──────────────────────────────────────────────────────────────┐    │   │
│  │ │ ✅ Action Items (Auto-created)                               │    │   │
│  │ │ □ Send Enterprise pricing sheet → Due: Nov 28                │    │   │
│  │ │ □ Schedule follow-up call → Due: Dec 5                       │    │   │
│  │ └──────────────────────────────────────────────────────────────┘    │   │
│  │ [View Transcript] [Edit Summary] [View CRM]                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key UI Components

1. **Meeting Cards** - Show upcoming/past meetings with CRM context
2. **Intel Panel** - Pre-meeting You.com research on attendees
3. **Transcript Viewer** - Full transcript with speaker labels
4. **Action Items Panel** - Auto-extracted tasks linked to meeting
5. **Quick Actions** - Join Meet, View CRM, Research buttons

---

## 5. AI Integration

### New Groq Tool Definitions

```typescript
// Process meeting transcript
const processTranscriptTool: GroqTool = {
    type: 'function',
    function: {
        name: 'processMeetingTranscript',
        description: 'Analyzes a meeting transcript to extract summary, decisions, and action items',
        parameters: {
            type: 'object',
            properties: {
                meetingId: { type: 'string', description: 'The meeting ID to process' },
                transcript: { type: 'string', description: 'Raw transcript text' },
                participants: { 
                    type: 'array', 
                    items: { type: 'string' }, 
                    description: 'List of participant names' 
                },
                context: { type: 'string', description: 'Additional context about the meeting' }
            },
            required: ['meetingId', 'transcript']
        }
    }
};

// Research meeting participants
const researchParticipantsTool: GroqTool = {
    type: 'function',
    function: {
        name: 'researchMeetingParticipants',
        description: 'Uses You.com to research meeting attendees before a call',
        parameters: {
            type: 'object',
            properties: {
                meetingId: { type: 'string' },
                participantNames: { 
                    type: 'array', 
                    items: { type: 'string' } 
                },
                companyName: { type: 'string' }
            },
            required: ['meetingId', 'participantNames']
        }
    }
};

// Schedule meeting with Google Meet
const scheduleMeetingTool: GroqTool = {
    type: 'function',
    function: {
        name: 'scheduleGoogleMeeting',
        description: 'Creates a Google Calendar event with Google Meet link',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                dateTime: { type: 'string', description: 'ISO 8601 datetime' },
                duration: { type: 'number', description: 'Duration in minutes' },
                attendees: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Email addresses of attendees'
                },
                crmItemId: { type: 'string', description: 'Link to CRM account' },
                contactId: { type: 'string', description: 'Link to contact' }
            },
            required: ['title', 'dateTime', 'duration']
        }
    }
};
```

### Transcript Processing Pipeline

```typescript
// System prompt for transcript processing
const TRANSCRIPT_PROCESSING_PROMPT = `
You are analyzing a meeting transcript from FounderHQ.
Your task is to extract:

1. **Summary** (2-3 paragraphs): Key discussion points and outcomes
2. **Key Decisions** (JSON array): Decisions made during the meeting
3. **Action Items** (JSON array): Tasks with assignee and due date

Context:
- Company: {companyName}
- CRM Type: {crmType} (investor/customer/partner)
- Participants: {participants}
- Meeting Date: {meetingDate}

Output format:
{
  "summary": "markdown text",
  "keyDecisions": [
    {"decision": "text", "context": "why", "participants": ["names"]}
  ],
  "actionItems": [
    {"task": "description", "assignee": "name or null", "dueDate": "YYYY-MM-DD or null", "priority": "Low|Medium|High"}
  ]
}
`;
```

---

## 6. Google API Requirements

### Required OAuth Scopes

```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/meetings.space.readonly
https://www.googleapis.com/auth/meetings.space.created
```

### Google Cloud Console Setup

1. Create project in Google Cloud Console
2. Enable APIs:
   - Google Calendar API
   - Google Meet REST API
   - Admin SDK (for workspace-level access)
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add redirect URIs for Supabase Edge Functions

### Webhook Configuration

```
Webhook URL: https://{supabase-project}.supabase.co/functions/v1/meeting-webhook
Events to watch:
- calendar.events.created
- calendar.events.updated
- calendar.events.deleted
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Run database migrations (new tables + columns)
- [ ] Create `MeetingsTab.tsx` component shell
- [ ] Add "Meetings" to navigation (`constants.ts`)
- [ ] Wire up existing meeting data to new tab
- [ ] Update `types.ts` with extended Meeting interface

### Phase 2: Google Integration (Week 3-4)
- [ ] Create `google-auth` Edge Function
- [ ] Build OAuth connection UI in Settings
- [ ] Create `google-calendar-sync` Edge Function
- [ ] Implement bidirectional calendar sync
- [ ] Display Google Meet links in meeting cards

### Phase 3: Transcript Processing (Week 5-6)
- [ ] Create `process-transcript` Edge Function
- [ ] Build transcript upload UI (manual + API)
- [ ] Implement Groq summarization pipeline
- [ ] Auto-create tasks from action items
- [ ] Store structured transcripts

### Phase 4: You.com Enrichment (Week 7)
- [ ] Pre-meeting research trigger
- [ ] Display intel cards in meeting view
- [ ] Integrate with existing `ai-search` Edge Function
- [ ] Cache research results for offline access

### Phase 5: Polish & Calendar Integration (Week 8)
- [ ] Cross-link with existing Calendar Tab
- [ ] Add meeting creation from Calendar quick-add
- [ ] Notification system for upcoming meetings
- [ ] Mobile-responsive design

---

## 8. Security Considerations

### Token Storage
- Store Google OAuth tokens encrypted in Supabase
- Use `pgcrypto` extension for encryption at rest
- Implement token rotation on refresh

### API Key Management
- Keep Google API keys in Supabase secrets
- Keep You.com API key server-side only
- Never expose tokens to client

### Rate Limiting
- Apply existing rate-limit patterns from `groq-chat`
- Implement per-user quotas for transcript processing
- Cache You.com research to reduce API calls

### RLS Policies
- All new tables have workspace-scoped RLS
- Transcripts inherit meeting permissions
- Google tokens are user-scoped

---

## 9. TypeScript Interface Updates

### Extended Meeting Type

```typescript
// types.ts additions

export interface MeetingTranscript {
    id: string;
    meetingId: string;
    rawTranscript?: string;
    structuredTranscript?: TranscriptSegment[];
    transcriptSource: 'google_meet' | 'manual' | 'upload';
    summary?: string;
    keyDecisions?: KeyDecision[];
    actionItems?: ExtractedActionItem[];
    participantContext?: ParticipantIntel[];
    companyContext?: CompanyIntel;
    durationMinutes?: number;
    participantCount?: number;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    processedAt?: number;
    createdAt: number;
}

export interface TranscriptSegment {
    speaker: string;
    text: string;
    startTime: number; // seconds
    endTime: number;
}

export interface KeyDecision {
    decision: string;
    context: string;
    participants: string[];
}

export interface ExtractedActionItem {
    task: string;
    assignee?: string;
    dueDate?: string;
    priority: Priority;
    createdTaskId?: string; // If auto-created
}

export interface ParticipantIntel {
    name: string;
    title?: string;
    company?: string;
    linkedinUrl?: string;
    recentNews?: string[];
}

export interface CompanyIntel {
    name: string;
    description?: string;
    recentFunding?: string;
    recentNews?: string[];
    competitors?: string[];
}

export interface ExtendedMeeting extends Meeting {
    meetLink?: string;
    googleEventId?: string;
    googleCalendarId?: string;
    recordingUrl?: string;
    hasTranscript: boolean;
    meetingType: 'internal' | 'external' | 'client' | 'investor' | 'partner';
    transcript?: MeetingTranscript;
}

export interface GoogleIntegration {
    id: string;
    userId: string;
    workspaceId: string;
    tokenExpiry: number;
    scopes: string[];
    syncCalendar: boolean;
    syncTranscripts: boolean;
    lastSyncAt?: number;
}
```

---

## 10. Navigation Update

### constants.ts addition

```typescript
export const Tab = {
    Dashboard: 'dashboard',
    Calendar: 'calendar',
    Meetings: 'meetings',  // NEW
    Tasks: 'tasks',
    // ... rest
} as const;

export const NAV_ITEMS: NavItem[] = [
    { id: Tab.Dashboard, label: 'Dashboard' },
    { id: Tab.Calendar, label: 'Calendar' },
    { id: Tab.Meetings, label: 'Meetings' },  // NEW - after Calendar
    { id: Tab.Email, label: 'Email' },
    // ... rest
];
```

---

## 11. Cost Estimates

### Google APIs
- Google Calendar API: Free tier (500K requests/month)
- Google Meet API: Requires Google Workspace (starts at $6/user/month)

### AI Processing (per meeting)
- Groq (transcript processing): ~$0.002-0.01 per meeting
- You.com (participant research): ~$0.01-0.05 per meeting

### Supabase Storage
- Transcript storage: ~1KB-50KB per meeting
- Minimal impact on storage costs

---

## 12. Alternative Approaches Considered

### Option A: Native Recording (Not Recommended)
- Build custom recording infrastructure
- Pros: Full control
- Cons: High complexity, regulatory concerns, storage costs

### Option B: Third-Party Integration (e.g., Fireflies.ai)
- Use existing transcription service
- Pros: Faster to implement
- Cons: Additional cost, data leaves platform

### Option C: Google Meet API (Recommended) ✅
- Native integration with Google Workspace
- Pros: Official API, reliable, users already have Google accounts
- Cons: Requires Google Workspace subscription

---

## 13. Open Questions

1. **Google Workspace Requirement**: Should we require Google Workspace, or support manual transcript upload as fallback?

2. **Transcript Storage**: Store in Supabase DB or use Supabase Storage for large files?

3. **Real-time Transcription**: Support live transcription during calls, or post-meeting only?

4. **Multi-platform Support**: Should we also support Zoom/Teams in the future?

5. **Pricing Tier**: Should transcript features be gated to Team Pro plan?

---

## 14. References

### Existing Code Paths
- Meeting CRUD: `lib/services/database.ts` lines 2020-2085
- Meeting tools: `services/groq/tools.ts` lines 291-380
- Meeting UI: `components/shared/MeetingsManager.tsx`
- Calendar integration: `components/CalendarTab.tsx`
- AI search: `supabase/functions/ai-search/index.ts`

### External Documentation
- [Google Calendar API](https://developers.google.com/calendar/api)
- [Google Meet REST API](https://developers.google.com/meet/api)
- [Groq API](https://console.groq.com/docs)
- [You.com API](https://api.you.com/docs)

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-26 | GitHub Copilot | Initial plan created based on Codex analysis |

---

**Next Steps:** Review this plan and prioritize implementation phases based on product roadmap.
