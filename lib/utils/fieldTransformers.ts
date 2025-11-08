/**
 * Centralized field transformers for database ↔ application model conversions
 * 
 * This module provides bidirectional transformers to convert between:
 * - snake_case (database column names)
 * - camelCase (TypeScript application models)
 * 
 * Benefits:
 * - Single source of truth for field mappings
 * - Type-safe transformations with strict TypeScript
 * - Eliminates inline transformation logic scattered across codebase
 * - Easy to maintain and test
 */

import type {
  Task,
  MarketingItem,
  Contact,
  BaseCrmItem,
  Note,
  Meeting,
  FinancialLog,
  Document,
  TaskCollectionName,
  Expense,
} from '../../types';

// ============================================================================
// Database Types (snake_case)
// ============================================================================

interface DbTask {
  id: string;
  text: string;
  status: string;
  priority: string;
  created_at: string;
  completed_at?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  notes: any[];
  crm_item_id?: string | null;
  contact_id?: string | null;
  user_id?: string;
  assigned_to?: string | null;
  assigned_to_profile?: { full_name?: string } | null;
  category?: string | null;
}

interface DbMarketingItem {
  id: string;
  title: string;
  item_type: string;
  status: string;
  created_at: string;
  notes: any[];
  due_date?: string | null;
  due_time?: string | null;
}

interface DbCrmItem {
  id: string;
  company: string;
  priority: string;
  status: string;
  next_action?: string | null;
  next_action_date?: string | null;
  next_action_time?: string | null;
  created_at: string;
  notes: any[];
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  type: 'investor' | 'customer' | 'partner';
  check_size?: number | null;
  deal_value?: number | null;
  opportunity?: string | null;
}

interface DbContact {
  id: string;
  crm_item_id: string;
  name: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  linkedin: string;
  notes: any[];
  meetings: any[];
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
}

interface DbFinancialLog {
  id: string;
  date: string;
  mrr: number;
  gmv: number;
  signups: number;
}

interface DbDocument {
  id: string;
  name: string;
  mime_type: string;
  content: string | null;
  module: string;
  company_id?: string | null;
  contact_id?: string | null;
  notes?: Note[] | null;
  created_at: string;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
}

interface DbExpense {
  id: string;
  date: string;
  category: string;
  amount: number | string;
  description: string;
  vendor?: string | null;
  payment_method?: string | null;
  receipt_document_id?: string | null;
  notes?: Note[] | null;
}

// ============================================================================
// Task Category Mapping
// ============================================================================

const TASK_CATEGORY_MAP: Record<string, TaskCollectionName> = {
  platformTasks: 'platformTasks',
  investorTasks: 'investorTasks',
  customerTasks: 'customerTasks',
  partnerTasks: 'partnerTasks',
  marketingTasks: 'marketingTasks',
  financialTasks: 'financialTasks',
  // Legacy/alternate spellings mapped to current categories
  platform: 'platformTasks',
  investor: 'investorTasks',
  customer: 'customerTasks',
  partner: 'partnerTasks',
  marketing: 'marketingTasks',
  financial: 'financialTasks',
};

const DEFAULT_TASK_CATEGORY: TaskCollectionName = 'platformTasks';

/**
 * Normalize task category with fallback to default
 * Handles legacy category names and null/undefined values
 */
function normalizeTaskCategory(category?: string | null): TaskCollectionName {
  if (!category) {
    return DEFAULT_TASK_CATEGORY;
  }

  const normalized = TASK_CATEGORY_MAP[category];
  return normalized ?? DEFAULT_TASK_CATEGORY;
}

// ============================================================================
// Database → Application (Read Transformers)
// ============================================================================

/**
 * Transform database task record to application Task model
 */
export function dbToTask(dbTask: DbTask): Task {
  return {
    id: dbTask.id,
    text: dbTask.text,
    status: dbTask.status as Task['status'],
    priority: dbTask.priority as Task['priority'],
    category: normalizeTaskCategory(dbTask.category),
    createdAt: new Date(dbTask.created_at).getTime(),
    completedAt: dbTask.completed_at ? new Date(dbTask.completed_at).getTime() : undefined,
    dueDate: dbTask.due_date || undefined,
    dueTime: dbTask.due_time || undefined,
    notes: dbTask.notes || [],
    crmItemId: dbTask.crm_item_id || undefined,
    contactId: dbTask.contact_id || undefined,
    userId: dbTask.user_id,
    assignedTo: dbTask.assigned_to || undefined,
    assignedToName: dbTask.assigned_to_profile?.full_name || undefined,
  };
}

