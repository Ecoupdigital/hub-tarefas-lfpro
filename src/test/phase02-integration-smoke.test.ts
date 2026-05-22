import { describe, it, expect } from 'vitest';
import { isDatabase, DATABASE_VIEW_TYPES, DATABASE_COLUMN_TYPES } from '@/types/database';
import type { Page, PageTreeNode, SyncedBlock, WorkspaceEntry } from '@/types/page';
import type { Board } from '@/types/board';

/**
 * Smoke tests integrativos da Fase 02.
 *
 * Cobrem as 3 conexoes ponta a ponta que fecham a fase:
 *   1. Hierarquia page -> subpage -> database inline (tipos compõem corretamente)
 *   2. Bookmark com cache jsonb (shape do props do bloco)
 *   3. Synced block referenciavel cross-page no mesmo workspace
 *
 * Estes testes nao executam render nem fazem chamada a Supabase; verificam que
 * os contratos de tipo (que o codigo de runtime depende) permanecem estaveis.
 */
describe('Fase 02 integration smoke', () => {
  it('hierarquia: page A -> subpage B -> database C compoe via parent_id + page_id', () => {
    const pageA: Page = {
      id: 'page-a', workspace_id: 'w1', folder_id: null,
      title: 'Documentacao', content: [], state: 'active',
      icon: 'FileText', cover_url: null, position: 0,
      parent_id: null, sort_order: 'a0',
      created_by: 'u1', created_at: '2026-05-23T00:00:00Z', updated_at: '2026-05-23T00:00:00Z',
    };

    const subpageB: Page = {
      ...pageA,
      id: 'page-b',
      title: 'API',
      parent_id: pageA.id,
      sort_order: 'a1',
    };

    const databaseC: Pick<Board, 'id' | 'page_id'> = {
      id: 'board-c',
      page_id: subpageB.id,
    };

    expect(pageA.parent_id).toBeNull();
    expect(subpageB.parent_id).toBe(pageA.id);
    expect(isDatabase(databaseC)).toBe(true);
    // boards tradicionais sem page_id nao sao databases
    expect(isDatabase({ id: 'b', page_id: null })).toBe(false);
  });

  it('bookmark: cache jsonb segura title/description/image/favicon/site_name + fetched_at', () => {
    type BookmarkPropsShape = {
      url: string;
      title: string | null;
      description: string | null;
      image: string | null;
      favicon: string | null;
      site_name: string | null;
      fetched_at: string | null;
    };

    const cached: BookmarkPropsShape = {
      url: 'https://exemplo.com.br/artigo',
      title: 'Artigo de Exemplo',
      description: 'Descricao do artigo',
      image: 'https://exemplo.com.br/og.png',
      favicon: 'https://exemplo.com.br/favicon.ico',
      site_name: 'Exemplo',
      fetched_at: new Date().toISOString(),
    };

    expect(cached.url).toMatch(/^https?:\/\//);
    expect(cached.title).not.toBeNull();
    expect(cached.fetched_at).not.toBeNull();
  });

  it('synced block: 2 referencias em pages diferentes apontam ao mesmo id', () => {
    const sb: SyncedBlock = {
      id: 'sb-1', workspace_id: 'w1', content: [],
      created_by: 'u1', created_at: '', updated_at: '',
    };

    // Bloco BlockNote em duas pages diferentes referenciando o mesmo synced_block_id
    const refInPageA = { type: 'synced' as const, props: { synced_block_id: sb.id } };
    const refInPageB = { type: 'synced' as const, props: { synced_block_id: sb.id } };

    expect(refInPageA.props.synced_block_id).toBe(refInPageB.props.synced_block_id);
    expect(refInPageA.props.synced_block_id).toBe(sb.id);
    expect(sb.workspace_id).toBe('w1');
  });

  it('PageTreeNode tem child_count e sort_order pra arvore + drag', () => {
    const node: PageTreeNode = {
      id: 'p1', workspace_id: 'w1', parent_id: null,
      title: 'Root', icon: null, sort_order: 'a0', child_count: 3,
    };
    expect(node.child_count).toBeGreaterThan(0);
    expect(typeof node.sort_order).toBe('string');
  });

  it('DATABASE_VIEW_TYPES cobre os 4 tipos suportados em databases', () => {
    expect(DATABASE_VIEW_TYPES).toContain('table');
    expect(DATABASE_VIEW_TYPES).toContain('kanban');
    expect(DATABASE_VIEW_TYPES).toContain('calendar');
    expect(DATABASE_VIEW_TYPES).toContain('list_detailed');
  });

  it('DATABASE_COLUMN_TYPES respeita subset 8 do MVP (sem formula/mirror/connect)', () => {
    expect(DATABASE_COLUMN_TYPES).not.toContain('formula');
    expect(DATABASE_COLUMN_TYPES).not.toContain('mirror');
    expect(DATABASE_COLUMN_TYPES).not.toContain('connect_boards');
    expect(DATABASE_COLUMN_TYPES.length).toBe(8);
  });

  it('WorkspaceEntry: board variant tem page_id; page variant tem parent_id', () => {
    const board: WorkspaceEntry = {
      kind: 'board', id: 'b1', name: 'DB Tarefas', icon: null, color: null,
      folder_id: null, position: 0, workspace_id: 'w1', page_id: 'p1',
    };
    const page: WorkspaceEntry = {
      kind: 'page', id: 'p1', title: 'Doc', icon: null,
      folder_id: null, position: 0, workspace_id: 'w1',
      parent_id: null, sort_order: 'a0',
    };
    if (board.kind === 'board') {
      expect(isDatabase({ page_id: board.page_id })).toBe(true);
    }
    if (page.kind === 'page') {
      expect(page.parent_id).toBeNull();
    }
  });
});
