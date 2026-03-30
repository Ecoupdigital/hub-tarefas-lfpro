import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CustomRolePermissions {
  can_create_board: boolean;
  can_invite: boolean;
  can_delete: boolean;
  can_manage_automations: boolean;
  can_manage_integrations: boolean;
  can_export: boolean;
  can_manage_members: boolean;
  can_edit_workspace: boolean;
}

export const DEFAULT_PERMISSIONS: CustomRolePermissions = {
  can_create_board: false,
  can_invite: false,
  can_delete: false,
  can_manage_automations: false,
  can_manage_integrations: false,
  can_export: false,
  can_manage_members: false,
  can_edit_workspace: false,
};

export interface CustomRole {
  id: string;
  workspace_id: string;
  name: string;
  permissions: CustomRolePermissions;
  created_by: string | null;
  created_at: string | null;
}

export const useCustomRoles = (workspaceId?: string) =>
  useQuery({
    queryKey: ['custom_roles', workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as CustomRole[];
    },
  });

export const useCreateCustomRole = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      permissions,
    }: {
      workspaceId: string;
      name: string;
      permissions: CustomRolePermissions;
    }) => {
      const { data, error } = await supabase
        .from('custom_roles')
        .insert({
          workspace_id: workspaceId,
          name,
          permissions,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_roles'] });
    },
  });
};

export const useUpdateCustomRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      permissions,
    }: {
      id: string;
      name?: string;
      permissions?: CustomRolePermissions;
    }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (permissions !== undefined) updates.permissions = permissions;

      const { error } = await supabase
        .from('custom_roles')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_roles'] });
    },
  });
};

export const useDeleteCustomRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_roles'] });
    },
  });
};
