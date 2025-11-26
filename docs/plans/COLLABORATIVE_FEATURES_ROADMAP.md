# 🚀 PRODUCTION-READY COLLABORATIVE FEATURES ROADMAP

## Executive Summary

This document outlines all remaining collaborative features needed to make the Setique Founder Dashboard production-ready with full team collaboration capabilities across all modules.

---

## 📋 CURRENT STATE ANALYSIS

### ✅ **Already Implemented (Working)**
1. **Workspace Infrastructure**
   - Multi-user workspaces with owner/member roles
   - Team member invitations via email
   - Workspace switching
   - Row Level Security (RLS) policies for data isolation

2. **Task Management (Dashboard Tab)**
   - Task assignments to team members
   - @Mentions in task comments → notifications
   - Comment threads on tasks
   - Activity logging for task actions
   - Filter by "assigned to me"

3. **Notifications System**
   - In-app notification bell
   - Unread badge counts
   - Mark as read/delete
   - @Mention notifications working

4. **Activity Feed**
   - Task created/completed/assigned/updated/deleted
   - Comment added/updated/deleted
   - CRM contact added/updated
   - Document uploaded
   - Meeting scheduled
   - Note added

---

## 🎯 REQUIRED COLLABORATIVE FEATURES

### **PHASE 1: CRM Collaboration (High Priority)**

#### 1.1 **Account (Company) Management**
**For each CRM type: Investors, Customers, Partners**

- [ ] **Shared Company Views**
  - All workspace members can view companies in their workspace
  - Owner/creator badge display
  - Last updated by (user + timestamp)
  
- [ ] **Company Assignments**
  - Assign "Account Owner" to team members
  - Multiple team members can be assigned to one company
  - Filter: "My Companies" / "All Companies" / "Unassigned"
  
- [ ] **Comments on Companies**
  - Add comment threads to CRM company cards
  - Support @mentions in comments
  - Notifications when mentioned
  
- [ ] **Activity Logging**
  - `crm_company_created`
  - `crm_company_updated`
  - `crm_company_assigned`
  - `crm_company_status_changed`
  - Show "who did what" in activity feed

- [ ] **Permissions**
  - Members can: View, Comment, Update assigned companies
  - Owner can: All actions + Delete + Reassign

**Database Changes:**
```sql
ALTER TABLE crm_items 
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN assigned_to_name TEXT;

CREATE INDEX idx_crm_items_assigned_to ON crm_items(assigned_to);
```

#### 1.2 **Contact Management**
**Shared contact database within companies**

- [ ] **Shared Contact Access**
  - All team members see contacts in workspace companies
  - "Added by" attribution display
  
- [ ] **Contact Assignments**
  - Assign "Contact Owner" for relationship management
  - Filter by assigned contacts
  
- [ ] **Contact Comments**
  - Comment threads on contact cards
  - @Mentions with notifications
  
- [ ] **Activity Logging**
  - `contact_created`
  - `contact_updated`
  - `contact_assigned`
  - `contact_meeting_logged`

**Database Changes:**
```sql
ALTER TABLE contacts 
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN assigned_to_name TEXT,
ADD COLUMN created_by_name TEXT;

CREATE INDEX idx_contacts_assigned_to ON contacts(assigned_to);
```

#### 1.3 **Meeting Notes Collaboration**
**Shared meeting history**

- [ ] **Shared Meeting Logs**
  - All team members see meeting notes in workspace
  - "Logged by" attribution
  
- [ ] **Meeting Attendees**
  - Tag team members as attendees
  - Filter: "Meetings I attended"
  
- [ ] **Meeting Comments**
  - Add follow-up comments to meetings
  - @Mention team members for action items
  
- [ ] **Activity Logging**
  - `meeting_logged`
  - `meeting_updated`
  - `meeting_attendee_added`

**Database Changes:**
```sql
ALTER TABLE meetings 
ADD COLUMN attendee_ids UUID[] DEFAULT '{}',
ADD COLUMN logged_by_name TEXT;

CREATE INDEX idx_meetings_attendee_ids ON meetings USING GIN(attendee_ids);
```

---

### **PHASE 2: Calendar Collaboration (High Priority)**

#### 2.1 **Shared Calendar Events**
- [ ] **Team Calendar View**
  - See all workspace events (tasks, meetings, marketing)
  - Color-code by owner/assignee
  - "My Calendar" vs "Team Calendar" toggle
  
- [ ] **Event Assignments**
  - Assign tasks/marketing items to team members from calendar
  - Show assignee names on calendar events
  
