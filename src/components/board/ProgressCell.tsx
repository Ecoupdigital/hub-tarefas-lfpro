import React, { useState } from 'react';

interface ProgressCellProps {
  value: number | undefined;
  onChange: (val: number) => void;
}

const ProgressCell: React.FC<ProgressCellProps> = ({ value = 0, onChange }) => {
  const [editing, setEditing] = useState(false);

  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 100 ? 'hsl(var(--accent))' : pct >= 50 ? 'hsl(var(--status-orange))' : 'hsl(var(--primary))';

  if (editing) {
    return (
      <div className="w-full h-full flex items-center px-2 gap-1">
        <input type="range" min={0} max={100} value={pct}
          onChange={e => onChange(Number(e.target.value))}
          onBlur={() => setEditing(false)}
          className="flex-1 h-1.5" autoFocus />
        <span className="font-density-tiny text-foreground font-medium w-8 text-right">{pct}%</span>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="w-full h-full flex items-center px-2 gap-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-density-tiny text-muted-foreground font-medium w-8 text-right">{pct}%</span>
    </button>
  );
};

export default ProgressCell;
