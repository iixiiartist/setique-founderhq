/**
 * React Query hooks for CRM data fetching (Investors, Customers, Partners)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseService } from '../lib/services/database';
import { Investor, Customer, Partner } from '../types';
import { supabase } from '../lib/supabase';
import { dbToCrmItem, dbToContact } from '../lib/utils/fieldTransformers';

// Query keys
export const crmKeys = {
  all: ['crm'] as const,
  workspace: (workspaceId: string) => [...crmKeys.all, workspaceId] as const,
  type: (workspaceId: string, type: string) => [...crmKeys.workspace(workspaceId), type] as const,
  byId: (itemId: string) => [...crmKeys.all, 'detail', itemId] as const,
};

/**
 * Fetch all CRM items for a workspace
 */
export function useWorkspaceCrm(workspaceId: string | undefined) {
  return useQuery({
    queryKey: crmKeys.workspace(workspaceId || ''),
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error('Workspace ID required');
      }

      // Load contacts and meetings first (needed for all CRM types)
      const [contactsResult, meetingsResult] = await Promise.all([
        DatabaseService.getContacts(workspaceId),
        DatabaseService.getMeetings(workspaceId)
      ]);

      const allContacts = contactsResult.data || [];
      const allMeetings = meetingsResult.data || [];

      // Fetch each CRM type separately with database-level filtering
      const crmTypes = ['investor', 'customer', 'partner'] as const;
      
      const crmResults = await Promise.all(
        crmTypes.map(async (type) => {
          const { data: crmItems } = await DatabaseService.getCrmItems(workspaceId, { 
            type,
            limit: 1000
          });
          
          // Transform CRM items with contacts and meetings
          const transformedItems = (crmItems || []).map(item => {
            const itemContacts = allContacts
              .filter(c => c.crm_item_id === item.id)
              .map(contact => {
                const contactMeetings = allMeetings.filter(m => m.contact_id === contact.id);
                const transformedContact = dbToContact(contact);
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
          });
          
          return { type, data: transformedItems };
        })
      );

      return {
        investors: crmResults.find(r => r.type === 'investor')?.data || [],
        customers: crmResults.find(r => r.type === 'customer')?.data || [],
        partners: crmResults.find(r => r.type === 'partner')?.data || []
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch CRM items of a specific type
 */
export function useCrmType(workspaceId: string | undefined, type: 'investor' | 'customer' | 'partner') {
  return useQuery({
    queryKey: crmKeys.type(workspaceId || '', type),
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error('Workspace ID required');
      }

      const [contactsResult, meetingsResult, crmResult] = await Promise.all([
        DatabaseService.getContacts(workspaceId),
        DatabaseService.getMeetings(workspaceId),
        DatabaseService.getCrmItems(workspaceId, { type, limit: 1000 })
      ]);

      const allContacts = contactsResult.data || [];
      const allMeetings = meetingsResult.data || [];
      const crmItems = crmResult.data || [];

      // Transform CRM items with contacts and meetings
      return crmItems.map(item => {
        const itemContacts = allContacts
          .filter(c => c.crm_item_id === item.id)
          .map(contact => {
            const contactMeetings = allMeetings.filter(m => m.contact_id === contact.id);
            const transformedContact = dbToContact(contact);
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
      });
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new CRM item
 */
export function useCreateCrmItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      workspaceId: string;
      type: 'investor' | 'customer' | 'partner';
      company: string;
      stage?: string;
    }) => {
      const { data: result, error } = await DatabaseService.createCrmItem(
        data.userId,
        data.workspaceId,
        {
          type: data.type,
          company: data.company,
          stage: data.stage,
        } as any
      );

      if (error) {
        throw error;
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace CRM and specific type
      queryClient.invalidateQueries({ 
        queryKey: crmKeys.workspace(variables.workspaceId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: crmKeys.type(variables.workspaceId, variables.type) 
      });
    },
  });
}

/**
 * Update a CRM item
 */
export function useUpdateCrmItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<any> }) => {
      const { data, error } = await DatabaseService.updateCrmItem(itemId, updates);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all CRM queries
      queryClient.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

/**
 * Delete a CRM item
 */
export function useDeleteCrmItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await DatabaseService.deleteCrmItem(itemId);

      if (error) {
        throw error;
      }

      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

/**
 * Prefetch CRM items of a specific type
 */
export function usePrefetchCrmType() {
  const queryClient = useQueryClient();

  return async (workspaceId: string, type: 'investor' | 'customer' | 'partner') => {
    await queryClient.prefetchQuery({
      queryKey: crmKeys.type(workspaceId, type),
      queryFn: async () => {
        const { data } = await DatabaseService.getCrmItems(workspaceId, { type, limit: 1000 });
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}
