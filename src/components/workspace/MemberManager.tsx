import React, { useState, useMemo } from 'react';
import { Search, Users, Shield, X, UserMinus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  usePermissions, useCanAdmin, useSetBoardPermission,
  useRemoveBoardPermission, BoardRole,
} from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import InviteModal from './InviteModal';

interface MemberManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

const ROLE_LABELS: Record<BoardRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  member: 'Membro',
  viewer: 'Visualizador',
};

const MemberManager: React.FC<MemberManagerProps> = ({ open, onOpenChange, boardId }) => {
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: permissions = [] } = usePermissions(boardId);
  const isAdmin = useCanAdmin(boardId);
  const setPermission = useSetBoardPermission();
  const removePermission = useRemoveBoardPermission();

  const [searchQuery, setSearchQuery] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  // Build a list of members with their roles
  const members = useMemo(() => {
    return permissions.map((perm) => {
      const profile = profiles.find((p) => p.id === perm.user_id);
      return {
        userId: perm.user_id,
        name: profile?.name ?? 'Usuario desconhecido',
        email: profile?.email ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        role: perm.role as BoardRole,
      };
    });
  }, [permissions, profiles]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleRoleChange = (userId: string, newRole: BoardRole) => {
    setPermission.mutate(
      { boardId, userId, role: newRole },
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
    removePermission.mutate(
      { boardId, userId },
      {
        onSuccess: () => toast.success('Membro removido'),
        onError: () => toast.error('Erro ao remover membro'),
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membros e permissoes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Member count + invite button */}
            <div className="flex items-center justify-between">
              <span className="font-density-cell text-muted-foreground">
                {members.length} membro{members.length !== 1 ? 's' : ''}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="px-3 py-1.5 rounded-md font-density-cell bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                >
                  Convidar
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar membros..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Member list */}
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-tiny font-bold flex-shrink-0">
                    {getInitials(member.name)}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-density-cell font-medium text-foreground truncate">
                      {member.name}
                      {member.userId === user?.id && (
                        <span className="text-muted-foreground ml-1">(voce)</span>
                      )}
                    </p>
                    <p className="font-density-tiny text-muted-foreground truncate">{member.email}</p>
                  </div>

                  {/* Role selector */}
                  {isAdmin && member.userId !== user?.id ? (
                    <div className="flex items-center gap-1">
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.userId, val as BoardRole)}
                      >
                        <SelectTrigger className="h-7 w-[120px] font-density-tiny">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
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
        </DialogContent>
      </Dialog>

      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} boardId={boardId} />
    </>
  );
};

export default MemberManager;
