# Complete AI Function & Data Mapping Guide

**Purpose:** This document maps every data entity in the application to its TypeScript interface, database schema, DashboardData property, AI tool, and UI operations. This serves as the source of truth for ensuring the AI has complete context and capabilities.

**Last Updated:** 2025-11-11

---

## Table of Contents
1. [Tasks](#1-tasks)
2. [CRM - Investors](#2-crm---investors)
3. [CRM - Customers](#3-crm---customers)
4. [CRM - Partners](#4-crm---partners)
5. [CRM - Contacts](#5-crm---contacts)
6. [CRM - Meetings](#6-crm---meetings)
7. [Marketing Items](#7-marketing-items)
8. [Financial Logs](#8-financial-logs)
9. [Expenses](#9-expenses)
10. [Documents](#10-documents)
11. [Notes](#11-notes)
12. [Settings](#12-settings)
13. [Data Flow Summary](#data-flow-summary)
14. [AI Context Requirements](#ai-context-requirements)

---

## 1. Tasks

### TypeScript Interface
```typescript
interface Task {
    id: string;
    text: string;
    status: TaskStatus; // 'Todo' | 'InProgress' | 'Done'
    priority: Priority; // 'Low' | 'Medium' | 'High'
    category: 'platformTasks' | 'investorTasks' | 'customerTasks' | 'partnerTasks' | 'marketingTasks' | 'financialTasks';
    createdAt: number;
    completedAt?: number;
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM (24-hour)
    notes: Note[];
    crmItemId?: string;
    contactId?: string;
    userId?: string;
    assignedTo?: string; // User ID
    assignedToName?: string;
}
```

### Database Schema
- **Table:** `platformTasks`, `investorTasks`, `customerTasks`, `partnerTasks`, `marketingTasks`, `financialTasks` (6 separate tables)
- **Columns:** `id`, `text`, `status`, `priority`, `workspace_id`, `created_at`, `completed_at`, `due_date`, `due_time`, `notes`, `crm_item_id`, `contact_id`, `user_id`, `assigned_to`, `assigned_to_name`

### DashboardData Property
```typescript
data.platformTasks: Task[]      // ✅ Correct property name
data.investorTasks: Task[]       // ✅ Correct property name
data.customerTasks: Task[]       // ✅ Correct property name
data.partnerTasks: Task[]        // ✅ Correct property name
data.marketingTasks: Task[]      // ✅ Correct property name
data.financialTasks: Task[]      // ✅ Correct property name
```

### UI Operations
- ✅ **Create:** Add new task button in each tab
- ✅ **Read:** Task lists displayed in each module tab
- ✅ **Update:** Click task to edit text, status, priority, due date, assignment
- ✅ **Delete:** Delete button in task modal
- ✅ **Notes:** Add/edit/delete notes on tasks

### AI Tools
- ✅ `createTask` - Creates new task
  - Parameters: `category`, `text`, `priority`, `dueDate`, `assignedTo`
  - Required: `category`, `text`, `priority`
  
- ✅ `updateTask` - Updates existing task
  - Parameters: `taskId`, `updates` (text, status, priority, dueDate)
  - Required: `taskId`, `updates`

- ✅ `deleteItem` - Deletes task
  - Parameters: `collection` (task category), `itemId`
  - Required: `collection`, `itemId`

- ✅ `addNote` - Adds note to task
- ✅ `updateNote` - Updates note on task
- ✅ `deleteNote` - Deletes note from task

### AI Context Injection
**What the AI needs:**
```typescript
// Platform Tab
data.platformTasks // All platform tasks

// Investors Tab
data.investorTasks // Tasks specific to investors

// Customers Tab
data.customerTasks // Tasks specific to customers

// Partners Tab
data.partnerTasks // Tasks specific to partners

// Marketing Tab
data.marketingTasks // Tasks specific to marketing

// Financials Tab
data.financialTasks // Tasks specific to financials

// Calendar Tab
[...data.platformTasks, ...data.investorTasks, ...data.customerTasks, 
 ...data.partnerTasks, ...data.marketingTasks, ...data.financialTasks] // All tasks aggregated

// Dashboard Tab
Recent 10 tasks across all categories
```

---

## 2. CRM - Investors

### TypeScript Interface
```typescript
interface Investor extends BaseCrmItem {
    checkSize: number; // ⚠️ CRITICAL: Investment amount
}

interface BaseCrmItem {
    id: string;
    company: string; // ⚠️ CRITICAL: NOT "name", it's "company"
    contacts: Contact[];
    priority: Priority;
    status: string; // ⚠️ CRITICAL: Custom status (e.g., "Lead", "Qualified", "Won")
    nextAction?: string;
    nextActionDate?: string;
    nextActionTime?: string;
    createdAt: number;
    notes: Note[];
    assignedTo?: string | null;
    assignedToName?: string | null;
}
```

### Database Schema
- **Table:** `investors`
- **Columns:** `id`, `company`, `check_size`, `contacts`, `priority`, `status`, `next_action`, `next_action_date`, `next_action_time`, `created_at`, `notes`, `workspace_id`, `assigned_to`, `assigned_to_name`

### DashboardData Property
```typescript
data.investors: Investor[] // ✅ Correct property name
```

### UI Operations
- ✅ **Create:** "Add Investor" button in Investors CRM tab
- ✅ **Read:** Investor cards displayed in CRM tab
- ✅ **Update:** Edit investor modal (company name, status, check size, next action, priority)
- ✅ **Delete:** Delete button in investor modal
- ✅ **Notes:** Add/edit/delete notes on investors
- ✅ **Contacts:** Add/edit/delete contacts for investors
- ✅ **Meetings:** Schedule/edit/delete meetings with contacts

### AI Tools
- ✅ `createCrmItem` - Creates new investor
  - Parameters: `collection: 'investors'`, `name` (maps to company), `details`, `amount` (maps to checkSize), `stage` (maps to status), `contactPerson`, `email`, `phone`
  - Required: `collection`, `name`
  - ⚠️ **MAPPING ISSUE:** Tool says "name" but interface uses "company"

- ✅ `updateCrmItem` - Updates investor
  - Parameters: `collection: 'investors'`, `itemId`, `updates`
  - ⚠️ **MAPPING ISSUE:** Updates use "name", "amount", "stage" but need "company", "checkSize", "status"

- ✅ `deleteItem` - Deletes investor
  - Parameters: `collection: 'investors'`, `itemId`

### AI Context Injection
**What the AI needs:**
```typescript
// Investors Tab
data.investors // ✅ All investor CRM items with full details
data.investorTasks // ✅ Tasks specific to investors
```

**Current Issue:** AI tool parameters don't match TypeScript interface property names!

---

## 3. CRM - Customers

### TypeScript Interface
```typescript
interface Customer extends BaseCrmItem {
    dealValue: number; // ⚠️ CRITICAL: Deal amount (NOT "amount")
}
```

### Database Schema
- **Table:** `customers`
- **Columns:** Same as investors but with `deal_value` instead of `check_size`

### DashboardData Property
```typescript
data.customers: Customer[] // ✅ Correct property name
```

### UI Operations
- Same as Investors (create, read, update, delete, notes, contacts, meetings)

### AI Tools
- ✅ `createCrmItem` with `collection: 'customers'`
  - ⚠️ **MAPPING ISSUE:** "amount" → should be "dealValue"
- ✅ `updateCrmItem` with `collection: 'customers'`
- ✅ `deleteItem` with `collection: 'customers'`

### AI Context Injection
```typescript
data.customers // ✅ All customer CRM items
data.customerTasks // ✅ Tasks specific to customers
```

---

## 4. CRM - Partners

### TypeScript Interface
```typescript
interface Partner extends BaseCrmItem {
    opportunity: string; // ⚠️ CRITICAL: Partnership opportunity description
}
```

### Database Schema
- **Table:** `partners`
- **Columns:** Same structure as other CRM tables with `opportunity` field

### DashboardData Property
```typescript
data.partners: Partner[] // ✅ Correct property name
```

### UI Operations
- Same as Investors/Customers

### AI Tools
- ✅ `createCrmItem` with `collection: 'partners'`
- ✅ `updateCrmItem` with `collection: 'partners'`
- ✅ `deleteItem` with `collection: 'partners'`

### AI Context Injection
```typescript
data.partners // ✅ All partner CRM items
data.partnerTasks // ✅ Tasks specific to partners
```

---

## 5. CRM - Contacts

### TypeScript Interface
```typescript
interface Contact {
    id: string;
    crmItemId: string; // Parent CRM item
    name: string; // ✅ Contact name (not company)
    email: string;
    phone?: string;
    title?: string;
    linkedin: string;
    notes: Note[];
    meetings: Meeting[];
    assignedTo?: string | null;
    assignedToName?: string | null;
    createdByName?: string | null;
}
```

### Database Schema
- **Storage:** Nested within CRM items (JSON array in `contacts` column)
- **Not a separate table** - stored as JSONB in investors/customers/partners tables

### DashboardData Property
```typescript
// Contacts are nested inside CRM items
data.investors[0].contacts: Contact[]
data.customers[0].contacts: Contact[]
data.partners[0].contacts: Contact[]
```

### UI Operations
- ✅ **Create:** "Add Contact" button in CRM item modal
- ✅ **Read:** Contact cards displayed in CRM item modal
- ✅ **Update:** Edit contact modal
- ✅ **Delete:** Delete button in contact card

### AI Tools
- ✅ `createContact` - Creates new contact for CRM item
  - Parameters: `collection`, `crmItemId`, `name`, `title`, `email`, `phone`, `linkedin`
  - Required: `collection`, `crmItemId`, `name`, `email`

- ✅ `updateContact` - Updates contact
  - Parameters: `collection`, `crmItemId`, `contactId`, `updates`

- ✅ `deleteContact` - Deletes contact
  - Parameters: `collection`, `crmItemId`, `contactId`

### AI Context Injection
```typescript
// Contacts are included within CRM items
data.investors // Includes contacts array for each investor
data.customers // Includes contacts array for each customer
data.partners // Includes contacts array for each partner
```

---

## 6. CRM - Meetings

### TypeScript Interface
```typescript
interface Meeting {
    id: string;
    timestamp: number;
    title: string;
    attendees: string;
    summary: string; // Markdown
}
```

### Database Schema
- **Storage:** Nested within Contacts (JSON array in `meetings` column)
- **Not a separate table** - stored within contacts

### DashboardData Property
```typescript
// Meetings are nested inside Contacts inside CRM items
data.investors[0].contacts[0].meetings: Meeting[]
data.customers[0].contacts[0].meetings: Meeting[]
data.partners[0].contacts[0].meetings: Meeting[]
```

### UI Operations
- ✅ **Create:** "Schedule Meeting" button in contact card
- ✅ **Read:** Meeting history displayed in contact modal
- ✅ **Update:** Edit meeting modal
- ✅ **Delete:** Delete button in meeting card

### AI Tools
- ✅ `createMeeting` - Creates meeting for contact
  - Parameters: `collection`, `crmItemId`, `contactId`, `title`, `date`, `attendees`, `summary`
  - Required: `collection`, `crmItemId`, `contactId`, `title`, `date`

- ✅ `updateMeeting` - Updates meeting
  - Parameters: `collection`, `crmItemId`, `meetingId`, `updates`

- ✅ `deleteMeeting` - Deletes meeting
  - Parameters: `collection`, `crmItemId`, `meetingId`

### AI Context Injection
```typescript
// Meetings are included within contacts within CRM items
data.investors // Includes contacts with meetings for each investor
```

**Note:** For Calendar tab, meetings should be extracted and aggregated separately.

---

## 7. Marketing Items

### TypeScript Interface
```typescript
interface MarketingItem {
    id: string;
    title: string; // ⚠️ CRITICAL: NOT "name", it's "title"
    type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other';
    status: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled';
    createdAt: number;
    notes: Note[];
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM (24-hour)
}
```

### Database Schema
- **Table:** `marketing`
- **Columns:** `id`, `title`, `type`, `status`, `created_at`, `notes`, `due_date`, `due_time`, `workspace_id`

### DashboardData Property
```typescript
data.marketing: MarketingItem[] // ✅ Correct property name
```

### UI Operations
- ✅ **Create:** "Add Campaign" button in Marketing tab
- ✅ **Read:** Campaign cards displayed in Content Calendar
- ✅ **Update:** Edit campaign modal (title, type, status, due date)
- ✅ **Delete:** Delete button in campaign modal
- ✅ **Notes:** Add/edit/delete notes on campaigns

### AI Tools
- ✅ `createMarketingItem` - Creates marketing campaign
  - Parameters: `title`, `type`, `status`, `dueDate`, `dueTime`
  - Required: `title`

- ✅ `updateMarketingItem` - Updates campaign
  - Parameters: `itemId`, `updates` (title, type, status, dueDate, dueTime)
  - Required: `itemId`, `updates`

- ✅ `deleteItem` - Deletes campaign
  - Parameters: `collection: 'marketing'`, `itemId`

### AI Context Injection
```typescript
// Marketing Tab
data.marketing // ✅ All marketing campaigns
data.marketingTasks // ✅ Tasks specific to marketing
```

**Current Issue:** AI may say "campaigns" but property is `marketing`, not `campaigns`!

---

## 8. Financial Logs

### TypeScript Interface
```typescript
interface FinancialLog {
    id: string;
    date: string; // YYYY-MM-DD
    mrr: number; // Monthly Recurring Revenue
    gmv: number; // Gross Merchandise Value
    signups: number;
    userId?: string;
    userName?: string;
}
```

### Database Schema
- **Table:** `financials` (⚠️ NOT `financial_logs`)
- **Columns:** `id`, `date`, `mrr`, `gmv`, `signups`, `user_id`, `user_name`, `workspace_id`

### DashboardData Property
```typescript
data.financials: FinancialLog[] // ✅ Correct property name (NOT financialLogs!)
```

### UI Operations
- ✅ **Create:** "Log Financials" button in Financials tab
- ✅ **Read:** Financial chart and data table
- ✅ **Update:** Edit financial log in table
- ✅ **Delete:** Delete button in financial log row

### AI Tools
- ✅ `logFinancials` - Creates financial log
  - Parameters: `date`, `mrr`, `gmv`, `signups`
  - Required: All parameters

### AI Context Injection
```typescript
// Financials Tab
data.financials // ✅ All financial logs (NOT data.financialLogs!)
data.expenses // ✅ All expenses
data.financialTasks // ✅ Tasks specific to financials
```

**CRITICAL ISSUE FOUND:** Property is `data.financials`, NOT `data.financialLogs`!

---

## 9. Expenses

### TypeScript Interface
```typescript
interface Expense {
    id: string;
    date: string; // YYYY-MM-DD
    category: ExpenseCategory; // 'Software/SaaS' | 'Marketing' | 'Office' | ...
    amount: number;
    description: string;
    vendor?: string;
    paymentMethod?: PaymentMethod;
    receiptDocumentId?: string;
    notes: Note[];
}
```

### Database Schema
- **Table:** `expenses`
- **Columns:** `id`, `date`, `category`, `amount`, `description`, `vendor`, `payment_method`, `receipt_document_id`, `notes`, `workspace_id`

### DashboardData Property
```typescript
data.expenses: Expense[] // ✅ Correct property name
```

### UI Operations
- ✅ **Create:** "Add Expense" button in Financials tab
- ✅ **Read:** Expense list/table
- ✅ **Update:** Edit expense modal
- ✅ **Delete:** Delete button in expense row
- ✅ **Notes:** Add/edit/delete notes on expenses

### AI Tools
- ✅ `createExpense` - Creates expense
  - Parameters: `date`, `category`, `amount`, `description`, `vendor`, `paymentMethod`
  - Required: `date`, `category`, `amount`, `description`

- ✅ `updateExpense` - Updates expense
  - Parameters: `expenseId`, `updates`

### AI Context Injection
```typescript
// Financials Tab
data.expenses // ✅ All expenses
```

---

## 10. Documents

### TypeScript Interface
```typescript
interface Document {
    id: string;
    name: string; // ⚠️ CRITICAL: File name
    mimeType: string;
    content: string; // base64 encoded
    uploadedAt: number;
    module: TabType; // ⚠️ Which tab it belongs to
    companyId?: string;
    contactId?: string;
    uploadedBy?: string;
    uploadedByName?: string;
    notes: Note[];
}
```

### Database Schema
- **Table:** `documents`
- **Columns:** `id`, `name`, `mime_type`, `content`, `uploaded_at`, `module`, `company_id`, `contact_id`, `uploaded_by`, `uploaded_by_name`, `notes`, `workspace_id`

### DashboardData Property
```typescript
data.documents: Document[] // ✅ Full documents with content
data.documentsMetadata: Omit<Document, 'content'>[] // ✅ Lightweight metadata (no content)
```

### UI Operations
- ✅ **Create:** File upload in multiple locations (Documents tab, CRM modals, chat)
- ✅ **Read:** Document library, file viewer
- ✅ **Update:** Rename, move between modules
- ✅ **Delete:** Delete button in document card
- ✅ **Notes:** Add/edit/delete notes on documents

### AI Tools
- ✅ `uploadDocument` - Uploads new document
  - Parameters: `name`, `mimeType`, `content` (base64), `module`
  - Required: All parameters

- ✅ `updateDocument` - Updates document
  - Parameters: `docId`, `name`, `mimeType`, `content`

- ✅ `getFileContent` - Retrieves document content
  - Parameters: `fileId`

### AI Context Injection
```typescript
// ALL Tabs (except Calendar/Achievements/Settings)
data.documentsMetadata // ✅ Metadata only (id, name, module, mimeType) for token efficiency

// Documents Tab specifically
data.documents // Could include full documents, but typically use metadata
```

**Token Optimization:** Use `documentsMetadata` (without content) to reduce token usage!

---

## 11. Notes

### TypeScript Interface
```typescript
interface Note {
    text: string;
    timestamp: number;
    userId?: string;
    userName?: string;
}
```

### Database Schema
- **Storage:** Nested within parent items (JSON array in `notes` column)
- **Not a separate table** - stored in multiple tables: tasks, CRM items, contacts, marketing, expenses, documents

### DashboardData Property
```typescript
// Notes are nested in all data types
data.platformTasks[0].notes: Note[]
data.investors[0].notes: Note[]
data.marketing[0].notes: Note[]
data.expenses[0].notes: Note[]
data.documents[0].notes: Note[]
// etc.
```

### UI Operations
- ✅ **Create:** "Add Note" button in item modals
- ✅ **Read:** Notes list in modal
- ✅ **Update:** Edit note button
- ✅ **Delete:** Delete note button

### AI Tools
- ✅ `addNote` - Adds note to any item
  - Parameters: `collection`, `itemId`, `noteText`, `crmItemId` (if collection is 'contacts')
  - Collections: 'investors', 'customers', 'partners', 'platformTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketing', 'marketingTasks', 'financialTasks', 'documents', 'contacts'

- ✅ `updateNote` - Updates note
  - Parameters: `collection`, `itemId`, `noteTimestamp`, `newText`, `crmItemId`

- ✅ `deleteNote` - Deletes note
  - Parameters: `collection`, `itemId`, `noteTimestamp`, `crmItemId`

### AI Context Injection
```typescript
// Notes are included within all parent items
// No separate injection needed - already part of data.investors, data.marketing, etc.
```

---

## 12. Settings

### TypeScript Interface
```typescript
interface SettingsData {
    desktopNotifications: boolean;
    quickLinks?: QuickLink[];
    autoSaveAttachments?: boolean;
    maxFileSizeMB?: number;
}

interface BusinessProfile {
    id: string;
    workspaceId: string;
    companyName: string;
    industry?: string;
    companySize?: CompanySize;
    businessModel?: BusinessModel;
    description?: string;
    targetMarket?: string;
    valueProposition?: string;
    primaryGoal?: PrimaryGoal;
    // ... many more fields
}
```

### Database Schema
- **Table:** `settings` (workspace settings)
- **Table:** `business_profiles` (company information)
- **Columns:** Various configuration fields

### DashboardData Property
```typescript
data.settings: SettingsData // ✅ Workspace settings
// Business profile is separate - passed as businessContext string
```

### UI Operations
- ✅ **Read:** Settings tab displays all settings
- ✅ **Update:** Edit various settings (notifications, quick links, business profile)

### AI Tools
- ✅ `updateSettings` - Updates workspace settings
  - Parameters: `settings` (object with companyName, industry, goals, etc.)

### AI Context Injection
```typescript
// Settings are passed as formatted strings, not raw data
businessContext: string // Pre-formatted business profile information
teamContext: string // Pre-formatted team member information
```

---

## Data Flow Summary

### 1. Database → DashboardApp
```
Supabase tables → useLazyDataPersistence hook → DashboardApp state
```

### 2. DashboardApp → FloatingAIAssistant → AssistantModal → assistantConfig
```typescript
// DashboardApp.tsx (line ~2477)
<FloatingAIAssistant
    data={data} // ✅ DashboardData object
    // ... other props
/>

// FloatingAIAssistant.tsx (line ~107)
<AssistantModal
    data={data} // ✅ Passed through
    // ... other props
/>

// AssistantModal.tsx (line ~76)
config.getSystemPrompt({ 
    companyName, 
    businessContext, 
    teamContext, 
    data // ✅ Passed to config
})

// assistantConfig.ts (each tab config)
getSystemPrompt: ({ companyName, businessContext, teamContext, data }) => {
    // Extract relevant data
    const items = data.investors; // or data.marketing, etc.
    
    // Inject into system prompt
    return `...
    Current CRM Context:
    ${JSON.stringify(items, null, 2)}
    ...`;
}
```

### 3. AI Response → Actions → Database
```
AI function call → ModuleAssistant handleAction → actions.createTask/updateCrmItem/etc. → Supabase
```

---

## AI Context Requirements

### By Tab

#### Dashboard Tab
```typescript
{
    recentTasks: // Recent 10 tasks across all 6 categories
    investorCount: data.investors.length,
    customerCount: data.customers.length,
    partnerCount: data.partners.length,
    marketingCount: data.marketing.length,
    documentsMetadata: data.documentsMetadata
}
```

#### Platform Tab
```typescript
{
    platformTasks: data.platformTasks, // ✅ All platform tasks
    documentsMetadata: data.documentsMetadata
}
```

#### Investors Tab
```typescript
{
    investors: data.investors, // ✅ All investor CRM items (with contacts, meetings, notes)
    investorTasks: data.investorTasks, // ✅ Investor-specific tasks
    documentsMetadata: data.documentsMetadata
}
```

#### Customers Tab
```typescript
{
    customers: data.customers, // ✅ All customer CRM items
    customerTasks: data.customerTasks, // ✅ Customer-specific tasks
    documentsMetadata: data.documentsMetadata
}
```

#### Partners Tab
```typescript
{
    partners: data.partners, // ✅ All partner CRM items
    partnerTasks: data.partnerTasks, // ✅ Partner-specific tasks
    documentsMetadata: data.documentsMetadata
}
```

#### Marketing Tab
```typescript
{
    marketing: data.marketing, // ✅ All marketing campaigns (NOT "campaigns"!)
    marketingTasks: data.marketingTasks, // ✅ Marketing-specific tasks
    documentsMetadata: data.documentsMetadata
}
```

#### Financials Tab
```typescript
{
    financials: data.financials, // ✅ All financial logs (NOT "financialLogs"!)
    expenses: data.expenses, // ✅ All expenses
    financialTasks: data.financialTasks, // ✅ Financial-specific tasks
    documentsMetadata: data.documentsMetadata
}
```

#### Calendar Tab
```typescript
{
    allTasks: [...data.platformTasks, ...data.investorTasks, ...data.customerTasks, 
               ...data.partnerTasks, ...data.marketingTasks, ...data.financialTasks],
    overdueTasks: // Tasks where dueDate < today && status !== 'Done'
    marketingItems: data.marketing, // Campaigns with due dates
    // Note: Meetings are nested in contacts - need extraction if showing in calendar
}
```

#### Workspace Tab
```typescript
{
    documentsMetadata: data.documentsMetadata,
    // Team member information (from teamContext string)
}
```

#### Documents Tab
```typescript
{
    documentsMetadata: data.documentsMetadata, // ✅ With mimeType for file type detection
    // Could optionally include full documents for content search
}
```

---

## Critical Issues Identified

### 🚨 Issue 1: Property Name Mismatches

**Problem:** AI tool parameters don't match TypeScript interface property names!

| Entity | Tool Parameter | TypeScript Property | Status |
|--------|---------------|---------------------|--------|
| Investor | `name` | `company` | ❌ MISMATCH |
| Investor | `amount` | `checkSize` | ❌ MISMATCH |
| Investor | `stage` | `status` | ❌ MISMATCH |
| Customer | `name` | `company` | ❌ MISMATCH |
| Customer | `amount` | `dealValue` | ❌ MISMATCH |
| Customer | `stage` | `status` | ❌ MISMATCH |
| Partner | `name` | `company` | ❌ MISMATCH |
| Partner | `stage` | `status` | ❌ MISMATCH |
| MarketingItem | - | `title` | ⚠️ Ensure AI uses "title" not "name" |
| FinancialLog | - | - | ⚠️ Stored in `financials` table, not `financial_logs` |

**Impact:** When AI creates/updates CRM items, the field mapping may be incorrect.

**Solution:** Backend action handlers must map tool parameters to correct database fields.

### 🚨 Issue 2: DashboardData Property Name Confusion

**Problem:** Code attempted to use wrong property names!

| Attempted | Correct | Status |
|-----------|---------|--------|
| `data.financialLogs` | `data.financials` | ✅ FIXED in assistantConfig.ts |
| `data.calendarEvents` | (doesn't exist) | ✅ FIXED - removed reference |
| `data.campaigns` | `data.marketing` | ⚠️ AI might say "campaigns" |

**Solution:** System prompts must use exact property names from DashboardData interface.

### 🚨 Issue 3: Empty Data Arrays

**Problem:** If data hasn't loaded yet, AI sees empty arrays and says "no data exists".

**Current State:**
- User reports: "AI says no investors, but I have 1 investor logged"
- User reports: "AI says no campaigns, but campaigns show in Marketing tab"

**Possible Causes:**
1. Data not loaded when AI initializes
2. Data loaded but not passing through props correctly
3. System prompt building before data arrives

**Solution:** Add loading checks and debug logging (already added in previous step).

---

## Verification Checklist

### ✅ Type Safety
- [x] All interfaces defined in types.ts
- [x] DashboardData interface includes all required properties
- [x] AI tool parameters documented

### ⏳ Data Flow (In Progress)
- [x] DashboardApp passes `data` to FloatingAIAssistant
- [x] FloatingAIAssistant passes `data` to AssistantModal
- [x] AssistantModal passes `data` to assistantConfig
- [x] assistantConfig extracts relevant data for each tab
- [ ] **NEEDS VERIFICATION:** Data is actually populated (not empty arrays)
- [ ] **NEEDS VERIFICATION:** JSON.stringify produces valid JSON
- [ ] **NEEDS VERIFICATION:** AI receives populated context (not "Items: []")

### ⏳ AI Tools (Needs Review)
- [x] All CRUD operations have corresponding tools
- [ ] **NEEDS FIX:** Tool parameters match TypeScript properties
- [ ] **NEEDS FIX:** Backend action handlers map tool params correctly
- [x] Notes, contacts, meetings have nested tools
- [x] Delete operations work across all collections

### ⏳ Context Injection (Needs Testing)
- [x] System prompts rebuilt with data injection
- [x] Anti-hallucination rules added to all tabs
- [x] Document metadata used (not full content) for token efficiency
- [ ] **NEEDS TESTING:** AI sees actual data, not empty arrays
- [ ] **NEEDS TESTING:** AI doesn't hallucinate fake records
- [ ] **NEEDS TESTING:** AI uses correct property names (company, not name)

---

## Next Steps

### 1. Debug Data Loading (IMMEDIATE)
- [x] Add console logging to FloatingAIAssistant (data counts)
- [x] Add console logging to assistantConfig (raw data)
- [ ] **User to verify:** Check browser console for data counts
- [ ] **User to verify:** Share console logs showing what data AI receives

### 2. Fix Property Name Mismatches
Once we confirm data is loading, fix the mapping issues:

**Option A: Update AI Tools** (changes tool definitions)
```typescript
// In services/groq/tools.ts
createCrmItemTool: {
    properties: {
        company: { type: 'string' }, // Change from "name"
        checkSize: { type: 'number' }, // Change from "amount" for investors
        dealValue: { type: 'number' }, // For customers
        status: { type: 'string' }, // Change from "stage"
    }
}
```

**Option B: Update Backend Mapping** (changes action handlers)
```typescript
// In action handlers
const createInvestor = (params) => {
    const investorData = {
        company: params.name, // Map name → company
        checkSize: params.amount, // Map amount → checkSize
        status: params.stage, // Map stage → status
    };
    // ... create in database
};
```

**Recommendation:** Option B (backend mapping) is safer - doesn't require retraining AI on new parameter names.

### 3. Test AI Context Per Tab
After data loading is confirmed:
- [ ] Test Dashboard: "What tasks do I have?" → Should list actual tasks
- [ ] Test Investors: "Who are our investor contacts?" → Should list real investor(s)
- [ ] Test Marketing: "What campaigns are active?" → Should list real campaigns
- [ ] Test each tab systematically

### 4. Verify AI Actions
After context is working:
- [ ] Test: "Create a task in Platform" → Verify appears in UI
- [ ] Test: "Add investor Acme Capital" → Verify CRM item created
- [ ] Test: "Update campaign X status to Published" → Verify status changes
- [ ] Test: "Log $5000 revenue for November 10" → Verify financial log created

---

## Reference: Complete DashboardData Interface

```typescript
export interface DashboardData {
    // Tasks (6 categories)
    platformTasks: Task[];
    investorTasks: Task[];
    customerTasks: Task[];
    partnerTasks: Task[];
    marketingTasks: Task[];
    financialTasks: Task[];
    
    // CRM (3 types)
    investors: Investor[];
    customers: Customer[];
    partners: Partner[];
    
    // Marketing
    marketing: MarketingItem[];
    
    // Financials
    financials: FinancialLog[];
    expenses: Expense[];
    
    // Documents
    documents: Document[];
    documentsMetadata: Omit<Document, 'content'>[];
    
    // Settings
    settings: SettingsData;
    gamification: GamificationData;
}
```

**Properties that DO NOT exist:**
- ❌ `data.campaigns` (use `data.marketing`)
- ❌ `data.financialLogs` (use `data.financials`)
- ❌ `data.calendarEvents` (no such property - aggregate from tasks/marketing)
- ❌ `data.contacts` (nested in CRM items: `data.investors[0].contacts`)
- ❌ `data.meetings` (nested in contacts: `data.investors[0].contacts[0].meetings`)

---

**END OF MAPPING DOCUMENT**
