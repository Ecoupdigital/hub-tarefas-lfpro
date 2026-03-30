import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  parseFile, detectColumnTypes,
  importItemsInChunks, formatValueForColumn,
  type ParsedData, type ColumnMapping, type DetectedType,
} from '@/utils/importData';
import ColumnMapper from './ColumnMapper';
import { useCreateColumn } from '@/hooks/useCrudMutations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Column } from '@/types/board';
import { toast } from 'sonner';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  groups: { id: string; title: string }[];
  columns: Column[];
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

const TYPE_MAP: Record<DetectedType, string> = {
  text: 'text',
  number: 'number',
  date: 'date',
  email: 'email',
  checkbox: 'checkbox',
};

const ImportModal: React.FC<ImportModalProps> = ({ open, onOpenChange, boardId, groups, columns }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createColumn = useCreateColumn();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [importDone, setImportDone] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importErrors, setImportErrors] = useState<{ row: number; reason: string }[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultGroupId = groups[0]?.id ?? '';

  const reset = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setMappings([]);
    setSelectedGroupId('');
    setImportDone(0);
    setImportTotal(0);
    setImportErrors([]);
    setImportedCount(0);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handleFile = async (f: File) => {
    setFile(f);
    try {
      const data = await parseFile(f);
      if (data.headers.length === 0) {
        toast.error('Arquivo vazio ou formato invalido');
        return;
      }
      setParsedData(data);

      const types = detectColumnTypes(data.headers, data.rows);
      const initialMappings: ColumnMapping[] = data.headers.map((header, i) => {
        const matchedCol = columns.find(
          c => c.title.toLowerCase().trim() === header.toLowerCase().trim()
        );
        return {
          sourceIndex: i,
          sourceHeader: header,
          targetColumnId: matchedCol ? matchedCol.id : '__new__',
          targetType: types[i],
          ignored: false,
        };
      });
      setMappings(initialMappings);
      setSelectedGroupId(defaultGroupId);
      setStep('mapping');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erro ao processar arquivo');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleUpdateMapping = (index: number, targetColumnId: string | null) => {
    setMappings(prev => prev.map((m, i) => {
      if (i !== index) return m;
      if (targetColumnId === null) return { ...m, targetColumnId: null, ignored: true };
      return { ...m, targetColumnId, ignored: false };
    }));
  };

  const handleImport = async () => {
    if (!parsedData || !selectedGroupId || !user?.id) return;
    setStep('importing');
    setImportDone(0);
    setImportTotal(parsedData.rows.length);
    setImportErrors([]);
    setImportedCount(0);

    const activeMappings = mappings.filter(m => !m.ignored);

    // Create any new columns first
    const newColumnMap = new Map<number, string>();
    for (const mapping of activeMappings) {
      if (mapping.targetColumnId === '__new__') {
        try {
          const result = await createColumn.mutateAsync({
            boardId,
            title: mapping.sourceHeader,
            columnType: TYPE_MAP[mapping.targetType] || 'text',
            settings: {},
          });
          newColumnMap.set(mapping.sourceIndex, result.id);
        } catch {
          // Column creation failed — mapping will be skipped during import
        }
      }
    }

    // Resolve final mappings (replace '__new__' with actual IDs)
    const resolvedMappings: ColumnMapping[] = activeMappings.map(m => ({
      ...m,
      targetColumnId: m.targetColumnId === '__new__'
        ? (newColumnMap.get(m.sourceIndex) ?? null)
        : m.targetColumnId,
    }));

    const { successCount, partialCount, errors } = await importItemsInChunks({
      rows: parsedData.rows,
      mappings: resolvedMappings,
      boardId,
      groupId: selectedGroupId,
      userId: user.id,
      supabase,
      onProgress: (done, total) => {
        setImportDone(done);
        setImportTotal(total);
        setImportedCount(done - errors.length);
      },
    });

    // Invalidate React Query cache so the board view updates
    await queryClient.invalidateQueries({ queryKey: ['items', boardId] });

    setImportedCount(successCount);
    setImportErrors(errors);
    setStep('done');

    if (errors.length === 0 && partialCount === 0) {
      toast.success(`${successCount} itens importados com sucesso!`);
    } else if (partialCount > 0) {
      toast.warning(`${successCount} itens importados, ${partialCount} com dados parciais e ${errors.length - partialCount} erros`);
    } else {
      toast.warning(`${successCount} itens importados com ${errors.length} erros`);
    }
  };

  // Preview: first 5 rows with mapped column names
  const activeMappings = mappings.filter(m => !m.ignored);
  const previewHeaders = activeMappings.map((m, i) =>
    i === 0 ? 'Nome do item' : (
      m.targetColumnId === '__new__'
        ? `${m.sourceHeader} (nova)`
        : (columns.find(c => c.id === m.targetColumnId)?.title ?? m.sourceHeader)
    )
  );

  const stepLabels: Partial<Record<Step, string>> = {
    upload: 'Upload',
    mapping: 'Mapeamento',
    preview: 'Visualizar',
    importing: 'Importando',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar dados
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          {(['upload', 'mapping', 'preview', 'importing'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={step === s ? 'text-primary font-medium' : ''}>{stepLabels[s]}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">
              Arraste um arquivo aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Formatos aceitos: .csv, .xlsx, .xls
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            {/* Group selector */}
            {groups.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Grupo destino:</span>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{file?.name}</span>
              <span className="bg-muted px-1.5 py-0.5 rounded">{parsedData?.rows.length} linhas</span>
            </div>
            <p className="text-xs text-muted-foreground">
              A primeira coluna mapeada sera usada como nome do item.
            </p>
            <ColumnMapper
              mappings={mappings}
              boardColumns={columns}
              onUpdateMapping={handleUpdateMapping}
            />
          </div>
        )}

        {/* Step: Preview (mapped data) */}
        {step === 'preview' && parsedData && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Primeiras 5 linhas com o mapeamento aplicado. Confirme para importar {parsedData.rows.length} itens.
            </p>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    {previewHeaders.map((h, i) => (
                      <th key={i} className="px-2 py-1.5 text-left font-medium text-foreground border-r border-border last:border-r-0 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.rows.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-t border-border">
                      {activeMappings.map((mapping, ci) => {
                        const raw = row[mapping.sourceIndex] ?? '';
                        const display = ci === 0
                          ? (raw || `Item ${ri + 1}`)
                          : String(formatValueForColumn(raw, mapping.targetType) ?? '');
                        return (
                          <td key={ci} className="px-2 py-1 text-foreground border-r border-border last:border-r-0 whitespace-nowrap max-w-[200px] truncate">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.rows.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 5 de {parsedData.rows.length} linhas
              </p>
            )}
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-3">Importando dados...</p>
              <Progress value={importTotal > 0 ? (importDone / importTotal) * 100 : 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Importando {importDone}/{importTotal} itens...
              </p>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="space-y-3 py-4">
            <div className="text-center">
              {importErrors.length === 0 ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {importedCount} itens importados com sucesso!
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {importedCount} itens importados com {importErrors.length} erros
                  </p>
                </>
              )}
            </div>
            {importErrors.length > 0 && (
              <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-1">
                {importErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    Linha {err.row}: {err.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2">
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Voltar
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={activeMappings.length === 0}
              >
                Visualizar dados <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Editar mapeamento
              </Button>
              <Button onClick={handleImport}>
                Importar {parsedData?.rows.length ?? 0} itens
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => handleClose(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModal;
