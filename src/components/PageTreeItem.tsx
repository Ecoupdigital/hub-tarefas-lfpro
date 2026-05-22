import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, FileText, MoreHorizontal,
  Pencil, Trash2, Plus, GripVertical,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePage, useRenamePage } from '@/hooks/useCrudMutations';
import { usePagesTree, useDatabasesForPage } from '@/hooks/useSupabaseData';
import DatabaseSidebarItem from '@/components/DatabaseSidebarItem';
import { toast } from 'sonner';
import type { PageTreeNode } from '@/types/page';

interface PageTreeItemProps {
  /** Node atual da arvore (page) */
  node: PageTreeNode;
  /** Workspace ao qual o node pertence (propagado pra filhos) */
  workspaceId: string;
  /** Profundidade na arvore (0 = root do workspace) */
  level: number;
  /** Filtro de busca propagado da sidebar (case-insensitive) */
  searchQuery?: string;
}

/**
 * No recursivo da arvore de pages no sidebar.
 *
 * Comportamento:
 *  - Click no titulo navega pra /page/:id
 *  - Chevron aparece quando child_count > 0; click expande/colapsa
 *  - Ao expandir, dispara usePagesTree (subpages) + useDatabasesForPage (databases inline)
 *  - Estado de expansao persiste em localStorage `lfpro-page-expanded-:id`
 *  - Indentacao 16px * level via paddingLeft
 *  - Dropdown: Nova subpagina (CustomEvent), Renomear (inline), Excluir (AlertDialog)
 *
 * O componente e recursivo: cada child PageTreeNode renderiza outro PageTreeItem
 * com level + 1. Databases inline (boards.page_id = node.id) sao folhas
 * (DatabaseSidebarItem).
 */
const PageTreeItem: React.FC<PageTreeItemProps> = ({
  node, workspaceId, level, searchQuery,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/page/${node.id}`;
  const storageKey = `lfpro-page-expanded-${node.id}`;

  const [expanded, setExpandedState] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const setExpanded = (v: boolean) => {
    setExpandedState(v);
    try { localStorage.setItem(storageKey, String(v)); } catch { /* noop */ }
  };

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.title);
  const [showDelete, setShowDelete] = useState(false);

  const deletePage = useDeletePage();
  const renamePage = useRenamePage();

  // Lazy: so busca filhos quando o node esta expandido
  const { data: childPages = [] } = usePagesTree(workspaceId, node.id, expanded);
  const { data: childDatabases = [] } = useDatabasesForPage(node.id, expanded);

  const hasChildren = node.child_count > 0;

  // Filtro de busca: esconde nos sem match e sem filhos que batem.
  // Quando expandido, propagamos searchQuery pra filhos seguirem mesma regra.
  const matchesSearch = !searchQuery || node.title.toLowerCase().includes(searchQuery.toLowerCase());

  // dnd-kit: sortable pra mover entre irmaos
  const sortableId = `page-${node.id}`;
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: {
      type: 'page',
      pageId: node.id,
      parentId: node.parent_id,
      workspaceId,
    },
  });

  // Drop zone "dentro" do node: drop aqui = vira filho desta page
  const { setNodeRef: setDropInsideRef, isOver: isOverInside } = useDroppable({
    id: `page-${node.id}-inside`,
    data: {
      type: 'page-inside',
      parentPageId: node.id,
      workspaceId,
    },
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleRename = async () => {
    const next = renameValue.trim();
    if (!next || next === node.title) {
      setRenaming(false);
      setRenameValue(node.title);
      return;
    }
    try {
      await renamePage.mutateAsync({ pageId: node.id, title: next });
      toast.success('Pagina renomeada');
    } catch {
      // erro ja toasted pela mutation
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    try {
      await deletePage.mutateAsync(node.id);
      toast.success('Pagina excluida');
      setShowDelete(false);
    } catch {
      // erro ja toasted pela mutation
    }
  };

  const handleCreateSubpage = () => {
    // useCreatePage atual (Fase 01) nao aceita parent_id. Estendido no Plano 02-04.
    // Por ora dispatch CustomEvent pra orquestrador (ou modal global) escutar e abrir
    // fluxo de criacao com parent_id pre-setado.
    window.dispatchEvent(new CustomEvent('lfpro-create-subpage', {
      detail: { workspaceId, parentId: node.id },
    }));
    setExpanded(true);
  };

  if (!matchesSearch && childPages.length === 0 && childDatabases.length === 0) {
    return null;
  }

  return (
    <div ref={setSortableRef} style={sortableStyle}>
      <div
        ref={setDropInsideRef}
        className={`flex items-center group/page rounded-md transition-colors ${
          isOverInside && !isDragging ? 'bg-primary/10 ring-1 ring-primary' : ''
        }`}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 rounded text-muted-foreground hover:bg-sidebar-accent opacity-0 group-hover/page:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          aria-label="Arrastar pagina"
          onClick={(e) => e.preventDefault()}
        >
          <GripVertical className="w-3 h-3" />
        </button>
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded text-muted-foreground hover:bg-sidebar-accent"
            aria-label={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {renaming ? (
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            ref={(el) => el?.focus({ preventScroll: true })}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenaming(false); setRenameValue(node.title); }
            }}
            className="flex-1 min-w-0 density-px density-py text-xs bg-muted rounded-md outline-none border border-primary mx-1"
          />
        ) : (
          <button
            onClick={() => navigate(`/page/${node.id}`)}
            className={`flex items-center flex-1 density-px density-py-item text-sm rounded-md transition-colors duration-[70ms] ${
              isActive
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <span className="flex-shrink-0 mr-2 inline-flex items-center justify-center w-3.5">
              {node.icon
                ? <span className="text-sm leading-none">{node.icon}</span>
                : <FileText className="w-3.5 h-3.5" />}
            </span>
            <span className="font-density-cell truncate flex-1 text-left">{node.title}</span>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground opacity-0 group-hover/page:opacity-100 transition-all mr-0.5"
              aria-label="Opcoes da pagina"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleCreateSubpage}>
              <Plus className="w-3.5 h-3.5 mr-2" /> Nova subpagina
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setRenameValue(node.title); setRenaming(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filhos: subpages (recursivo) + databases (folhas) */}
      {expanded && hasChildren && (
        <div className="density-space-y">
          {childPages.map((child) => (
            <PageTreeItem
              key={`page-${child.id}`}
              node={child}
              workspaceId={workspaceId}
              level={level + 1}
              searchQuery={searchQuery}
            />
          ))}
          {childDatabases.map((db) => (
            <DatabaseSidebarItem
              key={`db-${db.id}`}
              databaseId={db.id}
              parentPageId={node.id}
              name={db.name}
              icon={db.icon}
              color={db.color}
              level={level + 1}
            />
          ))}
        </div>
      )}

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagina?</AlertDialogTitle>
            <AlertDialogDescription>
              A pagina &quot;{node.title}&quot; e todas as subpaginas e databases dentro
              dela serao movidas para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PageTreeItem;
