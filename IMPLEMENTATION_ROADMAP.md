# FounderHQ - Feature Implementation Roadmap
**Created:** November 15, 2025  
**Status:** Planning Phase

---

## Executive Summary

This document outlines the technical implementation plan for enhancing FounderHQ's automation, linking, AI capabilities, and user experience features. The work is organized into phases to ensure systematic delivery without breaking existing functionality.

---

## Phase 1: Quick Wins (Immediate - 1-2 hours)
**Status:** ✅ READY TO EXECUTE

### 1.1 Subtasks in AI Context
- **Objective:** Make AI assistants aware of subtask capabilities
- **Files to Update:**
  - `/components/assistant/AssistantModal.tsx` - Add subtask context to system prompts
  - `/components/shared/ModuleAssistant.tsx` - Include subtask info in task management
- **Impact:** Low risk, high value
- **Estimated Time:** 15 minutes

### 1.2 Critical Linking Fixes
- **Objective:** Ensure contact/account/deal linking works in task creation
- **Files to Check:**
  - `/components/shared/TaskManagement.tsx` - Verify CRM item linking
  - `/lib/services/database.ts` - Confirm foreign key relationships
- **Issues to Fix:**
  - Task creation not preserving `crmItemId` or `contactId`
  - Calendar events not linking to contacts properly
- **Estimated Time:** 30 minutes

### 1.3 Subtasks UI Consistency

- **Objective:** Display subtasks consistently across all task views
- **Files to Update:**
  - `/components/DashboardTab.tsx` - Add subtask counter to task list (📋 X/Y)
  - `/components/DashboardTab.tsx` - Update daily briefing to include subtask progress
- **Changes Needed:**
  1. **Dashboard Task List:**
     - Show subtask progress badge (e.g., "📋 2/5") next to task text
     - Visual indicator for tasks with incomplete subtasks
  2. **Daily Briefing Updates:**
     - Include subtasks in task summaries
     - Report subtask completion rates
     - Highlight tasks with overdue subtasks
     - Example: "5 tasks due today (2 with pending subtasks)"
- **Estimated Time:** 45 minutes

### 1.4 Documentation Updates

- **Create:**
  - `IMPLEMENTATION_ROADMAP.md` (this file)
  - Known issues list
  - Testing checklist for linking functionality
- **Estimated Time:** 15 minutes

---

## Phase 2: Business Profile Enhancement (Short-term - 4-8 hours)

### 2.1 Database Schema Updates
**Priority:** HIGH

#### New Fields to Add:
```sql
-- Business Context Fields
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS target_customer_profile TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS competitive_advantages TEXT[];
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS key_differentiators TEXT[];
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS market_positioning TEXT;

-- Deal/Product Monetization
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS monetization_model TEXT; 
-- Options: 'subscription', 'one-time', 'usage-based', 'freemium', 'enterprise', 'marketplace', 'advertising', 'hybrid'

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS pricing_tiers JSONB DEFAULT '[]'::jsonb;
-- Structure: [{ name: string, price: number, features: string[], billingCycle: string }]

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS deal_types TEXT[] DEFAULT ARRAY['new_business', 'expansion', 'renewal'];
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS average_deal_size NUMERIC;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS sales_cycle_days INTEGER;

-- Product/Service Information
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS core_products JSONB DEFAULT '[]'::jsonb;
-- Structure: [{ name: string, description: string, type: string, status: string }]

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS service_offerings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS tech_stack TEXT[];
```

### 2.2 UI Updates
**Files:**
- `/components/BusinessProfileSetup.tsx` - Add new form steps
- `/types.ts` - Update `BusinessProfile` interface

**New Form Sections:**
1. **Step 5: Market Positioning**
   - Target customer profile (textarea)
   - Competitive advantages (multi-input)
   - Key differentiators (multi-input)
   
2. **Step 6: Monetization & Pricing**
   - Monetization model (select)
   - Pricing tiers (dynamic list)
   - Average deal size
   - Sales cycle length

3. **Step 7: Products & Services**
   - Core products list
   - Service offerings
   - Tech stack

**Estimated Time:** 4-6 hours

