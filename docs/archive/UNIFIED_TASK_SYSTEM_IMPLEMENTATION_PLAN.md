# Unified Task Management System - Implementation Plan

**Date:** November 17, 2025  
**Goal:** Consolidate all task management into a single "Tasks" tab with intelligent filtering, cross-module linking, and seamless integration with existing features.

---

## 🎯 Vision

### Current State (Fragmented)
Tasks are scattered across multiple locations:
- **Products & Services Tab:** `productsServicesTasks`
- **Investors Tab:** `investorTasks`
- **Customers Tab:** `customerTasks`
- **Partners Tab:** `partnerTasks`
- **Marketing Tab:** `marketingTasks`
- **Financials Tab:** `financialTasks`
- **Dashboard:** Aggregated view (limited)
- **Calendar:** Date-based aggregation
- **Account Detail Views:** Filtered by CRM item
- **Contact Detail Views:** Filtered by contact

### Desired State (Unified)
All tasks accessible from a single "Tasks" tab with:
- **Smart Filters:** By module, status, priority, assignee, date
- **Context Preservation:** Direct links to related accounts, contacts, deals, campaigns
- **Quick Navigation:** Jump to any related entity with one click
- **Advanced Features:** Bulk operations, saved filters, custom views
- **No Breaking Changes:** All existing task functionality preserved

---

## 📊 Current Architecture Analysis

### Task Data Structure
```typescript
interface Task {
    id: string;
    text: string;
    status: 'Todo' | 'InProgress' | 'Done';
    priority: 'Low' | 'Medium' | 'High';
    category: 'productsServicesTasks' | 'investorTasks' | 'customerTasks' | 
              'partnerTasks' | 'marketingTasks' | 'financialTasks' | 'crmTasks';
    createdAt: number;
    completedAt?: number;
    dueDate?: string;
    dueTime?: string;
    notes: Note[];
    subtasks?: Subtask[];
    crmItemId?: string;      // Links to account
    contactId?: string;       // Links to contact
    crmType?: 'investor' | 'customer' | 'partner';
    userId?: string;          // Creator
    assignedTo?: string;      // Assignee
    assignedToName?: string;
}
```

### Task Collections (6 separate arrays)
```typescript
interface DashboardData {
    productsServicesTasks: Task[];  // Products & services work
    investorTasks: Task[];          // Investor-related tasks
    customerTasks: Task[];          // Customer-related tasks
    partnerTasks: Task[];           // Partnership tasks
    marketingTasks: Task[];         // Marketing campaigns
    financialTasks: Task[];         // Financial operations
}
```

### Task Linking Relationships
```
Task → CRM Account (via crmItemId)
Task → Contact (via contactId)
Task → Product/Service (via context/notes)
Task → Marketing Campaign (via category)
Task → Deal (via crmItemId + context)
Task → Calendar Event (via dueDate)
Task → Documents (via linked_documents table)
```

---

## 🏗️ Implementation Strategy

### Phase 1: Data Model Enhancement ✅ (Already Done)
The existing data model already supports unified tasks:
- ✅ `category` field distinguishes task types
- ✅ `crmItemId` links to accounts
- ✅ `contactId` links to contacts
- ✅ `crmType` helps filter CRM tasks

**No database changes needed!**

### Phase 2: Create Unified Tasks Tab Component

**New Component:** `components/TasksTab.tsx`

**Features:**
1. **Main Task List** with virtualization (like paginated CRM)
2. **Advanced Filter Sidebar:**
   - Module (Products, Accounts, Marketing, Financials)
   - Status (Todo, In Progress, Done)
   - Priority (High, Medium, Low)
   - Assigned To (Me, Team Member, Unassigned)
   - Due Date (Today, This Week, Overdue, No Date)
   - Linked To (Account, Contact, Product, Campaign)
3. **Quick Actions Toolbar:**
   - Create task (with module selector)
   - Bulk operations (mark complete, reassign, delete)
   - Export to CSV
4. **Context Panel:**
   - Shows linked entity details
   - Quick jump buttons to related tabs
