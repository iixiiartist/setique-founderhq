// components/huddle/MessageComposer.tsx
// Rich message composer with attachments, formatting, and AI invoke

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Paperclip, Send, Sparkles, Type, X, FileText } from 'lucide-react';
import type { LinkedEntity } from '../../types/huddle';

interface MessageComposerProps {
  onSend: (content: string, attachments?: File[], linkedEntities?: LinkedEntity[]) => void;
  onAIInvoke?: () => void;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  replyingTo?: { id: string; preview: string } | null;
  onCancelReply?: () => void;
  aiEnabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  onAIInvoke,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  replyingTo,
  onCancelReply,
  aiEnabled = true,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [showFormatting, setShowFormatting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
    onTyping?.();
  }, [onTyping]);

  // Handle send
  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;
    
    onSend(trimmed, attachments.length > 0 ? attachments : undefined, linkedEntities.length > 0 ? linkedEntities : undefined);
    
    // Reset state
    setContent('');
    setAttachments([]);
    setLinkedEntities([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle key press
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Remove linked entity
  const removeLinkedEntity = (index: number) => {
    setLinkedEntities(prev => prev.filter((_, i) => i !== index));
  };

  // Insert formatting
  const insertFormatting = (format: 'bold' | 'italic' | 'code' | 'codeblock') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    
    let insertion = '';
    let cursorOffset = 0;
    
    switch (format) {
      case 'bold':
        insertion = `**${selected || 'bold text'}**`;
        cursorOffset = selected ? insertion.length : 2;
        break;
      case 'italic':
        insertion = `*${selected || 'italic text'}*`;
        cursorOffset = selected ? insertion.length : 1;
        break;
      case 'code':
        insertion = `\`${selected || 'code'}\``;
        cursorOffset = selected ? insertion.length : 1;
        break;
      case 'codeblock':
        insertion = `\`\`\`\n${selected || 'code'}\n\`\`\``;
        cursorOffset = selected ? insertion.length : 4;
        break;
    }
    
    const newContent = content.substring(0, start) + insertion + content.substring(end);
    setContent(newContent);
    
    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  // Get file preview
  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'task': return 'task';
      case 'contact': return 'contact';
      case 'deal': return 'deal';
      case 'document': return 'doc';
      case 'form': return 'form';
      default: return 'file';
    }
  };

  return (
    <div className="border-t-2 border-gray-200 bg-white safe-area-bottom">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
            <span className="text-purple-600 flex-shrink-0">Replying to:</span>
            <span className="text-gray-600 truncate">{replyingTo.preview}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-gray-100 flex flex-wrap gap-1.5 sm:gap-2">
          {attachments.map((file, index) => {
            const preview = getFilePreview(file);
            return (
              <div key={index} className="relative group">
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center p-1">
                    <FileText size={16} className="text-gray-400 sm:w-5 sm:h-5" />
                    <span className="text-[10px] sm:text-xs text-gray-500 truncate w-full text-center">
                      {file.name.split('.').pop()}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full text-[10px] sm:text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Linked entities preview */}
      {linkedEntities.length > 0 && (
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-gray-100 flex flex-wrap gap-1.5 sm:gap-2">
          {linkedEntities.map((entity, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded text-xs sm:text-sm group"
            >
              <span>{getEntityIcon(entity.entity_type)}</span>
              <span className="text-gray-700 truncate max-w-[100px] sm:max-w-none">{entity.entity_title || entity.entity_type}</span>
              <button
                onClick={() => removeLinkedEntity(index)}
                className="text-gray-400 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main composer */}
      <div className="p-2 sm:p-3">
        <div className="flex items-end gap-1 sm:gap-2">
          {/* Attachment button */}
          <div className="flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach file"
              disabled={disabled || isUploading}
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Text area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                handleInput();
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none border-2 border-gray-200 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 pr-8 sm:pr-10 text-sm sm:text-base focus:border-purple-400 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              style={{ maxHeight: '150px' }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
            {/* Formatting toggle - hidden on small mobile */}
            <button
              onClick={() => setShowFormatting(!showFormatting)}
              className={`hidden sm:flex p-2 rounded-lg transition-colors ${
                showFormatting 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Formatting"
            >
              <Type size={20} />
            </button>

            {/* AI invoke button */}
            {aiEnabled && onAIInvoke && (
              <button
                onClick={onAIInvoke}
                className="p-1.5 sm:p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Ask AI"
              >
                <Sparkles size={18} className="sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={disabled || (!content.trim() && attachments.length === 0)}
              className="p-1.5 sm:p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Send (Enter)"
            >
              <Send size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Formatting toolbar */}
        {showFormatting && (
          <div className="mt-2 flex items-center gap-1 p-1 bg-gray-50 rounded-lg">
            <button
              onClick={() => insertFormatting('bold')}
              className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded"
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              onClick={() => insertFormatting('italic')}
              className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded"
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => insertFormatting('code')}
              className="px-2 py-1 text-sm font-mono hover:bg-gray-200 rounded"
              title="Inline code"
            >
              {'</>'}
            </button>
            <button
              onClick={() => insertFormatting('codeblock')}
              className="px-2 py-1 text-sm font-mono hover:bg-gray-200 rounded"
              title="Code block"
            >
              {'```'}
            </button>
            <div className="flex-1" />
            <span className="text-xs text-gray-400">
              Shift+Enter for new line
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageComposer;