### 2.3 AI System Updates
- Update all AI system prompts to include new business context
- Files to modify:
  - `/components/assistant/AssistantModal.tsx`
  - `/components/shared/ModuleAssistant.tsx`
  - `/hooks/useAIAssistant.ts` (if exists)

---

## Phase 3: Automation & Linking System (Medium-term - 12-16 hours)

### 3.1 Task Automation Engine
**New Feature:** Auto-create tasks based on triggers

#### Implementation:
```typescript
// File: /lib/services/automationService.ts
interface AutomationRule {
  id: string;
  trigger: 'deal_stage_change' | 'contact_added' | 'meeting_scheduled' | 'date_based';
  conditions: Record<string, any>;
  actions: AutomationAction[];
}

interface AutomationAction {
  type: 'create_task' | 'send_email' | 'update_field' | 'create_calendar_event';
  params: Record<string, any>;
}
```

#### Database Schema:
```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_data JSONB,
  result TEXT,
  error TEXT
);
```

**Estimated Time:** 8-10 hours

### 3.2 Enhanced Linking System
**Objective:** Bi-directional references between all entities

#### Required Changes:

1. **Database Foreign Keys** (already exist, verify):
   - tasks.crm_item_id → crm_items.id
   - tasks.contact_id → contacts.id
   - meetings.contact_id → contacts.id
   - calendar_events → tasks/meetings/marketing_items

2. **UI Components:**
   - Add "View Related" buttons on all entity views
   - Show linked items in sidebars
   - Quick-link picker in forms

3. **Service Layer:**
   - `getLinkableEntities()` - fetch contacts/accounts/deals for current workspace
   - `createLinkedTask()` - create task with proper relationships
   - `getRelatedItems()` - fetch all linked entities

**Files to Create/Modify:**
- `/lib/services/linkingService.ts` (NEW)
- `/components/shared/EntityLinker.tsx` (NEW)
- `/components/shared/RelatedItemsSidebar.tsx` (NEW)

**Estimated Time:** 4-6 hours

---

## Phase 4: Document Editor AI (Long-term - 16-24 hours)
**Complexity:** HIGH

### 4.1 Text Transformation System
**Objective:** Transform selected text based on natural language prompts

#### Architecture:
```typescript
interface TextTransformationRequest {
  selectedText: string;
  prompt: string;
  context: {
    documentType: string;
    surroundingText?: string;
    documentMetadata?: Record<string, any>;
  };
}

interface TextTransformationResponse {
  transformedText: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}
```

#### Implementation Steps:

1. **Selection Handler:**
   - Track user text selection in editor
   - Show floating toolbar with "Transform" button
   - Capture selection range for replacement

2. **AI Prompt Engineering:**
   ```
   System: You are a document editing assistant. Transform the selected text according to the user's instruction while maintaining context and tone.
   
   Context: {documentType}
   Selected Text: {selectedText}
   User Instruction: {prompt}
   
   Return only the transformed text, ready to replace the selection.
   ```

3. **Editor Integration:**
   - Use TipTap/ProseMirror API for selection manipulation
   - Replace selected text with AI response
   - Add undo/redo support

**Files to Create/Modify:**
- `/components/workspace/DocumentEditor.tsx` - Add selection handling
- `/components/workspace/AITransformToolbar.tsx` (NEW)
- `/lib/services/documentAIService.ts` (NEW)

**Estimated Time:** 10-12 hours

### 4.2 Smart Chart Generation
**Objective:** Generate charts from selected data/text

#### Data Extraction:
```typescript
interface DataExtractionResult {
  type: 'table' | 'list' | 'text_with_numbers';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      values: number[];
    }>;
  };
  suggestedChartTypes: ChartType[];
}
```

#### Implementation:
1. Parse selected text for numeric data
2. Use AI to identify data structure
3. Generate chart configuration
4. Insert chart component in document

**Files:**
- `/lib/utils/dataExtractor.ts` (NEW)
- `/components/workspace/SmartChartGenerator.tsx` (NEW)
- `/lib/services/chartGenerationService.ts` (NEW)

**Estimated Time:** 6-8 hours

### 4.3 Chart Insert Improvement
**Current Issues:**
- Manual process is clunky
- No data validation
- Limited chart types

**Improvements:**
1. Visual chart wizard
2. Data preview before insertion
3. Chart templates library
4. AI-suggested chart type based on data

