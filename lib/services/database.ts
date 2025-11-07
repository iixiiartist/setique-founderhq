import { supabase } from '../supabase'
import { Database } from '../types/database'
import { DashboardData, Task, AnyCrmItem, Contact, Meeting, MarketingItem, FinancialLog, Document, SettingsData, GamificationData, Priority } from '../../types'
import { dbToTasks, dbToMarketingItems, dbToFinancialLogs, dbToCrmItem, dbToContacts } from '../utils/fieldTransformers'

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
      console.error('Error fetching user profile:', error)
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
      console.error('Error creating profile:', error)
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
      console.error('Error updating user profile:', error)
      return { data: null, error }
    }
  }

  // Task operations
  static async getTasks(userId: string, workspaceId?: string) {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
      
      // If workspaceId provided, fetch all tasks in the workspace
      // Otherwise, fetch user's personal tasks (backwards compatibility)
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      } else {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })

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
      })) || []
      
      return { data: transformedData, error: null }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return { data: [], error }
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
      console.error('Error fetching task by ID:', error)
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
      
      console.log('[Database] Creating task with data:', insertData);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('[Database] Task creation error:', error);
        throw error;
      }
      
      console.log('[Database] Task created successfully:', data);
      return { data, error: null }
    } catch (error) {
      console.error('Error creating task:', error)
      return { data: null, error }
    }
  }

  static async updateTask(taskId: string, updates: Partial<Tables['tasks']['Update']>) {
    try {
      console.log('[Database] updateTask called with:', { taskId, updates });
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('[Database] updateTask error:', error);
        throw error;
      }
      
      console.log('[Database] updateTask success:', data);
      return { data, error: null }
    } catch (error) {
      console.error('Error updating task:', error)
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
      console.error('Error deleting task:', error)
      return { error }
    }
  }

  // CRM Items operations
  static async getCrmItems(workspaceId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_items')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching CRM items:', error)
      return { data: [], error }
    }
  }

  static async getCrmItemById(itemId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching CRM item by ID:', error)
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
      console.error('Error creating CRM item:', error)
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
      console.error('Error updating CRM item:', error)
      return { data: null, error }
    }
  }

  static async deleteCrmItem(itemId: string) {
    try {
      // Also delete related contacts and meetings
      await supabase.from('meetings').delete().eq('contact_id', itemId)
      await supabase.from('contacts').delete().eq('crm_item_id', itemId)
      
      const { error } = await supabase
        .from('crm_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error deleting CRM item:', error)
      return { error }
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
      console.error('Error fetching contacts:', error)
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
      console.error('Error fetching contact by ID:', error)
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
      console.error('Error creating contact:', error)
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
      console.error('Error updating contact:', error)
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
      console.error('Error deleting contact:', error)
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
      console.error('Error fetching marketing items:', error)
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
      console.error('Error fetching marketing item by ID:', error)
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
      console.error('Error creating marketing item:', error)
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
      console.error('Error updating marketing item:', error)
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
      console.error('Error deleting marketing item:', error)
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
      console.error('Error fetching financial logs:', error)
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
      console.error('Error creating financial log:', error)
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
      console.error('Error updating financial log:', error)
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
      console.error('Error deleting financial log:', error)
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
      console.error('Error fetching documents:', error)
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
      console.error('Error fetching document by ID:', error)
      return { data: null, error }
    }
  }

  static async createDocument(userId: string, workspaceId: string, docData: Omit<Tables['documents']['Insert'], 'user_id' | 'workspace_id'>) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({ ...docData, user_id: userId, workspace_id: workspaceId })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating document:', error)
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
      console.error('Error updating document:', error)
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
      console.error('Error deleting document:', error)
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
      console.error('Error fetching expenses:', error)
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
      console.error('Error creating expense:', error)
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
      console.error('Error updating expense:', error)
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
      console.error('Error deleting expense:', error)
      return { error }
    }
  }

  // Workspace operations
  static async getWorkspaces(userId: string) {
    try {
      console.log('[Database] Fetching workspace for user:', userId);
      
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
      const { data: ownedWorkspace, error: ownedError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors if none found

      if (ownedError) {
        console.error('[Database] Error fetching owned workspace:', ownedError);
        throw ownedError;
      }

      // If user owns a workspace, return it
      if (ownedWorkspace) {
        console.log('[Database] Found owned workspace:', ownedWorkspace);
        const mapped = mapWorkspace(ownedWorkspace);
        console.log('[Database] Mapped workspace:', mapped);
        return { data: [mapped], error: null };
      }

      // 2. Otherwise, use RPC to get workspace they're a member of (bypasses RLS)
      const { data: memberWorkspaces, error: memberError } = await supabase
        .rpc('get_member_workspace')

      if (memberError) {
        console.error('[Database] Error fetching member workspace:', memberError);
        throw memberError;
      }

      // If user is a member, return that workspace
      if (memberWorkspaces && memberWorkspaces.length > 0) {
        console.log('[Database] Found member workspace:', memberWorkspaces[0]);
        const mapped = mapWorkspace(memberWorkspaces[0]);
        console.log('[Database] Mapped member workspace:', mapped);
        return { data: [mapped], error: null };
      }

      // 3. No workspace found - should auto-create on signup
      console.log('[Database] No workspace found for user');
      return { data: [], error: null };
    } catch (error: any) {
      console.error('Error fetching workspace:', error);
      console.error('Error details:', {
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
      console.error('Error fetching workspace:', error)
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
        console.error('[Database] Error creating workspace - Details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      return { data, error: null }
    } catch (error) {
      console.error('Error creating workspace:', error)
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
      console.error('Error updating workspace:', error)
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
      console.log('[Database] Updated workspace name to:', workspaceName);
      return { data, error: null }
    } catch (error) {
      console.error('Error updating workspace name:', error)
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
      console.error('Error deleting workspace:', error)
      return { error }
    }
  }

  // Workspace member operations
  static async getWorkspaceMembers(workspaceId: string) {
    try {
      console.log('[Database] Fetching workspace members for:', workspaceId);
      
      // Use SECURITY DEFINER function to bypass RLS and get members with profiles
      const { data: members, error: membersError } = await supabase
        .rpc('get_workspace_members_with_profiles', { workspace_uuid: workspaceId })

      if (membersError) {
        console.error('[Database] RPC error:', membersError);
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
        profiles: m.profile_id ? {
          id: m.profile_id,
          email: m.profile_email,
          full_name: m.profile_full_name,
          avatar_url: m.profile_avatar_url
        } : null
      }));
      
      console.log('[Database] Workspace members result:', transformedMembers);
      console.log('[Database] Workspace members FULL:', JSON.stringify(transformedMembers, null, 2));

      return { data: transformedMembers, error: null }
    } catch (error: any) {
      console.error('Error fetching workspace members:', error)
      console.error('Error details:', {
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
      console.error('Error adding workspace member:', error)
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
      console.error('Error removing workspace member:', error)
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
      console.error('Error updating workspace member role:', error)
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
        console.error('Supabase error creating invitation:', {
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
            console.warn('Failed to send invitation email:', emailError)
            // Return special flag to indicate email wasn't sent
            return { data: { ...data, emailSent: false }, error: null }
          } else {
            console.log('Invitation email sent successfully:', emailData)
            return { data: { ...data, emailSent: true }, error: null }
          }
        } catch (emailErr) {
          console.warn('Error sending invitation email:', emailErr)
          // Return with flag indicating email failed
          return { data: { ...data, emailSent: false }, error: null }
        }
      }

      return { data: { ...data, emailSent: false }, error: null }
    } catch (error: any) {
      console.error('Error creating workspace invitation:', error)
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
      console.error('Error fetching workspace invitations:', error)
      return { data: [], error }
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
      console.error('Error fetching pending invitations:', error)
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
      console.error('Error revoking workspace invitation:', error)
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
      console.error('Error accepting workspace invitation:', error)
      return { data: null, error }
    }
  }

  // Business profile operations
  static async getBusinessProfile(workspaceId: string) {
    try {
      console.log('[DatabaseService] Fetching business profile for workspace:', workspaceId);
      
      const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      console.log('[DatabaseService] Business profile query result:', { data, error });

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching business profile:', error)
      return { data: null, error }
    }
  }

  static async createBusinessProfile(profileData: Tables['business_profile']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('business_profile')
        .insert({
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error creating business profile:', error)
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
      console.error('Error updating business profile:', error)
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
      console.error('Error deleting business profile:', error)
      return { error }
    }
  }

  // Workspace achievements operations
  static async getWorkspaceAchievements(workspaceId: string) {
    try {
      console.log('[Database] Fetching workspace achievements for:', workspaceId);
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
      
      console.log('[Database] Workspace achievements loaded:', achievements.length);
      return { data: achievements, error: null }
    } catch (error) {
      console.error('Error fetching workspace achievements:', error)
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
      console.log('[Database] Workspace achievement created:', data);
      return { data, error: null }
    } catch (error) {
      console.error('Error creating workspace achievement:', error)
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
      console.error('Error fetching subscription:', error)
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
      console.error('Error creating subscription:', error)
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
      console.error('Error updating subscription:', error)
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
      console.error('Error deleting subscription:', error)
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
        console.warn('[Database] No workspaceId provided to checkAILimit, allowing request');
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
          console.log('[Database] Admin user detected - bypassing AI limits');
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
        .select('plan_type, ai_requests_used, seat_count')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (subError) {
        console.error('[Database] Subscription query error:', subError);
        throw subError;
      }

      // If no subscription exists, create one with default free plan
      if (!subscription) {
        console.log('[Database] No subscription found, creating free plan subscription for workspace:', workspaceId);
        const { error: createError } = await supabase
          .from('subscriptions')
          .insert({
            workspace_id: workspaceId,
            plan_type: 'free',
            ai_requests_used: 0,
            ai_requests_reset_at: new Date().toISOString()
          });

        if (createError) {
          console.error('[Database] Error creating subscription:', createError);
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
      const seatCount = subscription?.seat_count || 1;

      // Define limits per plan
      const limits: Record<string, number> = {
        'free': 20,
        'pro-individual': 500,
        'power-individual': 999999, // Unlimited (high number)
        'team-starter': 500 * seatCount, // 500 per user
        'team-pro': 999999, // Unlimited
      };

      const limit = limits[planType] || 20;
      const allowed = currentUsage < limit;

      console.log(`[Database] AI Limit Check: ${currentUsage}/${limit} (${planType}), Allowed: ${allowed}`);

      return { 
        allowed, 
        usage: currentUsage, 
        limit, 
        planType,
        error: null 
      };
    } catch (error) {
      console.error('[Database] Error checking AI limit:', error);
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
      // Get current subscription
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('ai_requests_used')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentCount = (subscription?.ai_requests_used || 0) + 1;

      // If no subscription exists, create one with free plan
      if (!subscription) {
        const { error: createError } = await supabase
          .from('subscriptions')
          .insert({
            workspace_id: workspaceId,
            plan_type: 'free',
            ai_requests_used: 1,
            ai_requests_reset_at: new Date().toISOString()
          });

        if (createError) throw createError;
        console.log('[Database] Created subscription and incremented AI usage');
      } else {
        // Increment usage
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ 
            ai_requests_used: currentCount,
            updated_at: new Date().toISOString()
          })
          .eq('workspace_id', workspaceId);

        if (updateError) throw updateError;
        console.log('[Database] Incremented AI usage:', currentCount);
      }

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
          console.warn('[Database] Failed to log AI usage:', logError);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Error incrementing AI usage:', error);
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
      console.error('Error fetching AI usage stats:', error);
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
      console.error('Error fetching AI usage summary:', error);
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
      console.error('Error fetching subscription usage:', error);
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

      console.log('[Database] Incremented file count:', newFileCount, 'Storage:', newStorageUsed);
      return { error: null };
    } catch (error) {
      console.error('Error incrementing file count:', error);
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

      console.log('[Database] Decremented file count:', newFileCount, 'Storage:', newStorageUsed);
      return { error: null };
    } catch (error) {
      console.error('Error decrementing file count:', error);
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
      console.error('Error checking storage limit:', error)
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
      console.error('Error updating storage usage:', error)
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
      console.error('Error unlocking workspace achievement:', error)
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
      console.error('Error checking workspace achievement:', error)
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
      console.error('Error updating workspace XP:', error)
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
      console.error('Error fetching meetings:', error)
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
      console.error('Error creating meeting:', error)
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
      console.error('Error updating meeting:', error)
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
      console.error('Error deleting meeting:', error)
      return { error }
    }
  }

  // Utility function to fetch all dashboard data
  static async getAllDashboardData(userId: string, workspaceId?: string): Promise<{ data: Partial<DashboardData> | null, error: any }> {
    try {
      // If no workspaceId provided, we can't fetch workspace-scoped data
      if (!workspaceId) {
        console.warn('[getAllDashboardData] No workspaceId provided, returning empty data');
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
        platformTasks: allTasks.filter(t => (t as any).category === 'platformTasks' || tasksResult.data?.find(dt => dt.id === t.id)?.category === 'platformTasks'),
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
        
        settings: profileResult.data?.settings as SettingsData || { desktopNotifications: false },
        gamification: profileResult.data?.gamification as GamificationData || {
          streak: 0,
          lastActivityDate: null,
          xp: 0,
          level: 1,
          achievements: []
        }
      }

      // Debug logging for CRM items
      console.log('[Database] Loaded CRM items:', {
        totalCrmItems: crmItems.length,
        investors: dashboardData.investors?.length,
        customers: dashboardData.customers?.length,
        partners: dashboardData.partners?.length,
        crmItemTypes: crmItems.map(i => ({ id: i.id, type: i.type, company: i.company }))
      });

      return { data: dashboardData, error: null }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      return { data: null, error }
    }
  }
}