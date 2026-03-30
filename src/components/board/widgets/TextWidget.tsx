import React, { useState, useRef, useCallback } from 'react';
import type { WidgetConfig } from '@/hooks/useDashboardWidgets';

interface TextWidgetProps {
  config: WidgetConfig;
  onConfigChange: (config: WidgetConfig) => void;
}

function renderSimpleMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    let processed: React.ReactNode[] = [line];
    processed = processed.flatMap((part, pi) => {
      if (typeof part !== 'string') return [part];
      const segments: React.ReactNode[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = boldRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          segments.push(part.slice(lastIndex, match.index));
        }
        segments.push(<strong key={`b-${i}-${pi}-${match.index}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < part.length) segments.push(part.slice(lastIndex));
      return segments.length > 0 ? segments : [part];
    });

    // Italic: *text*
    processed = processed.flatMap((part, pi) => {
      if (typeof part !== 'string') return [part];
      const segments: React.ReactNode[] = [];
      const italicRegex = /\*(.+?)\*/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = italicRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          segments.push(part.slice(lastIndex, match.index));
        }
        segments.push(<em key={`i-${i}-${pi}-${match.index}`}>{match[1]}</em>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < part.length) segments.push(part.slice(lastIndex));
      return segments.length > 0 ? segments : [part];
    });

    return (
      <React.Fragment key={i}>
        {processed}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

const TextWidget: React.FC<TextWidgetProps> = ({ config, onConfigChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(config.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = config.text || '';

  const handleStartEdit = useCallback(() => {
    setDraft(text);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [text]);

  const handleSave = useCallback(() => {
    setEditing(false);
    if (draft !== text) {
      onConfigChange({ ...config, text: draft });
    }
  }, [draft, text, config, onConfigChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false);
      setDraft(text);
    }
  }, [text]);

  if (editing) {
    return (
      <div className="h-full p-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Escreva aqui... Use **negrito** e *italico*"
          className="w-full h-full min-h-[80px] bg-transparent text-sm text-foreground resize-none outline-none placeholder:text-muted-foreground/50"
        />
      </div>
    );
  }

  return (
    <div
      className="h-full p-3 cursor-text text-sm text-foreground/80 overflow-auto hover:bg-muted/30 rounded transition-colors"
      onClick={handleStartEdit}
    >
      {text ? (
        <div className="whitespace-pre-wrap">{renderSimpleMarkdown(text)}</div>
      ) : (
        <p className="text-muted-foreground/50 italic">Clique para editar...</p>
      )}
    </div>
  );
};

export default TextWidget;
