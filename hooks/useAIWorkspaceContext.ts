import { useState, useEffect } from 'react';
import { Task, AnyCrmItem, CalendarEvent, GTMDocMetadata, BusinessProfile } from '../types';
import { DatabaseService } from '../lib/services/database';

export interface AIWorkspaceContext {
  // Business context - this is what matters for GTM writing
  businessProfile: BusinessProfile | null;
  
  // Current document context
  currentDocType?: string;
  
  // Related documents for reference (not data dump)
  relatedDocs: GTMDocMetadata[];
  
  // Workspace ID for API calls
  workspaceId: string;
}

interface UseAIWorkspaceContextResult {
  context: AIWorkspaceContext | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches comprehensive workspace context for AI assistant
 * Includes business profile, linked entities, and related documents
 */
export function useAIWorkspaceContext(
  docId: string | undefined,
  workspaceId: string,
  userId: string
): UseAIWorkspaceContextResult {
  const [context, setContext] = useState<AIWorkspaceContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContext = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch business profile - this is the key context for GTM writing
      const { data: businessProfile } = await DatabaseService.getBusinessProfile(workspaceId);

      // Only fetch related docs if we have a docId (no need for tasks/CRM data dump)
      let relatedDocs: GTMDocMetadata[] = [];
      
      if (docId) {
        const docsRes = await DatabaseService.loadGTMDocs(workspaceId, { filter: 'team' });
        const allDocs = docsRes.data || [];
        
        // Find related docs (same doc type or shared tags, excluding current doc)
        const currentDoc = allDocs.find(d => d.id === docId);
        relatedDocs = allDocs
          .filter(d => 
            d.id !== docId && 
            d.visibility === 'team' &&
            (
              d.docType === currentDoc?.docType ||
              d.tags.some(tag => currentDoc?.tags.includes(tag))
            )
          )
          .slice(0, 3); // Limit to 3 most relevant for context
      }

      setContext({
        businessProfile: businessProfile || null,
        currentDocType: docId ? undefined : undefined,
        relatedDocs,
        workspaceId,
      });
    } catch (err) {
      console.error('Failed to fetch AI workspace context:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [docId, workspaceId, userId]);

  return {
    context,
    loading,
    error,
    refetch: fetchContext
  };
}
