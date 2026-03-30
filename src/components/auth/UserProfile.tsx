import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Lock, Save } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

interface UserProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: nameValue.trim() })
        .eq('id', user?.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { name: nameValue.trim() } });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Nome atualizado');
      setEditingName(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar nome');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso');
      setChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Meu perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Avatar and info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={loading}
                    className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    aria-label="Salvar nome"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNameValue(displayName); setEditingName(true); }}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                >
                  {displayName}
                </button>
              )}
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Change password */}
          <div className="border-t border-border pt-4">
            {changingPassword ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> Alterar senha
                </p>
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar senha'}
                  </button>
                  <button
                    onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}
                    className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setChangingPassword(true)}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Lock className="w-3.5 h-3.5" /> Alterar senha
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;
