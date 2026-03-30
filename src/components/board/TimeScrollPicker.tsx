import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TimeScrollPickerProps {
  value: string; // "HH:mm" or ""
  onChange: (time: string) => void;
  placeholder?: string; // e.g. "Inicio", "Fim"
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const ITEM_HEIGHT = 32; // h-8 = 32px

function ScrollColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to the selected item on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'instant' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    isScrollingRef.current = true;

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const el = containerRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      // Snap to position
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
      const newVal = items[clamped];
      if (newVal !== selected) {
        onSelect(newVal);
      }
    }, 80);
  }, [items, selected, onSelect]);

  const handleItemClick = useCallback((val: string) => {
    const idx = items.indexOf(val);
    if (idx < 0) return;
    containerRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
    onSelect(val);
  }, [items, onSelect]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-24 overflow-y-auto scrollbar-none snap-y snap-mandatory overscroll-contain touch-pan-y"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {/* Top padding to allow first item to be centered */}
      <div style={{ height: ITEM_HEIGHT }} />
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <div
            key={item}
            onClick={() => handleItemClick(item)}
            className={cn(
              'h-8 flex items-center justify-center cursor-pointer transition-colors text-sm font-medium min-w-12',
              'snap-center',
              isSelected
                ? 'bg-primary/10 text-primary rounded'
                : 'text-muted-foreground/60 hover:text-muted-foreground'
            )}
            style={{ scrollSnapAlign: 'center' }}
          >
            {item}
          </div>
        );
      })}
      {/* Bottom padding */}
      <div style={{ height: ITEM_HEIGHT }} />
    </div>
  );
}

const TimeScrollPicker: React.FC<TimeScrollPickerProps> = ({ value, onChange, placeholder }) => {
  const [hour, minute] = value ? value.split(':') : ['', ''];
  const selectedHour = hour || '00';
  const selectedMinute = minute || '00';

  const handleHourChange = (h: string) => {
    onChange(`${h}:${selectedMinute}`);
  };

  const handleMinuteChange = (m: string) => {
    onChange(`${selectedHour}:${m}`);
  };

  if (!value && placeholder) {
    return (
      <button
        onClick={() => onChange('08:00')}
        className="w-full h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground/60 hover:text-muted-foreground hover:border-muted-foreground/40 transition-colors"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden bg-background">
      <ScrollColumn items={HOURS} selected={selectedHour} onSelect={handleHourChange} />
      <span className="text-muted-foreground font-medium px-0.5 select-none">:</span>
      <ScrollColumn items={MINUTES} selected={selectedMinute} onSelect={handleMinuteChange} />
    </div>
  );
};

export default TimeScrollPicker;
