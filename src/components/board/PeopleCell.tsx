import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { User } from '@/types/board';

interface PeopleCellProps {
  value: string[] | undefined;
  onChange: (val: string[]) => void;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const colors = ['#579BFC', '#FF642E', '#00C875', '#A25DDC', '#FDAB3D', '#E2445C'];

// Normaliza qualquer formato de value para string[]
const normalizeIds = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
  if (typeof value === 'object' && Array.isArray(value.userIds)) return value.userIds;
  return [];
};

const PeopleCell: React.FC<PeopleCellProps> = ({ value, onChange }) => {
  const { users } = useApp();
  const [open, setOpen] = useState(false);

  const ids = normalizeIds(value);
  const selectedUsers = users.filter(u => ids.includes(u.id));

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-full flex items-center justify-center gap-[-4px] px-1"
      >
        {selectedUsers.length === 0 ? (
          <span className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <span className="text-muted-foreground/40 font-density-tiny">+</span>
          </span>
        ) : (
          <div className="flex -space-x-1.5">
            {selectedUsers.slice(0, 3).map((u, i) => (
              <div
                key={u.id}
                className="w-6 h-6 rounded-full flex items-center justify-center font-density-badge font-bold ring-2 ring-cell"
                style={{ backgroundColor: colors[i % colors.length], color: '#fff' }}
                title={u.name}
              >
                {getInitials(u.name)}
              </div>
            ))}
            {selectedUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-density-badge font-medium text-muted-foreground ring-2 ring-cell">
                +{selectedUsers.length - 3}
              </div>
            )}
          </div>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-1.5 min-w-[180px] animate-fade-in">
            {users.map((u, i) => {
              const isSelected = ids.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    const newVal = isSelected ? ids.filter(id => id !== u.id) : [...ids, u.id];
                    onChange(newVal);
                  }}
                  className={`flex items-center w-full px-2 py-1.5 rounded-md transition-colors gap-2 ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center font-density-badge font-bold flex-shrink-0"
                    style={{ backgroundColor: colors[i % colors.length], color: '#fff' }}
                  >
                    {getInitials(u.name)}
                  </div>
                  <span className="font-density-cell text-popover-foreground">{u.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PeopleCell;
