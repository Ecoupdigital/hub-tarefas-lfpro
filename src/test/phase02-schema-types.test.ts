import { describe, it, expect } from 'vitest';
import {
  DATABASE_COLUMN_TYPES,
  DATABASE_VIEW_TYPES,
  DATABASE_VIEW_LABELS,
  isDatabase,
} from '@/types/database';
import type { Page, PageTreeNode, SyncedBlock, WorkspaceEntry } from '@/types/page';

describe('Fase 02 schema types', () => {
  it('DATABASE_COLUMN_TYPES contem exatamente 8 tipos do MVP', () => {
    expect(DATABASE_COLUMN_TYPES).toHaveLength(8);
    expect(DATABASE_COLUMN_TYPES).toEqual([
      'text', 'status', 'date', 'people', 'number', 'checkbox', 'dropdown', 'long_text',
    ]);
  });

  it('DATABASE_VIEW_TYPES tem table/kanban/calendar/list_detailed', () => {
    expect(DATABASE_VIEW_TYPES).toEqual(['table', 'kanban', 'calendar', 'list_detailed']);
    expect(DATABASE_VIEW_LABELS.list_detailed).toBe('Lista detalhada');
  });

  it('isDatabase retorna true quando page_id e nao-vazio', () => {
    expect(isDatabase({ page_id: 'uuid-x' })).toBe(true);
    expect(isDatabase({ page_id: null })).toBe(false);
    expect(isDatabase({ page_id: undefined })).toBe(false);
    expect(isDatabase(null)).toBe(false);
    expect(isDatabase(undefined)).toBe(false);
  });

  it('Page tem parent_id e sort_order; SyncedBlock tem workspace_id', () => {
    const page: Page = {
      id: 'p1', workspace_id: 'w1', folder_id: null, title: 't',
      content: [], state: 'active', icon: null, cover_url: null,
      position: 0, created_by: null, created_at: '', updated_at: '',
      parent_id: null, sort_order: 'a0',
    };
    expect(page.sort_order).toBe('a0');

    const node: PageTreeNode = {
      id: 'p1', workspace_id: 'w1', parent_id: null,
      title: 't', icon: null, sort_order: 'a0', child_count: 0,
    };
    expect(node.child_count).toBe(0);

    const sb: SyncedBlock = {
      id: 's1', workspace_id: 'w1', content: [],
      created_by: null, created_at: '', updated_at: '',
    };
    expect(sb.workspace_id).toBe('w1');
  });

  it('WorkspaceEntry page variant tem parent_id e sort_order; board variant tem page_id', () => {
    const pageEntry: WorkspaceEntry = {
      kind: 'page', id: 'p1', title: 't', icon: null, folder_id: null,
      position: 0, workspace_id: 'w1', parent_id: null, sort_order: 'a0',
    };
    const boardEntry: WorkspaceEntry = {
      kind: 'board', id: 'b1', name: 'b', icon: null, color: null,
      folder_id: null, position: 0, workspace_id: 'w1', page_id: null,
    };
    expect(pageEntry.kind).toBe('page');
    expect(boardEntry.kind).toBe('board');
  });
});