5. **View Modes:**
   - List view (default)
   - Kanban board (by status)
   - Calendar view (by due date)
   - Grouped view (by module/assignee)

### Phase 3: Cross-Module Integration

**Navigation Links:**
```typescript
// From Tasks tab → Jump to context
Task with crmItemId → Open account in Accounts tab
Task with contactId → Open contact detail
Task with category='productsServicesTasks' → Open Products tab
Task with category='marketingTasks' → Open Marketing tab

// From other tabs → Jump to tasks
Account Detail View → "View all tasks for this account"
Contact Detail View → "View all tasks for this contact"
Product View → "View related tasks"
Marketing Campaign → "View campaign tasks"
```

**Implementation:**
```typescript
// Add to AppActions
interface AppActions {
    // ... existing actions
    
    // New navigation actions
    navigateToTaskContext: (taskId: string) => void;
    navigateToRelatedTasks: (entityId: string, entityType: 'account' | 'contact' | 'product' | 'campaign') => void;
    openTaskDetailInContext: (taskId: string, contextTab: TabType) => void;
}
```

### Phase 4: Enhanced Task Creation

**Smart Task Creation:**
```typescript
// Context-aware task creation
interface CreateTaskOptions {
    category: TaskCollectionName;
    text: string;
    priority: Priority;
    
    // Auto-populate from current context
    autoLink?: {
        type: 'account' | 'contact' | 'product' | 'campaign';
        id: string;
        name: string;
    };
    
    // Pre-fill fields
    prefill?: {
        dueDate?: string;
        assignedTo?: string;
        subtasks?: string[];
    };
}
```

**Enhanced Quick Actions:**
- If on Accounts tab viewing "Acme Corp" → "New task for Acme Corp"
- If on Marketing tab viewing campaign → "New campaign task"
- If on Calendar viewing today → "New task due today"

### Phase 5: Advanced Features

**Saved Filters:**
```typescript
interface SavedFilter {
    id: string;
    name: string;
    icon: string;
    filters: {
        categories?: TaskCollectionName[];
        statuses?: TaskStatus[];
        priorities?: Priority[];
        assignedTo?: string[];
        dateRange?: { start?: string; end?: string };
    };
    sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'status';
    sortOrder?: 'asc' | 'desc';
}

// Pre-built filters
const DEFAULT_FILTERS: SavedFilter[] = [
    { name: 'My Tasks', icon: '👤', filters: { assignedTo: [currentUserId] } },
    { name: 'Due Today', icon: '📅', filters: { dateRange: { start: today, end: today } } },
    { name: 'Overdue', icon: '🚨', filters: { dateRange: { end: yesterday } } },
    { name: 'High Priority', icon: '🔴', filters: { priorities: ['High'] } },
    { name: 'CRM Tasks', icon: '💼', filters: { categories: ['investorTasks', 'customerTasks', 'partnerTasks'] } },
    { name: 'Marketing', icon: '📢', filters: { categories: ['marketingTasks'] } },
    { name: 'Recently Completed', icon: '✅', filters: { statuses: ['Done'] }, sortBy: 'completedAt' }
];
```

**Bulk Operations:**
```typescript
interface BulkTaskOperation {
    taskIds: string[];
    operation: 'complete' | 'delete' | 'reassign' | 'changePriority' | 'setDueDate';
    value?: any;
}

// UI: Select multiple tasks → Bulk action toolbar appears
// Actions: Mark complete, Assign to, Change priority, Set due date, Delete
```

**Kanban Board View:**
```typescript
// Three columns: Todo | In Progress | Done
// Drag and drop to change status
// Filter by module/assignee
// Visual indicators for overdue, high priority
```

---

## 🔗 Integration Points

### 1. Navigation Integration

