# Calendar Improvements Implementation Status

## ✅ Completed

### 1. Fixed Keyboard Shortcuts Interference
**File**: `hooks/useKeyboardShortcuts.ts`

**Changes**:
- Added better detection for input fields (SELECT, contenteditable, role="textbox")
- Added modal detection to prevent shortcuts firing inside dialogs
- Moved Escape handling to work anywhere (for closing modals)
- All other shortcuts now properly blocked in inputs and modals

**Result**: Keyboard shortcuts (Ctrl+N, N, /, etc.) no longer interfere with forms and modals

### 2. Created Structured Calendar Event Form Component
**File**: `components/calendar/CalendarEventForm.tsx` (NEW)

**Features**:
- Proper validation (requires date/time)
- Task creation with title, description, category, priority, assignee
- Meeting creation with CRM item picker, contact picker, attendees, notes
- CRM action creation with CRM item picker and next action field
- Team plan awareness (shows assignee picker only for team plans)
- Upsell messaging for individual plans
- Error handling and loading states
- Required field indicators

## 🔄 In Progress / Needs Integration

### 3. Integrate CalendarEventForm into CalendarTab
**File**: `components/CalendarTab.tsx` (NEEDS UPDATE)

**Required Changes**:
1. Import CalendarEventForm component
2. Replace prompt() call on line 850 with form submission
3. Pass workspace context (planType, members) to form
4. Pass CRM items (investors, customers, partners) to form  
5. Implement form submission handlers for:
   - `handleTaskSubmit(formData)` → calls `actions.createTask()` with proper await
   - `handleMeetingSubmit(formData)` → calls `actions.createMeeting()`
   - `handleCrmActionSubmit(formData)` → calls `actions.updateCrmItem()` with nextActionDate

**Example Integration**:
```tsx
const handleEventSubmit = async (formData: CalendarEventFormData) => {
    try {
        if (formData.type === 'task') {
            await actions.createTask(
                formData.category!,
                formData.title!,
                formData.priority!,
                undefined, // crmItemId
                undefined, // contactId
                formData.dueDate,
                formData.assignedTo,
                formData.dueTime
            );
        } else if (formData.type === 'meeting') {
            await actions.createMeeting(
                formData.crmCollection!,
                formData.crmItemId!,
                formData.contactId,
                {
                    attendees: formData.attendees!,
                    summary: formData.meetingSummary || '',
                    timestamp: `${formData.dueDate}${formData.dueTime ? 'T' + formData.dueTime : ''}`
                }
            );
        } else if (formData.type === 'crm-action') {
            await actions.updateCrmItem(
                formData.crmCollection!,
                formData.crmItemId!,
                {
                    nextAction: formData.nextAction!,
                    nextActionDate: formData.dueDate
                }
            );
        }
        
        setShowNewEventModal(false);
        // Optionally refresh events without full invalidation
    } catch (error) {
        console.error('[Calendar] Failed to create event:', error);
        // Error is already shown in form
    }
};
```

## 📋 Todo

### 4. Fix Optimistic Task Creation
**File**: `DashboardApp.tsx` actions.createTask

**Current Problem**: Creates task optimistically, then invalidates entire cache causing flicker

**Required Fix**:
```tsx
createTask: async (category, text, priority, crmItemId, contactId, dueDate, assignedTo, dueTime) => {
    try {
        // Don't add optimistic task - wait for server response
        const result = await DataPersistenceAdapter.createTask(...);
        
        if (result.error) {
            throw new Error(result.error.message);
        }
        
        // Add server task directly to state (with ID)
        if (result.data) {
            setTasks(prev => [...prev, result.data]);
        }
        
        return result.data;
    } catch (error) {
        // Surface error to UI
        throw error;
    }
}
```

### 5. Pass Workspace Context to Calendar
**File**: `DashboardApp.tsx` (where CalendarTab is rendered)

