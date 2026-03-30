import React from 'react';
import { Star } from 'lucide-react';

interface RatingCellProps {
  value: number | undefined;
  onChange: (val: number) => void;
}

const RatingCell: React.FC<RatingCellProps> = ({ value = 0, onChange }) => {
  return (
    <div className="w-full h-full flex items-center justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} onClick={() => onChange(value === star ? 0 : star)}
          className="p-0 transition-colors">
          <Star className={`w-3.5 h-3.5 ${star <= value ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
};

export default RatingCell;
