import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, UserPlus, Shield } from 'lucide-react';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  usePermissions,
  useSetBoardPermission,
  useRemoveBoardPermission,
} from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'member', label: 'Membro' },
  { value: 'viewer', label: 'Visualizador' },
];

const BoardPermissionsPanel: React.FC<Props> = ({ open, onOpenChange, boardId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: permissions = [], isLoading } = usePermissions(boardId);
  const { data: profiles = [] } = useProfiles();
  const setPermission = useSetBoardPermission();
  const removePermission = useRemoveBoardPermission();

  const permissionUserIds = permissions.map((p: any) => p.user_id);

  const availableUsers = profiles.filter(
    (p: any) =>
      !permissionUserIds.includes(p.id) &&
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getProfile = (userId: string) =>
    profiles.find((p: any) => p.id === userId);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleAddUser = (userId: string) => {
    setPermission.mutate(
      { boardId, userId, role: 'editor' as const },
      {
        onSuccess: () => {
          toast.success('Membro adicionado');
          setSearchTerm('');
          setShowAddUser(false);
        },
        onError: () => toast.error('Erro ao adicionar membro'),
      }
    );
  };

  const handleUpdateRole = (userId: string, role: string) => {
    setPermission.mutate(
      { boardId, userId, role: role as 'admin' | 'editor' | 'member' | 'viewer' },
      {
        onSuccess: () => toast.success('Permissao atualizada'),
        onError: () => toast.error('Erro ao atualizar permissao'),
      }
    );
  };

  const handleRemove = (userId: string) => {
    removePermission.mutate(
      { boardId, userId },
      {
        onSuccess: () => toast.success('Membro removido'),
        onError: () => toast.error('Erro ao remover membro'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissoes do Board
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member section */}
          {showAddUser ? (
            <div className="space-y-2">
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <ScrollArea className="max-h-40">
                <div className="space-y-1">
                  {availableUsers.length === 0 && searchTerm && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      Nenhum usuario encontrado
                    </p>
                  )}
                  {availableUsers.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user.id)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddUser(false);
                  setSearchTerm('');
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddUser(true)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-2" />
              Adicionar membro
            </Button>
          )}

          {/* Members list */}
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {isLoading && (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {permissions.map((perm: any) => {
                const profile = getProfile(perm.user_id);
                return (
                  <div
                    key={perm.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md border"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(profile?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {profile?.name || 'Usuario'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile?.email}
                      </p>
                    </div>
                    <Select
                      value={perm.role}
                      onValueChange={(val) => handleUpdateRole(perm.user_id, val)}
                    >
                      <SelectTrigger className="w-[130px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(perm.user_id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
              {!isLoading && permissions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro adicionado a este board
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoardPermissionsPanel;