**Add Tasks tab to main navigation:**
```typescript
// constants.ts
export const Tab = {
    Dashboard: 'dashboard',
    Calendar: 'calendar',
    Tasks: 'tasks', // NEW: Unified task management
    ProductsServices: 'products-services',
    Accounts: 'accounts',
    // ... rest
}

export const NAV_ITEMS: NavItem[] = [
    { id: Tab.Dashboard, label: 'Dashboard' },
    { id: Tab.Calendar, label: 'Calendar' },
    { id: Tab.Tasks, label: 'Tasks' }, // NEW
    { id: Tab.ProductsServices, label: 'Products & Services' },
    // ... rest
];
```

**Keyboard Shortcut:**
- `Cmd/Ctrl + Shift + T` → Jump to Tasks tab

### 2. Dashboard Integration

**Update Dashboard to link to Tasks:**
```typescript
// DashboardTab.tsx - Task summary widget
<div className="task-summary" onClick={() => setActiveTab(Tab.Tasks)}>
    <h3>📋 My Tasks</h3>
    <p>{incompleteTasks.length} active tasks</p>
    <p className="overdue">{overdueTasks.length} overdue</p>
</div>
```

### 3. Account Detail View Integration

**Add "View All Tasks" button:**
```typescript
// AccountDetailView.tsx
<button onClick={() => navigateToRelatedTasks(item.id, 'account')}>
    View all {taskCount} tasks for {item.company}
</button>

// This opens Tasks tab with filter: crmItemId = item.id
```

### 4. Calendar Integration

**Click task in calendar → Open in Tasks tab:**
```typescript
// CalendarTab.tsx
<CalendarEvent
    event={task}
    onClick={() => openTaskDetailInContext(task.id, Tab.Tasks)}
/>
```

### 5. Quick Actions Integration

**Update Quick Actions to support unified tasks:**
```typescript
// QuickActionsToolbar.tsx
const handleAddTask = () => {
    // Open task creation modal with current context
    openTaskModal({
        autoLink: getCurrentContext(), // Auto-link to current entity
        prefill: {
            category: inferCategoryFromCurrentTab()
        }
    });
};
```

### 6. AI Assistant Integration

**Update AI context to support unified task queries:**
```typescript
// assistantConfig.ts - Tasks AI
{
    tab: Tab.Tasks,
    title: 'Tasks AI',
    icon: '✅',
    systemPrompt: `
You are the Tasks AI assistant. You have access to ALL tasks across the entire platform.

Current Task Summary:
- Total: ${allTasks.length}
- By Status: Todo (${todoTasks.length}), In Progress (${inProgressTasks.length}), Done (${doneTasks.length})
- By Module: Products (${productTasks.length}), CRM (${crmTasks.length}), Marketing (${marketingTasks.length})
- Overdue: ${overdueTasks.length}
- Due Today: ${dueTodayTasks.length}

You can help with:
- Creating tasks with smart linking to accounts, contacts, products
- Organizing tasks by priority, due date, or module
- Identifying overdue tasks and suggesting follow-ups
- Breaking down complex tasks into subtasks
- Finding related tasks for specific accounts or projects
- Bulk operations on multiple tasks
`
}
```

---

## 📁 File Structure

```
components/
├── TasksTab.tsx                 # NEW: Main unified tasks view
├── tasks/
│   ├── TaskList.tsx            # NEW: Virtualized task list
│   ├── TaskFilters.tsx         # NEW: Advanced filter sidebar
│   ├── TaskDetail.tsx          # NEW: Task detail panel
│   ├── TaskKanban.tsx          # NEW: Kanban board view
│   ├── TaskContextPanel.tsx   # NEW: Shows linked entity info
│   ├── BulkTaskActions.tsx    # NEW: Bulk operations toolbar
│   └── SavedFilters.tsx        # NEW: Saved filter management
├── shared/
│   ├── TaskManagement.tsx      # EXISTING: Keep for legacy tabs
│   └── TaskItem.tsx            # EXTRACT: Reusable task item
└── assistant/
    └── assistantConfig.ts       # UPDATE: Add Tasks AI config

lib/
├── services/
│   ├── taskQueryService.ts     # NEW: React Query for tasks (like CRM)
│   └── taskLinkService.ts      # NEW: Handle task linking logic
└── utils/
    └── taskFilters.ts          # NEW: Filter utilities

hooks/
└── useTasks.ts                  # UPDATE: Enhanced task hooks

types.ts                         # UPDATE: Add new task-related types
constants.ts                     # UPDATE: Add Tab.Tasks
DashboardApp.tsx                 # UPDATE: Add Tasks tab routing
```

