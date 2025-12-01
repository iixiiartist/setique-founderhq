import React from 'react';
import { Document, AppActions, ProductService } from '../../types';
import { NAV_ITEMS } from '../../constants';
import { formatSize, formatRelativeTime } from './FileLibrarySidebar';
import {
    Download,
    Trash2,
    Send,
    Star,
    StarOff,
    CheckSquare,
    Square,
    FileText,
    Edit2,
    File,
    Image as ImageIcon
} from 'lucide-react';

const PANEL_CLASS = 'bg-white border border-gray-200 rounded-lg shadow-sm';

interface FileCardProps {
    doc: Document;
    isSelected: boolean;
    onToggleSelect: () => void;
    onToggleStar: (isStarred: boolean) => void;
    onSelect: () => void;
    onOpen: () => void;
    onShare: () => void;
    onOpenNotes: () => void;
    onDelete: () => void;
    onEditInEditor?: () => void;
    isEditable: boolean;
    isConverting: boolean;
}

export function FileCard({
    doc,
    isSelected,
    onToggleSelect,
    onToggleStar,
    onSelect,
    onOpen,
    onShare,
    onOpenNotes,
    onDelete,
    onEditInEditor,
    isEditable,
    isConverting
}: FileCardProps) {
    return (
        <div className={`${PANEL_CLASS} p-4 flex flex-col gap-3 hover:-translate-y-1 transition`}>
            <div className="flex items-center justify-between text-xs uppercase tracking-tight">
                <button onClick={onToggleSelect} className="flex items-center gap-1">
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />} Select
                </button>
                <button onClick={() => onToggleStar(!doc.isStarred)}>
                    {doc.isStarred ? <Star size={16} className="text-yellow-500" /> : <StarOff size={16} />}
                </button>
            </div>
            <div className="h-32 flex items-center justify-center border rounded bg-white cursor-pointer" onClick={onSelect}>
                {getFileIcon(doc.mimeType)}
            </div>
            <div className="space-y-1">
                <p className="font-black truncate" title={doc.name}>{doc.name}</p>
                <p className="text-xs text-gray-600">{formatRelativeTime(doc.uploadedAt)}</p>
                <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-tight">
                    <span className="px-2 py-0.5 border rounded">{NAV_ITEMS.find(item => item.id === doc.module)?.label || 'General'}</span>
                    {doc.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 border rounded bg-gray-50">{tag}</span>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{doc.uploadedByName || 'Unknown'}</span>
                <span>{formatSize(doc.fileSize || calculateDocSize(doc))}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3 text-sm">
                <button className="flex items-center gap-1" onClick={onOpen}>
                    <Download size={14} /> Open
                </button>
                <div className="flex items-center gap-2">
                    {isEditable && onEditInEditor && (
                        <button 
                            onClick={onEditInEditor} 
                            title="Edit in GTM Editor" 
                            className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            disabled={isConverting}
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                    <button onClick={onShare}><Send size={14} /></button>
                    <button onClick={onOpenNotes}><FileText size={14} /></button>
                    <button onClick={onDelete}><Trash2 size={14} /></button>
                </div>
            </div>
        </div>
    );
}

export function getFileIcon(mimeType: string | undefined) {
    if (!mimeType) return <File className="w-8 h-8 text-gray-400" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (mimeType.includes('text')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="w-8 h-8 text-green-500" />;
    return <File className="w-8 h-8 text-indigo-500" />;
}

export function calculateDocSize(doc: Document): number {
    if (doc.fileSize) return doc.fileSize;
    if (!doc.content) return 0;
    return Math.ceil((doc.content.length * 3) / 4);
}

// Helper to check if a document can be edited in the GTM editor
export function isEditableDocument(mimeType: string | undefined, fileName?: string): boolean {
    if (!mimeType) return false;
    // Text-based formats
    if (mimeType.includes('text') || 
        mimeType.includes('markdown') || 
        mimeType.includes('html') ||
        mimeType.includes('json') ||
        mimeType.includes('xml') ||
        mimeType === 'application/json' ||
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        mimeType === 'text/html') {
        return true;
    }
    // PDF support
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
        return true;
    }
    // DOCX support
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType.includes('wordprocessingml') ||
        fileName?.endsWith('.docx')) {
        return true;
    }
    // DOC (older Word format) - limited support
    if (mimeType === 'application/msword' || fileName?.endsWith('.doc')) {
        return true;
    }
    return false;
}
