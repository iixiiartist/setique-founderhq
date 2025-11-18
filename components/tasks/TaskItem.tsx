/**
 * Task Item Component
 * Individual task card with color coding and quick actions
 */

import React from 'react';
import { Task, AppActions, TaskCollectionName } from '../../types';
import { TASK_TAG_BG_COLORS } from '../../constants';

interface TaskItemProps {
    task: Task;
    isSelected: boolean;
    bulkSelectMode: boolean;
    onSelect: () => void;
    onClick: () => void;
    actions: AppActions;
    linkedEntityName: string | null;
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

export function TaskItem({
    task,
    isSelected,
    bulkSelectMode,
    onSelect,
    onClick,
    actions,
    linkedEntityName
}: TaskItemProps) {
    const moduleLabel = MODULE_LABELS[task.category as TaskCollectionName] || 'Task';
    const tagColorClass = TASK_TAG_BG_COLORS[moduleLabel] || 'bg-gray-300';
    const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'Done';

    const handleCheckboxClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (!bulkSelectMode) {
            await actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' });
        }
    };

    return (
        <div
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
                        <div className="font-mono font-medium text-black mb-2">
                            {task.status === 'Done' && <span className="line-through">{task.text}</span>}
                            {task.status !== 'Done' && task.text}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            {/* Module tag */}
                            <span className={`font-mono px-2 py-0.5 ${tagColorClass} border border-black`}>
                                {moduleLabel}
                            </span>

                            {/* Priority */}
                            <span className={`font-mono px-2 py-0.5 border ${PRIORITY_COLORS[task.priority]}`}>
                                {task.priority}
                            </span>

                            {/* Status */}
                            <span className={`font-mono px-2 py-0.5 ${STATUS_COLORS[task.status]}`}>
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
                                <span className="font-mono px-2 py-0.5 text-teal-600 bg-teal-50 border border-teal-300">
                                    🔗 {linkedEntityName}
                                </span>
                            )}

                            {/* Notes indicator */}
                            {task.notes && task.notes.length > 0 && (
                                <span className="font-mono px-2 py-0.5 text-gray-600 bg-gray-50 border border-gray-300">
                                    💬 {task.notes.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
