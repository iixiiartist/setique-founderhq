import React, { useState, useEffect } from 'react';
import { useDeleteConfirm } from '../../hooks';
import { formatRelativeTime } from '../../lib/utils/dateUtils';
import { MentionInput } from './MentionInput';
import { ConfirmDialog } from './ConfirmDialog';
import { MessageSquare, Edit2, Trash2, Send } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

interface CommentsSectionProps {
  entityType: 'task' | 'crm_company' | 'contact' | 'marketing_campaign' | 'document' | 'financial_log';
  entityId: string;
  entityName: string;
  workspaceId: string;
  userId: string;
  workspaceMembers: WorkspaceMember[];
  comments: Comment[];
  onAddComment: (content: string) => Promise<{ success: boolean; comment?: Comment; error?: string }>;
  onUpdateComment: (commentId: string, content: string) => Promise<{ success: boolean; comment?: Comment; error?: string }>;
  onDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  onRefresh?: () => Promise<void>;
}

/**
 * Reusable comments section for any entity type
 * Supports @mentions, editing, deleting, and real-time updates
 */
export const CommentsSection: React.FC<CommentsSectionProps> = ({
  entityType,
  entityId,
  entityName,
  workspaceId,
  userId,
  workspaceMembers,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onRefresh,
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isWorkspaceOwner } = useWorkspace();
  const deleteConfirm = useDeleteConfirm<{ id: string }>('comment');

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const result = await onAddComment(newComment.trim());

    if (result.error) {
      console.error(`[CommentsSection] Failed to create comment on ${entityType}:`, result.error);
      alert('Failed to add comment. Please try again.');
    } else {
      setNewComment('');
      if (onRefresh) {
        await onRefresh();
      }
    }

    setSubmitting(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim() || submitting) return;

    setSubmitting(true);
    const result = await onUpdateComment(commentId, editingContent.trim());

    if (result.error) {
      console.error(`[CommentsSection] Failed to update comment:`, result.error);
      alert('Failed to update comment. Please try again.');
    } else {
      setEditingCommentId(null);
      setEditingContent('');
      if (onRefresh) {
        await onRefresh();
      }
    }

    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    deleteConfirm.requestConfirm({ id: commentId }, async () => {
      setSubmitting(true);
      const result = await onDeleteComment(commentId);

      if (result.error) {
        console.error(`[CommentsSection] Failed to delete comment:`, result.error);
        alert('Failed to delete comment. Please try again.');
      } else {
        if (onRefresh) {
          await onRefresh();
        }
      }

      setSubmitting(false);
    });
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // Use shared formatRelativeTime from dateUtils
  const formatDate = formatRelativeTime;

  // Can user edit/delete? Author or workspace owner
  const canModifyComment = (comment: Comment) => {
    return comment.authorId === userId || isWorkspaceOwner;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <MessageSquare className="w-5 h-5 text-slate-700" />
        <h3 className="text-lg font-semibold text-slate-900">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm italic py-4 text-center">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2"
            >
              {/* Comment Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                      <span className="text-xs text-gray-400 italic">
                        (edited)
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canModifyComment(comment) && editingCommentId !== comment.id && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(comment)}
                      className="p-1 hover:bg-gray-200 rounded-lg border border-gray-200"
                      title="Edit comment"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 hover:bg-red-100 rounded-lg border border-gray-200 text-red-600"
                      title="Delete comment"
                      disabled={submitting}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Comment Content */}
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <MentionInput
                    value={editingContent}
                    onChange={setEditingContent}
                    workspaceMembers={workspaceMembers}
                    placeholder="Edit your comment..."
                    disabled={submitting}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      disabled={submitting || !editingContent.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap break-words">
                  {comment.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      <div className="space-y-2 pt-2 border-t border-gray-200">
        <MentionInput
          value={newComment}
          onChange={setNewComment}
          workspaceMembers={workspaceMembers}
          placeholder={`Add a comment on ${entityName}...`}
          disabled={submitting}
        />
        <button
          onClick={handleSubmitComment}
          disabled={submitting || !newComment.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isConfirming}
        onClose={deleteConfirm.cancel}
        onConfirm={deleteConfirm.confirm}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
