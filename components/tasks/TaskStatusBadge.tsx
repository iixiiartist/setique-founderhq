import React from 'react';
import { TaskStatus } from '../../types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusStyles: Record<TaskStatus, string> = {
  Todo: 'bg-blue-100 text-blue-800 border-blue-500',
  InProgress: 'bg-yellow-100 text-yellow-800 border-yellow-500',
  Done: 'bg-green-100 text-green-800 border-green-500',
};

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({ status }) => {
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold border font-mono ${statusStyles[status]}`}>{status}</span>;
};
