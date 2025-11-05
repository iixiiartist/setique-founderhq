import { useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { DatabaseService } from '../lib/services/database'
import { DashboardData } from '../types'
import { supabase } from '../lib/supabase'

/**
 * Hook that syncs local dashboard data with Supabase
 * This works alongside the existing reducer system
 */
export const useSupabaseSync = (data: DashboardData, dispatch: any) => {
  const { user } = useAuth()
  const { workspace } = useWorkspace()

  // Load data from Supabase on mount
  const loadFromSupabase = useCallback(async () => {
    if (!user || !supabase) return

    try {
      const { data: dashboardData } = await DatabaseService.getAllDashboardData(user.id, workspace?.id)
      
      if (dashboardData) {
        // Dispatch actions to populate the reducer
        // This converts Supabase data back to reducer format
        // You would dispatch appropriate actions here
        console.log('Loaded from Supabase:', dashboardData)
      }
    } catch (error) {
      console.error('Error loading from Supabase:', error)
    }
  }, [user, workspace?.id])

  // Save to Supabase when data changes
  const saveToSupabase = useCallback(async () => {
    if (!user || !supabase) return

    try {
      // This would save the current state to Supabase
      // Implement based on what changed
      console.log('Saving to Supabase...', data)
    } catch (error) {
      console.error('Error saving to Supabase:', error)
    }
  }, [user, data])

  // Load on mount
  useEffect(() => {
    loadFromSupabase()
  }, [loadFromSupabase])

  return {
    loadFromSupabase,
    saveToSupabase
  }
}