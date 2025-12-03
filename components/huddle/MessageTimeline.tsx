import React from 'react';
import { MessageSquare } from 'lucide-react';
import type { HuddleMessage } from '../../types/huddle';
import MessageBubble from './MessageBubble';

interface MessageTimelineProps {
    messages: HuddleMessage[];
    currentUserId: string;
    isLoading: boolean;
    typingUsers: { id: string; name: string }[];
    messagesEndRef: React.RefObject<HTMLDivElement>;
    onReact: (messageId: string, emoji: string) => void;
    onReply: (message: HuddleMessage) => void;
    onLinkedEntityClick: (entityType: string, entityId: string) => void;
}

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
    messages,
    currentUserId,
    isLoading,
    typingUsers,
    messagesEndRef,
    onReact,
    onReply,
    onLinkedEntityClick
}) => {
    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border-2 border-black animate-spin" style={{ animationDuration: '1.2s' }} />
                    <div className="absolute inset-1.5 border border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                </div>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center px-4">
                    <MessageSquare size={40} className="mx-auto mb-2 text-gray-300 sm:w-12 sm:h-12" />
                    <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="py-2 sm:py-4">
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        currentUserId={currentUserId}
                        onReact={(emoji) => onReact(message.id, emoji)}
                        onReply={() => onReply(message)}
                        onLinkedEntityClick={onLinkedEntityClick}
                    />
                ))}
                {typingUsers.length > 0 && (
                    <div className="px-4 text-xs text-gray-500">
                        {typingUsers.map(u => u.name).join(', ')} typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};