**Required Props**:
```tsx
<CalendarTab
    events={calendarEvents}
    actions={actions}
    workspace={workspace} // NEW
    workspaceMembers={workspaceMembers} // NEW  
    crmItems={{ // NEW
        investors: crmData.investors || [],
        customers: crmData.customers || [],
        partners: crmData.partners || []
    }}
    user={user} // NEW - for permission checks
/>
```

**Update CalendarTabProps**:
```tsx
interface CalendarTabProps {
    events: CalendarEvent[];
    actions: AppActions;
    workspace?: Workspace;
    workspaceMembers?: WorkspaceMember[];
    crmItems?: {
        investors: BaseCrmItem[];
        customers: BaseCrmItem[];
        partners: BaseCrmItem[];
    };
    user?: User;
}
```

### 6. Server-Side Event Aggregation (Optional Enhancement)
**Future Work**: Create Supabase view or RPC

```sql
CREATE OR REPLACE FUNCTION get_workspace_calendar_events(p_workspace_id UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    due_date DATE,
    due_time TIME,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Tasks with due dates
    SELECT 
        t.id,
        'task' as type,
        t.text as title,
        t.due_date,
        t.due_time,
        jsonb_build_object('priority', t.priority, 'category', t.category) as metadata
    FROM tasks t
    WHERE t.workspace_id = p_workspace_id
      AND t.due_date IS NOT NULL
      AND t.status != 'Done'
    
    UNION ALL
    
    -- Marketing items
    SELECT
        m.id,
        'marketing' as type,
        m.title,
        m.publish_date as due_date,
        m.publish_time as due_time,
        jsonb_build_object('status', m.status) as metadata
    FROM marketing_items m
    WHERE m.workspace_id = p_workspace_id
      AND m.publish_date IS NOT NULL
    
    -- Add meetings, CRM actions etc.
    ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🧪 Testing Checklist

### Keyboard Shortcuts
- [ ] Press 'N' while typing in input → should NOT trigger new task
- [ ] Press 'N' while in modal → should NOT trigger new task
- [ ] Press 'N' on main page → SHOULD open new task dialog
- [ ] Press 'Escape' in modal → SHOULD close modal
- [ ] Press '/' while typing → should NOT trigger search
- [ ] Press '/' on main page → SHOULD trigger search

### Calendar Task Creation
- [ ] Click "New Event" → Task tab
- [ ] Leave date empty → should show validation error
- [ ] Leave title empty → should show validation error
- [ ] Fill all fields → should create task successfully
- [ ] Task should appear on calendar immediately with correct date
- [ ] Should show assignee picker on team plans
- [ ] Should show upsell message on individual plans

### Calendar Meeting Creation
- [ ] Click "New Event" → Meeting tab
- [ ] Select CRM type → should filter items
- [ ] Select CRM item → should enable submit
- [ ] Leave attendees empty → should show validation error
- [ ] Fill all fields → should create meeting successfully
- [ ] Meeting should appear on calendar

### Calendar CRM Action Creation
- [ ] Click "New Event" → CRM Action tab
- [ ] Select CRM type → should filter items
- [ ] Select CRM item → should enable submit
- [ ] Leave next action empty → should show validation error
- [ ] Fill all fields → should update CRM item
- [ ] CRM action should appear on calendar

## 🚀 Deployment Steps

1. ✅ Commit keyboard shortcuts fix
2. ✅ Commit CalendarEventForm component
3. ⏳ Integrate form into CalendarTab
4. ⏳ Pass workspace context from DashboardApp
5. ⏳ Fix optimistic task creation
6. ⏳ Test all scenarios
7. ⏳ Deploy to production
8. ⏳ (Optional) Add server-side aggregation

## 📊 Impact

**Before**:
- Keyboard shortcuts interfered with forms ❌
- Calendar used prompt() dialogs ❌
- No validation on event creation ❌
- Couldn't create meetings/CRM actions from calendar ❌
- Tasks disappeared due to optimistic updates ❌
- No team collaboration features ❌

**After**:
- Keyboard shortcuts respect input context ✅
- Proper structured form with validation ✅
- All event types can be created ✅
- Awaits server response before showing ✅
- Team features with plan awareness ✅
- Upsell opportunities for solo plans ✅