- [ ] **Meeting Invitations**
  - Invite team members to meetings
  - Mark invitees as required/optional
  - Show meeting conflicts
  
- [ ] **Activity Logging**
  - `calendar_event_created`
  - `calendar_event_assigned`
  - `calendar_meeting_invited`

**UI Changes:**
- Add team member filter in CalendarTab
- Show assignee avatars on event cards
- Add "Invite Team" button for meetings

---

### **PHASE 3: Marketing Collaboration (Medium Priority)**

#### 3.1 **Campaign Management**
- [ ] **Shared Campaign Views**
  - All workspace members see marketing campaigns
  - Campaign owner display
  
- [ ] **Campaign Assignments**
  - Assign campaigns to team members
  - Multiple assignees per campaign
  - Filter: "My Campaigns" / "All Campaigns"
  
- [ ] **Campaign Comments**
  - Comment threads on campaigns
  - @Mentions with notifications
  - Share campaign progress updates
  
- [ ] **Activity Logging**
  - `marketing_campaign_created`
  - `marketing_campaign_assigned`
  - `marketing_campaign_status_changed`
  - `marketing_campaign_completed`

**Database Changes:**
```sql
ALTER TABLE marketing_items 
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN assigned_to_name TEXT;

CREATE INDEX idx_marketing_items_assigned_to ON marketing_items(assigned_to);
```

**UI Changes:**
- Add "Assigned To" field in MarketingTab forms
- Add team member dropdown for assignments
- Show assignee on campaign cards

---

### **PHASE 4: Financial Collaboration (Medium Priority)**

#### 4.1 **Financial Data Sharing**
- [ ] **Shared Financial Logs**
  - All workspace members see financial metrics
  - "Logged by" attribution
  - Permission-based viewing (owner sets)
  
- [ ] **Financial Comments**
  - Comment on specific financial entries
  - Discuss metrics/trends with team
  - @Mentions for finance discussions
  
- [ ] **Expense Tracking Collaboration**
  - Team members log expenses
  - Categorize by department/person
  - Approval workflow (owner approves)
  
- [ ] **Activity Logging**
  - `financial_log_created`
  - `financial_log_updated`
  - `expense_submitted`
  - `expense_approved`

**Database Changes:**
```sql
ALTER TABLE financial_logs 
ADD COLUMN logged_by_name TEXT,
ADD COLUMN approved_by UUID REFERENCES profiles(id);

ALTER TABLE expenses
ADD COLUMN submitted_by_name TEXT,
ADD COLUMN approval_status TEXT DEFAULT 'pending',
ADD COLUMN approved_by UUID REFERENCES profiles(id),
ADD COLUMN approved_at TIMESTAMPTZ;

CREATE INDEX idx_expenses_approval_status ON expenses(approval_status);
```

---

### **PHASE 5: File Library Collaboration (High Priority)**

#### 5.1 **Document Sharing**
- [ ] **Shared Document Library**
  - All workspace members see uploaded documents
  - "Uploaded by" attribution
  - Upload date + last accessed
  
- [ ] **Document Permissions**
  - Owner can set: View All / Members Only / Owner Only
  - Restrict sensitive documents
  
- [ ] **Document Comments**
  - Comment threads on documents
  - @Mentions for document review requests
  - Version discussion
  
- [ ] **Document Assignments**
  - Assign documents for review
  - "Needs Review" status with assignee
  - Mark as "Reviewed" with timestamp
  
- [ ] **Activity Logging**
  - `document_uploaded`
  - `document_shared`
  - `document_assigned_for_review`
  - `document_reviewed`
  - `document_commented`

**Database Changes:**
```sql
ALTER TABLE documents 
ADD COLUMN uploaded_by_name TEXT,
ADD COLUMN assigned_to UUID REFERENCES profiles(id),
ADD COLUMN assigned_to_name TEXT,
ADD COLUMN review_status TEXT DEFAULT 'not_required',
ADD COLUMN reviewed_at TIMESTAMPTZ,
ADD COLUMN reviewed_by UUID REFERENCES profiles(id),
ADD COLUMN permission_level TEXT DEFAULT 'workspace';

CREATE INDEX idx_documents_assigned_to ON documents(assigned_to);
CREATE INDEX idx_documents_review_status ON documents(review_status);
```

**UI Changes:**
- Add "Assign for Review" button in FileLibraryTab
- Show review status badges
- Add "My Documents to Review" filter
- Add comment threads to document modal

---

### **PHASE 6: Notes Collaboration (Medium Priority)**

#### 6.1 **Shared Notes System**
- [ ] **Collaborative Notes**
  - All notes visible to workspace members
  - "Created by" attribution
  - Last edited by + timestamp
  
