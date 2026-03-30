import React, { useState, useCallback, useRef } from 'react';
import { Upload, File as FileIcon, Image, FileText, X, Download, Eye, Loader2 } from 'lucide-react';
import { useUploadFile, useDeleteFile, useItemFiles, getFilePublicUrl, type ItemFile } from '@/hooks/useFileUpload';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface FileCellProps {
  value: any;
  itemId: string;
  columnId: string;
  onChange: (v: any) => void;
  onPreview?: (file: ItemFile) => void;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <Image className="w-4 h-4 text-primary" />;
  if (fileType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  return <FileIcon className="w-4 h-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileCell: React.FC<FileCellProps> = ({ value, itemId, columnId, onChange, onPreview }) => {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  const { data: files = [] } = useItemFiles(itemId);

  const columnFiles = files.filter(f => f.column_id === columnId);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesToUpload = Array.from(fileList);

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    for (const file of filesToUpload) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Arquivo muito grande. Máximo: 50MB');
        continue;
      }
      try {
        const uploaded = await uploadFile.mutateAsync({ file, itemId, columnId });
        // Update column_values with file references
        const currentFiles = Array.isArray(value) ? value : [];
        const newFileRef = { id: uploaded.id, name: uploaded.file_name, path: uploaded.storage_path };
        onChange([...currentFiles, newFileRef]);
      } catch (err) {
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
  }, [itemId, columnId, uploadFile, value, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDelete = async (file: ItemFile) => {
    try {
      await deleteFile.mutateAsync({ fileId: file.id, storagePath: file.storage_path, itemId });
      const currentFiles = Array.isArray(value) ? value : [];
      onChange(currentFiles.filter((f: any) => f.id !== file.id));
      toast.success('Arquivo removido');
    } catch {
      toast.error('Erro ao remover arquivo');
    }
  };

  const handleDownload = (file: ItemFile) => {
    const url = getFilePublicUrl(file.storage_path);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isUploading = uploadFile.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full h-full flex items-center justify-center gap-1 font-density-cell text-muted-foreground hover:text-foreground transition-colors px-2">
          {columnFiles.length > 0 ? (
            <span className="flex items-center gap-1 truncate">
              {getFileIcon(columnFiles[0].file_type)}
              <span className="truncate text-foreground">{columnFiles.length} arquivo{columnFiles.length > 1 ? 's' : ''}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground/40">
              <Upload className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <p className="font-density-cell font-medium text-foreground">Arquivos</p>

          {/* Upload zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-density-cell">Enviando...</span>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <Upload className="w-5 h-5 mx-auto mb-1" />
                <p className="font-density-cell">Clique ou arraste arquivos</p>
              </div>
            )}
          </div>

          {/* File list */}
          {columnFiles.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {columnFiles.map(file => {
                const isImage = file.file_type.startsWith('image/');
                return (
                  <div key={file.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors group">
                    {isImage ? (
                      <img
                        src={getFilePublicUrl(file.storage_path)}
                        alt={file.file_name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        {getFileIcon(file.file_type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-density-cell text-foreground truncate">{file.file_name}</p>
                      <p className="font-density-tiny text-muted-foreground">{formatFileSize(file.file_size)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onPreview && (
                        <button onClick={() => { onPreview(file); setOpen(false); }} className="p-1 rounded hover:bg-muted-foreground/10" title="Visualizar">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => handleDownload(file)} className="p-1 rounded hover:bg-muted-foreground/10" title="Baixar">
                        <Download className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(file)} className="p-1 rounded hover:bg-destructive/10" title="Remover">
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FileCell;
