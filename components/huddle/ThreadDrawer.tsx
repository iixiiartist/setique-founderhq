import React, { useRef, useEffect, useState } from 'react';
import { X, Maximize2, Minimize2, Sparkles } from 'lucide-react';
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
    // New props for inline AI
    onAIInvoke?: (prompt: string, threadRootId: string) => void;
    isAILoading?: boolean;
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
    onLinkedEntityClick,
    onAIInvoke,
    isAILoading = false,
}) => {
    const threadEndRef = useRef<HTMLDivElement>(null);
    const threadContainerRef = useRef<HTMLDivElement>(null);
    const prevThreadMessageId = useRef<string | null>(null);
    const shouldAutoScrollThread = useRef(true);
    const userScrolledUpThread = useRef(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

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

    // Check if message is an AI request (starts with @ai, /ai, or similar)
    const isAIRequest = (content: string): boolean => {
        const trimmed = content.trim().toLowerCase();
        return trimmed.startsWith('@ai ') || 
               trimmed.startsWith('/ai ') || 
               trimmed.startsWith('ai: ') ||
               trimmed.startsWith('@assistant ');
    };

    // Extract AI prompt from message
    const extractAIPrompt = (content: string): string => {
        const trimmed = content.trim();
        // Remove the @ai, /ai, ai:, or @assistant prefix
        return trimmed.replace(/^(@ai\s+|\/ai\s+|ai:\s*|@assistant\s+)/i, '').trim();
    };

    const handleSend = (content: string, attachments?: File[], linkedEntities?: LinkedEntity[]) => {
        shouldAutoScrollThread.current = true;
        userScrolledUpThread.current = false;
        
        // Check if this is an AI request
        if (isAIRequest(content) && onAIInvoke && activeRoom?.settings?.ai_allowed !== false) {
            const prompt = extractAIPrompt(content);
            if (prompt) {
                onAIInvoke(prompt, threadMessage.id);
                return;
            }
        }
        
        onSendReply(content, attachments, linkedEntities);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <>
            {/* Mobile backdrop for thread - hidden when main menu is open */}
            {!isMainMenuOpen && (
                <div
                    className={`fixed inset-0 bg-black/50 ${huddleBackdropZIndex} ${isFullscreen ? '' : 'sm:hidden'}`}
                    onClick={isFullscreen ? undefined : onClose}
                />
            )}
            <div className={`
                flex flex-col bg-white
                fixed ${huddleOverlayZIndex}
                ${isFullscreen 
                    ? 'inset-4 sm:inset-8 rounded-2xl shadow-2xl' 
                    : 'sm:relative inset-x-0 bottom-0 sm:inset-auto max-h-[80vh] sm:max-h-none sm:h-auto w-full sm:w-96 rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none'
                }
            `}>
                {/* Drag handle for mobile (only when not fullscreen) */}
                {!isFullscreen && (
                    <div className="flex justify-center pt-2 sm:hidden">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                )}
                <div className={`${isFullscreen ? 'h-14' : 'h-12 sm:h-14'} px-3 sm:px-4 border-b border-gray-200 flex items-center justify-between`}>
                    <h3 className="font-bold text-sm sm:text-base">Thread</h3>
                    <div className="flex items-center gap-1">
                        {/* Fullscreen toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 rounded"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div
                    ref={threadContainerRef}
                    className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 ${isFullscreen ? '' : ''}`}
                    style={{ maxHeight: isFullscreen ? 'calc(100% - 140px)' : 'calc(80vh - 140px)' }}
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
                
                {/* AI hint banner */}
                {activeRoom?.settings?.ai_allowed !== false && (
                    <div className="px-3 sm:px-4 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                        <Sparkles size={12} className="text-gray-400" />
                        <span>Type <code className="px-1 py-0.5 bg-gray-200 rounded text-gray-600">@ai</code> to ask AI follow-up questions directly</span>
                    </div>
                )}
                
                <div className="border-t">
                    <MessageComposer
                        onSend={handleSend}
                        onAIInvoke={onOpenAI}
                        onTyping={onTyping}
                        placeholder={`Reply to thread${activeRoom?.settings?.ai_allowed !== false ? ' (use @ai for AI)' : ''}...`}
                        aiEnabled={activeRoom?.settings?.ai_allowed !== false}
                        disabled={isAILoading}
                    />
                </div>
            </div>
        </>
    );
};
