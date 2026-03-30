import React, { useState, useMemo } from 'react';
import { Activity, Filter, Settings } from 'lucide-react';
import { useItemActivityLog, useActivityLog, ActivityLogEntry } from '@/hooks/useActivityLog';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatActivityAction, isAutomationEntry } from '@/utils/formatActivityAction';

interface ActivityFeedProps {
  boardId: string;
  itemId?: string | null;
  limit?: number;
  /** Colunas do board para enriquecer descrições das ações */
  columns?: Array<{ id: string; title: string; type?: string }>;
}

// Re-export the type so other modules can import from here if needed
export type { ActivityLogEntry };
export type { ActivityAction } from '@/hooks/useActivityLog';

const ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas as acoes' },
  { value: 'item_created', label: 'Item criado' },
  { value: 'item_updated', label: 'Item atualizado' },
  { value: 'status_changed', label: 'Status alterado' },
  { value: 'item_deleted', label: 'Item excluido' },
  { value: 'item_moved', label: 'Item movido' },
  { value: 'column_value_changed', label: 'Valor alterado' },
  { value: 'comment_added', label: 'Comentario adicionado' },
];

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ boardId, itemId, limit = 50, columns = [] }) => {
  const { data: boardActivity = [] } = useActivityLog(itemId ? null : boardId, limit);
  const { data: itemActivity = [] } = useItemActivityLog(itemId ?? null);
  const { data: profiles = [] } = useProfiles();

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const activities = itemId ? itemActivity : boardActivity;

  const filteredActivities = useMemo(() => {
    if (actionFilter === 'all') return activities;
    return activities.filter((a) => a.action === actionFilter);
  }, [activities, actionFilter]);

  const visibleActivities = filteredActivities.slice(0, visibleCount);

  const getProfileName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.name ?? 'Usuario';

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Activity className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-xs">Nenhuma atividade registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtro por tipo de acao */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-7 w-[190px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="border-l-2 border-border ml-3 space-y-0">
        {visibleActivities.map((entry) => {
          const isAutomation = isAutomationEntry(entry);
          const userName = isAutomation ? 'Automacao' : getProfileName(entry.user_id);
          const initials = getInitials(userName);
          const description = formatActivityAction(entry, columns);
          const timeAgo = formatRelativeTime(entry.created_at);

          return (
            <div key={entry.id} className="relative pl-6 py-2">
              {/* Ponto na linha do tempo */}
              <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-primary/60" />

              <div className="flex items-start gap-2">
                {/* Avatar: engrenagem para automação, iniciais para humano */}
                {isAutomation ? (
                  <div
                    className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
                    title="Acao gerada por automacao"
                  >
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                    {initials}
                  </div>
                )}

                {/* Conteudo */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{userName}</span>
                    {isAutomation && (
                      <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
                        <Settings className="w-2.5 h-2.5" />
                        Automacao
                      </span>
                    )}{' '}
                    <span className="text-muted-foreground">{description}</span>
                  </p>

                  {/* Valores anterior e novo quando disponíveis */}
                  {(entry.action === 'column_value_changed' || entry.action === 'status_changed') &&
                    entry.old_value !== null && entry.old_value !== undefined &&
                    entry.new_value !== null && entry.new_value !== undefined && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 line-through max-w-[100px] truncate">
                          {typeof entry.old_value === 'object'
                            ? (entry.old_value?.label ?? JSON.stringify(entry.old_value))
                            : String(entry.old_value)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">→</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 max-w-[100px] truncate">
                          {typeof entry.new_value === 'object'
                            ? (entry.new_value?.label ?? JSON.stringify(entry.new_value))
                            : String(entry.new_value)}
                        </span>
                      </div>
                    )}

                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Carregar mais */}
      {visibleCount < filteredActivities.length && (
        <button
          onClick={() => setVisibleCount((c) => c + 20)}
          className="w-full text-center py-2 text-xs text-primary hover:underline"
        >
          Carregar mais ({filteredActivities.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
