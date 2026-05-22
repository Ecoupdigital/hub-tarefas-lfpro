import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * UrlPromptDialog - modal pt-BR para pedir uma URL ao usuario.
 *
 * Usado pelo bloco Bookmark (02-09) apos o slash menu "/bookmark":
 *  1. Usuario seleciona Bookmark no slash menu
 *  2. Dialog abre com input focado
 *  3. Confirmar (Enter ou botao) -> onConfirm(url) e dialog fecha
 *  4. Cancelar/X/click-fora -> reseta input e fecha
 *
 * Auto-prefix "https://" se o usuario digitar so o dominio.
 * Valida que URL e parseable antes de chamar onConfirm.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (url: string) => void;
  title?: string;
  description?: string;
}

const UrlPromptDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onConfirm,
  title = 'Inserir bookmark',
  description = 'Cole a URL do link que voce quer transformar em card com preview.',
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUrl('');
    setError(null);
  };

  const handleConfirm = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Informe uma URL.');
      return;
    }
    // Auto-prefix https:// se faltar protocolo.
    const finalUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(finalUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('URL deve usar http ou https.');
        return;
      }
    } catch {
      setError('URL invalida.');
      return;
    }
    onConfirm(finalUrl);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://exemplo.com"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
            aria-invalid={!!error}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Inserir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UrlPromptDialog;
