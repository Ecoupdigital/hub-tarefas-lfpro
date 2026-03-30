import type { Item, StatusLabel, Column } from '@/types/board';

/** Retorna as opcoes discretas de uma coluna como Map<key, StatusLabel> */
export function getColumnLaneOptions(col: Column, allItems: Item[]): Map<string, StatusLabel> {
  const map = new Map<string, StatusLabel>();

  if (col.type === 'status') {
    const labels = col.settings.labels || {};
    for (const [key, label] of Object.entries(labels)) {
      map.set(key, label);
    }
  } else if (col.type === 'dropdown') {
    const options = col.settings.options || [];
    const OPTION_COLORS = ['#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC', '#FF642E', '#C4C4C4', '#037F4C', '#FF158A', '#5559DF'];
    options.forEach((opt, idx) => {
      map.set(opt, { name: opt, color: OPTION_COLORS[idx % OPTION_COLORS.length] });
    });
  } else if (col.type === 'tags') {
    // Tags nao tem opcoes pre-definidas; coletamos de todos os items
    const TAG_COLORS = ['#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#FF642E', '#037F4C', '#FF158A', '#5559DF', '#C4C4C4'];
    const seenTags = new Set<string>();
    for (const item of allItems) {
      const val = item.columnValues[col.id]?.value;
      if (Array.isArray(val)) {
        val.forEach(t => seenTags.add(String(t)));
      } else if (typeof val === 'string' && val) {
        val.split(',').map(s => s.trim()).filter(Boolean).forEach(t => seenTags.add(t));
      }
    }
    let idx = 0;
    for (const tag of seenTags) {
      let hash = 0;
      for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
      map.set(tag, { name: tag, color: TAG_COLORS[Math.abs(hash) % TAG_COLORS.length] });
      idx++;
    }
  }

  return map;
}

/** Extrai o(s) valor(es) de lane de um item para uma coluna */
export function getItemLaneKeys(item: Item, col: Column): string[] {
  const raw = item.columnValues[col.id]?.value;
  if (col.type === 'tags') {
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === 'string' && raw) return raw.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }
  // status e dropdown: valor unico
  if (raw && typeof raw === 'string') return [raw];
  if (raw && typeof raw === 'number') return [String(raw)];
  return [];
}
