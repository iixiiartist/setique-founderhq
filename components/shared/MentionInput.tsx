import React, { useState, useRef, useEffect } from 'react';

interface WorkspaceMember {
  id: string;
  name: string;
  avatar?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  workspaceMembers: WorkspaceMember[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  workspaceMembers,
  placeholder = 'Add a comment... (use @ to mention)',
  className = '',
  disabled = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<WorkspaceMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect @ mentions and show suggestions
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = value;
    const pos = cursorPosition;

    // Find if we're in the middle of typing a mention
    const beforeCursor = text.substring(0, pos);
    const match = beforeCursor.match(/@(\w*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);

      // Filter members by name
      const filtered = workspaceMembers.filter((member) =>
        member.name.toLowerCase().includes(query)
      );

      setFilteredMembers(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setFilteredMembers([]);
    }
  }, [value, cursorPosition, workspaceMembers]);

  const insertMention = (member: WorkspaceMember) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = value;
    const pos = cursorPosition;

    // Find the start of the mention (@ symbol)
    const beforeCursor = text.substring(0, pos);
    const mentionStart = beforeCursor.lastIndexOf('@');

    if (mentionStart === -1) return;

    // Replace @query with @username (remove spaces for clean mentions)
    const username = member.name.replace(/\s+/g, '');
    const newText =
      text.substring(0, mentionStart) +
      `@${username} ` +
      text.substring(pos);

    onChange(newText);
    setShowSuggestions(false);

    // Move cursor after the inserted mention
    setTimeout(() => {
      const newPos = mentionStart + username.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newPos, newPos);
      setCursorPosition(newPos);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredMembers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && filteredMembers.length > 0) {
      e.preventDefault();
      insertMention(filteredMembers[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleClick = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onKeyUp={handleClick}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        style={{ minHeight: '60px', maxHeight: '200px' }}
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.id}
              type="button"
              onClick={() => insertMention(member)}
              className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-semibold">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{member.name}</div>
                <div className="text-xs text-gray-500">
                  @{member.name.replace(/\s+/g, '')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
