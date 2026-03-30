import React from 'react';
import { Bell, MessageSquare, Users, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeIconMap: Record<string, React.ReactNode> = {
  message: <MessageSquare className="w-4 h-4 text-blue-500" />,
  team: <Users className="w-4 h-4 text-violet-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  info: <Info className="w-4 h-4 text-sky-500" />,
};

const getIcon = (type: string) => typeIconMap[type] ?? <Bell className="w-4 h-4 text-muted-foreground" />;

const NotificationItem: React.FC<{
  notification: Notification;
  onRead: (id: string) => void;
}> = ({ notification, onRead }) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <button
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
      }}
      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-density-cell truncate ${!notification.is_read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
            {notification.title}
          </span>
          {!notification.is_read && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="font-density-cell text-muted-foreground mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <span className="font-density-tiny text-muted-foreground/70 mt-0.5 block">{timeAgo}</span>
      </div>
    </button>
  );
};

const NotificationBell: React.FC = () => {
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const displayNotifications = notifications.slice(0, 20);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground transition-colors relative"
          title="Notificacoes"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-1 leading-none pointer-events-none select-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <span className="font-density-cell font-semibold text-foreground">Notificacoes</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="font-density-cell text-primary hover:underline font-medium"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <span className="font-density-cell">Nenhuma notificacao</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {displayNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markAsRead.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
