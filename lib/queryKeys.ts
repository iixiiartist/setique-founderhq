/**
 * Centralized Query Keys and Providers
 * =====================================
 * Single source of truth for React Query caching across the app.
 * Prevents duplicate fetches and enables smart cache invalidation.
 */

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const queryKeys = {
  // Workspace & Auth (shared across all features)
  workspace: {
    all: ['workspace'] as const,
    byUser: (userId: string) => ['workspace', 'user', userId] as const,
    byId: (workspaceId: string) => ['workspace', workspaceId] as const,
    members: (workspaceId: string) => ['workspace', workspaceId, 'members'] as const,
    profile: (workspaceId: string) => ['workspace', workspaceId, 'profile'] as const,
    settings: (workspaceId: string) => ['workspace', workspaceId, 'settings'] as const,
    subscription: (workspaceId: string) => ['workspace', workspaceId, 'subscription'] as const,
    usage: (workspaceId: string) => ['workspace', workspaceId, 'usage'] as const,
  },

  // User/Profile
  user: {
    all: ['user'] as const,
    current: () => ['user', 'current'] as const,
    byId: (userId: string) => ['user', userId] as const,
    settings: (userId: string) => ['user', userId, 'settings'] as const,
  },

  // Dashboard (aggregated data)
  dashboard: {
    all: ['dashboard'] as const,
    summary: (workspaceId: string) => ['dashboard', workspaceId, 'summary'] as const,
    activity: (workspaceId: string) => ['dashboard', workspaceId, 'activity'] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    workspace: (workspaceId: string) => ['tasks', workspaceId] as const,
    list: (workspaceId: string, filters?: Record<string, unknown>) => 
      ['tasks', workspaceId, 'list', filters] as const,
    summary: (workspaceId: string, userId?: string) => 
      ['tasks', workspaceId, 'summary', userId] as const,
    byId: (taskId: string) => ['tasks', 'detail', taskId] as const,
    byUser: (workspaceId: string, userId: string) => 
      ['tasks', workspaceId, 'user', userId] as const,
  },

  // CRM
  crm: {
    all: ['crm'] as const,
    workspace: (workspaceId: string) => ['crm', workspaceId] as const,
    overview: (workspaceId: string, type?: string) => 
      ['crm', workspaceId, 'overview', type] as const,
    list: (workspaceId: string, type?: string, filters?: Record<string, unknown>) => 
      ['crm', workspaceId, 'list', type, filters] as const,
    byId: (itemId: string) => ['crm', 'detail', itemId] as const,
    contacts: (workspaceId: string, crmItemId?: string) => 
      ['crm', workspaceId, 'contacts', crmItemId] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    workspace: (workspaceId: string) => ['documents', workspaceId] as const,
    summary: (workspaceId: string) => ['documents', workspaceId, 'summary'] as const,
    list: (workspaceId: string, module?: string) => 
      ['documents', workspaceId, 'list', module] as const,
    byId: (docId: string) => ['documents', 'detail', docId] as const,
    activity: (workspaceId: string, docId?: string) => 
      ['documents', workspaceId, 'activity', docId] as const,
  },

  // Marketing
  marketing: {
    all: ['marketing'] as const,
    workspace: (workspaceId: string) => ['marketing', workspaceId] as const,
    items: (workspaceId: string, filters?: Record<string, unknown>) => 
      ['marketing', workspaceId, 'items', filters] as const,
    campaigns: (workspaceId: string) => ['marketing', workspaceId, 'campaigns'] as const,
    byId: (itemId: string) => ['marketing', 'detail', itemId] as const,
  },

  // Financials
  financials: {
    all: ['financials'] as const,
    workspace: (workspaceId: string) => ['financials', workspaceId] as const,
    logs: (workspaceId: string, dateRange?: { start: string; end: string }) => 
      ['financials', workspaceId, 'logs', dateRange] as const,
    expenses: (workspaceId: string, filters?: Record<string, unknown>) => 
      ['financials', workspaceId, 'expenses', filters] as const,
    revenue: (workspaceId: string) => ['financials', workspaceId, 'revenue'] as const,
    summary: (workspaceId: string) => ['financials', workspaceId, 'summary'] as const,
  },

  // Huddle (Chat)
  huddle: {
    all: ['huddle'] as const,
    sidebar: (workspaceId: string) => ['huddle', workspaceId, 'sidebar'] as const,
    rooms: (workspaceId: string) => ['huddle', workspaceId, 'rooms'] as const,
    room: (roomId: string) => ['huddle', 'room', roomId] as const,
    messages: (roomId: string, threadRootId?: string) => 
      ['huddle', 'messages', roomId, threadRootId || 'main'] as const,
    messagesCursor: (roomId: string, cursor?: string) => 
      ['huddle', 'messages', roomId, 'cursor', cursor] as const,
    unread: (workspaceId: string) => ['huddle', workspaceId, 'unread'] as const,
    summaries: (roomId: string) => ['huddle', 'summaries', roomId] as const,
    search: (workspaceId: string, query: string, roomId?: string) => 
      ['huddle', 'search', workspaceId, query, roomId] as const,
  },

  // Calendar
  calendar: {
    all: ['calendar'] as const,
    workspace: (workspaceId: string) => ['calendar', workspaceId] as const,
    events: (workspaceId: string, dateRange?: { start: string; end: string }) => 
      ['calendar', workspaceId, 'events', dateRange] as const,
    byId: (eventId: string) => ['calendar', 'detail', eventId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    user: (userId: string) => ['notifications', userId] as const,
    unread: (userId: string) => ['notifications', userId, 'unread'] as const,
  },

  // Forms
  forms: {
    all: ['forms'] as const,
    workspace: (workspaceId: string) => ['forms', workspaceId] as const,
    byId: (formId: string) => ['forms', 'detail', formId] as const,
    submissions: (formId: string) => ['forms', formId, 'submissions'] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    workspace: (workspaceId: string) => ['products', workspaceId] as const,
    byId: (productId: string) => ['products', 'detail', productId] as const,
  },

  // File Library
  files: {
    all: ['files'] as const,
    workspace: (workspaceId: string) => ['files', workspaceId] as const,
    folder: (folderId: string) => ['files', 'folder', folderId] as const,
    byId: (fileId: string) => ['files', 'detail', fileId] as const,
  },
} as const;

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

/**
 * Predicate functions for selective cache invalidation
 */
export const invalidateMatchers = {
  /**
   * Invalidate all workspace-related data
   */
  workspace: (workspaceId: string) => ({
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey;
      // Match any key that includes the workspaceId
      return key.includes(workspaceId);
    },
  }),

  /**
   * Invalidate all user-related data
   */
  user: (userId: string) => ({
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey;
      return key.includes(userId) || key[0] === 'user';
    },
  }),

  /**
   * Invalidate data after a CRM mutation
   */
  crmMutation: (workspaceId: string) => ({
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey;
      // CRM, contacts, related tasks, dashboard summary
      return (
        key[0] === 'crm' ||
        (key[0] === 'tasks' && key.includes(workspaceId)) ||
        (key[0] === 'dashboard' && key.includes(workspaceId))
      );
    },
  }),

  /**
   * Invalidate data after a task mutation
   */
  taskMutation: (workspaceId: string) => ({
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey;
      return (
        key[0] === 'tasks' ||
        (key[0] === 'dashboard' && key.includes(workspaceId))
      );
    },
  }),

  /**
   * Invalidate huddle/chat data
   */
  huddleMutation: (workspaceId: string, roomId?: string) => ({
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey;
      if (key[0] !== 'huddle') return false;
      if (roomId && key.includes(roomId)) return true;
      if (key.includes(workspaceId)) return true;
      return false;
    },
  }),
};