- [ ] **Note @Mentions**
  - @Mention team members in notes
  - Notify mentioned users
  
- [ ] **Note Threading**
  - Reply to notes (like comments)
  - Discussion threads on notes
  
- [ ] **Activity Logging**
  - `note_created`
  - `note_updated`
  - `note_mentioned`

**Database Changes:**
```sql
-- Notes are currently stored in JSONB arrays on various tables
-- Consider migrating to dedicated table for better collaboration:

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  entity_type TEXT NOT NULL, -- 'task', 'crm_item', 'contact', 'marketing', etc.
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_name TEXT,
  last_edited_by UUID REFERENCES profiles(id),
  last_edited_by_name TEXT
);

CREATE INDEX idx_notes_workspace_id ON notes(workspace_id);
CREATE INDEX idx_notes_entity_type ON notes(entity_type);
CREATE INDEX idx_notes_entity_id ON notes(entity_id);
```

---

## 📊 ACTIVITY FEED EXPANSION

### **New Activity Types to Add**

```typescript
export type ActivityActionType =
  // Existing
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'task_updated'
  | 'task_deleted'
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  | 'crm_contact_added'
  | 'crm_contact_updated'
  | 'document_uploaded'
  | 'meeting_scheduled'
  | 'note_added'
  // New CRM
  | 'crm_company_created'
  | 'crm_company_updated'
  | 'crm_company_assigned'
  | 'crm_company_status_changed'
  | 'contact_assigned'
  | 'meeting_attendee_added'
  // New Marketing
  | 'marketing_campaign_created'
  | 'marketing_campaign_assigned'
  | 'marketing_campaign_status_changed'
  | 'marketing_campaign_completed'
  // New Financial
  | 'financial_log_created'
  | 'expense_submitted'
  | 'expense_approved'
  // New Documents
  | 'document_shared'
  | 'document_assigned_for_review'
  | 'document_reviewed'
  | 'document_commented'
  // New Calendar
  | 'calendar_event_created'
  | 'calendar_meeting_invited';

export type ActivityEntityType = 
  | 'task' 
  | 'comment' 
  | 'crm_contact' 
  | 'crm_company'
  | 'document' 
  | 'meeting' 
  | 'note'
  | 'marketing_campaign'
  | 'financial_log'
  | 'expense'
  | 'calendar_event';
```

---

## 🔔 NOTIFICATION SYSTEM EXPANSION

### **New Notification Types**

```typescript
export type NotificationType =
  | 'mention'               // ✅ Already working
  | 'task_assigned'         // NEW
  | 'company_assigned'      // NEW
  | 'contact_assigned'      // NEW
  | 'campaign_assigned'     // NEW
  | 'document_review_request' // NEW
  | 'meeting_invitation'    // NEW
  | 'comment_reply'         // NEW
  | 'note_reply'            // NEW;
```

### **Notification Preferences UI (Future Phase)**

When ready to implement granular notification preferences:

```typescript
interface NotificationPreferences {
  mentions: { inApp: boolean; email: boolean };
  taskAssignments: { inApp: boolean; email: boolean };
  companyAssignments: { inApp: boolean; email: boolean };
  contactAssignments: { inApp: boolean; email: boolean };
  campaignAssignments: { inApp: boolean; email: boolean };
  documentReviews: { inApp: boolean; email: boolean };
  meetingInvitations: { inApp: boolean; email: boolean };
  comments: { inApp: boolean; email: boolean };
}
```

---

## 🛠️ SHARED COMPONENTS TO BUILD

### **1. AssignmentDropdown Component**
**Reusable dropdown for assigning to team members**

```tsx
<AssignmentDropdown
  workspaceMembers={members}
  currentAssignee={assignedTo}
  onAssign={(userId, userName) => handleAssign(userId, userName)}
  placeholder="Assign to team member..."
/>
```

**Usage:** Tasks, Companies, Contacts, Campaigns, Documents

### **2. CommentsSection Component**
**Reusable comment threads (like TaskComments)**

```tsx
<CommentsSection
  entityType="crm_company"
  entityId={company.id}
  entityName={company.company}
  comments={comments}
  workspaceMembers={members}
  onAddComment={handleAddComment}
  onDeleteComment={handleDeleteComment}
/>
```

**Usage:** Companies, Contacts, Campaigns, Documents, Financial Logs

### **3. MemberFilter Component**
**Filter by team member**

```tsx
<MemberFilter
  members={workspaceMembers}
  selectedMember={selectedMember}
  onChange={setSelectedMember}
  includeOptions={['all', 'assigned-to-me', 'unassigned']}
/>
```

