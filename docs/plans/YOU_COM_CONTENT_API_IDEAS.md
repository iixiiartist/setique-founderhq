# You.com Content API Integration Ideas

> **Document Created:** December 2, 2025  
> **Last Updated:** December 3, 2025  
> **API Endpoint:** `POST https://ydc-index.io/v1/contents`  
> **Purpose:** Log and prioritize feature ideas using You.com's `/v1/contents` endpoint for FounderHQ

---

## Overview

You.com's `POST /v1/contents` endpoint allows us to pull clean HTML/Markdown for any list of URLs. This document catalogs all potential use cases, sorted by **implementation ease** and **user impact**.

---

## Implementation Priority Matrix

| Priority | Ease | Impact | Description |
|----------|------|--------|-------------|
| 🟢 P1 | Easy | High | Quick wins - implement first |
| 🟡 P2 | Medium | High | High value, moderate effort |
| 🟠 P3 | Easy | Medium | Low-hanging fruit, nice-to-have |
| 🔵 P4 | Medium | Medium | Good additions when time permits |
| ⚪ P5 | Hard | High | Strategic investments |
| 🔴 P6 | Hard | Medium | Future considerations |

---

## 🟢 P1: Quick Wins (Easy + High Impact)

### 1. Company/Competitor Profile Auto-Fill ✅ IMPLEMENTED
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐ | **Status:** ✅ Complete (Dec 3, 2025)

When a lead/company URL is added to CRM, auto-fetch and populate:
- Company description
- Headquarters location
- Product summary
- Pricing tiers
- Key people

**Implementation:**
- Hook into CRM account creation/update
- Fetch homepage, about, careers, pricing pages
- Parse and store with account record
- Cache for 24-48 hours

**Files Created:**
- `supabase/functions/fetch-company-content/index.ts` - Edge Function
- `services/companyEnrichmentService.ts` - Client service
- `components/crm/accounts/hooks/useCompanyEnrichment.ts` - React hook
- `components/crm/accounts/CompanyEnrichmentButton.tsx` - UI component
- `sql/create_url_content_cache.sql` - Database migration

---

### 2. Outreach Personalization - "Pull Website Snippet"
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

In email composer, add "Pull website snippet" button to:
- Grab recent blog excerpt or headline from prospect
- Auto-draft personalized opener referencing their content

**Implementation:**
- Add button to email composer toolbar
- Fetch prospect's blog/news page
- Extract recent headline/excerpt
- Insert as template variable

---

### 3. Document Inserts with Citations
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

In document canvas, "Insert from URL" feature:
- Pulls Markdown of target page
- Drops into sidebar for reference
- Users drag sections into proposals
- Auto-generates citations

**Implementation:**
- Add "Attach source from URL" to doc toolbar
- Fetch as Markdown, display in sidebar
- Drag-and-drop with auto-attribution

---

### 4. Contact/Account Enrichment
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐⭐

For new contacts with company domain:
- Fetch company site automatically
- Suggest elevator pitch
- Auto-apply ICP tags
- Recommend likely segments

**Implementation:**
- Trigger on new contact with domain
- Fetch homepage + about page
- Use LLM to extract pitch angles and tags
- Display suggestions in account card

---

## 🟡 P2: High Value, Moderate Effort (Medium + High Impact)

### 5. Sales One-Pagers on Demand
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

Select a deal → "Generate brief" button:
- Fetches prospect's site + top 3 blog posts
- Summarizes positioning, pricing clues, ICP
- Generates talking points
- Drops into Notes/Doc with citations

**Implementation:**
- Add "Generate Brief" button to deal view
- Fetch multiple URLs in batch
- LLM summarization with structured output
- Save to account's Documents

---

### 6. Deal Prep Briefs
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

Before meetings, auto-generate prep materials:
- Fetch prospect site + recent press/blog posts
- Summarize key points
- Create one-pager in account's Notes/Documents
- Include citations for reference

**Implementation:**
- Trigger from calendar integration (upcoming meetings)
- Batch fetch related URLs
- Generate structured brief
- Attach to meeting/account

---

### 7. ABM Research Packs
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

