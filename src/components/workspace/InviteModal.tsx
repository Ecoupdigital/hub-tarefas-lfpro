import React, { useState } from 'react';
import { Mail, UserPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSetBoardPermission, BoardRole } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ open, onOpenChange, boardId }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BoardRole>('member');
  const [loading, setLoading] = useState(false);
  const setPermission = useSetBoardPermission();

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);

    try {
      // Look up user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        // User already exists - add permission directly
        setPermission.mutate(
          { boardId, userId: profile.id, role },
          {
            onSuccess: () => {
              toast.success(`${email} adicionado como ${role}`);
              setEmail('');
              setRole('member');
              onOpenChange(false);
            },
            onError: () => toast.error('Erro ao adicionar membro'),
          }
        );
      } else {
        // User doesn't exist - send invite via Supabase auth
        const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email.trim());
        if (inviteError) {
          // If admin API not available, show message to the user
          toast.error('Usuario nao encontrado. Envie o link de cadastro manualmente.');
        } else {
          toast.success(`Convite enviado para ${email}`);
          setEmail('');
          setRole('member');
          onOpenChange(false);
        }
      }
    } catch (err) {
      toast.error('Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Convidar membro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                className="pl-8 h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite();
                }}
              />
            </div>
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Funcao</label>
            <Select value={role} onValueChange={(val) => setRole(val as BoardRole)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Send button */}
          <button
            onClick={handleInvite}
            disabled={loading || !email.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {loading ? 'Enviando...' : 'Convidar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteModal;
