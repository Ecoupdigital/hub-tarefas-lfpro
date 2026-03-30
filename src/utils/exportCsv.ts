function formatCellValue(val: unknown, colType?: string): string {
  if (val == null) return '';

  // Type-specific formatting when column type is known
  if (colType) {
    switch (colType) {
      case 'text':
      case 'status':
      case 'dropdown':
      case 'phone':
      case 'email':
      case 'color':
        return val != null ? String(val) : '';

      case 'number':
      case 'checkbox':
        return String(val);

      case 'date':
        return typeof val === 'string' ? val : String(val);

      case 'tags':
        if (Array.isArray(val)) return val.join(', ');
        return String(val);

      case 'people':
        if (Array.isArray(val)) return val.join(', ');
        return String(val);

      case 'connect_boards':
        if (Array.isArray(val)) return val.join(', ');
        return String(val);

      case 'time_tracking': {
        if (typeof val === 'object' && val !== null) {
          const tt = val as Record<string, unknown>;
          const totalSeconds = typeof tt.totalSeconds === 'number' ? tt.totalSeconds : 0;
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          return `${hours}h ${minutes}m`;
        }
        return String(val);
      }

      case 'progress':
        return typeof val === 'number' ? `${val}%` : String(val);

      case 'auto_number':
        return String(val);

      case 'creation_log':
      case 'last_updated': {
        if (typeof val === 'object' && val !== null) {
          const log = val as Record<string, unknown>;
          if (typeof log.date === 'string') {
            try {
              const d = new Date(log.date);
              return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            } catch {
              return log.date;
            }
          }
        }
        return String(val);
      }

      case 'rating':
        return typeof val === 'number' ? `${val}/5` : String(val);

      case 'link': {
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && val !== null) {
          const link = val as Record<string, unknown>;
          return (link.url as string) || '';
        }
        return String(val);
      }

      case 'long_text': {
        const text = String(val);
        return text.length > 200 ? text.substring(0, 200) + '...' : text;
      }

      case 'timeline': {
        if (typeof val === 'object' && val !== null) {
          const tl = val as Record<string, unknown>;
          const start = tl.start ? String(tl.start) : '';
          const end = tl.end ? String(tl.end) : '';
          return start && end ? `${start} → ${end}` : start || end;
        }
        return String(val);
      }

      case 'file': {
        if (Array.isArray(val)) {
          return val.map((f: unknown) => {
            if (typeof f === 'object' && f !== null) {
              const file = f as Record<string, unknown>;
              return (file.name as string) || (file.url as string) || '';
            }
            return String(f);
          }).join(', ');
        }
        return String(val);
      }

      case 'formula':
        return String(val);

      case 'vote':
        return String(val);

      case 'location': {
        if (typeof val === 'object' && val !== null) {
          const loc = val as Record<string, unknown>;
          if (typeof loc.address === 'string' && loc.address) return loc.address;
          const lat = loc.lat != null ? String(loc.lat) : '';
          const lng = loc.lng != null ? String(loc.lng) : '';
          return lat && lng ? `${lat}, ${lng}` : lat || lng;
        }
        return String(val);
      }

      case 'mirror': {
        // Mirror reflects another column; best-effort generic formatting
        return formatCellValue(val);
      }

      case 'button':
        return '';

      // Fallthrough to generic formatting for unknown types
    }
  }

  // Generic fallback (used when colType is not provided or unrecognized)
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return (item as Record<string, unknown>).name
          || (item as Record<string, unknown>).label
          || (item as Record<string, unknown>).title
          || JSON.stringify(item);
      }
      return String(item);
    }).join(', ');
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    return (obj.name || obj.label || obj.title || JSON.stringify(val)) as string;
  }
  return String(val);
}

export const exportBoardToCsv = (
  boardName: string,
  groups: any[],
  columns: any[]
) => {
  const headers = ['Grupo', 'Item', ...columns.map((c: any) => c.title)];
  const rows: string[][] = [];

  for (const group of groups) {
    for (const item of group.items) {
      const row = [
        group.title,
        item.name,
        ...columns.map((col: any) => {
          const cv = item.columnValues[col.id];
          return formatCellValue(cv?.value, col.type);
        }),
      ];
      rows.push(row);
    }
  }

  const escape = (s: string) => {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boardName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
