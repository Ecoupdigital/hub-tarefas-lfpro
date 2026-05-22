import { describe, it, expect } from 'vitest';
import type { WorkspaceEntry } from '@/types/page';

describe('WorkspaceEntry discriminated union', () => {
  it('narrows board kind', () => {
    const entry: WorkspaceEntry = {
      kind: 'board',
      id: 'b1',
      name: 'Board 1',
      icon: null,
      color: null,
      folder_id: null,
      position: 0,
      workspace_id: 'ws1',
      page_id: null,
    };
    if (entry.kind === 'board') {
      expect(entry.name).toBe('Board 1');
    } else {
      throw new Error('narrowing failed');
    }
  });

  it('narrows page kind', () => {
    const entry: WorkspaceEntry = {
      kind: 'page',
      id: 'p1',
      title: 'Pagina 1',
      icon: null,
      folder_id: null,
      position: 0,
      workspace_id: 'ws1',
      parent_id: null,
      sort_order: 'a0',
    };
    if (entry.kind === 'page') {
      expect(entry.title).toBe('Pagina 1');
    } else {
      throw new Error('narrowing failed');
    }
  });
});
