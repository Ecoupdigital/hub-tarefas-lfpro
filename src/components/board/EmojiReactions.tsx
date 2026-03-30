import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useToggleReaction, type Reaction } from '@/hooks/useReactions';
import { useProfiles } from '@/hooks/useSupabaseData';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

const COMMON_EMOJIS = [
  { emoji: '\u{1F44D}', label: 'Positivo' },
  { emoji: '\u{2764}\u{FE0F}', label: 'Coracao' },
  { emoji: '\u{1F604}', label: 'Feliz' },
  { emoji: '\u{1F389}', label: 'Celebracao' },
  { emoji: '\u{1F914}', label: 'Pensando' },
  { emoji: '\u{1F440}', label: 'Olhando' },
  { emoji: '\u{1F680}', label: 'Foguete' },
  { emoji: '\u{1F4AF}', label: 'Perfeito' },
];

interface EmojiReactionsProps {
  updateId: string;
  reactions: Reaction[];
  currentUserId: string | undefined;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasCurrentUser: boolean;
}

const EmojiReactions: React.FC<EmojiReactionsProps> = ({ updateId, reactions, currentUserId }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const toggleReaction = useToggleReaction();
  const { data: profiles = [] } = useProfiles();

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedReaction>();
    for (const r of reactions) {
      const existing = map.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(r.user_id);
        if (r.user_id === currentUserId) existing.hasCurrentUser = true;
      } else {
        map.set(r.emoji, {
          emoji: r.emoji,
          count: 1,
          userIds: [r.user_id],
          hasCurrentUser: r.user_id === currentUserId,
        });
      }
    }
    return Array.from(map.values());
  }, [reactions, currentUserId]);

  const handleToggle = (emoji: string) => {
    toggleReaction.mutate({ updateId, emoji });
    setPickerOpen(false);
  };

  const getProfileName = (userId: string) =>
    profiles.find(p => p.id === userId)?.name ?? 'Usuario';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1 mt-1.5">
        {grouped.map(g => (
          <Tooltip key={g.emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleToggle(g.emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  g.hasCurrentUser
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                }`}
              >
                <span>{g.emoji}</span>
                <span className="font-medium">{g.count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">
                {g.userIds.map(uid => getProfileName(uid)).join(', ')}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover/reaction:opacity-100"
              title="Adicionar reacao"
            >
              <Plus className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <div className="flex gap-1">
              {COMMON_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => handleToggle(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-lg"
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};

export default EmojiReactions;
