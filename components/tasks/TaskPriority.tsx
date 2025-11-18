import React from 'react';
import { Priority } from '../../types';

interface TaskPriorityProps {
  priority: Priority;
}

const priorityStyles: Record<Priority, string> = {
  High: 'bg-red-100 text-red-800 border-red-500',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-500',
  Low: 'bg-green-100 text-green-800 border-green-500',
};

export const TaskPriority: React.FC<TaskPriorityProps> = ({ priority }) => {
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold border font-mono ${priorityStyles[priority]}`}>{priority}</span>;
};
