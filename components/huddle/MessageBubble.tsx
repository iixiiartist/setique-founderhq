// components/huddle/MessageBubble.tsx
// Individual message display with reactions, thread replies, and actions

import React, { useMemo, useState } from 'react';
import { ExternalLink, FileText, CheckSquare, User, DollarSign, FileIcon, Link2 } from 'lucide-react';
import type { HuddleMessage } from '../../types/huddle';

interface WebSource {
  title: string;
  url: string;
  snippet?: string;
}

interface ToolCall {
  name: string;
  result?: {
    success: boolean;
    task_id?: string;
    contact_id?: string;
    deal_id?: string;
    title?: string;
    name?: string;
    [key: string]: any;
  };
}

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
  
  // Extract AI-specific metadata
  const webSources: WebSource[] = message.metadata?.web_sources || [];
  const toolCalls: ToolCall[] = message.metadata?.tool_calls || [];
  const hasWebSources = webSources.length > 0;
  const hasToolCalls = toolCalls.some(tc => tc.result?.success);

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

  // Render message content with markdown and clickable links
  const renderContent = (content: string) => {
    const escaped = escapeHtml(content);

    // Handle code blocks first to avoid interfering with inline formatting
    const codeBlockPattern = /```(\w+)?\n?([\s\S]*?)```/g;
    let processed = escaped.replace(
      codeBlockPattern,
      (_match, lang, code) =>
        `<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg mt-2 mb-2 overflow-x-auto text-sm font-mono"><code>${code.trim()}</code></pre>`
    );

    // Convert URLs to clickable links (before other formatting)
    // Match URLs that aren't already in HTML tags
    const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
    processed = processed.replace(
      urlPattern,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-gray-700 hover:text-gray-900 underline break-all">$1</a>'
    );

    // Apply inline markdown
    processed = processed
      // Headers
      .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-gray-900 mt-3 mb-1">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="font-bold text-gray-900 mt-4 mb-2 text-base">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="font-bold text-gray-900 mt-4 mb-2 text-lg">$1</h2>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-700">$1</code>')
      // Numbered lists (basic)
      .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 ml-1"><span class="text-gray-500 font-medium min-w-[1.5rem]">$1.</span><span>$2</span></div>')
      // Line breaks
      .replace(/\n/g, '<br/>');

    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: processed }} />;
  };

  // Render tool call results as professional cards
  const renderToolResults = () => {
    if (!hasToolCalls) return null;
    
    const successfulCalls = toolCalls.filter(tc => tc.result?.success);
    if (successfulCalls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {successfulCalls.map((tc, idx) => {
          const result = tc.result!;
          let icon = <FileIcon size={14} />;
          let label = tc.name.replace(/_/g, ' ');
          let title = '';
          let entityType = '';
          let entityId = '';

          if (tc.name === 'create_task') {
            icon = <CheckSquare size={14} className="text-green-600" />;
            label = 'Task Created';
            title = result.title || '';
            entityType = 'task';
            entityId = result.task_id || '';
          } else if (tc.name === 'create_contact') {
            icon = <User size={14} className="text-blue-600" />;
            label = 'Contact Created';
            title = result.name || '';
            entityType = 'contact';
            entityId = result.contact_id || '';
          } else if (tc.name === 'create_deal') {
            icon = <DollarSign size={14} className="text-emerald-600" />;
            label = 'Deal Created';
            title = result.name || '';
            entityType = 'deal';
            entityId = result.deal_id || '';
          }

          return (
            <button
              key={idx}
              onClick={() => entityId && onLinkedEntityClick?.(entityType, entityId)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:border-green-300 transition-colors w-full text-left group"
            >
              <div className="p-1.5 bg-white rounded-md shadow-sm">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm text-gray-900 font-medium truncate">{title}</p>
              </div>
              {entityId && (
                <Link2 size={14} className="text-gray-400 group-hover:text-green-600 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Render web sources as professional citations
  const renderWebSources = () => {
    if (!hasWebSources) return null;

    return (
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ExternalLink size={12} />
          Sources
        </p>
        <div className="space-y-2">
          {webSources.slice(0, 5).map((source, idx) => (
            <a
              key={idx}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-200 text-gray-700 rounded text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-1">
                    {source.title || 'Untitled'}
                  </p>
                  {source.snippet && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{source.snippet}</p>
                  )}
                  <p className="text-xs text-gray-700 mt-1 truncate flex items-center gap-1">
                    <ExternalLink size={10} />
                    {new URL(source.url).hostname}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
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
      className={`group relative px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50/50 transition-colors ${
        isAIMessage ? 'bg-gradient-to-r from-gray-100/80 to-gray-50/50 border-l-2 border-gray-400' : ''
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
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white shadow-md">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
          <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 flex-wrap">
            <span className={`font-semibold text-xs sm:text-sm ${isAIMessage ? 'text-gray-800' : 'text-gray-900'}`}>
              {isAIMessage ? 'FounderHQ AI' : message.user?.full_name || 'Unknown'}
            </span>
            {isAIMessage && (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-gray-300 text-gray-700 rounded-full font-medium uppercase tracking-wide">
                Assistant
              </span>
            )}
            <span className="text-[10px] sm:text-xs text-gray-400">
              {formatTime(message.created_at)}
            </span>
            {isEdited && (
              <span className="text-[10px] sm:text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Message body */}
          <div className={`text-sm leading-relaxed break-words ${isAIMessage ? 'text-gray-800' : 'text-gray-800'}`}>
            {renderContent(message.body)}
            
            {/* Tool call results (tasks, contacts, etc created) */}
            {isAIMessage && renderToolResults()}
            
            {/* Web sources citations */}
            {isAIMessage && renderWebSources()}
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
                      ? 'bg-gray-200 border border-gray-400'
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
              className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-700 hover:text-gray-700 hover:underline flex items-center gap-1"
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