---

## 🔄 Migration Strategy (No Breaking Changes)

### Backward Compatibility

**Keep existing task arrays:**
```typescript
interface DashboardData {
    // Keep separate arrays for backward compatibility
    productsServicesTasks: Task[];
    investorTasks: Task[];
    customerTasks: Task[];
    partnerTasks: Task[];
    marketingTasks: Task[];
    financialTasks: Task[];
    
    // NEW: Aggregated view for Tasks tab
    allTasks?: Task[]; // Computed from above arrays
}
```

**Computed property:**
```typescript
const allTasks = useMemo(() => [
    ...data.productsServicesTasks,
    ...data.investorTasks,
    ...data.customerTasks,
    ...data.partnerTasks,
    ...data.marketingTasks,
    ...data.financialTasks
], [data]);
```

**Existing tabs continue to work:**
- Products tab still uses `productsServicesTasks`
- Accounts tab still uses `investorTasks`, `customerTasks`, `partnerTasks`
- Marketing tab still uses `marketingTasks`
- No changes needed to existing components

**Tasks tab is additive:**
- New unified view, doesn't replace existing task management
- Users can choose between tab-specific tasks or unified view
- Gradual migration path

---

## 🧪 Testing Strategy

### Phase 1: Unit Tests
```typescript
// Test task filtering
describe('TaskFilters', () => {
    it('filters by category', () => {});
    it('filters by status', () => {});
    it('filters by assignee', () => {});
    it('filters by date range', () => {});
    it('combines multiple filters', () => {});
});

// Test task linking
describe('TaskLinkService', () => {
    it('links task to account', () => {});
    it('links task to contact', () => {});
    it('resolves task context', () => {});
    it('navigates to linked entity', () => {});
});
```

### Phase 2: Integration Tests
1. Create task in Tasks tab → Verify appears in Products tab
2. Create task in Accounts tab → Verify appears in Tasks tab
3. Filter tasks by module → Verify correct tasks shown
4. Navigate from task → Verify opens correct context
5. Bulk operations → Verify all tasks updated
6. Saved filters → Verify persist across sessions

### Phase 3: User Acceptance Testing
- [ ] Can find all tasks in one place
- [ ] Filters work intuitively
- [ ] Navigation to context works
- [ ] Task creation is context-aware
- [ ] No existing functionality broken
- [ ] Performance acceptable (1000+ tasks)

---

## 📅 Implementation Timeline

### Week 1: Foundation (Days 1-5)
- [ ] **Day 1:** Create `TasksTab.tsx` skeleton
- [ ] **Day 2:** Build `TaskList.tsx` with virtualization
- [ ] **Day 3:** Implement `TaskFilters.tsx` (basic filters)
- [ ] **Day 4:** Add `TaskDetail.tsx` panel
- [ ] **Day 5:** Connect to existing data (no new data needed)

### Week 2: Features (Days 6-10)
- [ ] **Day 6:** Implement saved filters
- [ ] **Day 7:** Add bulk operations
- [ ] **Day 8:** Build `TaskContextPanel.tsx` (linked entity info)
- [ ] **Day 9:** Add navigation integration (jump to context)
- [ ] **Day 10:** Implement keyboard shortcuts

### Week 3: Advanced (Days 11-15)
- [ ] **Day 11:** Build `TaskKanban.tsx` (Kanban view)
- [ ] **Day 12:** Add drag-and-drop
- [ ] **Day 13:** Create `taskQueryService.ts` (React Query)
- [ ] **Day 14:** Optimize performance (virtualization, pagination)
- [ ] **Day 15:** Add AI assistant integration

