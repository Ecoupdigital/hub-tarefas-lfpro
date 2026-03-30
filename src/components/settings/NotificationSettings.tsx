import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, CheckSquare, AlertTriangle, Calendar, Users, Monitor, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'lfpro-notification-settings';

interface NotificationConfig {
  email: boolean;
  dailyDigest: boolean;
  mentions: boolean;
  taskAssignment: boolean;
  statusChanges: boolean;
  dueDates: boolean;
  newMembers: boolean;
  desktopNotifications: boolean;
  notificationSound: boolean;
}

const DEFAULT_SETTINGS: NotificationConfig = {
  email: true,
  dailyDigest: false,
  mentions: true,
  taskAssignment: true,
  statusChanges: true,
  dueDates: true,
  newMembers: false,
  desktopNotifications: true,
  notificationSound: true,
};

const loadSettings = (): NotificationConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_SETTINGS;
};

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, label, description, checked, onCheckedChange, id }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <label htmlFor={id} className="font-density-cell text-foreground cursor-pointer select-none">
          {label}
        </label>
        {description && (
          <p className="font-density-tiny text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="flex-shrink-0 ml-4"
    />
  </div>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div>
    <h2 className="font-medium text-sm text-foreground mb-1">{title}</h2>
    <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
      {children}
    </div>
  </div>
);

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationConfig>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const toggle = (key: keyof NotificationConfig) => (checked: boolean) => {
    setSettings(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Notificacoes</h1>
        <p className="font-density-tiny text-muted-foreground mt-1">
          Gerencie como e quando voce recebe notificacoes.
        </p>
      </div>

      <Section title="Email">
        <SettingRow
          id="notif-email"
          icon={<Mail className="w-4 h-4" />}
          label="Notificacoes por email"
          description="Receba atualizacoes importantes por email"
          checked={settings.email}
          onCheckedChange={toggle('email')}
        />
        <SettingRow
          id="notif-daily-digest"
          icon={<Mail className="w-4 h-4" />}
          label="Digest diario"
          description="Resumo diario de todas as atividades"
          checked={settings.dailyDigest}
          onCheckedChange={toggle('dailyDigest')}
        />
      </Section>

      <Section title="Atividades">
        <SettingRow
          id="notif-mentions"
          icon={<MessageSquare className="w-4 h-4" />}
          label="Mencoes e respostas"
          description="Quando alguem te menciona ou responde"
          checked={settings.mentions}
          onCheckedChange={toggle('mentions')}
        />
        <SettingRow
          id="notif-task-assignment"
          icon={<CheckSquare className="w-4 h-4" />}
          label="Atribuicao de tarefas"
          description="Quando uma tarefa e atribuida a voce"
          checked={settings.taskAssignment}
          onCheckedChange={toggle('taskAssignment')}
        />
        <SettingRow
          id="notif-status-changes"
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Mudancas de status"
          description="Quando o status de um item e alterado"
          checked={settings.statusChanges}
          onCheckedChange={toggle('statusChanges')}
        />
        <SettingRow
          id="notif-due-dates"
          icon={<Calendar className="w-4 h-4" />}
          label="Datas de vencimento"
          description="Lembretes de itens com prazo proximo"
          checked={settings.dueDates}
          onCheckedChange={toggle('dueDates')}
        />
        <SettingRow
          id="notif-new-members"
          icon={<Users className="w-4 h-4" />}
          label="Novos membros"
          description="Quando alguem entra no workspace"
          checked={settings.newMembers}
          onCheckedChange={toggle('newMembers')}
        />
      </Section>

      <Section title="Desktop">
        <SettingRow
          id="notif-desktop"
          icon={<Monitor className="w-4 h-4" />}
          label="Notificacoes desktop"
          description="Exibir notificacoes no sistema operacional"
          checked={settings.desktopNotifications}
          onCheckedChange={toggle('desktopNotifications')}
        />
        <SettingRow
          id="notif-sound"
          icon={<Volume2 className="w-4 h-4" />}
          label="Som de notificacao"
          description="Reproduzir som ao receber notificacoes"
          checked={settings.notificationSound}
          onCheckedChange={toggle('notificationSound')}
        />
      </Section>
    </div>
  );
};

export default NotificationSettings;
