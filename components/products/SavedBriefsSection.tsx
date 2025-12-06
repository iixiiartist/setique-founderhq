// components/products/SavedBriefsSection.tsx
// Displays saved market briefs with AI search and options to view, share, or delete

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Globe, Trash2, Share2, Eye, Clock, ChevronDown, ChevronUp, Loader2, Search, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { getWorkspaceMarketBriefs, type SavedMarketBrief } from '../../lib/services/reportSharingService';
import { ShareReportDialog } from '../shared/ShareReportDialog';
import { supabase } from '../../lib/supabase';
import { showSuccess, showError } from '../../lib/utils/toast';

interface SavedBriefsSectionProps {
  workspaceId: string;
  onViewBrief: (brief: SavedMarketBrief) => void;
  // AI Search props
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onMarketResearch: () => void;
  isSearching: boolean;
  isAIEnabled: boolean;
  aiUnavailableReason: string | null;
}

export const SavedBriefsSection: React.FC<SavedBriefsSectionProps> = ({
  workspaceId,
  onViewBrief,
  searchTerm,
  onSearchTermChange,
  onMarketResearch,
  isSearching,
  isAIEnabled,
  aiUnavailableReason,
}) => {
  const [briefs, setBriefs] = useState<SavedMarketBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState<SavedMarketBrief | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBriefs = useCallback(async () => {
    setLoading(true);
    const result = await getWorkspaceMarketBriefs(workspaceId);
    if (result.success && result.briefs) {
      setBriefs(result.briefs);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchBriefs();
  }, [fetchBriefs]);

  const handleDelete = async (briefId: string) => {
    setDeleting(briefId);
    try {
      const { error } = await supabase
        .from('market_briefs')
        .delete()
        .eq('id', briefId);

      if (error) {
        showError('Failed to delete brief');
      } else {
        showSuccess('Brief deleted');
        setBriefs(prev => prev.filter(b => b.id !== briefId));
      }
    } catch (err) {
      showError('Failed to delete brief');
    } finally {
      setDeleting(null);
    }
  };

  const handleShare = (brief: SavedMarketBrief) => {
    setSelectedBrief(brief);
    setShowShareDialog(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Market Research</h3>
            <p className="text-xs text-zinc-400">
              {briefs.length} saved {briefs.length === 1 ? 'brief' : 'briefs'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* AI Search Section */}
      <div className="px-5 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-gray-100">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Describe what you want to research..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onMarketResearch();
              }
            }}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
          />
        </div>

        {/* AI Warnings */}
        {aiUnavailableReason && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
            <span>⚠️</span>
            <span>{aiUnavailableReason}</span>
          </div>
        )}
        {!isAIEnabled && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-xs">
            <span>🔒</span>
            <span>AI features are disabled for this workspace. Contact your admin to enable.</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-3">
          <button
            onClick={onMarketResearch}
            disabled={isSearching || !isAIEnabled || !searchTerm.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isSearching ? 'Researching...' : 'Research Online'}</span>
          </button>
        </div>
      </div>

      {/* Content - Saved Briefs */}
      {expanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Saved Briefs</h4>
            <button
              onClick={fetchBriefs}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading briefs...
            </div>
          ) : briefs.length === 0 ? (
            <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No saved briefs yet</p>
              <p className="text-xs text-gray-400 mt-1">Research a topic to get started</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group cursor-pointer"
                  onClick={() => onViewBrief(brief)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Globe className="w-4 h-4 text-zinc-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate text-sm">{brief.query}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(brief.created_at)}</span>
                        {brief.share_token && (
                          <span className="flex items-center gap-1 text-green-600">
                            <ExternalLink className="w-3 h-3" />
                            Shared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewBrief(brief);
                      }}
                      className="p-2 text-gray-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                      title="View Brief"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(brief);
                      }}
                      className="p-2 text-gray-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                      title="Share Brief"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(brief.id);
                      }}
                      disabled={deleting === brief.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Brief"
                    >
                      {deleting === brief.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share Dialog */}
      {selectedBrief && (
        <ShareReportDialog
          isOpen={showShareDialog}
          onClose={() => {
            setShowShareDialog(false);
            setSelectedBrief(null);
          }}
          reportId={selectedBrief.id}
          reportType="brief"
          reportTitle={selectedBrief.query}
          existingToken={selectedBrief.share_token}
        />
      )}
    </div>
  );
};

export default SavedBriefsSection;
