import { useState, useEffect } from 'react';
import { Task, AnyCrmItem, CalendarEvent, GTMDocMetadata, BusinessProfile } from '../types';
import { DatabaseService } from '../lib/services/database';

// Limits for AI context to avoid token bloat
const MAX_RELATED_DOCS = 3;
const DOCS_FETCH_LIMIT = 20;

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
      // getBusinessProfile returns an array; pick the first profile if present
      const { data: businessProfileData } = await DatabaseService.getBusinessProfile(workspaceId);
      const businessProfile = Array.isArray(businessProfileData) ? businessProfileData[0] ?? null : businessProfileData;

      // Only fetch current doc and related docs if we have a docId
      let currentDocType: string | undefined = undefined;
      let relatedDocs: GTMDocMetadata[] = [];
      
      if (docId) {
        // Load only the current doc to get its type
        const { data: currentDoc } = await DatabaseService.loadGTMDocById(docId, workspaceId);
        if (currentDoc) {
          currentDocType = currentDoc.docType;
          
          // Use scoped query to find related docs (same type, team visibility)
          // Limit fetch to avoid unbounded queries
          const docsRes = await DatabaseService.loadGTMDocs(workspaceId, { 
            filter: 'team',
            userId: userId,
            limit: DOCS_FETCH_LIMIT,
          });
          const allDocs = docsRes.data || [];
          
          // Find related docs (same doc type or shared tags, excluding current doc)
          relatedDocs = allDocs
            .filter(d => 
              d.id !== docId && 
              d.visibility === 'team' &&
              (
                d.docType === currentDocType ||
                d.tags.some(tag => currentDoc.tags?.includes(tag))
              )
            )
            .slice(0, MAX_RELATED_DOCS); // Limit to avoid context overflow
        }
      }

      setContext({
        businessProfile: businessProfile || null,
        currentDocType,
        relatedDocs,
        workspaceId,
      });
    } catch (err) {
      const error = err as Error;
      console.error('Failed to fetch AI workspace context:', error);
      setError(error);
      setContext(null); // Clear context on error
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
