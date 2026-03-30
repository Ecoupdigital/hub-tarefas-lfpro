import React from 'react';
import { useActivityLog, ActivityLogEntry } from '@/hooks/useActivityLog';
import { useProfiles } from '@/hooks/useSupabaseData';
import { Activity } from 'lucide-react';

interface ActivityWidgetProps {
  boardId: string;
  limit?: number;
}

const ACTION_LABELS: Record<string, string> = {
  item_created: 'criou um item',
  item_updated: 'atualizou um item',
  status_changed: 'alterou o status',
  item_deleted: 'excluiu um item',
  item_moved: 'moveu um item',
  column_value_changed: 'alterou um valor',
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}sem`;
}

function buildDescription(entry: ActivityLogEntry): string {
  const base = ACTION_LABELS[entry.action] ?? entry.action;
  const meta = entry.metadata as Record<string, any> | null;

  if (entry.action === 'status_changed' && entry.old_value && entry.new_value) {
    return `alterou status: "${entry.old_value}" -> "${entry.new_value}"`;
  }
  if (entry.action === 'column_value_changed' && meta?.column_name) {
    return `alterou "${meta.column_name}"`;
  }
  if (entry.action === 'item_created' && meta?.item_name) {
    return `criou "${meta.item_name}"`;
  }
  if (entry.action === 'item_deleted' && meta?.item_name) {
    return `excluiu "${meta.item_name}"`;
  }

  return base;
}

const ActivityWidget: React.FC<ActivityWidgetProps> = ({ boardId, limit = 20 }) => {
  const { data: activities = [] } = useActivityLog(boardId, limit);
  const { data: profiles = [] } = useProfiles();

  const getProfileName = (userId: string) =>
    profiles.find(p => p.id === userId)?.name ?? 'Usuario';

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
        <Activity className="w-6 h-6 mb-1 opacity-40" />
        <p className="font-density-tiny">Nenhuma atividade</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 overflow-auto max-h-[300px] p-1">
      {activities.slice(0, limit).map(entry => {
        const userName = getProfileName(entry.user_id);
        const initials = getInitials(userName);
        const description = buildDescription(entry);
        const timeAgo = formatRelativeTime(entry.created_at);

        return (
          <div key={entry.id} className="flex items-start gap-2 py-1">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0" style={{ fontSize: '8px', fontWeight: 700 }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-density-tiny text-foreground truncate">
                <span className="font-medium">{userName}</span>{' '}
                <span className="text-muted-foreground">{description}</span>
              </p>
            </div>
            <span className="font-density-tiny text-muted-foreground flex-shrink-0">{timeAgo}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityWidget;
