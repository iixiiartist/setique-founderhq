import { DatabaseService } from './database'
import { logActivity } from './activityService'
import { 
  Task, AnyCrmItem, Contact, Meeting, MarketingItem, 
  FinancialLog, Document, SettingsData, Deal, ProductService,
  TaskCollectionName, CrmCollectionName, Priority, TaskStatus,
  CampaignAttribution, MarketingAnalytics
} from '../../types'
import { taskToDb, marketingItemToDb, crmItemToDb, contactToDb } from '../utils/fieldTransformers'
import * as Y from 'yjs'

type BinaryContent = string | Uint8Array | ArrayBuffer

const isBinaryContent = (content: BinaryContent): content is Uint8Array | ArrayBuffer =>
  typeof content !== 'string'

const toUint8Array = (input: Uint8Array | ArrayBuffer): Uint8Array =>
  input instanceof Uint8Array ? input : new Uint8Array(input)

const encodeToBase64 = (bytes: Uint8Array): string => {
  const bufferCtor = (globalThis as any)?.Buffer
  if (bufferCtor?.from) {
    return bufferCtor.from(bytes).toString('base64')
  }

  if (typeof btoa === 'function') {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
  }

  throw new Error('Base64 encoding is not supported in this environment')
}

const normalizeDocumentContent = (content: BinaryContent) => {
  if (!isBinaryContent(content)) {
    return { value: content, encoding: 'utf-8' as const }
  }

  const value = encodeToBase64(toUint8Array(content))
  return { value, encoding: 'base64' as const }
}

interface SaveDocumentSnapshotOptions {
  docId: string
  workspaceId: string
  userId?: string
  yDoc?: Y.Doc
  snapshot?: Uint8Array | ArrayBuffer
  binaryBlob?: Uint8Array | ArrayBuffer
  meta?: Record<string, unknown>
  maxRetries?: number
}

// Helper to convert task category name to database format
const categoryToDbFormat = (category: TaskCollectionName): string => {
  return category
}

// Helper to convert CRM collection name to database type
const collectionToType = (collection: CrmCollectionName): 'investor' | 'customer' | 'partner' => {
  const mapping: Record<CrmCollectionName, 'investor' | 'customer' | 'partner'> = {
    'investors': 'investor',
    'customers': 'customer',
    'partners': 'partner'
  }
  return mapping[collection]
}

