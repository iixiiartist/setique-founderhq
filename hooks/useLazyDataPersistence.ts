import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { DatabaseService } from '../lib/services/database'
import { dbToDocument, dbToMarketingItem, dbToCrmItem, dbToFinancialLogs, dbToExpenses } from '../lib/utils/fieldTransformers'
import { DashboardData, Task, MarketingItem, FinancialLog, Expense, Document, Investor, Customer, Partner } from '../types'
import { EMPTY_DASHBOARD_DATA } from '../constants'
import { supabase } from '../lib/supabase'

type TabDataCache = {
  [key: string]: {
    data: any
    timestamp: number
    isLoading: boolean
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Lazy loading hook for dashboard data
 * Only loads data when requested, caches results
 */
export const useLazyDataPersistence = () => {
  const { user } = useAuth()
  const { workspace } = useWorkspace()
  const [dataCache, setDataCache] = useState<TabDataCache>({})
  const [error, setError] = useState<Error | null>(null)

  // Load core data (needed immediately on app load)
  const loadCoreData = useCallback(async () => {
    if (!user || !supabase || !workspace?.id) {
      return {
        gamification: EMPTY_DASHBOARD_DATA.gamification,
        settings: EMPTY_DASHBOARD_DATA.settings
      }
    }

    try {
      // Load only gamification and settings from full dashboard data
      const { data: dashboardData } = await DatabaseService.getAllDashboardData(user.id, workspace.id)
      
      return {
        gamification: dashboardData?.gamification || EMPTY_DASHBOARD_DATA.gamification,
        settings: dashboardData?.settings || EMPTY_DASHBOARD_DATA.settings
      }
    } catch (err) {
      console.error('Error loading core data:', err)
      return {
        gamification: EMPTY_DASHBOARD_DATA.gamification,
        settings: EMPTY_DASHBOARD_DATA.settings
      }
    }
  }, [user, workspace?.id])

  // Load tasks (all categories)
  const loadTasks = useCallback(async () => {
    const cacheKey = 'tasks'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return {
        platformTasks: [],
        investorTasks: [],
        customerTasks: [],
        partnerTasks: [],
        marketingTasks: [],
        financialTasks: []
      }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const { data: tasks } = await DatabaseService.getTasks(user.id, workspace.id)
      
      console.log('[useLazyDataPersistence] Raw tasks from DB:', tasks);
      console.log('[useLazyDataPersistence] Task categories:', tasks?.map(t => ({ id: t.id, category: t.category, text: t.text })));
      
      // Log each task's category for debugging
      tasks?.forEach(t => {
        console.log(`[useLazyDataPersistence] Task "${t.text}" has category: "${t.category}" (type: ${typeof t.category})`);
      });
      
      const result = {
        platformTasks: tasks?.filter(t => t.category === 'platformTasks') || [],
        investorTasks: tasks?.filter(t => t.category === 'investorTasks') || [],
        customerTasks: tasks?.filter(t => t.category === 'customerTasks') || [],
        partnerTasks: tasks?.filter(t => t.category === 'partnerTasks') || [],
        marketingTasks: tasks?.filter(t => t.category === 'marketingTasks') || [],
        financialTasks: tasks?.filter(t => t.category === 'financialTasks') || []
      }
      
      console.log('[useLazyDataPersistence] Filtered results:', {
        platformTasks: result.platformTasks.length,
        investorTasks: result.investorTasks.length,
        customerTasks: result.customerTasks.length,
        partnerTasks: result.partnerTasks.length,
        marketingTasks: result.marketingTasks.length,
        financialTasks: result.financialTasks.length
      });

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now(), isLoading: false }
      }))

      return result
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err as Error)
      return {
        platformTasks: [],
        investorTasks: [],
        customerTasks: [],
        partnerTasks: [],
        marketingTasks: [],
        financialTasks: []
      }
    }
  }, [user, workspace?.id, dataCache])

  // Load CRM items (investors, customers, partners)
  const loadCrmItems = useCallback(async () => {
    const cacheKey = 'crm'
    const cached = dataCache[cacheKey]
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return { investors: [], customers: [], partners: [] }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      // Load CRM items with their related contacts and meetings
      const [crmItemsResult, contactsResult, meetingsResult] = await Promise.all([
        DatabaseService.getCrmItems(workspace.id),
        DatabaseService.getContacts(workspace.id),
        DatabaseService.getMeetings(workspace.id)
      ])

      const crmItems = crmItemsResult.data || []
      const allContacts = contactsResult.data || []
      const allMeetings = meetingsResult.data || []

      const investors: Investor[] = []
      const customers: Customer[] = []
      const partners: Partner[] = []

      crmItems.forEach(item => {
        const baseItem = dbToCrmItem(item as any)

        const itemContacts = allContacts
          .filter(c => c.crm_item_id === item.id)
          .map(contact => {
            const contactMeetings = allMeetings.filter(m => m.contact_id === contact.id)
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
            }
          })

        const normalizedItem = {
          ...baseItem,
          contacts: itemContacts
        }

        switch (item.type) {
          case 'investor':
            investors.push({
              ...normalizedItem,
              checkSize: Number(item.check_size ?? 0)
            })
            break
          case 'customer':
            customers.push({
              ...normalizedItem,
              dealValue: Number(item.deal_value ?? 0)
            })
            break
          case 'partner':
            partners.push({
              ...normalizedItem,
              opportunity: item.opportunity || ''
            })
            break
          default:
            break
        }
      })

      const result = {
        investors,
        customers,
        partners
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now(), isLoading: false }
      }))

      return result
    } catch (err) {
      console.error('Error loading CRM items:', err)
      setError(err as Error)
      return { investors: [], customers: [], partners: [] }
    }
  }, [user, workspace?.id, dataCache])

  // Load marketing items
  const loadMarketing = useCallback(async () => {
    const cacheKey = 'marketing'
    const cached = dataCache[cacheKey]
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return []
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const { data: marketing } = await DatabaseService.getMarketingItems(workspace.id)

      const normalizedMarketing = ((marketing || []) as any[]).map(item =>
        'item_type' in item ? dbToMarketingItem(item as any) : item
      ) as MarketingItem[]

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: normalizedMarketing, timestamp: Date.now(), isLoading: false }
      }))

      return normalizedMarketing
    } catch (err) {
      console.error('Error loading marketing:', err)
      setError(err as Error)
      return []
    }
  }, [user, workspace?.id, dataCache])

  // Load financials
  const loadFinancials = useCallback(async () => {
    const cacheKey = 'financials'
    const cached = dataCache[cacheKey]
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return { financials: [], expenses: [] }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const [financialsRes, expensesRes] = await Promise.all([
        DatabaseService.getFinancialLogs(workspace.id),
        DatabaseService.getExpenses(workspace.id)
      ])

      const normalizedFinancials = dbToFinancialLogs((financialsRes.data || []) as any)
      const normalizedExpenses = dbToExpenses((expensesRes.data || []) as any)

      const result = {
        financials: normalizedFinancials,
        expenses: normalizedExpenses
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now(), isLoading: false }
      }))

      return result
    } catch (err) {
      console.error('Error loading financials:', err)
      setError(err as Error)
      return { financials: [], expenses: [] }
    }
  }, [user, workspace?.id, dataCache])

  // Load documents
  const loadDocuments = useCallback(async () => {
    const cacheKey = 'documents'
    const cached = dataCache[cacheKey]
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return []
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const { data: documents, error } = await DatabaseService.getDocuments(workspace.id)

      // If timeout or error, cache empty result to prevent retry loop
      if (error) {
        console.error('Error loading documents:', error)
        setDataCache(prev => ({
          ...prev,
          [cacheKey]: { data: [], timestamp: Date.now(), isLoading: false }
        }))
        return []
      }

      const normalizedDocuments = ((documents || []) as any[]).map(doc =>
        'mime_type' in doc || 'created_at' in doc ? dbToDocument(doc as any) : doc
      ) as Document[]

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: normalizedDocuments, timestamp: Date.now(), isLoading: false }
      }))

      return normalizedDocuments
    } catch (err) {
      console.error('Error loading documents:', err)
      setError(err as Error)
      // Cache empty result to prevent infinite retries
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: [], timestamp: Date.now(), isLoading: false }
      }))
      return []
    }
  }, [user, workspace?.id, dataCache])

  // Invalidate specific cache
  const invalidateCache = useCallback((key: string) => {
    setDataCache(prev => {
      const newCache = { ...prev }
      delete newCache[key]
      return newCache
    })
  }, [])

  // Invalidate all cache
  const invalidateAllCache = useCallback(() => {
    setDataCache({})
  }, [])

  // Check if data is loading
  const isLoading = useCallback((key: string) => {
    return dataCache[key]?.isLoading || false
  }, [dataCache])

  return {
    loadCoreData,
    loadTasks,
    loadCrmItems,
    loadMarketing,
    loadFinancials,
    loadDocuments,
    invalidateCache,
    invalidateAllCache,
    isLoading,
    error
  }
}
