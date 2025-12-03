import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { DashboardData, DocVisibility, GTMDocLink, LinkedEntityType, Task, AnyCrmItem, Contact, PlanType, WorkspaceRole } from '../../types';
import Modal from '../shared/Modal';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { DatabaseService } from '../../lib/services/database';
import { useDeleteConfirm } from '../../hooks';
import { Link2, Loader2, ShieldCheck, Users, AlertTriangle, Crown } from 'lucide-react';

interface DocShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    docId: string;
    docTitle: string;
    visibility: DocVisibility;
    data: DashboardData;
    onVisibilityChange?: (nextVisibility: DocVisibility) => void;
    onLinksUpdated?: () => void;
    // Permission-related props
    isDocOwner?: boolean;
    workspaceRole?: WorkspaceRole;
    planType?: PlanType;
    onUpgradeNeeded?: () => void;
}

type ShareTarget = {
    id: string;
    type: LinkedEntityType;
    title: string;
    subtitle?: string;
    meta?: string;
};

type ShareFilter = 'all' | Extract<LinkedEntityType, 'task' | 'crm' | 'event' | 'contact'>;

const ENTITY_LABELS: Record<LinkedEntityType, string> = {
    task: 'Task',
    event: 'Event',
    crm: 'Account',
    chat: 'Chat Thread',
    contact: 'Contact',
};

const formatDueDate = (date?: string) => {
    if (!date) return null;
    try {
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(date));
    } catch (err) {
        console.warn('Unable to format due date', err);
        return date;
    }
};