For target accounts, auto-generate research packages:
- Fetch homepage, about, careers, news pages
- Auto-tag: industry, employee size signals, tech keywords
- Pass to Why Now/Deal Strategist agents
- Generate tailored outreach angles

**Implementation:**
- Bulk account selection UI
- Parallel URL fetching
- Entity extraction pipeline
- Agent integration for outreach generation

---

### 8. Competitive Battlecards
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

Maintain competitor URL watchlist:
- Scheduled pulls refresh battlecard data
- Track: positioning, features, pricing, testimonials
- Notify owners of significant changes
- Version history for deltas

**Implementation:**
- Competitor URL management UI
- Scheduled Edge Function (daily/weekly)
- Diff detection logic
- Notification integration

---

### 9. Lead Routing & Scoring Enhancement
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐

Use fetched site copy to improve lead handling:
- Infer vertical and product type from website
- Auto-assign to appropriate rep/sequence
- Boost score if ICP keywords match
- Reduce manual qualification time

**Implementation:**
- Integrate with lead intake flow
- Keyword/entity extraction
- Scoring algorithm update
- Routing rules engine

---

### 10. Investor Prep Materials
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐

For investors in CRM:
- Fetch firm site + recent blog/deals pages
- Extract: fund focus, notable investments, check sizes
- Generate tailored pitch angle
- Prep materials before calls

**Implementation:**
- Investor-specific account type
- VC-focused extraction prompts
- Pitch angle generator
- Calendar integration for pre-call prep

---

## 🟠 P3: Low-Hanging Fruit (Easy + Medium Impact)

### 11. Demo Tailoring
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐

Before calls, auto-customize demo flow:
- Fetch prospect's docs/help center
- Identify their current tech stack
- Auto-pick top 3 features to highlight
- Generate demo script suggestions

**Implementation:**
- Pre-call trigger from calendar
- Fetch docs/help URLs
- Feature mapping logic
- Demo script template

---

### 12. Funnel QA (Self-Site Monitoring)
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐

Monitor your own site for issues:
- Periodically fetch key conversion pages
- Diff against expected copy
- Catch accidental changes
- Detect broken personalization

**Implementation:**
- Internal URL watchlist
- Scheduled checks
- Diff comparison
- Alert on unexpected changes

---

### 13. Social Proof Harvesting
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐

Pull competitor testimonials and case studies:
- Extract verticals served
- Capture customer logos mentioned
- Identify objections they address
- Feed into battlecards and templates

**Implementation:**
- Target testimonial/case-study URLs
- Entity extraction for logos/verticals
- Structured storage
- Template variable integration

---

### 14. Collections for Research Agent
**Ease:** ⭐⭐ | **Impact:** ⭐⭐⭐

Preload curated URLs per market segment:
- Create URL collections by topic/segment
- Pass as grounding sources to Research Agent
- Keep agent responses current and high-signal
- User-managed collections

**Implementation:**
- Collection management UI
- Integration with Research Agent
- Periodic refresh of collections
- Source attribution in responses

---

## 🔵 P4: Good Additions (Medium + Medium Impact)

### 15. Pricing Intelligence Dashboard
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐

Monitor competitor pricing continuously:
- Daily fetch of pricing/plans pages
- Detect and flag changes
- "Pricing Tracker" dashboard widget
- Suggest matching offers for active deals

**Implementation:**
- Pricing URL configuration
- Scheduled fetching + diff storage
- Dashboard widget component
- Deal integration for suggestions

---

### 16. Feature Change Watch
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐

Track competitor product updates:
- Monitor "What's New" and changelog pages
- Generate weekly digest for team
- Link to related tasks or roadmap items
- Competitive awareness automation

**Implementation:**
- Changelog URL tracking
- Weekly digest generation
- Task/roadmap linking UI
- Team notification

---

### 17. SEO/Content Gap Analysis
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐

Competitive content intelligence:
- Fetch competitor blog category pages
- Summarize topics and keywords emphasized
- Identify gaps in your content
- Suggest new content ideas

**Implementation:**
- Blog/content URL management
- Topic extraction pipeline
- Gap analysis logic
- Content calendar integration

