import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { DatabaseService } from '../lib/services/database'
import { DashboardData, Task, MarketingItem, FinancialLog, Expense, Document, Investor, Customer, Partner, Deal, Priority } from '../types'
import { EMPTY_DASHBOARD_DATA } from '../constants'
import { supabase } from '../lib/supabase'
import { dbToMarketingItem, dbToCrmItem, dbToContact } from '../lib/utils/fieldTransformers'

type TabDataCache = {
  [key: string]: {
    data: any
    timestamp: number
    isLoading: boolean
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

type LoadOptions = {
  force?: boolean
}

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
        settings: EMPTY_DASHBOARD_DATA.settings
      }
    }

    try {
      // Load only settings from full dashboard data
      const { data: dashboardData } = await DatabaseService.getAllDashboardData(user.id, workspace.id)
      
      return {
        settings: dashboardData?.settings || EMPTY_DASHBOARD_DATA.settings
      }
    } catch (err) {
      console.error('Error loading core data:', err)
      return {
        settings: EMPTY_DASHBOARD_DATA.settings
      }
    }
  }, [user, workspace?.id])

  /**
   * Load tasks (all categories)
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Object containing all task collections by category
   */
  const loadTasks = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'tasks'
    
    // Check cache using the most current state (not closure)
    let shouldUseCached = false
    let cachedData: any = null
    
    if (!options.force) {
      setDataCache(prev => {
        const cached = prev[cacheKey]
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          shouldUseCached = true
          cachedData = cached.data
        }
        return prev // Don't actually update state, just read it
      })
    }
    
    if (shouldUseCached && cachedData) {
      return cachedData
    }

    if (!user || !workspace?.id) {
      return {
        productsServicesTasks: [],
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

      // Fetch each category separately with database-level filtering
      // This pushes filtering to the database for better performance
      const categories = [
        'productsServicesTasks',
        'investorTasks', 
        'customerTasks',
        'partnerTasks',
        'marketingTasks',
        'financialTasks'
      ] as const

      const categoryResults = await Promise.all(
        categories.map(async (category) => {
          const { data } = await DatabaseService.getTasks(user.id, workspace.id, { 
            category,
            limit: 1000 // Load up to 1000 tasks per category
          })
          return { category, data }
        })
      )

      // Transform parallel results into categorized object
      const result = categoryResults.reduce((acc, { category, data }) => ({
        ...acc,
        [category]: data || []
      }), {} as {
        productsServicesTasks: any[]
        investorTasks: any[]
        customerTasks: any[]
        partnerTasks: any[]
        marketingTasks: any[]
        financialTasks: any[]
      })
      
      // NEW: Create unified CRM tasks array with type annotation
      const crmTasks = [
        ...(result.investorTasks || []).map(t => ({ ...t, crmType: 'investor' as const, category: 'crmTasks' as const })),
        ...(result.customerTasks || []).map(t => ({ ...t, crmType: 'customer' as const, category: 'crmTasks' as const })),
        ...(result.partnerTasks || []).map(t => ({ ...t, crmType: 'partner' as const, category: 'crmTasks' as const }))
      ]

      const finalResult = {
        ...result,
        crmTasks // Add unified CRM tasks
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: finalResult, timestamp: Date.now(), isLoading: false }
      }))

      return finalResult
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err as Error)
      return {
        productsServicesTasks: [],
        investorTasks: [],
        customerTasks: [],
        partnerTasks: [],
        marketingTasks: [],
        financialTasks: [],
        crmTasks: []
      }
    }
  }, [user, workspace?.id])

  /**
   * Load CRM items (investors, customers, partners)
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Object containing investors, customers, and partners arrays
   */
  const loadCrmItems = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'crm'
    
    // Check cache using the most current state (not closure)
    let shouldUseCached = false
    let cachedData: any = null
    
    if (!options.force) {
      setDataCache(prev => {
        const cached = prev[cacheKey]
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          shouldUseCached = true
          cachedData = cached.data
        }
        return prev // Don't actually update state, just read it
      })
    }
    
    if (shouldUseCached && cachedData) {
      return cachedData
    }

    if (!user || !workspace?.id) {
      return { investors: [], customers: [], partners: [] }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      // Load contacts and meetings first (needed for all CRM types)
      const [contactsResult, meetingsResult] = await Promise.all([
        DatabaseService.getContacts(workspace.id),
        DatabaseService.getMeetings(workspace.id)
      ])

      const allContacts = contactsResult.data || []
      const allMeetings = meetingsResult.data || []

      // Fetch each CRM type separately with database-level filtering
      const crmTypes = ['investor', 'customer', 'partner'] as const
      
      const crmResults = await Promise.all(
        crmTypes.map(async (type) => {
          const { data: crmItems } = await DatabaseService.getCrmItems(workspace.id, { 
            type,
            limit: 1000 // Load up to 1000 items per type
          })
          
          // Transform CRM items with contacts and meetings using shared transformers
          const transformedItems = (crmItems || []).map(item => {
            const itemContacts = allContacts
              .filter(c => c.crm_item_id === item.id)
              .map(contact => {
                const contactMeetings = allMeetings.filter(m => m.contact_id === contact.id)
                const transformedContact = dbToContact(contact);
                // Add meetings to contact
                transformedContact.meetings = contactMeetings.map(m => ({
                  id: m.id,
                  timestamp: new Date(m.timestamp).getTime(),
                  title: m.title,
                  attendees: m.attendees,
                  summary: m.summary
                }));
                return transformedContact;
              });

            const transformedItem = dbToCrmItem(item);
            transformedItem.contacts = itemContacts;
            return transformedItem;
          })
          
          return { type, data: transformedItems }
        })
      )

      // Extract split arrays by type (backwards compatibility)
      const investors = crmResults.find(r => r.type === 'investor')?.data || []
      const customers = crmResults.find(r => r.type === 'customer')?.data || []
      const partners = crmResults.find(r => r.type === 'partner')?.data || []
      
      // Flatten into unified array with type property
      const allCrmItems = [
        ...investors.map(item => ({ ...item, type: 'investor' as const })),
        ...customers.map(item => ({ ...item, type: 'customer' as const })),
        ...partners.map(item => ({ ...item, type: 'partner' as const }))
      ]
      
      const result = {
        // Legacy split format (backwards compatibility)
        investors,
        customers,
        partners,
        
        // NEW: Unified format
        crmItems: allCrmItems
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now(), isLoading: false }
      }))

      return result
    } catch (err) {
      console.error('Error loading CRM items:', err)
      setError(err as Error)
      return { 
        investors: [], 
        customers: [], 
        partners: [],
        crmItems: []
      }
    }
  }, [user, workspace?.id])

  /**
   * Load marketing items
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Array of marketing items
   */
  const loadMarketing = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'marketing'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh (unless force reload)
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return {
        marketing: [],
        campaignAttributions: [],
        marketingAnalytics: [],
        marketingCalendarLinks: []
      }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const [
        marketingRes,
        attributionsRes,
        analyticsRes,
        calendarLinksRes
      ] = await Promise.all([
        DatabaseService.getMarketingItems(workspace.id),
        DatabaseService.getCampaignAttributions(workspace.id),
        DatabaseService.getMarketingAnalytics(workspace.id),
        DatabaseService.getMarketingCalendarLinks(workspace.id)
      ])

      // Transform raw database rows to application models (snake_case → camelCase)
      const transformedMarketing = (marketingRes.data || []).map(dbToMarketingItem);

      const result = {
        marketing: transformedMarketing,
        campaignAttributions: attributionsRes.data || [],
        marketingAnalytics: analyticsRes.data || [],
        marketingCalendarLinks: calendarLinksRes.data || []
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now(), isLoading: false }
      }))

      return result
    } catch (err) {
      console.error('Error loading marketing:', err)
      setError(err as Error)
      return {
        marketing: [],
        campaignAttributions: [],
        marketingAnalytics: [],
        marketingCalendarLinks: []
      }
    }
  }, [user, workspace?.id, dataCache])

  /**
   * Load financials (logs and expenses)
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Object containing financials array and expenses array
   */
  const loadFinancials = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'financials'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh (unless force reload)
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return { 
        financials: [], 
        expenses: [],
        revenueTransactions: [],
        financialForecasts: [],
        budgetPlans: []
      }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const [
        financialsRes, 
        expensesRes,
        revenueTransactionsRes,
        forecastsRes,
        budgetsRes
      ] = await Promise.all([
        DatabaseService.getFinancialLogs(workspace.id),
        DatabaseService.getExpenses(workspace.id),
        DatabaseService.getRevenueTransactions(workspace.id),
        DatabaseService.getFinancialForecasts(workspace.id),
        DatabaseService.getBudgetPlans(workspace.id)
      ])

      const result = {
        financials: financialsRes.data || [],
        expenses: expensesRes.data || [],
        revenueTransactions: revenueTransactionsRes.data || [],
        financialForecasts: forecastsRes.data || [],
        budgetPlans: budgetsRes.data || []
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: result, timestamp: Date.now(), isLoading: false }
      }))

      return result
    } catch (err) {
      console.error('Error loading financials:', err)
      setError(err as Error)
      return { 
        financials: [], 
        expenses: [],
        revenueTransactions: [],
        financialForecasts: [],
        budgetPlans: []
      }
    }
  }, [user, workspace?.id, dataCache])

  /**
   * Load documents
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Array of documents
   */
  const loadDocuments = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'documents'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh (unless force reload)
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
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

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: documents || [], timestamp: Date.now(), isLoading: false }
      }))

      return documents || []
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

  /**
   * Load just document metadata (lightweight - no base64 content)
   * Used for AI context across all tabs
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Array of document metadata (id, name, module, etc.)
   */
  const loadDocumentsMetadata = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'documentsMetadata'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh (unless force reload)
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
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

      // Query only metadata fields, exclude heavy base64 content
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, name, module, mime_type, uploaded_by, uploaded_by_name, created_at, workspace_id')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading documents metadata:', error)
        setDataCache(prev => ({
          ...prev,
          [cacheKey]: { data: [], timestamp: Date.now(), isLoading: false }
        }))
        return []
      }

      // Transform to match Document interface (without content field)
      const metadata = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        module: doc.module,
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by,
        uploadedByName: doc.uploaded_by_name,
        createdAt: new Date(doc.created_at).getTime(),
        workspaceId: doc.workspace_id,
        // content field intentionally excluded to save memory
      }))

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: metadata, timestamp: Date.now(), isLoading: false }
      }))

      return metadata
    } catch (err) {
      console.error('Error loading documents metadata:', err)
      setError(err as Error)
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

  /**
   * Load deals/opportunities
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Array of deals
   */
  const loadDeals = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'deals'
    
    // Check cache using the most current state (not closure)
    let shouldUseCached = false
    let cachedData: any = null
    
    if (!options.force) {
      setDataCache(prev => {
        const cached = prev[cacheKey]
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          shouldUseCached = true
          cachedData = cached.data
        }
        return prev // Don't actually update state, just read it
      })
    }
    
    if (shouldUseCached && cachedData) {
      return cachedData
    }

    if (!user || !workspace?.id) {
      return []
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      const result = await DatabaseService.getDeals(workspace.id)
      const deals = result.data || []

      const transformedDeals = deals.map(deal => ({
        id: deal.id,
        workspaceId: deal.workspace_id,
        title: deal.title,
        crmItemId: deal.crm_item_id || undefined,
        contactId: deal.contact_id || undefined,
        value: parseFloat(deal.value.toString()),
        currency: deal.currency,
        stage: deal.stage as Deal['stage'],
        probability: deal.probability,
        expectedCloseDate: deal.expected_close_date || undefined,
        actualCloseDate: deal.actual_close_date || undefined,
        source: deal.source || undefined,
        category: deal.category as Deal['category'],
        priority: (deal.priority.charAt(0).toUpperCase() + deal.priority.slice(1)) as Priority,
        assignedTo: deal.assigned_to || null,
        assignedToName: deal.assigned_to_name || null,
        createdAt: new Date(deal.created_at).getTime(),
        updatedAt: new Date(deal.updated_at).getTime(),
        notes: deal.notes || [],
        tags: deal.tags || [],
        customFields: deal.custom_fields || {},
      }))

      const dataToCache = transformedDeals

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: dataToCache, timestamp: Date.now(), isLoading: false }
      }))

      return dataToCache
    } catch (err) {
      console.error('[useLazyDataPersistence] Error loading deals:', err)
      setError(err as Error)
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: false }
      }))
      return []
    }
  }, [user, workspace?.id])

  /**
   * Load products and services
   * @param options.force - If true, bypasses cache and fetches fresh data from server
   * @returns Object containing productsServices and productPriceHistory arrays
   */
  const loadProductsServices = useCallback(async (options: LoadOptions = {}) => {
    const cacheKey = 'productsServices'
    const cached = dataCache[cacheKey]
    
    // Return cached data if still fresh (unless force reload)
    if (!options.force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    if (!user || !workspace?.id) {
      return {
        productsServices: [],
        productPriceHistory: [],
        productBundles: []
      }
    }

    try {
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: true }
      }))

      // Load products/services
      const productsResult = await DatabaseService.getProductsServices(workspace.id)
      const products = productsResult.data || []

      // Transform database format to frontend format
      const transformedProducts = products.map(p => ({
        id: p.id,
        workspaceId: p.workspace_id,
        name: p.name,
        sku: p.sku,
        description: p.description || undefined,
        category: p.category,
        type: p.type,
        status: p.status,
        basePrice: parseFloat(p.base_price.toString()),
        currency: p.currency,
        pricingModel: p.pricing_model,
        costOfGoods: p.cost_of_goods ? parseFloat(p.cost_of_goods.toString()) : undefined,
        costOfService: p.cost_of_service ? parseFloat(p.cost_of_service.toString()) : undefined,
        isTaxable: p.is_taxable || false,
        taxRate: p.tax_rate || undefined,
        inventoryTracking: p.inventory_tracked || false,
        quantityOnHand: p.quantity_on_hand || undefined,
        quantityReserved: p.quantity_reserved || undefined,
        quantityAvailable: p.quantity_available || undefined,
        reorderPoint: p.reorder_point || undefined,
        reorderQuantity: p.reorder_quantity || undefined,
        capacityTracking: p.capacity_tracked || false,
        capacityTotal: p.capacity_total || undefined,
        capacityBooked: p.capacity_booked || undefined,
        capacityAvailable: p.capacity_available || undefined,
        capacityUnit: p.capacity_unit || undefined,
        capacityPeriod: p.capacity_period || undefined,
        imageUrl: p.image_url || undefined,
        tags: p.tags || [],
        tieredPricing: p.tiered_pricing || [],
        usagePricing: p.usage_pricing || [],
        subscriptionPlans: p.subscription_plans || [],
        totalRevenue: p.total_revenue ? parseFloat(p.total_revenue.toString()) : 0,
        unitsSold: p.units_sold || 0,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
      }))

      // Load price history
      const priceHistoryResult = await DatabaseService.getProductPriceHistory(workspace.id)
      const priceHistory = priceHistoryResult.data || []

      const transformedPriceHistory = priceHistory.map(ph => ({
        id: ph.id,
        productServiceId: ph.product_service_id,
        oldPrice: parseFloat(ph.old_price.toString()),
        newPrice: parseFloat(ph.new_price.toString()),
        changedBy: ph.changed_by,
        changedAt: new Date(ph.changed_at).getTime(),
        reason: ph.reason || undefined,
      }))

      const dataToCache = {
        productsServices: transformedProducts,
        productPriceHistory: transformedPriceHistory,
        productBundles: [] // TODO: Load bundles when needed
      }

      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { data: dataToCache, timestamp: Date.now(), isLoading: false }
      }))

      return dataToCache
    } catch (err) {
      console.error('[useLazyDataPersistence] Error loading products/services:', err)
      setError(err as Error)
      setDataCache(prev => ({
        ...prev,
        [cacheKey]: { ...prev[cacheKey], isLoading: false }
      }))
      return {
        productsServices: [],
        productPriceHistory: [],
        productBundles: []
      }
    }
  }, [user, workspace?.id, dataCache])

  return {
    loadCoreData,
    loadTasks,
    loadCrmItems,
    loadMarketing,
    loadFinancials,
    loadDocuments,
    loadDocumentsMetadata,
    loadDeals,
    loadProductsServices,
    invalidateCache,
    invalidateAllCache,
    isLoading,
    error
  }
}
