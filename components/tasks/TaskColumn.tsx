import React, { useState, useEffect, useMemo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, type RowComponentProps } from 'react-window';
import { 
    SortableContext, 
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Task, TaskStatus, AppActions } from '../../types';
import { TaskItem } from './TaskItem';
import { logger } from '../../lib/logger';

const VIRTUALIZATION_THRESHOLD = 80;
const TASK_ROW_HEIGHT = 240;

export interface StatusColumnConfig {
    id: TaskStatus;
    title: string;
    description: string;
    accent: string;
    emptyMessage: string;
}

export const STATUS_COLUMNS: StatusColumnConfig[] = [
    {
        id: 'Todo',
        title: 'Backlog',
        description: 'Ready to be picked up next',
        accent: 'bg-sky-100',
        emptyMessage: 'Nothing waiting – add a task or adjust filters.'
    },
    {
        id: 'InProgress',
        title: 'In Progress',
        description: 'Actively being worked right now',
        accent: 'bg-amber-100',
        emptyMessage: 'No active work. Reassign or pull from backlog.'
    },
    {
        id: 'Done',
        title: 'Completed',
        description: 'Recently delivered wins',
        accent: 'bg-emerald-100',
        emptyMessage: 'No recent completions yet.'
    }
];

interface TaskColumnProps {
    column: StatusColumnConfig;
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
    onLinkedEntityNavigate: (task: Task) => void;
    onCategoryNavigate: (task: Task) => void;
    onShareToHuddle: (task: Task) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
    column,
    tasks,
    selectedTaskIds,
    bulkSelectMode,
    onTaskSelect,
    onTaskClick,
    actions,
    getLinkedEntityName,
    onLinkedEntityNavigate,
    onCategoryNavigate,
    onShareToHuddle
}) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });
    const hasTasks = tasks.length > 0;

    return (
        <section
            ref={setNodeRef}
            className="flex flex-col h-full border border-gray-200 rounded-lg shadow-sm bg-white"
            data-testid={`task-column-${column.id.toLowerCase()}`}
            data-task-status={column.id}
        >
            <div className={`px-4 py-3 border-b border-gray-200 rounded-t-lg ${column.accent}`}>
                <p className="text-xs uppercase text-gray-600 font-medium">{column.title}</p>
                <p className="text-sm text-gray-900 font-semibold">{tasks.length} task{tasks.length === 1 ? '' : 's'}</p>
                <p className="text-xs text-gray-500">{column.description}</p>
            </div>
            <div className="flex-1 min-h-[200px]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {hasTasks ? (
                        <TaskColumnList
                            tasks={tasks}
                            selectedTaskIds={selectedTaskIds}
                            bulkSelectMode={bulkSelectMode}
                            onTaskSelect={onTaskSelect}
                            onTaskClick={onTaskClick}
                            actions={actions}
                            getLinkedEntityName={getLinkedEntityName}
                            onLinkedEntityNavigate={onLinkedEntityNavigate}
                            onCategoryNavigate={onCategoryNavigate}
                            onShareToHuddle={onShareToHuddle}
                        />
                    ) : (
                        <p className="text-xs text-gray-400 italic p-4">{column.emptyMessage}</p>
                    )}
                </SortableContext>
            </div>
        </section>
    );
};

interface TaskColumnListProps {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
    onLinkedEntityNavigate: (task: Task) => void;
    onCategoryNavigate: (task: Task) => void;
    onShareToHuddle: (task: Task) => void;
}

const TaskColumnList: React.FC<TaskColumnListProps> = (props) => {
    if (props.tasks.length <= VIRTUALIZATION_THRESHOLD) {
        return <StaticTaskList {...props} />;
    }
    return <TaskColumnVirtualizedList {...props} />;
};

