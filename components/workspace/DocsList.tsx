import React, { useState, useEffect } from 'react';
import { GTMDocMetadata, DocType } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';

interface DocsListProps {
    workspaceId: string;
    userId: string;
    onDocSelect: (doc: GTMDocMetadata) => void;
    onCreateNew: () => void;
    selectedDocId: string | null;
}

type FilterType = 'all' | 'mine' | 'team' | 'templates';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    useEffect(() => {
        loadDocs();
    }, [workspaceId, filter, docTypeFilter]);

    const loadDocs = async () => {
        setIsLoading(true);
        try {
            const { DatabaseService } = await import('../../lib/services/database');
            const { data, error } = await DatabaseService.loadGTMDocs(workspaceId, {
                filter,
                docType: docTypeFilter === 'all' ? undefined : docTypeFilter,
                userId
            });
            
            if (error) {
                console.error('Error loading docs:', error);
                setDocs([]);
            } else {
                setDocs(data || []);
            }
        } catch (error) {
            console.error('Error loading docs:', error);
            setDocs([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSeedTemplates = async () => {
        setIsSeeding(true);
        try {
            const { DatabaseService } = await import('../../lib/services/database');
            const { data, error } = await DatabaseService.seedGTMTemplates(workspaceId, userId);
            
            if (error) {
                console.error('Error seeding templates:', error);
            } else {
                console.log('Templates seeded successfully:', data);
                // Reload docs to show new templates
                await loadDocs();
            }
        } catch (error) {
            console.error('Error seeding templates:', error);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleCopyTemplate = async (doc: GTMDocMetadata, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent doc selection
        
        const newTitle = window.prompt(`Copy document as:`, `${doc.title} (Copy)`);
        if (!newTitle || !newTitle.trim()) {
            return;
        }

        try {
            const { DatabaseService } = await import('../../lib/services/database');
            
            // Load full doc content
            const { data: fullDoc, error: loadError } = await DatabaseService.loadGTMDocById(doc.id, workspaceId);
            if (loadError || !fullDoc) {
                alert('Failed to load document content');
                return;
            }
            
            // Create new doc as non-template copy (preserve original visibility if not template)
            const { data, error } = await DatabaseService.createGTMDoc({
                workspaceId,
                userId,
                title: newTitle.trim(),
                docType: fullDoc.docType,
                visibility: doc.isTemplate ? 'private' : fullDoc.visibility, // Templates become private, others keep visibility
                contentJson: fullDoc.contentJson,
                contentPlain: fullDoc.contentPlain,
                tags: fullDoc.tags,
                isTemplate: false, // Copies are never templates
            });
            
            if (error) {
                console.error('Error copying document:', error);
                alert('Failed to copy document');
            } else {
                // Reload docs to show new copy
                await loadDocs();
                // Open the new doc
                if (data) {
                    onDocSelect(data as GTMDocMetadata);
                }
            }
        } catch (error) {
            console.error('Error copying document:', error);
            alert('Failed to copy document');
        }
    };

    const handleDeleteDoc = async (docId: string, docTitle: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent doc selection
        
        if (!window.confirm(`Delete "${docTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { DatabaseService } = await import('../../lib/services/database');
            const { error } = await DatabaseService.deleteGTMDoc(docId, workspaceId);
            
            if (error) {
                console.error('Error deleting doc:', error);
                alert('Failed to delete document');
            } else {
                // Reload docs to remove deleted item
                await loadDocs();
            }
        } catch (error) {
            console.error('Error deleting doc:', error);
            alert('Failed to delete document');
        }
    };

    const filteredDocs = docs.filter(doc => {
        if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    const hasTemplates = docs.some(doc => doc.isTemplate);

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

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-2 lg:px-3 py-2 border-2 border-black font-mono text-sm"
                    aria-label="Search documents"
                />
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

            {/* Document List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : filteredDocs.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
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
                        <button
                            onClick={onCreateNew}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Or create your first doc
                        </button>
                    </div>
                ) : (
                    <div className="divide-y-2 divide-black">
                        {filteredDocs.map((doc) => (
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
        </div>
    );
};
