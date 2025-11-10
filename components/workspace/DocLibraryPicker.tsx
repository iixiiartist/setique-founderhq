import React, { useState, useEffect } from 'react';
import { GTMDocMetadata, DocType } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';
import Modal from '../shared/Modal';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState<DocType | 'all'>('all');

    useEffect(() => {
        if (isOpen) {
            loadDocs();
        }
    }, [isOpen, workspaceId]);

    const loadDocs = async () => {
        setIsLoading(true);
        try {
            const { DatabaseService } = await import('../../lib/services/database');
            const { data, error } = await DatabaseService.loadGTMDocs(
                workspaceId,
                userId,
                'all',
                searchQuery
            );

            if (error) {
                console.error('Error loading GTM docs:', error);
                return;
            }

            setDocs(data || []);
        } catch (error) {
            console.error('Failed to load GTM docs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDocs = docs.filter(doc => {
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
                    <input
                        type="text"
                        placeholder="Search docs..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            loadDocs();
                        }}
                        className="w-full px-3 py-2 border-2 border-black font-mono text-sm"
                    />
                    <select
                        value={docTypeFilter}
                        onChange={(e) => setDocTypeFilter(e.target.value as DocType | 'all')}
                        className="w-full px-2 py-2 text-sm border-2 border-black font-mono"
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
                <div className="max-h-[400px] overflow-y-auto border-2 border-black">
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
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border-2 border-black font-bold hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
};
