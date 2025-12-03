import React, { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Task, AppActions, Priority, TaskCollectionName, NoteableCollectionName, Subtask } from '../../types';
import Modal from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import NotesManager from './NotesManager';
import { TaskComments } from './TaskComments';
import { TASK_TAG_BG_COLORS } from '../../constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirm } from '../../hooks';
import { DocLibraryPicker } from '../workspace/DocLibraryPicker';
import { LinkedDocsDisplay } from '../workspace/LinkedDocsDisplay';
import { SubtaskManager } from './SubtaskManager';
import { DatabaseService } from '../../lib/services/database';
import { TaskEditModal } from '../tasks/TaskEditModal';

interface TaskItemProps {
    task: Task;
    actions: AppActions;
    onEdit: (task: Task) => void;
    taskCollection: TaskCollectionName;
    tag: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, actions, onEdit, taskCollection, tag }) => {
    const lastNote = task.notes?.length > 0 ? [...task.notes].sort((a,b) => b.timestamp - a.timestamp)[0] : null;
    const tagColorClass = TASK_TAG_BG_COLORS[tag];
    const { canEditTask, canCompleteTask } = useWorkspace();
    const deleteConfirm = useDeleteConfirm<Task>('task');
    
    const canEdit = !task.userId || canEditTask(task.userId, task.assignedTo);
    const canComplete = canCompleteTask(task.assignedTo);

    return (
         <li className={`flex items-stretch bg-white rounded-xl border border-gray-200 shadow-sm mb-3 transition-all ${task.status === 'Done' ? 'opacity-60' : ''}`}>
            <div className={`w-2 shrink-0 ${tagColorClass}`}></div>
            <div className="flex-grow p-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-start flex-grow overflow-hidden pt-1">
                         <label htmlFor={`task-complete-${task.id}`} className="sr-only">Mark task as complete</label>
                        <input 
                            id={`task-complete-${task.id}`}
                            type="checkbox" 
                            checked={task.status === 'Done'}
                            onChange={async (e) => {
                                try {
                                    console.log('[TaskItem] Updating task status:', { taskId: task.id, checked: e.target.checked, assignedTo: task.assignedTo });
                                    await actions.updateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' });
                                } catch (error) {
                                    console.error('[TaskItem] Failed to update task:', error);
                                    toast.error('Failed to update task. Check console for details.');
                                }
                            }}
                            disabled={!canComplete}
                            className="w-5 h-5 mr-3 mt-1 accent-blue-500 shrink-0 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canComplete ? 'You cannot complete this task' : ''}
                        />
                        <div className="flex-grow">
                            <span className={`text-black ${task.status === 'Done' ? 'line-through' : ''}`}>{task.text}</span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {task.subtasks && task.subtasks.length > 0 && (
                                    <span className="font-mono text-xs bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-300 rounded">
                                        📋 {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                                    </span>
                                )}
                                {task.assignedToName && (
                                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-300 rounded">
                                        👤 {task.assignedToName}
                                    </span>
                                )}
                                {lastNote && (
                                    <p className="text-sm italic opacity-80 block truncate" title={lastNote.text}>
                                        <span className="font-bold not-italic text-gray-600">Note:</span> {lastNote.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                        <button 
                            onClick={() => {
                                if (!canEdit) {
                                    toast.error('You do not have permission to edit this task');
                                    return;
                                }
                                onEdit(task);
                            }}
                            disabled={!canEdit}
                            className="bg-white rounded-lg border border-gray-200 text-slate-900 cursor-pointer text-sm py-1 px-3 font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            Edit
                        </button>
                        <button 
                            onClick={() => {
                                if (!canEdit) {
                                    toast.error('You do not have permission to delete this task');
                                    return;
                                }
                                deleteConfirm.requestConfirm(task, async (t) => {
                                    actions.deleteItem(taskCollection, t.id);
                                });
                            }}
                            disabled={!canEdit}
                            className="text-xl font-bold hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Delete task: ${task.text}`}>&times;</button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
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
        </li>
    );
};

interface TaskManagementProps {
    tasks: Task[];
    actions: AppActions;
    taskCollectionName: TaskCollectionName;
    tag: string;
    title: string;
    placeholder: string;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ tasks, actions, taskCollectionName, tag, title, placeholder }) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskDueTime, setNewTaskDueTime] = useState('');
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
    const [newTaskSubtasks, setNewTaskSubtasks] = useState<Subtask[]>([]);
    const [sortOption, setSortOption] = useState<'newest' | 'oldest'>('newest');
    const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'completed'>('all');
    const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned-to-me' | 'unassigned' | 'created-by-me'>('all');
    
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    
    const { workspaceMembers, workspace, canEditTask } = useWorkspace();
    const { user } = useAuth();

    // Sync editingTask with external changes
    useEffect(() => {
        if (editingTask) {
            const updatedTask = tasks.find(t => t.id === editingTask.id);
            setEditingTask(updatedTask || null);
        }
    }, [tasks, editingTask]);


    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim() === '') return;
        actions.createTask(taskCollectionName, newTaskText, newTaskPriority, undefined, undefined, newTaskDueDate, newTaskAssignedTo || undefined, newTaskDueTime, newTaskSubtasks);
        setNewTaskText('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setNewTaskDueTime('');
        setNewTaskAssignedTo('');
        setNewTaskSubtasks([]);
    };
    
    const openEditModal = (task: Task) => {
        setEditingTask(task);
    }

    const processedTasks = useMemo(() => {
        // Apply status filter
        const statusFiltered = tasks.filter(task => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'incomplete') return task.status !== 'Done';
            if (filterStatus === 'completed') return task.status === 'Done';
            return true;
        });

        // Apply assignment filter
        let assignmentFiltered = statusFiltered;
        if (filterAssignment === 'assigned-to-me') {
            assignmentFiltered = statusFiltered.filter(t => t.assignedTo === user?.id);
        } else if (filterAssignment === 'unassigned') {
            assignmentFiltered = statusFiltered.filter(t => !t.assignedTo);
        } else if (filterAssignment === 'created-by-me') {
            assignmentFiltered = statusFiltered.filter(t => t.userId === user?.id);
        }

        // Apply sorting
        return [...assignmentFiltered].sort((a, b) => {
            if (sortOption === 'newest') {
                return b.createdAt - a.createdAt;
            }
            return a.createdAt - b.createdAt;
        });
    }, [tasks, filterStatus, filterAssignment, sortOption, user?.id]);
    
    return (
        <>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-black">{title}</h2>
                </div>

                <form onSubmit={handleAddTask} className="mb-4 space-y-4">
                    <div>
                        <label htmlFor={`new-${taskCollectionName}-task`} className="block font-mono text-sm font-semibold text-black mb-1">
                            Add New {tag} Task
                        </label>
                        <input
                            id={`new-${taskCollectionName}-task`}
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            className="w-full bg-white rounded-xl border border-gray-200 text-slate-900 p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            placeholder={placeholder}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                            <label htmlFor={`new-${taskCollectionName}-priority`} className="block font-mono text-sm font-semibold text-black mb-1">Priority</label>
                            <select
                                id={`new-${taskCollectionName}-priority`}
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                                className="w-full bg-white rounded-xl border border-gray-200 text-slate-900 p-3 focus:outline-none focus:border-blue-500 h-full"
                            >
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                        {workspaceMembers.length > 0 && (
                            <div>
                                <label htmlFor={`new-${taskCollectionName}-assignee`} className="block text-sm font-semibold text-slate-900 mb-1">Assign To</label>
                                <select
                                    id={`new-${taskCollectionName}-assignee`}
                                    value={newTaskAssignedTo}
                                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                                    className="w-full bg-white rounded-xl border border-gray-200 text-slate-900 p-3 focus:outline-none focus:border-blue-500 h-full"
                                >
                                    <option value="">Unassigned</option>
                                    {workspaceMembers.map(member => (
                                        <option key={member.userId} value={member.userId}>
                                            {member.fullName || member.email || 'Unknown'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label htmlFor={`new-${taskCollectionName}-duedate`} className="block font-mono text-sm font-semibold text-black mb-1">Due Date</label>
                            <input
                                id={`new-${taskCollectionName}-duedate`}
                                type="date"
                                value={newTaskDueDate}
                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 text-slate-900 p-3 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor={`new-${taskCollectionName}-duetime`} className="block text-sm font-semibold text-slate-900 mb-1">Due Time</label>
                            <input
                                id={`new-${taskCollectionName}-duetime`}
                                type="time"
                                value={newTaskDueTime}
                                onChange={(e) => setNewTaskDueTime(e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 text-slate-900 p-3 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="md:self-end">
                            <button type="submit" className="w-full h-full font-semibold bg-slate-900 text-white py-2 px-6 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md">Add Task</button>
                        </div>
                    </div>
                    
                    {/* Subtasks section */}
                    <div className="border-t-2 border-gray-200 pt-4 mt-4">
                        <label className="block font-mono text-sm font-semibold text-black mb-2">Subtasks (Optional)</label>
                        <SubtaskManager 
                            subtasks={newTaskSubtasks}
                            onSubtasksChange={setNewTaskSubtasks}
                        />
                    </div>
                </form>

                <div className="flex justify-end items-center gap-2 mb-4 flex-wrap">
                    <label htmlFor={`${taskCollectionName}-assignment-filter`} className="sr-only">Filter tasks by assignment</label>
                    <select
                        id={`${taskCollectionName}-assignment-filter`}
                        value={filterAssignment}
                        onChange={(e) => setFilterAssignment(e.target.value as 'all' | 'assigned-to-me' | 'unassigned' | 'created-by-me')}
                        className="bg-white rounded-xl border border-gray-200 text-slate-900 p-2 focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All Tasks</option>
                        <option value="assigned-to-me">Assigned to Me</option>
                        <option value="unassigned">Unassigned</option>
                        <option value="created-by-me">Created by Me</option>
                    </select>
                    <label htmlFor={`${taskCollectionName}-task-filter`} className="sr-only">Filter tasks by status</label>
                    <select
                        id={`${taskCollectionName}-task-filter`}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'incomplete' | 'completed')}
                        className="bg-white rounded-xl border border-gray-200 text-slate-900 p-2 focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">Filter: All</option>
                        <option value="incomplete">Filter: Incomplete</option>
                        <option value="completed">Filter: Completed</option>
                    </select>
                    <label htmlFor={`${taskCollectionName}-task-sort`} className="sr-only">Sort tasks</label>
                    <select
                        id={`${taskCollectionName}-task-sort`}
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as 'newest' | 'oldest')}
                        className="bg-white rounded-xl border border-gray-200 text-slate-900 p-2 focus:outline-none focus:border-blue-500"
                    >
                        <option value="newest">Sort: Newest First</option>
                        <option value="oldest">Sort: Oldest First</option>
                    </select>
                </div>

                <ul className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    {processedTasks.length > 0 ? (
                        processedTasks.map(task => <TaskItem key={task.id} task={task} actions={actions} onEdit={openEditModal} taskCollection={taskCollectionName} tag={tag} />)
                    ) : (
                        <li className="text-gray-500 italic p-4">No matching tasks found.</li>
                    )}
                </ul>
            </div>

            {/* Unified Task Edit Modal */}
            <TaskEditModal
                task={editingTask}
                actions={actions}
                onClose={() => setEditingTask(null)}
                workspaceMembers={workspaceMembers}
            />
        </>
    );
};

export default TaskManagement;
