import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface LinkCellProps {
  value: any;
  onChange: (val: any) => void;
}

// Normaliza: aceita string ou {url, text} (formato migrado do Monday)
const extractLink = (value: any): { url: string; text: string } => {
  if (!value) return { url: '', text: '' };
  if (typeof value === 'string') return { url: value, text: value };
  if (typeof value === 'object' && value.url) {
    return { url: value.url, text: value.text || value.url };
  }
  return { url: '', text: '' };
};

const LinkCell: React.FC<LinkCellProps> = ({ value, onChange }) => {
  const { url, text } = extractLink(value);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="url"
        defaultValue={url}
        autoFocus
        placeholder="https://..."
        onBlur={(e) => {
          const newUrl = e.target.value.trim();
          if (newUrl && !newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
            toast.error('URL deve começar com http:// ou https://');
            return;
          }
          onChange(newUrl ? { url: newUrl, text: newUrl } : null);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const newUrl = (e.target as HTMLInputElement).value.trim();
            if (newUrl && !newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
              toast.error('URL deve começar com http:// ou https://');
              return;
            }
            onChange(newUrl ? { url: newUrl, text: newUrl } : null);
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full h-full px-2 bg-transparent font-density-cell text-foreground outline-none border-2 border-primary rounded"
      />
    );
  }

  if (!url) {
    return (
      <button onClick={() => setEditing(true)} className="w-full h-full flex items-center justify-center">
        <span className="text-muted-foreground/40 font-density-cell">—</span>
      </button>
    );
  }

  const displayText = text && text !== url
    ? text
    : url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30);

  return (
    <div className="w-full h-full flex items-center justify-center gap-1 px-1 group/link">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-density-cell hover:underline truncate flex items-center gap-0.5 max-w-[calc(100%-20px)]"
        onClick={(e) => e.stopPropagation()}
        title={url}
      >
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{displayText}</span>
      </a>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover/link:opacity-100 text-muted-foreground/40 hover:text-foreground font-density-tiny flex-shrink-0 transition-opacity"
      >
        ✎
      </button>
    </div>
  );
};

export default LinkCell;