---

### 18. Marketing/Intel Briefs
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐

Fresh competitive intelligence for marketing:
- Fetch competitor blogs and feature pages
- Build content calendars with current data
- Weekly "What's new in our space" summaries
- Campaign brief enrichment

**Implementation:**
- Marketing-focused URL sets
- Weekly summary generation
- Calendar integration
- Brief templates

---

### 19. Partner Mapping
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐

Discover partnership opportunities:
- Fetch ecosystem/partners pages of targets
- Auto-suggest integration opportunities
- Identify co-marketing targets
- Map partner ecosystem

**Implementation:**
- Partners page URL tracking
- Entity extraction for partner names
- Opportunity scoring
- CRM integration

---

### 20. Recruitment Intel
**Ease:** ⭐⭐⭐ | **Impact:** ⭐⭐⭐

Competitive hiring signals:
- Pull competitors' careers pages
- Spot hiring spikes and new roles
- Signal outreach timing opportunities
- Identify expansion areas

**Implementation:**
- Careers page monitoring
- Role extraction and categorization
- Trend detection
- Signal integration with accounts

---

## ⚪ P5: Strategic Investments (Hard + High Impact)

### 21. Trigger Alerts System
**Ease:** ⭐⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

Proactive intelligence alerts:
- Nightly fetch of key URLs for tracked accounts
- Detect diffs: new posts, product updates, pricing changes
- Auto-create alerts/tasks in CRM
- "News to share" cards in marketing calendar

**Implementation:**
- Comprehensive URL watchlist per account
- Scheduled batch processing
- Sophisticated diff detection
- Multi-channel alert routing
- Task auto-creation logic

---

### 22. Competitive Market Research Integration
**Ease:** ⭐⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐⭐

Deep Research Agent grounding:
- Feed multiple competitor/product pages
- Ground Research Agent with current site copy
- Replace generic search snippets with fresh data
- Contextual competitive analysis

**Implementation:**
- Research Agent enhancement
- Multi-URL context injection
- Source management and freshness
- Response quality improvements

---

### 23. Investor/LP Update Tracking
**Ease:** ⭐⭐⭐⭐ | **Impact:** ⭐⭐⭐⭐

Fundraising intelligence:
- Fetch VC blog and portfolio pages
- Track new investments and deals
- Auto-summarize fit signals
- Enrich fundraising pipeline

**Implementation:**
- VC-specific URL tracking
- Investment extraction logic
- Fit scoring algorithm
- Pipeline integration

---

## 🔴 P6: Future Considerations (Hard + Medium Impact)

### 24. Compliance/Legal Watch
**Ease:** ⭐⭐⭐⭐ | **Impact:** ⭐⭐⭐

Legal and policy monitoring:
- Monitor competitors' terms/privacy pages
- Flag changes in data handling
- Detect pricing or legal risk shifts
- Compliance awareness

**Implementation:**
- Legal page URL tracking
- Change detection with legal context
- Risk flagging logic
- Compliance dashboard

---

### 25. Localization Tone Check
**Ease:** ⭐⭐⭐⭐ | **Impact:** ⭐⭐⭐

Internationalization support:
- Fetch localized versions of prospect sites
- Analyze tone and language patterns
- Mirror style in outreach (e.g., EN vs. DE)
- Cultural customization

**Implementation:**
- Multi-locale URL handling
- Tone analysis pipeline
- Template localization
- Outreach customization

---

### 26. Event/News Hijack Automation
**Ease:** ⭐⭐⭐⭐ | **Impact:** ⭐⭐⭐

Newsjacking workflow:
- Monitor newsrooms/press pages for launches
- Auto-create "newsjacking" snippets
- Queue for marketing/social
- Timely content opportunities

**Implementation:**
- Press/news URL monitoring
- Launch detection logic
- Content snippet generation
- Social queue integration

---

## Implementation Notes

### API Configuration
```typescript
// Request format
POST https://ydc-index.io/v1/contents
Headers: {
  "X-API-KEY": "<your-api-key>",
  "Content-Type": "application/json"
}
Body: {
  "urls": ["https://example.com/page1", "https://example.com/page2"],
  "format": "markdown"  // or "html"
}
```

