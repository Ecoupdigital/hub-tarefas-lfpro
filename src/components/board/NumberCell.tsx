import React, { useState } from 'react';

interface NumberCellProps {
  value: number | undefined;
  onChange: (val: number) => void;
}

const NumberCell: React.FC<NumberCellProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(String(value ?? ''));

  const formatNumber = (n: number) => {
    const pref = localStorage.getItem('lfpro-number-format') || 'br';
    const locale = pref === 'us' ? 'en-US' : 'pt-BR';
    return new Intl.NumberFormat(locale).format(n);
  };

  if (editing) {
    return (
      <input
        type="number"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        autoFocus
        onBlur={() => {
          const n = parseFloat(temp);
          if (!isNaN(n)) onChange(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const n = parseFloat(temp);
            if (!isNaN(n)) onChange(n);
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full h-full bg-transparent font-density-cell text-foreground text-center outline-none border-b-2 border-primary px-1"
      />
    );
  }

  return (
    <button
      onClick={() => { setTemp(String(value ?? '')); setEditing(true); }}
      className="w-full h-full flex items-center justify-center font-density-cell text-foreground"
    >
      {value != null ? formatNumber(value) : <span className="text-muted-foreground/40">—</span>}
    </button>
  );
};

export default NumberCell;
