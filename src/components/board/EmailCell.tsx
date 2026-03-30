import React, { useState } from 'react';
import { Mail } from 'lucide-react';

interface EmailCellProps {
  value: string | undefined;
  onChange: (val: string) => void;
}

const EmailCell: React.FC<EmailCellProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');

  if (editing) {
    return (
      <input type="email" value={temp} onChange={e => setTemp(e.target.value)} autoFocus
        onBlur={() => { onChange(temp.trim()); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(temp.trim()); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        className="w-full h-full bg-transparent font-density-cell text-foreground text-center outline-none border-b-2 border-primary px-1" />
    );
  }

  return (
    <button onClick={() => { setTemp(value || ''); setEditing(true); }}
      className="w-full h-full flex items-center justify-center gap-1 font-density-cell text-foreground px-1 truncate">
      {value ? (
        <a href={`mailto:${value}`} onClick={e => e.stopPropagation()} className="text-primary hover:underline truncate flex items-center gap-1">
          <Mail className="w-3 h-3 flex-shrink-0" /> {value}
        </a>
      ) : <span className="text-muted-foreground/40">—</span>}
    </button>
  );
};

export default EmailCell;
