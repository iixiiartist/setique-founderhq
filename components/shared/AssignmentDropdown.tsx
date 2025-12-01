import React, { useState } from 'react';
import { useClickOutside } from '../../hooks';

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignmentDropdownProps {
  workspaceMembers: WorkspaceMember[];
  currentAssignee?: string; // user_id of current assignee
  onAssign: (userId: string | null, userName: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Reusable dropdown for assigning entities to workspace members
 * Used across: Tasks, CRM Companies, Contacts, Marketing Campaigns, Documents
 */
export const AssignmentDropdown: React.FC<AssignmentDropdownProps> = ({
  workspaceMembers,
  currentAssignee,
  onAssign,
  placeholder = 'Assign to team member...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Close dropdown when clicking outside
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false), isOpen);

  // Find current assignee details
  const currentMember = workspaceMembers.find(m => m.id === currentAssignee);

  const handleSelect = (userId: string | null, userName: string | null) => {
    onAssign(userId, userName);
    setIsOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 
          border-2 border-black font-mono text-sm
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentMember ? (
            <>
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {getInitials(currentMember.name)}
              </div>
              <span className="truncate font-semibold">{currentMember.name}</span>
              {currentMember.role === 'owner' && (
                <span className="text-xs bg-yellow-100 border border-yellow-600 px-1 py-0.5">
                  OWNER
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-black shadow-neo max-h-64 overflow-y-auto">
          {/* Unassign option */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(null, null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-200 font-mono text-sm flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs flex-shrink-0">
              ✕
            </div>
            <span className="text-gray-600">Unassigned</span>
          </button>

          {/* Team members */}
          {workspaceMembers.map(member => (
            <button
              key={member.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(member.id, member.name);
              }}
              className={`
                w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-200 
                font-mono text-sm flex items-center gap-2
                ${member.id === currentAssignee ? 'bg-blue-50' : ''}
              `}
            >
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {getInitials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold">{member.name}</div>
                <div className="truncate text-xs text-gray-500">{member.email}</div>
              </div>
              {member.role === 'owner' && (
                <span className="text-xs bg-yellow-100 border border-yellow-600 px-1 py-0.5 flex-shrink-0">
                  OWNER
                </span>
              )}
              {member.id === currentAssignee && (
                <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