### Week 4: Polish & Deploy (Days 16-20)
- [ ] **Day 16:** Testing (unit, integration)
- [ ] **Day 17:** Bug fixes and refinements
- [ ] **Day 18:** User documentation
- [ ] **Day 19:** Deploy with feature flag
- [ ] **Day 20:** Monitor and iterate

---

## 🎨 UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Tasks                                        [+ New Task] │
├─────────────────┬───────────────────────────────────────────┤
│ 🔍 Filters      │ Task List (Virtualized)                   │
│                 │                                            │
│ Module          │ ┌────────────────────────────────────┐   │
│ ☑ Products (5)  │ │ ☐ High │ Launch new feature        │   │
│ ☑ Accounts (12) │ │   👤 John │ Due: Today │ Products  │   │
│ ☐ Marketing (3) │ │   📎 3 subtasks │ 💬 2 comments    │   │
│ ☐ Financials    │ └────────────────────────────────────┘   │
│                 │                                            │
│ Status          │ ┌────────────────────────────────────┐   │
│ ☑ Todo          │ │ ☐ Med │ Follow up with Acme Corp  │   │
│ ☑ In Progress   │ │   👤 Sarah │ Due: Tomorrow │ CRM   │   │
│ ☐ Done          │ │   🏢 Acme Corp → View Account       │   │
│                 │ └────────────────────────────────────┘   │
│ Priority        │                                            │
│ ☑ High          │ ┌────────────────────────────────────┐   │
│ ☑ Medium        │ │ ☐ Low │ Update documentation      │   │
│ ☐ Low           │ │   Unassigned │ No due date        │   │
│                 │ └────────────────────────────────────┘   │
│ Assigned        │                                            │
│ ○ All           │ [Load More...] Showing 50 of 127 tasks   │
│ ● Me (8)        │                                            │
│ ○ Team          ├───────────────────────────────────────────┤
│ ○ Unassigned    │ 🔧 Bulk Actions: [ Complete ] [ Delete ]  │
│                 │                                            │
│ Due Date        │ Selected: 0 tasks                          │
│ ☑ Today (3)     │                                            │
│ ☑ This Week (7) │                                            │
│ ☑ Overdue (2)   │                                            │
│ ☐ No Date       │                                            │
│                 │                                            │
│ 💾 Saved        │                                            │
│ My Tasks        │                                            │
│ Due Today       │                                            │
│ High Priority   │                                            │
│ [+ New Filter]  │                                            │
└─────────────────┴───────────────────────────────────────────┘
```

---

## 🚀 Deployment Plan

### Phase 1: Internal Testing
```typescript
// Add feature flag
{
    key: 'ui.unified-tasks',
    enabled: false, // Start disabled
    description: 'Show unified Tasks tab with advanced filtering',
    envVar: 'VITE_UNIFIED_TASKS'
}
```

**Enable for testing:**
```javascript
localStorage.setItem('VITE_UNIFIED_TASKS', 'true');
window.location.reload();
```

### Phase 2: Beta Rollout (1 week)
- Enable for 10% of users
- Monitor performance and usage
- Gather feedback

### Phase 3: Full Deployment (Week 4)
- Enable for all users
- Update default to `true`
- Announce new feature

### Phase 4: Legacy Cleanup (Optional, Month 2)
- If adoption is high, consider making Tasks tab the primary interface
- Keep existing task management in tabs for quick access
- Remove duplicate functionality gradually

---

## 🎯 Success Metrics

### User Engagement
- [ ] Tasks tab usage > 50% of sessions
- [ ] Average time on Tasks tab > 2 minutes
- [ ] Task creation from Tasks tab > 30%

### Performance
- [ ] Page load time < 1s for 1000 tasks
- [ ] Filter application < 100ms
- [ ] Navigation to context < 500ms
- [ ] Memory usage < 20MB

### User Satisfaction
- [ ] Positive feedback > 80%
- [ ] Support tickets decrease by 20%
- [ ] Task completion rate increase by 15%

---

## 🔧 Technical Considerations

### Performance Optimization

**Virtualization:**
```typescript
// Use react-window (like paginated CRM)
import { FixedSizeList } from 'react-window';

