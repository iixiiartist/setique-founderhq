import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Users, Eye, Edit3 } from 'lucide-react';

interface UserPresence {
    userId: string;
    userName: string;
    cursorPosition: number;
    selectionStart: number;
    selectionEnd: number;
    color: string;
    lastSeen: number;
}

interface CollaborativeEditorProps {
    documentId: string;
    initialContent: string;
    onContentChange: (content: string) => void;
    readOnly?: boolean;
}

const PRESENCE_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
    documentId,
    initialContent,
    onContentChange,
    readOnly = false,
}) => {
    const { user } = useAuth();
    const [content, setContent] = useState(initialContent);
    const [presences, setPresences] = useState<Map<string, UserPresence>>(new Map());
    const [isTyping, setIsTyping] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const userColorRef = useRef<string>(PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)]);

    // Broadcast cursor position and selection
    const broadcastPresence = useCallback(() => {
        if (!textareaRef.current || !channelRef.current || !user) return;

        const presence: UserPresence = {
            userId: user.id,
            userName: user.email?.split('@')[0] || 'Anonymous',
            cursorPosition: textareaRef.current.selectionStart,
            selectionStart: textareaRef.current.selectionStart,
            selectionEnd: textareaRef.current.selectionEnd,
            color: userColorRef.current,
            lastSeen: Date.now(),
        };

        channelRef.current.track(presence);
    }, [user]);

    // Handle content changes with debounced save
    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        onContentChange(newContent);
        
        // Set typing indicator
        setIsTyping(true);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 1000);

        // Broadcast presence
        broadcastPresence();
    }, [onContentChange, broadcastPresence]);

    // Handle selection change (cursor movement)
    const handleSelectionChange = useCallback(() => {
        broadcastPresence();
    }, [broadcastPresence]);

    // Set up real-time collaboration
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel(`document:${documentId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channelRef.current = channel;

        // Subscribe to presence changes
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const newPresences = new Map<string, UserPresence>();

                Object.entries(state).forEach(([userId, presenceArray]) => {
                    if (userId !== user.id && presenceArray.length > 0) {
                        const presence = presenceArray[0] as unknown as UserPresence;
                        // Only show presence if user was active in last 30 seconds
                        if (Date.now() - presence.lastSeen < 30000) {
                            newPresences.set(userId, presence);
                        }
                    }
                });

                setPresences(newPresences);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences: newPresence }) => {
                console.log('User joined:', key);
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                console.log('User left:', key);
                setPresences(prev => {
                    const next = new Map(prev);
                    next.delete(key);
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track initial presence
                    await channel.track({
                        userId: user.id,
                        userName: user.email?.split('@')[0] || 'Anonymous',
                        cursorPosition: 0,
                        selectionStart: 0,
                        selectionEnd: 0,
                        color: userColorRef.current,
                        lastSeen: Date.now(),
                    });
                }
            });

        // Broadcast presence every 10 seconds to keep alive
        const presenceInterval = setInterval(() => {
            broadcastPresence();
        }, 10000);

        return () => {
            clearInterval(presenceInterval);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            channel.unsubscribe();
        };
    }, [documentId, user, broadcastPresence]);

    // Update content when initialContent changes
    useEffect(() => {
        setContent(initialContent);
    }, [initialContent]);

    // Get cursor overlay positions
    const getCursorOverlays = () => {
        if (!textareaRef.current) return [];

        const overlays: { top: number; left: number; color: string; userName: string }[] = [];
        const textarea = textareaRef.current;
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseInt(style.lineHeight);
        const paddingTop = parseInt(style.paddingTop);
        const paddingLeft = parseInt(style.paddingLeft);

        presences.forEach((presence) => {
            // Calculate approximate position (simplified - works for monospace fonts)
            const textBeforeCursor = content.substring(0, presence.cursorPosition);
            const lines = textBeforeCursor.split('\n');
            const lineNumber = lines.length - 1;
            const charInLine = lines[lines.length - 1].length;

            const top = paddingTop + (lineNumber * lineHeight);
            const left = paddingLeft + (charInLine * 8.5); // Approximate char width

            overlays.push({
                top,
                left,
                color: presence.color,
                userName: presence.userName,
            });
        });

        return overlays;
    };

    const activeUserCount = presences.size + 1; // +1 for current user
    const cursorOverlays = getCursorOverlays();

    return (
        <div className="relative">
            {/* Collaboration header */}
            <div className="flex items-center justify-between mb-2 p-2 bg-gray-50 border-2 border-black">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-700" />
                    <span className="font-mono text-sm font-semibold text-gray-700">
                        {activeUserCount} {activeUserCount === 1 ? 'user' : 'users'} viewing
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Active users */}
                    <div className="flex -space-x-2">
                        {/* Current user */}
                        <div
                            className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: userColorRef.current }}
                            title="You"
                        >
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Other users */}
                        {Array.from(presences.values()).map((presence) => (
                            <div
                                key={presence.userId}
                                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: presence.color }}
                                title={presence.userName}
                            >
                                {presence.userName.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex items-center gap-1 text-gray-600">
                            <Edit3 size={14} />
                            <span className="font-mono text-xs">Editing...</span>
                        </div>
                    )}

                    {/* Read-only indicator */}
                    {readOnly && (
                        <div className="flex items-center gap-1 text-gray-600">
                            <Eye size={14} />
                            <span className="font-mono text-xs">Read-only</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor with cursor overlays */}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onSelect={handleSelectionChange}
                    onBlur={handleSelectionChange}
                    readOnly={readOnly}
                    className="w-full h-[500px] p-4 font-mono text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    style={{ lineHeight: '1.5' }}
                    placeholder="Start typing... Other users will see your changes in real-time."
                />

                {/* Cursor overlays */}
                {cursorOverlays.map((overlay, index) => (
                    <div
                        key={index}
                        className="absolute pointer-events-none"
                        style={{
                            top: overlay.top,
                            left: overlay.left,
                            width: '2px',
                            height: '1.5em',
                            backgroundColor: overlay.color,
                            animation: 'blink 1s infinite',
                        }}
                    >
                        {/* Cursor label */}
                        <div
                            className="absolute -top-6 left-0 px-2 py-1 text-xs font-mono font-semibold text-white whitespace-nowrap rounded"
                            style={{ backgroundColor: overlay.color }}
                        >
                            {overlay.userName}
                        </div>
                    </div>
                ))}
            </div>

            {/* User presence legend */}
            {presences.size > 0 && (
                <div className="mt-2 p-2 bg-gray-50 border-2 border-black">
                    <div className="flex flex-wrap gap-2">
                        {Array.from(presences.values()).map((presence) => (
                            <div key={presence.userId} className="flex items-center gap-1">
                                <div
                                    className="w-3 h-3 rounded-full border border-black"
                                    style={{ backgroundColor: presence.color }}
                                />
                                <span className="font-mono text-xs text-gray-700">
                                    {presence.userName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes blink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default CollaborativeEditor;
