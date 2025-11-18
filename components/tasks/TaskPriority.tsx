import React from 'react';
import { Priority } from '../../types';

interface TaskPriorityProps {
  priority: Priority;
}

const priorityStyles: Record<Priority, string> = {
  High: 'text-red-500',
  Medium: 'text-yellow-500',
  Low: 'text-green-500',
};

export const TaskPriority: React.FC<TaskPriorityProps> = ({ priority }) => {
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityStyles[priority]}`}>{priority}</span>;
};
