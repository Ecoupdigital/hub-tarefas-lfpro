import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface LongTextCellProps {
  value: string | undefined;
  onChange: (val: string) => void;
}

const LongTextCell: React.FC<LongTextCellProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value || '');

  return (
    <>
      <button
        onClick={() => { setTemp(value || ''); setOpen(true); }}
        className="w-full h-full flex items-center px-2 font-density-cell text-foreground truncate"
      >
        {value ? (
          <span className="truncate">{value}</span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar texto</DialogTitle>
          </DialogHeader>
          <Textarea
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            rows={6}
            className="text-sm"
            placeholder="Digite o texto..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => { onChange(temp); setOpen(false); }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LongTextCell;
