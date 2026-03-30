import React, { useState, useMemo } from 'react';
import { Clock, Filter, User, ChevronDown, Loader2 } from 'lucide-react';
import { useAuditLog, AuditLogFilters } from '@/hooks/useAuditLog';
import { useProfiles } from '@/hooks/useSupabaseData';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  permission_change: 'Alterou permissao',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-500',
  update: 'text-blue-500',
  delete: 'text-red-500',
  permission_change: 'text-yellow-500',
};

const ENTITY_LABELS: Record<string, string> = {
  board: 'Board',
  item: 'Item',
  column: 'Coluna',
  group: 'Grupo',
  workspace: 'Workspace',
  user: 'Usuario',
  role: 'Papel',
};

const AuditLogPanel: React.FC = () => {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: profiles = [] } = useProfiles();

  const filters: AuditLogFilters = useMemo(() => {
    const f: AuditLogFilters = {};
    if (filterUser) f.userId = filterUser;
    if (filterAction) f.action = filterAction;
    if (filterDateStart) f.dateStart = filterDateStart;
    if (filterDateEnd) f.dateEnd = filterDateEnd + 'T23:59:59';
    return f;
  }, [filterUser, filterAction, filterDateStart, filterDateEnd]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAuditLog(filters);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const profileMap = useMemo(() => {
    const map: Record<string, { name: string; avatar_url: string | null }> = {};
    profiles.forEach((p: any) => {
      map[p.id] = { name: p.name, avatar_url: p.avatar_url };
    });
    return map;
  }, [profiles]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-density-cell font-semibold text-foreground">
            Log de Auditoria
          </h3>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/20 rounded-lg border border-border">
          <div>
            <label className="font-density-tiny text-muted-foreground block mb-1">
              Usuario
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm"
            >
              <option value="">Todos</option>
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-density-tiny text-muted-foreground block mb-1">
              Acao
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm"
            >
              <option value="">Todas</option>
              <option value="create">Criar</option>
              <option value="update">Atualizar</option>
              <option value="delete">Excluir</option>
              <option value="permission_change">Alterar permissao</option>
            </select>
          </div>
          <div>
            <label className="font-density-tiny text-muted-foreground block mb-1">
              Data inicio
            </label>
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm"
            />
          </div>
          <div>
            <label className="font-density-tiny text-muted-foreground block mb-1">
              Data fim
            </label>
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground font-density-cell">
          Nenhuma entrada no log de auditoria
        </div>
      ) : (
        <div className="space-y-0">
          {entries.map((entry: any, idx: number) => {
            const profile = profileMap[entry.user_id];
            const userName = profile?.name || 'Usuario desconhecido';
            const actionLabel = ACTION_LABELS[entry.action] || entry.action;
            const actionColor = ACTION_COLORS[entry.action] || 'text-muted-foreground';
            const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;

            return (
              <div
                key={entry.id || idx}
                className="flex items-start gap-3 py-3 border-b border-border last:border-b-0"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={userName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {getInitials(userName)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-density-cell text-foreground">
                    <span className="font-semibold">{userName}</span>{' '}
                    <span className={actionColor}>{actionLabel}</span>{' '}
                    <span className="text-muted-foreground">{entityLabel}</span>
                    {entry.entity_id && (
                      <span className="text-muted-foreground/60 ml-1 font-mono text-xs">
                        ({entry.entity_id.slice(0, 8)})
                      </span>
                    )}
                  </p>
                  {entry.metadata && typeof entry.metadata === 'object' && (
                    <p className="font-density-tiny text-muted-foreground mt-0.5 truncate">
                      {JSON.stringify(entry.metadata).slice(0, 120)}
                    </p>
                  )}
                  <p className="font-density-tiny text-muted-foreground/60 mt-0.5">
                    {formatDistanceToNow(new Date(entry.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;
