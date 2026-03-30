import React, { useState } from 'react';
import { Shield, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBoardAuditLog } from '@/hooks/useAuditLog';
import { useProfiles } from '@/hooks/useSupabaseData';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatActivityAction } from '@/utils/formatActivityAction';
import type { ActivityLogEntry } from '@/hooks/useActivityLog';

interface AuditLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columns?: Array<{ id: string; title: string; type?: string }>;
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'Todas as acoes' },
  { value: 'item_created', label: 'Item criado' },
  { value: 'column_value_changed', label: 'Valor alterado' },
  { value: 'item_moved', label: 'Item movido' },
  { value: 'comment_added', label: 'Comentario adicionado' },
  { value: 'item_deleted', label: 'Item excluido' },
];

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

const AuditLogModal: React.FC<AuditLogModalProps> = ({ open, onOpenChange, boardId, columns = [] }) => {
  const [filterAction, setFilterAction] = useState('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useBoardAuditLog(open ? boardId : null, {
    action: filterAction !== 'all' ? filterAction : undefined,
  });

  const { data: profiles = [] } = useProfiles();

  const allEntries: ActivityLogEntry[] = (data?.pages ?? []).flatMap((p) => p.items as ActivityLogEntry[]);

  const getProfileName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.name ?? 'Usuario';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Log de Auditoria do Board
          </DialogTitle>
        </DialogHeader>

        {/* Filtro de acao */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Filtrar por:</span>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-7 w-[200px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de entradas */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Carregando log de auditoria...
            </div>
          )}

          {!isLoading && allEntries.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma entrada encontrada no log de auditoria.
              <br />
              <span className="text-[10px]">
                Apenas administradores do workspace tem acesso a este log.
              </span>
            </div>
          )}

          {allEntries.map((entry) => {
            const isAutomation =
              (entry.metadata as Record<string, unknown> | null)?.triggered_by === 'automation';
            const userName = isAutomation ? 'Automacao' : getProfileName(entry.user_id);
            const initials = getInitials(userName);
            const description = formatActivityAction(entry, columns);
            const timeAgo = formatRelativeTime(entry.created_at);

            return (
              <div key={entry.id} className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
                {/* Avatar */}
                {isAutomation ? (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-[10px]">
                    ⚙
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                    {initials}
                  </div>
                )}

                {/* Conteudo */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{userName}</span>{' '}
                    <span className="text-muted-foreground">{description}</span>
                  </p>
                  {entry.item_id && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Item ID: {entry.item_id}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
                </div>
              </div>
            );
          })}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <ChevronDown className="w-3 h-3" />
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuditLogModal;