export const DocShareModal: React.FC<DocShareModalProps> = ({
    isOpen,
    onClose,
    workspaceId,
    docId,
    docTitle,
    visibility,
    data,
    onVisibilityChange,
    onLinksUpdated,
    isDocOwner = true,
    workspaceRole = 'member',
    planType = 'free',
    onUpgradeNeeded,
}) => {
    const [linkedEntities, setLinkedEntities] = useState<GTMDocLink[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [linkingKey, setLinkingKey] = useState<string | null>(null);
    const [updatingVisibility, setUpdatingVisibility] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<ShareFilter>('all');
    const [localVisibility, setLocalVisibility] = useState<DocVisibility>(visibility);
    const [error, setError] = useState<string | null>(null);
    
    const removeLinkConfirm = useDeleteConfirm<{ id: string; name?: string }>('share link');

    // Permission checks
    const canChangeVisibility = isDocOwner || workspaceRole === 'owner';
    const canLinkEntities = planType !== 'free' || linkedEntities.length < 3; // Free tier: max 3 links
    const isFreeTier = planType === 'free';
    const maxLinksReached = isFreeTier && linkedEntities.length >= 3;

    const allTasks: Task[] = useMemo(() => [
        ...(data.productsServicesTasks || []),
        ...(data.investorTasks || []),
        ...(data.customerTasks || []),
        ...(data.partnerTasks || []),
        ...(data.marketingTasks || []),
        ...(data.financialTasks || []),
        ...(data.crmTasks || []),
    ], [data.productsServicesTasks, data.investorTasks, data.customerTasks, data.partnerTasks, data.marketingTasks, data.financialTasks, data.crmTasks]);

    const crmSources: AnyCrmItem[] = useMemo(() => {
        if (data.crmItems && data.crmItems.length) {
            return data.crmItems as AnyCrmItem[];
        }
        return [
            ...(data.investors || []),
            ...(data.customers || []),
            ...(data.partners || []),
        ];
    }, [data.crmItems, data.customers, data.investors, data.partners]);

    const taskTargets = useMemo<ShareTarget[]>(() =>
        allTasks.map((task) => ({
            id: task.id,
            type: 'task',
            title: task.text || 'Untitled Task',
            subtitle: `${task.priority || 'Priority'} • ${task.status}`,
            meta: task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : undefined,
        })),
    [allTasks]);

    const accountTargets = useMemo<ShareTarget[]>(() =>
        crmSources.map((item) => {
            const label = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Account';
            return {
                id: item.id,
                type: 'crm',
                title: item.company || 'Untitled Account',
                subtitle: `${label} • ${item.status || 'No status'}`,
                meta: item.nextAction ? `Next: ${item.nextAction}` : undefined,
            };
        }),
    [crmSources]);

    const eventTargets = useMemo<ShareTarget[]>(() => {
        const entries: ShareTarget[] = [];
        crmSources.forEach((company) => {
            const label = company.type ? company.type.charAt(0).toUpperCase() + company.type.slice(1) : 'Account';
            (company.contacts || []).forEach((contact: Contact) => {
                (contact.meetings || []).forEach((meeting) => {
                    if (!meeting?.id) return;
                    const metaDate = meeting.timestamp ? new Date(meeting.timestamp) : null;
                    entries.push({
                        id: meeting.id,
                        type: 'event',
                        title: meeting.title || `Meeting with ${contact.name || 'contact'}`,
                        subtitle: `${label} • ${company.company}`,
                        meta: metaDate
                            ? metaDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : undefined,
                    });
                });
            });
        });
        return entries;
    }, [crmSources]);

    const contactTargets = useMemo<ShareTarget[]>(() => {
        const seen = new Map<string, ShareTarget>();
        crmSources.forEach((company) => {
            const label = company.type ? company.type.charAt(0).toUpperCase() + company.type.slice(1) : 'Account';
            (company.contacts || []).forEach((contact: Contact) => {
                if (!contact?.id || seen.has(contact.id)) return;
                seen.set(contact.id, {
                    id: contact.id,
                    type: 'contact',
                    title: contact.name || 'Unnamed Contact',
                    subtitle: `${label} • ${company.company}`,
                    meta: contact.email || contact.phone || contact.title || undefined,
                });
            });
        });
        return Array.from(seen.values());
    }, [crmSources]);

    const allShareTargets: ShareTarget[] = useMemo(() => [
        ...taskTargets,
        ...eventTargets,
        ...accountTargets,
        ...contactTargets,
    ], [taskTargets, eventTargets, accountTargets, contactTargets]);

    const targetIndex = useMemo(() => {
        const map = new Map<string, ShareTarget>();
        allShareTargets.forEach((target) => {
            map.set(`${target.type}:${target.id}`, target);
        });
        return map;
    }, [allShareTargets]);

    const loadLinkedEntities = useCallback(async () => {
        if (!docId) return;
        setLoadingLinks(true);
        const { data: links, error } = await DatabaseService.getDocLinksForDoc(docId);
        if (error) {
            console.error('Failed to load doc links', error);
        } else {
            setLinkedEntities(links || []);
        }
        setLoadingLinks(false);
    }, [docId]);

    useEffect(() => {
        if (isOpen) {
            loadLinkedEntities();
        }
    }, [isOpen, loadLinkedEntities]);

    useEffect(() => {
        setLocalVisibility(visibility);
    }, [visibility]);

    const linkedKeys = useMemo(() => new Set(linkedEntities.map((link) => `${link.linkedEntityType}:${link.linkedEntityId}`)), [linkedEntities]);

    const filteredTargets = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        return allShareTargets
            .filter((target) => !linkedKeys.has(`${target.type}:${target.id}`))
            .filter((target) => (filter === 'all' ? true : target.type === filter))
            .filter((target) =>
                !normalizedQuery ||
                target.title.toLowerCase().includes(normalizedQuery) ||
                (target.subtitle && target.subtitle.toLowerCase().includes(normalizedQuery))
            );
    }, [allShareTargets, filter, linkedKeys, searchQuery]);

    const handleVisibilityUpdate = async (nextVisibility: DocVisibility) => {
        if (nextVisibility === localVisibility) return;
        
        // Permission check
        if (!canChangeVisibility) {
            setError('You do not have permission to change this document\'s visibility.');
            return;
        }
        
        setError(null);
        try {
            setUpdatingVisibility(true);
            const { error: updateError } = await DatabaseService.updateGTMDoc(docId, workspaceId, { visibility: nextVisibility });
            if (updateError) {
                console.error('Failed to update visibility', updateError);
                // Check for RLS permission error
                if (updateError.message?.includes('permission') || updateError.code === '42501') {
                    setError('Permission denied: You cannot change this document\'s visibility.');
                } else {
                    setError('Failed to update visibility. Please try again.');
                }
                return;
            }
            setLocalVisibility(nextVisibility);
            onVisibilityChange?.(nextVisibility);
        } finally {
            setUpdatingVisibility(false);
        }
    };

    const handleAttachTarget = async (target: ShareTarget) => {
        // Check if user can link entities (free tier limit)
        if (!canLinkEntities) {
            if (onUpgradeNeeded) {
                onUpgradeNeeded();
            } else {
                setError('Free plan is limited to 3 entity links. Upgrade to link more.');
            }
            return;
        }
        
        setError(null);
        try {
            const key = `${target.type}:${target.id}`;
            setLinkingKey(key);
            const { error: linkError } = await DatabaseService.linkDocToEntity(docId, workspaceId, target.type, target.id);
            if (linkError) {
                console.error('Failed to link doc', linkError);
                if (linkError.message?.includes('permission') || linkError.code === '42501') {
                    setError('Permission denied: Cannot link to this entity.');
                } else {
                    setError('Failed to attach document to target.');
                }
                return;
            }
            await loadLinkedEntities();
            onLinksUpdated?.();
            setSearchQuery('');
        } finally {
            setLinkingKey(null);
        }
    };

    const handleRemoveLink = (linkId: string) => {
        removeLinkConfirm.requestConfirm({ id: linkId, name: 'share link' }, async (data) => {
            setError(null);
            const { error: unlinkError } = await DatabaseService.unlinkDocFromEntity(data.id);
            if (unlinkError) {
                console.error('Failed to remove link', unlinkError);
                if (unlinkError.message?.includes('permission') || unlinkError.code === '42501') {
                    setError('Permission denied: Cannot remove this link.');
                } else {
                    setError('Failed to remove link.');
                }
                return;
            }
            await loadLinkedEntities();
            onLinksUpdated?.();
        });
    };

    const existingShares = linkedEntities.map((link) => ({
        link,
        target: targetIndex.get(`${link.linkedEntityType}:${link.linkedEntityId}`),
    }));

    const visibilityOptions: Array<{ value: DocVisibility; label: string; icon: React.ReactNode; description: string }> = [
        {
            value: 'team',
            label: 'Team access',
            icon: <Users size={16} />,
            description: 'Everyone in this workspace can open the doc.',
        },
        {
            value: 'private',
            label: 'Private draft',
            icon: <ShieldCheck size={16} />,
            description: 'Only you can open and share manually.',
        },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Share “${docTitle}”`}
            size="lg"
        >
            <div className="space-y-6">
                {/* Error display */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                        <button 
                            onClick={() => setError(null)} 
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            ×
                        </button>
                    </div>
                )}

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Visibility</h4>
                        {!canChangeVisibility && (
                            <span className="text-xs text-gray-500 italic">Only owners and admins can change visibility</span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibilityOptions.map((option) => {
                            const isActive = option.value === localVisibility;
                            const isDisabled = updatingVisibility || !canChangeVisibility;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleVisibilityUpdate(option.value)}
                                    disabled={isDisabled}
                                    className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-left transition ${
                                        isActive ? 'border-slate-500 bg-slate-50 ring-2 ring-slate-200' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`mt-1 ${isActive ? 'text-slate-900' : 'text-gray-500'}`}>{option.icon}</div>
                                    <div>
                                        <p className="font-semibold text-sm">{option.label}</p>
                                        <p className="text-xs text-gray-600">{option.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Linked workspace items</h4>
                        {loadingLinks && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Loader2 className="animate-spin" size={14} /> Loading
                            </div>
                        )}
                    </div>
                    {existingShares.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">This doc is not linked to any tasks or accounts yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {existingShares.map(({ link, target }) => (
                                <div key={link.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                                    <div>
                                        <p className="font-semibold text-sm">
                                            {target?.title || 'Workspace item'}
                                            <span className="text-xs text-gray-500 ml-2">{ENTITY_LABELS[link.linkedEntityType] || link.linkedEntityType}</span>
                                        </p>
                                        {target?.subtitle && (
                                            <p className="text-xs text-gray-600">{target.subtitle}</p>
                                        )}
                                        {!target && (
                                            <p className="text-xs text-gray-400">Item not loaded in current dashboard data.</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveLink(link.id)}
                                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Attach to workspace item</h4>
                        {isFreeTier && (
                            <span className="text-xs text-gray-500">
                                {linkedEntities.length}/3 links used
                            </span>
                        )}
                    </div>
                    
                    {/* Free tier limit warning */}
                    {maxLinksReached && (
                        <div className="flex items-center gap-2 p-3 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                            <Crown size={16} />
                            <span>Free plan limit reached. Upgrade to link more items.</span>
                            {onUpgradeNeeded && (
                                <button 
                                    onClick={onUpgradeNeeded}
                                    className="ml-auto text-yellow-700 hover:text-yellow-900 font-semibold"
                                >
                                    Upgrade
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className="flex flex-col md:flex-row gap-2 mb-3">
                        <input
                            type="text"
                            placeholder="Search tasks or accounts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={maxLinksReached}
                            className={`flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${maxLinksReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as ShareFilter)}
                            disabled={maxLinksReached}
                            className={`border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full md:w-44 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${maxLinksReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="all">All types</option>
                            <option value="task">Tasks</option>
                            <option value="event">Events</option>
                            <option value="crm">Accounts</option>
                            <option value="contact">Contacts</option>
                        </select>
                    </div>

                    {maxLinksReached ? (
                        <p className="text-xs text-gray-500">Upgrade to add more entity links.</p>
                    ) : filteredTargets.length === 0 ? (
                        <p className="text-xs text-gray-500">No workspace items match that search.</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {filteredTargets.slice(0, 25).map((target) => {
                                const targetKey = `${target.type}:${target.id}`;
                                const isProcessing = linkingKey === targetKey;
                                return (
                                    <button
                                        key={targetKey}
                                        onClick={() => handleAttachTarget(target)}
                                        disabled={!!linkingKey}
                                        className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-sm">{target.title}</p>
                                                {target.subtitle && (
                                                    <p className="text-xs text-gray-600">{target.subtitle}</p>
                                                )}
                                                {target.meta && (
                                                    <p className="text-xs text-gray-500">{target.meta}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                <span className="uppercase text-[10px] tracking-wide">{ENTITY_LABELS[target.type] || target.type}</span>
                                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* Remove Link Confirmation Dialog */}
            <ConfirmDialog
                isOpen={removeLinkConfirm.isOpen}
                onClose={removeLinkConfirm.cancel}
                onConfirm={removeLinkConfirm.confirm}
                title="Remove Share Link"
                message="Remove this share link? The entity will no longer have access to this document."
                confirmLabel="Remove"
                cancelLabel={removeLinkConfirm.cancelLabel}
                variant={removeLinkConfirm.variant}
                isLoading={removeLinkConfirm.isProcessing}
            />
        </Modal>
    );
};

export default DocShareModal;
