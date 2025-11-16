import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Document, AppActions, TabType, AnyCrmItem, Contact } from '../types';
import { NAV_ITEMS } from '../constants';
import DocumentUploadModal from './shared/DocumentUploadModal';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import { useAuth } from '../contexts/AuthContext';

// Helper to get a representative icon or char
const getFileIcon = (mimeType: string | undefined) => {
    if (!mimeType) return 'DOC';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'IMG';
    if (mimeType.includes('text')) return 'TXT';
    return 'DOC';
};

// Helper to format tab names
const formatModuleName = (module: TabType) => {
    const navItem = NAV_ITEMS.find(item => item.id === module);
    return navItem ? navItem.label : 'General';
};

interface FileLibraryTabProps {
    documents: Document[];
    actions: AppActions;
    companies: AnyCrmItem[];
    contacts: (Contact & { companyName: string })[];
}

function FileLibraryTab({ documents, actions, companies, contacts }: FileLibraryTabProps) {
    const { user } = useAuth();
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notesModalDoc, setNotesModalDoc] = useState<Document | null>(null);
    const notesModalTriggerRef = useRef<HTMLButtonElement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState<TabType | 'all'>('all');
    const [uploaderFilter, setUploaderFilter] = useState<'all' | 'mine'>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const handleFileSelect = (selectedFile: File | null) => {
        if (selectedFile) {
            setFileToUpload(selectedFile);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            handleFileSelect(event.dataTransfer.files[0]);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            handleFileSelect(event.target.files[0]);
            // Reset file input to allow uploading the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleView = (doc: Document) => {
        const mimeType = doc.mimeType || 'application/octet-stream';
        // Create a data URL from the base64 content
        const dataUrl = `data:${mimeType};base64,${doc.content}`;

        const canOpenInline = mimeType.includes('pdf') || mimeType.includes('image');
        // For PDFs and images, open in new tab
        if (canOpenInline) {
            window.open(dataUrl, '_blank');
        } else {
            // For other files, trigger download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = doc.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const sortedDocuments = useMemo(() => {
        if (!Array.isArray(documents)) {
            return [];
        }

        const docs = [...documents];
        return docs.sort((a, b) => (sortOrder === 'desc' ? b.uploadedAt - a.uploadedAt : a.uploadedAt - b.uploadedAt));
    }, [documents, sortOrder]);

    const availableModules = useMemo(() => {
        const unique = new Set<TabType>();
        sortedDocuments.forEach(doc => {
            if (doc.module) {
                unique.add(doc.module);
            }
        });
        return Array.from(unique);
    }, [sortedDocuments]);

    const filteredDocuments = useMemo(() => {
        const lowerSearch = searchTerm.trim().toLowerCase();
        return sortedDocuments.filter(doc => {
            if (moduleFilter !== 'all' && doc.module !== moduleFilter) {
                return false;
            }

            if (uploaderFilter === 'mine' && user?.id && doc.uploadedBy !== user.id) {
                return false;
            }

            if (lowerSearch.length === 0) {
                return true;
            }

            const company = doc.companyId ? companies.find(c => c.id === doc.companyId) : null;
            const contact = doc.contactId ? contacts.find(c => c.id === doc.contactId) : null;
            const searchableText = [
                doc.name,
                doc.uploadedByName,
                company?.company,
                contact?.name,
                formatModuleName(doc.module),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(lowerSearch);
        });
    }, [sortedDocuments, moduleFilter, uploaderFilter, user?.id, searchTerm, companies, contacts]);

    const hasActiveFilters = searchTerm.trim().length > 0 || moduleFilter !== 'all' || uploaderFilter !== 'all';

    const handleDelete = useCallback(
        (doc: Document) => {
            const confirmed = window.confirm(`Delete "${doc.name}" from the File Library? This cannot be undone.`);
            if (confirmed) {
                actions.deleteDocument(doc.id);
            }
        },
        [actions]
    );
    
    return (
        <div className="bg-white p-6 border-2 border-black shadow-neo">
            <DocumentUploadModal
                isOpen={!!fileToUpload}
                onClose={() => setFileToUpload(null)}
                file={fileToUpload}
                actions={actions}
                companies={companies}
                contacts={contacts}
            />
            <Modal
                isOpen={!!notesModalDoc} 
                onClose={() => setNotesModalDoc(null)} 
                title={`Notes for ${notesModalDoc?.name}`} 
                triggerRef={notesModalTriggerRef}
            >
                {notesModalDoc && (
                    <NotesManager
                        notes={notesModalDoc.notes}
                        itemId={notesModalDoc.id}
                        collection="documents"
                        addNoteAction={actions.addNote}
                        updateNoteAction={actions.updateNote}
                        deleteNoteAction={actions.deleteNote}
                    />
                )}
            </Modal>
            <h2 className="text-2xl font-semibold text-black mb-4">File Library</h2>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
                <label className="flex flex-col text-sm font-semibold text-black">
                    <span className="mb-1 font-mono text-xs uppercase tracking-wider">Search</span>
                    <input
                        type="text"
                        className="border-2 border-black px-3 py-2 font-mono text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Search by name, uploader, company or module"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </label>
                <label className="flex flex-col text-sm font-semibold text-black">
                    <span className="mb-1 font-mono text-xs uppercase tracking-wider">Module</span>
                    <select
                        className="border-2 border-black px-3 py-2 font-mono text-sm bg-white focus:outline-none focus:border-blue-500"
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value as TabType | 'all')}
                    >
                        <option value="all">All modules</option>
                        {availableModules.map(module => (
                            <option key={module} value={module}>
                                {formatModuleName(module)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col text-sm font-semibold text-black">
                    <span className="mb-1 font-mono text-xs uppercase tracking-wider">Uploader</span>
                    <select
                        className="border-2 border-black px-3 py-2 font-mono text-sm bg-white focus:outline-none focus:border-blue-500"
                        value={uploaderFilter}
                        onChange={(e) => setUploaderFilter(e.target.value as 'all' | 'mine')}
                        aria-disabled={!user?.id}
                    >
                        <option value="all">All uploads</option>
                        <option value="mine" disabled={!user?.id}>
                            Uploaded by me
                        </option>
                    </select>
                    {!user?.id && (
                        <span className="text-xs font-normal text-gray-500 mt-1">Sign in to filter by uploader.</span>
                    )}
                </label>
                <label className="flex flex-col text-sm font-semibold text-black">
                    <span className="mb-1 font-mono text-xs uppercase tracking-wider">Sort</span>
                    <select
                        className="border-2 border-black px-3 py-2 font-mono text-sm bg-white focus:outline-none focus:border-blue-500"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    >
                        <option value="desc">Newest first</option>
                        <option value="asc">Oldest first</option>
                    </select>
                </label>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-gray-600 mb-4">
                <span>
                    Showing {filteredDocuments.length} of {sortedDocuments.length} file{sortedDocuments.length === 1 ? '' : 's'}
                </span>
                {hasActiveFilters && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setModuleFilter('all');
                            setUploaderFilter('all');
                        }}
                        className="underline text-blue-600 hover:text-blue-800"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            <div
                className="relative block w-full border-2 border-black border-dashed p-12 text-center hover:border-gray-400 mb-8 cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
            >
                <svg className="mx-auto h-12 w-12 text-black" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="mt-2 block text-sm font-semibold text-black">
                    Drag & drop a file here, or{' '}
                    <span className="text-blue-600 hover:underline">
                        click to upload
                    </span>
                </span>
                <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileInputChange} />
            </div>

            {filteredDocuments.length > 0 ? (
                <ul className="space-y-4">
                    {filteredDocuments.map(doc => {
                        const company = doc.companyId ? companies.find(c => c.id === doc.companyId) : null;
                        const contact = doc.contactId ? contacts.find(c => c.id === doc.contactId) : null;

                        return (
                            <li key={doc.id} className="p-4 bg-white border-2 border-black shadow-neo-sm flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-12 h-12 bg-gray-100 border-2 border-black flex items-center justify-center font-mono font-bold shrink-0">
                                        {getFileIcon(doc.mimeType)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-semibold truncate" title={doc.name}>{doc.name}</p>
                                        <p className="text-sm text-gray-600">
                                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                            {doc.uploadedByName && ` by ${doc.uploadedByName}`}
                                            {' | '}Module: {formatModuleName(doc.module)}
                                            {company && ` | Company: ${company.company}`}
                                            {contact && ` | Contact: ${contact.name}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0 ml-auto">
                                     <button 
                                        onClick={(e) => {
                                            setNotesModalDoc(doc);
                                            notesModalTriggerRef.current = e.currentTarget;
                                        }}
                                        className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all"
                                    >
                                        Notes
                                    </button>
                                    <button 
                                        onClick={() => handleView(doc)} 
                                        className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all"
                                        title={(doc.mimeType?.includes('pdf') || doc.mimeType?.includes('image')) ? 'View in new tab' : 'Download file'}
                                    >
                                        {(doc.mimeType?.includes('pdf') || doc.mimeType?.includes('image')) ? 'View' : 'Download'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc)}
                                        className="font-mono bg-white border-2 border-black text-black cursor-pointer text-sm py-1 px-3 rounded-none font-semibold shadow-neo-btn transition-all hover:bg-red-100"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-center py-8 text-gray-600">
                    {sortedDocuments.length === 0 ? (
                        <p className="italic">Your file library is empty. Upload your first document to get started.</p>
                    ) : (
                        <div className="space-y-2">
                            <p className="font-semibold">No files match your filters.</p>
                            <p className="text-sm">Try clearing filters or adjusting your search.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FileLibraryTab;