// ============================================================================
// STALE TIME CONFIGURATIONS
// ============================================================================

/**
 * Centralized stale time configurations
 * Adjust based on data volatility and user expectations
 */
export const staleTimes = {
  /** Data that rarely changes - 30 minutes */
  static: 30 * 60 * 1000,
  
  /** Workspace/profile data - 10 minutes */
  workspace: 10 * 60 * 1000,
  
  /** Standard list data - 5 minutes */
  standard: 5 * 60 * 1000,
  
  /** Frequently updated data - 1 minute */
  frequent: 60 * 1000,
  
  /** Real-time-ish data - 30 seconds */
  realtime: 30 * 1000,
  
  /** Dashboard summaries - 2 minutes */
  dashboard: 2 * 60 * 1000,
  
  /** Chat data - 15 seconds */
  chat: 15 * 1000,
  
  /** Notifications - 30 seconds */
  notifications: 30 * 1000,
} as const;

// ============================================================================
// GC (GARBAGE COLLECTION) TIME CONFIGURATIONS
// ============================================================================

export const gcTimes = {
  /** Keep in cache for 1 hour after becoming stale */
  long: 60 * 60 * 1000,
  
  /** Keep in cache for 30 minutes */
  standard: 30 * 60 * 1000,
  
  /** Keep in cache for 10 minutes */
  short: 10 * 60 * 1000,
  
  /** Keep in cache for 5 minutes */
  ephemeral: 5 * 60 * 1000,
} as const;

// ============================================================================
// RETRY CONFIGURATIONS
// ============================================================================

export const retryConfig = {
  /** Default retry configuration */
  default: {
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  
  /** No retry for mutations */
  mutation: {
    retry: false,
  },
  
  /** Single retry for optional data */
  minimal: {
    retry: 1,
    retryDelay: 1000,
  },
} as const;

// ============================================================================
// DEFAULT QUERY OPTIONS FACTORY
// ============================================================================

/**
 * Create default query options for different data types
 */
export function createQueryDefaults(type: keyof typeof staleTimes) {
  return {
    staleTime: staleTimes[type],
    gcTime: type === 'realtime' || type === 'chat' ? gcTimes.short : gcTimes.standard,
    ...retryConfig.default,
  };
}

// Type helper for query keys
export type QueryKeys = typeof queryKeys;
