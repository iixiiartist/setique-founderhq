import React from 'react';
import { Document, TabType, Contact, AnyCrmItem, DocumentActivity } from '../../types';
import { NAV_ITEMS } from '../../constants';
import { Button } from '../ui/Button';
import { getFileIcon, calculateDocSize } from './FileCard';
import { formatSize, formatRelativeTime } from './FileLibrarySidebar';
import {
    Download,
    Trash2,
    Send,
    Star,
    StarOff,
    FileText,
    Edit2,
    Activity as ActivityIcon
} from 'lucide-react';

interface FileDetailPanelProps {
    doc: Document;
    onClose: () => void;
    onToggleStar: (isStarred: boolean) => void;
    onDownload: () => void;
    onShare: () => void;
    onOpenNotes: () => void;
    onDelete: () => void;
    onEditInEditor?: () => void;
    isEditable: boolean;
    isConverting: boolean;
    // Tag management
    tagDraft: string;
    onTagDraftChange: (value: string) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    // Description
    descriptionDraft: string;
    onDescriptionDraftChange: (value: string) => void;
    onDescriptionSave: () => void;
    // Module/Company/Contact
    onModuleChange: (module: TabType) => void;
    onCompanyChange: (companyId: string | undefined) => void;
    onContactChange: (contactId: string | undefined) => void;
    companies: AnyCrmItem[];
    contacts: (Contact & { companyName: string })[];
    // Advanced links
    linkDrafts: { task: string; deal: string; event: string };
    onLinkDraftChange: (field: 'task' | 'deal' | 'event', value: string) => void;
    onLinkSave: (field: 'task' | 'deal' | 'event') => void;
    // Activity
    activity: DocumentActivity[];
    activityLoading: boolean;
}