**Estimated Time:** 4-6 hours

---

## Phase 5: AI System Comprehensive Update (Ongoing - 8-12 hours)

### 5.1 Context Management System
**Objective:** Centralized AI context generation

```typescript
// File: /lib/ai/contextManager.ts
class AIContextManager {
  generateSystemPrompt(params: {
    module: string;
    businessProfile?: BusinessProfile;
    currentData?: any;
    userGoal?: string;
  }): string;
  
  getModuleCapabilities(module: string): string[];
  
  getDataSummary(data: any): string;
}
```

### 5.2 AI Capabilities Registry
Document all AI-accessible functions and tools:

```typescript
// File: /lib/ai/capabilitiesRegistry.ts
export const AI_CAPABILITIES = {
  tasks: {
    create: true,
    createWithSubtasks: true,
    link: true,
    assign: true,
    schedule: true
  },
  crm: {
    createContact: true,
    createDeal: true,
    updateStage: true,
    addNotes: true
  },
  calendar: {
    scheduleEvent: true,
    inviteParticipants: true,
    setReminders: true
  },
  documents: {
    create: true,
    transform: true, // NEW
    generateChart: true, // NEW
    summarize: true
  },
  financial: {
    logTransaction: true,
    generateReport: true,
    projectCashFlow: true
  },
  marketing: {
    createCampaign: true,
    trackAttribution: true,
    generateContent: true
  }
};
```

### 5.3 Prompt Templates
Create modular, maintainable prompt templates:

```typescript
// File: /lib/ai/promptTemplates.ts
export const PROMPT_TEMPLATES = {
  taskManagement: `
You are an AI assistant for task management in FounderHQ.

CAPABILITIES:
- Create tasks with subtasks
- Link tasks to contacts, deals, or accounts
- Assign tasks to team members
- Schedule due dates and reminders
- Set priority levels
...
  `,
  
  documentEditor: `
You are a document editing assistant.

TRANSFORMATION CAPABILITIES:
- Rewrite for clarity
- Change tone (professional, casual, technical)
- Summarize or expand
- Fix grammar and style
- Generate charts from data
...
  `
};
```

**Estimated Time:** 8-12 hours

---

## Phase 6: Testing & Quality Assurance (Ongoing)

### 6.1 Automated Tests
**Priority Tests:**
1. Task creation with linking
2. Subtask persistence
3. Calendar event linking
4. AI context generation
5. Document transformations

**Framework:** Vitest + React Testing Library

**Estimated Time:** 12-16 hours

### 6.2 Integration Tests
- End-to-end workflows
- Cross-module linking
- AI response validation

**Estimated Time:** 8-10 hours

---

## Implementation Schedule

### Week 1: Foundation
- ✅ Day 1: Phase 1 (Quick Wins)
- Day 2-3: Phase 2.1 (Database schema)
- Day 4-5: Phase 2.2-2.3 (Business Profile UI & AI updates)

### Week 2: Automation & Linking
- Day 1-2: Phase 3.1 (Automation engine)
- Day 3-4: Phase 3.2 (Enhanced linking)
- Day 5: Testing & bug fixes

### Week 3-4: Document AI
- Week 3: Phase 4.1-4.2 (Text transformation & chart generation)
- Week 4: Phase 4.3 (Chart improvements) + Phase 5 (AI updates)

### Ongoing:
- Phase 6: Continuous testing and QA
- Bug fixes and refinements
- User feedback incorporation

---

## Risk Assessment

### High Risk Items:
1. **Document Editor AI** - Complex text manipulation, undo/redo management
2. **Automation Engine** - Could create infinite loops or spam
3. **Data Extraction for Charts** - Parsing accuracy critical

### Mitigation Strategies:
1. Implement strict validation and rate limiting
2. Add kill switches for automation
3. Provide manual override options
4. Extensive testing before production
5. Gradual rollout with feature flags

---

## Success Metrics

### Phase 1:
- ✅ AI responses include subtask suggestions
- ✅ Linking works in 100% of task/calendar operations
- ✅ Zero linking-related errors in logs

### Phase 2:
- Business profile completion rate > 80%
- AI responses utilize new context fields
- User satisfaction with monetization tracking

