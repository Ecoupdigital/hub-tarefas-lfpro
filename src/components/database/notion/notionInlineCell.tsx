import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Column, ColumnValue } from '@/types/board';

interface Profile {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
}

// ====== Primitivos visuais (reusaveis em NotionTable/Kanban/Calendar/List) ======

/** Status pill com paleta cinza+accent (Notion). */
export const StatusPill: React.FC<{ label?: { name: string; color: string } }> = ({ label }) => {
  if (!label) return <span className="notion-text-tertiary text-xs">Vazio</span>;
  const color = label.color || 'gray';
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
      style={{
        backgroundColor: `var(--notion-status-${color}-bg, var(--notion-status-gray-bg))`,
        color: `var(--notion-status-${color}, var(--notion-status-gray))`,
      }}
    >
      {label.name}
    </span>
  );
};

/** Avatar circular cinza neutro com initials ou imagem. */
export const PersonAvatar: React.FC<{ profile?: Profile }> = ({ profile }) => {
  if (!profile) return null;
  const initials = (profile.name || profile.email || '?').slice(0, 2).toUpperCase();
  return (
    <span
      title={profile.name}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium overflow-hidden"
      style={{
        backgroundColor: 'var(--notion-panel)',
        color: 'var(--notion-text-secondary)',
        border: '1px solid var(--notion-border)',
      }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
};

// ====== Editor polimorfico ======

interface NotionInlineCellProps {
  column: Column;
  value: ColumnValue | undefined;
  profiles: Profile[];
  /** Callback de edicao. Recebe valor + text representation (para search). */
  onChange: (value: unknown, text?: string) => void;
}

/**
 * Celula editavel inline (Notion-style, sem popover).
 *
 * Despacho por column.type. Suporta 8 tipos do MVP database.
 * Salva onBlur para inputs livres (text/long_text/number);
 * salva no onChange direto para selects e checkbox/date.
 * People e read-only no MVP (edicao via ItemDetailPanel).
 */
export const NotionInlineCell: React.FC<NotionInlineCellProps> = ({ column, value, profiles, onChange }) => {
  const raw = value?.value;

  switch (column.type) {
    case 'text':
      return <TextInlineEditor value={raw as string | undefined} onChange={(v) => onChange(v, v)} />;
    case 'long_text':
      return <LongTextInlineEditor value={raw as string | undefined} onChange={(v) => onChange(v, v)} />;
    case 'number':
      return <NumberInlineEditor value={raw as number | undefined} onChange={(v) => onChange(v, String(v ?? ''))} />;
    case 'checkbox':
      return <CheckboxInline value={!!raw} onChange={(v) => onChange(v, v ? 'true' : 'false')} />;
    case 'date':
      return <DateInline value={raw as string | undefined} onChange={(v) => onChange(v, v ?? '')} />;
    case 'status':
      return (
        <StatusInline
          value={raw as string | undefined}
          labels={(column.settings?.labels ?? {}) as Record<string, { name: string; color: string }>}
          onChange={(v) => onChange(v, v ?? '')}
        />
      );
    case 'dropdown':
      return (
        <DropdownInline
          value={raw as string | undefined}
          options={column.settings?.options ?? []}
          onChange={(v) => onChange(v, v ?? '')}
        />
      );
    case 'people':
      return <PeopleReadOnly value={raw as string[] | undefined} profiles={profiles} />;
    default:
      return <span className="notion-text-tertiary text-xs">—</span>;
  }
};

// ====== Sub-editores ======

const inputBaseClass =
  'w-full bg-transparent border-none outline-none text-sm py-1 px-1 rounded notion-hover focus:ring-1 focus:ring-[var(--notion-blue)]';

const TextInlineEditor: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== (value ?? '')) onChange(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder="Vazio"
      className={inputBaseClass}
      style={{ color: 'var(--notion-text-primary)' }}
    />
  );
};

const LongTextInlineEditor: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);
  return (
    <textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== (value ?? '')) onChange(local); }}
      placeholder="Vazio"
      rows={1}
      className={cn(inputBaseClass, 'resize-none')}
      style={{ color: 'var(--notion-text-primary)' }}
    />
  );
};

const NumberInlineEditor: React.FC<{ value?: number; onChange: (v: number | null) => void }> = ({ value, onChange }) => {
  const [local, setLocal] = useState<string>(value != null ? String(value) : '');
  useEffect(() => setLocal(value != null ? String(value) : ''), [value]);
  return (
    <input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const trimmed = local.trim();
        const next = trimmed === '' ? null : Number(trimmed);
        if (next !== (value ?? null) && !(typeof next === 'number' && Number.isNaN(next))) onChange(next);
      }}
      placeholder="Vazio"
      className={cn(inputBaseClass, 'text-right')}
      style={{ color: 'var(--notion-text-primary)' }}
    />
  );
};

const CheckboxInline: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className="flex items-center justify-center w-5 h-5 rounded border notion-hover"
    style={{
      borderColor: 'var(--notion-border)',
      backgroundColor: value ? 'var(--notion-blue)' : 'transparent',
    }}
    aria-pressed={value}
    aria-label={value ? 'Desmarcar' : 'Marcar'}
  >
    {value && <Check className="w-3.5 h-3.5 text-white" />}
  </button>
);

const DateInline: React.FC<{ value?: string; onChange: (v: string | null) => void }> = ({ value, onChange }) => {
  const displayValue = typeof value === 'string' ? value.slice(0, 10) : '';
  return (
    <input
      type="date"
      value={displayValue}
      onChange={(e) => onChange(e.target.value || null)}
      className={inputBaseClass}
      style={{ color: 'var(--notion-text-primary)' }}
    />
  );
};

const StatusInline: React.FC<{
  value?: string;
  labels: Record<string, { name: string; color: string }>;
  onChange: (v: string | null) => void;
}> = ({ value, labels, onChange }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value || null)}
    className={cn(inputBaseClass, 'cursor-pointer')}
    style={{ color: 'var(--notion-text-primary)' }}
  >
    <option value="">Vazio</option>
    {Object.keys(labels).map((k) => (
      <option key={k} value={k}>{labels[k]?.name ?? k}</option>
    ))}
  </select>
);

const DropdownInline: React.FC<{
  value?: string;
  options: string[];
  onChange: (v: string | null) => void;
}> = ({ value, options, onChange }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value || null)}
    className={cn(inputBaseClass, 'cursor-pointer')}
    style={{ color: 'var(--notion-text-primary)' }}
  >
    <option value="">Vazio</option>
    {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
  </select>
);

const PeopleReadOnly: React.FC<{ value?: string[]; profiles: Profile[] }> = ({ value, profiles }) => {
  const ids = Array.isArray(value) ? value : [];
  if (ids.length === 0) return <span className="notion-text-tertiary text-xs">—</span>;
  const map = new Map(profiles.map((p) => [p.id, p]));
  return (
    <div className="flex items-center gap-0.5">
      {ids.slice(0, 3).map((id) => <PersonAvatar key={id} profile={map.get(id)} />)}
      {ids.length > 3 && <span className="text-[10px] notion-text-secondary ml-1">+{ids.length - 3}</span>}
    </div>
  );
};
