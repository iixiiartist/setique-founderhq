import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirm } from '../../hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { MessageSquare, Send, Check, X, MoreVertical, Trash2, Edit2 } from 'lucide-react';

interface DocumentComment {
    id: string;
    document_id: string;
    user_id: string;
    user_name: string;
    content: string;
    position: number | null; // Position in document (null for general comments)
    parent_id: string | null; // For threaded replies
    resolved: boolean;
    created_at: string;
    updated_at: string;
}

interface DocumentCommentsProps {
    documentId: string;
    workspaceId: string;
    selectedText?: string;
    selectionPosition?: number;
}

const DocumentComments: React.FC<DocumentCommentsProps> = ({
    documentId,
    workspaceId,
    selectedText,
    selectionPosition,
}) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<DocumentComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [editingComment, setEditingComment] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showResolved, setShowResolved] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const deleteCommentConfirm = useDeleteConfirm<{ id: string }>('comment');

    const loadComments = async () => {
        try {
            const { data, error } = await supabase
                .from('document_comments')
                .select('*')
                .eq('document_id', documentId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load comments
    useEffect(() => {
        loadComments();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`document-comments:${documentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'document_comments',
                    filter: `document_id=eq.${documentId}`,
                },
                () => {
                    loadComments();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [documentId]);

    const addComment = async () => {
        if (!newComment.trim() || !user) return;

        try {
            const { error } = await supabase
                .from('document_comments')
                .insert({
                    document_id: documentId,
                    workspace_id: workspaceId,
                    user_id: user.id,
                    user_name: user.email?.split('@')[0] || 'Anonymous',
                    content: newComment,
                    position: selectionPosition || null,
                    parent_id: null,
                    resolved: false,
                });

            if (error) throw error;
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const addReply = async (parentId: string) => {
        if (!replyContent.trim() || !user) return;

        try {
            const { error } = await supabase
                .from('document_comments')
                .insert({
                    document_id: documentId,
                    workspace_id: workspaceId,
                    user_id: user.id,
                    user_name: user.email?.split('@')[0] || 'Anonymous',
                    content: replyContent,
                    position: null,
                    parent_id: parentId,
                    resolved: false,
                });

            if (error) throw error;
            setReplyingTo(null);
            setReplyContent('');
        } catch (error) {
            console.error('Error adding reply:', error);
        }
    };

    const updateComment = async (commentId: string) => {
        if (!editContent.trim()) return;

        try {
            const { error } = await supabase
                .from('document_comments')
                .update({ content: editContent, updated_at: new Date().toISOString() })
                .eq('id', commentId);

            if (error) throw error;
            setEditingComment(null);
            setEditContent('');
        } catch (error) {
            console.error('Error updating comment:', error);
        }
    };

    const deleteComment = (commentId: string) => {
        deleteCommentConfirm.requestConfirm({ id: commentId, name: 'comment' }, async (data) => {
            try {
                const { error } = await supabase
                    .from('document_comments')
                    .delete()
                    .eq('id', data.id);

                if (error) throw error;
            } catch (error) {
                console.error('Error deleting comment:', error);
            }
        });
    };

    const toggleResolved = async (commentId: string, currentResolved: boolean) => {
        try {
            const { error } = await supabase
                .from('document_comments')
                .update({ resolved: !currentResolved })
                .eq('id', commentId);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling resolved:', error);
        }
    };

    // Get top-level comments (not replies)
    const topLevelComments = comments.filter((c) => !c.parent_id);

    // Get replies for a comment
    const getReplies = (parentId: string) => {
        return comments.filter((c) => c.parent_id === parentId);
    };

    // Filter by resolved status
    const filteredComments = showResolved
        ? topLevelComments
        : topLevelComments.filter((c) => !c.resolved);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="font-mono text-sm text-gray-500">Loading comments...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    <h3 className="font-mono font-bold text-lg">Comments</h3>
                    <span className="px-2 py-1 bg-white text-black text-xs font-mono font-bold rounded">
                        {comments.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowResolved(!showResolved)}
                    className="px-3 py-1 bg-white text-black font-mono text-xs font-semibold border-2 border-white hover:bg-gray-100"
                >
                    {showResolved ? 'Hide Resolved' : 'Show Resolved'}
                </button>
            </div>

            {/* Selected text context */}
            {selectedText && (
                <div className="p-3 bg-yellow-50 border-b-2 border-black">
                    <div className="font-mono text-xs text-gray-600 mb-1">Commenting on:</div>
                    <div className="font-mono text-sm text-gray-900 italic">"{selectedText}"</div>
                </div>
            )}

            {/* New comment form */}
            <div className="p-4 border-b-2 border-black">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment... Use @name to mention someone"
                    className="w-full p-2 border-2 border-gray-300 font-mono text-sm focus:outline-none focus:border-black resize-none"
                    rows={3}
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send size={14} />
                        Comment
                    </button>
                </div>
            </div>

            {/* Comments list */}
            <div className="max-h-[600px] overflow-y-auto">
                {filteredComments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-mono text-sm">
                        No comments yet. Be the first to comment!
                    </div>
                ) : (
                    <div className="divide-y-2 divide-gray-200">
                        {filteredComments.map((comment) => {
                            const replies = getReplies(comment.id);
                            const isEditing = editingComment === comment.id;
                            const isReplying = replyingTo === comment.id;

                            return (
                                <div key={comment.id} className={`p-4 ${comment.resolved ? 'bg-gray-50' : 'bg-white'}`}>
                                    {/* Comment header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-mono font-bold text-xs">
                                                {comment.user_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-mono font-semibold text-sm">{comment.user_name}</div>
                                                <div className="font-mono text-xs text-gray-500">
                                                    {formatTimestamp(comment.created_at)}
                                                </div>
                                            </div>
                                            {comment.resolved && (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono font-bold rounded flex items-center gap-1">
                                                    <Check size={12} />
                                                    Resolved
                                                </span>
                                            )}
                                        </div>

                                        {/* Comment actions */}
                                        {comment.user_id === user?.id && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingComment(comment.id);
                                                        setEditContent(comment.content);
                                                    }}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteComment(comment.id)}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => toggleResolved(comment.id, comment.resolved)}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                    title={comment.resolved ? 'Unresolve' : 'Resolve'}
                                                >
                                                    {comment.resolved ? <X size={14} /> : <Check size={14} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Comment content */}
                                    {isEditing ? (
                                        <div className="ml-10">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full p-2 border-2 border-gray-300 font-mono text-sm focus:outline-none focus:border-black resize-none"
                                                rows={2}
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => updateComment(comment.id)}
                                                    className="px-3 py-1 bg-black text-white font-mono text-xs font-semibold"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingComment(null);
                                                        setEditContent('');
                                                    }}
                                                    className="px-3 py-1 bg-gray-200 text-black font-mono text-xs font-semibold"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="ml-10 font-mono text-sm text-gray-900 whitespace-pre-wrap">
                                            {comment.content}
                                        </div>
                                    )}

                                    {/* Position indicator */}
                                    {comment.position !== null && (
                                        <div className="ml-10 mt-2 text-xs font-mono text-gray-500">
                                            At position {comment.position}
                                        </div>
                                    )}

                                    {/* Reply button */}
                                    {!isEditing && !comment.resolved && (
                                        <button
                                            onClick={() => setReplyingTo(comment.id)}
                                            className="ml-10 mt-2 text-xs font-mono font-semibold text-blue-600 hover:underline"
                                        >
                                            Reply
                                        </button>
                                    )}

                                    {/* Reply form */}
                                    {isReplying && (
                                        <div className="ml-10 mt-3 border-l-4 border-gray-300 pl-4">
                                            <textarea
                                                value={replyContent}
                                                onChange={(e) => setReplyContent(e.target.value)}
                                                placeholder="Write a reply..."
                                                className="w-full p-2 border-2 border-gray-300 font-mono text-sm focus:outline-none focus:border-black resize-none"
                                                rows={2}
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => addReply(comment.id)}
                                                    className="px-3 py-1 bg-black text-white font-mono text-xs font-semibold flex items-center gap-1"
                                                >
                                                    <Send size={12} />
                                                    Reply
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyContent('');
                                                    }}
                                                    className="px-3 py-1 bg-gray-200 text-black font-mono text-xs font-semibold"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Replies */}
                                    {replies.length > 0 && (
                                        <div className="ml-10 mt-3 space-y-3 border-l-4 border-gray-300 pl-4">
                                            {replies.map((reply) => (
                                                <div key={reply.id}>
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center font-mono font-bold text-xs">
                                                            {reply.user_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-mono font-semibold text-xs">{reply.user_name}</span>
                                                                <span className="font-mono text-xs text-gray-500">
                                                                    {formatTimestamp(reply.created_at)}
                                                                </span>
                                                            </div>
                                                            <div className="font-mono text-sm text-gray-900 whitespace-pre-wrap">
                                                                {reply.content}
                                                            </div>
                                                        </div>
                                                        {reply.user_id === user?.id && (
                                                            <button
                                                                onClick={() => deleteComment(reply.id)}
                                                                className="p-1 hover:bg-gray-200 rounded"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Comment Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteCommentConfirm.isOpen}
                onClose={deleteCommentConfirm.cancel}
                onConfirm={deleteCommentConfirm.confirm}
                title={deleteCommentConfirm.title}
                message={deleteCommentConfirm.message}
                confirmLabel={deleteCommentConfirm.confirmLabel}
                cancelLabel={deleteCommentConfirm.cancelLabel}
                variant={deleteCommentConfirm.variant}
                isLoading={deleteCommentConfirm.isProcessing}
            />
        </div>
    );
};

export default DocumentComments;
