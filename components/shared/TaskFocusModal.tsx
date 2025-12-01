import React from 'react';
import { Task, AppActions, Priority } from '../../types';
import Modal from './Modal';
import { TASK_TAG_BG_COLORS } from '../../constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface TaskFocusItemProps {
    task: Task & { tag: string };
    onUpdateTask: AppActions['updateTask'];
    canEdit: boolean;
}

const TaskFocusItem: React.FC<TaskFocusItemProps> = ({ task, onUpdateTask, canEdit }) => {
    const tagColorClass = TASK_TAG_BG_COLORS[task.tag] || 'bg-gray-300';
    return (
        <li className="flex items-stretch bg-white border border-gray-200 rounded-xl shadow-sm mb-3 overflow-hidden">
            <div className={`w-1.5 shrink-0 ${tagColorClass}`}></div>
            <div className="flex items-center justify-between p-3 flex-grow overflow-hidden">
                <div className="flex items-center flex-grow overflow-hidden">
                    <input 
                        type="checkbox" 
                        id={`focus-task-${task.id}`}
                        checked={task.status === 'Done'}
                        onChange={(e) => onUpdateTask(task.id, { status: e.target.checked ? 'Done' : 'Todo' })}
                        disabled={!canEdit}
                        className="w-5 h-5 mr-3 accent-slate-900 shrink-0 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed" 
                        title={!canEdit ? 'You cannot edit this task' : ''}
                    />
                    <label htmlFor={`focus-task-${task.id}`} className={`flex flex-col overflow-hidden ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <span className="text-xs font-medium text-slate-500">{task.tag}</span>
                        <span className={`text-slate-900 truncate ${!canEdit ? 'opacity-50' : ''}`}>{task.text}</span>
                    </label>
                </div>
            </div>
        </li>
    );
};


interface TaskFocusModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: (Task & { tag: string })[];
    actions: { updateTask: AppActions['updateTask'] };
}

const TaskFocusModal: React.FC<TaskFocusModalProps> = ({ isOpen, onClose, tasks, actions }) => {
    const { canEditTask } = useWorkspace();
    // The Modal component requires a triggerRef to return focus to on close.
    // Since this modal is opened programmatically from a non-standard element,
    // we can pass a ref to the modal itself, or null.
    const modalTriggerRef = React.useRef<HTMLDivElement>(null); 

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Focus Mode: Complete Open Tasks" 
            triggerRef={modalTriggerRef}
        >
            <p className="text-gray-600 mb-4">Check off tasks to complete them and earn XP. The highest priority tasks are listed first.</p>
            {tasks.length > 0 ? (
                <ul className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    {tasks.map(task => (
                        <TaskFocusItem 
                            key={task.id} 
                            task={task} 
                            onUpdateTask={actions.updateTask}
                            canEdit={!task.userId || canEditTask(task.userId)}
                        />
                    ))}
                </ul>
            ) : (
                <div className="text-center p-8 border border-dashed border-gray-300 rounded-xl">
                    <p className="text-2xl mb-2">🎉</p>
                    <p className="font-semibold text-lg text-slate-900">All tasks completed!</p>
                    <p className="text-slate-600">Great job. Time to create some new ones!</p>
                </div>
            )}
        </Modal>
    );
};

export default TaskFocusModal;