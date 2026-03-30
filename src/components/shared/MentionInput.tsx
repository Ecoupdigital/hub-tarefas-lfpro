import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProfiles } from '@/hooks/useSupabaseData';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

const TODOS_OPTION = { id: 'todos', name: 'todos' };

const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, placeholder, rows = 3, className }) => {
  const { data: profiles = [] } = useProfiles();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers = React.useMemo(() => {
    const search = mentionSearch.toLowerCase();
    const members: { id: string; name: string }[] = [TODOS_OPTION, ...profiles];
    if (!search) return members.slice(0, 8);
    return members.filter(m => m.name.toLowerCase().includes(search)).slice(0, 8);
  }, [profiles, mentionSearch]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Check if we're in a mention context
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only trigger if @ is at start or preceded by whitespace, and no space in the search
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
        setShowDropdown(true);
        setMentionSearch(textAfterAt);
        setMentionStart(lastAtIndex);
        setSelectedIndex(0);
        return;
      }
    }
    setShowDropdown(false);
  }, [onChange]);

  const insertMention = useCallback((member: { id: string; name: string }) => {
    const before = value.slice(0, mentionStart);
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const after = value.slice(cursorPos);
    const mentionToken = member.id === 'todos' ? '@todos' : `@[${member.id}]`;
    const newValue = before + mentionToken + ' ' + after;
    onChange(newValue);
    setShowDropdown(false);
    setMentionSearch('');

    // Restore focus and set cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + mentionToken.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, mentionStart, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredMembers.length > 0) {
      e.preventDefault();
      insertMention(filteredMembers[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }, [showDropdown, filteredMembers, selectedIndex, insertMention]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className || 'w-full bg-transparent font-density-cell text-foreground resize-none outline-none placeholder:text-muted-foreground/50'}
      />
      {showDropdown && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 bottom-full mb-1 w-56 bg-popover border border-border rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto"
        >
          {filteredMembers.map((member, idx) => (
            <button
              key={member.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(member); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 font-density-cell text-left transition-colors ${
                idx === selectedIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
              }`}
            >
              {member.id === 'todos' ? (
                <div className="w-5 h-5 rounded-full bg-accent/30 flex items-center justify-center text-accent font-density-badge font-bold">@</div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-badge font-bold">
                  {getInitials(member.name)}
                </div>
              )}
              <span className="truncate">{member.id === 'todos' ? '@todos (todos os membros)' : member.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Render update body with mention chips
interface RenderMentionTextProps {
  text: string;
  profiles: Profile[];
}

export const RenderMentionText: React.FC<RenderMentionTextProps> = ({ text, profiles }) => {
  const parts = React.useMemo(() => {
    const result: React.ReactNode[] = [];
    // Match @[uuid] and @todos patterns, and **bold** and *italic*
    const mentionRegex = /@\[([a-f0-9-]+)\]|@todos/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before match with markdown formatting
      if (match.index > lastIndex) {
        result.push(<FormatMarkdown key={`t-${lastIndex}`} text={text.slice(lastIndex, match.index)} />);
      }

      if (match[0] === '@todos') {
        result.push(
          <span key={`m-${match.index}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-accent/20 text-accent font-density-cell font-medium mx-0.5">
            @todos
          </span>
        );
      } else {
        const userId = match[1];
        const profile = profiles.find(p => p.id === userId);
        const displayName = profile?.name || 'Usuário';
        result.push(
          <span key={`m-${match.index}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary font-density-cell font-medium mx-0.5">
            @{displayName}
          </span>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      result.push(<FormatMarkdown key={`t-${lastIndex}`} text={text.slice(lastIndex)} />);
    }

    return result;
  }, [text, profiles]);

  return <span className="leading-relaxed">{parts}</span>;
};

// Simple markdown formatting for **bold** and *italic*
const FormatMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const parts = React.useMemo(() => {
    const result: React.ReactNode[] = [];
    // Match **bold** and *italic*
    const mdRegex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mdRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index));
      }
      if (match[1]) {
        result.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
      } else if (match[2]) {
        result.push(<em key={`i-${match.index}`}>{match[2]}</em>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result;
  }, [text]);

  return <>{parts}</>;
};

export default MentionInput;