### Best Practices

1. **Use Markdown format** for cleaner LLM input
2. **Batch 5-20 URLs** per call to avoid timeouts
3. **Implement retries/backoff** on 429/5xx errors
4. **Cache content** with URL + `fetched_at` timestamp
5. **Re-use cached content** for 24-48 hours to reduce costs
6. **Allow manual "refresh"** for on-demand updates
7. **Respect robots.txt/ToS** of target sites
8. **Handle per-URL errors** gracefully (one bad page shouldn't fail batch)
9. **Server-side only** - keep API key off client (use Supabase Edge Function)
10. **Expose thin helper** - `fetchContents(urls, format)` for agents/CRM/workflows

### Suggested Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FounderHQ Client                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Edge Function                      │
│              /functions/fetch-contents                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  - Validate request                              │    │
│  │  - Check cache (Supabase table)                  │    │
│  │  - Call You.com /v1/contents if cache miss       │    │
│  │  - Store result with timestamp                   │    │
│  │  - Return content                                │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                You.com Content API                       │
│            POST /v1/contents                             │
└─────────────────────────────────────────────────────────┘
```

### Database Schema (Suggested)

```sql
-- Content cache table
CREATE TABLE url_content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  content_markdown TEXT,
  content_html TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(url, workspace_id)
);

-- Index for efficient lookups
CREATE INDEX idx_url_content_cache_url ON url_content_cache(url);
CREATE INDEX idx_url_content_cache_fetched ON url_content_cache(fetched_at);

-- Tracked URLs for monitoring
CREATE TABLE monitored_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  url_type TEXT NOT NULL, -- 'pricing', 'careers', 'blog', 'changelog', etc.
  account_id UUID REFERENCES accounts(id),
  workspace_id UUID REFERENCES workspaces(id),
  check_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  last_checked_at TIMESTAMPTZ,
  last_content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content change history
CREATE TABLE url_content_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_url_id UUID REFERENCES monitored_urls(id),
  previous_hash TEXT,
  new_hash TEXT,
  change_summary TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Next Steps

### Phase 1: Foundation (Week 1-2)
- [ ] Create Supabase Edge Function for `/fetch-contents`
- [ ] Implement caching layer with database schema
- [ ] Build `fetchContents()` client helper
- [ ] Add basic error handling and retries

### Phase 2: Quick Wins (Week 3-4)
- [ ] Company profile auto-fill on CRM account creation
- [ ] "Pull website snippet" in email composer
- [ ] Document "Insert from URL" feature
- [ ] Contact enrichment suggestions

### Phase 3: High-Value Features (Week 5-8)
- [ ] Sales one-pager generation
- [ ] Deal prep briefs
- [ ] Competitive battlecards
- [ ] ABM research packs

### Phase 4: Intelligence Layer (Week 9-12)
- [ ] Trigger alerts system
- [ ] Pricing intelligence dashboard
- [ ] Feature change monitoring
- [ ] Research Agent integration

---

## Appendix: Full Feature List by Category

### CRM & Sales
- Company/Competitor Profile Auto-Fill
- Contact/Account Enrichment
- Sales One-Pagers on Demand
- Deal Prep Briefs
- ABM Research Packs
- Lead Routing & Scoring
- Demo Tailoring

### Marketing & Content
- Outreach Personalization
- Marketing/Intel Briefs
- SEO/Content Gap Analysis
- Social Proof Harvesting
- Event/News Hijack

### Competitive Intelligence
- Competitive Battlecards
- Pricing Intelligence
- Feature Change Watch
- Trigger Alerts

### Documents & Research
- Document Inserts with Citations
- Collections for Research Agent
- Competitive Market Research

### Fundraising & Investors
- Investor Prep Materials
- Investor/LP Update Tracking

### Operations & Compliance
- Recruitment Intel
- Partner Mapping
- Compliance/Legal Watch
- Funnel QA
- Localization Tone Check

---

*This document should be updated as features are implemented or new ideas emerge.*
