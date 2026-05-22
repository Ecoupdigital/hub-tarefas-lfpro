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
 * Tipo discriminado utilizado pelo Sidebar para listar boards + pages mesclados.
 * Plano 01-03 consome este tipo.
 */
export type WorkspaceEntry =
  | { kind: 'board'; id: string; name: string; icon: string | null; color: string | null; folder_id: string | null; position: number; workspace_id: string }
  | { kind: 'page'; id: string; title: string; icon: string | null; folder_id: string | null; position: number; workspace_id: string };
