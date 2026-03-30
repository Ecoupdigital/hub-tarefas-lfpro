import React, { useState } from 'react';
import { Check, Palette } from 'lucide-react';

const PRESET_COLORS = [
  '#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC',
  '#FF642E', '#C4C4C4', '#037F4C', '#FF158A', '#5559DF',
  '#FF5AC4', '#CAB641', '#9D99B9', '#66CCFF', '#7F5347',
];

interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ value, onChange, size = 'md' }) => {
  const [showCustom, setShowCustom] = useState(false);
  const dotSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const checkSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`${dotSize} rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
              value === color ? 'border-foreground shadow-sm' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          >
            {value === color && <Check className={`${checkSize} text-white drop-shadow`} />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className={`${dotSize} rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-foreground transition-colors`}
        >
          <Palette className={`${checkSize} text-muted-foreground`} />
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-7 h-7 rounded border border-input cursor-pointer p-0"
          />
          <span className="font-density-tiny text-muted-foreground uppercase">{value}</span>
        </div>
      )}
    </div>
  );
};

export { ColorPalette, PRESET_COLORS };
export default ColorPalette;
