import React, { useState } from 'react';
import { useBoardShares, useCreateBoardShare, useDeleteBoardShare } from '@/hooks/useBoardShares';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Copy, Trash2, Plus, Link2, Shield, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { hashPassword } from '@/utils/hashUtils';

interface ShareBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

const ShareBoardDialog: React.FC<ShareBoardDialogProps> = ({ open, onOpenChange, boardId }) => {
  const { data: shares = [] } = useBoardShares(boardId);
  const createShare = useCreateBoardShare();
  const deleteShare = useDeleteBoardShare();

  const [showCreate, setShowCreate] = useState(false);
  const [permission, setPermission] = useState('view');
  const [expiration, setExpiration] = useState('never');
  const [password, setPassword] = useState('');

  const handleCreate = async () => {
    let expiresAt: string | null = null;
    if (expiration !== 'never') {
      const now = new Date();
      const hours = expiration === '24h' ? 24 : expiration === '7d' ? 168 : 720;
      now.setHours(now.getHours() + hours);
      expiresAt = now.toISOString();
    }

    let passwordHash: string | null = null;
    if (password.trim()) {
      passwordHash = await hashPassword(password.trim());
    }

    try {
      await createShare.mutateAsync({
        boardId,
        permission,
        expiresAt,
        passwordHash,
      });
      toast.success('Link de compartilhamento criado!');
      setShowCreate(false);
      setPermission('view');
      setExpiration('never');
      setPassword('');
    } catch {
      toast.error('Erro ao criar link');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShare.mutateAsync(id);
      toast.success('Link revogado');
    } catch {
      toast.error('Erro ao revogar link');
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const getPermissionLabel = (perm: string) => {
    switch (perm) {
      case 'view': return 'Visualizar';
      case 'comment': return 'Comentar';
      case 'edit': return 'Editar';
      default: return perm;
    }
  };

  const getExpirationLabel = (expiresAt: string | null) => {
    if (!expiresAt) return 'Nunca expira';
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return 'Expirado';
    return `Expira em ${date.toLocaleDateString('pt-BR')}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Board</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crie links de compartilhamento para permitir que outras pessoas visualizem seu board.
          </p>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              {shares.map((share: any) => {
                const expired = isExpired(share.expires_at);
                return (
                  <div
                    key={share.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border border-border transition-colors ${
                      expired ? 'opacity-50' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-density-cell px-1.5 py-0.5 rounded bg-muted">
                          <Shield className="w-2.5 h-2.5" />
                          {getPermissionLabel(share.permission)}
                        </span>
                        <span className="inline-flex items-center gap-1 font-density-cell px-1.5 py-0.5 rounded bg-muted">
                          <Clock className="w-2.5 h-2.5" />
                          {getExpirationLabel(share.expires_at)}
                        </span>
                        {share.has_password && (
                          <span className="inline-flex items-center gap-1 font-density-cell px-1.5 py-0.5 rounded bg-muted">
                            <Lock className="w-2.5 h-2.5" />
                            Protegido
                          </span>
                        )}
                      </div>
                      <p className="font-density-tiny text-muted-foreground mt-1 truncate">
                        {window.location.origin}/shared/{share.token.slice(0, 12)}...
                      </p>
                    </div>
                    <button
                      onClick={() => copyLink(share.token)}
                      disabled={expired}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                      title="Copiar link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(share.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Revogar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create new share */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar link de compartilhamento
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
              <div>
                <Label>Permissão</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Visualizar</SelectItem>
                    <SelectItem value="comment">Comentar</SelectItem>
                    <SelectItem value="edit">Editar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expiração</Label>
                <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 horas</SelectItem>
                    <SelectItem value="7d">7 dias</SelectItem>
                    <SelectItem value="30d">30 dias</SelectItem>
                    <SelectItem value="never">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Senha (opcional)</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Deixe vazio para sem senha"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => { setShowCreate(false); setPassword(''); }}
                  className="flex-1 px-4 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createShare.isPending}
                  className="flex-1 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
                >
                  Criar link
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareBoardDialog;