### Phase 3:
- 50% reduction in manual task creation
- 100% link integrity between entities
- Automation adoption rate > 30%

### Phase 4:
- Document AI response time < 3 seconds
- Chart generation success rate > 90%
- 70% reduction in manual chart creation time

### Phase 5:
- AI accuracy improvement > 25%
- Context-aware responses in 95% of cases
- User-reported "helpful response" rate > 80%

---

## Resource Requirements

### Development:
- **Immediate (Phase 1):** 1-2 hours
- **Short-term (Phase 2):** 4-8 hours
- **Medium-term (Phase 3):** 12-16 hours
- **Long-term (Phase 4-5):** 24-36 hours
- **Testing (Phase 6):** 20-26 hours

**Total Estimated Time:** 61-88 hours (8-11 full work days)

### Infrastructure:
- No additional infrastructure required
- Existing Supabase database sufficient
- Current AI API (Anthropic Claude) adequate

---

## Next Steps (IMMEDIATE)

**Execute Phase 1 - Quick Wins:**

1. ✅ Update AI contexts with subtask awareness
2. ✅ Fix critical linking issues  
3. ✅ Document current capabilities

**Then:**
- Review and approve this roadmap
- Prioritize phases based on business needs
- Allocate development resources
- Begin Phase 2 implementation

---

## Appendix A: File Structure

### New Files to Create:
```
/lib/services/
  ├── automationService.ts (Phase 3.1)
  ├── linkingService.ts (Phase 3.2)
  ├── documentAIService.ts (Phase 4.1)
  └── chartGenerationService.ts (Phase 4.2)

/lib/ai/
  ├── contextManager.ts (Phase 5.1)
  ├── capabilitiesRegistry.ts (Phase 5.2)
  └── promptTemplates.ts (Phase 5.3)

/lib/utils/
  └── dataExtractor.ts (Phase 4.2)

/components/shared/
  ├── EntityLinker.tsx (Phase 3.2)
  └── RelatedItemsSidebar.tsx (Phase 3.2)

/components/workspace/
  ├── AITransformToolbar.tsx (Phase 4.1)
  └── SmartChartGenerator.tsx (Phase 4.2)

/supabase/migrations/
  ├── add_business_context_fields.sql (Phase 2.1)
  └── create_automation_tables.sql (Phase 3.1)
```

### Major Files to Modify:
```
/components/BusinessProfileSetup.tsx (Phase 2.2)
/components/assistant/AssistantModal.tsx (Phase 1.1, 5.3)
/components/shared/ModuleAssistant.tsx (Phase 1.1, 5.3)
/components/shared/TaskManagement.tsx (Phase 1.2, 3.2)
/components/workspace/DocumentEditor.tsx (Phase 4.1)
/lib/services/database.ts (Phase 1.2, 3.2)
/types.ts (Phase 2.2, 3.1, 4.1)
```

---

## Appendix B: Database Diagram (Enhanced)

```
┌─────────────────┐
│  workspaces     │
└────────┬────────┘
         │
         ├─────────┬──────────┬──────────────┬──────────────┐
         │         │          │              │              │
┌────────▼──────┐ │  ┌───────▼──────┐  ┌───▼────────┐ ┌──▼──────────┐
│ business_     │ │  │   tasks      │  │  contacts  │ │  crm_items  │
│ profiles      │ │  │              │  │            │ │             │
│ (ENHANCED)    │ │  │ - subtasks ✅│  └─────┬──────┘ └──────┬──────┘
└───────────────┘ │  │ - crm_item_id│        │                │
                  │  │ - contact_id ├────────┘                │
                  │  └──────┬───────┘                         │
                  │         │                                 │
         ┌────────▼────┐   │  ┌──────────────────┐          │
         │  calendar_  │   └──┤  automation_     │          │
         │  events     │      │  rules (NEW)     │          │
         └─────────────┘      └──────────────────┘          │
                                                             │
         ┌────────────────────────────────────────────────┘
         │
    ┌────▼────────┐
    │  meetings   │
    └─────────────┘
```

---

**Document Status:** APPROVED FOR EXECUTION  
**Next Action:** Execute Phase 1 - Quick Wins  
**Owner:** Development Team  
**Last Updated:** November 15, 2025

