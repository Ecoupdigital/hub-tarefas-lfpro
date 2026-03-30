import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Users, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTeams, useAllTeamMembers, useCreateTeam, useDeleteTeam, useAddTeamMember, useRemoveTeamMember } from '@/hooks/useTeams';
import { useProfiles } from '@/hooks/useSupabaseData';

const TEAM_COLORS = [
  '#579BFC', '#FDAB3D', '#00C875', '#E2445C', '#A25DDC',
  '#FF642E', '#CAB641', '#9AADBD', '#66CCFF', '#7F5347',
];

interface TeamsManagerProps {
  workspaceId: string;
}

const TeamsManager: React.FC<TeamsManagerProps> = ({ workspaceId }) => {
  const { data: teams = [], isLoading } = useTeams(workspaceId);
  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);
  const { data: allMembers = [] } = useAllTeamMembers(teamIds);
  const { data: profiles = [] } = useProfiles();

  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  const getMembersForTeam = (teamId: string) =>
    allMembers.filter(m => m.team_id === teamId);

  const getProfileName = (userId: string) =>
    profiles.find(p => p.id === userId)?.name ?? 'Usuario';

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    createTeam.mutate(
      { workspaceId, name: newTeamName.trim(), color: newTeamColor },
      {
        onSuccess: () => {
          toast.success('Equipe criada com sucesso');
          setShowCreate(false);
          setNewTeamName('');
          setNewTeamColor(TEAM_COLORS[0]);
        },
        onError: () => toast.error('Erro ao criar equipe'),
      }
    );
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam.mutate(teamId, {
      onSuccess: () => {
        toast.success('Equipe excluida');
        setDeleteConfirm(null);
      },
      onError: () => toast.error('Erro ao excluir equipe'),
    });
  };

  const handleAddMember = () => {
    if (!addMemberTeamId || !selectedUserId) return;
    const existing = getMembersForTeam(addMemberTeamId);
    if (existing.some(m => m.user_id === selectedUserId)) {
      toast.error('Membro ja faz parte da equipe');
      return;
    }
    addMember.mutate(
      { teamId: addMemberTeamId, userId: selectedUserId },
      {
        onSuccess: () => {
          toast.success('Membro adicionado');
          setSelectedUserId('');
          setAddMemberTeamId(null);
        },
        onError: () => toast.error('Erro ao adicionar membro'),
      }
    );
  };

  const handleRemoveMember = (teamId: string, userId: string) => {
    removeMember.mutate(
      { teamId, userId },
      {
        onSuccess: () => toast.success('Membro removido'),
        onError: () => toast.error('Erro ao remover membro'),
      }
    );
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Carregando equipes...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />
          Equipes
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nova Equipe
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-density-cell">Nenhuma equipe criada</p>
          <p className="font-density-tiny mt-1">Crie equipes para organizar os membros do workspace</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map(team => {
            const members = getMembersForTeam(team.id);
            return (
              <Card key={team.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <CardTitle className="font-density-cell font-semibold">{team.name}</CardTitle>
                      <span className="font-density-tiny text-muted-foreground">({members.length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setAddMemberTeamId(team.id);
                          setSelectedUserId('');
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                        title="Adicionar membro"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(team.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir equipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="font-density-tiny text-muted-foreground italic">Sem membros</p>
                  ) : (
                    <div className="space-y-1.5">
                      {members.map(m => {
                        const name = getProfileName(m.user_id);
                        const initials = getInitials(name);
                        return (
                          <div key={m.user_id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-badge font-bold">
                                {initials}
                              </div>
                              <span className="font-density-cell text-foreground">{name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveMember(team.id, m.user_id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                              title="Remover membro"
                            >
                              <UserMinus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da equipe</Label>
              <Input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Ex: Design, Engenharia, Marketing"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTeam(); }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTeamColor(color)}
                    className={`w-7 h-7 rounded-full transition-all ${newTeamColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || createTeam.isPending}>
              Criar Equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={!!addMemberTeamId} onOpenChange={open => { if (!open) setAddMemberTeamId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecionar membro</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um membro..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(p => {
                      if (!addMemberTeamId) return true;
                      const existingMembers = getMembersForTeam(addMemberTeamId);
                      return !existingMembers.some(m => m.user_id === p.id);
                    })
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberTeamId(null)}>Cancelar</Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || addMember.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              A equipe e todos os seus membros serao removidos. Essa acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteTeam(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamsManager;
