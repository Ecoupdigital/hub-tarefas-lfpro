import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, History, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useRenamePage, useDeletePage } from '@/hooks/useCrudMutations';
import { toast } from 'sonner';
import type { AutoSaveStatus } from './usePageAutoSave';
import PageBreadcrumb from './PageBreadcrumb';

interface Props {
  pageId: string;
  initialTitle: string;
  saveStatus: AutoSaveStatus;
  onOpenHistory?: () => void;
  onOpenPermissions?: () => void;
  /**
   * Slot opcional renderizado a esquerda do indicador de save. Usado pela
   * Page.tsx para colocar o PagePresenceIndicator (avatars dos editores).
   */
  extraSlot?: React.ReactNode;
}

const STATUS_LABEL: Record<AutoSaveStatus, string> = {
  idle: '',
  pending: 'Editando...',
  saving: 'Salvando...',
  saved: 'Salvo',
  error: 'Erro ao salvar',
};

const PageHeader: React.FC<Props> = ({
  pageId,
  initialTitle,
  saveStatus,
  onOpenHistory,
  onOpenPermissions,
  extraSlot,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const renamePage = useRenamePage();
  const deletePage = useDeletePage();
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
    lastPersistedRef.current = initialTitle;
  }, [initialTitle]);

  const persistTitle = (next: string) => {
    const trimmed = next.trim();
    if (trimmed === '' || trimmed === lastPersistedRef.current) return;
    lastPersistedRef.current = trimmed;
    renamePage.mutate(
      { pageId, title: trimmed },
      {
        onError: () => toast.error('Erro ao renomear pagina'),
      }
    );
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setTitle(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistTitle(next);
    }, 500);
  };

  const handleDelete = () => {
    if (!confirm('Mover esta pagina para a lixeira?')) return;
    deletePage.mutate(pageId, {
      onSuccess: () => {
        toast.success('Pagina movida para lixeira');
        navigate('/');
      },
      onError: () => toast.error('Erro ao excluir pagina'),
    });
  };

  return (
    <div className="border-b border-border px-6 py-3 bg-background sticky top-0 z-10">
      <PageBreadcrumb pageId={pageId} />
      <div className="flex items-center gap-4 mt-1">
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={() => persistTitle(title)}
          placeholder="Pagina sem titulo"
          className="flex-1 bg-transparent border-0 outline-none font-heading text-xl font-bold placeholder:text-muted-foreground/60"
        />
        {extraSlot}
        <span
          className={`text-xs ${
            saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {STATUS_LABEL[saveStatus]}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenHistory} disabled={!onOpenHistory}>
              <History className="w-3.5 h-3.5 mr-2" />
              Historico de versoes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenPermissions} disabled={!onOpenPermissions}>
              <Shield className="w-3.5 h-3.5 mr-2" />
              Permissoes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Excluir pagina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default PageHeader;
