import React, { useState } from 'react';

interface TextCellProps {
  value: any;
  onChange: (v: string) => void;
}

const extractText = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'raw' in v) return String(v.raw ?? '');
  return String(v);
};

const TextCell: React.FC<TextCellProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const displayValue = extractText(value);
  const [temp, setTemp] = useState(displayValue);

  if (editing) {
    return (
      <input
        value={temp}
        onChange={e => setTemp(e.target.value)}
        autoFocus
        onBlur={() => { onChange(temp); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onChange(temp); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full h-full bg-transparent font-density-cell text-foreground text-center outline-none border-b-2 border-primary px-1"
      />
    );
  }

  return (
    <button
      onClick={() => { setTemp(displayValue); setEditing(true); }}
      className="w-full h-full flex items-center justify-center font-density-cell text-foreground truncate px-2"
    >
      {displayValue || <span className="text-muted-foreground/40">&mdash;</span>}
    </button>
  );
};

export default TextCell;