/**
 * Transform database marketing item record to application MarketingItem model
 */
export function dbToMarketingItem(dbItem: DbMarketingItem): MarketingItem {
  return {
    id: dbItem.id,
    title: dbItem.title,
    type: dbItem.item_type as MarketingItem['type'],
    status: dbItem.status as MarketingItem['status'],
    createdAt: new Date(dbItem.created_at).getTime(),
    notes: dbItem.notes || [],
    dueDate: dbItem.due_date || undefined,
    dueTime: dbItem.due_time || undefined,
  };
}

/**
 * Transform database CRM item record to application BaseCrmItem model
 */
export function dbToCrmItem(dbItem: DbCrmItem): BaseCrmItem {
  return {
    id: dbItem.id,
    company: dbItem.company,
    contacts: [], // Contacts are loaded separately and merged
    priority: dbItem.priority as BaseCrmItem['priority'],
    status: dbItem.status,
    nextAction: dbItem.next_action || undefined,
    nextActionDate: dbItem.next_action_date || undefined,
    nextActionTime: dbItem.next_action_time || undefined,
    createdAt: new Date(dbItem.created_at).getTime(),
    notes: dbItem.notes || [],
    assignedTo: dbItem.assigned_to || undefined,
    assignedToName: dbItem.assigned_to_name || undefined,
  };
}

/**
 * Transform database contact record to application Contact model
 */
export function dbToContact(dbContact: DbContact): Contact {
  return {
    id: dbContact.id,
    crmItemId: dbContact.crm_item_id,
    name: dbContact.name,
    email: dbContact.email,
    phone: dbContact.phone || undefined,
    title: dbContact.title || undefined,
    linkedin: dbContact.linkedin,
    notes: dbContact.notes || [],
    meetings: dbContact.meetings || [],
    assignedTo: dbContact.assigned_to || undefined,
    assignedToName: dbContact.assigned_to_name || undefined,
    createdByName: dbContact.created_by_name || undefined,
  };
}

/**
 * Transform database financial log record to application FinancialLog model
 */
export function dbToFinancialLog(dbLog: DbFinancialLog): FinancialLog {
  return {
    id: dbLog.id,
    date: dbLog.date,
    mrr: dbLog.mrr,
    gmv: dbLog.gmv,
    signups: dbLog.signups,
  };
}

/**
 * Transform database document record to application Document model
 */
export function dbToDocument(dbDocument: DbDocument): Document {
  const timestampSource = dbDocument.uploaded_at || dbDocument.created_at;

  return {
    id: dbDocument.id,
    name: dbDocument.name,
    mimeType: dbDocument.mime_type,
    content: dbDocument.content || '',
    uploadedAt: timestampSource ? new Date(timestampSource).getTime() : Date.now(),
    module: dbDocument.module as Document['module'],
    companyId: dbDocument.company_id || undefined,
    contactId: dbDocument.contact_id || undefined,
    uploadedBy: dbDocument.uploaded_by || undefined,
    uploadedByName: dbDocument.uploaded_by_name || undefined,
    notes: (dbDocument.notes as Note[] | undefined) || [],
  };
}

/**
 * Transform database expense record to application Expense model
 */
export function dbToExpense(dbExpense: DbExpense): Expense {
  return {
    id: dbExpense.id,
    date: dbExpense.date,
    category: dbExpense.category as Expense['category'],
    amount: Number(dbExpense.amount),
    description: dbExpense.description,
    vendor: dbExpense.vendor || undefined,
    paymentMethod: (dbExpense.payment_method as Expense['paymentMethod']) || undefined,
    receiptDocumentId: dbExpense.receipt_document_id || undefined,
    notes: (dbExpense.notes as Note[] | undefined) || [],
  };
}

// ============================================================================
// Application → Database (Write Transformers)
// ============================================================================

/**
 * Transform application Task model to database insert/update object
 */
export function taskToDb(task: Partial<Task>): Record<string, any> {
  const dbObject: Record<string, any> = {};

  if (task.text !== undefined) dbObject.text = task.text;
  if (task.status !== undefined) dbObject.status = task.status;
  if (task.priority !== undefined) dbObject.priority = task.priority;
  if (task.category !== undefined) dbObject.category = task.category;
  if (task.completedAt !== undefined) {
    dbObject.completed_at = task.completedAt ? new Date(task.completedAt).toISOString() : null;
  }
  if (task.dueDate !== undefined) dbObject.due_date = task.dueDate || null;
  if (task.dueTime !== undefined) dbObject.due_time = task.dueTime || null;
  if (task.notes !== undefined) dbObject.notes = task.notes;
  if (task.crmItemId !== undefined) dbObject.crm_item_id = task.crmItemId || null;
  if (task.contactId !== undefined) dbObject.contact_id = task.contactId || null;
  if (task.assignedTo !== undefined) dbObject.assigned_to = task.assignedTo || null;

  return dbObject;
}