export class DataPersistenceAdapter {
  // Task operations
  static async createTask(
    userId: string,
    category: TaskCollectionName,
    text: string,
    priority: Priority,
    crmItemId?: string,
    contactId?: string,
    dueDate?: string,
    workspaceId: string = '',
    assignedTo?: string,
    dueTime?: string,
    subtasks?: any[]
  ) {
    if (!workspaceId) {
      throw new Error('workspaceId is required to create a task');
    }
    
    console.log('[DataPersistenceAdapter] Creating task with assignedTo:', assignedTo);
    console.log('[DataPersistenceAdapter] Creating task with subtasks:', subtasks);
    console.log('[DataPersistenceAdapter] workspaceId:', workspaceId);
    console.log('[DataPersistenceAdapter] category input:', category);
    console.log('[DataPersistenceAdapter] category after conversion:', categoryToDbFormat(category));
    
    // Use centralized transformer for type-safe conversion
    const taskData = {
      ...taskToDb({
        text,
        status: 'Todo' as TaskStatus,
        priority,
        dueDate,
        dueTime,
        crmItemId,
        contactId,
        notes: [],
        assignedTo,
        subtasks
      }),
      category: categoryToDbFormat(category),
    } as any; // Type assertion needed due to Record<string, any> return type

    console.log('[DataPersistenceAdapter] Task data being saved:', JSON.stringify(taskData, null, 2));

    const { data, error } = await DatabaseService.createTask(userId, taskData, workspaceId)
    
    if (error) {
      console.error('[DataPersistenceAdapter] Error creating task:', error);
      throw error;
    }
    
    // Log activity if task creation was successful
    if (data && workspaceId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'task_created',
        entityType: 'task',
        entityId: data.id,
        metadata: {
          taskName: text,
          category,
          priority,
        },
      });
    }
    
    return { data, error }
  }

  static async updateTask(taskId: string, updates: Partial<Task>, userId?: string, workspaceId?: string) {
    console.log('[DataPersistenceAdapter] updateTask called with:', { taskId, updates });
    console.log('[DataPersistenceAdapter] Subtasks being updated:', updates.subtasks);
    
    // Store original data for activity logging
    const { data: originalTask } = await DatabaseService.getTaskById(taskId);
    
    // Use centralized transformer for type-safe conversion
    const dbUpdates = taskToDb(updates);

    console.log('[DataPersistenceAdapter] Transformed db updates:', dbUpdates);
    console.log('[DataPersistenceAdapter] Subtasks in dbUpdates:', dbUpdates.subtasks);

    const { data, error } = await DatabaseService.updateTask(taskId, dbUpdates)
    
    if (error) {
      console.error('[DataPersistenceAdapter] updateTask error:', error);
      return { data, error };
    }
    
    // Log activity if update was successful and we have workspace context
    if (data && userId && workspaceId) {
      // Log task completion
      if (updates.status === 'Done' && originalTask?.status !== 'Done') {
        await logActivity({
          workspaceId,
          userId,
          actionType: 'task_completed',
          entityType: 'task',
          entityId: taskId,
          metadata: {
            taskName: data.text || originalTask?.text || 'Untitled',
          },
        });
      }
      
      // Log task assignment
      if (updates.assignedTo !== undefined && updates.assignedTo !== originalTask?.assigned_to) {
        await logActivity({
          workspaceId,
          userId,
          actionType: 'task_updated',
          entityType: 'task',
          entityId: taskId,
          metadata: {
            taskName: data.text || originalTask?.text || 'Untitled',
            assigneeName: updates.assignedToName || 'someone',
            updateType: 'assigned', // Additional metadata to distinguish assignment updates
          },
        });
      }
      
      // Log general task update (if not completion or assignment)
      if (updates.status !== 'Done' && updates.assignedTo === undefined) {
        await logActivity({
          workspaceId,
          userId,
          actionType: 'task_updated',
          entityType: 'task',
          entityId: taskId,
          metadata: {
            taskName: data.text || originalTask?.text || 'Untitled',
          },
        });
      }
    }
    
    return { data, error }
  }

  static async deleteTask(taskId: string) {
    const { error } = await DatabaseService.deleteTask(taskId)
    return { error }
  }

  static async addTaskNote(taskId: string, noteText: string, userId?: string, userName?: string) {
    // First get the current task to get existing notes
    const { data: task } = await DatabaseService.getTaskById(taskId);
    if (!task) {
      return { data: null, error: new Error('Task not found') };
    }
    
    const note = {
      text: noteText,
      timestamp: Date.now(),
      userId: userId,
      userName: userName
    };
    
    const existingNotes = Array.isArray(task.notes) ? task.notes : [];
    const { data, error } = await DatabaseService.updateTask(taskId, {
      notes: [...existingNotes, note]
    });
    return { data, error };
  }

  static async addCrmNote(crmItemId: string, noteText: string, userId?: string, userName?: string, workspaceId?: string) {
    const { data: item } = await DatabaseService.getCrmItemById(crmItemId, workspaceId!);
    if (!item) {
      return { data: null, error: new Error('CRM item not found') };
    }
    
    const note = {
      text: noteText,
      timestamp: Date.now(),
      userId: userId,
      userName: userName
    };
    
    const existingNotes = Array.isArray(item.notes) ? item.notes : [];
    const { data, error } = await DatabaseService.updateCrmItem(crmItemId, {
      notes: [...existingNotes, note]
    });
    return { data, error };
  }

  static async addContactNote(contactId: string, noteText: string, userId?: string, userName?: string) {
    const { data: contact } = await DatabaseService.getContactById(contactId);
    if (!contact) {
      return { data: null, error: new Error('Contact not found') };
    }
    
    const note = {
      text: noteText,
      timestamp: Date.now(),
      userId: userId,
      userName: userName
    };
    
    const existingNotes = Array.isArray(contact.notes) ? contact.notes : [];
    const { data, error } = await DatabaseService.updateContact(contactId, {
      notes: [...existingNotes, note]
    });
    return { data, error };
  }

  static async addMarketingNote(itemId: string, noteText: string, userId?: string, userName?: string) {
    const { data: item } = await DatabaseService.getMarketingItemById(itemId);
    if (!item) {
      return { data: null, error: new Error('Marketing item not found') };
    }
    
    const note = {
      text: noteText,
      timestamp: Date.now(),
      userId: userId,
      userName: userName
    };
    
    const existingNotes = Array.isArray(item.notes) ? item.notes : [];
    const { data, error } = await DatabaseService.updateMarketingItem(itemId, {
      notes: [...existingNotes, note]
    });
    return { data, error };
  }

  static async addDocumentNote(docId: string, noteText: string, userId?: string, userName?: string) {
    const { data: doc } = await DatabaseService.getDocumentById(docId);
    if (!doc) {
      return { data: null, error: new Error('Document not found') };
    }
    
    const note = {
      text: noteText,
      timestamp: Date.now(),
      userId: userId,
      userName: userName
    };
    
    const existingNotes = Array.isArray(doc.notes) ? doc.notes : [];
    const { data, error } = await DatabaseService.updateDocument(docId, {
      notes: [...existingNotes, note]
    });
    return { data, error };
  }

  // CRM Item operations
  static async createCrmItem(
    userId: string,
    workspaceId: string,
    collection: CrmCollectionName,
    itemData: {
      company: string
      priority: Priority
      status: string
      assignedTo?: string
      assignedToName?: string
      nextAction?: string
      nextActionDate?: string
      nextActionTime?: string
      checkSize?: number
      dealValue?: number
      opportunity?: string
      website?: string
      industry?: string
      description?: string
      stage?: string // Investment stage for investors
      dealStage?: string // Deal stage for customers
      partnerType?: string // Partner type for partners
    }
  ) {
    const crmData: any = {
      // Don't include id - let database generate it
      company: itemData.company,
      type: collectionToType(collection),
      priority: itemData.priority || 'Medium',
      status: itemData.status || 'Active',
      assigned_to: itemData.assignedTo || null,
      assigned_to_name: itemData.assignedToName || null,
      next_action: itemData.nextAction || null,
      next_action_date: itemData.nextActionDate || null,
      next_action_time: itemData.nextActionTime || null,
      check_size: itemData.checkSize || null,
      deal_value: itemData.dealValue || null,
      opportunity: itemData.opportunity || null,
      notes: [],
      // New deal flow fields
      website: itemData.website || null,
      industry: itemData.industry || null,
      description: itemData.description || null,
      investment_stage: itemData.stage || null,
      deal_stage: itemData.dealStage || null,
      partner_type: itemData.partnerType || null
    }

    console.log('[DataPersistence] Creating CRM item:', { 
      collection, 
      type: crmData.type, 
      company: crmData.company,
      website: crmData.website,
      industry: crmData.industry,
      stage: crmData.investment_stage,
      dealStage: crmData.deal_stage,
      partnerType: crmData.partner_type
    });

    const { data, error } = await DatabaseService.createCrmItem(userId, workspaceId, crmData)
    
    if (error) {
      console.error('[DataPersistence] Error creating CRM item:', error);
    } else {
      console.log('[DataPersistence] CRM item created successfully:', data);
    }
    
    return { data, error }
  }

  static async updateCrmItem(itemId: string, updates: Partial<AnyCrmItem>) {
    // Use centralized transformer for base CRM fields
    const dbUpdates: any = crmItemToDb(updates);
    
    // Add type-specific fields (Investor, Customer, Partner)
    if ('checkSize' in updates) dbUpdates.check_size = updates.checkSize;
    if ('dealValue' in updates) dbUpdates.deal_value = updates.dealValue;
    if ('opportunity' in updates) dbUpdates.opportunity = updates.opportunity;
    
    // Add deal flow management fields
    if ('website' in updates) dbUpdates.website = updates.website || null;
    if ('industry' in updates) dbUpdates.industry = updates.industry || null;
    if ('description' in updates) dbUpdates.description = updates.description || null;
    if ('stage' in updates) dbUpdates.investment_stage = (updates as any).stage || null;
    if ('dealStage' in updates) dbUpdates.deal_stage = (updates as any).dealStage || null;
    if ('partnerType' in updates) dbUpdates.partner_type = (updates as any).partnerType || null;

    console.log('[DataPersistenceAdapter] updateCrmItem - updates:', updates);
    console.log('[DataPersistenceAdapter] updateCrmItem - dbUpdates:', dbUpdates);

    const { data, error } = await DatabaseService.updateCrmItem(itemId, dbUpdates)
    
    if (error) {
      console.error('[DataPersistenceAdapter] updateCrmItem error:', error);
    } else {
      console.log('[DataPersistenceAdapter] updateCrmItem success:', data);
    }
    
    return { data, error }
  }

  static async deleteCrmItem(itemId: string) {
    const { error } = await DatabaseService.deleteCrmItem(itemId)
    return { error }
  }

  // Contact operations
  static async createContact(
    userId: string,
    workspaceId: string,
    crmItemId: string,
    contactData: {
      name: string
      email: string
      phone?: string
      title?: string
      linkedin: string
      tags?: string[]
      assignedTo?: string
      assignedToName?: string
    }
  ) {
    const contact = {
      crm_item_id: crmItemId,
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone || '',
      title: contactData.title || '',
      linkedin: contactData.linkedin,
      tags: contactData.tags || [],
      assigned_to: contactData.assignedTo || null,
      assigned_to_name: contactData.assignedToName || null,
      notes: []
    }

    const { data, error } = await DatabaseService.createContact(userId, workspaceId, contact)
    return { data, error }
  }

  static async updateContact(contactId: string, updates: Partial<Contact>) {
    const dbUpdates: any = {}
    
    // Use explicit 'in' checks to allow clearing values (setting to empty string/null)
    if ('name' in updates) dbUpdates.name = updates.name
    if ('email' in updates) dbUpdates.email = updates.email
    if ('phone' in updates) dbUpdates.phone = updates.phone || null
    if ('title' in updates) dbUpdates.title = updates.title || null
    if ('linkedin' in updates) dbUpdates.linkedin = updates.linkedin
    if ('notes' in updates) dbUpdates.notes = updates.notes
    if ('tags' in updates) dbUpdates.tags = updates.tags || []
    if ('assignedTo' in updates) dbUpdates.assigned_to = updates.assignedTo || null
    if ('assignedToName' in updates) dbUpdates.assigned_to_name = updates.assignedToName || null

    const { data, error } = await DatabaseService.updateContact(contactId, dbUpdates)
    return { data, error }
  }

  static async deleteContact(contactId: string) {
    const { error } = await DatabaseService.deleteContact(contactId)
    return { error }
  }

  // Meeting operations
  static async createMeeting(
    userId: string,
    workspaceId: string,
    contactId: string,
    meetingData: {
      title: string
      attendees: string
      summary: string
      timestamp: number
    }
  ) {
    const meeting = {
      // id: removed - let database generate
      contact_id: contactId,
      title: meetingData.title,
      attendees: meetingData.attendees,
      summary: meetingData.summary,
      timestamp: new Date(meetingData.timestamp).toISOString()
    }

    const { data, error } = await DatabaseService.createMeeting(userId, workspaceId, meeting)
    return { data, error }
  }

  static async updateMeeting(meetingId: string, updates: Partial<Meeting>) {
    const dbUpdates: any = {}
    
    if (updates.title) dbUpdates.title = updates.title
    if (updates.attendees) dbUpdates.attendees = updates.attendees
    if (updates.summary) dbUpdates.summary = updates.summary
    if (updates.timestamp) dbUpdates.timestamp = new Date(updates.timestamp).toISOString()

    const { data, error } = await DatabaseService.updateMeeting(meetingId, dbUpdates)
    return { data, error }
  }

  static async deleteMeeting(meetingId: string) {
    const { error } = await DatabaseService.deleteMeeting(meetingId)
    return { error }
  }

  // Marketing operations
  static async createMarketingItem(
    userId: string,
    workspaceId: string,
    itemData: Partial<MarketingItem> & { title: string; type: MarketingItem['type'] }
  ) {
    // Use centralized transformer for complete field mapping
    const marketing = {
      ...marketingItemToDb({
        title: itemData.title,
        type: itemData.type,
        status: itemData.status || 'Planned' as const,
        dueDate: itemData.dueDate,
        dueTime: itemData.dueTime,
        assignedTo: itemData.assignedTo,
  assignedToName: itemData.assignedToName,
        notes: itemData.notes || [],
        // Campaign details
        campaignBudget: itemData.campaignBudget,
        actualSpend: itemData.actualSpend,
        targetAudience: itemData.targetAudience,
        channels: itemData.channels,
        goals: itemData.goals,
        kpis: itemData.kpis,
        // Links
        documentIds: itemData.documentIds,
        calendarEventIds: itemData.calendarEventIds,
        tags: itemData.tags,
        parentCampaignId: itemData.parentCampaignId,
        // Product/Service linking
        productServiceIds: itemData.productServiceIds,
        targetRevenue: itemData.targetRevenue,
      })
    }

    console.log('[DataPersistenceAdapter] Creating marketing item with complete data:', marketing);

    const { data, error } = await DatabaseService.createMarketingItem(userId, workspaceId, marketing as any)
    
    if (error) {
      console.error('[DataPersistenceAdapter] Error creating marketing item:', error);
      throw error;
    }
    
    return { data, error }
  }

  static async updateMarketingItem(itemId: string, updates: Partial<MarketingItem>) {
    // Use centralized transformer for type-safe conversion
    const dbUpdates = marketingItemToDb(updates);

    const { data, error } = await DatabaseService.updateMarketingItem(itemId, dbUpdates)
    return { data, error }
  }

  static async deleteMarketingItem(itemId: string) {
    const { error } = await DatabaseService.deleteMarketingItem(itemId)
    return { error }
  }

  // Financial operations
  static async logFinancials(
    userId: string,
    workspaceId: string,
    logData: {
      date: string
      mrr: number
      gmv: number
      signups: number
    }
  ) {
    const financial = {
      date: logData.date,
      mrr: logData.mrr,
      gmv: logData.gmv,
      signups: logData.signups
    }

    const { data, error } = await DatabaseService.createFinancialLog(userId, workspaceId, financial)
    return { data, error }
  }

  static async updateFinancialLog(logId: string, updates: Partial<FinancialLog>) {
    const dbUpdates: any = {}
    
    if (updates.date) dbUpdates.date = updates.date
    if (updates.mrr !== undefined) dbUpdates.mrr = updates.mrr
    if (updates.gmv !== undefined) dbUpdates.gmv = updates.gmv
    if (updates.signups !== undefined) dbUpdates.signups = updates.signups

    const { data, error } = await DatabaseService.updateFinancialLog(logId, dbUpdates)
    return { data, error }
  }

  static async deleteFinancialLog(logId: string) {
    const { error } = await DatabaseService.deleteFinancialLog(logId)
    return { error }
  }

  // Document operations
  static async uploadDocument(
    userId: string,
    workspaceId: string,
    docData: {
      name: string
      mimeType: string
      content: BinaryContent
      module: string
      companyId?: string
      contactId?: string
      description?: string
      tags?: string[]
      isStarred?: boolean
      fileSize?: number
    }
  ) {
    const normalized = normalizeDocumentContent(docData.content)
    const inferredSize = docData.fileSize ?? Math.ceil((normalized.value.length * 3) / 4)
    
    const document = {
      name: docData.name,
      mime_type: docData.mimeType,
      content: normalized.value,
      module: docData.module,
      company_id: docData.companyId || null,
      contact_id: docData.contactId || null,
      notes: [],
      description: docData.description || null,
      tags: docData.tags || [],
      is_starred: docData.isStarred ?? false,
      file_size: inferredSize,
    }

    const { data, error } = await DatabaseService.createDocument(userId, workspaceId, document)
    return { data, error }
  }

  static async updateDocument(docId: string, updates: Partial<Document>) {
    const dbUpdates: any = {}
    
    if (typeof updates.name === 'string') dbUpdates.name = updates.name
    if (typeof updates.mimeType === 'string') dbUpdates.mime_type = updates.mimeType
    if (typeof updates.content === 'string') dbUpdates.content = updates.content
    if (updates.notes) dbUpdates.notes = updates.notes
    if (updates.module) dbUpdates.module = updates.module
    if ('companyId' in updates) dbUpdates.company_id = updates.companyId || null
    if ('contactId' in updates) dbUpdates.contact_id = updates.contactId || null
    if ('isStarred' in updates) dbUpdates.is_starred = Boolean(updates.isStarred)
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if ('description' in updates) dbUpdates.description = updates.description || null
    if (typeof updates.lastAccessedAt === 'number') dbUpdates.last_accessed_at = new Date(updates.lastAccessedAt).toISOString()
    if (typeof updates.viewCount === 'number') dbUpdates.view_count = updates.viewCount
    if (typeof updates.fileSize === 'number') dbUpdates.file_size = updates.fileSize
    if ('linkTaskId' in updates) dbUpdates.link_task_id = updates.linkTaskId || null
    if ('linkDealId' in updates) dbUpdates.link_deal_id = updates.linkDealId || null
    if ('linkEventId' in updates) dbUpdates.link_event_id = updates.linkEventId || null

    const { data, error } = await DatabaseService.updateDocument(docId, dbUpdates)
    return { data, error }
  }

  static async deleteDocument(docId: string) {
    const { error } = await DatabaseService.deleteDocument(docId)
    return { error }
  }

  static async saveDocumentSnapshot(options: SaveDocumentSnapshotOptions) {
    const snapshotBytes = options.snapshot
      ? toUint8Array(options.snapshot)
      : options.yDoc
        ? Y.encodeStateAsUpdate(options.yDoc)
        : null

    if (!snapshotBytes) {
      throw new Error('A Yjs document or raw snapshot bytes must be provided')
    }

    const binaryBlobBytes = options.binaryBlob ? toUint8Array(options.binaryBlob) : null
    const payload = {
      kind: 'gtm_doc_snapshot',
      version: 1,
      snapshot: encodeToBase64(snapshotBytes),
      binaryBlob: binaryBlobBytes ? encodeToBase64(binaryBlobBytes) : undefined,
      meta: {
        docId: options.docId,
        workspaceId: options.workspaceId,
        userId: options.userId ?? null,
        savedAt: new Date().toISOString(),
        snapshotBytes: snapshotBytes.length,
        binaryBlobBytes: binaryBlobBytes?.length ?? 0,
        ...options.meta,
      },
    }

    const serializedContent = JSON.stringify(payload)
    const maxRetries = Math.max(1, options.maxRetries ?? 3)
    let lastResult: Awaited<ReturnType<typeof DatabaseService.updateDocument>> | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await DatabaseService.updateDocument(options.docId, {
        content: serializedContent,
      })

      if (!result.error) {
        return result
      }

      lastResult = result
    }

    return (
      lastResult ?? {
        data: null,
        error: new Error('Failed to persist document snapshot after retries'),
      }
    )
  }

  // Expense operations
  static async createExpense(
    userId: string,
    workspaceId: string,
    expenseData: {
      date: string
      category: string
      amount: number
      description: string
      vendor?: string
      paymentMethod?: string
      receiptDocumentId?: string
    }
  ) {
    const dbExpenseData = {
      date: expenseData.date,
      category: expenseData.category,
      amount: expenseData.amount,
      description: expenseData.description,
      vendor: expenseData.vendor || null,
      payment_method: expenseData.paymentMethod || null,
      receipt_document_id: expenseData.receiptDocumentId || null,
      notes: []
    }

    const { data, error } = await DatabaseService.createExpense(userId, workspaceId, dbExpenseData)
    return { data, error }
  }

  static async updateExpense(
    expenseId: string,
    updates: {
      date?: string
      category?: string
      amount?: number
      description?: string
      vendor?: string
      paymentMethod?: string
      receiptDocumentId?: string
    }
  ) {
    const dbUpdates: any = {}
    if (updates.date) dbUpdates.date = updates.date
    if (updates.category) dbUpdates.category = updates.category
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.description) dbUpdates.description = updates.description
    if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor || null
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod || null
    if (updates.receiptDocumentId !== undefined) dbUpdates.receipt_document_id = updates.receiptDocumentId || null

    const { data, error } = await DatabaseService.updateExpense(expenseId, dbUpdates)
    return { data, error }
  }

  static async deleteExpense(expenseId: string) {
    const { error } = await DatabaseService.deleteExpense(expenseId)
    return { error }
  }

  // ============================================================================
  // FINANCIAL ENHANCEMENTS
  // ============================================================================

  static async createRevenueTransaction(
    userId: string,
    workspaceId: string,
    transactionData: {
      transactionDate: string
      amount: number
      currency?: string
      transactionType: 'invoice' | 'payment' | 'refund' | 'recurring'
      status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
      crmItemId?: string
      contactId?: string
      dealStage?: string
      invoiceNumber?: string
      paymentMethod?: string
      paymentDate?: string
      dueDate?: string
      revenueCategory?: 'product_sale' | 'service_fee' | 'subscription' | 'consulting' | 'partnership' | 'other'
      productLine?: string
      description?: string
      notes?: any[]
      documentIds?: string[]
    }
  ) {
    const transaction = {
      workspace_id: workspaceId,
      user_id: userId,
      transaction_date: transactionData.transactionDate,
      amount: transactionData.amount,
      currency: transactionData.currency || 'USD',
      transaction_type: transactionData.transactionType,
      status: transactionData.status || 'pending',
      crm_item_id: transactionData.crmItemId || null,
      contact_id: transactionData.contactId || null,
      deal_stage: transactionData.dealStage || null,
      invoice_number: transactionData.invoiceNumber || null,
      payment_method: transactionData.paymentMethod || null,
      payment_date: transactionData.paymentDate || null,
      due_date: transactionData.dueDate || null,
      revenue_category: transactionData.revenueCategory || null,
      product_line: transactionData.productLine || null,
      description: transactionData.description || null,
      notes: transactionData.notes || [],
      document_ids: transactionData.documentIds || null,
    }

    const { data, error } = await DatabaseService.createRevenueTransaction(transaction)
    
    // Log activity
    if (data && workspaceId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'revenue_created',
        entityType: 'revenue',
        entityId: data.id,
        metadata: {
          amount: transactionData.amount,
          type: transactionData.transactionType,
        },
      });
    }
    
    return { data, error }
  }

  static async updateRevenueTransaction(
    transactionId: string,
    updates: {
      amount?: number
      status?: string
      paymentDate?: string
      paymentMethod?: string
      description?: string
      notes?: any[]
    },
    userId?: string,
    workspaceId?: string
  ) {
    const dbUpdates: any = {}
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.status) dbUpdates.status = updates.status
    if (updates.paymentDate) dbUpdates.payment_date = updates.paymentDate
    if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod
    if (updates.description) dbUpdates.description = updates.description
    if (updates.notes) dbUpdates.notes = updates.notes

    const { data, error } = await DatabaseService.updateRevenueTransaction(transactionId, dbUpdates)
    
    // Log payment received
    if (data && userId && workspaceId && updates.status === 'paid') {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'payment_received',
        entityType: 'revenue',
        entityId: transactionId,
        metadata: {
          amount: data.amount,
        },
      });
    }
    
    return { data, error }
  }

  static async deleteRevenueTransaction(transactionId: string) {
    const { data, error } = await DatabaseService.deleteRevenueTransaction(transactionId)
    return { data, error }
  }

  static async createFinancialForecast(
    userId: string,
    workspaceId: string,
    forecastData: {
      forecastMonth: string
      forecastType: 'revenue' | 'expense' | 'runway'
      forecastedAmount: number
      confidenceLevel?: 'low' | 'medium' | 'high'
      basedOnDeals?: string[]
      assumptions?: string
    }
  ) {
    const forecast = {
      workspace_id: workspaceId,
      user_id: userId,
      forecast_month: forecastData.forecastMonth,
      forecast_type: forecastData.forecastType,
      forecasted_amount: forecastData.forecastedAmount,
      confidence_level: forecastData.confidenceLevel || 'medium',
      based_on_deals: forecastData.basedOnDeals || null,
      assumptions: forecastData.assumptions || null,
    }

    const { data, error } = await DatabaseService.createFinancialForecast(forecast)
    return { data, error }
  }

  static async updateFinancialForecast(forecastId: string, updates: any) {
    // Map camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.forecastMonth) dbUpdates.forecast_month = updates.forecastMonth;
    if (updates.forecastType) dbUpdates.forecast_type = updates.forecastType;
    if (updates.forecastedAmount) dbUpdates.forecasted_amount = updates.forecastedAmount;
    if (updates.confidenceLevel) dbUpdates.confidence_level = updates.confidenceLevel;
    if (updates.basedOnDeals) dbUpdates.based_on_deals = updates.basedOnDeals;
    if (updates.assumptions) dbUpdates.assumptions = updates.assumptions;

    const { data, error } = await DatabaseService.updateFinancialForecast(forecastId, dbUpdates)
    return { data, error }
  }

  static async deleteFinancialForecast(forecastId: string) {
    const { data, error } = await DatabaseService.deleteFinancialForecast(forecastId)
    return { data, error }
  }

  static async createBudgetPlan(
    userId: string,
    workspaceId: string,
    budgetData: {
      budgetName: string
      budgetPeriodStart: string
      budgetPeriodEnd: string
      category: string
      allocatedAmount: number
      alertThreshold?: number
      notes?: string
    }
  ) {
    const budget = {
      workspace_id: workspaceId,
      user_id: userId,
      budget_name: budgetData.budgetName,
      budget_period_start: budgetData.budgetPeriodStart,
      budget_period_end: budgetData.budgetPeriodEnd,
      category: budgetData.category,
      allocated_amount: budgetData.allocatedAmount,
      spent_amount: 0,
      alert_threshold: budgetData.alertThreshold || 0.8,
      notes: budgetData.notes || null,
    }

    const { data, error } = await DatabaseService.createBudgetPlan(budget)
    
    // Log activity
    if (data && workspaceId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'budget_created',
        entityType: 'budget',
        entityId: data.id,
        metadata: {
          budgetName: budgetData.budgetName,
          amount: budgetData.allocatedAmount,
        },
      });
    }
    
    return { data, error }
  }

  static async updateBudgetPlan(
    budgetId: string,
    updates: {
      allocatedAmount?: number
      spentAmount?: number
      notes?: string
    }
  ) {
    const dbUpdates: any = {}
    if (updates.allocatedAmount !== undefined) dbUpdates.allocated_amount = updates.allocatedAmount
    if (updates.spentAmount !== undefined) dbUpdates.spent_amount = updates.spentAmount
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes

    const { data, error } = await DatabaseService.updateBudgetPlan(budgetId, dbUpdates)
    return { data, error }
  }

  static async deleteBudgetPlan(budgetId: string) {
    const { data, error } = await DatabaseService.deleteBudgetPlan(budgetId)
    return { data, error }
  }

  // ============================================================================
  // MARKETING ENHANCEMENTS
  // ============================================================================

  static async createCampaignAttribution(
    workspaceId: string,
    userId: string,
    attributionData: {
      marketingItemId: string
      crmItemId: string
      contactId?: string
      attributionType: 'first_touch' | 'last_touch' | 'multi_touch'
      attributionWeight?: number
      interactionDate?: number
      conversionDate?: number
      revenueAttributed?: number
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
      utmContent?: string
    }
  ) {
    const serializeDate = (value?: number | null) =>
      value !== undefined && value !== null ? new Date(value).toISOString() : null;

    const attribution = {
      workspace_id: workspaceId,
      marketing_item_id: attributionData.marketingItemId,
      crm_item_id: attributionData.crmItemId,
      contact_id: attributionData.contactId || null,
      attribution_type: attributionData.attributionType,
      attribution_weight: attributionData.attributionWeight || 1.0,
      interaction_date: serializeDate(attributionData.interactionDate) || new Date().toISOString(),
      conversion_date: serializeDate(attributionData.conversionDate),
      revenue_attributed: attributionData.revenueAttributed || 0,
      utm_source: attributionData.utmSource || null,
      utm_medium: attributionData.utmMedium || null,
      utm_campaign: attributionData.utmCampaign || null,
      utm_content: attributionData.utmContent || null,
    }

    const { data, error } = await DatabaseService.createCampaignAttribution(attribution)
    
    // Log activity
    if (data && workspaceId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'attribution_created',
        entityType: 'attribution',
        entityId: data.id,
        metadata: {
          attributionType: attributionData.attributionType,
        },
      });
    }
    
    return { data, error }
  }

  static async updateMarketingAnalytics(
    analyticsId: string,
    updates: {
      impressions?: number
      clicks?: number
      engagements?: number
      conversions?: number
      leadsGenerated?: number
      revenueGenerated?: number
      adSpend?: number
    }
  ) {
    const dbUpdates: any = {}
    if (updates.impressions !== undefined) dbUpdates.impressions = updates.impressions
    if (updates.clicks !== undefined) dbUpdates.clicks = updates.clicks
    if (updates.engagements !== undefined) dbUpdates.engagements = updates.engagements
    if (updates.conversions !== undefined) dbUpdates.conversions = updates.conversions
    if (updates.leadsGenerated !== undefined) dbUpdates.leads_generated = updates.leadsGenerated
    if (updates.revenueGenerated !== undefined) dbUpdates.revenue_generated = updates.revenueGenerated
    if (updates.adSpend !== undefined) dbUpdates.ad_spend = updates.adSpend

    const { data, error } = await DatabaseService.updateMarketingAnalytics(analyticsId, dbUpdates)
    return { data, error }
  }

  static async createMarketingCalendarLink(
    workspaceId: string,
    userId: string,
    linkData: {
      marketingItemId: string
      linkedId: string
      linkedType: 'task' | 'calendar_event' | 'milestone'
      relationshipType?: 'related' | 'deliverable' | 'milestone' | 'deadline'
    }
  ) {
    const link = {
      workspace_id: workspaceId,
      marketing_item_id: linkData.marketingItemId,
      linked_id: linkData.linkedId,
      linked_type: linkData.linkedType,
      relationship_type: linkData.relationshipType || 'related',
    }

    const { data, error } = await DatabaseService.createMarketingCalendarLink(link)
    
    // Log activity
    if (data && workspaceId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'calendar_linked',
        entityType: 'marketing',
        entityId: linkData.marketingItemId,
        metadata: {
          linkedType: linkData.linkedType,
        },
      });
    }
    
    return { data, error }
  }

  static async deleteMarketingCalendarLink(linkId: string) {
    const { data, error } = await DatabaseService.deleteMarketingCalendarLink(linkId)
    return { data, error }
  }

  // Settings operations
  static async updateSettings(userId: string, settings: SettingsData) {
    const { data, error } = await DatabaseService.updateUserProfile(userId, {
      settings: settings as any
    })
    return { data, error }
  }

  // Deal operations
  static async createDeal(
    userId: string,
    workspaceId: string,
    deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'notes'>
  ) {
    const dealData = {
      workspace_id: workspaceId,
      title: deal.title,
      crm_item_id: deal.crmItemId,
      contact_id: deal.contactId,
      value: deal.value,
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expectedCloseDate,
      actual_close_date: deal.actualCloseDate,
      source: deal.source,
      category: deal.category,
      priority: deal.priority,
      assigned_to: deal.assignedTo,
      tags: deal.tags,
      custom_fields: deal.customFields
    }

    const { data, error } = await DatabaseService.createDeal(dealData as any)
    
    if (data && workspaceId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'deal_created', // Need to check if this exists in ActivityActionType
        entityType: 'deal', // Need to check if this exists in ActivityEntityType
        entityId: data.id,
        metadata: {
          title: deal.title,
          value: deal.value
        },
      });
    }
    
    return { data, error }
  }

  static async updateDeal(dealId: string, updates: Partial<Deal>, userId?: string, workspaceId?: string) {
    const dealUpdates: any = {}
    if (updates.title !== undefined) dealUpdates.title = updates.title
    if (updates.value !== undefined) dealUpdates.value = updates.value
    if (updates.stage !== undefined) dealUpdates.stage = updates.stage
    if (updates.probability !== undefined) dealUpdates.probability = updates.probability
    if (updates.expectedCloseDate !== undefined) dealUpdates.expected_close_date = updates.expectedCloseDate
    if (updates.actualCloseDate !== undefined) dealUpdates.actual_close_date = updates.actualCloseDate
    if (updates.priority !== undefined) dealUpdates.priority = updates.priority
    if (updates.assignedTo !== undefined) dealUpdates.assigned_to = updates.assignedTo
    
    const { data, error } = await DatabaseService.updateDeal(dealId, dealUpdates)
    
    if (data && workspaceId && userId) {
      await logActivity({
        workspaceId,
        userId,
        actionType: 'deal_updated',
        entityType: 'deal',
        entityId: dealId,
        metadata: {
          updates: Object.keys(updates)
        },
      });
    }

    return { data, error }
  }

  static async deleteDeal(dealId: string) {
    const { data, error } = await DatabaseService.deleteDeal(dealId)
    return { data, error }
  }

  // Product/Service operations
  static async createProductService(
    userId: string,
    workspaceId: string,
    product: Omit<ProductService, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    const productData = {
      workspace_id: workspaceId,
      name: product.name,
      description: product.description ?? null,
      sku: product.sku ?? null,
      category: product.category,
      type: product.type,
      status: product.status,
      pricing_model: product.pricingModel,
      base_price: product.basePrice ?? null,
      currency: product.currency,
      billing_period: product.billingPeriod ?? null,
      cost_of_goods: product.costOfGoods ?? null,
      cost_of_service: product.costOfService ?? null,
      is_taxable: product.isTaxable,
      tax_code: product.taxCode ?? null,
      tax_rate: product.taxRate ?? null,
      tags: product.tags ?? [],
      image_url: product.imageUrl ?? null,
      tiered_pricing: product.tieredPricing ?? null,
      usage_pricing: product.usagePricing ?? null,
      subscription_plans: product.subscriptionPlans ?? null,
      inventory_tracked: product.inventoryTracked,
      quantity_on_hand: product.inventoryTracked ? product.quantityOnHand ?? 0 : null,
      reorder_point: product.inventoryTracked ? product.reorderPoint ?? null : null,
      reorder_quantity: product.inventoryTracked ? product.reorderQuantity ?? null : null,
      capacity_tracked: product.capacityTracked,
      capacity_unit: product.capacityTracked ? product.capacityUnit ?? null : null,
      capacity_total: product.capacityTracked ? product.capacityTotal ?? null : null,
      capacity_period: product.capacityTracked ? product.capacityPeriod ?? null : null
    }

    const { data, error } = await DatabaseService.createProductService(productData)
    return { data, error }
  }

  static async updateProductService(id: string, updates: Partial<ProductService>) {
    const productUpdates: any = {}
    if (updates.name !== undefined) productUpdates.name = updates.name
    if (updates.basePrice !== undefined) productUpdates.base_price = updates.basePrice
    if (updates.status !== undefined) productUpdates.status = updates.status
    
    const { data, error } = await DatabaseService.updateProductService(id, productUpdates)
    return { data, error }
  }

  static async deleteProductService(id: string) {
    const { data, error } = await DatabaseService.deleteProductService(id)
    return { data, error }
  }

  static async updateCampaignAttribution(
    attributionId: string,
    updates: Partial<CampaignAttribution>
  ) {
    const dbUpdates: any = {};
    if (updates.attributionType) dbUpdates.attribution_type = updates.attributionType;
    if (updates.attributionWeight !== undefined) dbUpdates.attribution_weight = updates.attributionWeight;
    if (updates.revenueAttributed !== undefined) dbUpdates.revenue_attributed = updates.revenueAttributed;
    
    const { data, error } = await DatabaseService.updateCampaignAttribution(attributionId, dbUpdates);
    return { data, error };
  }

  static async deleteCampaignAttribution(attributionId: string) {
    const { data, error } = await DatabaseService.deleteCampaignAttribution(attributionId);
    return { data, error };
  }

  static async deleteMarketingAnalytics(analyticsId: string) {
    const { data, error } = await DatabaseService.deleteMarketingAnalytics(analyticsId);
    return { data, error };
  }

  static async createMarketingAnalytics(
    workspaceId: string,
    userId: string,
    analyticsData: {
      marketingItemId: string
      analyticsDate: string
      impressions?: number
      clicks?: number
      engagements?: number
      conversions?: number
      leadsGenerated?: number
      revenueGenerated?: number
      adSpend?: number
      channel?: 'email' | 'social' | 'paid_ads' | 'content' | 'events' | 'other'
    }
  ) {
    const analytics = {
      workspace_id: workspaceId,
      marketing_item_id: analyticsData.marketingItemId,
      analytics_date: analyticsData.analyticsDate,
      impressions: analyticsData.impressions || 0,
      clicks: analyticsData.clicks || 0,
      engagements: analyticsData.engagements || 0,
      conversions: analyticsData.conversions || 0,
      leads_generated: analyticsData.leadsGenerated || 0,
      revenue_generated: analyticsData.revenueGenerated || 0,
      ad_spend: analyticsData.adSpend || 0,
      channel: analyticsData.channel || null,
    }

    const { data, error } = await DatabaseService.createMarketingAnalytics(analytics)
    return { data, error }
  }
}