<FixedSizeList
    height={600}
    itemCount={filteredTasks.length}
    itemSize={80}
    width="100%"
>
    {({ index, style }) => (
        <TaskItem task={filteredTasks[index]} style={style} />
    )}
</FixedSizeList>
```

**Query Optimization:**
```typescript
// Use React Query with pagination
const { data, isLoading } = useQuery({
    queryKey: ['tasks', filters, page],
    queryFn: () => fetchTasks(filters, page),
    keepPreviousData: true,
    staleTime: 30000
});
```

**Filter Optimization:**
```typescript
// Memoize filtered tasks
const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
        if (filters.categories.length && !filters.categories.includes(task.category)) return false;
        if (filters.statuses.length && !filters.statuses.includes(task.status)) return false;
        if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
        // ... more filters
        return true;
    });
}, [allTasks, filters]);
```

### Accessibility

- [ ] Keyboard navigation (arrow keys, enter, escape)
- [ ] Screen reader support (ARIA labels)
- [ ] Focus management
- [ ] Color contrast (WCAG AA)
- [ ] Keyboard shortcuts with hints

### Mobile Responsiveness

- [ ] Collapsible filter sidebar
- [ ] Touch-friendly task items
- [ ] Swipe gestures (mark complete, delete)
- [ ] Responsive kanban board
- [ ] Mobile-optimized bulk actions

---

## 📝 Implementation Checklist

### Foundation
- [ ] Create `components/TasksTab.tsx`
- [ ] Create `components/tasks/TaskList.tsx`
- [ ] Create `components/tasks/TaskFilters.tsx`
- [ ] Add `Tab.Tasks` to constants
- [ ] Add Tasks tab to navigation
- [ ] Add routing in `DashboardApp.tsx`

### Core Features
- [ ] Implement category filter
- [ ] Implement status filter
- [ ] Implement priority filter
- [ ] Implement assignee filter
- [ ] Implement date filter
- [ ] Add search functionality
- [ ] Add sorting options

### Advanced Features
- [ ] Create `TaskContextPanel.tsx`
- [ ] Implement task linking logic
- [ ] Add navigation to context
- [ ] Create `TaskKanban.tsx`
- [ ] Implement drag-and-drop
- [ ] Add bulk operations
- [ ] Create saved filters UI

### Integration
- [ ] Update Dashboard with Tasks link
- [ ] Update Account Detail with task count
- [ ] Update Contact Detail with task count
- [ ] Update Calendar with task navigation
- [ ] Update Quick Actions for context-aware creation
- [ ] Add AI assistant config

### Polish
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling
- [ ] Add keyboard shortcuts
- [ ] Add tooltips and help text
- [ ] Add animations and transitions
- [ ] Mobile responsive design

### Testing & Deployment
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing checklist
- [ ] Performance testing
- [ ] Add feature flag
- [ ] Deploy to staging
- [ ] Beta testing
- [ ] Production deployment

---

## 🎉 Expected Benefits

### For Users
✅ **Single Source of Truth:** All tasks in one place  
✅ **Better Organization:** Advanced filtering and grouping  
✅ **Time Savings:** No switching between tabs to find tasks  
✅ **Context Awareness:** See related entities at a glance  
✅ **Bulk Efficiency:** Operate on multiple tasks at once  
✅ **Flexibility:** Multiple view modes (list, kanban, calendar)  

### For the Platform
✅ **Consistency:** Unified task experience across all modules  
✅ **Scalability:** Handle thousands of tasks efficiently  
✅ **Maintainability:** Centralized task logic  
✅ **Extensibility:** Easy to add new features  
✅ **Performance:** Optimized with virtualization and pagination  

---

**Status:** 📋 Ready for Implementation  
**Risk Level:** 🟢 Low (Additive feature, no breaking changes)  
**Estimated Effort:** 4 weeks (20 days)  
**Dependencies:** None (uses existing data model)

**Next Step:** Create `TasksTab.tsx` skeleton and add to navigation
