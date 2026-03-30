import React, { useState } from 'react';
import { Phone } from 'lucide-react';

interface PhoneCellProps {
  value: string | undefined;
  onChange: (val: string) => void;
}

const formatPhone = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const PhoneCell: React.FC<PhoneCellProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');

  if (editing) {
    return (
      <input type="tel" value={temp} onChange={e => setTemp(e.target.value)} autoFocus
        onBlur={() => { onChange(temp.trim()); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(temp.trim()); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        className="w-full h-full bg-transparent font-density-cell text-foreground text-center outline-none border-b-2 border-primary px-1" />
    );
  }

  const digits = (value || '').replace(/\D/g, '');
  const whatsappLink = digits.length >= 10 ? `https://wa.me/55${digits}` : null;

  return (
    <button onClick={() => { setTemp(value || ''); setEditing(true); }}
      className="w-full h-full flex items-center justify-center gap-1 font-density-cell text-foreground px-1 truncate">
      {value ? (
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
          {whatsappLink ? (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:underline">
              {formatPhone(value)}
            </a>
          ) : formatPhone(value)}
        </span>
      ) : <span className="text-muted-foreground/40">—</span>}
    </button>
  );
};

export default PhoneCell;
