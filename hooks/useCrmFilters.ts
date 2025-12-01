/**
 * useCrmFilters Hook
 * 
 * Shared filtering logic for CRM components.
 * Wraps useFilteredList with CRM-specific presets.
 * Standardizes search debounce, sort toggles, and filter UX.
 */

import { useState, useMemo, useCallback } from 'react';
import { useFilteredList, FilterConfig, SortOrder } from './useFilteredList';
import { AnyCrmItem, Contact, Priority } from '../types';

// ============================================================================
// Account/CRM Item Filters
// ============================================================================

export interface AccountFilterState {
  status: string;
  priority: string;
  tag: string;
  contactCount: 'any' | 'none' | 'has';
  noteCount: 'any' | 'none' | 'has';
  overdue: boolean;
}

export interface UseAccountFiltersOptions {
  initialSort?: {
    field: keyof AnyCrmItem;
    order: SortOrder;
  };
}

export function useAccountFilters(
  items: AnyCrmItem[],
  options: UseAccountFiltersOptions = {}
) {
  const { initialSort = { field: 'company', order: 'asc' } } = options;

  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState<AccountFilterState>({
    status: '',
    priority: '',
    tag: '',
    contactCount: 'any',
    noteCount: 'any',
    overdue: false,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Custom search function for accounts
  const customSearch = useCallback((item: AnyCrmItem, query: string) => {
    const q = query.toLowerCase();
    return (
      item.company.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q) ||
      (item.nextAction && item.nextAction.toLowerCase().includes(q)) ||
      (item.contacts || []).some(c => 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q)
      )
    );
  }, []);

  // Custom sort comparator for accounts
  const customSort = useCallback((
    a: AnyCrmItem,
    b: AnyCrmItem,
    field: keyof AnyCrmItem,
    order: SortOrder
  ) => {
    let comparison = 0;

    switch (field) {
      case 'priority': {
        const priorityOrder: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };
        comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        break;
      }
      case 'company':
        comparison = a.company.localeCompare(b.company);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      default: {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        }
      }
    }

    return order === 'asc' ? comparison : -comparison;
  }, []);

  // Use the base filtered list hook
  const filteredList = useFilteredList(items, {
    searchFields: ['company', 'status', 'nextAction'],
    customSearch,
    customSort,
    initialSort,
    searchDebounce: 300,
  });

  // Apply advanced filters on top
  const filteredItems = useMemo(() => {
    let result = filteredList.filteredItems;

    // Status filter
    if (advancedFilters.status) {
      result = result.filter(item => item.status === advancedFilters.status);
    }

    // Priority filter
    if (advancedFilters.priority) {
      result = result.filter(item => item.priority === advancedFilters.priority);
    }

    // Tag filter
    if (advancedFilters.tag) {
      result = result.filter(item => (item as any).tags?.includes(advancedFilters.tag));
    }

    // Contact count filter
    if (advancedFilters.contactCount !== 'any') {
      result = result.filter(item => {
        const count = (item.contacts || []).length;
        return advancedFilters.contactCount === 'none' ? count === 0 : count > 0;
      });
    }

    // Note count filter
    if (advancedFilters.noteCount !== 'any') {
      result = result.filter(item => {
        const count = (item.notes || []).length;
        return advancedFilters.noteCount === 'none' ? count === 0 : count > 0;
      });
    }

    // Overdue filter
    if (advancedFilters.overdue) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(item => item.nextActionDate && item.nextActionDate < today);
    }

    return result;
  }, [filteredList.filteredItems, advancedFilters]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => {
      (item as any).tags?.forEach((tag: string) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  // Get all unique statuses
  const allStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    items.forEach(item => statusSet.add(item.status));
    return Array.from(statusSet).sort();
  }, [items]);

  // Check if advanced filters are active
  const hasActiveAdvancedFilters = useMemo(() => {
    return (
      advancedFilters.contactCount !== 'any' ||
      advancedFilters.noteCount !== 'any' ||
      advancedFilters.overdue
    );
  }, [advancedFilters]);

  // Set a specific advanced filter
  const setAdvancedFilter = useCallback(<K extends keyof AccountFilterState>(
    key: K,
    value: AccountFilterState[K]
  ) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear advanced filters
  const clearAdvancedFilters = useCallback(() => {
    setAdvancedFilters({
      status: '',
      priority: '',
      tag: '',
      contactCount: 'any',
      noteCount: 'any',
      overdue: false,
    });
  }, []);

  // Calculate analytics
  const analytics = useMemo(() => {
    const total = filteredItems.length;
    const highPriority = filteredItems.filter(i => i.priority === 'High').length;
    const today = new Date().toISOString().split('T')[0];
    const overdueCount = filteredItems.filter(i => i.nextActionDate && i.nextActionDate < today).length;
    
    let totalValue = 0;
    filteredItems.forEach(item => {
      if ('checkSize' in item && (item as any).checkSize) totalValue += (item as any).checkSize;
      if ('dealValue' in item && (item as any).dealValue) totalValue += (item as any).dealValue;
    });

    const withContacts = filteredItems.filter(i => (i.contacts || []).length > 0).length;
    const avgContacts = total > 0 
      ? filteredItems.reduce((sum, i) => sum + (i.contacts || []).length, 0) / total 
      : 0;

    return {
      total,
      highPriority,
      overdueCount,
      totalValue,
      withContacts,
      avgContactsPerAccount: Math.round(avgContacts * 10) / 10,
    };
  }, [filteredItems]);

  return {
    // From base filtered list
    searchQuery: filteredList.searchQuery,
    setSearchQuery: filteredList.setSearchQuery,
    sortBy: filteredList.sortBy,
    sortOrder: filteredList.sortOrder,
    setSorting: filteredList.setSorting,
    toggleSortOrder: filteredList.toggleSortOrder,
    hasActiveFilters: filteredList.hasActiveFilters || hasActiveAdvancedFilters,
    reset: () => {
      filteredList.reset();
      clearAdvancedFilters();
    },

    // Advanced filters
    advancedFilters,
    setAdvancedFilter,
    clearAdvancedFilters,
    showAdvancedFilters,
    setShowAdvancedFilters,
    hasActiveAdvancedFilters,

    // Results
    filteredItems,
    totalCount: filteredItems.length,
    originalCount: items.length,

    // Metadata
    allTags,
    allStatuses,
    analytics,
  };
}

