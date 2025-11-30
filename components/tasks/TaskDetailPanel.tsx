/**
 * Task Detail Panel
 * Shows detailed task information with edit capabilities
 */

import React, { useState } from 'react';
import { Task, AppActions, WorkspaceMember, NoteableCollectionName } from '../../types';
import { SubtaskManager } from '../shared/SubtaskManager';
import NotesManager from '../shared/NotesManager';
import { TaskComments } from '../shared/TaskComments';
import { LinkedDocsDisplay } from '../workspace/LinkedDocsDisplay';
import { DocLibraryPicker } from '../workspace/DocLibraryPicker';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../lib/services/database';

interface TaskDetailPanelProps {
    task: Task;
    actions: AppActions;
    onClose: () => void;
    onNavigateToEntity: (entityType: string, entityId: string) => void;
    workspaceMembers: WorkspaceMember[];
    linkedEntityName: string | null;
}

export function TaskDetailPanel({
    task,
    actions,
    onClose,
    onNavigateToEntity,
    workspaceMembers,
    linkedEntityName
}: TaskDetailPanelProps) {
    const { workspace, canEditTask } = useWorkspace();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const [editPriority, setEditPriority] = useState(task.priority);
    const [editStatus, setEditStatus] = useState(task.status);
    const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
    const [editDueTime, setEditDueTime] = useState(task.dueTime || '');
    const [editAssignedTo, setEditAssignedTo] = useState(task.assignedTo || '');
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [linkedDocsKey, setLinkedDocsKey] = useState(0);
    
    const canEdit = !task.userId || canEditTask(task.userId, task.assignedTo);

    const handleSave = async () => {
        await actions.updateTask(task.id, {
            text: editText,
            priority: editPriority,
            status: editStatus,
            dueDate: editDueDate || undefined,
            dueTime: editDueTime || undefined,
            assignedTo: editAssignedTo || undefined,
            subtasks: task.subtasks || []
        });
        setIsEditing(false);
    };
    
    const handleDocAttached = () => {
        setShowDocPicker(false);
        setLinkedDocsKey(prev => prev + 1); // Force refresh
    };

    return (
        <>
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b-2 border-black p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="font-mono font-bold text-base sm:text-lg">Task Details</h3>
                    <button
                        onClick={onClose}
                        className="text-2xl font-bold hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                {isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                            rows={3}
                        />
                        <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as any)}
                            className="w-full px-3 py-2.5 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        >
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Low">Low Priority</option>
                        </select>
                        <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="w-full px-3 py-2.5 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        >
                            <option value="Todo">To Do</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-mono font-bold mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full px-3 py-2.5 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono font-bold mb-1">Due Time</label>
                                <input
                                    type="time"
                                    value={editDueTime}
                                    onChange={(e) => setEditDueTime(e.target.value)}
                                    className="w-full px-3 py-2.5 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                />
                            </div>
                        </div>
                        <select
                            value={editAssignedTo}
                            onChange={(e) => setEditAssignedTo(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-black rounded-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        >
                            <option value="">Unassigned</option>
                            {workspaceMembers.map(member => (
                                <option key={member.userId} value={member.userId}>
                                    {member.fullName}
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 px-3 py-2.5 bg-black text-white border-2 border-black rounded-none font-mono text-sm font-semibold min-h-[44px]"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-3 py-2.5 bg-white text-black border-2 border-black rounded-none font-mono text-sm font-semibold min-h-[44px]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="font-mono text-black mb-3 text-sm sm:text-base">{task.text}</p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-2 bg-white text-black border-2 border-black rounded-none font-mono text-sm font-semibold shadow-neo-btn hover:bg-gray-100 min-h-[44px]"
                        >
                            Edit Task
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                {/* Linked entity */}
                {linkedEntityName && task.crmItemId && (
                    <div className="bg-teal-50 border-2 border-teal-300 p-3">
                        <div className="text-xs font-mono text-teal-600 mb-1">Linked Account</div>
                        <div className="flex items-center justify-between">
                            <div className="font-mono font-bold">{linkedEntityName}</div>
                            <button
                                onClick={() => onNavigateToEntity('account', task.crmItemId!)}
                                className="px-2 py-1 bg-teal-500 text-white border border-teal-700 rounded-none font-mono text-xs font-semibold"
                            >
                                View →
                            </button>
                        </div>
                    </div>
                )}

                {/* Linked Documents */}
                {workspace && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-mono font-bold text-sm">📎 Linked Documents</h4>
                            {canEdit && (
                                <button
                                    onClick={() => setShowDocPicker(true)}
                                    className="px-2 py-1 bg-blue-500 text-white border border-blue-700 rounded-none font-mono text-xs font-semibold hover:bg-blue-600"
                                >
                                    + Attach
                                </button>
                            )}
                        </div>
                        <LinkedDocsDisplay
                            key={linkedDocsKey}
                            workspaceId={workspace.id}
                            entityType="task"
                            entityId={task.id}
                            compact={false}
                        />
                    </div>
                )}

                {/* Subtasks */}
                <div>
                    <h4 className="font-mono font-bold text-sm mb-2">📋 Subtasks</h4>
                    <SubtaskManager
                        subtasks={task.subtasks || []}
                        onSubtasksChange={(subtasks) => actions.updateTask(task.id, { subtasks })}
                        disabled={!canEdit}
                    />
                </div>

                {/* Notes */}
                <div>
                    <h4 className="font-mono font-bold text-sm mb-2">💬 Notes</h4>
                    <NotesManager
                        notes={task.notes || []}
                        itemId={task.id}
                        collection={task.category === 'crmTasks' ? 'customerTasks' : task.category as NoteableCollectionName}
                        addNoteAction={actions.addNote}
                        updateNoteAction={actions.updateNote}
                        deleteNoteAction={actions.deleteNote}
                    />
                </div>

                {/* Task Comments */}
                {user && workspace && workspaceMembers.length > 0 && (
                    <div>
                        <h4 className="font-mono font-bold text-sm mb-2">💬 Comments</h4>
                        <TaskComments
                            taskId={task.id}
                            taskName={task.text}
                            workspaceId={workspace.id}
                            userId={user.id}
                            workspaceMembers={workspaceMembers.map(member => ({
                                id: member.userId,
                                name: member.fullName || member.email || 'Unknown',
                                avatar: member.avatarUrl,
                            }))}
                        />
                    </div>
                )}

                {/* Meta info */}
                <div className="bg-gray-50 border-2 border-black p-3 space-y-2 text-xs font-mono">
                    <div>
                        <span className="text-gray-600">Created:</span>{' '}
                        <span className="font-bold">{new Date(task.createdAt).toLocaleString()}</span>
                    </div>
                    {task.completedAt && (
                        <div>
                            <span className="text-gray-600">Completed:</span>{' '}
                            <span className="font-bold">{new Date(task.completedAt).toLocaleString()}</span>
                        </div>
                    )}
                    <div>
                        <span className="text-gray-600">ID:</span>{' '}
                        <span className="font-mono text-xs">{task.id.slice(0, 8)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* DocLibrary Picker Modal */}
        {showDocPicker && workspace && user && (
            <DocLibraryPicker
                isOpen={showDocPicker}
                onClose={() => setShowDocPicker(false)}
                onSelect={async (doc) => {
                    await DatabaseService.linkDocToEntity(doc.id, workspace.id, 'task', task.id);
                    handleDocAttached();
                }}
                workspaceId={workspace.id}
                userId={user.id}
            />
        )}
    </>
    );
}
