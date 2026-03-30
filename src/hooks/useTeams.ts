import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
}

export const useTeams = (workspaceId: string | null | undefined) =>
  useQuery({
    queryKey: ['teams', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });

export const useTeamMembers = (teamId: string | null | undefined) =>
  useQuery({
    queryKey: ['team_members', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId!);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

export const useAllTeamMembers = (teamIds: string[]) =>
  useQuery({
    queryKey: ['all_team_members', teamIds.sort().join(',')],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .in('team_id', teamIds);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      color,
    }: {
      workspaceId: string;
      name: string;
      color: string;
    }) => {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          workspace_id: workspaceId,
          name,
          color,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

export const useDeleteTeam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      // Delete team members first
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);
      if (membersError) throw membersError;

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['all_team_members'] });
    },
  });
};

export const useAddTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .insert({ team_id: teamId, user_id: userId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['all_team_members'] });
    },
  });
};

export const useRemoveTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['all_team_members'] });
    },
  });
};
