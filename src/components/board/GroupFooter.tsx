import React from 'react';
import { Column, Item } from '@/types/board';
import { Star } from 'lucide-react';

interface GroupFooterProps {
  columns: Column[];
  items: Item[];
}

const GroupFooter: React.FC<GroupFooterProps> = ({ columns, items }) => {
  if (items.length === 0) return null;

  const renderSummary = (col: Column) => {
    const values = items.map(item => item.columnValues[col.id]?.value).filter(v => v !== undefined && v !== null && v !== '');

    switch (col.type) {
      case 'status': {
        const counts: Record<string, { count: number; color: string; label?: string }> = {};
        const total = items.length;
        items.forEach(item => {
          const val = item.columnValues[col.id]?.value;
          const key = val ?? '__empty__';
          const labelObj = col.settings.labels?.[val];
          if (!counts[key]) {
            counts[key] = { count: 0, color: labelObj?.color || '#c4c4c4', label: labelObj?.text || key };
          }
          counts[key].count++;
        });
        const segments = Object.values(counts);
        return (
          <div
            className="flex w-full h-[5px] rounded-full overflow-hidden mx-1 gap-px"
            title={segments.map(s => `${s.label}: ${s.count}`).join(' | ')}
          >
            {/* key={i} used here because segments have no stable ID */}
            {segments.map((seg, i) => (
              <div
                key={i}
                className="h-full transition-all rounded-full"
                style={{
                  backgroundColor: seg.color,
                  width: `${(seg.count / total) * 100}%`,
                  opacity: 0.75,
                }}
              />
            ))}
          </div>
        );
      }

      case 'number': {
        const sum = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
        return <span className="font-density-tiny text-muted-foreground font-medium">{sum.toLocaleString('pt-BR')}</span>;
      }

      case 'checkbox': {
        const checked = items.filter(item => item.columnValues[col.id]?.value === true).length;
        const total = items.length;
        return <span className="font-density-tiny text-muted-foreground font-medium">{checked} / {total}</span>;
      }

      case 'progress': {
        if (values.length === 0) return null;
        const avg = Math.round(values.reduce((acc: number, v) => acc + (Number(v) || 0), 0) / values.length);
        return <span className="font-density-tiny text-muted-foreground font-medium">{avg}%</span>;
      }

      case 'rating': {
        if (values.length === 0) return null;
        const avg = (values.reduce((acc: number, v) => acc + (Number(v) || 0), 0) / values.length).toFixed(1);
        return (
          <span className="font-density-tiny text-muted-foreground font-medium flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {avg}
          </span>
        );
      }

      case 'date': {
        if (values.length === 0) return null;
        const dates = values
          .map(v => {
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
          })
          .filter(Boolean) as Date[];
        if (dates.length === 0) return null;
        const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
        return (
          <span className="font-density-tiny text-muted-foreground font-medium">
            {earliest.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        );
      }

      case 'people': {
        const uniquePeople: string[] = [];
        const seen = new Set<string>();
        values.forEach(v => {
          if (Array.isArray(v)) v.forEach((p: string) => { if (!seen.has(p)) { seen.add(p); uniquePeople.push(p); } });
          else if (v && !seen.has(String(v))) { seen.add(String(v)); uniquePeople.push(String(v)); }
        });
        if (uniquePeople.length === 0) return null;
        const displayCount = Math.min(uniquePeople.length, 3);
        return (
          <div className="flex items-center gap-0.5">
            <div className="flex -space-x-1">
              {uniquePeople.slice(0, displayCount).map((p) => (
                <div
                  key={p}
                  className="w-4 h-4 rounded-full bg-primary/20 border border-background flex items-center justify-center text-primary"
                  style={{ fontSize: '0.5rem', fontWeight: 600 }}
                  title={p}
                >
                  {p.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            {uniquePeople.length > displayCount && (
              <span className="font-density-tiny text-muted-foreground/70" style={{ fontSize: '0.625rem' }}>
                +{uniquePeople.length - displayCount}
              </span>
            )}
          </div>
        );
      }

      case 'time_tracking': {
        let totalMs = 0;
        values.forEach(v => {
          if (typeof v === 'object' && v !== null) {
            // Sum total elapsed time from sessions
            if (Array.isArray(v.sessions)) {
              v.sessions.forEach((s: any) => {
                if (s.duration) totalMs += s.duration;
              });
            }
            if (v.totalTime) totalMs += v.totalTime;
            if (v.elapsed) totalMs += v.elapsed;
          } else if (typeof v === 'number') {
            totalMs += v;
          }
        });
        if (totalMs === 0) return null;
        const totalSec = Math.floor(totalMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const display = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return <span className="font-density-tiny text-muted-foreground font-medium">{display}</span>;
      }

      case 'tags': {
        const uniqueTags = new Set<string>();
        values.forEach(v => {
          if (Array.isArray(v)) v.forEach((t: string) => uniqueTags.add(t));
        });
        if (uniqueTags.size === 0) return null;
        return (
          <span className="font-density-tiny text-muted-foreground font-medium">
            {uniqueTags.size} {uniqueTags.size === 1 ? 'tag' : 'tags'}
          </span>
        );
      }

      case 'text':
      case 'long_text':
      case 'email':
      case 'phone':
      case 'link': {
        if (values.length === 0) return null;
        return <span className="font-density-tiny text-muted-foreground font-medium">{values.length} preenchidos</span>;
      }

      default:
        return null;
    }
  };

  return (
    <div className="flex items-stretch border-t-2 border-b border-cell-border min-h-[30px] bg-muted/30" style={{ borderTopColor: 'hsl(var(--border))' }}>
      <div className="sticky left-0 z-20 bg-card min-w-[320px] w-[320px] border-r border-cell-border flex items-center px-10">
        <span className="font-density-tiny text-muted-foreground/60 font-medium tracking-wide uppercase">Resumo</span>
      </div>
      {columns.map(col => (
        <div
          key={col.id}
          className="border-r border-cell-border flex items-center justify-center px-1 py-0.5"
          style={{ minWidth: col.width, width: col.width }}
        >
          {renderSummary(col)}
        </div>
      ))}
      <div className="min-w-[40px]" />
    </div>
  );
};

export default GroupFooter;
