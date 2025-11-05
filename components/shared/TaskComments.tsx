import React, { useState, useEffect } from 'react';
import { MentionInput } from './MentionInput';
import { createComment, getTaskComments, updateComment, deleteComment, type TaskComment } from '../../lib/services/commentsService';
import { MessageSquare, Edit2, Trash2, Send } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar?: string;
}

interface TaskCommentsProps {
  taskId: string;
  taskName: string;
  workspaceId: string;
  userId: string;
  workspaceMembers: WorkspaceMember[];
}

export const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  taskName,
  workspaceId,
  userId,
  workspaceMembers,
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { isWorkspaceOwner } = useWorkspace();

  // Load comments
  useEffect(() => {
    loadComments();
  }, [taskId]);

  const loadComments = async () => {
    setLoading(true);
    const { comments: fetchedComments } = await getTaskComments(taskId);
    setComments(fetchedComments);
    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const { comment, error } = await createComment({
      taskId,
      workspaceId,
      userId,
      content: newComment.trim(),
      taskName,
    });

    if (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to add comment. Please try again.');
    } else if (comment) {
      setComments([...comments, comment]);
      setNewComment('');
    }

    setSubmitting(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim() || submitting) return;

    setSubmitting(true);
    const { comment, error } = await updateComment(
      commentId,
      editingContent.trim(),
      workspaceMembers
    );

    if (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment. Please try again.');
    } else if (comment) {
      setComments(
        comments.map((c) => (c.id === commentId ? comment : c))
      );
      setEditingCommentId(null);
      setEditingContent('');
    }

    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setSubmitting(true);
    const { success, error } = await deleteComment(commentId);

    if (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } else if (success) {
      setComments(comments.filter((c) => c.id !== commentId));
    }

    setSubmitting(false);
  };

  const startEditing = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // Highlight @mentions in comment text
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="text-blue-600 font-medium bg-blue-50 px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700">
        <MessageSquare size={18} />
        <h3 className="font-semibold">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comments list */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              {/* Avatar */}
              {comment.userAvatar ? (
                <img
                  src={comment.userAvatar}
                  alt={comment.userName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {comment.userName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              {/* Comment content */}
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-lg px-4 py-2">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {comment.userName || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="space-y-2 mt-2">
                      <MentionInput
                        value={editingContent}
                        onChange={setEditingContent}
                        workspaceMembers={workspaceMembers}
                        placeholder="Edit comment..."
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          disabled={submitting || !editingContent.trim()}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={submitting}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-700 text-sm whitespace-pre-wrap break-words">
                      {renderCommentContent(comment.content)}
                    </div>
                  )}
                </div>

                {/* Edit/Delete buttons */}
                {editingCommentId !== comment.id && (comment.userId === userId || isWorkspaceOwner()) && (
                  <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {comment.userId === userId && (
                      <button
                        onClick={() => startEditing(comment)}
                        className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                        title="Edit comment"
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                      title={comment.userId === userId ? 'Delete comment' : 'Delete comment (workspace owner)'}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add comment form */}
      <div className="border-t pt-4">
        <div className="space-y-2">
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            workspaceMembers={workspaceMembers}
            placeholder="Add a comment... (use @ to mention)"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
