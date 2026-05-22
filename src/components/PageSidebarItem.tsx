import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeletePage, useRenamePage } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';

interface PageSidebarItemProps {
  pageId: string;
  title: string;
  icon: string | null;
}

/**
 * Renderiza uma page no sidebar do workspace.
 * Icone padrao: FileText (Lucide). Se a page tem icon (emoji), usa o emoji.
 */
const PageSidebarItem: React.FC<PageSidebarItemProps> = ({ pageId, title, icon }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/page/${pageId}`;

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [showDelete, setShowDelete] = useState(false);
  const deletePage = useDeletePage();
  const renamePage = useRenamePage();

  const handleRename = async () => {
    const next = renameValue.trim();
    if (!next || next === title) {
      setRenaming(false);
      setRenameValue(title);
      return;
    }
    try {
      await renamePage.mutateAsync({ pageId, title: next });
      toast.success('Pagina renomeada');
    } catch {
      // erro ja toasted pela mutation
    }
    setRenaming(false);
  };

  const handleDelete = async () => {
    try {
      await deletePage.mutateAsync(pageId);
      toast.success('Pagina excluida');
      setShowDelete(false);
    } catch {
      // erro ja toasted pela mutation
    }
  };

  return (
    <>
      <div className="flex items-center group/page">
        {renaming ? (
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            ref={(el) => el?.focus({ preventScroll: true })}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenaming(false); setRenameValue(title); }
            }}
            className="flex-1 min-w-0 density-px density-py text-xs bg-muted rounded-md outline-none border border-primary mx-1"
          />
        ) : (
          <button
            onClick={() => navigate(`/page/${pageId}`)}
            className={`flex items-center flex-1 density-px density-py-item text-sm rounded-md transition-colors duration-[70ms] ${
              isActive
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <span className="flex-shrink-0 mr-2 inline-flex items-center justify-center w-3.5">
              {icon
                ? <span className="text-sm leading-none">{icon}</span>
                : <FileText className="w-3.5 h-3.5" />}
            </span>
            <span className="font-density-cell truncate flex-1 text-left">{title}</span>
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => { setRenameValue(title); setRenaming(true); }}>
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

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagina?</AlertDialogTitle>
            <AlertDialogDescription>
              A pagina &quot;{title}&quot; sera movida para a lixeira.
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
    </>
  );
};

export default PageSidebarItem;
