import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Document, AppActions, TabType, AnyCrmItem, Contact } from '../types';
import { NAV_ITEMS } from '../constants';
import DocumentUploadModal from './shared/DocumentUploadModal';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { EmailComposer } from './email/EmailComposer';
import { 
  Grid, 
  List, 
  Search, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  MoreVertical, 
  Download, 
  Trash2, 
  Upload, 
  Clock, 
  HardDrive,
  File,
  LayoutGrid,
  ChevronRight,
  Info,
  Send
} from 'lucide-react';

// --- Types & Helpers ---

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'recent' | 'mine';

interface FileLibraryTabProps {
    documents: Document[];
    actions: AppActions;
    companies: AnyCrmItem[];
    contacts: (Contact & { companyName: string })[];
}

const getFileIcon = (mimeType: string | undefined) => {
    if (!mimeType) return <File className="w-8 h-8 text-gray-400" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (mimeType.includes('text')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="w-8 h-8 text-green-500" />;
    return <File className="w-8 h-8 text-indigo-500" />;
};

const formatSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const PANEL_CLASS = 'bg-white border border-gray-200 rounded-lg shadow-sm';
const CONTROL_STRIP_CLASS = 'border border-gray-200 bg-white rounded-lg shadow-sm';

// --- Main Component ---

export default function FileLibraryTab({ documents, actions, companies, contacts }: FileLibraryTabProps) {
    const { user } = useAuth();
    
    // State
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [selectedModule, setSelectedModule] = useState<TabType | null>(null);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    
    // Upload & Modals
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notesModalDoc, setNotesModalDoc] = useState<Document | null>(null);
    const notesModalTriggerRef = useRef<HTMLButtonElement | null>(null);

    // Email Composer
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    // --- Handlers ---

    const handleFileSelect = (selectedFile: File | null) => {
        if (selectedFile) setFileToUpload(selectedFile);
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

    const handleDownload = (doc: Document) => {
        const mimeType = doc.mimeType || 'application/octet-stream';
        const dataUrl = `data:${mimeType};base64,${doc.content}`;
        
        // Try to open in new tab for previewable types
        if (mimeType.includes('pdf') || mimeType.includes('image')) {
            const win = window.open();
            if (win) {
                win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                return;
            }
        }
        
        // Fallback to download
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = (doc: Document) => {
        if (window.confirm(`Delete "${doc.name}"?`)) {
            actions.deleteDocument(doc.id);
            if (selectedDocId === doc.id) setSelectedDocId(null);
        }
    };

    const handleShare = (doc: Document) => {
        setEmailSubject(`Document: ${doc.name}`);
        setEmailBody(`Hi,\n\nI'm sharing the document "${doc.name}" with you.\n\nBest regards,`);
        setShowEmailComposer(true);
    };

    // --- Filtering ---

    const filteredDocs = useMemo(() => {
        let docs = documents || [];

        // 1. Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(d => 
                d.name.toLowerCase().includes(q) || 
                d.uploadedByName?.toLowerCase().includes(q)
            );
        }

        // 2. Module / Folder
        if (selectedModule) {
            docs = docs.filter(d => d.module === selectedModule);
        }

        // 3. Sidebar Filters
        if (activeFilter === 'recent') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            docs = docs.filter(d => new Date(d.uploadedAt) > sevenDaysAgo);
        } else if (activeFilter === 'mine') {
            if (user) docs = docs.filter(d => d.uploadedBy === user.id);
        }

        // Sort by newest
        return docs.sort((a, b) => b.uploadedAt - a.uploadedAt);
    }, [documents, searchQuery, selectedModule, activeFilter, user]);

    const selectedDoc = useMemo(() => 
        documents.find(d => d.id === selectedDocId), 
    [documents, selectedDocId]);

    // --- Render ---

    return (
        <div
            className="flex h-full bg-[#FDF9F2] text-black font-mono overflow-hidden border-t border-gray-200"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            
            {/* Modals */}
            <DocumentUploadModal
                isOpen={!!fileToUpload}
                onClose={() => setFileToUpload(null)}
                file={fileToUpload}
                actions={actions}
                companies={companies}
                contacts={contacts}
                initialModule={selectedModule || undefined}
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

            {/* Sidebar */}
            <div className="w-72 bg-white border-r border-gray-200 shadow-sm flex flex-col shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-gray-200">
                    <div className="w-10 h-10 bg-yellow-300 border border-gray-300 rounded-lg flex items-center justify-center shadow-sm">
                        <HardDrive className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-2xl font-black tracking-tight">Drive</span>
                </div>

                <div className="px-4 mb-6 pt-4 border-b border-dashed border-gray-300">
                    <Button 
                        onClick={() => fileInputRef.current?.click()}
                        fullWidth
                        className="justify-center gap-3 uppercase"
                    >
                        <Upload size={18} />
                        Upload File
                    </Button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                </div>

                <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto bg-[#FEFBF3]">
                    <SidebarItem 
                        icon={<LayoutGrid size={18} />} 
                        label="All Files" 
                        active={activeFilter === 'all' && !selectedModule} 
                        onClick={() => { setActiveFilter('all'); setSelectedModule(null); }}
                    />
                    <SidebarItem 
                        icon={<Clock size={18} />} 
                        label="Recent" 
                        active={activeFilter === 'recent'} 
                        onClick={() => { setActiveFilter('recent'); setSelectedModule(null); }}
                    />
                    <SidebarItem 
                        icon={<Folder size={18} />} 
                        label="My Uploads" 
                        active={activeFilter === 'mine'} 
                        onClick={() => { setActiveFilter('mine'); setSelectedModule(null); }}
                    />

                    <div className="pt-6 pb-2 px-4 text-xs font-black uppercase tracking-[0.3em] text-black border-b border-gray-300">
                        FOLDERS
                    </div>
                    {NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').map(item => (
                        <SidebarItem 
                            key={item.id}
                            icon={<Folder size={18} className={selectedModule === item.id ? "text-indigo-500" : "text-gray-400"} />} 
                            label={item.label} 
                            active={selectedModule === item.id} 
                            onClick={() => { setSelectedModule(item.id); setActiveFilter('all'); }}
                        />
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-tight">
                        <span className="cursor-pointer hover:text-yellow-600" onClick={() => { setActiveFilter('all'); setSelectedModule(null); }}>Drive</span>
                        {selectedModule && (
                            <>
                                <ChevronRight size={18} />
                                <span>{NAV_ITEMS.find(i => i.id === selectedModule)?.label}</span>
                            </>
                        )}
                    </div>

                    <div className="flex-1 max-w-xl mx-8 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                        <input 
                            type="text"
                            placeholder="Search files..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm uppercase tracking-tight"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={`${CONTROL_STRIP_CLASS} flex items-center gap-2 p-1`}>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 font-semibold rounded ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                        >
                            <List size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-2 font-semibold rounded ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                        >
                            <Grid size={16} />
                        </button>
                    </div>
                </header>

                {/* File Area */}
                <main className="flex-1 overflow-y-auto p-8 space-y-6" onClick={() => setSelectedDocId(null)}>
                    {filteredDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-6 bg-white shadow-sm">
                                <Upload className="w-12 h-12" />
                            </div>
                            <p className="text-xl font-black tracking-tight">No files yet</p>
                            <p className="text-sm text-gray-600">Drop files anywhere or use the upload button</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                    {filteredDocs.map((doc) => (
                                        <div 
                                            key={doc.id}
                                            onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); }}
                                            onDoubleClick={() => handleDownload(doc)}
                                            className={`
                                                group relative ${PANEL_CLASS} p-4 transition-all cursor-pointer flex flex-col items-center text-center
                                                ${selectedDocId === doc.id ? 'ring-4 ring-yellow-200 translate-y-0' : 'hover:-translate-y-1 hover:-translate-x-1'}
                                            `}
                                        >
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button 
                                                    className="p-1 border border-gray-300 rounded bg-white hover:bg-black hover:text-white"
                                                    onClick={(e) => { e.stopPropagation(); /* Menu */ }}
                                                >
                                                    <MoreVertical size={14} className="text-gray-500" />
                                                </button>
                                            </div>
                                            
                                            <div className="w-20 h-20 mb-4 flex items-center justify-center border border-gray-200 rounded-lg bg-white shadow-sm group-hover:scale-105 transition-transform">
                                                {getFileIcon(doc.mimeType)}
                                            </div>
                                            
                                            <h4 className="text-sm font-black truncate w-full mb-1" title={doc.name}>
                                                {doc.name}
                                            </h4>
                                            <p className="text-xs text-gray-600">
                                                {new Date(doc.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`${PANEL_CLASS} overflow-hidden`}>
                                    <table className="w-full text-left text-sm text-black">
                                        <thead className="bg-black text-white text-xs uppercase font-black">
                                            <tr>
                                                <th className="px-6 py-3">Name</th>
                                                <th className="px-6 py-3">Owner</th>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Module</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredDocs.map((doc) => (
                                                <tr 
                                                    key={doc.id} 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); }}
                                                    className={`
                                                        group transition-colors cursor-pointer border-b border-gray-200 last:border-b-0
                                                        ${selectedDocId === doc.id ? 'bg-yellow-100' : 'hover:bg-gray-100'}
                                                    `}
                                                >
                                                    <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-3">
                                                        <div className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded bg-white">
                                                            {getFileIcon(doc.mimeType)}
                                                        </div>
                                                        <span className="truncate max-w-xs">{doc.name}</span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 border border-gray-200 rounded bg-white flex items-center justify-center text-xs font-black">
                                                                {doc.uploadedByName?.[0] || 'U'}
                                                            </div>
                                                            <span className="text-xs uppercase tracking-tight">{doc.uploadedByName || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-3">
                                                        <span className="px-2 py-1 border border-gray-300 rounded text-xs font-semibold">
                                                            {NAV_ITEMS.find(i => i.id === doc.module)?.label || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-black hover:text-white">
                                                                <Download size={16} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleShare(doc); }} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-blue-600 hover:text-white" title="Share via Email">
                                                                <Send size={16} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(doc); }} className="p-1.5 border border-gray-300 rounded bg-white hover:bg-red-600 hover:text-white">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Right Details Panel (Only when file selected) */}
            {selectedDoc && (
                <div className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col overflow-y-auto shrink-0 shadow-sm">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-3">
                        <h3 className="font-black text-lg flex items-center gap-2">
                            <Info size={18} />
                            File Details
                        </h3>
                        <button onClick={() => setSelectedDocId(null)} className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center font-bold hover:bg-gray-100">
                            ×
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-6">
                        <div className="w-32 h-32 border border-gray-200 rounded-lg bg-white flex items-center justify-center mb-4 shadow-sm">
                            {getFileIcon(selectedDoc.mimeType)}
                        </div>
                        <h4 className="font-black text-center break-all">{selectedDoc.name}</h4>
                    </div>

                    <div className="space-y-4">
                        <DetailRow label="Type" value={selectedDoc.mimeType || 'Unknown'} />
                        <DetailRow label="Size" value={formatSize(docSize(selectedDoc))} />
                        <DetailRow label="Uploaded" value={new Date(selectedDoc.uploadedAt).toLocaleString()} />
                        <DetailRow label="Owner" value={selectedDoc.uploadedByName || 'Unknown'} />
                        <DetailRow label="Location" value={NAV_ITEMS.find(i => i.id === selectedDoc.module)?.label || 'General'} />
                    </div>

                    <div className="mt-8 pt-6 border-t border-dashed border-gray-300 flex flex-col gap-3">
                        <Button 
                            onClick={() => handleDownload(selectedDoc)}
                            className="w-full justify-center gap-2"
                        >
                            <Download size={16} /> Download
                        </Button>
                        <Button 
                            onClick={() => handleShare(selectedDoc)}
                            variant="secondary"
                            className="w-full justify-center gap-2"
                        >
                            <Send size={16} /> Share via Email
                        </Button>
                        <Button 
                            onClick={() => setNotesModalDoc(selectedDoc)}
                            variant="secondary"
                            className="w-full justify-center gap-2"
                        >
                            <FileText size={16} /> Notes
                        </Button>
                        <Button 
                            onClick={() => handleDelete(selectedDoc)}
                            variant="danger"
                            className="w-full justify-center gap-2"
                        >
                            <Trash2 size={16} /> Delete
                        </Button>
                    </div>
                </div>
            )}

            <EmailComposer
                isOpen={showEmailComposer}
                onClose={() => setShowEmailComposer(false)}
                initialSubject={emailSubject}
                initialBody={emailBody}
            />
        </div>
    );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-md text-left transition-all mb-1 tracking-tight
                ${active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}
            `}
        >
            <span className={`text-base ${active ? 'text-white' : 'text-black/60'}`}>{icon}</span>
            <span className="truncate uppercase">{label}</span>
        </button>
    );
}

function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col gap-1 pb-2 border-b border-black/10 last:border-b-0">
            <span className="text-xs font-black uppercase tracking-wide">{label}</span>
            <span className="text-sm text-black break-words">{value}</span>
        </div>
    );
}

// Helper to estimate size from base64 (rough approx)
function docSize(doc: Document): number {
    if (!doc.content) return 0;
    return Math.ceil((doc.content.length * 3) / 4);
}
