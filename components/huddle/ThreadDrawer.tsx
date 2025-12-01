import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { HuddleMessage, HuddleRoom } from '../../types/huddle';
import type { LinkedEntity } from '../../types/huddle';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

interface ThreadDrawerProps {
    threadMessage: HuddleMessage;
    threadReplies: HuddleMessage[];
    activeRoom: HuddleRoom | null;
    currentUserId: string;
    isLoading: boolean;
    isMainMenuOpen: boolean;
    onClose: () => void;
    onReact: (messageId: string, emoji: string) => void;
    onSendReply: (content: string, attachments?: File[], linkedEntities?: LinkedEntity[]) => void;
    onTyping: () => void;
    onOpenAI: () => void;
    onLinkedEntityClick: (entityType: string, entityId: string) => void;
}

export const ThreadDrawer: React.FC<ThreadDrawerProps> = ({
    threadMessage,
    threadReplies,
    activeRoom,
    currentUserId,
    isLoading,
    isMainMenuOpen,
    onClose,
    onReact,
    onSendReply,
    onTyping,
    onOpenAI,
    onLinkedEntityClick
}) => {
    const threadEndRef = useRef<HTMLDivElement>(null);
    const threadContainerRef = useRef<HTMLDivElement>(null);
    const prevThreadMessageId = useRef<string | null>(null);
    const shouldAutoScrollThread = useRef(true);
    const userScrolledUpThread = useRef(false);

    // Dynamic z-index class for Huddle overlays
    const huddleOverlayZIndex = isMainMenuOpen ? 'z-10 pointer-events-none' : 'z-50';
    const huddleBackdropZIndex = isMainMenuOpen ? 'z-5 pointer-events-none' : 'z-40';

    // Scroll thread replies
    useEffect(() => {
        if (threadMessage?.id !== prevThreadMessageId.current) {
            prevThreadMessageId.current = threadMessage?.id || null;
            userScrolledUpThread.current = false;
            shouldAutoScrollThread.current = true;
        }

        if (shouldAutoScrollThread.current && !userScrolledUpThread.current && threadEndRef.current) {
            threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [threadReplies.length, threadMessage?.id]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
        shouldAutoScrollThread.current = atBottom;
        userScrolledUpThread.current = !atBottom;
    };

    const handleSend = (content: string, attachments?: File[], linkedEntities?: LinkedEntity[]) => {
        shouldAutoScrollThread.current = true;
        userScrolledUpThread.current = false;
        onSendReply(content, attachments, linkedEntities);
    };

    return (
        <>
            {/* Mobile backdrop for thread - hidden when main menu is open */}
            {!isMainMenuOpen && (
                <div
                    className={`fixed inset-0 bg-black/50 ${huddleBackdropZIndex} sm:hidden`}
                    onClick={onClose}
                />
            )}
            <div className={`
                flex flex-col bg-white
                fixed sm:relative ${huddleOverlayZIndex}
                inset-x-0 bottom-0 sm:inset-auto
                max-h-[80vh] sm:max-h-none sm:h-auto
                w-full sm:w-96
                rounded-t-2xl sm:rounded-none
                border-t-2 sm:border-t-0 sm:border-l-2 border-black
                shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none
            `}>
                {/* Drag handle for mobile */}
                <div className="flex justify-center pt-2 sm:hidden">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                <div className="h-12 sm:h-14 px-3 sm:px-4 border-b-2 border-black flex items-center justify-between">
                    <h3 className="font-bold text-sm sm:text-base">Thread</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div
                    ref={threadContainerRef}
                    className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0"
                    style={{ maxHeight: 'calc(80vh - 140px)' }}
                    onScroll={handleScroll}
                >
                    <MessageBubble
                        message={threadMessage}
                        currentUserId={currentUserId}
                        onReact={(emoji) => onReact(threadMessage.id, emoji)}
                        onReply={() => {}}
                        isThreadView
                        onLinkedEntityClick={onLinkedEntityClick}
                    />
                    <div className="border-t pt-3">
                        {isLoading ? (
                            <div className="text-center text-gray-400">Loading replies...</div>
                        ) : threadReplies.length === 0 ? (
                            <div className="text-center text-gray-400 text-sm">No replies yet.</div>
                        ) : (
                            threadReplies.map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    currentUserId={currentUserId}
                                    onReact={(emoji) => onReact(msg.id, emoji)}
                                    onReply={() => {}}
                                    isThreadView
                                    onLinkedEntityClick={onLinkedEntityClick}
                                />
                            ))
                        )}
                        <div ref={threadEndRef} />
                    </div>
                </div>
                <div className="border-t">
                    <MessageComposer
                        onSend={handleSend}
                        onAIInvoke={onOpenAI}
                        onTyping={onTyping}
                        placeholder={`Reply to thread in ${activeRoom?.name || ''}`}
                        aiEnabled={activeRoom?.settings?.ai_allowed !== false}
                    />
                </div>
            </div>
        </>
    );
};
