import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText, CheckCircle2, XCircle, Filter, Calendar, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import { useAutomations } from '@/hooks/useAutomations';
import {
  useAllAutomationLogs,
  useAutomationLogsForAutomation,
} from '@/hooks/useAutomationRecipes';

interface AutomationLogsProps {
  automationId?: string | null;
}

const AutomationLogs: React.FC<AutomationLogsProps> = ({ automationId }) => {
  const { activeBoard } = useApp();
  const boardId = activeBoard?.id ?? null;

  const { data: allLogs = [] } = useAllAutomationLogs(
    automationId ? null : boardId
  );
  const { data: specificLogs = [] } = useAutomationLogsForAutomation(
    automationId ?? null
  );
  const { data: automations = [] } = useAutomations(boardId);

  const rawLogs = automationId ? specificLogs : allLogs;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [automationFilter, setAutomationFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const logs = useMemo(() => {
    let result = rawLogs.map((log: any) => ({
      ...log,
      automation_name:
        log.automation_name ||
        automations.find((a) => a.id === log.automation_id)?.name ||
        'Desconhecida',
    }));

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }

    if (automationFilter !== 'all') {
      result = result.filter((l) => l.automation_id === automationFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(
        (l) => new Date(l.created_at) >= from
      );
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(
        (l) => new Date(l.created_at) <= to
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.automation_name?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          JSON.stringify(l.details)?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rawLogs, statusFilter, automationFilter, dateFrom, dateTo, search, automations]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-primary" />
        <span className="font-density-cell font-medium text-foreground">
          Log de execucoes
        </span>
        <span className="font-density-badge text-muted-foreground">
          ({logs.length})
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="h-7 text-xs pl-7"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs w-[120px]">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>

        {!automationId && (
          <Select value={automationFilter} onValueChange={setAutomationFilter}>
            <SelectTrigger className="h-7 text-xs w-[160px]">
              <SelectValue placeholder="Automacao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {automations.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 text-xs bg-background border border-input rounded-md px-2"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 text-xs bg-background border border-input rounded-md px-2"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-border rounded-lg">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 font-density-header font-medium text-muted-foreground">
                Data/Hora
              </th>
              <th className="px-3 py-2 font-density-header font-medium text-muted-foreground">
                Automacao
              </th>
              <th className="px-3 py-2 font-density-header font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-2 font-density-header font-medium text-muted-foreground">
                Detalhes
              </th>
              <th className="px-3 py-2 font-density-header font-medium text-muted-foreground">
                Item
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 font-density-cell text-muted-foreground"
                >
                  Nenhum log encontrado
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const date = parseISO(log.created_at);
                const isSuccess = log.status === 'success';
                const details =
                  typeof log.details === 'object'
                    ? log.details?.message || JSON.stringify(log.details)
                    : String(log.details || '');

                return (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2 font-density-cell text-foreground whitespace-nowrap">
                      {format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2 font-density-cell text-foreground">
                      {(log as any).automation_name}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-density-badge font-medium ${
                          isSuccess
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {isSuccess ? 'Sucesso' : 'Erro'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-density-cell text-muted-foreground max-w-[200px] truncate">
                      {details}
                    </td>
                    <td className="px-3 py-2 font-density-cell text-muted-foreground">
                      {log.item_id ? log.item_id.slice(0, 8) + '...' : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AutomationLogs;
