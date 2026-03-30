import React, { useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';

const OPTION_COLORS = ['#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC', '#FF642E', '#C4C4C4', '#037F4C', '#FF158A', '#5559DF'];

interface DropdownCellProps {
  value: string | undefined;
  options: string[];
  onChange: (val: string) => void;
  onAddOption?: (option: string) => void;
}

const DropdownCell: React.FC<DropdownCellProps> = ({ value, options = [], onChange, onAddOption }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newOpt, setNewOpt] = useState('');
  const showSearch = options.length > 5;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleAdd = () => {
    const trimmed = newOpt.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onAddOption?.(trimmed);
    onChange(trimmed);
    setNewOpt('');
    setAdding(false);
    setOpen(false);
  };

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => { setOpen(!open); setSearch(''); setAdding(false); }}
        className="w-full h-full flex items-center justify-center font-density-cell text-foreground px-2"
      >
        {value ? (
          <span className="inline-flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: OPTION_COLORS[options.indexOf(value) % OPTION_COLORS.length] }}
            />
            {value}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-1.5 min-w-[160px] animate-fade-in">
            {showSearch && (
              <div className="flex items-center gap-1 px-2 py-1 mb-1 border-b border-border">
                <Search className="w-3 h-3 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  autoFocus
                  className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            )}
            {filtered.map((opt, idx) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`flex items-center w-full px-2 py-1.5 rounded-md font-density-cell transition-colors gap-2 ${
                  value === opt ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-popover-foreground'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: OPTION_COLORS[options.indexOf(opt) % OPTION_COLORS.length] }}
                />
                {opt}
              </button>
            ))}
            {/* Add option inline */}
            {onAddOption && (
              adding ? (
                <div className="flex items-center gap-1 px-1.5 py-1 mt-0.5 border-t border-border pt-1.5">
                  <input
                    value={newOpt}
                    onChange={e => setNewOpt(e.target.value)}
                    placeholder="Nova opção"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewOpt(''); } }}
                    className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                  <button onClick={handleAdd} className="text-primary">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors gap-1.5 text-primary font-density-tiny mt-0.5 border-t border-border pt-1.5"
                >
                  <Plus className="w-3 h-3" /> Nova opção
                </button>
              )
            )}
            {/* Clear */}
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors font-density-cell text-muted-foreground mt-0.5 border-t border-border pt-1.5 gap-1.5"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DropdownCell;
