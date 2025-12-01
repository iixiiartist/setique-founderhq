import React from 'react';
import { HandMetal, Menu } from 'lucide-react';

interface HuddleEmptyStateProps {
    onOpenRoomList: () => void;
    onCreateChannel: () => void;
}

export const HuddleEmptyState: React.FC<HuddleEmptyStateProps> = ({
    onOpenRoomList,
    onCreateChannel
}) => {
    return (
        <div className="flex-1 flex items-center justify-center text-gray-500 px-4">
            <div className="text-center">
                {/* Mobile menu button in empty state */}
                <button
                    onClick={onOpenRoomList}
                    className="mb-4 p-2 bg-gray-100 rounded-lg sm:hidden"
                >
                    <Menu size={24} className="text-gray-600" />
                </button>
                <HandMetal size={48} className="mx-auto mb-3 text-gray-300 sm:w-16 sm:h-16" />
                <p className="font-medium text-lg sm:text-xl mb-2">Welcome to Huddle</p>
                <p className="text-gray-400 mb-4 text-sm sm:text-base">Select a channel or start a conversation</p>
                <button
                    onClick={onCreateChannel}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold border-2 border-black shadow-[2px_2px_0_0_black] sm:shadow-[4px_4px_0_0_black] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_black] sm:hover:shadow-[2px_2px_0_0_black] transition-all text-sm sm:text-base"
                >
                    Create Channel
                </button>
            </div>
        </div>
    );
};
