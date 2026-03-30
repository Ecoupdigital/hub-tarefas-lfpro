import React, { useState, useEffect } from 'react';
import { Lock, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

interface PasswordPolicy {
  min_length: 8 | 10 | 12;
  require_uppercase: boolean;
  require_number: boolean;
  require_special_char: boolean;
}

const DEFAULT_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: false,
  require_number: false,
  require_special_char: false,
};

const PasswordPolicyPanel: React.FC = () => {
  const { activeWorkspace } = useApp();
  const workspaceId = activeWorkspace?.id;
  const [policy, setPolicy] = useState<PasswordPolicy>({ ...DEFAULT_POLICY });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('workspaces')
          .select('settings')
          .eq('id', workspaceId)
          .single();
        if (data) {
          const settings = (data as any).settings || {};
          if (settings.password_policy) {
            setPolicy({ ...DEFAULT_POLICY, ...settings.password_policy });
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Read current settings to merge
      const { data: ws } = await supabase
        .from('workspaces')
        .select('settings')
        .eq('id', workspaceId)
        .single();
      const currentSettings = (ws as any)?.settings || {};
      const { error } = await supabase
        .from('workspaces')
        .update({ settings: { ...currentSettings, password_policy: policy } } as any)
        .eq('id', workspaceId);
      if (error) throw error;
      toast.success('Politica de senha salva');
    } catch {
      toast.error('Erro ao salvar politica de senha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-density-cell font-semibold text-foreground">
          Politica de Senha
        </h3>
      </div>

      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-4">
        <div>
          <label className="font-density-tiny text-muted-foreground block mb-2">
            Comprimento minimo
          </label>
          <div className="flex gap-2">
            {([8, 10, 12] as const).map((len) => (
              <button
                key={len}
                onClick={() => setPolicy((p) => ({ ...p, min_length: len }))}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  policy.min_length === len
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/30'
                }`}
              >
                {len} caracteres
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-density-tiny text-muted-foreground block">
            Requisitos adicionais
          </label>

          <label className="flex items-center gap-3 px-4 py-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.require_uppercase}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, require_uppercase: e.target.checked }))
              }
              className="rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-density-cell text-foreground">Letra maiuscula</p>
              <p className="font-density-tiny text-muted-foreground">
                Exigir pelo menos uma letra maiuscula (A-Z)
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 px-4 py-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.require_number}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, require_number: e.target.checked }))
              }
              className="rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-density-cell text-foreground">Numero</p>
              <p className="font-density-tiny text-muted-foreground">
                Exigir pelo menos um numero (0-9)
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 px-4 py-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={policy.require_special_char}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, require_special_char: e.target.checked }))
              }
              className="rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-density-cell text-foreground">Caractere especial</p>
              <p className="font-density-tiny text-muted-foreground">
                Exigir pelo menos um caractere especial (!@#$%...)
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="font-density-tiny text-muted-foreground mb-3">
            Politica atual: Minimo {policy.min_length} caracteres
            {policy.require_uppercase ? ', maiuscula obrigatoria' : ''}
            {policy.require_number ? ', numero obrigatorio' : ''}
            {policy.require_special_char ? ', caractere especial obrigatorio' : ''}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Salvar politica
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordPolicyPanel;
