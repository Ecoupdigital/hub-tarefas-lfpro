import React, { useState, useRef, useEffect } from 'react';
import type { StatusLabel } from '@/types/board';

const ColumnHeader: React.FC<{
  label: StatusLabel | null;
  itemCount: number;
  wipLimit: number;
  exceeded: boolean;
  onSetWipLimit: (limit: number) => void;
  noValueLabel?: string;
}> = ({ label, itemCount, wipLimit, exceeded, onSetWipLimit, noValueLabel = 'Sem Status' }) => {
  const [editingWip, setEditingWip] = useState(false);
  const [wipInput, setWipInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWip && inputRef.current) inputRef.current.focus();
  }, [editingWip]);

  const handleWipSave = () => {
    const val = parseInt(wipInput, 10);
    onSetWipLimit(isNaN(val) || val < 0 ? 0 : val);
    setEditingWip(false);
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-t-lg w-full"
      style={{ backgroundColor: label?.color || 'hsl(var(--muted))' }}
    >
      <span className={`font-density-cell font-bold truncate flex-1 ${label?.color ? 'text-white' : 'text-foreground'}`}>
        {label?.name || noValueLabel} / {itemCount}
      </span>
      <span className="flex items-center gap-1 flex-shrink-0">
        {/* Counter */}
        {editingWip ? (
          <input
            ref={inputRef}
            value={wipInput}
            onChange={e => setWipInput(e.target.value)}
            onBlur={handleWipSave}
            onKeyDown={e => { if (e.key === 'Enter') handleWipSave(); if (e.key === 'Escape') setEditingWip(false); }}
            className={`w-10 font-density-tiny rounded px-1 py-0.5 outline-none text-center ${label?.color ? 'bg-white/30 text-white' : 'bg-muted text-foreground'}`}
            placeholder="WIP"
          />
        ) : (
          <button
            onClick={() => { setWipInput(wipLimit > 0 ? String(wipLimit) : ''); setEditingWip(true); }}
            title="Definir limite WIP (clique para editar)"
            className={`font-density-tiny font-medium rounded-full px-1.5 py-0.5 transition-colors ${
              exceeded
                ? 'bg-destructive text-white animate-pulse'
                : label?.color
                  ? 'bg-white/20 text-white/80 hover:bg-white/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {wipLimit > 0 ? `${itemCount}/${wipLimit}` : itemCount}
          </button>
        )}
      </span>
    </div>
  );
};

export default ColumnHeader;
