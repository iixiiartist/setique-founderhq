import { supabase } from '../supabase'
import { Database } from '../types/database'
import { DashboardData, Task, AnyCrmItem, Contact, Meeting, MarketingItem, FinancialLog, Document, SettingsData, Priority, GTMDoc, GTMDocMetadata, LinkedDoc } from '../../types'
import { dbToTasks, dbToMarketingItems, dbToFinancialLogs, dbToCrmItem, dbToContacts } from '../utils/fieldTransformers'
import { logger } from '../logger'

type Tables = Database['public']['Tables']

export class DatabaseService {
  // User Profile operations
  static async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching user profile:', error)
      return { data: null, error }
    }
  }

  static async createProfile(profileData: Tables['profiles']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          ...profileData,
          created_at: profileData.created_at || new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating profile:', error)
      return { data: null, error }
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<Tables['profiles']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating user profile:', error)
      return { data: null, error }
    }
  }

  // Task operations
  static async getTasks(
    userId: string, 
    workspaceId?: string,
    options?: {
      page?: number
      limit?: number
      category?: string
      status?: string
      assignedTo?: string
      priority?: string
    }
  ) {
    try {
      const { page = 1, limit = 50, category, status, assignedTo, priority } = options || {}
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)
        `, { count: 'exact' })
      
      // If workspaceId provided, fetch all tasks in the workspace
      // Otherwise, fetch user's personal tasks (backwards compatibility)
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      } else {
        query = query.eq('user_id', userId)
      }

      // Push filtering to database for performance
      if (category) {
        query = query.eq('category', category)
      }
      if (status) {
        query = query.eq('status', status)
      }
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo)
      }
      if (priority) {
        query = query.eq('priority', priority)
      }
      
      // Apply pagination and ordering
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      // Transform tasks from database format (snake_case) to app format (camelCase)
      const transformedData = data?.map(dbTask => ({
        id: dbTask.id,
        text: dbTask.text,
        status: dbTask.status,
        priority: dbTask.priority,
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
        category: dbTask.category,
        subtasks: dbTask.subtasks || [],
      })) || []
      
      // Return data with pagination metadata
      return { 
        data: transformedData, 
        error: null,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: count ? (page * limit) < count : false
        }
      }
    } catch (error) {
      logger.error('Error fetching tasks:', error)
      return { data: [], error, pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false } }
    }
  }

  static async getTaskById(taskId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching task by ID:', error)
      return { data: null, error }
    }
  }

  static async createTask(userId: string, taskData: Omit<Tables['tasks']['Insert'], 'user_id' | 'workspace_id'>, workspaceId: string) {
    try {
      if (!workspaceId) {
        throw new Error('workspace_id is required to create a task');
      }
      
      const insertData: any = { 
        ...taskData, 
        user_id: userId,
        workspace_id: workspaceId
      }
      
      logger.info('[Database] Creating task with data:', insertData);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        logger.error('[Database] Task creation error:', error);
        throw error;
      }
      
      logger.info('[Database] Task created successfully:', data);
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating task:', error)
      return { data: null, error }
    }
  }

  static async updateTask(taskId: string, updates: Partial<Tables['tasks']['Update']>) {
    try {
      logger.info('[Database] updateTask called with:', { taskId, updates });
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        logger.error('[Database] updateTask error:', error);
        throw error;
      }
      
      logger.info('[Database] updateTask success:', data);
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating task:', error)
      return { data: null, error }
    }
  }

  static async deleteTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting task:', error)
      return { error }
    }
  }

  // CRM Items operations
  static async getCrmItems(
    workspaceId: string,
    options?: {
      page?: number
      limit?: number
      type?: string
      stage?: string
      assignedTo?: string
    }
  ) {
    try {
      const { page = 1, limit = 50, type, stage, assignedTo } = options || {}
      
      let query = supabase
        .from('crm_items')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceId)

      // Push filtering to database for performance
      if (type) {
        query = query.eq('type', type)
      }
      if (stage) {
        query = query.eq('stage', stage)
      }
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo)
      }

      // Apply pagination and ordering
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      return { 
        data, 
        error: null,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: count ? (page * limit) < count : false
        }
      }
    } catch (error) {
      logger.error('Error fetching CRM items:', error)
      return { data: [], error, pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false } }
    }
  }

  static async getCrmItemById(itemId: string, workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_items')
        .select('*')
        .eq('id', itemId)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching CRM item by ID:', error)
      return { data: null, error }
    }
  }

  static async createCrmItem(userId: string, workspaceId: string, itemData: Omit<Tables['crm_items']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('crm_items')
        .insert({ ...itemData, user_id: userId, workspace_id: workspaceId })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating CRM item:', error)
      return { data: null, error }
    }
  }

  static async updateCrmItem(itemId: string, updates: Partial<Tables['crm_items']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('crm_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating CRM item:', error)
      return { data: null, error }
    }
  }

  static async deleteCrmItem(itemId: string) {
    try {
      // First, get all contact IDs for this CRM item
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('crm_item_id', itemId);
      
      const contactIds = (contacts || []).map(c => c.id);
      
      // Delete meetings tied to these contacts (not the CRM item directly)
      if (contactIds.length > 0) {
        await supabase.from('meetings').delete().in('contact_id', contactIds);
      }
      
      // Delete contacts
      await supabase.from('contacts').delete().eq('crm_item_id', itemId);
      
      // Finally delete the CRM item
      const { error } = await supabase
        .from('crm_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      logger.error('Error deleting CRM item:', error);
      return { error };
    }
  }

  // Contacts operations
  static async getContacts(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false})

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching contacts:', error)
      return { data: [], error }
    }
  }

  static async getContactById(contactId: string) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching contact by ID:', error)
      return { data: null, error }
    }
  }

  static async createContact(userId: string, workspaceId: string, contactData: Omit<Tables['contacts']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contactData, user_id: userId, workspace_id: workspaceId })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating contact:', error)
      return { data: null, error }
    }
  }

  static async updateContact(contactId: string, updates: Partial<Tables['contacts']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', contactId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating contact:', error)
      return { data: null, error }
    }
  }

  static async deleteContact(contactId: string) {
    try {
      // Also delete related meetings
      await supabase.from('meetings').delete().eq('contact_id', contactId)
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting contact:', error)
      return { error }
    }
  }

  // Marketing Items operations
  static async getMarketingItems(workspaceId: string) {
    try {
      const { data, error} = await supabase
        .from('marketing_items')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching marketing items:', error)
      return { data: [], error }
    }
  }

  static async getMarketingItemById(itemId: string) {
    try {
      const { data, error } = await supabase
        .from('marketing_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching marketing item by ID:', error)
      return { data: null, error }
    }
  }

  static async createMarketingItem(userId: string, workspaceId: string, itemData: Omit<Tables['marketing_items']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('marketing_items')
        .insert({ ...itemData, user_id: userId, workspace_id: workspaceId })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating marketing item:', error)
      return { data: null, error }
    }
  }

  static async updateMarketingItem(itemId: string, updates: Partial<Tables['marketing_items']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('marketing_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating marketing item:', error)
      return { data: null, error }
    }
  }

  static async deleteMarketingItem(itemId: string) {
    try {
      const { error } = await supabase
        .from('marketing_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting marketing item:', error)
      return { error }
    }
  }

  // Financial Logs operations
  static async getFinancialLogs(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('financial_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('date', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching financial logs:', error)
      return { data: [], error }
    }
  }

  static async createFinancialLog(userId: string, workspaceId: string, logData: Omit<Tables['financial_logs']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('financial_logs')
        .insert({ ...logData, user_id: userId, workspace_id: workspaceId })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating financial log:', error)
      return { data: null, error }
    }
  }

  static async updateFinancialLog(logId: string, updates: Partial<Tables['financial_logs']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('financial_logs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', logId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating financial log:', error)
      return { data: null, error }
    }
  }

  static async deleteFinancialLog(logId: string) {
    try {
      const { error } = await supabase
        .from('financial_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting financial log:', error)
      return { error }
    }
  }

  // Documents operations
  static async getDocuments(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, mime_type, module, company_id, contact_id, workspace_id, created_at, updated_at')
        // Note: uploaded_by and uploaded_by_name columns don't exist yet (need migration)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(100) // Limit to 100 most recent documents

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching documents:', error)
      return { data: [], error }
    }
  }

  static async getDocumentById(docId: string) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching document by ID:', error)
      return { data: null, error }
    }
  }

  static async createDocument(userId: string, workspaceId: string, docData: Omit<Tables['documents']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({ 
          ...docData, 
          user_id: userId,
          workspace_id: workspaceId 
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating document:', error)
      return { data: null, error }
    }
  }

  static async updateDocument(docId: string, updates: Partial<Tables['documents']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', docId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating document:', error)
      return { data: null, error }
    }
  }

  static async deleteDocument(docId: string) {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting document:', error)
      return { error }
    }
  }

  // Expense operations
  static async getExpenses(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('date', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching expenses:', error)
      return { data: [], error }
    }
  }

  static async createExpense(userId: string, workspaceId: string, expenseData: Omit<Tables['expenses']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expenseData,
          user_id: userId,
          workspace_id: workspaceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating expense:', error)
      return { data: null, error }
    }
  }

  static async updateExpense(expenseId: string, updates: Partial<Tables['expenses']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', expenseId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating expense:', error)
      return { data: null, error }
    }
  }

  static async deleteExpense(expenseId: string) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting expense:', error)
      return { error }
    }
  }

  // Workspace operations
  static async getWorkspaces(userId: string) {
    try {
      logger.info('[Database] Fetching workspace for user:', userId);
      
      // Helper function to map database workspace to TypeScript Workspace type
      const mapWorkspace = (ws: any) => ({
        id: ws.id,
        name: ws.name,
        planType: ws.plan_type || 'free', // Map snake_case to camelCase
        ownerId: ws.owner_id,
        createdAt: new Date(ws.created_at).getTime(),
        seatCount: ws.seat_count || 1,
        aiUsageCount: ws.ai_usage_count || 0,
        aiUsageResetDate: ws.ai_usage_reset_date ? new Date(ws.ai_usage_reset_date).getTime() : Date.now(),
        storageBytesUsed: ws.storage_bytes_used || 0,
        fileCount: ws.file_count || 0,
        teamXp: ws.team_xp || 0,
        teamLevel: ws.team_level || 1
      });
      
      // In single-workspace model:
      // 1. First check if user owns a workspace
      // Join with subscriptions to get the actual plan_type
      const { data: ownedWorkspace, error: ownedError } = await supabase
        .from('workspaces')
        .select(`
          *,
          subscription:subscriptions(plan_type, ai_requests_used, seat_count, status)
        `)
        .eq('owner_id', userId)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors if none found

      if (ownedError) {
        logger.error('[Database] Error fetching owned workspace:', ownedError);
        throw ownedError;
      }

      // If user owns a workspace, return it with subscription plan_type
      if (ownedWorkspace) {
        logger.info('[Database] Found owned workspace:', ownedWorkspace);
        // Override plan_type with subscription plan_type if available
        if (ownedWorkspace.subscription && Array.isArray(ownedWorkspace.subscription) && ownedWorkspace.subscription[0]) {
          ownedWorkspace.plan_type = ownedWorkspace.subscription[0].plan_type;
        }
        const mapped = mapWorkspace(ownedWorkspace);
        logger.info('[Database] Mapped workspace:', mapped);
        return { data: [mapped], error: null };
      }

      // 2. Otherwise, use RPC to get workspace they're a member of (bypasses RLS)
      const { data: memberWorkspaces, error: memberError } = await supabase
        .rpc('get_member_workspace')

      if (memberError) {
        logger.error('[Database] Error fetching member workspace:', memberError);
        throw memberError;
      }

      // If user is a member, return that workspace
      if (memberWorkspaces && memberWorkspaces.length > 0) {
        logger.info('[Database] Found member workspace:', memberWorkspaces[0]);
        const mapped = mapWorkspace(memberWorkspaces[0]);
        logger.info('[Database] Mapped member workspace:', mapped);
        return { data: [mapped], error: null };
      }

      // 3. No workspace found - should auto-create on signup
      logger.info('[Database] No workspace found for user');
      return { data: [], error: null };
    } catch (error: any) {
      logger.error('Error fetching workspace:', error);
      logger.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      return { data: [], error }
    }
  }

  static async getWorkspaceById(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching workspace:', error)
      return { data: null, error }
    }
  }

  static async createWorkspace(userId: string, workspaceData: Omit<Tables['workspaces']['Insert'], 'owner_id'>) {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          ...workspaceData,
          owner_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        logger.error('[Database] Error creating workspace - Details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating workspace:', error)
      return { data: null, error }
    }
  }

  static async updateWorkspace(workspaceId: string, updates: Partial<Tables['workspaces']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', workspaceId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating workspace:', error)
      return { data: null, error }
    }
  }

  static async updateWorkspaceName(workspaceId: string, companyName: string) {
    try {
      const workspaceName = companyName; // Just use company name without "Workspace" suffix for cleaner UI
      const { data, error } = await supabase
        .from('workspaces')
        .update({ 
          name: workspaceName,
          updated_at: new Date().toISOString() 
        })
        .eq('id', workspaceId)
        .select()
        .single()

      if (error) throw error
      logger.info('[Database] Updated workspace name to:', workspaceName);
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating workspace name:', error)
      return { data: null, error }
    }
  }

  static async deleteWorkspace(workspaceId: string) {
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting workspace:', error)
      return { error }
    }
  }

  // Workspace member operations
  static async getWorkspaceMembers(workspaceId: string) {
    try {
      logger.info('[Database] Fetching workspace members for:', workspaceId);
      
      // Use SECURITY DEFINER function to bypass RLS and get members with profiles
      const { data: members, error: membersError } = await supabase
        .rpc('get_workspace_members_with_profiles', { p_workspace_id: workspaceId })

      if (membersError) {
        logger.error('[Database] RPC error:', membersError);
        throw membersError;
      }
      
      // Transform RPC result to match expected format
      const transformedMembers = (members || []).map((m: any) => ({
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        invited_by: m.invited_by,
        profiles: m.user_id ? {
          id: m.user_id,
          email: m.email,
          full_name: m.full_name,
          avatar_url: null // Not returned by function, would need to add if needed
        } : null
      }));
      
      logger.info('[Database] Workspace members result:', transformedMembers);
      logger.info('[Database] Workspace members FULL:', JSON.stringify(transformedMembers, null, 2));

      return { data: transformedMembers, error: null }
    } catch (error: any) {
      logger.error('Error fetching workspace members:', error)
      logger.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      return { data: [], error }
    }
  }

  static async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'member',
    invitedBy?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
          invited_by: invitedBy || null,
          joined_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error adding workspace member:', error)
      return { data: null, error }
    }
  }

  static async removeWorkspaceMember(workspaceId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error removing workspace member:', error)
      return { error }
    }
  }

  static async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: 'owner' | 'member') {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating workspace member role:', error)
      return { data: null, error }
    }
  }

  // Workspace invitation operations
  static async createWorkspaceInvitation(
    workspaceId: string,
    email: string,
    role: 'owner' | 'member' = 'member',
    sendEmail: boolean = true
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: seatStatus, error: seatError } = await this.getWorkspaceSeatStatus(workspaceId)
      if (seatError) throw seatError

      if (seatStatus) {
        const availableSeats = seatStatus.seatCount - seatStatus.usedSeats - seatStatus.pendingInvites
        if (availableSeats <= 0) {
          return {
            data: null,
            error: new Error('All seats are already allocated. Increase your seat count before inviting more members.')
          }
        }
      }

      // Get workspace and user profile for email
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .single()

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
          status: 'pending'
        })
        .select('*')
        .single()

      if (error) {
        logger.error('Supabase error creating invitation:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Send email notification if requested
      if (sendEmail && data) {
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation', {
            body: {
              email: data.email,
              workspaceName: workspace?.name || 'Untitled Workspace',
              inviterName: profile?.full_name || 'A team member',
              inviterEmail: profile?.email || user.email || '',
              role: data.role,
              token: data.token,
              expiresAt: data.expires_at
            }
          })

          if (emailError) {
            logger.warn('Failed to send invitation email:', emailError)
            // Return special flag to indicate email wasn't sent
            return { data: { ...data, emailSent: false }, error: null }
          } else {
            logger.info('Invitation email sent successfully:', emailData)
            return { data: { ...data, emailSent: true }, error: null }
          }
        } catch (emailErr) {
          logger.warn('Error sending invitation email:', emailErr)
          // Return with flag indicating email failed
          return { data: { ...data, emailSent: false }, error: null }
        }
      }

      return { data: { ...data, emailSent: false }, error: null }
    } catch (error: any) {
      logger.error('Error creating workspace invitation:', error)
      // Handle duplicate invitation error
      if (error.code === '23505') {
        return { 
          data: null, 
          error: new Error('An invitation for this email is already pending') 
        }
      }
      return { data: null, error }
    }
  }

  static async getWorkspaceInvitations(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching workspace invitations:', error)
      return { data: [], error }
    }
  }

  static async getWorkspaceSeatStatus(workspaceId: string) {
    try {
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('seat_count, used_seats')
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      if (subscriptionError) throw subscriptionError

      const { count: pendingInvites, error: inviteError } = await supabase
        .from('workspace_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')

      if (inviteError) throw inviteError

      return {
        data: {
          seatCount: subscription?.seat_count ?? 1,
          usedSeats: subscription?.used_seats ?? 0,
          pendingInvites: pendingInvites ?? 0
        },
        error: null
      }
    } catch (error) {
      logger.error('Error fetching workspace seat status:', error)
      return { data: null, error }
    }
  }

  static async getPendingInvitationsForUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's email from profiles instead of auth.users
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!profile?.email) throw new Error('User profile not found')

      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('email', profile.email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching pending invitations:', error)
      return { data: [], error }
    }
  }

  static async revokeWorkspaceInvitation(invitationId: string) {
    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error revoking workspace invitation:', error)
      return { data: null, error }
    }
  }

  static async acceptWorkspaceInvitation(token: string) {
    try {
      const { data, error } = await supabase.rpc('accept_workspace_invitation', {
        invitation_token: token
      })

      // Check if the error is a duplicate key constraint (user already member)
      if (error && error.code === '23505' && error.message?.includes('workspace_members_workspace_id_user_id_key')) {
        // User is already a member, treat as success
        return { 
          data: { 
            success: true, 
            message: 'You are already a member of this workspace' 
          }, 
          error: null 
        }
      }

      if (error) throw error
      
      // Check if the result indicates an error
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      return { data, error: null }
    } catch (error) {
      logger.error('Error accepting workspace invitation:', error)
      return { data: null, error }
    }
  }

  // Business profile operations
  static async getBusinessProfile(workspaceId: string) {
    try {
      logger.info('[DatabaseService] Fetching business profile for workspace:', workspaceId);
      
      const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .eq('workspace_id', workspaceId)

      logger.info('[DatabaseService] Business profile query result:', { data, error });

      if (error) throw error
      // Return array format for consistency with hook expectations
      return { data: data || [], error: null }
    } catch (error) {
      logger.error('Error fetching business profile:', error)
      return { data: null, error }
    }
  }

  static async createBusinessProfile(profileData: Tables['business_profile']['Insert']) {
    try {
      // Use upsert instead of insert to handle race conditions at database level
      // This prevents 409 Conflict errors when profile already exists
      const { data, error } = await supabase
        .from('business_profile')
        .upsert({
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'workspace_id',  // Unique constraint on workspace_id
          ignoreDuplicates: false       // Update on conflict instead of ignoring
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating/updating business profile:', error)
      return { data: null, error }
    }
  }

  static async updateBusinessProfile(workspaceId: string, updates: Partial<Tables['business_profile']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('business_profile')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating business profile:', error)
      return { data: null, error }
    }
  }

  static async deleteBusinessProfile(workspaceId: string) {
    try {
      const { error } = await supabase
        .from('business_profile')
        .delete()
        .eq('workspace_id', workspaceId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting business profile:', error)
      return { error }
    }
  }

  // Workspace achievements operations
  static async getWorkspaceAchievements(workspaceId: string) {
    try {
      logger.info('[Database] Fetching workspace achievements for:', workspaceId);
      const { data, error } = await supabase
        .from('workspace_achievements')
        .select(`
          *,
          profiles!workspace_achievements_unlocked_by_user_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('unlocked_at', { ascending: false })

      if (error) throw error
      
      // Map the profile data to the expected format
      const achievements = data?.map(achievement => ({
        ...achievement,
        unlockedByName: achievement.profiles?.full_name || achievement.profiles?.email || 'Unknown',
        unlockedByEmail: achievement.profiles?.email
      })) || [];
      
      logger.info('[Database] Workspace achievements loaded:', achievements.length);
      return { data: achievements, error: null }
    } catch (error) {
      logger.error('Error fetching workspace achievements:', error)
      return { data: [], error }
    }
  }

  static async createWorkspaceAchievement(achievementData: Tables['workspace_achievements']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('workspace_achievements')
        .insert({
          ...achievementData,
          unlocked_at: achievementData.unlocked_at || Date.now()
        })
        .select()
        .single()

      if (error) throw error
      logger.info('[Database] Workspace achievement created:', data);
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating workspace achievement:', error)
      return { data: null, error }
    }
  }

  // Subscription operations
  static async getSubscription(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching subscription:', error)
      return { data: null, error }
    }
  }

  static async createSubscription(subscriptionData: Tables['subscriptions']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating subscription:', error)
      return { data: null, error }
    }
  }

  static async updateSubscription(workspaceId: string, updates: Partial<Tables['subscriptions']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating subscription:', error)
      return { data: null, error }
    }
  }

  static async deleteSubscription(workspaceId: string) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('workspace_id', workspaceId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting subscription:', error)
      return { error }
    }
  }

  // Usage tracking operations
  static async checkAILimit(workspaceId: string): Promise<{ 
    allowed: boolean; 
    usage: number; 
    limit: number; 
    planType: string;
    error: any 
  }> {
    try {
      // Validate workspaceId
      if (!workspaceId) {
        logger.warn('[Database] No workspaceId provided to checkAILimit, allowing request');
        return { 
          allowed: true, 
          usage: 0, 
          limit: 20, 
          planType: 'free',
          error: null 
        };
      }

      // Check if current user is admin (bypasses all limits)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.is_admin) {
          logger.info('[Database] Admin user detected - bypassing AI limits');
          return {
            allowed: true,
            usage: 0,
            limit: 999999,
            planType: 'admin',
            error: null
          };
        }
      }

      // Get subscription for workspace
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type, ai_requests_used, ai_requests_limit, seat_count')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (subError) {
        logger.error('[Database] Subscription query error:', subError);
        throw subError;
      }

      // If no subscription exists, create one with default free plan
      if (!subscription) {
        logger.info('[Database] No subscription found, creating free plan subscription for workspace:', workspaceId);
        const { error: createError } = await supabase
          .from('subscriptions')
          .insert({
            workspace_id: workspaceId,
            plan_type: 'free',
            ai_requests_used: 0,
            ai_requests_reset_at: new Date().toISOString()
          });

        if (createError) {
          logger.error('[Database] Error creating subscription:', createError);
          // Don't throw - just use defaults
        }

        // Return free plan limits with 0 usage
        return {
          allowed: true,
          usage: 0,
          limit: 20,
          planType: 'free',
          error: null
        };
      }

      // Default to free plan if no subscription
      const planType = subscription?.plan_type || 'free';
      const currentUsage = subscription?.ai_requests_used || 0;
      const configuredLimit = subscription?.ai_requests_limit ?? Number.MAX_SAFE_INTEGER;
      const isUnlimitedPlan = subscription?.ai_requests_limit == null;
      const allowed = isUnlimitedPlan || currentUsage < configuredLimit;

      const logLimit = isUnlimitedPlan ? 'unlimited' : configuredLimit;
      logger.info(`[Database] AI Limit Check: ${currentUsage}/${logLimit} (${planType}), IsUnlimited: ${isUnlimitedPlan}, Allowed: ${allowed}`);

      return { 
        allowed, 
        usage: currentUsage,
        limit: isUnlimitedPlan ? Number.MAX_SAFE_INTEGER : configuredLimit,
        planType,
        error: null
      };
    } catch (error) {
      logger.error('[Database] Error checking AI limit:', error);
      // On error, allow request but log it - don't block users due to technical issues
      return { 
        allowed: true, 
        usage: 0, 
        limit: 20, 
        planType: 'free',
        error 
      };
    }
  }

  static async incrementAIUsage(workspaceId: string, userId?: string) {
    try {
      const { error: rpcError } = await supabase.rpc('increment_ai_usage', {
        p_workspace_id: workspaceId
      });

      if (rpcError) throw rpcError;

      logger.info('[Database] Incremented AI usage via RPC for workspace:', workspaceId);

      // Log AI usage for analytics (admin only feature)
      if (userId) {
        try {
          await supabase
            .from('ai_usage_logs')
            .insert({
              workspace_id: workspaceId,
              user_id: userId,
              timestamp: new Date().toISOString()
            });
        } catch (logError) {
          // Don't fail the whole operation if logging fails
          logger.warn('[Database] Failed to log AI usage:', logError);
        }
      }

      return { error: null };
    } catch (error) {
      logger.error('Error incrementing AI usage:', error);
      return { error };
    }
  }

  // Admin-only: Get AI usage analytics
  static async getAIUsageStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select(`
          id,
          workspace_id,
          user_id,
          timestamp,
          profiles:user_id (
            full_name,
            email
          ),
          workspaces:workspace_id (
            name
          )
        `)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching AI usage stats:', error);
      return { data: null, error };
    }
  }

  // Admin-only: Get AI usage summary by workspace
  static async getAIUsageSummaryByWorkspace(workspaceId?: string) {
    try {
      let query = supabase
        .from('ai_usage_logs')
        .select('workspace_id, user_id, timestamp');

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by workspace and user
      const summary: Record<string, Record<string, number>> = {};
      data?.forEach(log => {
        if (!summary[log.workspace_id]) {
          summary[log.workspace_id] = {};
        }
        if (!summary[log.workspace_id][log.user_id]) {
          summary[log.workspace_id][log.user_id] = 0;
        }
        summary[log.workspace_id][log.user_id]++;
      });

      return { data: summary, error: null };
    } catch (error) {
      logger.error('Error fetching AI usage summary:', error);
      return { data: null, error };
    }
  }

  // Get subscription with usage data
  static async getSubscriptionUsage(workspaceId: string) {
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan_type, ai_requests_used, ai_requests_limit, storage_bytes_used, storage_bytes_limit, file_count_used, file_count_limit, seat_count, used_seats')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) throw error;

      // If no subscription exists, return default free plan data
      if (!subscription) {
        return {
          data: {
            planType: 'free' as const,
            aiRequestsUsed: 0,
            aiRequestsLimit: 0,
            storageUsed: 0,
            storageLimit: 104857600, // 100 MB
            fileCountUsed: 0,
            fileCountLimit: 0,
            seatCount: 1,
            usedSeats: 1
          },
          error: null
        };
      }

      return {
        data: {
          planType: subscription.plan_type,
          aiRequestsUsed: subscription.ai_requests_used || 0,
          aiRequestsLimit: subscription.ai_requests_limit,
          storageUsed: subscription.storage_bytes_used || 0,
          storageLimit: subscription.storage_bytes_limit,
          fileCountUsed: subscription.file_count_used || 0,
          fileCountLimit: subscription.file_count_limit,
          seatCount: subscription.seat_count || 1,
          usedSeats: subscription.used_seats || 1
        },
        error: null
      };
    } catch (error) {
      logger.error('Error fetching subscription usage:', error);
      return { data: null, error };
    }
  }

  // Increment file count when files are uploaded
  static async incrementFileCount(workspaceId: string, fileSizeBytes: number) {
    try {
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('file_count_used, storage_bytes_used')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const newFileCount = (subscription?.file_count_used || 0) + 1;
      const newStorageUsed = (subscription?.storage_bytes_used || 0) + fileSizeBytes;

      if (!subscription) {
        // Create subscription if it doesn't exist
        const { error: createError } = await supabase
          .from('subscriptions')
          .insert({
            workspace_id: workspaceId,
            plan_type: 'free',
            file_count_used: 1,
            storage_bytes_used: fileSizeBytes
          });

        if (createError) throw createError;
      } else {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            file_count_used: newFileCount,
            storage_bytes_used: newStorageUsed,
            updated_at: new Date().toISOString()
          })
          .eq('workspace_id', workspaceId);

        if (updateError) throw updateError;
      }

      logger.info('[Database] Incremented file count:', newFileCount, 'Storage:', newStorageUsed);
      return { error: null };
    } catch (error) {
      logger.error('Error incrementing file count:', error);
      return { error };
    }
  }

  // Decrement file count when files are deleted
  static async decrementFileCount(workspaceId: string, fileSizeBytes: number) {
    try {
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('file_count_used, storage_bytes_used')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!subscription) return { error: null }; // Nothing to decrement

      const newFileCount = Math.max(0, (subscription.file_count_used || 0) - 1);
      const newStorageUsed = Math.max(0, (subscription.storage_bytes_used || 0) - fileSizeBytes);

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          file_count_used: newFileCount,
          storage_bytes_used: newStorageUsed,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId);

      if (updateError) throw updateError;

      logger.info('[Database] Decremented file count:', newFileCount, 'Storage:', newStorageUsed);
      return { error: null };
    } catch (error) {
      logger.error('Error decrementing file count:', error);
      return { error };
    }
  }

  static async checkStorageLimit(workspaceId: string, fileSizeBytes: number) {
    try {
      const { data, error } = await supabase.rpc('check_storage_limit', {
        p_workspace_id: workspaceId,
        p_file_size_bytes: fileSizeBytes
      })

      if (error) throw error
      return { data: data as boolean, error: null }
    } catch (error) {
      logger.error('Error checking storage limit:', error)
      return { data: false, error }
    }
  }

  static async updateStorageUsage(workspaceId: string, bytesDelta: number, fileCountDelta: number) {
    try {
      const { error } = await supabase.rpc('update_storage_usage', {
        p_workspace_id: workspaceId,
        p_bytes_delta: bytesDelta,
        p_file_count_delta: fileCountDelta
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error updating storage usage:', error)
      return { error }
    }
  }

  // Workspace achievement operations (already defined above - remove duplicate)
  static async unlockWorkspaceAchievement(
    workspaceId: string,
    achievementId: string,
    unlockedByUserId: string,
    metadata?: Record<string, any>
  ) {
    try {
      // First, insert the achievement
      const { data: achievement, error: insertError } = await supabase
        .from('workspace_achievements')
        .insert({
          workspace_id: workspaceId,
          achievement_id: achievementId,
          unlocked_by_user_id: unlockedByUserId,
          unlocked_at: new Date().toISOString(),
          metadata: metadata || {}
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Then, update workspace XP and level
      // Get the XP reward for this achievement (will be calculated by caller)
      return { data: achievement, error: null }
    } catch (error) {
      logger.error('Error unlocking workspace achievement:', error)
      return { data: null, error }
    }
  }

  static async checkWorkspaceAchievement(workspaceId: string, achievementId: string) {
    try {
      const { data, error } = await supabase
        .from('workspace_achievements')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('achievement_id', achievementId)
        .maybeSingle()

      if (error) throw error
      return { exists: !!data, error: null }
    } catch (error) {
      logger.error('Error checking workspace achievement:', error)
      return { exists: false, error }
    }
  }

  static async updateWorkspaceXpAndLevel(workspaceId: string, xpToAdd: number) {
    try {
      // Get current workspace data
      const { data: workspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('team_xp, team_level')
        .eq('id', workspaceId)
        .single()

      if (fetchError) throw fetchError

      const newXp = (workspace.team_xp || 0) + xpToAdd

      // Calculate new level (will be done by caller using calculateTeamLevel)
      const { data, error } = await supabase
        .from('workspaces')
        .update({
          team_xp: newXp,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating workspace XP:', error)
      return { data: null, error }
    }
  }

  // Meeting operations
  static async getMeetings(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('timestamp', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error fetching meetings:', error)
      return { data: [], error }
    }
  }

  static async createMeeting(userId: string, workspaceId: string, meetingData: Omit<Tables['meetings']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert({ ...meetingData, user_id: userId, workspace_id: workspaceId })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error creating meeting:', error)
      return { data: null, error }
    }
  }

  static async updateMeeting(meetingId: string, updates: Partial<Tables['meetings']['Update']>) {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      logger.error('Error updating meeting:', error)
      return { data: null, error }
    }
  }

  static async deleteMeeting(meetingId: string) {
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      logger.error('Error deleting meeting:', error)
      return { error }
    }
  }

  // Utility function to fetch all dashboard data
  static async getAllDashboardData(userId: string, workspaceId?: string): Promise<{ data: Partial<DashboardData> | null, error: any }> {
    try {
      // If no workspaceId provided, we can't fetch workspace-scoped data
      if (!workspaceId) {
        logger.warn('[getAllDashboardData] No workspaceId provided, returning empty data');
        return { data: {}, error: null };
      }

      const [
        tasksResult,
        crmItemsResult,
        contactsResult,
        meetingsResult,
        marketingItemsResult,
        financialLogsResult,
        documentsResult,
        expensesResult,
        profileResult
      ] = await Promise.all([
        this.getTasks(userId, workspaceId),
        this.getCrmItems(workspaceId),
        this.getContacts(workspaceId),
        this.getMeetings(workspaceId),
        this.getMarketingItems(workspaceId),
        this.getFinancialLogs(workspaceId),
        this.getDocuments(workspaceId),
        this.getExpenses(workspaceId),
        this.getUserProfile(userId)
      ])

      // Transform data to match existing types
      const crmItems = crmItemsResult.data || [];
      const allContacts = contactsResult.data || [];
      const allMeetings = meetingsResult.data || [];

      // Use centralized transformers for type-safe conversions
      const allTasks = dbToTasks(tasksResult.data || []);
      const allMarketingItems = dbToMarketingItems(marketingItemsResult.data || []);
      const allFinancialLogs = dbToFinancialLogs(financialLogsResult.data || []);

      // Transform documents
      const transformDocument = (dbDoc: any): Document => ({
        id: dbDoc.id,
        name: dbDoc.name,
        mimeType: dbDoc.mime_type,
        content: dbDoc.content,
        uploadedAt: new Date(dbDoc.uploaded_at).getTime(),
        module: dbDoc.module,
        companyId: dbDoc.company_id || undefined,
        contactId: dbDoc.contact_id || undefined,
        notes: dbDoc.notes || [],
      });

      const allDocuments = (documentsResult.data || []).map(transformDocument);

      // Attach contacts to CRM items and transform to app format
      const crmItemsWithContacts = crmItems.map(item => {
        const itemContacts = allContacts
          .filter(c => c.crm_item_id === item.id)
          .map(contact => {
            const contactMeetings = allMeetings.filter(m => m.contact_id === contact.id);
            return {
              id: contact.id,
              crmItemId: contact.crm_item_id,
              name: contact.name,
              email: contact.email,
              linkedin: contact.linkedin,
              notes: contact.notes || [],
              assignedTo: contact.assigned_to || undefined,
              assignedToName: contact.assigned_to_name || undefined,
              createdByName: contact.created_by_name || undefined,
              meetings: contactMeetings.map(m => ({
                id: m.id,
                timestamp: new Date(m.timestamp).getTime(),
                title: m.title,
                attendees: m.attendees,
                summary: m.summary
              }))
            };
          });

        return {
          id: item.id,
          company: item.company,
          type: item.type, // Preserve the type for filtering
          contacts: itemContacts,
          priority: item.priority as Priority,
          status: item.status,
          nextAction: item.next_action || undefined,
          nextActionDate: item.next_action_date || undefined,
          nextActionTime: item.next_action_time || undefined,
          createdAt: new Date(item.created_at).getTime(),
          notes: item.notes || [],
          checkSize: item.check_size || undefined,
          dealValue: item.deal_value || undefined,
          opportunity: item.opportunity || undefined,
          assignedTo: item.assigned_to || undefined,
          assignedToName: item.assigned_to_name || undefined
        };
      });

      // Transform expenses from database format to app format
      const allExpenses = (expensesResult.data || []).map(dbExpense => ({
        id: dbExpense.id,
        date: dbExpense.date,
        category: dbExpense.category as any,
        amount: Number(dbExpense.amount),
        description: dbExpense.description,
        vendor: dbExpense.vendor || undefined,
        paymentMethod: dbExpense.payment_method as any || undefined,
        receiptDocumentId: dbExpense.receipt_document_id || undefined,
        notes: dbExpense.notes || []
      }));

      const dashboardData: Partial<DashboardData> = {
        productsServicesTasks: allTasks.filter(t => (t as any).category === 'productsServicesTasks' || tasksResult.data?.find(dt => dt.id === t.id)?.category === 'productsServicesTasks'),
        investorTasks: allTasks.filter(t => tasksResult.data?.find(dt => dt.id === t.id)?.category === 'investorTasks'),
        customerTasks: allTasks.filter(t => tasksResult.data?.find(dt => dt.id === t.id)?.category === 'customerTasks'),
        partnerTasks: allTasks.filter(t => tasksResult.data?.find(dt => dt.id === t.id)?.category === 'partnerTasks'),
        marketingTasks: allTasks.filter(t => tasksResult.data?.find(dt => dt.id === t.id)?.category === 'marketingTasks'),
        financialTasks: allTasks.filter(t => tasksResult.data?.find(dt => dt.id === t.id)?.category === 'financialTasks'),
        
        investors: crmItemsWithContacts.filter(item => (item as any).type === 'investor') as any[],
        customers: crmItemsWithContacts.filter(item => (item as any).type === 'customer') as any[],
        partners: crmItemsWithContacts.filter(item => (item as any).type === 'partner') as any[],
        
        marketing: allMarketingItems,
        financials: allFinancialLogs,
        expenses: allExpenses,
        documents: allDocuments,
        
        settings: profileResult.data?.settings as SettingsData || { desktopNotifications: false }
      }

      // Debug logging for CRM items
      logger.info('[Database] Loaded CRM items:', {
        totalCrmItems: crmItems.length,
        investors: dashboardData.investors?.length,
        customers: dashboardData.customers?.length,
        partners: dashboardData.partners?.length,
        crmItemTypes: crmItems.map(i => ({ id: i.id, type: i.type, company: i.company }))
      });

      return { data: dashboardData, error: null }
    } catch (error) {
      logger.error('Error fetching dashboard data:', error)
      return { data: null, error }
    }
  }

  // ============================================================================
  // GTM Docs Operations
  // ============================================================================

  static async loadGTMDocs(workspaceId: string, options?: {
    filter?: 'all' | 'mine' | 'team' | 'templates',
    docType?: string,
    userId?: string
  }) {
    try {
      let query = supabase
        .from('gtm_docs')
        .select('id, workspace_id, owner_id, created_at, updated_at, title, doc_type, visibility, is_template, template_category, tags')
        .eq('workspace_id', workspaceId)

      // Apply filters
      if (options?.filter === 'mine' && options?.userId) {
        query = query.eq('owner_id', options.userId)
      } else if (options?.filter === 'templates') {
        query = query.eq('is_template', true)
      }

      if (options?.docType && options.docType !== 'all') {
        query = query.eq('doc_type', options.docType)
      }

      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) throw error

      // Transform to camelCase
      const docs = data?.map(dbDoc => ({
        id: dbDoc.id,
        workspaceId: dbDoc.workspace_id,
        ownerId: dbDoc.owner_id,
        createdAt: dbDoc.created_at,
        updatedAt: dbDoc.updated_at,
        title: dbDoc.title,
        docType: dbDoc.doc_type,
        visibility: dbDoc.visibility,
        isTemplate: dbDoc.is_template,
        templateCategory: dbDoc.template_category,
        tags: dbDoc.tags || [],
      })) || []

      return { data: docs, error: null }
    } catch (error) {
      logger.error('Error loading GTM docs:', error)
      return { data: null, error }
    }
  }

  static async loadGTMDocById(docId: string, workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('gtm_docs')
        .select('*')
        .eq('id', docId)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) throw error

      // Transform to camelCase
      const doc = {
        id: data.id,
        workspaceId: data.workspace_id,
        ownerId: data.owner_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        title: data.title,
        docType: data.doc_type,
        contentJson: data.content_json,
        contentPlain: data.content_plain,
        visibility: data.visibility,
        isTemplate: data.is_template,
        templateCategory: data.template_category,
        tags: data.tags || [],
      }

      return { data: doc, error: null }
    } catch (error) {
      logger.error('Error loading GTM doc:', error)
      return { data: null, error }
    }
  }

  static async createGTMDoc(docData: {
    workspaceId: string,
             userId: string,
    title: string,
    docType: string,
    contentJson?: any,
    contentPlain?: string,
    visibility?: 'private' | 'team',
    isTemplate?: boolean,
    templateCategory?: string,
    tags?: string[]
  }) {
    try {
      const { data, error } = await supabase
        .from('gtm_docs')
        .insert({
          workspace_id: docData.workspaceId,
          owner_id: docData.userId,
          title: docData.title,
          doc_type: docData.docType,
          content_json: docData.contentJson || null,
          content_plain: docData.contentPlain || '',
          visibility: docData.visibility || 'team',
          is_template: docData.isTemplate || false,
          template_category: docData.templateCategory || null,
          tags: docData.tags || [],
        })
        .select()
        .single()

      if (error) throw error

      // Transform to camelCase
      const doc = {
        id: data.id,
        workspaceId: data.workspace_id,
        ownerId: data.owner_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        title: data.title,
        docType: data.doc_type,
        contentJson: data.content_json,
        contentPlain: data.content_plain,
        visibility: data.visibility,
        isTemplate: data.is_template,
        templateCategory: data.template_category,
        tags: data.tags || [],
      }

      logger.info('[Database] Created GTM doc:', { docId: doc.id, title: doc.title })
      return { data: doc, error: null }
    } catch (error) {
      logger.error('Error creating GTM doc:', error)
      return { data: null, error }
    }
  }

  static async updateGTMDoc(docId: string, workspaceId: string, updates: {
    title?: string,
    docType?: string,
    contentJson?: any,
    contentPlain?: string,
    visibility?: 'private' | 'team',
    tags?: string[],
    isTemplate?: boolean,
    templateCategory?: string | null
  }) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.docType !== undefined) updateData.doc_type = updates.docType
      if (updates.contentJson !== undefined) updateData.content_json = updates.contentJson
      if (updates.contentPlain !== undefined) updateData.content_plain = updates.contentPlain
      if (updates.visibility !== undefined) updateData.visibility = updates.visibility
      if (updates.tags !== undefined) updateData.tags = updates.tags
      if (updates.isTemplate !== undefined) updateData.is_template = updates.isTemplate
      if (updates.templateCategory !== undefined) updateData.template_category = updates.templateCategory

      const { data, error } = await supabase
        .from('gtm_docs')
        .update(updateData)
        .eq('id', docId)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) throw error

      // Transform to camelCase
      const doc = {
        id: data.id,
        workspaceId: data.workspace_id,
        ownerId: data.owner_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        title: data.title,
        docType: data.doc_type,
        contentJson: data.content_json,
        contentPlain: data.content_plain,
        visibility: data.visibility,
        isTemplate: data.is_template,
        templateCategory: data.template_category,
        tags: data.tags || [],
      }

      logger.info('[Database] Updated GTM doc:', { docId: doc.id })
      return { data: doc, error: null }
    } catch (error) {
      logger.error('Error updating GTM doc:', error)
      return { data: null, error }
    }
  }

  static async deleteGTMDoc(docId: string, workspaceId: string) {
    try {
      const { error } = await supabase
        .from('gtm_docs')
        .delete()
        .eq('id', docId)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      logger.info('[Database] Deleted GTM doc:', { docId })
      return { data: true, error: null }
    } catch (error) {
      logger.error('Error deleting GTM doc:', error)
      return { data: false, error }
    }
  }

  static async searchGTMDocs(workspaceId: string, searchQuery: string) {
    try {
      // Use full-text search with ts_rank for relevance
      const { data, error } = await supabase
        .rpc('search_gtm_docs', {
          workspace_id_param: workspaceId,
          search_query: searchQuery
        })

      if (error) throw error

      // Transform to camelCase
      const docs = data?.map((dbDoc: any) => ({
        id: dbDoc.id,
        workspaceId: dbDoc.workspace_id,
        ownerId: dbDoc.owner_id,
        createdAt: dbDoc.created_at,
        updatedAt: dbDoc.updated_at,
        title: dbDoc.title,
        docType: dbDoc.doc_type,
        visibility: dbDoc.visibility,
        isTemplate: dbDoc.is_template,
        tags: dbDoc.tags || [],
      })) || []

      return { data: docs, error: null }
    } catch (error) {
      // Fallback to basic ILIKE search if RPC function doesn't exist yet
      logger.warn('Full-text search not available, falling back to ILIKE:', error)
      
      const { data, error: fallbackError } = await supabase
        .from('gtm_docs')
        .select('id, workspace_id, owner_id, created_at, updated_at, title, doc_type, visibility, is_template, tags')
        .eq('workspace_id', workspaceId)
        .or(`title.ilike.%${searchQuery}%,content_plain.ilike.%${searchQuery}%`)
        .order('updated_at', { ascending: false })

      if (fallbackError) throw fallbackError

      const docs = data?.map(dbDoc => ({
        id: dbDoc.id,
        workspaceId: dbDoc.workspace_id,
        ownerId: dbDoc.owner_id,
        createdAt: dbDoc.created_at,
        updatedAt: dbDoc.updated_at,
        title: dbDoc.title,
        docType: dbDoc.doc_type,
        visibility: dbDoc.visibility,
        isTemplate: dbDoc.is_template,
        tags: dbDoc.tags || [],
      })) || []

      return { data: docs, error: null }
    }
  }

  static async linkDocToEntity(docId: string, workspaceId: string, entityType: 'task' | 'event' | 'crm' | 'chat' | 'contact', entityId: string) {
    try {
      // Verify doc belongs to workspace before linking
      const { data: doc } = await supabase
        .from('gtm_docs')
        .select('workspace_id')
        .eq('id', docId)
        .eq('workspace_id', workspaceId)
        .single()
      
      if (!doc) {
        throw new Error('Document not found or access denied')
      }

      const { data, error } = await supabase
        .from('gtm_doc_links')
        .insert({
          doc_id: docId,
          linked_entity_type: entityType,
          linked_entity_id: entityId
        })
        .select()
        .single()

      if (error) throw error

      logger.info('[Database] Linked GTM doc:', { docId, entityType, entityId, workspaceId })
      return { data: { linkId: data.id }, error: null }
    } catch (error) {
      logger.error('Error linking GTM doc:', error)
      return { data: false, error }
    }
  }

  static async unlinkDocFromEntity(linkId: string) {
    try {
      const { error } = await supabase
        .from('gtm_doc_links')
        .delete()
        .eq('id', linkId)

      if (error) throw error

      logger.info('[Database] Unlinked GTM doc:', { linkId })
      return { data: true, error: null }
    } catch (error) {
      logger.error('Error unlinking GTM doc:', error)
      return { data: false, error }
    }
  }

  static async getLinkedDocs(entityType: 'task' | 'event' | 'crm' | 'chat' | 'contact', entityId: string) {
    try {
      const { data, error } = await supabase
        .from('gtm_doc_links')
        .select(`
          id,
          doc_id,
          created_at,
          gtm_docs (
            id,
            workspace_id,
            owner_id,
            created_at,
            updated_at,
            title,
            doc_type,
            visibility,
            is_template,
            tags
          )
        `)
        .eq('linked_entity_type', entityType)
        .eq('linked_entity_id', entityId)

      if (error) throw error

      // Transform to camelCase with LinkedDoc structure
      const linkedDocs = data?.map((link: any) => ({
        id: link.gtm_docs.id,
        workspaceId: link.gtm_docs.workspace_id,
        ownerId: link.gtm_docs.owner_id,
        createdAt: link.gtm_docs.created_at,
        updatedAt: link.gtm_docs.updated_at,
        title: link.gtm_docs.title,
        docType: link.gtm_docs.doc_type,
        visibility: link.gtm_docs.visibility,
        isTemplate: link.gtm_docs.is_template,
        tags: link.gtm_docs.tags || [],
        linkedAt: link.created_at,
        linkId: link.id,
      })) || []

      return { data: linkedDocs, error: null }
    } catch (error) {
      logger.error('Error loading linked docs:', error)
      return { data: null, error }
    }
  }

  // ============================================================================
  // GTM Template Seeding
  // ============================================================================

  static async seedGTMTemplates(workspaceId: string, userId: string) {
    try {
      // Get existing templates by title
      const { data: existing } = await supabase
        .from('gtm_docs')
        .select('title')
        .eq('workspace_id', workspaceId)
        .eq('is_template', true)

      const existingTitles = new Set((existing || []).map(t => t.title))

      const templates = [
        {
          title: 'GTM Launch Brief Template',
          doc_type: 'brief',
          template_category: 'launch',
          tags: ['template', 'gtm', 'launch', 'brief'],
          content_plain: 'GTM Launch Brief\n\nExecutive Summary\n[Brief overview of the product/feature launch and key objectives]\n\nProduct Positioning\nValue Proposition: [What unique value does this provide?]\nPositioning Statement: [For WHO, our product does WHAT, unlike COMPETITORS]\n\nTarget Audience\n• Primary: [Define primary audience]\n• Secondary: [Define secondary audience]\n• Pain points: [Key challenges we solve]\n\nKey Messaging\nCore Message: [One-sentence core message]\nSupporting Messages:\n1. [Message pillar 1]\n2. [Message pillar 2]\n3. [Message pillar 3]\n\nChannel Strategy\n• Content marketing\n• Email campaigns\n• Social media\n• Sales enablement\n\nSuccess Metrics\n• Awareness\n• Engagement\n• Conversion\n• Revenue',
        },
        {
          title: 'Ideal Customer Profile (ICP) Template',
          doc_type: 'icp_sheet',
          template_category: 'targeting',
          tags: ['template', 'icp', 'targeting', 'qualification'],
          content_plain: 'Ideal Customer Profile (ICP)\n\nCompany Profile\n• Industry: [Target industries]\n• Company Size: [Employee count]\n• Revenue: [ARR range]\n• Geography: [Target regions]\n• Tech Stack: [Technologies they use]\n\nPain Points & Challenges\n1. [Key pain point 1]\n2. [Key pain point 2]\n3. [Key pain point 3]\n\nDecision Makers\n• Economic Buyer\n• Technical Buyer\n• Champion\n\nBuying Process\nTypical Timeline: [Sales cycle]\nEvaluation Criteria:\n• [Criterion 1]\n• [Criterion 2]\n• [Criterion 3]',
        },
        {
          title: 'Campaign Plan Template',
          doc_type: 'campaign',
          template_category: 'campaign',
          tags: ['template', 'campaign', 'marketing', 'planning'],
          content_plain: 'Campaign Plan\n\nCampaign Overview\nGoal: [What are we trying to achieve?]\nTarget Audience: [Who are we targeting?]\nDuration: [Start - End date]\n\nKey Objectives & KPIs\n• Objective 1: [Measurable goal]\n• Objective 2: [Measurable goal]\n• Objective 3: [Measurable goal]\n\nCampaign Tactics\nContent: [Blog, guides, videos]\nEmail: [Sequences, newsletters]\nSocial Media: [Platform tactics]\nPaid Media: [Ad platforms, budget]\n\nBudget: $[Amount]\n\nTimeline & Milestones',
        },
        {
          title: 'Competitive Battlecard Template',
          doc_type: 'battlecard',
          template_category: 'competitive',
          tags: ['template', 'battlecard', 'competitive', 'sales'],
          content_plain: 'Competitive Battlecard: [Competitor Name]\n\nCompetitor Overview\n• Founded: [Year]\n• Size: [Company size]\n• Funding: [Total raised]\n• Target Market: [Their focus]\n\nOur Advantages\n1. [Key differentiator 1]\n2. [Key differentiator 2]\n3. [Key differentiator 3]\n\nTheir Weaknesses\n• [Weakness 1]\n• [Weakness 2]\n• [Weakness 3]\n\nCommon Objections & Responses\nObjection: [What they say]\nResponse: [How we respond]\n\nWin Stories\n[Recent competitive wins]',
        },
        {
          title: 'Buyer Persona Template',
          doc_type: 'persona',
          template_category: 'persona',
          tags: ['template', 'persona', 'buyer', 'targeting'],
          content_plain: 'Buyer Persona: [Persona Name]\n\nDemographics\n• Title: [Job title]\n• Department: [Department]\n• Company Size: [Size range]\n• Industry: [Industries]\n\nGoals & Objectives\n1. [Primary goal]\n2. [Secondary goal]\n3. [Success metrics]\n\nChallenges & Pain Points\n• [Challenge 1]\n• [Challenge 2]\n• [Challenge 3]\n\nA Day in the Life\n[Typical workflow and tasks]\n\nHow We Help\n[How our product solves their problems]\n\nPreferred Channels\n• [Where they consume content]',
        },
      ];

      // Filter out templates that already exist
      const templatesToCreate = templates.filter(t => !existingTitles.has(t.title))
      
      if (templatesToCreate.length === 0) {
        logger.info('[Database] All templates already exist for workspace:', { workspaceId })
        return { data: { message: 'All templates already exist', count: existingTitles.size }, error: null }
      }

      const results = await Promise.all(
        templatesToCreate.map(template =>
          supabase
            .from('gtm_docs')
            .insert({
              workspace_id: workspaceId,
              owner_id: userId,
              title: template.title,
              doc_type: template.doc_type,
              content_json: null, // Let users fill in content
              content_plain: template.content_plain,
              visibility: 'team',
              is_template: true,
              template_category: template.template_category,
              tags: template.tags,
            })
            .select()
        )
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        logger.error('[Database] Error seeding some templates:', errors);
      }

      const successCount = results.filter(r => !r.error).length;
      logger.info('[Database] Seeded GTM templates:', { workspaceId, count: successCount });

      return { data: { message: 'Templates seeded successfully', count: successCount }, error: null };
    } catch (error) {
      logger.error('Error seeding GTM templates:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // FINANCIAL ENHANCEMENTS
  // ============================================================================

  static async getRevenueTransactions(workspaceId: string, filters?: any) {
    try {
      let query = supabase
        .from('revenue_transactions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('transaction_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching revenue transactions:', error);
      return { data: null, error };
    }
  }

  static async createRevenueTransaction(transaction: Tables['revenue_transactions']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('revenue_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      logger.info('[Database] Created revenue transaction:', { id: data.id });
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating revenue transaction:', error);
      return { data: null, error };
    }
  }

  static async updateRevenueTransaction(id: string, updates: Tables['revenue_transactions']['Update']) {
    try {
      const { data, error } = await supabase
        .from('revenue_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating revenue transaction:', error);
      return { data: null, error };
    }
  }

  static async deleteRevenueTransaction(id: string) {
    try {
      const { error } = await supabase
        .from('revenue_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting revenue transaction:', error);
      return { data: false, error };
    }
  }

  static async getFinancialForecasts(workspaceId: string, forecastType?: string) {
    try {
      let query = supabase
        .from('financial_forecasts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('forecast_month', { ascending: true });

      if (forecastType) {
        query = query.eq('forecast_type', forecastType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching financial forecasts:', error);
      return { data: null, error };
    }
  }

  static async createFinancialForecast(forecast: Tables['financial_forecasts']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('financial_forecasts')
        .insert([forecast])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating financial forecast:', error);
      return { data: null, error };
    }
  }

  static async getBudgetPlans(workspaceId: string, activePlansOnly = false) {
    try {
      let query = supabase
        .from('budget_plans')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('budget_period_start', { ascending: false });

      if (activePlansOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .lte('budget_period_start', today)
          .gte('budget_period_end', today);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching budget plans:', error);
      return { data: null, error };
    }
  }

  static async createBudgetPlan(budget: Tables['budget_plans']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('budget_plans')
        .insert([budget])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating budget plan:', error);
      return { data: null, error };
    }
  }

  static async updateBudgetPlan(id: string, updates: Tables['budget_plans']['Update']) {
    try {
      const { data, error } = await supabase
        .from('budget_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating budget plan:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // MARKETING ENHANCEMENTS
  // ============================================================================

  static async getCampaignAttributions(workspaceId: string, filters?: any) {
    try {
      let query = supabase
        .from('campaign_attribution')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('interaction_date', { ascending: false });

      if (filters?.marketingItemId) {
        query = query.eq('marketing_item_id', filters.marketingItemId);
      }
      if (filters?.crmItemId) {
        query = query.eq('crm_item_id', filters.crmItemId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching campaign attributions:', error);
      return { data: null, error };
    }
  }

  static async createCampaignAttribution(attribution: Tables['campaign_attribution']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('campaign_attribution')
        .insert([attribution])
        .select()
        .single();

      if (error) throw error;
      logger.info('[Database] Created campaign attribution:', { id: data.id });
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating campaign attribution:', error);
      return { data: null, error };
    }
  }

  static async updateCampaignAttribution(id: string, updates: Tables['campaign_attribution']['Update']) {
    try {
      const { data, error } = await supabase
        .from('campaign_attribution')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating campaign attribution:', error);
      return { data: null, error };
    }
  }

  static async deleteCampaignAttribution(id: string) {
    try {
      const { error } = await supabase
        .from('campaign_attribution')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting campaign attribution:', error);
      return { data: false, error };
    }
  }

  static async getMarketingAnalytics(workspaceId: string, filters?: any) {
    try {
      let query = supabase
        .from('marketing_analytics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('analytics_date', { ascending: false });

      if (filters?.marketingItemId) {
        query = query.eq('marketing_item_id', filters.marketingItemId);
      }
      if (filters?.startDate) {
        query = query.gte('analytics_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('analytics_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching marketing analytics:', error);
      return { data: null, error };
    }
  }

  static async createMarketingAnalytics(analytics: Tables['marketing_analytics']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('marketing_analytics')
        .insert([analytics])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating marketing analytics:', error);
      return { data: null, error };
    }
  }

  static async updateMarketingAnalytics(id: string, updates: Tables['marketing_analytics']['Update']) {
    try {
      const { data, error } = await supabase
        .from('marketing_analytics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating marketing analytics:', error);
      return { data: null, error };
    }
  }

  static async deleteMarketingAnalytics(id: string) {
    try {
      const { error } = await supabase
        .from('marketing_analytics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting marketing analytics:', error);
      return { data: false, error };
    }
  }

  static async getMarketingCalendarLinks(workspaceId: string, marketingItemId?: string) {
    try {
      let query = supabase
        .from('marketing_calendar_links')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (marketingItemId) {
        query = query.eq('marketing_item_id', marketingItemId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching marketing calendar links:', error);
      return { data: null, error };
    }
  }

  static async createMarketingCalendarLink(link: Tables['marketing_calendar_links']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('marketing_calendar_links')
        .insert([link])
        .select()
        .single();

      if (error) throw error;
      logger.info('[Database] Created marketing calendar link:', { id: data.id });
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating marketing calendar link:', error);
      return { data: null, error };
    }
  }

  static async deleteMarketingCalendarLink(id: string) {
    try {
      const { error } = await supabase
        .from('marketing_calendar_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting marketing calendar link:', error);
      return { data: false, error };
    }
  }

  // ===== DEAL/OPPORTUNITY MANAGEMENT =====
  
  static async getDeals(workspaceId: string, filters?: { stage?: string; category?: string; assignedTo?: string }) {
    try {
      let query = supabase
        .from('deals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching deals:', error);
      return { data: null, error };
    }
  }

  static async createDeal(deal: Tables['deals']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('deals')
        .insert([deal])
        .select()
        .single();

      if (error) throw error;
      logger.info('[Database] Created deal:', { id: data.id, title: deal.title });
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating deal:', error);
      return { data: null, error };
    }
  }

  static async updateDeal(id: string, updates: Tables['deals']['Update']) {
    try {
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      logger.info('[Database] Updated deal:', { id });
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating deal:', error);
      return { data: null, error };
    }
  }

  static async deleteDeal(id: string) {
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      logger.info('[Database] Deleted deal:', { id });
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting deal:', error);
      return { data: false, error };
    }
  }

  static async getDeal(dealId: string) {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching deal:', error);
      return { data: null, error };
    }
  }

  // ============================================================================
  // PRODUCTS & SERVICES
  // ============================================================================

  static async getProductsServices(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching products/services:', error);
      return { data: null, error };
    }
  }

  static async getProductService(id: string) {
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching product/service:', error);
      return { data: null, error };
    }
  }

  static async createProductService(product: any) {
    try {
      const { data, error } = await supabase
        .from('products_services')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating product/service:', error);
      return { data: null, error };
    }
  }

  static async updateProductService(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('products_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating product/service:', error);
      return { data: null, error };
    }
  }

  static async deleteProductService(id: string) {
    try {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting product/service:', error);
      return { data: false, error };
    }
  }

  static async getProductPriceHistory(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('product_price_history')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching price history:', error);
      return { data: null, error };
    }
  }

  static async getProductBundles(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching product bundles:', error);
      return { data: null, error };
    }
  }

  static async reserveInventory(id: string, quantity: number) {
    return { data: true, error: null };
  }

  static async releaseInventory(id: string, quantity: number) {
    return { data: true, error: null };
  }

  static async updateInventory(id: string, quantityChange: number, reason: string) {
    return { data: true, error: null };
  }
}