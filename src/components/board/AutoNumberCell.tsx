import React from 'react';

interface AutoNumberCellProps {
  value: number | undefined;
}

const AutoNumberCell: React.FC<AutoNumberCellProps> = ({ value }) => {
  return (
    <div className="w-full h-full flex items-center justify-center font-density-cell text-muted-foreground font-mono">
      {value != null ? `#${value}` : '—'}
    </div>
  );
};

export default AutoNumberCell;
