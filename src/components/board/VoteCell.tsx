import React, { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useSupabaseData';

interface VoteCellProps {
  value: string[] | undefined;
  onChange: (val: string[]) => void;
}

const VoteCell: React.FC<VoteCellProps> = ({ value = [], onChange }) => {
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const [showTooltip, setShowTooltip] = useState(false);

  const userId = user?.id;
  const hasVoted = userId ? value.includes(userId) : false;
  const voteCount = value.length;

  const handleToggleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    if (hasVoted) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const voterNames = value
    .map((id) => {
      const profile = profiles.find((p) => p.id === id);
      return profile?.name || 'Usuario';
    })
    .join(', ');

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleToggleVote}
        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
          hasVoted
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-primary' : ''}`} />
        {voteCount > 0 && (
          <span className="font-density-cell font-medium">{voteCount}</span>
        )}
      </button>
      {showTooltip && voteCount > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 bg-popover border border-border rounded-md shadow-lg px-2 py-1 whitespace-nowrap animate-fade-in">
          <span className="font-density-badge text-popover-foreground">{voterNames}</span>
        </div>
      )}
    </div>
  );
};

export default VoteCell;
