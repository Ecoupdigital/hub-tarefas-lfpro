import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Settings, Users, Shield, Globe, Lock, EyeOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ColorPalette from '@/components/ui/color-palette';
import WorkspaceMemberManager from './WorkspaceMemberManager';

interface WorkspaceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: {
    id: string;
    name: string;
    icon?: string;
    color: string;
    description?: string;
    privacy?: string;
  };
}

const WORKSPACE_ICONS = ['📁', '🚀', '💼', '🎯', '📊', '🏢', '🎨', '⚡', '🔥', '💡', '🌟', '📈'];

const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ open, onOpenChange, workspace }) => {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [icon, setIcon] = useState(workspace.icon || '📁');
  const [color, setColor] = useState(workspace.color);
  const [privacy, setPrivacy] = useState(workspace.privacy || 'open');
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'privacy'>('general');

  const qc = useQueryClient();
  const updateWorkspace = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description || '');
    setIcon(workspace.icon || '📁');
    setColor(workspace.color);
    setPrivacy(workspace.privacy || 'open');
  }, [workspace]);

  const handleSave = async () => {
    try {
      await updateWorkspace.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
      });
      toast.success('Workspace atualizado');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar workspace');
    }
  };

  const tabs = [
    { key: 'general' as const, label: 'Geral', icon: Settings },
    { key: 'members' as const, label: 'Membros', icon: Users },
    { key: 'privacy' as const, label: 'Privacidade', icon: Shield },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuracoes do Workspace
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 font-density-cell font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-4">
            {/* Icon */}
            <div>
              <Label className="font-density-cell">Icone</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {WORKSPACE_ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-colors ${
                      icon === i ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="ws-name" className="font-density-cell">Nome</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome do workspace"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="ws-desc" className="font-density-cell">Descricao</Label>
              <Textarea
                id="ws-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva o proposito deste workspace..."
                rows={3}
              />
            </div>

            {/* Color */}
            <div>
              <Label className="font-density-cell">Cor</Label>
              <div className="mt-1.5">
                <ColorPalette value={color} onChange={setColor} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <WorkspaceMemberManager
            open={true}
            onOpenChange={() => setActiveTab('general')}
            workspaceId={workspace.id}
            embedded
          />
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <p className="font-density-cell text-muted-foreground">
              Controle quem pode ver e acessar este workspace.
            </p>

            <div className="space-y-2">
              {[
                { value: 'open', label: 'Aberto', desc: 'Qualquer membro da organizacao pode acessar', icon: Globe },
                { value: 'closed', label: 'Fechado', desc: 'Apenas membros convidados podem acessar', icon: Lock },
                { value: 'hidden', label: 'Oculto', desc: 'Nao aparece nas buscas, acesso somente por convite', icon: EyeOff },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrivacy(opt.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    privacy === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <opt.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    privacy === opt.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div>
                    <p className="font-density-cell font-medium text-foreground">{opt.label}</p>
                    <p className="font-density-tiny text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceSettings;
