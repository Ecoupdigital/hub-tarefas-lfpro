import React, { useState } from 'react';
import { Paintbrush } from 'lucide-react';

interface ColorCellProps {
  value: string | undefined;
  onChange: (val: string) => void;
}

const PRESET_COLORS = [
  '#E2445C', '#FF642E', '#FDAB3D', '#FFD549', '#00C875',
  '#037F4C', '#579BFC', '#0086C0', '#A25DDC', '#784BD1',
  '#FF158A', '#FF5AC4', '#CAB641', '#9AADBD', '#C4C4C4',
  '#333333', '#808080', '#FFFFFF', '#7F5347', '#225091',
];

const ColorCell: React.FC<ColorCellProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [customHex, setCustomHex] = useState(value || '#579BFC');

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-full flex items-center justify-center"
      >
        {value ? (
          <span
            className="w-5 h-5 rounded-full border border-border/50 transition-transform hover:scale-110"
            style={{ backgroundColor: value }}
          />
        ) : (
          <Paintbrush className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[200px] animate-fade-in">
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onChange(color);
                    setOpen(false);
                  }}
                  className={`w-7 h-7 rounded-md border transition-transform hover:scale-110 ${
                    value === color ? 'ring-2 ring-primary ring-offset-1' : 'border-border/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 pt-1.5 border-t border-border">
              <span
                className="w-6 h-6 rounded border border-border/50 flex-shrink-0"
                style={{ backgroundColor: customHex }}
              />
              <input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && /^#[0-9A-Fa-f]{3,6}$/.test(customHex)) {
                    onChange(customHex);
                    setOpen(false);
                  }
                }}
                placeholder="#HEX"
                className="flex-1 bg-muted rounded px-2 py-1 font-density-cell text-foreground outline-none"
                maxLength={7}
              />
              <button
                onClick={() => {
                  if (/^#[0-9A-Fa-f]{3,6}$/.test(customHex)) {
                    onChange(customHex);
                    setOpen(false);
                  }
                }}
                className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                OK
              </button>
            </div>
            {value && (
              <button
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="w-full mt-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors text-center"
              >
                Remover cor
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ColorCell;
