/**
 * TaskEditModal - Unified task editing modal for use across all sections
 * 
 * This wraps TaskDetailPanel in a modal overlay so it can be used consistently
 * in ContactDetailView, AccountDetailView, TaskManagement, and anywhere else
 * tasks need to be edited.
 */

import React from 'react';
import { Task, AppActions, WorkspaceMember, AnyCrmItem } from '../../types';
import { TaskDetailPanel } from './TaskDetailPanel';

interface TaskEditModalProps {
    task: Task | null;
    actions: AppActions;
    onClose: () => void;
    workspaceMembers: WorkspaceMember[];
    /** Optional: CRM items to look up linked entity names */
    crmItems?: AnyCrmItem[];
    /** Optional: Pre-computed linked entity name */
    linkedEntityName?: string | null;
    /** Optional: Handler for navigating to linked entity */
    onNavigateToEntity?: (entityType: string, entityId: string) => void;
}

export function TaskEditModal({
    task,
    actions,
    onClose,
    workspaceMembers,
    crmItems = [],
    linkedEntityName: providedLinkedEntityName,
    onNavigateToEntity
}: TaskEditModalProps) {
    if (!task) return null;

    // Compute linked entity name if not provided
    const linkedEntityName = providedLinkedEntityName ?? (
        task.crmItemId && crmItems.length > 0
            ? crmItems.find(item => item.id === task.crmItemId)?.company || null
            : null
    );

    // Default navigation handler (no-op if not provided)
    const handleNavigateToEntity = onNavigateToEntity || (() => {});

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
            <div 
                className="absolute inset-0" 
                onClick={onClose}
                aria-label="Close modal"
            />
            <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl animate-slide-in-right">
                <TaskDetailPanel
                    task={task}
                    actions={actions}
                    onClose={onClose}
                    onNavigateToEntity={handleNavigateToEntity}
                    workspaceMembers={workspaceMembers}
                    linkedEntityName={linkedEntityName}
                />
            </div>
        </div>
    );
}

export default TaskEditModal;
