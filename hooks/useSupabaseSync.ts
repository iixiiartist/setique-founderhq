import { useCallback } from 'react'
import { DashboardData } from '../types'

/**
 * @deprecated This hook uses the heavy getAllDashboardData fan-out.
 * The app now uses useDashboardData with lazy per-tab loading via useQueryDataPersistence.
 * 
 * This file is preserved for reference but should not be imported.
 * TODO: Remove this file after confirming no external dependencies.
 */
export const useSupabaseSync = (_data: DashboardData, _dispatch: any) => {
  console.warn('[useSupabaseSync] DEPRECATED: This hook is no longer used. Data loading is handled by useDashboardData.');
  
  // No-op implementations
  const loadFromSupabase = useCallback(async () => {
    console.warn('[useSupabaseSync.loadFromSupabase] DEPRECATED: Use useDashboardData instead');
  }, []);

  const saveToSupabase = useCallback(async () => {
    console.warn('[useSupabaseSync.saveToSupabase] DEPRECATED: Use DatabaseService methods directly');
  }, []);

  return {
    loadFromSupabase,
    saveToSupabase
  }
}