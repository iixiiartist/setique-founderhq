import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GTMDocMetadata, DocType } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';
import { DatabaseService } from '../../lib/services/database';
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';

interface DocsListProps {
    workspaceId: string;
    userId: string;
    onDocSelect: (doc: GTMDocMetadata) => void;
    onCreateNew: () => void;
    selectedDocId: string | null;
}

type FilterType = 'all' | 'mine' | 'team' | 'templates';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export const DocsList: React.FC<DocsListProps> = ({
    workspaceId,
    userId,
    onDocSelect,
    onCreateNew,
    selectedDocId,
}) => {
    const [docs, setDocs] = useState<GTMDocMetadata[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [docTypeFilter, setDocTypeFilter] = useState<DocType | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Debounce search query
    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        
        if (searchQuery.trim()) {
            setIsSearching(true);
            searchDebounceRef.current = setTimeout(() => {
                setDebouncedSearch(searchQuery.trim());
                setCurrentPage(1); // Reset to first page on new search
            }, SEARCH_DEBOUNCE_MS);
        } else {
            setDebouncedSearch('');
            setIsSearching(false);
        }

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, docTypeFilter]);

    // Load docs with pagination
    const loadDocs = useCallback(async () => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            let result;
            
            if (debouncedSearch) {
                // Use server-side search with pagination
                result = await DatabaseService.searchGTMDocs(workspaceId, debouncedSearch, {
                    limit: PAGE_SIZE,
                    offset: (currentPage - 1) * PAGE_SIZE,
                });
                setIsSearching(false);
            } else {
                // Use paginated load
                result = await DatabaseService.loadGTMDocs(workspaceId, {
                    filter,
                    docType: docTypeFilter === 'all' ? undefined : docTypeFilter,
                    userId,
                    limit: PAGE_SIZE,
                    offset: (currentPage - 1) * PAGE_SIZE,
                });
            }
            
            if (result.error) {
                console.error('Error loading docs:', result.error);
                setError('Failed to load documents. Please try again.');
                setDocs([]);
                setTotalCount(0);
            } else {
                setDocs(result.data || []);
                // For search results, we don't have total count, so estimate
                // For paginated results, ideally DB would return count
                // For now, if we get full page, assume more exist
                const count = result.data?.length || 0;
                if (debouncedSearch) {
                    setTotalCount(count);
                } else {
                    // If we got less than PAGE_SIZE, we're on the last page
                    if (count < PAGE_SIZE) {
                        setTotalCount((currentPage - 1) * PAGE_SIZE + count);
                    } else {
                        // Assume at least one more page exists
                        setTotalCount(currentPage * PAGE_SIZE + 1);
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Error loading docs:', err);
                setError('Failed to load documents. Please try again.');
                setDocs([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, filter, docTypeFilter, userId, currentPage, debouncedSearch]);

    useEffect(() => {
        loadDocs();
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadDocs]);

    const handleSeedTemplates = async () => {
        setIsSeeding(true);
        try {
            const { data, error: seedError } = await DatabaseService.seedGTMTemplates(workspaceId, userId);
            
            if (seedError) {
                console.error('Error seeding templates:', seedError);
                setError('Failed to create templates.');
            } else {
                console.log('Templates seeded successfully:', data);
                await loadDocs();
            }
        } catch (err) {
            console.error('Error seeding templates:', err);
            setError('Failed to create templates.');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleCopyTemplate = async (doc: GTMDocMetadata, e: React.MouseEvent) => {
        e.stopPropagation();
        
        const newTitle = window.prompt(`Copy document as:`, `${doc.title} (Copy)`);
        if (!newTitle || !newTitle.trim()) {
            return;
        }

        try {
            const { data: fullDoc, error: loadError } = await DatabaseService.loadGTMDocById(doc.id, workspaceId);
            if (loadError || !fullDoc) {
                setError('Failed to load document content');
                return;
            }
            
            const { data, error: createError } = await DatabaseService.createGTMDoc({
                workspaceId,
                userId,
                title: newTitle.trim(),
                docType: fullDoc.docType,
                visibility: doc.isTemplate ? 'private' : fullDoc.visibility,
                contentJson: fullDoc.contentJson,
                contentPlain: fullDoc.contentPlain,
                tags: fullDoc.tags,
                isTemplate: false,
            });
            
            if (createError) {
                console.error('Error copying document:', createError);
                setError('Failed to copy document');
            } else {
                await loadDocs();
                if (data) {
                    onDocSelect(data as GTMDocMetadata);
                }
            }
        } catch (err) {
            console.error('Error copying document:', err);
            setError('Failed to copy document');
        }
    };

    const handleDeleteDoc = async (docId: string, docTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!window.confirm(`Delete "${docTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { error: deleteError } = await DatabaseService.deleteGTMDoc(docId, workspaceId);
            
            if (deleteError) {
                console.error('Error deleting doc:', deleteError);
                setError('Failed to delete document');
            } else {
                await loadDocs();
            }
        } catch (err) {
            console.error('Error deleting doc:', err);
            setError('Failed to delete document');
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const hasTemplates = docs.some(doc => doc.isTemplate);
    const showPagination = !debouncedSearch && totalPages > 1;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-3 lg:p-4 border-b-2 border-black bg-yellow-300">
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <h2 className="text-base lg:text-lg font-black">GTM Docs</h2>
                    <button
                        onClick={onCreateNew}
                        className="px-2 lg:px-3 py-1 min-h-[44px] lg:min-h-0 text-sm lg:text-base bg-black text-white font-bold border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                        aria-label="Create new document"
                    >
                        + New
                    </button>
                </div>

                {/* Search with loading indicator */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search docs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 border-2 border-black font-mono text-sm"
                        aria-label="Search documents"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" size={16} />
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="p-2 lg:p-3 border-b-2 border-black bg-gray-50">
                <div className="flex gap-1 lg:gap-2 mb-2 overflow-x-auto">
                    {(['all', 'mine', 'team', 'templates'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-1 min-h-[44px] lg:min-h-0 text-xs font-bold border-2 border-black transition-all whitespace-nowrap ${
                                filter === f
                                    ? 'bg-black text-white'
                                    : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Doc Type Filter */}
                <select
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value as DocType | 'all')}
                    className="w-full px-2 py-2 text-xs border-2 border-black font-mono"
                    aria-label="Filter by document type"
                >
                    <option value="all">All Types</option>
                    {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => (
                        <option key={type} value={type}>
                            {DOC_TYPE_ICONS[type]} {label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="px-3 py-2 bg-red-50 border-b-2 border-red-200 text-red-700 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button 
                        onClick={() => setError(null)} 
                        className="text-red-500 hover:text-red-700 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Document List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-gray-500 flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" size={24} />
                        <span>Loading documents...</span>
                    </div>
                ) : docs.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        {debouncedSearch ? (
                            <p className="mb-2">No documents match "{debouncedSearch}"</p>
                        ) : (
                            <>
                                <p className="mb-2">No documents found</p>
                                {!hasTemplates && (
                                    <button
                                        onClick={handleSeedTemplates}
                                        disabled={isSeeding}
                                        className="w-full mb-3 px-3 py-2 bg-purple-100 border-2 border-purple-600 text-purple-900 font-bold hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSeeding ? 'Creating Templates...' : '📋 Create GTM Templates'}
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={onCreateNew}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Create a new document
                        </button>
                    </div>
                ) : (
                    <div className="divide-y-2 divide-black">
                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                className={`w-full p-3 lg:p-3 min-h-[60px] relative group ${
                                    selectedDocId === doc.id ? 'bg-yellow-100' : 'bg-white hover:bg-yellow-50'
                                }`}
                            >
                                <div className="flex items-start gap-2 justify-between">
                                    <div 
                                        onClick={() => onDocSelect(doc)}
                                        className="cursor-pointer flex items-start gap-2 flex-1 min-w-0"
                                    >
                                        <span className="text-lg lg:text-xl flex-shrink-0">
                                            {DOC_TYPE_ICONS[doc.docType] || '📄'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm lg:text-base truncate">{doc.title}</h3>
                                            <p className="text-xs text-gray-600 truncate">
                                                {DOC_TYPE_LABELS[doc.docType]}
                                            </p>
                                            <div className="flex items-center gap-1 lg:gap-2 mt-1 flex-wrap">
                                                <span className={`text-xs px-1 border ${
                                                    doc.visibility === 'private'
                                                        ? 'border-gray-400 text-gray-600'
                                                        : 'border-green-600 text-green-700'
                                                }`}>
                                                    {doc.visibility === 'private' ? '🔒 Private' : '👥 Team'}
                                                </span>
                                                {doc.isTemplate && (
                                                    <span className="text-xs px-1 border border-purple-600 text-purple-700">
                                                        📋 Template
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={(e) => handleCopyTemplate(doc, e)}
                                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-2 border-blue-600 font-bold transition-colors"
                                            title="Copy document"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteDoc(doc.id, doc.title, e)}
                                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 border-2 border-red-600 font-bold transition-colors"
                                            title="Delete document"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {showPagination && (
                <div className="p-2 border-t-2 border-black bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border-2 border-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-mono">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-2 border-2 border-black bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        aria-label="Next page"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
