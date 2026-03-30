import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxCellProps {
  value: boolean | undefined;
  onChange: (val: boolean) => void;
}

const CheckboxCell: React.FC<CheckboxCellProps> = ({ value, onChange }) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Checkbox
        checked={!!value}
        onCheckedChange={(v) => onChange(!!v)}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
    </div>
  );
};

export default CheckboxCell;
