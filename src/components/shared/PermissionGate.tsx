import React, { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/board';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  member: 3,
  viewer: 2,
  guest: 1,
};

export const useUserRole = (): { role: UserRole; loading: boolean } => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as UserRole) ?? 'member';
    },
  });

  return {
    role: data ?? 'member',
    loading: isLoading,
  };
};

export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
};

interface PermissionGateProps {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  requiredRole,
  children,
  fallback = null,
}) => {
  const { role, loading } = useUserRole();

  if (loading) return null;

  if (!hasPermission(role, requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
