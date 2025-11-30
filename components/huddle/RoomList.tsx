// components/huddle/RoomList.tsx
// Left sidebar room list with channels and DMs

import React, { useState } from 'react';
import { ChevronRight, Lock, Hash, Sparkles, Plus, MessageSquare } from 'lucide-react';
import type { HuddleRoom } from '../../types/huddle';

interface RoomListProps {
  rooms: HuddleRoom[];
  activeRoomId: string | null;
  unreadCounts: Record<string, number>;
  onSelectRoom: (room: HuddleRoom) => void;
  onNewDM: () => void;
  isLoading: boolean;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  activeRoomId,
  unreadCounts,
  onSelectRoom,
  onNewDM,
  isLoading,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    channels: true,
    dms: true,
  });

  // Split rooms into channels and DMs
  const channels = rooms.filter(r => r.type === 'channel');
  const dms = rooms.filter(r => r.type === 'dm');

  const toggleSection = (section: 'channels' | 'dms') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Channels Section */}
      <div className="py-2">
        <button
          onClick={() => toggleSection('channels')}
          className="w-full px-4 py-1 flex items-center justify-between text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          <span className="flex items-center gap-1">
            <ChevronRight size={14} className={`transform transition-transform ${expandedSections.channels ? 'rotate-90' : ''}`} />
            Channels
          </span>
          <span className="text-xs text-gray-400">{channels.length}</span>
        </button>
        
        {expandedSections.channels && (
          <div className="mt-1">
            {channels.length === 0 ? (
              <p className="px-4 py-2 text-sm text-gray-400">No channels yet</p>
            ) : (
              channels.map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isActive={room.id === activeRoomId}
                  unreadCount={unreadCounts[room.id] || 0}
                  onClick={() => onSelectRoom(room)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* DMs Section */}
      <div className="py-2 border-t border-gray-200">
        <button
          onClick={() => toggleSection('dms')}
          className="w-full px-4 py-1 flex items-center justify-between text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          <span className="flex items-center gap-1">
            <ChevronRight size={14} className={`transform transition-transform ${expandedSections.dms ? 'rotate-90' : ''}`} />
            Direct Messages
          </span>
          <span className="text-xs text-gray-400">{dms.length}</span>
        </button>
        
        {expandedSections.dms && (
          <div className="mt-1">
            <button
              onClick={onNewDM}
              className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
            >
              <Plus size={14} />
              New Message
            </button>
            {dms.map(room => (
              <RoomItem
                key={room.id}
                room={room}
                isActive={room.id === activeRoomId}
                unreadCount={unreadCounts[room.id] || 0}
                onClick={() => onSelectRoom(room)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual room item
interface RoomItemProps {
  room: HuddleRoom;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}

const RoomItem: React.FC<RoomItemProps> = ({ room, isActive, unreadCount, onClick }) => {
  const isChannel = room.type === 'channel';
  
  // Get display name for DMs
  const getDisplayName = () => {
    if (room.name) return room.name;
    
    // For DMs, show other member names
    const members = room.members || [];
    if (members.length === 0) return 'Direct Message';
    
    // Get first other member's name
    const displayMembers = members.slice(0, 2);
    const names = displayMembers.map(m => m.user?.full_name || 'Unknown');
    
    if (members.length > 2) {
      return `${names.join(', ')} +${members.length - 2}`;
    }
    return names.join(', ');
  };

  // Get avatar for DMs
  const getAvatar = () => {
    if (isChannel) return null;
    
    const members = room.members || [];
    const firstMember = members.find(m => m.user_id !== undefined);
    if (firstMember?.user?.avatar_url) {
      return (
        <img
          src={firstMember.user.avatar_url}
          alt=""
          className="w-6 h-6 rounded-full"
        />
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
        {(firstMember?.user?.full_name || room.name || '?')[0].toUpperCase()}
      </div>
    );
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 flex items-center gap-2 text-sm transition-colors ${
        isActive
          ? 'bg-purple-100 text-purple-900 font-semibold'
          : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      {/* Icon/Avatar */}
      {isChannel ? (
        <span className="text-gray-500">
          {room.is_private ? <Lock size={14} /> : <Hash size={14} />}
        </span>
      ) : (
        getAvatar()
      )}
      
      {/* Name */}
      <span className={`flex-1 truncate text-left ${unreadCount > 0 ? 'font-bold' : ''}`}>
        {getDisplayName()}
      </span>
      
      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* AI enabled indicator */}
      {room.settings?.ai_allowed && (
        <Sparkles size={12} className="text-purple-400 opacity-60" title="AI enabled" />
      )}
    </button>
  );
};

export default RoomList;
