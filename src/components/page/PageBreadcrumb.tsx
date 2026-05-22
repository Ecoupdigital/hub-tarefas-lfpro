import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';

interface PageBreadcrumbProps {
  pageId: string;
}

interface BreadcrumbNode {
  id: string;
  title: string;
}

interface BreadcrumbResult {
  chain: BreadcrumbNode[];
  workspaceId: string | null;
}

/**
 * Renderiza trilha hierarquica da page atual: Workspace > Page raiz > ... > current.
 *
 * Estrategia: sobe a cadeia `parent_id` ate `parent_id IS NULL`. Para hierarquias
 * tipicas (<5 niveis) o loop client-side e suficiente; cada step e uma query simples
 * em `pages` por id (RLS via `can_access_page`). Limite defensivo de 20 niveis
 * pra evitar loop infinito caso o dado seja corrompido (ciclo).
 *
 * Cache: queryKey `['page-breadcrumb', pageId]` com staleTime 60s.
 * Invalida automaticamente quando `useRenamePage`/`useDeletePage` chamam
 * `qc.invalidateQueries({ queryKey: ['pages'] })` (key broader)?
 * Nao - precisa de invalidacao explicita. Como rename de pai mudaria o label,
 * o breadcrumb aceita ficar ate 60s defasado (trade-off).
 */
const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({ pageId }) => {
  const app = useApp();
  const workspaces = (app.workspaces ?? []) as Array<{ id: string; name: string }>;

  const { data } = useQuery<BreadcrumbResult>({
    queryKey: ['page-breadcrumb', pageId],
    enabled: !!pageId,
    staleTime: 60_000,
    queryFn: async () => {
      const chain: BreadcrumbNode[] = [];
      let currentId: string | null = pageId;
      let workspaceId: string | null = null;
      for (let i = 0; i < 20 && currentId; i++) {
        const { data: row, error } = await supabase
          .from('pages')
          .select('id, title, parent_id, workspace_id')
          .eq('id', currentId)
          .maybeSingle();
        if (error || !row) break;
        chain.unshift({ id: row.id, title: row.title || 'Pagina sem titulo' });
        workspaceId = (row as { workspace_id: string }).workspace_id ?? workspaceId;
        currentId = (row as { parent_id: string | null }).parent_id ?? null;
      }
      return { chain, workspaceId };
    },
  });

  const chain = data?.chain ?? [];
  const workspaceId = data?.workspaceId ?? null;
  const workspace = workspaceId ? workspaces.find((w) => w.id === workspaceId) : null;

  if (chain.length === 0) return null;

  return (
    <nav
      className="flex items-center gap-1 text-xs text-muted-foreground"
      aria-label="Breadcrumb"
    >
      {workspace && (
        <>
          <Link
            to={`/workspace/${workspace.id}`}
            className="hover:text-foreground transition-colors truncate max-w-[140px]"
            title={workspace.name}
          >
            {workspace.name}
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        </>
      )}
      {chain.map((node, idx) => (
        <React.Fragment key={node.id}>
          {idx > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
          {idx === chain.length - 1 ? (
            <span
              className="text-foreground font-medium truncate max-w-[200px]"
              title={node.title}
              aria-current="page"
            >
              {node.title}
            </span>
          ) : (
            <Link
              to={`/page/${node.id}`}
              className="hover:text-foreground transition-colors truncate max-w-[150px]"
              title={node.title}
            >
              {node.title}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default PageBreadcrumb;
