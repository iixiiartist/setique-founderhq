import { DatabaseService } from './database'
import { logActivity } from './activityService'
import { 
  Task, AnyCrmItem, Contact, Meeting, MarketingItem, 
  FinancialLog, Document, SettingsData,
  TaskCollectionName, CrmCollectionName, Priority, TaskStatus
} from '../../types'
import { taskToDb, marketingItemToDb, crmItemToDb, contactToDb } from '../utils/fieldTransformers'

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
    dueTime?: string
  ) {
    if (!workspaceId) {
      throw new Error('workspaceId is required to create a task');
    }
    
    console.log('[DataPersistenceAdapter] Creating task with assignedTo:', assignedTo);
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
        assignedTo
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

  static async addCrmNote(crmItemId: string, noteText: string, userId?: string, userName?: string) {
    const { data: item } = await DatabaseService.getCrmItemById(crmItemId);
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
      nextAction?: string
      nextActionDate?: string
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
      next_action: itemData.nextAction || null,
      next_action_date: itemData.nextActionDate || null,
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
    }
  ) {
    const contact = {
      // id: removed - let database generate
      crm_item_id: crmItemId,
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone || '',
      title: contactData.title || '',
      linkedin: contactData.linkedin,
      notes: []
    }

    const { data, error } = await DatabaseService.createContact(userId, workspaceId, contact)
    return { data, error }
  }

  static async updateContact(contactId: string, updates: Partial<Contact>) {
    const dbUpdates: any = {}
    
    if (updates.name) dbUpdates.name = updates.name
    if (updates.email) dbUpdates.email = updates.email
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin
    if (updates.notes) dbUpdates.notes = updates.notes
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
  if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
  if (updates.assignedToName !== undefined) dbUpdates.assigned_to_name = updates.assignedToName

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
    itemData: {
      title: string
      type: MarketingItem['type']
      status?: MarketingItem['status']
      dueDate?: string
      assignedTo?: string | null
      assignedToName?: string | null
    }
  ) {
    const marketing = {
      title: itemData.title,
      type: itemData.type,
      status: itemData.status || 'Planned' as const,
      due_date: itemData.dueDate || null,
      assigned_to: itemData.assignedTo || null,
      assigned_to_name: itemData.assignedToName || null,
      notes: []
    }

    const { data, error } = await DatabaseService.createMarketingItem(userId, workspaceId, marketing)
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
      content: string
      module: string
      companyId?: string
      contactId?: string
    }
  ) {
    const document = {
      name: docData.name,
      mime_type: docData.mimeType,
      content: docData.content,
      module: docData.module,
      company_id: docData.companyId || null,
      contact_id: docData.contactId || null,
      notes: []
    }

    const { data, error } = await DatabaseService.createDocument(userId, workspaceId, document)
    return { data, error }
  }

  static async updateDocument(docId: string, updates: Partial<Document>) {
    const dbUpdates: any = {}
    
    if (updates.name) dbUpdates.name = updates.name
    if (updates.mimeType) dbUpdates.mime_type = updates.mimeType
    if (updates.content) dbUpdates.content = updates.content
    if (updates.notes) dbUpdates.notes = updates.notes

    const { data, error } = await DatabaseService.updateDocument(docId, dbUpdates)
    return { data, error }
  }

  static async deleteDocument(docId: string) {
    const { error } = await DatabaseService.deleteDocument(docId)
    return { error }
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
      interactionDate?: string
      conversionDate?: string
      revenueAttributed?: number
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
      utmContent?: string
    }
  ) {
    const attribution = {
      workspace_id: workspaceId,
      marketing_item_id: attributionData.marketingItemId,
      crm_item_id: attributionData.crmItemId,
      contact_id: attributionData.contactId || null,
      attribution_type: attributionData.attributionType,
      attribution_weight: attributionData.attributionWeight || 1.0,
      interaction_date: attributionData.interactionDate || new Date().toISOString(),
      conversion_date: attributionData.conversionDate || null,
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
}