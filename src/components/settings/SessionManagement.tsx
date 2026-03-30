import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionInfo {
  id: string;
  userAgent: string;
  lastActive: string;
  isCurrent: boolean;
  deviceType: 'desktop' | 'mobile' | 'unknown';
  browser: string;
  os: string;
}

function parseUserAgent(ua: string): { deviceType: 'desktop' | 'mobile' | 'unknown'; browser: string; os: string } {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const deviceType = isMobile ? 'mobile' : 'desktop';

  let browser = 'Navegador desconhecido';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edge/i.test(ua)) browser = 'Edge';

  let os = 'OS desconhecido';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';

  return { deviceType, browser, os };
}

const SessionManagement: React.FC = () => {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  useEffect(() => {
    if (!session) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('list-sessions');

        if (!error && data?.sessions?.length) {
          const mapped: SessionInfo[] = data.sessions.map((s: any) => {
            const ua = s.user_agent || navigator.userAgent;
            const parsed = parseUserAgent(ua);
            return {
              id: s.id,
              userAgent: ua,
              lastActive: s.last_sign_in_at || s.updated_at || new Date().toISOString(),
              isCurrent: s.is_current ?? true,
              ...parsed,
            };
          });
          setSessions(mapped);
        } else {
          // Fallback to current session info
          const ua = navigator.userAgent;
          const parsed = parseUserAgent(ua);
          setSessions([{
            id: session.access_token.slice(-8),
            userAgent: ua,
            lastActive: new Date().toISOString(),
            isCurrent: true,
            ...parsed,
          }]);
        }
      } catch {
        // Fallback to current session info
        const ua = navigator.userAgent;
        const parsed = parseUserAgent(ua);
        setSessions([{
          id: session.access_token.slice(-8),
          userAgent: ua,
          lastActive: new Date().toISOString(),
          isCurrent: true,
          ...parsed,
        }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const handleSignOutOtherSessions = async () => {
    setSigningOut(true);
    try {
      // Sign out from all sessions except current by using scope: 'others'
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      toast.success('Outras sessoes encerradas com sucesso');
      setShowSignOutDialog(false);
    } catch {
      toast.error('Erro ao encerrar outras sessoes');
    } finally {
      setSigningOut(false);
    }
  };

  const DeviceIcon = ({ type }: { type: string }) => {
    if (type === 'mobile') return <Smartphone className="w-5 h-5" />;
    if (type === 'desktop') return <Monitor className="w-5 h-5" />;
    return <Globe className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-density-cell font-semibold text-foreground">
            Gerenciamento de Sessoes
          </h3>
        </div>
        <button
          onClick={() => setShowSignOutDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Encerrar outras sessoes
        </button>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
              s.isCurrent
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card hover:bg-muted/20'
            }`}
          >
            <div
              className={`flex-shrink-0 ${
                s.isCurrent ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <DeviceIcon type={s.deviceType} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-density-cell font-medium text-foreground">
                  {s.browser} - {s.os}
                </p>
                {s.isCurrent && (
                  <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Sessao atual
                  </span>
                )}
              </div>
              <p className="font-density-tiny text-muted-foreground mt-0.5">
                Ativa agora
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-muted/20 rounded-lg border border-border">
        <p className="font-density-tiny text-muted-foreground">
          Se voce suspeita que alguem acessou sua conta, encerre todas as outras sessoes e
          altere sua senha imediatamente.
        </p>
      </div>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar outras sessoes?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os outros dispositivos conectados serao deslogados. Voce permanecera
              logado neste dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOutOtherSessions}
              disabled={signingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {signingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              ) : null}
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionManagement;
