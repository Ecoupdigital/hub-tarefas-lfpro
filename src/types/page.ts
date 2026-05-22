// Tipos de dominio para o modo Pagina (Docs Mode). Mantem paridade com Board.

export type PageRole = 'admin' | 'editor' | 'member' | 'viewer';

export type PageState = 'active' | 'archived' | 'deleted';

/**
 * Bloco BlockNote no formato JSON nativo (estrutura raiz armazenada em pages.content).
 * Mantemos como unknown[] pois o schema do BlockNote evolui; validacao no runtime
 * fica no editor (Plano 01-02).
 */
export type PageContent = unknown[];

export interface Page {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  title: string;
  content: PageContent;
  state: PageState;
  icon: string | null;
  cover_url: string | null;
  position: number;
  /**
   * Hierarquia (Fase 02): NULL = page root no workspace, NOT NULL = subpagina.
   */
  parent_id: string | null;
  /**
   * Lexorank base-62 (Fase 02). Usado pra ordenacao manual via drag/drop.
   * Campo `position` permanece pra retrocompat ate Plano 02-03 migrar UI.
   */
  sort_order: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  content: PageContent;
  title: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PagePermission {
  id: string;
  page_id: string;
  user_id: string;
  role: PageRole;
  created_at: string;
}

/**
 * Bloco compartilhado entre pages do mesmo workspace (Fase 02).
 * Conteudo persiste em tabela `synced_blocks`; bloco BlockNote `synced` referencia via id.
 */
export interface SyncedBlock {
  id: string;
  workspace_id: string;
  content: PageContent;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Node da arvore de pages renderizada no sidebar (Fase 02).
 * Carrega apenas os campos minimos pra evitar payload pesado;
 * detalhes da page sao carregados sob demanda ao abrir.
 */
export interface PageTreeNode {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  sort_order: string;
  /** Conta filhos (subpages + databases) sem carregar; usado pra mostrar chevron. */
  child_count: number;
}

/**
 * Tipo discriminado utilizado pelo Sidebar para listar boards + pages mesclados.
 * Plano 01-03 consome este tipo. Estendido em Fase 02:
 *   - board variant carrega `page_id` (NULL = board tradicional, NOT NULL = database inline)
 *   - page variant carrega `parent_id` e `sort_order` pra renderizar arvore
 */
export type WorkspaceEntry =
  | {
      kind: 'board';
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
      folder_id: string | null;
      position: number;
      workspace_id: string;
      page_id: string | null;
    }
  | {
      kind: 'page';
      id: string;
      title: string;
      icon: string | null;
      folder_id: string | null;
      position: number;
      workspace_id: string;
      parent_id: string | null;
      sort_order: string;
    };
