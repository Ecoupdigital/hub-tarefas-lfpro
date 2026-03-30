import React, { useState, useMemo } from 'react';
import { Search, Users, Shield, UserMinus, UserPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProfiles } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkspaceMemberManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  embedded?: boolean;
}

type WorkspaceRole = 'admin' | 'member';

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  member: 'Membro',
};

const useWorkspaceMembers = (workspaceId: string) =>
  useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

const useSetWorkspaceRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace-members', vars.workspaceId] });
    },
  });
};

const useAddWorkspaceMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace-members', vars.workspaceId] });
    },
  });
};

const useRemoveWorkspaceMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace-members', vars.workspaceId] });
    },
  });
};

const WorkspaceMemberManager: React.FC<WorkspaceMemberManagerProps> = ({ open, onOpenChange, workspaceId, embedded = false }) => {
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: wsMembers = [] } = useWorkspaceMembers(workspaceId);
  const setRole = useSetWorkspaceRole();
  const addMember = useAddWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();

  const [searchQuery, setSearchQuery] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  const isAdmin = useMemo(() => {
    return wsMembers.some(m => m.user_id === user?.id && m.role === 'admin');
  }, [wsMembers, user]);

  const members = useMemo(() => {
    return wsMembers.map(m => {
      const profile = profiles.find(p => p.id === m.user_id);
      return {
        userId: m.user_id,
        name: profile?.name ?? 'Usuario desconhecido',
        email: profile?.email ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        role: (m.role || 'member') as WorkspaceRole,
      };
    });
  }, [wsMembers, profiles]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const nonMembers = useMemo(() => {
    const memberIds = new Set(wsMembers.map(m => m.user_id));
    return profiles.filter(p => !memberIds.has(p.id));
  }, [profiles, wsMembers]);

  const filteredNonMembers = useMemo(() => {
    if (!addSearch.trim()) return nonMembers;
    const q = addSearch.toLowerCase();
    return nonMembers.filter(
      p => (p.name ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
    );
  }, [nonMembers, addSearch]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleRoleChange = (userId: string, newRole: WorkspaceRole) => {
    setRole.mutate(
      { workspaceId, userId, role: newRole },
      {
        onSuccess: () => toast.success('Permissao atualizada'),
        onError: () => toast.error('Erro ao atualizar permissao'),
      }
    );
  };

  const handleRemoveMember = (userId: string) => {
    if (userId === user?.id) {
      toast.error('Voce nao pode remover a si mesmo');
      return;
    }
    removeMember.mutate(
      { workspaceId, userId },
      {
        onSuccess: () => toast.success('Membro removido'),
        onError: () => toast.error('Erro ao remover membro'),
      }
    );
  };

  const handleAddMember = (userId: string) => {
    addMember.mutate(
      { workspaceId, userId, role: 'member' },
      {
        onSuccess: () => {
          toast.success('Membro adicionado');
          setAddSearch('');
        },
        onError: () => toast.error('Erro ao adicionar membro'),
      }
    );
  };

  const content = (
        <div className="space-y-4">
          {/* Member count + add button */}
          <div className="flex items-center justify-between">
            <span className="font-density-cell text-muted-foreground">
              {members.length} membro{members.length !== 1 ? 's' : ''}
            </span>
            {isAdmin && (
              <button
                onClick={() => setAddMode(!addMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-density-cell bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {addMode ? 'Cancelar' : 'Adicionar'}
              </button>
            )}
          </div>

          {/* Add member panel */}
          {addMode && isAdmin && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Buscar usuario para adicionar..."
                  className="pl-8 h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredNonMembers.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddMember(p.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-badge font-bold flex-shrink-0">
                      {getInitials(p.name ?? '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-density-cell text-foreground truncate">{p.name}</p>
                      <p className="font-density-tiny text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <UserPlus className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </button>
                ))}
                {filteredNonMembers.length === 0 && (
                  <p className="font-density-cell text-muted-foreground text-center py-2">
                    Nenhum usuario encontrado
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Search members */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar membros..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Member list */}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredMembers.map(member => (
              <div
                key={member.userId}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-tiny font-bold flex-shrink-0">
                  {getInitials(member.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-density-cell font-medium text-foreground truncate">
                    {member.name}
                    {member.userId === user?.id && (
                      <span className="text-muted-foreground ml-1">(voce)</span>
                    )}
                  </p>
                  <p className="font-density-tiny text-muted-foreground truncate">{member.email}</p>
                </div>

                {isAdmin && member.userId !== user?.id ? (
                  <div className="flex items-center gap-1">
                    <Select
                      value={member.role}
                      onValueChange={val => handleRoleChange(member.userId, val as WorkspaceRole)}
                    >
                      <SelectTrigger className="h-7 w-[100px] font-density-tiny">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membro</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover membro"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 font-density-tiny text-muted-foreground">
                    <Shield className="w-3 h-3" />
                    <span>{ROLE_LABELS[member.role] ?? member.role}</span>
                  </div>
                )}
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <p className="font-density-cell text-muted-foreground text-center py-4">
                Nenhum membro encontrado
              </p>
            )}
          </div>
        </div>
  );

  if (embedded) return content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Membros do Workspace
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceMemberManager;
