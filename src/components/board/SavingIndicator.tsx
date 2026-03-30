import React, { useState, useEffect } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';

const SavingIndicator: React.FC = () => {
  const mutatingCount = useIsMutating();
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [hadError, setHadError] = useState(false);

  useEffect(() => {
    if (mutatingCount > 0) {
      setStatus('saving');
      setHadError(false);
    } else if (status === 'saving') {
      // Mutation finished — for now we assume success
      // (errors are caught via onError in individual mutations)
      setStatus('idle');
    }
  }, [mutatingCount]);

  // Expose a way to signal errors via a custom event
  useEffect(() => {
    const handleError = () => {
      setStatus('error');
      setHadError(true);
    };
    window.addEventListener('mutation-error', handleError);
    return () => window.removeEventListener('mutation-error', handleError);
  }, []);

  useEffect(() => {
    if (hadError && status === 'error') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setHadError(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hadError, status]);

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 font-density-tiny text-muted-foreground select-none">
        <Loader2 className="w-3 h-3 animate-spin" />
        Salvando...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 font-density-tiny text-red-500 select-none">
        <X className="w-3 h-3" />
        Erro ao salvar
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 font-density-tiny text-muted-foreground select-none">
      <Check className="w-3 h-3 text-green-500" />
      Salvo
    </span>
  );
};

export default SavingIndicator;
