// components/huddle/HuddleTab.tsx
// Main Huddle tab component - Slack-style team chat with AI integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
    useHuddleRooms,
    useHuddleMessages,
    useSendMessage,
    useUnreadCounts,
    useMarkAsRead,
    useAddReaction,
    useCreateRoom,
    useGetOrCreateDM,
    useInvokeAI,
    useRealtimeMessages,
    useTypingIndicators,
    useUpdateRoomSettings,
    useArchiveRoom,
} from '../../hooks/useHuddle';
import { taskKeys } from '../../hooks/useTaskQueries';
import type { HuddleRoom, HuddleMessage, HuddleLinkedEntities, LinkedEntity, HuddleAttachment, HuddleRoomSettings } from '../../types/huddle';
import type { Task, AppActions } from '../../types';
import { supabase } from '../../lib/supabase';
import { DatabaseService } from '../../lib/services/database';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { showSuccess, showError } from '../../lib/utils/toast';

// Sub-components
import RoomList from './RoomList';
import MessageComposer from './MessageComposer';
import AIInvokeSheet from './AIInvokeSheet';
import CreateRoomModal, { CreateRoomData } from './CreateRoomModal';
import RoomSettingsModal from './RoomSettingsModal';
import { HuddleEmptyState } from './HuddleEmptyState';
import { RoomHeader } from './RoomHeader';
import { ThreadDrawer } from './ThreadDrawer';
import { MessageTimeline } from './MessageTimeline';
import { HUDDLE_UPLOAD_BUCKET, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from './constants';

interface HuddleTabProps {
    isMainMenuOpen?: boolean;
}

export const HuddleTab: React.FC<HuddleTabProps> = ({ isMainMenuOpen = false }) => {
    const { user } = useAuth();
    const { workspace, workspaceMembers } = useWorkspace();
    const workspaceId = workspace?.id;
    const queryClient = useQueryClient();

    // State
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [showAISheet, setShowAISheet] = useState(false);
    const [aiThreadRootId, setAiThreadRootId] = useState<string | null>(null);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [showCreateDM, setShowCreateDM] = useState(false);
    const [showRoomSettings, setShowRoomSettings] = useState(false);
    const [threadMessage, setThreadMessage] = useState<HuddleMessage | null>(null);
    const [showMobileRoomList, setShowMobileRoomList] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [loadingEntity, setLoadingEntity] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);

    // Close overlays when main menu opens
    useEffect(() => {
        if (isMainMenuOpen) {
            setShowMobileRoomList(false);
            setThreadMessage(null);
            setShowAISheet(false);
        }
    }, [isMainMenuOpen]);

    // Dynamic z-index classes
    const huddleOverlayZIndex = isMainMenuOpen ? 'z-10 pointer-events-none' : 'z-50';
    const huddleBackdropZIndex = isMainMenuOpen ? 'z-5 pointer-events-none' : 'z-40';

    // Queries
    const { data: rooms = [], isLoading: roomsLoading } = useHuddleRooms(workspaceId);
    const { data: unreadCounts = {} } = useUnreadCounts(workspaceId);
    const { data: messages = [], isLoading: messagesLoading } = useHuddleMessages(activeRoomId || undefined);
    const { data: threadMessages = [], isLoading: threadMessagesLoading } = useHuddleMessages(
        activeRoomId || undefined,
        threadMessage?.id
    );
    useRealtimeMessages(activeRoomId || undefined, !!activeRoomId);
    const { typingUsers, setTyping } = useTypingIndicators(
        activeRoomId || undefined,
        user?.id,
        (user?.user_metadata as any)?.full_name || user?.email || 'You'
    );

    // Mutations
    const sendMessageMutation = useSendMessage();
    const markRead = useMarkAsRead();
    const addReactionMutation = useAddReaction();
    const createRoom = useCreateRoom();
    const getOrCreateDM = useGetOrCreateDM();
    const updateRoomSettings = useUpdateRoomSettings();
    const archiveRoom = useArchiveRoom();
    const { invoke: invokeAI, isStreaming: isAILoading, streamContent: aiResponse, reset: resetAI } = useInvokeAI();

    // Derived
    const typedUnreadCounts = unreadCounts as Record<string, number>;
    const activeRoom = rooms.find(r => r.id === activeRoomId) || null;
    const threadReplies = threadMessage ? threadMessages.filter(m => m.id !== threadMessage.id) : [];
    const totalUnread = Object.values(typedUnreadCounts).reduce((sum, count) => sum + count, 0);

    // Auto-select first room
    useEffect(() => {
        if (!activeRoomId && rooms.length > 0) {
            setActiveRoomId(rooms[0].id);
        }
    }, [rooms, activeRoomId]);

    // Mark room as read
    useEffect(() => {
        if (activeRoomId && (typedUnreadCounts[activeRoomId] ?? 0) > 0) {
            markRead.mutate(activeRoomId);
        }
    }, [activeRoomId, typedUnreadCounts, markRead, messages.length]);

    // Helper: Get DM display name
    const getDMName = useCallback((room: HuddleRoom): string => {
        if (room.name) return room.name;
        const members = room.members || [];
        const otherMembers = members.filter(m => m.user_id !== user?.id);
        if (otherMembers.length === 0) return 'Direct Message';
        if (otherMembers.length === 1) return otherMembers[0].user?.full_name || 'Unknown';
        return otherMembers.slice(0, 2).map(m => m.user?.full_name || 'Unknown').join(', ') +
            (otherMembers.length > 2 ? ` +${otherMembers.length - 2}` : '');
    }, [user?.id]);

    // Upload attachments
    const uploadAttachments = useCallback(async (files: File[]): Promise<HuddleAttachment[]> => {
        if (!workspaceId || files.length === 0) return [];

        const validFiles: File[] = [];
        const errors: string[] = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: File too large (max 10MB)`);
                continue;
            }
            if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
                errors.push(`${file.name}: File type not allowed`);
                continue;
            }
            validFiles.push(file);
        }

        if (errors.length > 0) showError(errors.join('\n'));
        if (validFiles.length === 0) return [];

        const uploads = await Promise.all(validFiles.map(async (file) => {
            const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const path = `${workspaceId}/${id}-${file.name}`;

            const { data, error } = await supabase.storage
                .from(HUDDLE_UPLOAD_BUCKET)
                .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage.from(HUDDLE_UPLOAD_BUCKET).getPublicUrl(data.path);

            return { id, type: 'upload' as const, name: file.name, mime: file.type, size: file.size, url: publicUrlData.publicUrl };
        }));

        return uploads;
    }, [workspaceId]);

    // Handlers
    const handleSelectRoom = useCallback((room: HuddleRoom) => {
        setActiveRoomId(room.id);
        setThreadMessage(null);
        setShowMobileRoomList(false);
        userScrolledUp.current = false;
    }, []);

    const handleSendMessage = useCallback(async (content: string, attachments?: File[], linkedEntities?: LinkedEntity[]) => {
        if (!activeRoomId || (!content.trim() && (!attachments || attachments.length === 0))) return;

        let linked_entities: HuddleLinkedEntities | undefined;
        if (linkedEntities?.length) {
            linked_entities = {};
            linkedEntities.forEach(entity => {
                const key = entity.entity_type + 's' as keyof HuddleLinkedEntities;
                if (!linked_entities![key]) linked_entities![key] = [];
                linked_entities![key]!.push(entity.entity_id);
            });
        }

        try {
            const uploadedAttachments = attachments?.length ? await uploadAttachments(attachments) : undefined;
            userScrolledUp.current = false;
            await sendMessageMutation.mutateAsync({
                room_id: activeRoomId,
                body: content.trim() || 'Shared attachments',
                body_format: 'markdown',
                linked_entities,
                attachments: uploadedAttachments,
            });
            markRead.mutate(activeRoomId);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }, [activeRoomId, sendMessageMutation, uploadAttachments, markRead]);

    const handleSendThreadMessage = useCallback(async (content: string, attachments?: File[], linkedEntities?: LinkedEntity[]) => {
        if (!activeRoomId || !threadMessage || (!content.trim() && (!attachments || attachments.length === 0))) return;

        let linked_entities: HuddleLinkedEntities | undefined;
        if (linkedEntities?.length) {
            linked_entities = {};
            linkedEntities.forEach(entity => {
                const key = entity.entity_type + 's' as keyof HuddleLinkedEntities;
                if (!linked_entities![key]) linked_entities![key] = [];
                linked_entities![key]!.push(entity.entity_id);
            });
        }

        try {
            const uploadedAttachments = attachments?.length ? await uploadAttachments(attachments) : undefined;
            await sendMessageMutation.mutateAsync({
                room_id: activeRoomId,
                thread_root_id: threadMessage.id,
                body: content.trim() || 'Shared attachments',
                body_format: 'markdown',
                linked_entities,
                attachments: uploadedAttachments,
            });
            markRead.mutate(activeRoomId);
        } catch (error) {
            console.error('Failed to send thread message:', error);
        }
    }, [activeRoomId, threadMessage, uploadAttachments, sendMessageMutation, markRead]);

    const handleAIInvoke = useCallback(async (prompt: string, context: { type: string; enabled: boolean }[], useWebSearch: boolean, threadRootId?: string) => {
        if (!activeRoomId) return;

        const contextTypes = context.filter(c => c.enabled).map(c => c.type) as ('tasks' | 'contacts' | 'deals' | 'documents' | 'forms' | 'pipeline')[];

        await invokeAI({
            room_id: activeRoomId,
            thread_root_id: threadRootId,
            prompt,
            user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            context_options: {
                include_recent_messages: true,
                include_thread: !!threadRootId,
                include_workspace_data: contextTypes.length > 0,
                workspace_data_types: contextTypes,
                include_web_research: useWebSearch,
                web_research_query: useWebSearch ? prompt : undefined,
            },
            tool_options: {
                allow_task_creation: true,
                allow_contact_creation: true,
                allow_account_creation: true,
                allow_deal_creation: true,
                allow_expense_creation: true,
                allow_revenue_creation: true,
                allow_note_creation: true,
                allow_calendar_event_creation: true,
                allow_marketing_campaign_creation: true,
                allow_web_search: useWebSearch,
            },
        });
    }, [activeRoomId, invokeAI]);

    const handleCreateChannel = useCallback(async (data: CreateRoomData) => {
        if (!workspaceId) return;
        try {
            const result = await createRoom.mutateAsync({
                workspace_id: workspaceId,
                type: 'channel',
                name: data.name || 'new-channel',
                description: data.description,
                is_private: data.isPrivate || false,
                member_ids: data.memberIds,
                settings: { ai_allowed: data.aiAllowed ?? true, auto_summarize: false, ai_can_write: true, retention_days: null },
            });
            if (result) {
                setActiveRoomId(result.id);
                setShowCreateChannel(false);
            }
        } catch (error) {
            console.error('Failed to create channel:', error);
        }
    }, [workspaceId, createRoom]);

    const handleCreateDM = useCallback(async (data: CreateRoomData) => {
        if (!workspaceId || !data.memberIds?.length) return;
        try {
            const result = await getOrCreateDM.mutateAsync({ workspaceId, userIds: data.memberIds });
            if (result) {
                setActiveRoomId(result.room_id);
                setShowCreateDM(false);
            }
        } catch (error) {
            console.error('Failed to create DM:', error);
        }
    }, [workspaceId, getOrCreateDM]);

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        try {
            await addReactionMutation.mutateAsync({ messageId, emoji });
        } catch (error) {
            console.error('Failed to add reaction:', error);
        }
    }, [addReactionMutation]);

    const handleLinkedEntityClick = useCallback(async (entityType: string, entityId: string) => {
        const normalizedType = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
        if (normalizedType === 'task') {
            setLoadingEntity(true);
            try {
                const { data, error } = await DatabaseService.getTaskById(entityId);
                if (error || !data) return;
                const task: Task = {
                    id: data.id,
                    text: data.text,
                    status: data.status,
                    priority: data.priority,
                    category: data.category,
                    createdAt: new Date(data.created_at).getTime(),
                    completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
                    dueDate: data.due_date || undefined,
                    dueTime: data.due_time || undefined,
                    notes: data.notes || [],
                    subtasks: data.subtasks || [],
                    crmItemId: data.crm_item_id || undefined,
                    contactId: data.contact_id || undefined,
                    userId: data.user_id,
                    assignedTo: data.assigned_to || undefined,
                };
                setSelectedTask(task);
            } finally {
                setLoadingEntity(false);
            }
        }
    }, []);

    const handleUpdateSettings = useCallback(async (settings: Partial<HuddleRoomSettings>) => {
        if (!activeRoomId) return;
        await updateRoomSettings.mutateAsync({ roomId: activeRoomId, settings });
    }, [activeRoomId, updateRoomSettings]);

    const handleArchiveRoom = useCallback(async () => {
        if (!activeRoomId) return;
        await archiveRoom.mutateAsync(activeRoomId);
        setActiveRoomId(null);
        setShowRoomSettings(false);
    }, [activeRoomId, archiveRoom]);

    // Task actions for modal (typed as AppActions to match original)
    const taskActions = {
        updateTask: async (taskId: string, updates: Record<string, unknown>) => {
            try {
                const dbUpdates = {
                    text: updates.text,
                    status: updates.status,
                    priority: updates.priority,
                    due_date: updates.dueDate,
                    due_time: updates.dueTime,
                    assigned_to: updates.assignedTo,
                    category: updates.category,
                    subtasks: updates.subtasks,
                };
                const { error } = await DatabaseService.updateTask(taskId, dbUpdates as Parameters<typeof DatabaseService.updateTask>[1]);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: taskKeys.all });
                showSuccess('Task updated successfully');
                setSelectedTask(null);
                return { success: true, message: 'Task updated' };
            } catch (error) {
                showError('Failed to update task');
                return { success: false, message: 'Failed to update task' };
            }
        },
        addNote: async (collection: string, itemId: string, noteText: string) => {
            try {
                const newNote = { text: noteText, timestamp: Date.now() };
                const currentNotes = selectedTask?.notes || [];
                await DatabaseService.updateTask(itemId, { notes: [...currentNotes, newNote] as unknown as Parameters<typeof DatabaseService.updateTask>[1]['notes'] });
                setSelectedTask(prev => prev ? { ...prev, notes: [...(prev.notes || []), newNote] } : null);
                queryClient.invalidateQueries({ queryKey: taskKeys.all });
                showSuccess('Note added');
                return { success: true, message: 'Note added' };
            } catch (error) {
                showError('Failed to add note');
                return { success: false, message: 'Failed to add note' };
            }
        },
        updateNote: async (collection: string, itemId: string, noteTimestamp: number, newText: string) => {
            try {
                const currentNotes = selectedTask?.notes || [];
                const updatedNotes = currentNotes.map(n => n.timestamp === noteTimestamp ? { ...n, text: newText } : n);
                await DatabaseService.updateTask(itemId, { notes: updatedNotes as unknown as Parameters<typeof DatabaseService.updateTask>[1]['notes'] });
                setSelectedTask(prev => prev ? { ...prev, notes: updatedNotes } : null);
                queryClient.invalidateQueries({ queryKey: taskKeys.all });
                showSuccess('Note updated');
                return { success: true, message: 'Note updated' };
            } catch (error) {
                showError('Failed to update note');
                return { success: false, message: 'Failed to update note' };
            }
        },
        deleteNote: async (collection: string, itemId: string, noteTimestamp: number) => {
            try {
                const currentNotes = selectedTask?.notes || [];
                const filteredNotes = currentNotes.filter(n => n.timestamp !== noteTimestamp);
                await DatabaseService.updateTask(itemId, { notes: filteredNotes as unknown as Parameters<typeof DatabaseService.updateTask>[1]['notes'] });
                setSelectedTask(prev => prev ? { ...prev, notes: filteredNotes } : null);
                queryClient.invalidateQueries({ queryKey: taskKeys.all });
                showSuccess('Note deleted');
                return { success: true, message: 'Note deleted' };
            } catch (error) {
                showError('Failed to delete note');
                return { success: false, message: 'Failed to delete note' };
            }
        },
    } as AppActions;

    if (!workspaceId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Please select a workspace to use Huddle</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-white relative">
            {/* Mobile backdrop for room list */}
            {showMobileRoomList && !isMainMenuOpen && (
                <div className={`fixed inset-0 bg-black/50 ${huddleBackdropZIndex} sm:hidden`} onClick={() => setShowMobileRoomList(false)} />
            )}

            {/* Left sidebar - Room list */}
            <div className={`
                w-64 border-r-2 border-black flex flex-col bg-gray-50
                fixed sm:relative inset-y-0 left-0 ${huddleOverlayZIndex}
                transform transition-transform duration-300 ease-out
                ${showMobileRoomList ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
            `}>
                <div className="p-3 sm:p-4 border-b-2 border-black bg-white">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                            <MessageSquare size={18} className="text-gray-700 sm:w-5 sm:h-5" />
                            Huddle
                        </h2>
                        <div className="flex items-center gap-2">
                            {totalUnread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>}
                            <button onClick={() => setShowMobileRoomList(false)} className="p-1.5 hover:bg-gray-100 rounded sm:hidden"><X size={18} /></button>
                        </div>
                    </div>
                    <button onClick={() => setShowCreateChannel(true)} className="w-full px-3 py-2 bg-black text-white font-medium rounded-xl hover:bg-gray-800 hover:shadow-md transition-all text-sm">
                        + New Channel
                    </button>
                </div>
                <RoomList rooms={rooms} activeRoomId={activeRoomId} unreadCounts={unreadCounts} onSelectRoom={handleSelectRoom} onNewDM={() => setShowCreateDM(true)} isLoading={roomsLoading} />
            </div>

            {/* Main chat area */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeRoom ? (
                    <>
                        <RoomHeader
                            room={activeRoom}
                            displayName={activeRoom.type === 'dm' ? getDMName(activeRoom) : activeRoom.name || ''}
                            onOpenRoomList={() => setShowMobileRoomList(true)}
                            onOpenAI={() => setShowAISheet(true)}
                            onOpenSettings={() => setShowRoomSettings(true)}
                        />
                        <MessageTimeline
                            messages={messages}
                            currentUserId={user?.id || ''}
                            isLoading={messagesLoading}
                            typingUsers={typingUsers}
                            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
                            onReact={handleReaction}
                            onReply={setThreadMessage}
                            onLinkedEntityClick={handleLinkedEntityClick}
                        />
                        <MessageComposer
                            onSend={handleSendMessage}
                            onAIInvoke={() => { setAiThreadRootId(null); setShowAISheet(true); }}
                            onTyping={() => setTyping(true)}
                            placeholder={`Message ${activeRoom.type === 'dm' ? getDMName(activeRoom) : '#' + activeRoom.name}...`}
                            aiEnabled={activeRoom.settings?.ai_allowed !== false}
                        />
                    </>
                ) : (
                    <HuddleEmptyState onOpenRoomList={() => setShowMobileRoomList(true)} onCreateChannel={() => setShowCreateChannel(true)} />
                )}
            </div>

            {/* Thread drawer */}
            {threadMessage && (
                <ThreadDrawer
                    threadMessage={threadMessage}
                    threadReplies={threadReplies}
                    activeRoom={activeRoom}
                    currentUserId={user?.id || ''}
                    isLoading={threadMessagesLoading}
                    isMainMenuOpen={isMainMenuOpen}
                    onClose={() => setThreadMessage(null)}
                    onReact={handleReaction}
                    onSendReply={handleSendThreadMessage}
                    onTyping={() => setTyping(true)}
                    onOpenAI={() => { setAiThreadRootId(threadMessage.id); setShowAISheet(true); }}
                    onLinkedEntityClick={handleLinkedEntityClick}
                />
            )}

            {/* Modals */}
            <AIInvokeSheet isOpen={showAISheet} onClose={() => { setShowAISheet(false); setAiThreadRootId(null); resetAI(); }} onInvoke={handleAIInvoke} isLoading={isAILoading} streamingResponse={aiResponse} roomName={activeRoom?.name} threadRootId={aiThreadRootId} />
            <CreateRoomModal isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} onCreate={handleCreateChannel} mode="channel" workspaceId={workspaceId} />
            <CreateRoomModal isOpen={showCreateDM} onClose={() => setShowCreateDM(false)} onCreate={handleCreateDM} mode="dm" workspaceId={workspaceId} />
            {activeRoom && <RoomSettingsModal isOpen={showRoomSettings} onClose={() => setShowRoomSettings(false)} room={activeRoom} onUpdateSettings={handleUpdateSettings} onArchive={handleArchiveRoom} currentUserId={user?.id} />}

            {/* Loading overlay for linked entities */}
            {loadingEntity && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
                        <span className="relative w-5 h-5 inline-block"><span className="absolute inset-0 border-2 border-gray-600 animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-gray-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span>
                        <span className="text-gray-700">Loading...</span>
                    </div>
                </div>
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTask(null); }} onKeyDown={(e) => { if (e.key === 'Escape') setSelectedTask(null); }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
                        <TaskDetailPanel task={selectedTask} actions={taskActions as AppActions} onClose={() => setSelectedTask(null)} onNavigateToEntity={() => setSelectedTask(null)} workspaceMembers={workspaceMembers} linkedEntityName={null} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default HuddleTab;
