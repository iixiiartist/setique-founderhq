import React, { useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, ArrowDown } from 'lucide-react';
import type { HuddleMessage } from '../../types/huddle';
import MessageBubble from './MessageBubble';
import { useMessageList } from '../../lib/utils/virtualList';

// Threshold for showing "scroll to bottom" button
const SCROLL_BOTTOM_THRESHOLD = 100;

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

// Convert HuddleMessage to compatible format for virtualizer
interface VirtualizedMessage {
    id: string;
    content: string;
    timestamp: string;
    original: HuddleMessage;
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
    // Convert messages to virtualized format
    const virtualizedMessages = useMemo<VirtualizedMessage[]>(() => 
        messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            timestamp: msg.created_at,
            original: msg,
        })),
        [messages]
    );

    // Use virtualized message list - estimated height based on typical message
    const {
        containerRef,
        virtualMessages,
        totalHeight,
        measureItem,
        scrollToBottom,
        isAtBottom,
    } = useMessageList({
        messages: virtualizedMessages,
        estimatedItemHeight: 80, // Average message height
        overscan: 5,
    });

    // Auto-scroll to bottom when new messages arrive (if already at bottom)
    const prevMessageCount = React.useRef(messages.length);
    useEffect(() => {
        if (messages.length > prevMessageCount.current && isAtBottom) {
            scrollToBottom('smooth');
        }
        prevMessageCount.current = messages.length;
    }, [messages.length, isAtBottom, scrollToBottom]);

    // Initial scroll to bottom
    useEffect(() => {
        if (messages.length > 0 && !isLoading) {
            // Small delay to ensure heights are measured
            const timer = setTimeout(() => scrollToBottom(), 50);
            return () => clearTimeout(timer);
        }
    }, [isLoading]); // Only on initial load

    // Measure callback for accurate heights
    const measureRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
        measureItem(id, el);
    }, [measureItem]);

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
        <div className="flex-1 relative">
            {/* Virtualized message container */}
            <div 
                ref={containerRef}
                className="absolute inset-0 overflow-y-auto"
                style={{ willChange: 'scroll-position' }}
            >
                <div 
                    style={{ 
                        height: totalHeight + 100, // Extra space for typing indicator
                        position: 'relative',
                        minHeight: '100%',
                    }}
                    className="py-2 sm:py-4"
                >
                    {virtualMessages.map(({ item, style }) => (
                        <div
                            key={item.id}
                            ref={measureRef(item.id)}
                            style={style}
                        >
                            <MessageBubble
                                message={item.original}
                                currentUserId={currentUserId}
                                onReact={(emoji) => onReact(item.id, emoji)}
                                onReply={() => onReply(item.original)}
                                onLinkedEntityClick={onLinkedEntityClick}
                            />
                        </div>
                    ))}
                    
                    {/* Typing indicator at the bottom */}
                    {typingUsers.length > 0 && (
                        <div 
                            className="px-4 text-xs text-gray-500"
                            style={{ 
                                position: 'absolute', 
                                bottom: 40, 
                                left: 0, 
                                right: 0 
                            }}
                        >
                            {typingUsers.map(u => u.name).join(', ')} typing...
                        </div>
                    )}
                    
                    {/* Scroll anchor for compatibility */}
                    <div 
                        ref={messagesEndRef}
                        style={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            height: 1 
                        }} 
                    />
                </div>
            </div>

            {/* Scroll to bottom button (appears when not at bottom) */}
            {!isAtBottom && messages.length > 10 && (
                <button
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-4 right-4 z-10 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
                    aria-label="Scroll to bottom"
                >
                    <ArrowDown size={20} />
                </button>
            )}
        </div>
    );
};
