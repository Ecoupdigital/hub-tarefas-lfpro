import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Slack,
  Calendar,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useSlackIntegration,
  useSaveSlackIntegration,
  useToggleSlackIntegration,
  useIntegrationLogs,
  testSlackConnection,
  type IntegrationLog,
} from '@/hooks/useIntegrations';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/context/AppContext';

interface IntegrationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  workspaceId: string;
}

// ---- Slack Section ----

interface SlackSectionProps {
  workspaceId: string;
}

const SlackSection: React.FC<SlackSectionProps> = ({ workspaceId }) => {
  const { data: slackIntegration, isLoading } = useSlackIntegration(workspaceId);
  const saveSlack = useSaveSlackIntegration();
  const toggleSlack = useToggleSlackIntegration();
  const { data: logs = [], refetch: refetchLogs } = useIntegrationLogs(
    slackIntegration?.id ?? null,
    5
  );

  const [webhookUrl, setWebhookUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Populate form when integration loads (only once, not on every render)
  React.useEffect(() => {
    if (slackIntegration && !isDirty) {
      const config = slackIntegration.config as Record<string, unknown>;
      // Show a masked placeholder if URL exists; don't expose the actual URL
      const storedUrl = config?.webhook_url as string | undefined;
      if (storedUrl) {
        // Mask the URL: show protocol + first 20 chars + ***
        const masked = storedUrl.length > 30
          ? storedUrl.slice(0, 40) + '...'
          : storedUrl;
        setWebhookUrl(masked);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slackIntegration?.id]);

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Informe a URL do webhook do Slack');
      return;
    }

    // Validate it's a proper URL
    try {
      new URL(webhookUrl.trim());
    } catch {
      toast.error('URL invalida. Use o formato https://hooks.slack.com/services/...');
      return;
    }

    try {
      await saveSlack.mutateAsync({
        workspaceId,
        webhookUrl: webhookUrl.trim(),
        isActive: slackIntegration?.is_active ?? true,
        existingId: slackIntegration?.id,
      });
      toast.success('Configuracao do Slack salva');
      setIsDirty(false);
    } catch (err) {
      toast.error('Erro ao salvar configuracao do Slack');
      console.error(err);
    }
  };

  const handleToggle = async () => {
    if (!slackIntegration) return;
    try {
      await toggleSlack.mutateAsync({
        id: slackIntegration.id,
        isActive: !slackIntegration.is_active,
        workspaceId,
      });
      toast.success(slackIntegration.is_active ? 'Slack desativado' : 'Slack ativado');
    } catch {
      toast.error('Erro ao alterar status da integracao Slack');
    }
  };

  const handleTest = async () => {
    if (!slackIntegration?.id) {
      toast.error('Salve a configuracao antes de testar');
      return;
    }
    setIsTesting(true);
    try {
      const result = await testSlackConnection(workspaceId);
      if (result.success) {
        toast.success('Conexao com Slack testada com sucesso!');
      } else {
        toast.error(`Falha no teste: ${result.error || 'Erro desconhecido'}`);
      }
      // Refresh logs after test
      setTimeout(() => refetchLogs(), 1500);
    } catch (err) {
      toast.error('Erro ao testar conexao');
    } finally {
      setIsTesting(false);
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM HH:mm:ss", { locale: ptBR });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#4A154B] flex items-center justify-center">
            <Slack className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Slack</p>
            <p className="text-xs text-muted-foreground">Notificacoes de mudanca de status</p>
          </div>
        </div>
        <Switch
          checked={slackIntegration?.is_active ?? false}
          onCheckedChange={handleToggle}
          disabled={!slackIntegration || toggleSlack.isPending}
        />
      </div>

      {/* Configuration form */}
      <div className="space-y-3 pl-10">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            URL do Incoming Webhook do Slack
          </label>
          <div className="relative">
            <Input
              type={showUrl ? 'text' : 'password'}
              value={webhookUrl}
              onChange={e => { setWebhookUrl(e.target.value); setIsDirty(true); }}
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              className="h-8 text-xs pr-9"
            />
            <button
              type="button"
              onClick={() => setShowUrl(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showUrl ? 'Ocultar URL' : 'Mostrar URL'}
            >
              {showUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Crie um Incoming Webhook em api.slack.com/apps e cole a URL aqui.
            A URL nao e exibida nas respostas de API do cliente.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveSlack.isPending || !isDirty}
            className="h-7 text-xs"
          >
            {saveSlack.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !slackIntegration?.id}
            className="h-7 text-xs"
          >
            {isTesting ? (
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            ) : null}
            Testar conexao
          </Button>
        </div>

        {/* Execution logs */}
        {slackIntegration?.id && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Ultimas execucoes</p>
              <button
                onClick={() => refetchLogs()}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Atualizar logs"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            {isLoading ? (
              <div className="text-xs text-muted-foreground py-2">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">
                Nenhuma execucao registrada ainda.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log: IntegrationLog) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-1 border-b border-border/50 last:border-0"
                  >
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{log.event_type}</span>
                        <Badge
                          variant={log.status === 'success' ? 'default' : 'destructive'}
                          className="h-4 px-1 text-[10px]"
                        >
                          {log.status === 'success' ? 'Sucesso' : 'Erro'}
                        </Badge>
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-destructive truncate" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />
                        {formatLogDate(log.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Google Calendar Section (MVP: ICS export) ----

interface GoogleCalendarSectionProps {
  boardId: string;
}

const GoogleCalendarSection: React.FC<GoogleCalendarSectionProps> = ({ boardId }) => {
  const { activeBoard } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const generateICS = useCallback(() => {
    if (!activeBoard) return;

    setIsExporting(true);

    try {
      const dateColumns = activeBoard.columns.filter(c => c.type === 'date');
      const events: string[] = [];

      activeBoard.groups.forEach(group => {
        group.items.forEach(item => {
          dateColumns.forEach(col => {
            const cv = item.columnValues?.find(v => v.columnId === col.id);
            const rawDate = cv?.value;
            if (!rawDate) return;

            const dateStr = typeof rawDate === 'string' ? rawDate : null;
            if (!dateStr) return;

            // Parse: accept ISO dates (2024-01-15 or 2024-01-15T00:00:00Z)
            const parsed = new Date(dateStr);
            if (isNaN(parsed.getTime())) return;

            // Format as YYYYMMDD for all-day event
            const dtStamp = parsed.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const dtStart = parsed.toISOString().slice(0, 10).replace(/-/g, '');

            const summary = `${item.name} — ${col.title}`;
            const uid = `lfprotasksevent-${item.id}-${col.id}@lfpro.tasks`;

            events.push([
              'BEGIN:VEVENT',
              `UID:${uid}`,
              `DTSTAMP:${dtStamp}`,
              `DTSTART;VALUE=DATE:${dtStart}`,
              `SUMMARY:${summary.replace(/[,;\\]/g, '\\$&')}`,
              `DESCRIPTION:Board: ${activeBoard.name}\\nGrupo: ${group.title}`,
              'END:VEVENT',
            ].join('\r\n'));
          });
        });
      });

      if (events.length === 0) {
        toast.warning('Nenhum item com data encontrado neste board.');
        return;
      }

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//LFPro Tasks//LFPro Tasks//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:LFPro - ${activeBoard.name}`,
        'X-WR-TIMEZONE:America/Sao_Paulo',
        ...events,
        'END:VCALENDAR',
      ].join('\r\n');

      // Download the .ics file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lfpro-${activeBoard.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${events.length} evento(s) exportado(s) para .ics`);
    } catch (err) {
      console.error('Erro ao gerar ICS:', err);
      toast.error('Erro ao gerar arquivo de calendario');
    } finally {
      setIsExporting(false);
    }
  }, [activeBoard]);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-[#1a73e8] flex items-center justify-center">
          <Calendar className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Google Calendar</p>
          <p className="text-xs text-muted-foreground">Exportar itens com data como eventos</p>
        </div>
      </div>

      {/* ICS export description */}
      <div className="pl-10 space-y-3">
        <div className="bg-muted/50 rounded-md p-3 space-y-1">
          <p className="text-xs font-medium text-foreground">Exportacao via arquivo .ics (iCalendar)</p>
          <p className="text-xs text-muted-foreground">
            Todos os itens com colunas de data serao exportados como eventos.
            Importe o arquivo gerado no Google Calendar em{' '}
            <span className="font-mono text-xs">Configuracoes &rarr; Importar &amp; exportar</span>.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={generateICS}
          disabled={isExporting || !activeBoard}
          className="h-7 text-xs flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Gerando...' : 'Exportar itens com datas (.ics)'}
        </Button>

        <p className="text-xs text-muted-foreground/70">
          MVP: exportacao manual de arquivo .ics. Sincronizacao automatica via OAuth
          sera implementada em versao futura.
        </p>
      </div>
    </div>
  );
};

// ---- Main IntegrationsPanel ----

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({
  open,
  onOpenChange,
  boardId,
  workspaceId,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Configuracoes de Integracoes
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure integracoes externas para este workspace. Apenas admins podem ver e
            modificar estas configuracoes. Credenciais sao armazenadas com seguranca no servidor.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-6 py-2">
            {/* Slack */}
            <SlackSection workspaceId={workspaceId} />

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Google Calendar */}
            <GoogleCalendarSection boardId={boardId} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationsPanel;
