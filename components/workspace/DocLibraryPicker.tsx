import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GTMDocMetadata, DocType } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';
import Modal from '../shared/Modal';
import { DatabaseService } from '../../lib/services/database';

// Pagination constants for performance at scale
const DOCS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface DocLibraryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (doc: GTMDocMetadata) => void;
    workspaceId: string;
    userId: string;
    title?: string;
    triggerRef?: React.RefObject<HTMLElement>;
}

export const DocLibraryPicker: React.FC<DocLibraryPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    workspaceId,
    userId,
    title = "Attach GTM Doc",
    triggerRef
}) => {
    const [docs, setDocs] = useState<GTMDocMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState<DocType | 'all'>('all');
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Server-side search with debounce
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            // Reset to initial load when search is cleared
            setDocs([]);
            setOffset(0);
            setHasMore(false);
            loadDocs(0, true);
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await DatabaseService.searchGTMDocs(
                workspaceId,
                query,
                { limit: DOCS_PER_PAGE, offset: 0 }
            );

            if (error) {
                console.error('Error searching GTM docs:', error);
                return;
            }

            setDocs(data || []);
            setOffset(DOCS_PER_PAGE);
            setHasMore((data?.length || 0) === DOCS_PER_PAGE);
        } catch (error) {
            console.error('Failed to search GTM docs:', error);
        } finally {
            setIsSearching(false);
        }
    }, [workspaceId]);

    // Debounced search handler
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        
        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the search
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(value);
        }, SEARCH_DEBOUNCE_MS);
    }, [performSearch]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setDocs([]);
            setOffset(0);
            setHasMore(false);
            setSearchQuery('');
            loadDocs(0, true);
        }
    }, [isOpen, workspaceId]);

    const loadDocs = useCallback(async (currentOffset: number, isInitial: boolean = false) => {
        if (isInitial) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        
        try {
            const { data, error } = await DatabaseService.loadGTMDocs(
                workspaceId,
                {
                    filter: 'all',
                    userId: userId,
                    limit: DOCS_PER_PAGE,
                    offset: currentOffset,
                }
            );

            if (error) {
                console.error('Error loading GTM docs:', error);
                return;
            }

            const newDocs = data || [];
            
            if (isInitial) {
                setDocs(newDocs);
            } else {
                setDocs(prev => [...prev, ...newDocs]);
            }
            
            // Check if there are more docs to load
            setHasMore(newDocs.length === DOCS_PER_PAGE);
            setOffset(currentOffset + newDocs.length);
        } catch (error) {
            console.error('Failed to load GTM docs:', error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [workspaceId, userId]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            if (searchQuery.trim()) {
                // Load more search results
                loadMoreSearchResults();
            } else {
                loadDocs(offset, false);
            }
        }
    }, [offset, isLoadingMore, hasMore, loadDocs, searchQuery]);

    const loadMoreSearchResults = useCallback(async () => {
        setIsLoadingMore(true);
        try {
            const { data, error } = await DatabaseService.searchGTMDocs(
                workspaceId,
                searchQuery,
                { limit: DOCS_PER_PAGE, offset: offset }
            );

            if (error) {
                console.error('Error loading more search results:', error);
                return;
            }

            const newDocs = data || [];
            setDocs(prev => [...prev, ...newDocs]);
            setOffset(prev => prev + newDocs.length);
            setHasMore(newDocs.length === DOCS_PER_PAGE);
        } catch (error) {
            console.error('Failed to load more search results:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [workspaceId, searchQuery, offset]);

    // Client-side filter for doc type only (search is server-side now)
    const filteredDocs = docs.filter(doc => {
        // Filter by doc type
        if (docTypeFilter !== 'all' && doc.docType !== docTypeFilter) {
            return false;
        }
        return true;
    });

    const handleSelect = (doc: GTMDocMetadata) => {
        onSelect(doc);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            triggerRef={triggerRef || React.createRef()}
        >
            <div className="space-y-4">
                {/* Search and Filter */}
                <div className="space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search docs..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    <select
                        value={docTypeFilter}
                        onChange={(e) => setDocTypeFilter(e.target.value as DocType | 'all')}
                        className="w-full px-2 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                        <option value="all">All Types</option>
                        {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => (
                            <option key={type} value={type}>
                                {DOC_TYPE_ICONS[type]} {label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Document List */}
                <div className="max-h-[400px] overflow-y-auto rounded-xl border border-gray-200">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No documents found
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-black">
                            {filteredDocs.map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => handleSelect(doc)}
                                    className="w-full p-3 text-left hover:bg-yellow-50 transition-colors"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-xl flex-shrink-0">
                                            {DOC_TYPE_ICONS[doc.docType] || '📄'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold truncate">{doc.title}</h3>
                                            <p className="text-xs text-gray-600 truncate">
                                                {DOC_TYPE_LABELS[doc.docType]}
                                            </p>
                                            {doc.tags && doc.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {doc.tags.slice(0, 3).map((tag, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-1 text-xs bg-gray-100 border border-gray-300"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {/* Load More Button */}
                            {hasMore && (
                                <div className="p-3 text-center">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
};
