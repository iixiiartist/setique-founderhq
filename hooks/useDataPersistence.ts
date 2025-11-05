import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { DatabaseService } from '../lib/services/database'
import { DashboardData } from '../types'
import { EMPTY_DASHBOARD_DATA } from '../constants'
import { supabase } from '../lib/supabase'

export const useDataPersistence = () => {
  const { user } = useAuth()
  const { workspace } = useWorkspace()
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load all dashboard data
  const loadData = useCallback(async () => {
    if (!user || !supabase) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data: dashboardData, error: loadError } = await DatabaseService.getAllDashboardData(user.id, workspace?.id)
      
      if (loadError) {
        throw new Error('Failed to load dashboard data')
      }

      if (dashboardData) {
        // Merge with empty data to ensure all fields exist
        setData({
          ...EMPTY_DASHBOARD_DATA,
          ...dashboardData
        } as DashboardData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [user, workspace?.id])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user || !supabase || !workspace?.id) return

    // Subscribe to tasks changes (workspace-scoped)
    const tasksSubscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to CRM items changes (workspace-scoped)
    const crmSubscription = supabase
      .channel('crm_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crm_items', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to contacts changes (workspace-scoped)
    const contactsSubscription = supabase
      .channel('contacts_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contacts', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to meetings changes (workspace-scoped)
    const meetingsSubscription = supabase
      .channel('meetings_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meetings', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to marketing items changes (workspace-scoped)
    const marketingSubscription = supabase
      .channel('marketing_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_items', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to financial logs changes (workspace-scoped)
    const financialSubscription = supabase
      .channel('financial_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'financial_logs', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to documents changes (workspace-scoped)
    const documentsSubscription = supabase
      .channel('documents_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to expenses changes (workspace-scoped)
    const expensesSubscription = supabase
      .channel('expenses_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `workspace_id=eq.${workspace.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    // Subscribe to profile changes
    const profileSubscription = supabase
      .channel('profile_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      tasksSubscription.unsubscribe()
      crmSubscription.unsubscribe()
      contactsSubscription.unsubscribe()
      meetingsSubscription.unsubscribe()
      marketingSubscription.unsubscribe()
      financialSubscription.unsubscribe()
      documentsSubscription.unsubscribe()
      expensesSubscription.unsubscribe()
      profileSubscription.unsubscribe()
    }
  }, [user, workspace?.id, loadData])

  return {
    data,
    isLoading,
    error,
    reload: loadData,
    userId: user?.id
  }
}