**Usage:** Dashboard, CRM, Marketing, Calendar, Documents

### **4. ActivityFeedItem Component**
**Standardized activity display**

```tsx
<ActivityFeedItem
  activity={activity}
  onNavigate={(entityType, entityId) => navigateToEntity(entityType, entityId)}
/>
```

**Usage:** Activity feed across all tabs

---

## 📝 IMPLEMENTATION PRIORITY

### **Phase 1 (Week 1-2): Core CRM Collaboration**
1. Company assignments (all CRM types)
2. Contact assignments
3. Comments on companies
4. Comments on contacts
5. Activity logging for CRM actions
6. Build AssignmentDropdown component
7. Build CommentsSection component

### **Phase 2 (Week 3): Calendar & Meetings**
1. Team calendar view
2. Meeting invitations
3. Calendar event assignments
4. Activity logging for calendar

### **Phase 3 (Week 4): File Library**
1. Document review assignments
2. Document comments
3. Document permissions
4. Activity logging for documents

### **Phase 4 (Week 5): Marketing & Financial**
1. Campaign assignments
2. Campaign comments
3. Financial data collaboration
4. Expense approval workflow

### **Phase 5 (Week 6): Notes & Polish**
1. Migrate notes to dedicated table
2. Note collaboration features
3. Polish all UIs
4. Comprehensive testing

### **Phase 6 (Week 7-8): Notifications & Preferences**
1. Expand notification types
2. Build notification preferences UI
3. Add email notifications (Resend)
4. Notification digest options

---

## 🧪 TESTING CHECKLIST

For each collaborative feature:

- [ ] **Multi-user Testing**
  - Test with owner and member accounts
  - Verify permissions work correctly
  - Test concurrent edits
  
- [ ] **Notification Testing**
  - Verify notifications are created
  - Check notification bell updates
  - Test mark as read/delete
  
- [ ] **Activity Feed Testing**
  - Verify activity is logged
  - Check correct user attribution
  - Test activity filtering
  
- [ ] **RLS Policy Testing**
  - Verify data isolation between workspaces
  - Test member access permissions
  - Ensure no unauthorized access

---

## 🎨 UI/UX CONSISTENCY

### **Design Patterns to Follow**

1. **Assignment UI:**
   - Dropdown with workspace member list
   - Show avatar + name
   - "Unassigned" option
   - Current assignee highlighted

2. **Comment Threads:**
   - Consistent styling (like TaskComments)
   - @Mention autocomplete
   - Markdown support
   - Delete permission (author or owner)

3. **Activity Attribution:**
   - "Created by [Name] on [Date]"
   - "Last updated by [Name]"
   - "Assigned to [Name]"

4. **Filters:**
   - Consistent placement (top of each tab)
   - "All", "Assigned to me", "Unassigned"
   - Clear active filter indication

---

## 🚀 SUCCESS CRITERIA

**The platform is production-ready when:**

✅ All workspace members can collaborate on:
  - Tasks (already working ✅)
  - CRM companies and contacts
  - Calendar events and meetings
  - Marketing campaigns
  - Financial logs
  - Documents

✅ Comprehensive activity feed covers all actions

✅ Notification system alerts users for:
  - @Mentions (already working ✅)
  - Assignments
  - Comments
  - Status changes

✅ Permissions system prevents unauthorized actions

✅ Multi-user testing passes all scenarios

✅ UI is consistent and intuitive across all modules

---

## 📚 RELATED DOCUMENTATION

- `WORKSPACE_INFRASTRUCTURE.md` - Current workspace setup
- `WORKSPACE_STANDARDIZATION_COMPLETE.md` - Database schema
- `GAMIFICATION_SYSTEM.md` - Team achievements
- `lib/services/activityService.ts` - Activity logging
- `lib/services/notificationService.ts` - Notifications
- `components/shared/TaskComments.tsx` - Reference for comment UI

---

## 🔄 MIGRATION PLAN

For existing data:

1. **Add new columns with defaults:**
   - All `assigned_to` columns nullable
   - All `created_by_name` columns nullable
   - Existing data remains accessible

2. **Backfill user names:**
   ```sql
   UPDATE crm_items 
   SET created_by_name = profiles.full_name
   FROM profiles
   WHERE crm_items.user_id = profiles.id;
   ```

3. **Update RLS policies:**
   - Policies already support workspace member access
   - No breaking changes needed

4. **Update frontend incrementally:**
   - Add assignment features module by module
   - Existing functionality continues working
   - No downtime required

---

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Status:** Ready for Implementation
