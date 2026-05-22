import React, { useState, useEffect, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Layout } from 'lucide-react';
import { useAllBoards, useWorkspaces } from '@/hooks/useSupabaseData';

interface SelectedBoard {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

interface BoardPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (board: SelectedBoard) => void;
}

/**
 * Picker de boards para inserir como bloco embed numa pagina.
 *
 * Abre como dialog modal (slash menu nao tem ancora DOM persistente).
 * Lista boards acessiveis ao usuario (RLS do Supabase ja filtra via
 * `can_access_board`). Mostra o workspace ao lado para desambiguar
 * boards de mesmo nome em workspaces diferentes.
 */
const BoardPickerPopover: React.FC<BoardPickerPopoverProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const [query, setQuery] = useState('');

  // Reseta query quando o dialog fecha
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const { data: boards = [], isLoading } = useAllBoards();
  const { data: workspaces = [] } = useWorkspaces();

  // Mapa workspace_id -> nome para mostrar como contexto secundario
  const workspaceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ws of workspaces) {
      map.set(ws.id, ws.name);
    }
    return map;
  }, [workspaces]);

  // Filtro client-side (boards eh ate poucas centenas; sem necessidade de query server-side)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards.slice(0, 50);
    return boards
      .filter((b) => {
        const name = b.name.toLowerCase();
        const wsName = (workspaceNameById.get(b.workspace_id ?? '') ?? '').toLowerCase();
        return name.includes(q) || wsName.includes(q);
      })
      .slice(0, 50);
  }, [boards, query, workspaceNameById]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar board por nome..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!isLoading && filtered.length === 0 && (
          <CommandEmpty>Nenhum board encontrado</CommandEmpty>
        )}
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
        )}
        {filtered.length > 0 && (
          <CommandGroup heading="Boards">
            {filtered.map((board) => {
              const workspaceName =
                workspaceNameById.get(board.workspace_id ?? '') ?? 'Workspace';
              return (
                <CommandItem
                  key={board.id}
                  value={`${board.name} ${workspaceName} ${board.id}`}
                  onSelect={() => {
                    onSelect({
                      id: board.id,
                      name: board.name,
                      workspaceId: board.workspace_id ?? '',
                      workspaceName,
                    });
                    onOpenChange(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 truncate flex-1">
                    <Layout className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">{board.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {workspaceName}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default BoardPickerPopover;
