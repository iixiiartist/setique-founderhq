# Comprehensive Application Function Mapping & AI Integration Guide

**Purpose**: Complete mapping of all application functions, database schemas, TypeScript types, and AI tool requirements to ensure perfect data flow and context injection.

**Date**: November 11, 2025  
**Status**: Source of Truth for AI Context Implementation

---

## Table of Contents
1. [Tasks Module](#1-tasks-module)
2. [CRM Module (Investors/Customers/Partners)](#2-crm-module)
3. [Marketing Module](#3-marketing-module)
4. [Financials Module](#4-financials-module)
5. [Documents Module](#5-documents-module)
6. [Settings Module](#6-settings-module)
7. [Notes System (Cross-Module)](#7-notes-system)
8. [Data Context Requirements](#8-data-context-requirements)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Tasks Module

### Database Schema (`tasks` table)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    text TEXT NOT NULL,
    status task_status DEFAULT 'Todo',  -- ENUM: 'Todo', 'InProgress', 'Done'
    priority priority_level DEFAULT 'Medium',  -- ENUM: 'Low', 'Medium', 'High'
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMP,
    category TEXT NOT NULL,  -- Required for organizing
    crm_item_id UUID,
    contact_id UUID,
    assigned_to UUID,
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### TypeScript Interface
```typescript
interface Task {
    id: string;
    text: string;
    status: 'Todo' | 'InProgress' | 'Done';
    priority: 'Low' | 'Medium' | 'High';
    category: 'platformTasks' | 'investorTasks' | 'customerTasks' | 
              'partnerTasks' | 'marketingTasks' | 'financialTasks';
    createdAt: number;
    completedAt?: number;
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM
    notes: Note[];
    crmItemId?: string;
    contactId?: string;
    userId?: string;
    assignedTo?: string;
    assignedToName?: string;
}
```

### DashboardData Properties (Context for AI)
```typescript
data.platformTasks: Task[]      // Tasks for platform development
data.investorTasks: Task[]      // Tasks related to investors
data.customerTasks: Task[]      // Tasks related to customers
data.partnerTasks: Task[]       // Tasks related to partners
data.marketingTasks: Task[]     // Tasks related to marketing
data.financialTasks: Task[]     // Tasks related to financials
```

### Application Actions (What Users Can Do)
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Create** | `createTask()` | category, text, priority, dueDate?, assignedTo?, crmItemId?, contactId?, dueTime? | `{success, message}` |
| **Update** | `updateTask()` | taskId, updates (text?, status?, priority?, dueDate?, dueTime?, category?) | `{success, message}` |
| **Delete** | `deleteTask()` | taskId | `{success, message}` |
| **Add Note** | `addNote()` | collection, itemId, noteText | `{success, message}` |
| **Update Note** | `updateNote()` | collection, itemId, noteTimestamp, newText | `{success, message}` |
| **Delete Note** | `deleteNote()` | collection, itemId, noteTimestamp | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: createTask
{
  name: 'createTask',
  parameters: {
    category: 'platformTasks' | 'investorTasks' | 'customerTasks' | 
              'partnerTasks' | 'marketingTasks' | 'financialTasks',
    text: string,
    priority: 'Low' | 'Medium' | 'High',
    dueDate?: string,  // YYYY-MM-DD
    assignedTo?: string  // User ID (UUID)
  }
}

// Tool: updateTask
{
  name: 'updateTask',
  parameters: {
    taskId: string,
    updates: {
      text?: string,
      status?: 'Todo' | 'InProgress' | 'Done',
      priority?: 'Low' | 'Medium' | 'High',
      dueDate?: string
    }
  }
}

// Tool: deleteItem
{
  name: 'deleteItem',
  parameters: {
    collection: 'platformTasks' | 'investorTasks' | 'customerTasks' | 
                'partnerTasks' | 'marketingTasks' | 'financialTasks',
    itemId: string
  }
}
```

### AI Context Injection Requirements
```typescript
// System prompt must include:
Current Platform Tasks: ${JSON.stringify(data.platformTasks, null, 2)}
Current Investor Tasks: ${JSON.stringify(data.investorTasks, null, 2)}
Current Customer Tasks: ${JSON.stringify(data.customerTasks, null, 2)}
Current Partner Tasks: ${JSON.stringify(data.partnerTasks, null, 2)}
Current Marketing Tasks: ${JSON.stringify(data.marketingTasks, null, 2)}
Current Financial Tasks: ${JSON.stringify(data.financialTasks, null, 2)}
```

**Critical**: Each tab should inject ONLY relevant tasks (e.g., Platform tab only needs `platformTasks`).

---

## 2. CRM Module (Investors/Customers/Partners)

### Database Schema (`crm_items` table)
```sql
CREATE TABLE crm_items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    company TEXT NOT NULL,
    type crm_type NOT NULL,  -- ENUM: 'investor', 'customer', 'partner'
    priority priority_level DEFAULT 'Medium',
    status TEXT NOT NULL,  -- Dynamic: 'Lead', 'Qualified', 'Won', 'Lost', etc.
    next_action TEXT,
    next_action_date DATE,
    next_action_time TIME,
    check_size NUMERIC,      -- For investors only
    deal_value NUMERIC,      -- For customers only
    opportunity TEXT,        -- For partners only
    notes JSONB DEFAULT '[]',
    assigned_to UUID,
    assigned_to_name TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### TypeScript Interfaces
```typescript
interface BaseCrmItem {
    id: string;
    company: string;
    contacts: Contact[];
    priority: 'Low' | 'Medium' | 'High';
    status: string;  // Dynamic based on pipeline
    nextAction?: string;
    nextActionDate?: string; // YYYY-MM-DD
    nextActionTime?: string; // HH:MM
    createdAt: number;
    notes: Note[];
    assignedTo?: string | null;
    assignedToName?: string | null;
}

interface Investor extends BaseCrmItem {
    checkSize: number;  // ⚠️ CRITICAL: This is the property name
}

interface Customer extends BaseCrmItem {
    dealValue: number;  // ⚠️ CRITICAL: This is the property name
}

interface Partner extends BaseCrmItem {
    opportunity: string;  // ⚠️ CRITICAL: This is the property name
}
```

### DashboardData Properties (Context for AI)
```typescript
data.investors: Investor[]     // ⚠️ Use data.investors NOT data.investorItems
data.customers: Customer[]     // ⚠️ Use data.customers NOT data.customerItems
data.partners: Partner[]       // ⚠️ Use data.partners NOT data.partnerItems
```

### Application Actions
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Create CRM Item** | `createCrmItem()` | collection ('investors'/'customers'/'partners'), data (company, status, priority, checkSize/dealValue/opportunity) | `{success, message}` |
| **Update CRM Item** | `updateCrmItem()` | collection, itemId, updates | `{success, message}` |
| **Delete CRM Item** | `deleteItem()` | collection, itemId | `{success, message}` |
| **Create Contact** | `createContact()` | collection, crmItemId, contactData (name, email, title?, phone?, linkedin?) | `{success, message}` |
| **Update Contact** | `updateContact()` | collection, crmItemId, contactId, updates | `{success, message}` |
| **Delete Contact** | `deleteContact()` | collection, crmItemId, contactId | `{success, message}` |
| **Create Meeting** | `createMeeting()` | collection, crmItemId, contactId, meetingData (title, timestamp, attendees, summary) | `{success, message}` |
| **Update Meeting** | `updateMeeting()` | collection, crmItemId, contactId, meetingId, updates | `{success, message}` |
| **Delete Meeting** | `deleteMeeting()` | collection, crmItemId, contactId, meetingId | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: createCrmItem
{
  name: 'createCrmItem',
  parameters: {
    collection: 'investors' | 'customers' | 'partners',
    company: string,
    status: string,
    priority: 'Low' | 'Medium' | 'High',
    nextAction?: string,
    nextActionDate?: string,
    checkSize?: number,      // For investors
    dealValue?: number,      // For customers
    opportunity?: string     // For partners
  }
}

// Tool: updateCrmItem
{
  name: 'updateCrmItem',
  parameters: {
    collection: 'investors' | 'customers' | 'partners',
    itemId: string,
    updates: { company?, status?, priority?, nextAction?, nextActionDate?, etc. }
  }
}

// Tool: createContact
{
  name: 'createContact',
  parameters: {
    collection: 'investors' | 'customers' | 'partners',
    crmItemId: string,
    name: string,
    email: string,
    title?: string,
    phone?: string,
    linkedin?: string
  }
}

// Tool: createMeeting
{
  name: 'createMeeting',
  parameters: {
    collection: 'investors' | 'customers' | 'partners',
    crmItemId: string,
    contactId: string,
    title: string,
    date: string,  // YYYY-MM-DD
    attendees: string,
    summary: string
  }
}
```

### AI Context Injection Requirements
```typescript
// Investors tab system prompt:
Current Investor CRM Context:
Items: ${JSON.stringify(data.investors, null, 2)}
Tasks: ${JSON.stringify(data.investorTasks, null, 2)}

// Customers tab system prompt:
Current Customer CRM Context:
Items: ${JSON.stringify(data.customers, null, 2)}
Tasks: ${JSON.stringify(data.customerTasks, null, 2)}

// Partners tab system prompt:
Current Partner CRM Context:
Items: ${JSON.stringify(data.partners, null, 2)}
Tasks: ${JSON.stringify(data.partnerTasks, null, 2)}
```

**Critical Mapping Issues**:
- ✅ **CORRECT**: `data.investors` (plural, matches DashboardData interface)
- ❌ **WRONG**: `data.investorItems`, `data.investorList`, `data.investorCrm`
- Each CRM type has its own array in DashboardData
- Property names: `checkSize` (not `check_size`), `dealValue` (not `deal_value`), `opportunity` (not `opportunityType`)

---

## 3. Marketing Module

### Database Schema (`marketing_items` table)
```sql
CREATE TABLE marketing_items (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    title TEXT NOT NULL,
    type marketing_type NOT NULL,  -- ENUM: 'Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other'
    status marketing_status DEFAULT 'Planned',  -- ENUM: 'Planned', 'In Progress', 'Completed', 'Published', 'Cancelled'
    due_date DATE,
    due_time TIME,
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### TypeScript Interface
```typescript
interface MarketingItem {
    id: string;
    title: string;  // ⚠️ CRITICAL: Use 'title' NOT 'name'
    type: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other';
    status: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled';
    createdAt: number;
    notes: Note[];
    dueDate?: string; // YYYY-MM-DD
    dueTime?: string; // HH:MM
}
```

### DashboardData Properties (Context for AI)
```typescript
data.marketing: MarketingItem[]      // ⚠️ Use data.marketing NOT data.campaigns or data.marketingItems
data.marketingTasks: Task[]          // Tasks related to marketing
```

### Application Actions
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Create** | `createMarketingItem()` | itemData (title, type?, status?, dueDate?, dueTime?) | `{success, message}` |
| **Update** | `updateMarketingItem()` | itemId, updates (title?, type?, status?, dueDate?, dueTime?) | `{success, message}` |
| **Delete** | `deleteItem()` | collection='marketing', itemId | `{success, message}` |
| **Add Note** | `addNote()` | collection='marketing', itemId, noteText | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: createMarketingItem
{
  name: 'createMarketingItem',
  parameters: {
    title: string,  // ⚠️ CRITICAL: 'title' not 'name'
    type?: 'Blog Post' | 'Newsletter' | 'Social Campaign' | 'Webinar' | 'Other',
    status?: 'Planned' | 'In Progress' | 'Completed' | 'Published' | 'Cancelled',
    dueDate?: string,
    dueTime?: string
  }
}

// Tool: updateMarketingItem
{
  name: 'updateMarketingItem',
  parameters: {
    itemId: string,
    updates: {
      title?: string,
      type?: string,
      status?: string,
      dueDate?: string,
      dueTime?: string
    }
  }
}
```

### AI Context Injection Requirements
```typescript
// Marketing tab system prompt:
Current Marketing Context:
Campaigns: ${JSON.stringify(data.marketing, null, 2)}  // ⚠️ CRITICAL: data.marketing
Tasks: ${JSON.stringify(data.marketingTasks, null, 2)}
```

**Critical Mapping Issues**:
- ✅ **CORRECT**: `data.marketing` (matches DashboardData interface)
- ❌ **WRONG**: `data.campaigns`, `data.marketingItems`, `data.marketingCampaigns`
- ✅ **CORRECT**: Property name is `title` (not `name`)
- MarketingItem uses `title`, not `name` property

---

## 4. Financials Module

### Database Schemas

#### Financial Logs (`financial_logs` table)
```sql
CREATE TABLE financial_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    date DATE NOT NULL,
    mrr NUMERIC NOT NULL DEFAULT 0,
    gmv NUMERIC NOT NULL DEFAULT 0,
    signups INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### Expenses (`expenses` table)
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    date DATE NOT NULL,
    category expense_category NOT NULL,  -- ENUM: 'Software/SaaS', 'Marketing', 'Office', etc.
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    vendor TEXT,
    payment_method payment_method,
    receipt_document_id UUID REFERENCES documents(id),
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### TypeScript Interfaces
```typescript
interface FinancialLog {
    id: string;
    date: string; // YYYY-MM-DD
    mrr: number;
    gmv: number;
    signups: number;
    userId?: string;
    userName?: string;
}

interface Expense {
    id: string;
    date: string; // YYYY-MM-DD
    category: 'Software/SaaS' | 'Marketing' | 'Office' | 'Legal' | 
              'Contractors' | 'Travel' | 'Meals' | 'Equipment' | 
              'Subscriptions' | 'Other';
    amount: number;
    description: string;
    vendor?: string;
    paymentMethod?: 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 
                    'Cash' | 'PayPal' | 'Other';
    notes: Note[];
}
```

### DashboardData Properties (Context for AI)
```typescript
data.financials: FinancialLog[]  // ⚠️ CRITICAL: Use data.financials NOT data.financialLogs
data.expenses: Expense[]         // Expense records
data.financialTasks: Task[]      // Tasks related to financials
```

### Application Actions
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Log Financials** | `logFinancials()` | data (date, mrr, gmv, signups) | `{success, message}` |
| **Create Expense** | `createExpense()` | data (date, category, amount, description, vendor?, paymentMethod?) | `{success, message}` |
| **Update Expense** | `updateExpense()` | expenseId, updates | `{success, message}` |
| **Delete Financial Log** | `deleteItem()` | collection='financials', itemId | `{success, message}` |
| **Delete Expense** | `deleteItem()` | collection='expenses', itemId | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: logFinancials
{
  name: 'logFinancials',
  parameters: {
    date: string,  // YYYY-MM-DD
    mrr: number,
    gmv: number,
    signups: number
  }
}

// Tool: createExpense
{
  name: 'createExpense',
  parameters: {
    date: string,
    category: 'Software/SaaS' | 'Marketing' | 'Office' | ...,
    amount: number,
    description: string,
    vendor?: string,
    paymentMethod?: 'Credit Card' | 'Debit Card' | ...
  }
}

// Tool: updateExpense
{
  name: 'updateExpense',
  parameters: {
    expenseId: string,
    updates: { date?, category?, amount?, description?, vendor?, paymentMethod? }
  }
}
```

### AI Context Injection Requirements
```typescript
// Financials tab system prompt:
Current Financial Context:
Revenue Logs: ${JSON.stringify(data.financials, null, 2)}  // ⚠️ CRITICAL: data.financials
Expenses: ${JSON.stringify(data.expenses, null, 2)}
Tasks: ${JSON.stringify(data.financialTasks, null, 2)}
```

**Critical Mapping Issues**:
- ✅ **CORRECT**: `data.financials` (matches DashboardData interface)
- ❌ **WRONG**: `data.financialLogs`, `data.revenueLogs`, `data.metrics`
- Financial logs and expenses are separate arrays
- No `calendarEvents` property exists in DashboardData

---

## 5. Documents Module

### Database Schema (`documents` table)
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    content TEXT NOT NULL,  -- Base64 encoded
    module TEXT NOT NULL,   -- 'crm', 'tasks', 'marketing', 'financial', 'platform'
    company_id UUID REFERENCES crm_items(id),
    contact_id UUID REFERENCES contacts(id),
    notes JSONB DEFAULT '[]',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### TypeScript Interface
```typescript
interface Document {
    id: string;
    name: string;
    mimeType: string;
    content: string;  // Base64 encoded
    module: 'crm' | 'tasks' | 'marketing' | 'financial' | 'platform';
    companyId?: string;
    contactId?: string;
    notes: Note[];
    createdAt: number;
}
```

### DashboardData Properties (Context for AI)
```typescript
data.documents: Document[]                        // Full documents with content
data.documentsMetadata: Omit<Document, 'content'>[] // Lightweight metadata for AI
```

### Application Actions
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Upload** | `uploadDocument()` | name, mimeType, content (base64), module, companyId?, contactId? | `{success, message}` |
| **Update** | `updateDocument()` | docId, name, mimeType, content | `{success, message}` |
| **Delete** | `deleteDocument()` | docId | `{success, message}` |
| **Get Content** | `getFileContent()` | fileId | `{success, message, content?}` |
| **Add Note** | `addNote()` | collection='documents', itemId, noteText | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: uploadDocument
{
  name: 'uploadDocument',
  parameters: {
    name: string,
    mimeType: string,
    content: string,  // Base64
    module: 'crm' | 'tasks' | 'marketing' | 'financial' | 'platform'
  }
}

// Tool: updateDocument
{
  name: 'updateDocument',
  parameters: {
    docId: string,
    name: string,
    mimeType: string,
    content: string
  }
}

// Tool: getFileContent
{
  name: 'getFileContent',
  parameters: {
    fileId: string
  }
}
```

### AI Context Injection Requirements
```typescript
// Extract metadata (without full content to save tokens)
const documentsMetadata = data.documents.map(d => ({
    id: d.id,
    name: d.name,
    module: d.module,
    mimeType: d.mimeType  // Optional: helps AI know file types
}));

// System prompt:
Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
```

**Token Optimization**: Never inject full `content` field into system prompts. Use `documentsMetadata` instead. AI can call `getFileContent()` when it needs actual content.

---

## 6. Settings Module

### Database Schema (`business_profile` table)
```sql
CREATE TABLE business_profile (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    workspace_id UUID REFERENCES workspaces(id),
    company_name TEXT,
    industry TEXT,
    target_market TEXT,
    goals TEXT,
    product_description TEXT,
    team_size TEXT,
    funding_stage TEXT,
    website_url TEXT,
    founded_date TEXT,
    location TEXT,
    investor_statuses JSONB DEFAULT '[]',
    customer_statuses JSONB DEFAULT '[]',
    partner_statuses JSONB DEFAULT '[]',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### TypeScript Interface
```typescript
interface SettingsData {
    companyName: string;
    industry: string;
    targetMarket: string;
    goals: string;
    productDescription: string;
    teamSize: string;
    fundingStage: string;
    websiteUrl: string;
    foundedDate: string;
    location: string;
    investorStatuses: string[];
    customerStatuses: string[];
    partnerStatuses: string[];
}
```

### DashboardData Properties (Context for AI)
```typescript
data.settings: SettingsData  // Business profile settings
```

### Application Actions
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Update Settings** | `updateSettings()` | updates (partial SettingsData) | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: updateSettings
{
  name: 'updateSettings',
  parameters: {
    settings: {
      companyName?: string,
      industry?: string,
      goals?: string,
      // ... other fields
    }
  }
}
```

### AI Context Injection Requirements
```typescript
// Format business context from settings:
const businessContext = `
**Company Profile:**
- Company: ${data.settings.companyName || 'Not set'}
- Industry: ${data.settings.industry || 'Not specified'}
- Target Market: ${data.settings.targetMarket || 'Not specified'}
- Funding Stage: ${data.settings.fundingStage || 'Not specified'}
- Goals: ${data.settings.goals || 'Not set'}
`;

// Pass to system prompt:
${businessContext}
```

---

## 7. Notes System (Cross-Module)

### Storage Format (JSONB in all tables)
```json
[
  {
    "text": "Note content",
    "timestamp": 1699564800000,
    "userId": "uuid-string",
    "userName": "John Doe"
  }
]
```

### TypeScript Interface
```typescript
interface Note {
    text: string;
    timestamp: number;
    userId?: string;
    userName?: string;
}
```

### Supported Collections
- **CRM**: `investors`, `customers`, `partners`
- **Tasks**: `platformTasks`, `investorTasks`, `customerTasks`, `partnerTasks`, `marketingTasks`, `financialTasks`
- **Other**: `marketing`, `contacts`, `documents`, `expenses`

### Application Actions
| Action | Method | Parameters | Returns |
|--------|--------|------------|---------|
| **Add Note** | `addNote()` | collection, itemId, noteText, crmItemId? (for contacts) | `{success, message}` |
| **Update Note** | `updateNote()` | collection, itemId, noteTimestamp, newText, crmItemId? | `{success, message}` |
| **Delete Note** | `deleteNote()` | collection, itemId, noteTimestamp, crmItemId? | `{success, message}` |

### AI Tools (Groq Function Calling)
```typescript
// Tool: addNote
{
  name: 'addNote',
  parameters: {
    collection: 'investors' | 'customers' | 'partners' | 'platformTasks' | 
                'investorTasks' | 'customerTasks' | 'partnerTasks' | 
                'marketingTasks' | 'financialTasks' | 'marketing' | 
                'contacts' | 'documents',
    itemId: string,
    noteText: string,
    crmItemId?: string  // Required if collection is 'contacts'
  }
}

// Tool: updateNote
{
  name: 'updateNote',
  parameters: {
    collection: string,
    itemId: string,
    noteTimestamp: number,
    newText: string,
    crmItemId?: string
  }
}

// Tool: deleteNote
{
  name: 'deleteNote',
  parameters: {
    collection: string,
    itemId: string,
    noteTimestamp: number,
    crmItemId?: string
  }
}
```

---

## 8. Data Context Requirements

### Complete DashboardData Interface
```typescript
interface DashboardData {
    platformTasks: Task[];
    investors: Investor[];
    investorTasks: Task[];
    customers: Customer[];
    customerTasks: Task[];
    partners: Partner[];
    partnerTasks: Task[];
    marketing: MarketingItem[];
    marketingTasks: Task[];
    financials: FinancialLog[];
    expenses: Expense[];
    financialTasks: Task[];
    documents: Document[];
    documentsMetadata: Omit<Document, 'content'>[];
    settings: SettingsData;
    gamification: GamificationData;
}
```

### Data Flow Architecture
```
DashboardApp (has data: DashboardData from useLazyDataPersistence)
    ↓
FloatingAIAssistant (receives data prop)
    ↓
AssistantModal (receives data prop)
    ↓
assistantConfig.ts getSystemPrompt({ ..., data })
    ↓
System prompt with JSON.stringify(data.investors, etc.)
    ↓
ModuleAssistant (receives complete context)
    ↓
AI responses use actual data (no hallucination)
```

### Context Injection by Tab

#### Platform Tab
```typescript
const systemPrompt = `
Current Platform Tasks Context:
${JSON.stringify(data.platformTasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
```

#### Investors Tab
```typescript
const systemPrompt = `
Current Investor CRM Context:
Items: ${JSON.stringify(data.investors, null, 2)}
Tasks: ${JSON.stringify(data.investorTasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
```

#### Customers Tab
```typescript
const systemPrompt = `
Current Customer CRM Context:
Items: ${JSON.stringify(data.customers, null, 2)}
Tasks: ${JSON.stringify(data.customerTasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
```

#### Partners Tab
```typescript
const systemPrompt = `
Current Partner CRM Context:
Items: ${JSON.stringify(data.partners, null, 2)}
Tasks: ${JSON.stringify(data.partnerTasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
```

#### Marketing Tab
```typescript
const systemPrompt = `
Current Marketing Context:
Campaigns: ${JSON.stringify(data.marketing, null, 2)}
Tasks: ${JSON.stringify(data.marketingTasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
```

#### Financials Tab
```typescript
const systemPrompt = `
Current Financial Context:
Revenue Logs: ${JSON.stringify(data.financials, null, 2)}
Expenses: ${JSON.stringify(data.expenses, null, 2)}
Tasks: ${JSON.stringify(data.financialTasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;
```

#### Calendar Tab
```typescript
// Aggregate all tasks
const allTasks = [
    ...data.platformTasks,
    ...data.investorTasks,
    ...data.customerTasks,
    ...data.partnerTasks,
    ...data.marketingTasks,
    ...data.financialTasks
];

// Filter overdue tasks
const today = new Date().toISOString().split('T')[0];
const overdueTasks = allTasks.filter(t => 
    t.dueDate && t.dueDate < today && t.status !== 'Done'
);

const systemPrompt = `
Current Calendar Context:
Overdue Tasks: ${JSON.stringify(overdueTasks, null, 2)}
Recent Tasks: ${JSON.stringify(allTasks.slice(0, 20), null, 2)}
`;
```

#### Dashboard Tab
```typescript
// Aggregate recent tasks
const recentTasks = [
    ...data.platformTasks,
    ...data.investorTasks,
    ...data.customerTasks,
    ...data.partnerTasks,
    ...data.marketingTasks,
    ...data.financialTasks
].slice(0, 10);

const systemPrompt = `
Dashboard Overview:
- Investors: ${data.investors.length}
- Customers: ${data.customers.length}
- Partners: ${data.partners.length}
- Marketing Campaigns: ${data.marketing.length}

Recent Tasks:
${JSON.stringify(recentTasks, null, 2)}
`;
```

---

## 9. Implementation Checklist

### ✅ Completed
- [x] Props threading: DashboardApp → FloatingAIAssistant → AssistantModal
- [x] assistantConfig.ts accepts `data: DashboardData` parameter
- [x] All 11 tab configs rebuilt with data injection
- [x] Anti-hallucination rules added to all configs
- [x] Debug logging added to FloatingAIAssistant and assistantConfig

### ⚠️ Current Issues (To Fix)

#### Issue 1: Property Name Mismatches
**Symptom**: AI says "no investor contacts" when investors exist

**Root Cause**: System prompts may be accessing wrong property names

**Fix Required**:
```typescript
// ❌ WRONG - These properties DON'T EXIST:
data.investorItems
data.campaigns
data.financialLogs
data.calendarEvents

// ✅ CORRECT - Use these exact names:
data.investors
data.marketing
data.financials
// (No calendarEvents property exists)
```

**Action**: Review assistantConfig.ts lines 56-370 and verify ALL property names match DashboardData interface exactly.

#### Issue 2: Data Loading Timing
**Symptom**: Arrays are empty even though data shows in UI

**Root Cause**: AI initializes before useLazyDataPersistence loads data

**Fix Required**:
1. Check if `data` is empty/default state when AI opens
2. Add loading indicator or lazy initialization
3. Force re-render of system prompt when data changes

**Action**: Add `React.useEffect(() => {...}, [data])` in AssistantModal to regenerate system prompt when data updates.

#### Issue 3: Missing Calendar Events
**Symptom**: No calendar event creation tool

**Status**: Calendar uses aggregated tasks, not separate events table. Meeting creation exists via `createMeeting()` for CRM contacts.

**Action**: Document that calendar events are derived from:
- Tasks (with due dates)
- Marketing items (with due dates)  
- CRM next actions (with next action dates)
- Contact meetings (via createMeeting tool)

### 🔧 Immediate Fixes Needed

1. **Verify Property Names in assistantConfig.ts**:
   ```bash
   # Search for potential mismatches
   grep -n "data\." components/assistant/assistantConfig.ts
   ```
   
   Check every occurrence matches DashboardData interface:
   - `data.investors` (NOT investorItems)
   - `data.marketing` (NOT campaigns)
   - `data.financials` (NOT financialLogs)
   - No `data.calendarEvents` references

2. **Add Data Loading Check**:
   ```typescript
   // In AssistantModal.tsx
   React.useEffect(() => {
       console.log('[AssistantModal] Data updated, regenerating system prompt');
       // System prompt will auto-regenerate via getSystemPrompt call
   }, [data]);
   ```

3. **Test Each Tab Systematically**:
   - Dashboard: "What tasks do I have?"
   - Platform: "List my platform tasks"
   - Investors: "Who are our investor contacts?" (Must show actual data)
   - Customers: "List our customers"
   - Partners: "Show partner companies"
   - Marketing: "What campaigns are active?" (Must show actual data)
   - Financials: "What's our latest MRR?"
   - Calendar: "What's overdue?"

4. **Console Debug Output**:
   ```typescript
   // Current debug logs to monitor:
   [FloatingAIAssistant] DATA CHECK: { investors: X, marketing: Y, ... }
   [assistantConfig - Investors] Data received: { investorsCount: X, ... }
   [assistantConfig - Marketing] Data received: { marketingCount: Y, ... }
   ```

### 📊 Success Criteria

AI should:
- ✅ Show actual investor companies when asked "Who are our investor contacts?"
- ✅ Show actual marketing campaigns when asked "What campaigns are active?"
- ✅ Never hallucinate fake data (Emily Chen, Raj Patel, etc.)
- ✅ Say "You currently have 0 investors" if truly empty (not make up data)
- ✅ Use ONLY the data provided in system prompt context
- ✅ Create/update/delete items successfully with AI tools
- ✅ Persist data in Supabase after AI actions

---

## Quick Reference: Property Name Mapping

| UI Label | Database Column | TypeScript Property | DashboardData Key | AI Context Label |
|----------|----------------|---------------------|-------------------|------------------|
| Company | `company` | `company` | `investors[].company` | Items |
| Check Size | `check_size` | `checkSize` | `investors[].checkSize` | Items |
| Deal Value | `deal_value` | `dealValue` | `customers[].dealValue` | Items |
| Opportunity | `opportunity` | `opportunity` | `partners[].opportunity` | Items |
| Campaign Title | `title` | `title` | `marketing[].title` | Campaigns |
| Revenue Log | `financial_logs` table | `FinancialLog` | `data.financials` | Revenue Logs |
| Expenses | `expenses` table | `Expense` | `data.expenses` | Expenses |
| Documents | `documents` table | `Document` | `data.documents` | File Library |
| Doc Metadata | N/A | `Omit<Document, 'content'>` | `data.documentsMetadata` | File Library |

---

**End of Document**

This mapping serves as the single source of truth for all AI context implementation. Any discrepancies between this document and the code should be resolved in favor of this document.
