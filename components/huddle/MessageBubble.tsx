// components/huddle/MessageBubble.tsx
// Individual message display with reactions, thread replies, and actions

import React, { useMemo, useState } from 'react';
import type { HuddleMessage } from '../../types/huddle';

interface MessageBubbleProps {
  message: HuddleMessage;
  currentUserId: string;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isThreadView?: boolean;
  onLinkedEntityClick?: (entityType: string, entityId: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  onReact,
  onReply,
  onEdit,
  onDelete,
  isThreadView = false,
  onLinkedEntityClick,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const isOwnMessage = message.user_id === currentUserId;
  const isAIMessage = message.is_ai;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasLinkedEntities = message.metadata?.linked_entities && Object.keys(message.metadata.linked_entities).length > 0;
  const hasReactions = message.reactions && message.reactions.length > 0;
  const hasThreadReplies = message.reply_count > 0;
  const isEdited = !!message.edited_at;

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupedReactions = useMemo(() => {
    if (!message.reactions) return [];
    
    const groups: Record<string, { emoji: string; count: number; userIds: string[]; hasOwn: boolean }> = {};
    
    message.reactions.forEach(r => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { emoji: r.emoji, count: 0, userIds: [], hasOwn: false };
      }
      groups[r.emoji].count++;
      groups[r.emoji].userIds.push(r.user_id);
      if (r.user_id === currentUserId) {
        groups[r.emoji].hasOwn = true;
      }
    });
    
    return Object.values(groups);
  }, [message.reactions, currentUserId]);

  // Escape HTML to prevent XSS before applying lightweight markdown
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Render message content with simple markdown, keeping HTML escaped
  const renderContent = (content: string) => {
    const escaped = escapeHtml(content);

    // Handle code blocks first to avoid interfering with inline formatting
    const codeBlockPattern = /```(\w+)?\n?([\s\S]*?)```/g;
    const withBlocks = escaped.replace(
      codeBlockPattern,
      (_match, _lang, code) =>
        `<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg mt-2 overflow-x-auto text-sm"><code>${code}</code></pre>`
    );

    // Apply inline markdown
    const withInline = withBlocks
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br/>');

    return <div dangerouslySetInnerHTML={{ __html: withInline }} />;
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'task': return '✅';
      case 'contact': return '👤';
      case 'deal': return '💰';
      case 'document': return '📄';
      case 'form': return '📝';
      default: return '📁';
    }
  };

  return (
    <div
      className={`group relative px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-gray-50 transition-colors ${
        isAIMessage ? 'bg-purple-50' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      <div className="flex gap-2 sm:gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isAIMessage ? (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
              AI
            </div>
          ) : message.user?.avatar_url ? (
            <img
              src={message.user.avatar_url}
              alt={message.user.full_name || ''}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-300 flex items-center justify-center text-xs sm:text-sm font-bold text-gray-600">
              {(message.user?.full_name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <span className={`font-semibold text-xs sm:text-sm ${isAIMessage ? 'text-purple-700' : 'text-gray-900'}`}>
              {isAIMessage ? 'AI Assistant' : message.user?.full_name || 'Unknown'}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400">
              {formatTime(message.created_at)}
            </span>
            {isEdited && (
              <span className="text-[10px] sm:text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Message body */}
          <div className="text-sm text-gray-800 leading-relaxed break-words">
            {renderContent(message.body)}
          </div>

          {/* Linked entities from metadata */}
          {hasLinkedEntities && message.metadata?.linked_entities && (
            <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1.5 sm:gap-2">
              {Object.entries(message.metadata.linked_entities).map(([type, ids]) => 
                ids?.map((id) => (
                  <button
                    key={`${type}-${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onLinkedEntityClick?.(type, id);
                    }}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs sm:text-sm transition-colors cursor-pointer border-0"
                  >
                    <span>{getEntityIcon(type)}</span>
                    <span className="text-gray-700 capitalize">{type}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1.5 sm:gap-2">
              {message.attachments.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs sm:text-sm transition-colors"
                >
                  {file.mime?.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="max-w-[150px] sm:max-w-[200px] max-h-[100px] sm:max-h-[150px] rounded object-cover"
                    />
                  ) : (
                    <>
                      <span>📎</span>
                      <span className="text-gray-700 truncate max-w-[120px] sm:max-w-none">{file.name}</span>
                      {file.size && (
                        <span className="text-gray-400 text-[10px] sm:text-xs hidden sm:inline">
                          ({Math.round(file.size / 1024)}KB)
                        </span>
                      )}
                    </>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Reactions */}
          {hasReactions && (
            <div className="mt-1.5 sm:mt-2 flex flex-wrap gap-1">
              {groupedReactions.map(({ emoji, count, hasOwn }) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm transition-colors ${
                    hasOwn
                      ? 'bg-purple-100 border border-purple-300'
                      : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] sm:text-xs text-gray-600">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Thread replies indicator */}
          {hasThreadReplies && !isThreadView && (
            <button
              onClick={onReply}
              className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
            >
              <span>💬</span>
              <span>{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hover actions - hidden on mobile, shown on touch via tap */}
      {showActions && (
        <div className="absolute right-2 sm:right-4 top-0 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-0.5 sm:px-1 py-0.5">
          {/* Reaction picker toggle */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1 sm:p-1.5 hover:bg-gray-100 rounded transition-colors text-sm sm:text-base"
              title="Add reaction"
            >
              😊
            </button>
            
            {/* Quick reaction picker */}
            {showReactionPicker && (
              <div className="absolute bottom-full right-0 mb-1 flex gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-0.5 sm:p-1">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowReactionPicker(false);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-base sm:text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Reply in thread */}
          {!isThreadView && (
            <button
              onClick={onReply}
              className="p-1 sm:p-1.5 hover:bg-gray-100 rounded transition-colors text-sm sm:text-base"
              title="Reply in thread"
            >
              💬
            </button>
          )}
          
          {/* Edit (own messages only) */}
          {isOwnMessage && !isAIMessage && onEdit && (
            <button
              onClick={onEdit}
              className="p-1 sm:p-1.5 hover:bg-gray-100 rounded transition-colors text-sm sm:text-base"
              title="Edit"
            >
              ✏️
            </button>
          )}
          
          {/* Delete (own messages only) */}
          {isOwnMessage && !isAIMessage && onDelete && (
            <button
              onClick={onDelete}
              className="p-1 sm:p-1.5 hover:bg-red-100 rounded transition-colors text-red-500 text-sm sm:text-base"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
