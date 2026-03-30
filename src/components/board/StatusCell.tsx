import React, { useState, useMemo, useCallback, useRef } from 'react';
import { StatusLabel } from '@/types/board';
import { Settings2, X, Search } from 'lucide-react';

interface StatusCellProps {
  value: string | undefined;
  labels: Record<string, StatusLabel>;
  onChange: (val: string) => void;
  onEditLabels?: () => void;
}

const StatusCell: React.FC<StatusCellProps> = ({ value, labels, onChange, onEditLabels }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = value !== undefined ? labels[value] : undefined;
  const entries = Object.entries(labels);
  const showSearch = entries.length > 5;

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    return entries.filter(([, l]) => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [entries, search]);

  // All selectable options: filtered labels + clear option
  const allOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string }> = filtered.map(([key, l]) => ({ key, label: l.name }));
    opts.push({ key: '', label: 'Nenhum' });
    return opts;
  }, [filtered]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setSearch('');
    setHighlightIndex(-1);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => {
          const next = prev < allOptions.length - 1 ? prev + 1 : 0;
          optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => {
          const next = prev > 0 ? prev - 1 : allOptions.length - 1;
          optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < allOptions.length) {
          onChange(allOptions[highlightIndex].key);
          handleClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [open, highlightIndex, allOptions, onChange, handleOpen, handleClose]);

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => { open ? handleClose() : handleOpen(); }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full h-full flex items-center justify-center font-density-cell font-medium transition-[filter] duration-[70ms] hover:brightness-[0.92]"
        style={{
          backgroundColor: current?.color ?? '#C4C4C4',
          color: '#fff',
        }}
      >
        {current?.name ?? ''}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-1.5 min-w-[180px] animate-fade-in"
            role="listbox"
            onKeyDown={handleKeyDown}
          >
            {showSearch && (
              <div className="flex items-center gap-1 px-2 py-1 mb-1 border-b border-border">
                <Search className="w-3 h-3 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setHighlightIndex(-1); }}
                  placeholder="Buscar..."
                  autoFocus
                  className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}
            {filtered.map(([key, label], index) => (
              <button
                key={key}
                ref={el => { optionRefs.current[index] = el; }}
                role="option"
                aria-selected={value === key}
                onClick={() => { onChange(key); handleClose(); }}
                className={`flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors gap-2 ${highlightIndex === index ? 'bg-muted ring-1 ring-primary/30' : ''}`}
              >
                <span className="w-4 h-4 rounded-sm flex-shrink-0 transition-colors duration-200" style={{ backgroundColor: label.color }} />
                <span className="font-density-cell text-popover-foreground">{label.name}</span>
              </button>
            ))}
            {/* Clear option */}
            <button
              ref={el => { optionRefs.current[filtered.length] = el; }}
              role="option"
              aria-selected={!value}
              onClick={() => { onChange(''); handleClose(); }}
              className={`flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors gap-2 mt-0.5 border-t border-border pt-1.5 ${highlightIndex === filtered.length ? 'bg-muted ring-1 ring-primary/30' : ''}`}
            >
              <X className="w-4 h-4 text-muted-foreground/40" />
              <span className="font-density-cell text-muted-foreground">Nenhum</span>
            </button>
            {/* Edit labels link */}
            {onEditLabels && (
              <button
                onClick={() => { handleClose(); onEditLabels(); }}
                className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors gap-2 text-primary"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="font-density-tiny font-medium">Editar labels</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StatusCell;
