import React, { useState, useMemo } from 'react';
import {
  Shield, Users, Trash2, Download, AlertTriangle, Search,
  Clock, Lock, Monitor, Palette, UserCheck, UserX, Loader2,
  ChevronDown, UserPlus, Mail, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';
import AuditLogPanel from './AuditLogPanel';
import CustomRolesPanel from './CustomRolesPanel';
import PasswordPolicyPanel from './PasswordPolicyPanel';
import SessionManagement from './SessionManagement';
import BrandingSettings from './BrandingSettings';

type AdminTab = 'overview' | 'users' | 'audit' | 'roles' | 'password' | 'sessions' | 'branding';

const TAB_CONFIG: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Visao geral', icon: Shield },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'audit', label: 'Auditoria', icon: Clock },
  { id: 'roles', label: 'Papeis', icon: Shield },
  { id: 'password', label: 'Politica de senha', icon: Lock },
  { id: 'sessions', label: 'Sessoes', icon: Monitor },
  { id: 'branding', label: 'Marca', icon: Palette },
];

// User Management Tab
const UserManagementTab: React.FC = () => {
  const { data: profiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useProfiles();
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Load user roles AND statuses from profiles.preferences.is_active
  React.useEffect(() => {
    (async () => {
      setLoadingRoles(true);
      try {
        const { data, error } = await supabase.from('user_roles').select('*');
        if (!error && data) {
          const roleMap: Record<string, string> = {};
          data.forEach((r: any) => { roleMap[r.user_id] = r.role; });
          setUserRoles(roleMap);
        }
      } catch { /* ignore */ } finally {
        setLoadingRoles(false);
      }
    })();
  }, []);

  // Sync statuses from profiles.preferences.is_active
  React.useEffect(() => {
    if (!profiles.length) return;
    const statusMap: Record<string, boolean> = {};
    profiles.forEach((p: any) => {
      const prefs = p.preferences as any;
      statusMap[p.id] = prefs?.is_active !== false; // default: active
    });
    setUserStatuses(statusMap);
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    let result = profiles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      result = result.filter((p: any) => (userRoles[p.id] || 'member') === roleFilter);
    }
    return result;
  }, [profiles, searchQuery, roleFilter, userRoles]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const existing = userRoles[userId];
      if (existing) {
        await supabase.from('user_roles').update({ role: newRole } as any).eq('user_id', userId);
      } else {
        await supabase.from('user_roles').insert({ user_id: userId, role: newRole } as any);
      }
      setUserRoles((prev) => ({ ...prev, [userId]: newRole }));
      toast.success('Papel atualizado');
    } catch {
      toast.error('Erro ao atualizar papel');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const current = userStatuses[userId] !== undefined ? userStatuses[userId] : true;
    const newStatus = !current;
    try {
      const profile = profiles.find((p: any) => p.id === userId);
      const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: { ...currentPrefs, is_active: newStatus } })
        .eq('id', userId);
      if (error) throw error;
      setUserStatuses((prev) => ({ ...prev, [userId]: newStatus }));
      toast.success(newStatus ? 'Usuário reativado' : 'Usuário desativado');
    } catch {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleRemoveUser = async () => {
    if (!removeUserId) return;
    try {
      // Remove from all workspace memberships
      await supabase.from('workspace_members').delete().eq('user_id', removeUserId);
      // Remove from all board permissions
      await supabase.from('board_permissions').delete().eq('user_id', removeUserId);
      // Remove from user_roles
      await supabase.from('user_roles').delete().eq('user_id', removeUserId as any);
      // Mark profile as inactive (can't delete from Supabase Auth without server-side admin API)
      const profile = profiles.find((p: any) => p.id === removeUserId);
      const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
      await supabase
        .from('profiles')
        .update({ preferences: { ...currentPrefs, is_active: false } })
        .eq('id', removeUserId);
      setUserStatuses((prev) => ({ ...prev, [removeUserId]: false }));
      setUserRoles((prev) => { const n = { ...prev }; delete n[removeUserId]; return n; });
      toast.success('Usuário removido de todos os workspaces e boards');
      setRemoveUserId(null);
      refetchProfiles();
    } catch {
      toast.error('Erro ao remover usuário');
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: inviteEmail.trim(), name: inviteName.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Convite enviado para ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteName('');
      setShowInviteModal(false);
      refetchProfiles();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar convite');
    } finally {
      setInviteLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  if (profilesLoading || loadingRoles) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 bg-muted/30 rounded-md px-3 py-2 border border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
        >
          <option value="">Todos os papeis</option>
          <option value="admin">Admin</option>
          <option value="member">Membro</option>
          <option value="viewer">Visualizador</option>
          <option value="guest">Convidado</option>
        </select>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors whitespace-nowrap"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Convidar
        </button>
      </div>

      {/* Users table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left px-4 py-2.5 font-density-tiny font-semibold text-muted-foreground uppercase tracking-wider">
                Usuario
              </th>
              <th className="text-left px-4 py-2.5 font-density-tiny font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-2.5 font-density-tiny font-semibold text-muted-foreground uppercase tracking-wider">
                Papel
              </th>
              <th className="text-left px-4 py-2.5 font-density-tiny font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-2.5 font-density-tiny font-semibold text-muted-foreground uppercase tracking-wider">
                Membro desde
              </th>
              <th className="text-right px-4 py-2.5 font-density-tiny font-semibold text-muted-foreground uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProfiles.map((profile: any) => {
              const isActive =
                userStatuses[profile.id] !== undefined
                  ? userStatuses[profile.id]
                  : true;
              const role = userRoles[profile.id] || 'member';

              return (
                <tr
                  key={profile.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    !isActive ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {getInitials(profile.name || 'U')}
                        </div>
                      )}
                      <span className="font-density-cell font-medium text-foreground">
                        {profile.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-density-cell text-muted-foreground">
                      {profile.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                      className="px-2 py-1 rounded-md border border-border bg-background text-foreground text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Membro</option>
                      <option value="viewer">Visualizador</option>
                      <option value="guest">Convidado</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <UserCheck className="w-3 h-3" /> Ativo
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3" /> Inativo
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-density-tiny text-muted-foreground">
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString('pt-BR')
                        : '--'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleToggleStatus(profile.id)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          isActive
                            ? 'text-red-500 hover:bg-red-500/10'
                            : 'text-green-600 hover:bg-green-500/10'
                        }`}
                        title={isActive ? 'Desativar' : 'Reativar'}
                      >
                        {isActive ? 'Desativar' : 'Reativar'}
                      </button>
                      <button
                        onClick={() => setRemoveUserId(profile.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredProfiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground font-density-cell">
            Nenhum usuario encontrado
          </div>
        )}
      </div>

      <AlertDialog open={!!removeUserId} onOpenChange={() => setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário será removido de todos os workspaces e boards e marcado como inativo.
              Sua conta de autenticação é mantida, mas ele perderá todos os acessos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-density-cell font-semibold text-foreground">
                <UserPlus className="w-4 h-4" />
                Convidar usuario
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    type="email"
                    className="w-full pl-8 pr-3 py-2 rounded-md border border-border bg-background text-foreground font-density-cell outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInviteUser();
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nome (opcional)</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome do usuario"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground font-density-cell outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInviteUser();
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleInviteUser}
              disabled={inviteLoading || !inviteEmail.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-density-cell font-medium transition-colors disabled:opacity-50"
            >
              {inviteLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              {inviteLoading ? 'Enviando...' : 'Enviar convite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Overview Tab (original AdminSettings content)
const OverviewTab: React.FC = () => {
  const { workspaces, boards } = useApp();
  const { user } = useAuth();
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Fetch full board data for all boards
      const boardDetails = await Promise.all(
        boards.map(async (board: any) => {
          const [groupsRes, columnsRes, itemsRes, valuesRes] = await Promise.all([
            supabase.from('groups').select('*').eq('board_id', board.id).order('position'),
            supabase.from('columns').select('*').eq('board_id', board.id).order('position'),
            supabase.from('items').select('*').eq('board_id', board.id).order('position'),
            supabase.from('column_values').select('*').eq('board_id', board.id),
          ]);

          const items = (itemsRes.data ?? []).map((item: any) => {
            const itemValues = (valuesRes.data ?? []).filter((cv: any) => cv.item_id === item.id);
            const columnValues: Record<string, any> = {};
            itemValues.forEach((cv: any) => { columnValues[cv.column_id] = cv.value; });
            return { ...item, columnValues };
          });

          return {
            id: board.id,
            name: board.name,
            description: board.description,
            groups: groupsRes.data ?? [],
            columns: (columnsRes.data ?? []).map((c: any) => ({
              id: c.id, title: c.title, column_type: c.column_type, position: c.position,
            })),
            items,
          };
        })
      );

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { email: user?.email, id: user?.id },
        workspaces: workspaces.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
        })),
        boards: boardDetails,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lfpro-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dados exportados com sucesso');
    } catch {
      toast.error('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Stats */}
      <section className="mb-8">
        <h2 className="font-density-cell font-semibold text-foreground mb-3">
          Visao geral
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg border border-border p-4">
            <p className="font-density-tiny text-muted-foreground mb-1">Workspaces</p>
            <p className="text-2xl font-bold text-foreground">{workspaces.length}</p>
          </div>
          <div className="bg-muted/30 rounded-lg border border-border p-4">
            <p className="font-density-tiny text-muted-foreground mb-1">Boards</p>
            <p className="text-2xl font-bold text-foreground">{boards.length}</p>
          </div>
        </div>
      </section>

      {/* Account info */}
      <section className="mb-8">
        <h2 className="font-density-cell font-semibold text-foreground mb-3">
          Informacoes da conta
        </h2>
        <div className="bg-muted/20 rounded-lg border border-border divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-density-tiny text-muted-foreground">ID do usuario</span>
            <span className="font-density-tiny text-foreground font-mono truncate max-w-[200px]">
              {user?.id}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-density-tiny text-muted-foreground">E-mail</span>
            <span className="font-density-tiny text-foreground">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-density-tiny text-muted-foreground">Membro desde</span>
            <span className="font-density-tiny text-foreground">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('pt-BR')
                : '--'}
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="mb-8">
        <h2 className="font-density-cell font-semibold text-foreground mb-3">Acoes</h2>
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2.5 w-full px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-left disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 text-primary flex-shrink-0 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <div>
              <p className="font-density-cell font-medium text-foreground">
                Exportar dados
              </p>
              <p className="font-density-tiny text-muted-foreground">
                Baixar um arquivo JSON com todos os boards, itens e dados
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="font-density-cell font-semibold text-destructive mb-3">
          Zona de perigo
        </h2>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="font-density-tiny text-muted-foreground">
              As acoes abaixo sao irreversiveis. Tenha cuidado ao prosseguir.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteAccountDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors font-density-cell font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Excluir minha conta
          </button>
        </div>
      </section>

      <AlertDialog
        open={showDeleteAccountDialog}
        onOpenChange={setShowDeleteAccountDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao e irreversivel. Todos os seus dados, workspaces e boards serao
              excluidos permanentemente. Entre em contato com o suporte para prosseguir com
              a exclusao da conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteAccountDialog(false);
                toast.info(
                  'Entre em contato com o suporte para excluir sua conta.'
                );
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Admin</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users' && <UserManagementTab />}
      {activeTab === 'audit' && <AuditLogPanel />}
      {activeTab === 'roles' && <CustomRolesPanel />}
      {activeTab === 'password' && <PasswordPolicyPanel />}
      {activeTab === 'sessions' && <SessionManagement />}
      {activeTab === 'branding' && <BrandingSettings />}
    </div>
  );
};

export default AdminSettings;