const StaticTaskList: React.FC<TaskColumnListProps> = ({
    tasks,
    selectedTaskIds,
    bulkSelectMode,
    onTaskSelect,
    onTaskClick,
    actions,
    getLinkedEntityName,
    onLinkedEntityNavigate,
    onCategoryNavigate,
    onShareToHuddle
}) => {
    return (
        <div className="flex flex-col gap-3 p-3">
            {tasks.map(task => (
                <SortableTaskItem
                    key={task.id}
                    task={task}
                    selectedTaskIds={selectedTaskIds}
                    bulkSelectMode={bulkSelectMode}
                    onTaskSelect={onTaskSelect}
                    onTaskClick={onTaskClick}
                    actions={actions}
                    getLinkedEntityName={getLinkedEntityName}
                    onLinkedEntityNavigate={onLinkedEntityNavigate}
                    onCategoryNavigate={onCategoryNavigate}
                    onShareToHuddle={onShareToHuddle}
                />
            ))}
        </div>
    );
};

interface SortableTaskItemProps {
    task: Task;
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
    onLinkedEntityNavigate: (task: Task) => void;
    onCategoryNavigate: (task: Task) => void;
    onShareToHuddle: (task: Task) => void;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.task.id, data: { task: props.task } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskItem
                task={props.task}
                isSelected={props.selectedTaskIds.has(props.task.id)}
                bulkSelectMode={props.bulkSelectMode}
                onSelect={() => props.onTaskSelect(props.task.id)}
                onClick={() => props.onTaskClick(props.task)}
                actions={props.actions}
                linkedEntityName={props.getLinkedEntityName(props.task)}
                onLinkedEntityNavigate={props.onLinkedEntityNavigate}
                onCategoryNavigate={props.onCategoryNavigate}
                onShareToHuddle={props.onShareToHuddle}
            />
        </div>
    );
};

interface VirtualizedRowData {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    bulkSelectMode: boolean;
    onTaskSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    actions: AppActions;
    getLinkedEntityName: (task: Task) => string | null;
    onLinkedEntityNavigate: (task: Task) => void;
    onCategoryNavigate: (task: Task) => void;
    onShareToHuddle: (task: Task) => void;
}

const VirtualizedTaskRow = ({ index, style, ...data }: RowComponentProps<VirtualizedRowData>) => {
    const task = data.tasks[index];
    if (!task) return null;

    return (
        <div style={style} className="px-3 py-1.5">
            <TaskItem
                task={task}
                isSelected={data.selectedTaskIds.has(task.id)}
                bulkSelectMode={data.bulkSelectMode}
                onSelect={() => data.onTaskSelect(task.id)}
                onClick={() => data.onTaskClick(task)}
                actions={data.actions}
                linkedEntityName={data.getLinkedEntityName(task)}
                onLinkedEntityNavigate={data.onLinkedEntityNavigate}
                onCategoryNavigate={data.onCategoryNavigate}
                onShareToHuddle={data.onShareToHuddle}
            />
        </div>
    );
};

const TaskColumnVirtualizedList: React.FC<TaskColumnListProps> = (props) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const rowProps = useMemo<VirtualizedRowData>(() => ({
        tasks: props.tasks,
        selectedTaskIds: props.selectedTaskIds,
        bulkSelectMode: props.bulkSelectMode,
        onTaskSelect: props.onTaskSelect,
        onTaskClick: props.onTaskClick,
        actions: props.actions,
        getLinkedEntityName: props.getLinkedEntityName,
        onLinkedEntityNavigate: props.onLinkedEntityNavigate,
        onCategoryNavigate: props.onCategoryNavigate,
        onShareToHuddle: props.onShareToHuddle
    }), [
        props.tasks,
        props.selectedTaskIds,
        props.bulkSelectMode,
        props.onTaskSelect,
        props.onTaskClick,
        props.actions,
        props.getLinkedEntityName,
        props.onLinkedEntityNavigate,
        props.onCategoryNavigate,
        props.onShareToHuddle
    ]);

    if (!isClient) {
        return <StaticTaskList {...props} />;
    }

    return (
        <div className="h-full">
            <AutoSizer>
                {({ height, width }) => {
                    if (!height || !width) {
                        logger.warn('[TasksTab] Virtualized column missing dimensions', { height, width });
                        return <StaticTaskList {...props} />;
                    }

                    return (
                        <List
                            style={{ height, width }}
                            rowCount={props.tasks.length}
                            rowHeight={TASK_ROW_HEIGHT}
                            rowComponent={VirtualizedTaskRow}
                            rowProps={rowProps}
                            overscanCount={10}
                        />
                    );
                }}
            </AutoSizer>
        </div>
    );
};
