import React from 'react';
import { Task, AppActions } from '../types';
import TaskManagement from './shared/TaskManagement';

export function PlatformTab({ 
    tasks, 
    actions
}: {
    tasks: Task[];
    actions: AppActions;
}) {
    return (
        <div className="max-w-5xl mx-auto">
            <TaskManagement
                tasks={tasks}
                actions={actions}
                taskCollectionName="platformTasks"
                tag="Platform"
                title="Platform Tasks"
                placeholder="e.g., 'Implement user authentication'"
            />
        </div>
    );
}

export default PlatformTab;
