import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProfiles } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import type { PagePresenceUser } from './usePagePresence';

interface Props {
  users: PagePresenceUser[];
  /** Quantos avatars mostrar antes de colapsar em "+N". Default 3. */
  maxVisible?: number;
}

interface ProfileLike {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const getInitials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  return parts.map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase();
};

const PagePresenceIndicator: React.FC<Props> = ({ users, maxVisible = 3 }) => {
  const { data: profiles = [] } = useProfiles();
  const { user: me } = useAuth();

  // Excluir o usuario corrente (ele nao precisa ver seu proprio avatar).
  const others = users.filter((u) => u.userId !== me?.id);
  if (others.length === 0) return null;

  const visible = others.slice(0, maxVisible);
  const overflow = others.length - visible.length;

  const findProfile = (userId: string): ProfileLike | undefined =>
    (profiles as ProfileLike[]).find((p) => p.id === userId);

  const getName = (userId: string): string => {
    const p = findProfile(userId);
    return p?.name?.trim() || p?.email || 'Usuario';
  };

  const getAvatar = (userId: string): string | undefined => {
    const p = findProfile(userId);
    return p?.avatar_url ?? undefined;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center -space-x-2">
        {visible.map((u) => (
          <Tooltip key={u.userId}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-primary/40">
                <AvatarImage src={getAvatar(u.userId)} alt={getName(u.userId)} />
                <AvatarFallback className="text-[10px] font-medium">
                  {getInitials(getName(u.userId))}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{getName(u.userId)} esta editando</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-7 w-7 rounded-full bg-muted text-[10px] font-medium flex items-center justify-center border-2 border-background text-muted-foreground"
                aria-label={`+${overflow} outros editando`}
              >
                +{overflow}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {overflow === 1
                  ? '1 outra pessoa editando'
                  : `${overflow} outras pessoas editando`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PagePresenceIndicator;
