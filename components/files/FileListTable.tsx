import React from 'react';
import { Document } from '../../types';
import { getFileIcon, calculateDocSize } from './FileCard';
import { formatSize, formatRelativeTime } from './FileLibrarySidebar';
import {
    Download,
    Trash2,
    Send,
    Star,
    StarOff,
    CheckSquare,
    Square,
    Edit2
} from 'lucide-react';

const PANEL_CLASS = 'bg-white border border-gray-200 rounded-lg shadow-sm';

interface FileListTableProps {
    docs: Document[];
    selectedIds: Set<string>;
    selectedDocId: string | null;
    onToggleSelect: (docId: string) => void;
    onToggleSelectAll: () => void;
    onSelectDoc: (docId: string) => void;
    onOpen: (doc: Document) => void;
    onShare: (doc: Document) => void;
    onToggleStar: (doc: Document, isStarred: boolean) => void;
    onDelete: (doc: Document) => void;
    onEditInEditor?: (doc: Document) => void;
    isEditableCheck: (mimeType: string | undefined, fileName?: string) => boolean;
    isConverting: boolean;
}

export function FileListTable({
    docs,
    selectedIds,
    selectedDocId,
    onToggleSelect,
    onToggleSelectAll,
    onSelectDoc,
    onOpen,
    onShare,
    onToggleStar,
    onDelete,
    onEditInEditor,
    isEditableCheck,
    isConverting
}: FileListTableProps) {
    const allSelected = docs.length > 0 && docs.every(doc => selectedIds.has(doc.id));

    return (
        <div className={`${PANEL_CLASS} overflow-hidden`} onClick={e => e.stopPropagation()}>
            <table className="w-full text-sm">
                <thead className="bg-black text-white uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">
                            <button className="flex items-center gap-2" onClick={onToggleSelectAll}>
                                {selectedIds.size > 0 && allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                Name
                            </button>
                        </th>
                        <th className="px-4 py-3">Owner</th>
                        <th className="px-4 py-3">Tags</th>
                        <th className="px-4 py-3">Views</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {docs.map(doc => (
                        <tr 
                            key={doc.id} 
                            className={`border-t text-sm cursor-pointer ${selectedDocId === doc.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}`} 
                            onClick={() => onSelectDoc(doc.id)}
                        >
                            <td className="px-4 py-2">
                                <div className="flex items-center gap-3">
                                    <button onClick={e => { e.stopPropagation(); onToggleSelect(doc.id); }}>
                                        {selectedIds.has(doc.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <div className="w-10 h-10 border rounded flex items-center justify-center bg-white">{getFileIcon(doc.mimeType)}</div>
                                    <div>
                                        <p className="font-semibold truncate w-56" title={doc.name}>{doc.name}</p>
                                        <p className="text-xs text-gray-500">{formatRelativeTime(doc.uploadedAt)}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-2 text-xs uppercase">{doc.uploadedByName || 'Unknown'}</td>
                            <td className="px-4 py-2">
                                <TagList tags={doc.tags || []} limit={3} />
                            </td>
                            <td className="px-4 py-2 text-center text-xs">{doc.viewCount || 0}</td>
                            <td className="px-4 py-2 text-xs">{formatSize(doc.fileSize || calculateDocSize(doc))}</td>
                            <td className="px-4 py-2">
                                <div className="flex items-center justify-end gap-2">
                                    {isEditableCheck(doc.mimeType, doc.name) && onEditInEditor && (
                                        <button 
                                            onClick={e => { e.stopPropagation(); onEditInEditor(doc); }} 
                                            title="Edit in GTM Editor" 
                                            className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                            disabled={isConverting}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                    <button onClick={e => { e.stopPropagation(); onOpen(doc); }}><Download size={14} /></button>
                                    <button onClick={e => { e.stopPropagation(); onShare(doc); }}><Send size={14} /></button>
                                    <button onClick={e => { e.stopPropagation(); onToggleStar(doc, !doc.isStarred); }}>
                                        {doc.isStarred ? <Star size={14} className="text-yellow-500" /> : <StarOff size={14} />}
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); onDelete(doc); }}><Trash2 size={14} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TagList({ tags, limit }: { tags: string[]; limit?: number }) {
    if (!tags.length) return <span className="text-xs text-gray-400">No tags</span>;
    const display = typeof limit === 'number' ? tags.slice(0, limit) : tags;
    return (
        <div className="flex flex-wrap gap-1">
            {display.map(tag => (
                <span key={tag} className="px-2 py-0.5 border rounded text-[10px] uppercase tracking-tight">{tag}</span>
            ))}
            {limit && tags.length > limit && <span className="text-[10px] text-gray-500">+{tags.length - limit}</span>}
        </div>
    );
}
