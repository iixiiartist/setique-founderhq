/**
 * Task Item Component
 * Individual task card with color coding and quick actions
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDeleteConfirm } from '../../hooks';
import { Task, AppActions, TaskCollectionName, TaskStatus, Priority } from '../../types';
import { TASK_TAG_BG_COLORS } from '../../constants';
import { Trash2, MessageSquare, Share2 } from 'lucide-react';
import { ConfirmDialog } from '../shared/ConfirmDialog';

interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    bulkSelectMode: boolean;
    onSelect: () => void;
    onClick: () => void;
    actions: AppActions;
    linkedEntityName: string | null;
    onLinkedEntityNavigate?: (task: Task) => void;
    onCategoryNavigate?: (task: Task) => void;
    onShareToHuddle?: (task: Task) => void;
}

const MODULE_LABELS: Record<TaskCollectionName, string> = {
    productsServicesTasks: 'Products',
    investorTasks: 'Investors',
    customerTasks: 'Customers',
    partnerTasks: 'Partners',
    marketingTasks: 'Marketing',
    financialTasks: 'Financials'
};

const PRIORITY_COLORS = {
    High: 'text-red-600 border-red-500 bg-red-50',
    Medium: 'text-yellow-600 border-yellow-500 bg-yellow-50',
    Low: 'text-green-600 border-green-500 bg-green-50'
};

const STATUS_COLORS = {
    Todo: 'text-blue-600',
    InProgress: 'text-yellow-600',
    Done: 'text-green-600'
};

const STATUS_OPTIONS: TaskStatus[] = ['Todo', 'InProgress', 'Done'];
const PRIORITY_OPTIONS: Priority[] = ['High', 'Medium', 'Low'];

export function TaskItem({
    task,
    isSelected,
    bulkSelectMode,
    onSelect,
    onClick,
    actions,
    linkedEntityName,
    onLinkedEntityNavigate,
    onCategoryNavigate,
    onShareToHuddle
}: TaskItemProps) {
    const moduleLabel = MODULE_LABELS[task.category as TaskCollectionName] || 'Task';
    const tagColorClass = TASK_TAG_BG_COLORS[moduleLabel] || 'bg-gray-300';
    const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'Done';
    const [isEditing, setIsEditing] = useState(false);
    const [draftTitle, setDraftTitle] = useState(task.text || '');
    const [isSaving, setIsSaving] = useState(false);
    const deleteConfirm = useDeleteConfirm<Task>('task');

    const isDirty = useMemo(() => draftTitle.trim() !== (task.text || '').trim(), [draftTitle, task.text]);

    const handleCheckboxClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!bulkSelectMode) {
            await actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' });
        }
    };

    const handleStatusChange = useCallback(async (nextStatus: TaskStatus) => {
        if (nextStatus === task.status) return;
        setIsSaving(true);
        try {
            await actions.updateTask(task.id, { status: nextStatus });
        } finally {
            setIsSaving(false);
        }
    }, [actions, task.id, task.status]);

    const handlePriorityChange = useCallback(async (nextPriority: Priority) => {
        if (nextPriority === task.priority) return;
        setIsSaving(true);
        try {
            await actions.updateTask(task.id, { priority: nextPriority });
        } finally {
            setIsSaving(false);
        }
    }, [actions, task.id, task.priority]);

    const handleToggleEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setDraftTitle(task.text || '');
        setIsEditing(prev => !prev);
    }, [task.text]);

    const handleSaveTitle = useCallback(async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!isDirty || !draftTitle.trim()) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            await actions.updateTask(task.id, { text: draftTitle.trim() });
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    }, [actions, draftTitle, isDirty, task.id]);

    const handleCategoryNavigate = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onCategoryNavigate?.(task);
    }, [onCategoryNavigate, task]);

    return (
        <div
            data-testid="task-card"
            data-task-id={task.id}
            className={`
                flex items-stretch bg-white border-2 border-black shadow-neo cursor-pointer
                hover:shadow-neo-lg transition-all
                ${task.status === 'Done' ? 'opacity-60' : ''}
                ${isSelected ? 'ring-4 ring-blue-500' : ''}
                ${isOverdue ? 'border-red-500' : ''}
            `}
            onClick={(e) => {
                if (!bulkSelectMode) {
                    onClick();
                }
            }}
        >
            {/* Color stripe */}
            <div className={`w-2 shrink-0 ${tagColorClass}`}></div>

            {/* Content */}
            <div className="flex-1 p-3">
                <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    {bulkSelectMode ? (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                onSelect();
                            }}
                            className="w-5 h-5 mt-1 accent-blue-500 shrink-0"
                        />
                    ) : (
                        <input
                            type="checkbox"
                            checked={task.status === 'Done'}
                            onChange={handleCheckboxClick}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 mt-1 accent-blue-500 shrink-0"
                        />
                    )}

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                            {isEditing ? (
                                <div className="flex-1">
                                    <textarea
                                        value={draftTitle}
                                        onChange={(event) => setDraftTitle(event.target.value)}
                                        className="w-full border border-gray-300 p-2 text-sm font-mono"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="mt-2 flex gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={handleSaveTitle}
                                            disabled={isSaving || !isDirty}
                                            className={`px-3 py-1 border ${isDirty ? 'bg-black text-white border-black' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditing(false);
                                                setDraftTitle(task.text || '');
                                            }}
                                            className="px-3 py-1 border border-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 font-mono font-medium text-black">
                                    {task.status === 'Done' ? <span className="line-through">{task.text}</span> : task.text}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleToggleEdit}
                                className="text-xs font-semibold border border-gray-300 px-2 py-1 hover:border-gray-500"
                            >
                                {isEditing ? 'Close' : 'Edit'}
                            </button>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            {/* Module tag */}
                            <span className={`font-mono px-2 py-0.5 ${tagColorClass} border border-black`} data-testid="task-module-tag">
                                {moduleLabel}
                            </span>

                            {/* Priority */}
                            <span className={`font-mono px-2 py-0.5 border ${PRIORITY_COLORS[task.priority]}`} data-testid="task-priority-tag">
                                {task.priority}
                            </span>

                            {/* Status */}
                            <span className={`font-mono px-2 py-0.5 ${STATUS_COLORS[task.status]}`} data-testid="task-status-tag">
                                {task.status === 'InProgress' ? 'In Progress' : task.status}
                            </span>

                            {/* Due date */}
                            {task.dueDate && (
                                <span className={`font-mono px-2 py-0.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                    📅 {task.dueDate}
                                </span>
                            )}

                            {/* Assignee */}
                            {task.assignedToName && (
                                <span className="font-mono px-2 py-0.5 text-purple-600 bg-purple-50 border border-purple-300">
                                    👤 {task.assignedToName}
                                </span>
                            )}

                            {/* Subtasks */}
                            {task.subtasks && task.subtasks.length > 0 && (
                                <span className="font-mono px-2 py-0.5 text-indigo-600 bg-indigo-50 border border-indigo-300">
                                    📋 {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                                </span>
                            )}

                            {/* Linked entity */}
                            {linkedEntityName && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLinkedEntityNavigate?.(task);
                                    }}
                                    className="font-mono px-2 py-0.5 text-teal-600 bg-teal-50 border border-teal-300 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                                    title="Open linked record"
                                >
                                    🔗 {linkedEntityName}
                                </button>
                            )}

                            {/* Notes indicator */}
                            {task.notes && task.notes.length > 0 && (
                                <span className="font-mono px-2 py-0.5 text-gray-600 bg-gray-50 border border-gray-300">
                                    💬 {task.notes.length}
                                </span>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                            <label className="flex items-center gap-1">
                                <span className="font-mono uppercase text-gray-500">Status</span>
                                <select
                                    value={task.status}
                                    onChange={(event) => handleStatusChange(event.target.value as TaskStatus)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="border border-gray-300 px-2 py-1 text-xs"
                                    disabled={isSaving}
                                >
                                    {STATUS_OPTIONS.map(option => (
                                        <option key={option} value={option}>
                                            {option === 'InProgress' ? 'In Progress' : option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex items-center gap-1">
                                <span className="font-mono uppercase text-gray-500">Priority</span>
                                <select
                                    value={task.priority}
                                    onChange={(event) => handlePriorityChange(event.target.value as Priority)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="border border-gray-300 px-2 py-1 text-xs"
                                    disabled={isSaving}
                                >
                                    {PRIORITY_OPTIONS.map(option => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={handleCategoryNavigate}
                                data-testid="task-open-module-button"
                                className="px-3 py-1 border border-gray-300 font-semibold hover:border-gray-500"
                            >
                                Open module
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                                data-testid="task-view-details-button"
                                className="px-3 py-1 border border-gray-300 font-semibold hover:border-gray-500"
                            >
                                View details
                            </button>
                            {onShareToHuddle && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShareToHuddle(task);
                                    }}
                                    data-testid="task-share-huddle-button"
                                    className="px-2 py-1 border border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-400"
                                    title="Share to Huddle"
                                >
                                    <Share2 size={14} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConfirm.requestConfirm(task, async () => {
                                        await actions.deleteTask(task.id);
                                    });
                                }}
                                data-testid="task-delete-button"
                                className="px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                                title="Delete task"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={deleteConfirm.cancel}
                onConfirm={deleteConfirm.handleConfirm}
                title="Delete Task"
                message={`Are you sure you want to delete "${task.text}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
