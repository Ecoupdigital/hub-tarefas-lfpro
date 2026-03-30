import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layout, Download, Copy, Archive, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useDuplicateBoard } from '@/hooks/useCrudMutations';

// ---- Section wrapper ----
interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Section = ({ title, description, children }: SectionProps) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {children}
  </section>
);

// ---- BoardSettings ----
const BoardSettings = () => {
  const { activeBoard, setActiveBoardId } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const duplicateBoard = useDuplicateBoard();

  const [name, setName] = useState(activeBoard?.name ?? '');
  const [description, setDescription] = useState(activeBoard?.description ?? '');
  const [savingInfo, setSavingInfo] = useState(false);

  // Keep local fields in sync when activeBoard changes
  useEffect(() => {
    setName(activeBoard?.name ?? '');
    setDescription(activeBoard?.description ?? '');
  }, [activeBoard?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Empty state ----
  if (!activeBoard) {
    return (
      <div className="max-w-xl mx-auto py-16 flex flex-col items-center gap-3 text-center">
        <Layout className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-base font-medium text-muted-foreground">
          Selecione um board para configurar
        </p>
        <p className="text-sm text-muted-foreground/70">
          Escolha um board na barra lateral para acessar suas configurações.
        </p>
      </div>
    );
  }

  // ---- Save board info ----
  const handleSaveInfo = async () => {
    if (!name.trim()) {
      toast.error('O nome do board não pode estar vazio.');
      return;
    }
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from('boards')
        .update({ name: name.trim(), description: description.trim() || null })
        .eq('id', activeBoard.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['all-boards'] });
      await queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast.success('Informações do board atualizadas.');
    } catch (err) {
      console.error('Erro ao salvar board:', err);
      toast.error('Não foi possível salvar as informações. Tente novamente.');
    } finally {
      setSavingInfo(false);
    }
  };

  // ---- Export CSV ----
  const handleExportCsv = () => {
    window.dispatchEvent(
      new CustomEvent('lfpro-export-csv', { detail: { boardId: activeBoard.id } })
    );
    toast.info('Exportação CSV iniciada.');
  };

  // ---- Export JSON ----
  const handleExportJson = () => {
    try {
      const payload = {
        id: activeBoard.id,
        name: activeBoard.name,
        description: activeBoard.description,
        groups: activeBoard.groups,
        columns: activeBoard.columns,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${activeBoard.name.replace(/\s+/g, '_')}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Board exportado como JSON.');
    } catch (err) {
      console.error('Erro ao exportar JSON:', err);
      toast.error('Não foi possível exportar o board.');
    }
  };

  // ---- Duplicate board ----
  const handleDuplicate = async () => {
    try {
      await duplicateBoard.mutateAsync(activeBoard.id);
      toast.success(`Board "${activeBoard.name}" duplicado com sucesso.`);
    } catch (err) {
      console.error('Erro ao duplicar board:', err);
      toast.error('Não foi possível duplicar o board.');
    }
  };

  // ---- Archive board ----
  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('boards')
        .update({ state: 'archived' } as Record<string, unknown>)
        .eq('id', activeBoard.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['all-boards'] });
      await queryClient.invalidateQueries({ queryKey: ['boards'] });
      setActiveBoardId(null);
      toast.success(`Board "${activeBoard.name}" arquivado.`);
      navigate('/');
    } catch (err) {
      console.error('Erro ao arquivar board:', err);
      toast.error('Não foi possível arquivar o board.');
    }
  };

  // ---- Delete board ----
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('boards')
        .update({ state: 'deleted' } as Record<string, unknown>)
        .eq('id', activeBoard.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['all-boards'] });
      await queryClient.invalidateQueries({ queryKey: ['boards'] });
      setActiveBoardId(null);
      toast.success(`Board "${activeBoard.name}" excluído.`);
      navigate('/');
    } catch (err) {
      console.error('Erro ao excluir board:', err);
      toast.error('Não foi possível excluir o board.');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">

      {/* ---- Informações ---- */}
      <Section
        title="Informações"
        description="Nome e descrição visíveis para todos os membros."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="board-name" className="text-sm font-medium">
              Nome do board
            </Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu board"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="board-description" className="text-sm font-medium">
              Descrição
              <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste board..."
              rows={3}
              className="resize-none"
            />
          </div>
          <Button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            className="w-full sm:w-auto"
          >
            {savingInfo ? 'Salvando...' : 'Salvar informações'}
          </Button>
        </div>
      </Section>

      <Separator />

      {/* ---- Exportar ---- */}
      <Section
        title="Exportar"
        description="Baixe os dados deste board nos formatos disponíveis."
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJson}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar JSON
          </Button>
        </div>
      </Section>

      <Separator />

      {/* ---- Duplicar ---- */}
      <Section
        title="Duplicar board"
        description="Cria uma cópia completa deste board com grupos e colunas."
      >
        <Button
          variant="outline"
          onClick={handleDuplicate}
          disabled={duplicateBoard.isPending}
          className="flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          {duplicateBoard.isPending ? 'Duplicando...' : 'Duplicar board'}
        </Button>
      </Section>

      <Separator />

      {/* ---- Arquivar ---- */}
      <Section
        title="Arquivar board"
        description="O board ficará oculto, mas pode ser restaurado posteriormente."
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
            >
              <Archive className="w-4 h-4" />
              Arquivar board
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Arquivar board
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja arquivar{' '}
                <strong>&quot;{activeBoard.name}&quot;</strong>?{' '}
                O board será ocultado, mas seus dados serão preservados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchive}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>

      <Separator />

      {/* ---- Excluir ---- */}
      <Section
        title="Excluir board"
        description="Esta ação é irreversível. Todos os dados do board serão permanentemente removidos."
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir board
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Excluir board permanentemente
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir{' '}
                <strong>&quot;{activeBoard.name}&quot;</strong>?{' '}
                Todos os grupos, colunas e itens serão removidos.{' '}
                <strong>Esta ação não pode ser desfeita.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Sim, excluir board
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>
    </div>
  );
};

export default BoardSettings;
