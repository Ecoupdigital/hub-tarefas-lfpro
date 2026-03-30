import React from 'react';
import { Download, X, FileIcon, Calendar, User, HardDrive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getFilePublicUrl, type ItemFile } from '@/hooks/useFileUpload';
import { useProfiles } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FilePreviewProps {
  file: ItemFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FilePreview: React.FC<FilePreviewProps> = ({ file, open, onOpenChange }) => {
  const { data: profiles = [] } = useProfiles();

  if (!file) return null;

  const url = getFilePublicUrl(file.storage_path);
  const isImage = file.file_type.startsWith('image/');
  const isPdf = file.file_type === 'application/pdf';
  const uploaderProfile = profiles.find(p => p.id === file.uploaded_by);
  const uploaderName = uploaderProfile?.name || 'Desconhecido';

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.file_name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{file.file_name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Preview area */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
          {isImage && (
            <img
              src={url}
              alt={file.file_name}
              className="max-w-full max-h-[60vh] object-contain"
            />
          )}
          {isPdf && (
            <iframe
              src={url}
              title={file.file_name}
              className="w-full h-[60vh] border-0 rounded"
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
              <FileIcon className="w-16 h-16" />
              <p className="text-sm">Visualizacao nao disponivel para este tipo de arquivo.</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar arquivo
              </button>
            </div>
          )}
        </div>

        {/* File info */}
        <div className="flex items-center gap-4 pt-3 border-t border-border text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            {formatFileSize(file.file_size)}
          </span>
          <span className="flex items-center gap-1.5">
            <FileIcon className="w-3.5 h-3.5" />
            {file.file_type || 'Desconhecido'}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {uploaderName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(file.created_at), "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
          </span>
          <button
            onClick={handleDownload}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