// ============================================================================
// Contact Filters
// ============================================================================

export interface ContactFilterState {
  linkStatus: 'all' | 'linked' | 'unlinked';
  tag: string;
  title: string;
  noteCount: 'any' | 'none' | 'has';
  meetingCount: 'any' | 'none' | 'has';
}

export interface UseContactFiltersOptions {
  /** CRM items to check link status against */
  crmItems: AnyCrmItem[];
  /** Initial sort configuration */
  initialSort?: {
    field: keyof Contact;
    order: SortOrder;
  };
}

export function useContactFilters(
  contacts: Contact[],
  options: UseContactFiltersOptions
) {
  const { crmItems, initialSort = { field: 'name', order: 'asc' } } = options;

  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState<ContactFilterState>({
    linkStatus: 'all',
    tag: '',
    title: '',
    noteCount: 'any',
    meetingCount: 'any',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Custom search function for contacts
  const customSearch = useCallback((contact: Contact, query: string) => {
    const q = query.toLowerCase();
    return (
      contact.name.toLowerCase().includes(q) ||
      contact.email.toLowerCase().includes(q) ||
      (contact.phone && contact.phone.toLowerCase().includes(q)) ||
      (contact.title && contact.title.toLowerCase().includes(q))
    );
  }, []);

  // Use the base filtered list hook
  const filteredList = useFilteredList(contacts, {
    searchFields: ['name', 'email', 'phone', 'title'],
    customSearch,
    initialSort: initialSort as any,
    searchDebounce: 300,
  });

  // Check if a contact is linked to a CRM item
  const isContactLinked = useCallback((contact: Contact) => {
    return crmItems.some(item => item.contacts?.some(c => c.id === contact.id));
  }, [crmItems]);

  // Get linked account for a contact
  const getLinkedAccount = useCallback((contact: Contact): AnyCrmItem | undefined => {
    return crmItems.find(item => item.contacts?.some(c => c.id === contact.id));
  }, [crmItems]);

  // Apply advanced filters on top
  const filteredContacts = useMemo(() => {
    let result = filteredList.filteredItems;

    // Link status filter
    if (advancedFilters.linkStatus !== 'all') {
      result = result.filter(contact => {
        const isLinked = isContactLinked(contact);
        return advancedFilters.linkStatus === 'linked' ? isLinked : !isLinked;
      });
    }

    // Tag filter
    if (advancedFilters.tag) {
      result = result.filter(contact => contact.tags?.includes(advancedFilters.tag));
    }

    // Title filter
    if (advancedFilters.title.trim()) {
      const titleQuery = advancedFilters.title.toLowerCase();
      result = result.filter(c => c.title && c.title.toLowerCase().includes(titleQuery));
    }

    // Note count filter
    if (advancedFilters.noteCount !== 'any') {
      result = result.filter(contact => {
        const count = (contact.notes || []).length;
        return advancedFilters.noteCount === 'none' ? count === 0 : count > 0;
      });
    }

    // Meeting count filter
    if (advancedFilters.meetingCount !== 'any') {
      result = result.filter(contact => {
        const count = (contact.meetings || []).length;
        return advancedFilters.meetingCount === 'none' ? count === 0 : count > 0;
      });
    }

    return result;
  }, [filteredList.filteredItems, advancedFilters, isContactLinked]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  // Check if advanced filters are active
  const hasActiveAdvancedFilters = useMemo(() => {
    return (
      advancedFilters.title !== '' ||
      advancedFilters.noteCount !== 'any' ||
      advancedFilters.meetingCount !== 'any'
    );
  }, [advancedFilters]);

  // Set a specific advanced filter
  const setAdvancedFilter = useCallback(<K extends keyof ContactFilterState>(
    key: K,
    value: ContactFilterState[K]
  ) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear advanced filters
  const clearAdvancedFilters = useCallback(() => {
    setAdvancedFilters({
      linkStatus: 'all',
      tag: '',
      title: '',
      noteCount: 'any',
      meetingCount: 'any',
    });
  }, []);

  return {
    // From base filtered list
    searchQuery: filteredList.searchQuery,
    setSearchQuery: filteredList.setSearchQuery,
    sortBy: filteredList.sortBy,
    sortOrder: filteredList.sortOrder,
    setSorting: filteredList.setSorting,
    toggleSortOrder: filteredList.toggleSortOrder,
    hasActiveFilters: filteredList.hasActiveFilters || hasActiveAdvancedFilters,
    reset: () => {
      filteredList.reset();
      clearAdvancedFilters();
    },

    // Advanced filters
    advancedFilters,
    setAdvancedFilter,
    clearAdvancedFilters,
    showAdvancedFilters,
    setShowAdvancedFilters,
    hasActiveAdvancedFilters,

    // Results
    filteredContacts,
    totalCount: filteredContacts.length,
    originalCount: contacts.length,

    // Metadata
    allTags,

    // Helpers
    isContactLinked,
    getLinkedAccount,
  };
}

export default {
  useAccountFilters,
  useContactFilters,
};
