import React, { useState, useEffect } from 'react';
import { useDeleteConfirm } from '../../hooks';
import { GTMDocMetadata, LinkedDoc } from '../../types';
import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';
import { DatabaseService } from '../../lib/services/database';
import { ConfirmDialog } from '../shared/ConfirmDialog';

interface LinkedDocsDisplayProps {
    entityType: 'task' | 'event' | 'crm' | 'chat' | 'contact';
    entityId: string;
    workspaceId: string;
    onAttach?: () => void;
    compact?: boolean;
}

export const LinkedDocsDisplay: React.FC<LinkedDocsDisplayProps> = ({
    entityType,
    entityId,
    workspaceId,
    onAttach,
    compact = false
}) => {
    const [linkedDocs, setLinkedDocs] = useState<LinkedDoc[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const deleteConfirm = useDeleteConfirm<{ id: string }>('document link');

    useEffect(() => {
        loadLinkedDocs();
    }, [entityId, workspaceId]);

    const loadLinkedDocs = async () => {
        if (!entityId) return;
        
        setIsLoading(true);
        try {
            const { data, error} = await DatabaseService.getLinkedDocs(
                entityType,
                entityId
            );

            if (error) {
                console.error('Error loading linked docs:', error);
                return;
            }

            setLinkedDocs(data || []);
        } catch (error) {
            console.error('Failed to load linked docs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnlink = async (linkId: string) => {
        deleteConfirm.requestConfirm({ id: linkId }, async () => {
            try {
                const { error } = await DatabaseService.unlinkDocFromEntity(linkId);

                if (error) {
                    console.error('Error unlinking doc:', error);
                    alert('Failed to unlink document');
                    return;
                }

                // Refresh the list
                await loadLinkedDocs();
            } catch (error) {
                console.error('Failed to unlink doc:', error);
                alert('Failed to unlink document');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="text-xs text-gray-500">
                Loading linked docs...
            </div>
        );
    }

    if (linkedDocs.length === 0 && !onAttach) {
        return null;
    }

    return (
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {!compact && onAttach && (
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Linked Docs</h4>
                    <button
                        onClick={onAttach}
                        className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-medium hover:bg-purple-100 transition-colors"
                    >
                        + Attach Doc
                    </button>
                </div>
            )}

            {linkedDocs.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                    No documents linked
                </p>
            ) : (
                <div className={compact ? 'flex flex-wrap gap-1' : 'space-y-1'}>
                    {linkedDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className={`flex items-center justify-between ${
                                compact
                                    ? 'px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs'
                                    : 'p-2 bg-white rounded-xl border border-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={compact ? 'text-sm' : 'text-lg'}>
                                    {DOC_TYPE_ICONS[doc.docType] || '📄'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'} text-slate-900`}>
                                        {doc.title}
                                    </p>
                                    {!compact && (
                                        <p className="text-xs text-gray-600 truncate">
                                            {DOC_TYPE_LABELS[doc.docType]}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleUnlink(doc.linkId!)}
                                className={`ml-2 font-medium text-red-500 hover:text-red-700 ${
                                    compact ? 'text-sm' : 'text-lg'
                                }`}
                                title="Unlink document"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Unlink Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={deleteConfirm.cancel}
                onConfirm={deleteConfirm.confirm}
                title={deleteConfirm.title}
                message={deleteConfirm.message}
                confirmLabel={deleteConfirm.confirmLabel}
                cancelLabel={deleteConfirm.cancelLabel}
                variant={deleteConfirm.variant}
                isLoading={deleteConfirm.isProcessing}
            />
        </div>
    );
};
