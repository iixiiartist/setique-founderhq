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

    const filteredDocs = docs.filter(doc => {
        if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b-2 border-black bg-yellow-300">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-black">GTM Docs</h2>
                    <button
                        onClick={onCreateNew}
                        className="px-3 py-1 bg-black text-white font-bold border-2 border-black shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
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
                    className="w-full px-3 py-2 border-2 border-black font-mono text-sm"
                    aria-label="Search documents"
                />
            </div>

            {/* Filters */}
            <div className="p-3 border-b-2 border-black bg-gray-50">
                <div className="flex gap-2 mb-2">
                    {(['all', 'mine', 'team', 'templates'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-1 text-xs font-bold border-2 border-black transition-all ${
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
                    className="w-full px-2 py-1 text-xs border-2 border-black font-mono"
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
                        <button
                            onClick={onCreateNew}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Create your first doc
                        </button>
                    </div>
                ) : (
                    <div className="divide-y-2 divide-black">
                        {filteredDocs.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => onDocSelect(doc)}
                                className={`w-full p-3 text-left hover:bg-yellow-50 transition-colors ${
                                    selectedDocId === doc.id ? 'bg-yellow-100' : 'bg-white'
                                }`}
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
                                        <div className="flex items-center gap-2 mt-1">
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
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
