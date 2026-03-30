import React from 'react';
import { Check, Star, Clock, Play, Paperclip } from 'lucide-react';

interface WorkExtraCellProps {
  value: any;
  type: string;
  settings?: any;
}

/** Lightweight read-only cell renderer for extra columns in MyWork/TeamWork */
const WorkExtraCell: React.FC<WorkExtraCellProps> = ({ value, type, settings }) => {
  if (value == null || value === '' || value === 'null') {
    return <span className="text-muted-foreground/40">--</span>;
  }

  switch (type) {
    case 'status': {
      // Formato: key string (ex: "1") ou {label, color}
      if (typeof value === 'object' && value?.label) {
        return (
          <span className="inline-flex items-center justify-center h-6 rounded text-[11px] font-medium text-white truncate px-2"
            style={{ backgroundColor: value.color || '#C4C4C4' }}>
            {value.label}
          </span>
        );
      }
      // Key lookup via settings.labels
      const label = settings?.labels?.[String(value)];
      if (label) {
        return (
          <span className="inline-flex items-center justify-center h-6 rounded text-[11px] font-medium text-white truncate px-2"
            style={{ backgroundColor: label.color || '#C4C4C4' }}>
            {label.name || String(value)}
          </span>
        );
      }
      return <span className="truncate">{String(value)}</span>;
    }

    case 'people': {
      // Formato: ["uuid1"] ou {userIds: ["uuid1"]}
      const ids: string[] = Array.isArray(value) ? value
        : (typeof value === 'object' && Array.isArray(value?.userIds)) ? value.userIds
        : [];
      if (ids.length === 0) return <span className="text-muted-foreground/40">--</span>;
      return (
        <span className="flex items-center gap-0.5">
          {ids.slice(0, 3).map((id: string) => (
            <span key={id} className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center flex-shrink-0">
              {String(id).charAt(0).toUpperCase()}
            </span>
          ))}
          {ids.length > 3 && <span className="text-[10px] text-muted-foreground">+{ids.length - 3}</span>}
        </span>
      );
    }

    case 'date': {
      // Formato: string "2026-03-29" ou {date: "2026-03-29", startTime: "14:00"}
      let dateStr = '';
      if (typeof value === 'string') dateStr = value.substring(0, 10);
      else if (typeof value === 'object' && value?.date) dateStr = String(value.date).substring(0, 10);
      if (!dateStr) return <span className="text-muted-foreground/40">--</span>;
      return <span className="truncate">{dateStr}</span>;
    }

    case 'text':
    case 'long_text':
    case 'email':
    case 'phone':
      return <span className="truncate">{String(value)}</span>;

    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      return <span>{isNaN(num) ? '--' : num.toLocaleString('pt-BR')}</span>;
    }

    case 'checkbox':
      return value === true || value === 'true' || value === 1
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <span className="text-muted-foreground/40">--</span>;

    case 'rating': {
      const stars = typeof value === 'number' ? value : Number(value);
      if (isNaN(stars) || stars === 0) return <span className="text-muted-foreground/40">--</span>;
      return (
        <span className="flex items-center gap-0.5">
          {Array.from({ length: Math.min(stars, 5) }, (_, i) => (
            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          ))}
        </span>
      );
    }

    case 'progress': {
      const pct = typeof value === 'number' ? value : Number(value);
      if (isNaN(pct)) return <span className="text-muted-foreground/40">--</span>;
      return (
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{pct}%</span>
        </div>
      );
    }

    case 'dropdown': {
      // Formato migrado: {values: ["Opcao A"]} ou string simples
      const label = typeof value === 'object' && value !== null && Array.isArray(value.values)
        ? value.values.join(', ')
        : String(value);
      return <span className="truncate">{label}</span>;
    }

    case 'tags': {
      const tags: string[] = Array.isArray(value)
        ? value.map(String)
        : typeof value === 'string' ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (tags.length === 0) return <span className="text-muted-foreground/40">--</span>;
      return (
        <span className="flex items-center gap-0.5 overflow-hidden">
          {tags.slice(0, 2).map(t => (
            <span key={t} className="bg-muted px-1.5 py-0.5 rounded text-[10px] truncate">{t}</span>
          ))}
          {tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>}
        </span>
      );
    }

    case 'link': {
      // Formato: string URL ou {url, text}
      const url = typeof value === 'object' && value?.url ? value.url : String(value);
      const text = typeof value === 'object' && value?.text ? value.text : '';
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="text-primary hover:underline truncate">{text || url}</a>
      );
    }

    case 'color':
      return (
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded border border-border" style={{ backgroundColor: String(value) }} />
        </span>
      );

    case 'time_tracking': {
      // Formato: {sessions, totalSeconds, runningFrom} ou number
      const totalSec = typeof value === 'object' && value !== null
        ? (typeof value.totalSeconds === 'number' ? value.totalSeconds : 0)
        : (typeof value === 'number' ? value : 0);
      const isRunning = typeof value === 'object' && value !== null && !!value.runningFrom;
      if (totalSec === 0 && !isRunning) return <span className="text-muted-foreground/40">--</span>;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const display = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
      return (
        <span className="flex items-center gap-1">
          {isRunning ? <Play className="w-3 h-3 text-green-500 fill-green-500" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
          <span className={isRunning ? 'text-green-600 font-medium' : ''}>{display}</span>
        </span>
      );
    }

    case 'timeline': {
      // Formato: {start, end} ou string
      if (typeof value === 'object' && value !== null && value.start) {
        const start = String(value.start).substring(0, 10);
        const end = value.end ? String(value.end).substring(0, 10) : '';
        return <span className="truncate">{start}{end ? ` → ${end}` : ''}</span>;
      }
      return <span className="truncate">{String(value)}</span>;
    }

    case 'auto_number':
      return <span className="text-muted-foreground">{String(value)}</span>;

    case 'creation_log':
    case 'last_updated': {
      // Formato: {date: "ISO"} ou string
      const dateVal = typeof value === 'object' && value?.date ? value.date : String(value);
      const dateOnly = String(dateVal).substring(0, 10);
      return <span className="text-muted-foreground">{dateOnly}</span>;
    }

    case 'vote': {
      // Formato: string[] (array de user IDs que votaram)
      const count = Array.isArray(value) ? value.length
        : (typeof value === 'object' && value !== null && Array.isArray(value.voters) ? value.voters.length : 0);
      return count > 0 ? <span>👍 {count}</span> : <span className="text-muted-foreground/40">--</span>;
    }

    case 'location': {
      // Formato: {address, lat, lng}
      const loc = typeof value === 'object' && value !== null ? (value.address || value.name || '') : String(value);
      return loc ? <span className="truncate">{loc}</span> : <span className="text-muted-foreground/40">--</span>;
    }

    case 'file': {
      // Formato: [{id, name, path}]
      const files = Array.isArray(value) ? value : [];
      if (files.length === 0) return <span className="text-muted-foreground/40">--</span>;
      return (
        <span className="flex items-center gap-1 truncate">
          <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{files[0]?.name || 'arquivo'}</span>
          {files.length > 1 && <span className="text-[10px] text-muted-foreground">+{files.length - 1}</span>}
        </span>
      );
    }

    case 'formula': {
      // Formato: resultado calculado (number ou string)
      if (typeof value === 'number') return <span>{value.toLocaleString('pt-BR')}</span>;
      if (typeof value === 'object' && value?.result != null) {
        const r = value.result;
        return <span>{typeof r === 'number' ? r.toLocaleString('pt-BR') : String(r)}</span>;
      }
      return <span className="truncate">{String(value)}</span>;
    }

    case 'connect_boards':
    case 'mirror':
    case 'button':
      // Tipos que dependem de contexto externo — não renderizáveis como read-only
      return <span className="text-muted-foreground/40">--</span>;

    default:
      // Fallback seguro: nunca mostrar JSON bruto
      if (typeof value === 'object') {
        // Tentar extrair algo legível
        if (value.label) return <span className="truncate">{String(value.label)}</span>;
        if (value.name) return <span className="truncate">{String(value.name)}</span>;
        if (value.text) return <span className="truncate">{String(value.text)}</span>;
        if (value.value) return <span className="truncate">{String(value.value)}</span>;
        return <span className="text-muted-foreground/40">--</span>;
      }
      return <span className="truncate">{String(value)}</span>;
  }
};

export default WorkExtraCell;