export function FileDetailPanel({
    doc,
    onClose,
    onToggleStar,
    onDownload,
    onShare,
    onOpenNotes,
    onDelete,
    onEditInEditor,
    isEditable,
    isConverting,
    tagDraft,
    onTagDraftChange,
    onAddTag,
    onRemoveTag,
    descriptionDraft,
    onDescriptionDraftChange,
    onDescriptionSave,
    onModuleChange,
    onCompanyChange,
    onContactChange,
    companies,
    contacts,
    linkDrafts,
    onLinkDraftChange,
    onLinkSave,
    activity,
    activityLoading
}: FileDetailPanelProps) {
    const filteredContacts = doc.companyId 
        ? contacts.filter(contact => contact.crmItemId === doc.companyId)
        : contacts;

    return (
        <>
            {/* Mobile overlay backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={onClose}
            />
            <aside className="fixed inset-y-0 right-0 w-[90vw] sm:w-[380px] lg:static lg:w-[380px] bg-white border-l border-gray-200 flex flex-col z-50">
                <div className="p-4 sm:p-5 border-b flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Details</p>
                        <h3 className="text-base sm:text-lg font-black break-words truncate">{doc.name}</h3>
                    </div>
                    <button onClick={onClose} className="min-w-[44px] min-h-[44px] sm:w-8 sm:h-8 sm:min-w-0 sm:min-h-0 border rounded flex items-center justify-center text-lg">×</button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-auto flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 border rounded flex items-center justify-center bg-white shrink-0">
                            {getFileIcon(doc.mimeType)}
                        </div>
                        <div className="text-xs text-right flex-1 min-w-0">
                            <p className="truncate">{formatSize(doc.fileSize || calculateDocSize(doc))}</p>
                            <p className="truncate">{doc.mimeType || 'unknown'}</p>
                        </div>
                        <button onClick={() => onToggleStar(!doc.isStarred)} className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center">
                            {doc.isStarred ? <Star size={18} className="text-yellow-500" /> : <StarOff size={18} />}
                        </button>
                    </div>

                    <div className="space-y-3">
                        <MetadataRow label="Owner" value={doc.uploadedByName || 'Unknown'} />
                        <MetadataRow label="Uploaded" value={new Date(doc.uploadedAt).toLocaleString()} />
                        <MetadataRow label="Last opened" value={doc.lastAccessedAt ? formatRelativeTime(doc.lastAccessedAt) : 'Never'} />
                        <MetadataRow label="Views" value={`${doc.viewCount || 0}`} />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em]">Description</p>
                        <textarea
                            value={descriptionDraft}
                            onChange={e => onDescriptionDraftChange(e.target.value)}
                            onBlur={onDescriptionSave}
                            placeholder="Explain why this file matters..."
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em]">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {(doc.tags || []).map(tag => (
                                <span key={tag} className="px-2 py-1 border rounded text-xs flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => onRemoveTag(tag)}>×</button>
                                </span>
                            ))}
                            <form
                                onSubmit={e => {
                                    e.preventDefault();
                                    onAddTag(tagDraft);
                                }}
                                className="flex items-center"
                            >
                                <input
                                    value={tagDraft}
                                    onChange={e => onTagDraftChange(e.target.value)}
                                    placeholder="Add tag"
                                    className="w-24 border px-2 py-1 text-xs"
                                />
                            </form>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.3em]">Linked Records</p>
                        <label className="text-[11px] uppercase tracking-tight">Module</label>
                        <select
                            value={doc.module}
                            onChange={e => onModuleChange(e.target.value as TabType)}
                            className="w-full border rounded px-2 py-1 text-sm"
                        >
                            {NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').map(item => (
                                <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                        </select>
                        <label className="text-[11px] uppercase tracking-tight">Company</label>
                        <select
                            value={doc.companyId || ''}
                            onChange={e => onCompanyChange(e.target.value || undefined)}
                            className="w-full border rounded px-2 py-1 text-sm"
                        >
                            <option value="">No company</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.company}</option>
                            ))}
                        </select>
                        <label className="text-[11px] uppercase tracking-tight">Contact</label>
                        <select
                            value={doc.contactId || ''}
                            disabled={!doc.companyId}
                            onChange={e => onContactChange(e.target.value || undefined)}
                            className="w-full border rounded px-2 py-1 text-sm"
                        >
                            <option value="">No contact</option>
                            {filteredContacts.map(contact => (
                                <option key={contact.id} value={contact.id}>{contact.name}</option>
                            ))}
                        </select>
      
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase tracking-tight">Task link</label>
                            <input
                                value={linkDrafts.task}
                                onChange={e => onLinkDraftChange('task', e.target.value)}
                                onBlur={() => onLinkSave('task')}
                                placeholder="Paste task ID"
                                className="w-full border rounded px-2 py-1 text-sm"
                            />
                            <label className="text-[11px] uppercase tracking-tight">Deal link</label>
                            <input
                                value={linkDrafts.deal}
                                onChange={e => onLinkDraftChange('deal', e.target.value)}
                                onBlur={() => onLinkSave('deal')}
                                placeholder="Paste deal ID"
                                className="w-full border rounded px-2 py-1 text-sm"
                            />
                            <label className="text-[11px] uppercase tracking-tight">Event link</label>
                            <input
                                value={linkDrafts.event}
                                onChange={e => onLinkDraftChange('event', e.target.value)}
                                onBlur={() => onLinkSave('event')}
                                placeholder="Paste event ID"
                                className="w-full border rounded px-2 py-1 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] mb-2">Activity</p>
                        <ActivityList items={activity} isLoading={activityLoading} emptyLabel="No activity for this file yet" />
                    </div>

                    <div className="grid gap-2">
                        {isEditable && onEditInEditor && (
                            <Button 
                                onClick={onEditInEditor} 
                                className="justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 min-h-[44px] sm:min-h-0"
                                disabled={isConverting}
                            >
                                {isConverting ? (
                                    <><span className="relative w-4 h-4 inline-block"><span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span> Converting...</>
                                ) : (
                                    <><Edit2 size={16} /> Edit in GTM Editor</>
                                )}
                            </Button>
                        )}
                        <Button onClick={onDownload} className="justify-center gap-2 min-h-[44px] sm:min-h-0">
                            <Download size={16} /> Download
                        </Button>
                        <Button onClick={onShare} variant="secondary" className="justify-center gap-2 min-h-[44px] sm:min-h-0">
                            <Send size={16} /> Share via Email
                        </Button>
                        <Button onClick={onOpenNotes} variant="secondary" className="justify-center gap-2 min-h-[44px] sm:min-h-0">
                            <FileText size={16} /> Notes
                        </Button>
                        <Button onClick={onDelete} variant="danger" className="justify-center gap-2 min-h-[44px] sm:min-h-0">
                            <Trash2 size={16} /> Delete
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-sm">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">{label}</p>
            <p>{value}</p>
        </div>
    );
}

function ActivityList({ items, isLoading, emptyLabel }: { items: DocumentActivity[]; isLoading: boolean; emptyLabel?: string }) {
    if (isLoading) {
        return <p className="text-xs text-gray-500">Loading activity...</p>;
    }
    if (!items.length) {
        return <p className="text-xs text-gray-500">{emptyLabel || 'No activity yet'}</p>;
    }
    return (
        <ul className="space-y-2 text-xs">
            {items.map(item => (
                <li key={item.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 border rounded-full flex items-center justify-center bg-white">
                        <ActivityIcon size={12} />
                    </div>
                    <div>
                        <p><strong>{item.userName}</strong> {renderActionCopy(item)}</p>
                        <p className="text-[10px] text-gray-500">{formatRelativeTime(item.createdAt)}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function renderActionCopy(activity: DocumentActivity) {
    switch (activity.action) {
        case 'uploaded':
            return 'uploaded this file';
        case 'downloaded':
            return 'downloaded this file';
        case 'shared':
            return 'shared this file';
        case 'tagged':
            return `tagged this file (${activity.details?.tag || ''})`;
        case 'starred':
            return activity.details?.value ? 'starred this file' : 'removed the star';
        case 'linked':
            return 'updated linked records';
        case 'viewed':
            return 'viewed this file';
        default:
            return activity.action;
    }
}
