import React, { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';

interface TagsCellProps {
  value: string[] | undefined;
  onChange: (val: string[]) => void;
}

const TAG_COLORS = ['#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#FF642E', '#037F4C', '#FF158A', '#5559DF', '#C4C4C4'];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const TagsCell: React.FC<TagsCellProps> = ({ value = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 180 });

  const addTag = () => {
    const t = newTag.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setNewTag('');
  };

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));

  return (
    <div className="relative w-full h-full">
      <button ref={triggerRef} onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            if (triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect();
              setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left + rect.width / 2,
                width: Math.max(180, rect.width),
              });
            }
            setOpen(true);
          }
        }}
        className="w-full h-full flex items-center justify-center gap-0.5 px-1 overflow-hidden">
        {value.length > 0 ? value.slice(0, 2).map(tag => (
          <span key={tag} className="px-1.5 py-0 rounded-full font-density-badge font-medium text-white truncate max-w-[60px]"
            style={{ backgroundColor: getTagColor(tag) }}>
            {tag}
          </span>
        )) : <span className="text-muted-foreground/40 font-density-cell">—</span>}
        {value.length > 2 && <span className="font-density-badge text-muted-foreground">+{value.length - 2}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl p-2 animate-fade-in"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              transform: 'translateX(-50%)',
              minWidth: dropdownPos.width,
            }}
          >
            <div className="flex flex-wrap gap-1 mb-2">
              {value.map(tag => (
                <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-density-tiny font-medium text-white"
                  style={{ backgroundColor: getTagColor(tag) }}>
                  {tag}
                  <button onClick={() => removeTag(tag)}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="flex-1 bg-muted rounded px-2 py-1 font-density-cell text-foreground outline-none" />
              <button onClick={addTag} className="p-1 rounded bg-primary text-primary-foreground">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TagsCell;
