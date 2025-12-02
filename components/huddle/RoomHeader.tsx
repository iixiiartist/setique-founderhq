import React from 'react';
import { Settings, User, Lock, Hash, Sparkles, Menu } from 'lucide-react';
import type { HuddleRoom } from '../../types/huddle';

interface RoomHeaderProps {
    room: HuddleRoom;
    displayName: string;
    onOpenRoomList: () => void;
    onOpenAI: () => void;
    onOpenSettings: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    room,
    displayName,
    onOpenRoomList,
    onOpenAI,
    onOpenSettings
}) => {
    const aiAllowed = room.settings?.ai_allowed !== false;

    return (
        <div className="h-12 sm:h-14 px-2 sm:px-4 border-b-2 border-black flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2 min-w-0">
                {/* Mobile menu button */}
                <button
                    onClick={onOpenRoomList}
                    className="p-1.5 hover:bg-gray-100 rounded sm:hidden flex-shrink-0"
                >
                    <Menu size={20} className="text-gray-600" />
                </button>
                <span className="text-gray-500 hidden sm:block">
                    {room.type === 'dm' ? <User size={20} /> : room.is_private ? <Lock size={20} /> : <Hash size={20} />}
                </span>
                <h3 className="font-bold truncate text-sm sm:text-base">
                    {displayName}
                </h3>
                {room.description && (
                    <span className="text-gray-500 text-sm truncate hidden md:block">
                        — {room.description}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                {aiAllowed ? (
                    <button
                        onClick={onOpenAI}
                        className="p-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-gray-700 to-gray-900 text-white font-medium text-sm rounded-xl hover:shadow-md transition-all flex items-center gap-1"
                        title="Ask AI"
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Ask AI</span>
                    </button>
                ) : (
                    <div
                        className="p-1.5 sm:px-3 sm:py-1.5 bg-gray-100 text-gray-400 font-medium text-sm rounded-xl border border-gray-200 flex items-center gap-1 cursor-not-allowed"
                        title="AI is disabled in this room. Enable it in room settings."
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">AI Disabled</span>
                    </div>
                )}
                <button
                    onClick={onOpenSettings}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Room settings"
                >
                    <Settings size={18} className="text-gray-600 sm:w-5 sm:h-5" />
                </button>
            </div>
        </div>
    );
};