/**
 * Transform application MarketingItem model to database insert/update object
 */
export function marketingItemToDb(item: Partial<MarketingItem>): Record<string, any> {
  const dbObject: Record<string, any> = {};

  if (item.title !== undefined) dbObject.title = item.title;
  if (item.type !== undefined) dbObject.item_type = item.type;
  if (item.status !== undefined) dbObject.status = item.status;
  if (item.notes !== undefined) dbObject.notes = item.notes;
  if (item.dueDate !== undefined) dbObject.due_date = item.dueDate || null;
  if (item.dueTime !== undefined) dbObject.due_time = item.dueTime || null;

  return dbObject;
}

/**
 * Transform application CRM item model to database insert/update object
 */
export function crmItemToDb(item: Partial<BaseCrmItem>): Record<string, any> {
  const dbObject: Record<string, any> = {};

  if (item.company !== undefined) dbObject.company = item.company;
  if (item.priority !== undefined) dbObject.priority = item.priority;
  if (item.status !== undefined) dbObject.status = item.status;
  if ('nextAction' in item) dbObject.next_action = item.nextAction || null;
  if ('nextActionDate' in item) dbObject.next_action_date = item.nextActionDate || null;
  if ('nextActionTime' in item) dbObject.next_action_time = item.nextActionTime || null;
  if (item.notes !== undefined) dbObject.notes = item.notes;
  if (item.assignedTo !== undefined) dbObject.assigned_to = item.assignedTo || null;
  if (item.assignedToName !== undefined) dbObject.assigned_to_name = item.assignedToName || null;

  return dbObject;
}

/**
 * Transform application Contact model to database insert/update object
 */
export function contactToDb(contact: Partial<Contact>): Record<string, any> {
  const dbObject: Record<string, any> = {};

  if (contact.crmItemId !== undefined) dbObject.crm_item_id = contact.crmItemId;
  if (contact.name !== undefined) dbObject.name = contact.name;
  if (contact.email !== undefined) dbObject.email = contact.email;
  if (contact.phone !== undefined) dbObject.phone = contact.phone || null;
  if (contact.title !== undefined) dbObject.title = contact.title || null;
  if (contact.linkedin !== undefined) dbObject.linkedin = contact.linkedin;
  if (contact.notes !== undefined) dbObject.notes = contact.notes;
  if (contact.meetings !== undefined) dbObject.meetings = contact.meetings;
  if (contact.assignedTo !== undefined) dbObject.assigned_to = contact.assignedTo || null;
  if (contact.assignedToName !== undefined) dbObject.assigned_to_name = contact.assignedToName || null;

  return dbObject;
}

// ============================================================================
// Batch Transformers
// ============================================================================

/**
 * Transform array of database task records to application Task models
 */
export function dbToTasks(dbTasks: DbTask[]): Task[] {
  return dbTasks.map(dbToTask);
}

/**
 * Transform array of database marketing item records to application MarketingItem models
 */
export function dbToMarketingItems(dbItems: DbMarketingItem[]): MarketingItem[] {
  return dbItems.map(dbToMarketingItem);
}

/**
 * Transform array of database CRM item records to application BaseCrmItem models
 */
export function dbToCrmItems(dbItems: DbCrmItem[]): BaseCrmItem[] {
  return dbItems.map(dbToCrmItem);
}

/**
 * Transform array of database contact records to application Contact models
 */
export function dbToContacts(dbContacts: DbContact[]): Contact[] {
  return dbContacts.map(dbToContact);
}

/**
 * Transform array of database financial log records to application FinancialLog models
 */
export function dbToFinancialLogs(dbLogs: DbFinancialLog[]): FinancialLog[] {
  return dbLogs.map(dbToFinancialLog);
}

/**
 * Transform array of database expense records to application Expense models
 */
export function dbToExpenses(dbExpenses: DbExpense[]): Expense[] {
  return dbExpenses.map(dbToExpense);
}

/**
 * Transform array of database document records to application Document models
 */
export function dbToDocuments(dbDocuments: DbDocument[]): Document[] {
  return dbDocuments.map(dbToDocument);
}
