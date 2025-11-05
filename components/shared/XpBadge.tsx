import React from 'react';
import { Priority } from '../../types';

const XpBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
    const xpMap: Record<Priority, number> = { 'Low': 10, 'Medium': 50, 'High': 100 };
    const priorityMap: Record<Priority, string> = {
      'Low': 'priority-low',
      'Medium': 'priority-medium',
      'High': 'priority-high',
    };
    return (
      <span className={`priority-badge ${priorityMap[priority]}`}>
        +{xpMap[priority]} XP
      </span>
    );
};

export default XpBadge;
