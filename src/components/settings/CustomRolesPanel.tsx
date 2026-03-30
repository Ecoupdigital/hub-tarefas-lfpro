import React, { useState } from 'react';
import { Shield, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import {
  useCustomRoles,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
  CustomRolePermissions,
  DEFAULT_PERMISSIONS,
} from '@/hooks/useCustomRoles';
import { useApp } from '@/context/AppContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const PERMISSION_LABELS: Record<keyof CustomRolePermissions, string> = {
  can_create_board: 'Criar boards',
  can_invite: 'Convidar membros',
  can_delete: 'Excluir itens',
  can_manage_automations: 'Gerenciar automacoes',
  can_manage_integrations: 'Gerenciar integracoes',
  can_export: 'Exportar dados',
  can_manage_members: 'Gerenciar membros',
  can_edit_workspace: 'Editar workspace',
};

const CustomRolesPanel: React.FC = () => {
  const { activeWorkspace } = useApp();
  const workspaceId = activeWorkspace?.id;
  const { data: roles = [], isLoading } = useCustomRoles(workspaceId);
  const createRole = useCreateCustomRole();
  const updateRole = useUpdateCustomRole();
  const deleteRole = useDeleteCustomRole();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<CustomRolePermissions>({ ...DEFAULT_PERMISSIONS });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setRoleName('');
    setPermissions({ ...DEFAULT_PERMISSIONS });
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!roleName.trim() || !workspaceId) return;
    try {
      await createRole.mutateAsync({
        workspaceId,
        name: roleName.trim(),
        permissions,
      });
      toast.success('Papel criado com sucesso');
      resetForm();
    } catch {
      toast.error('Erro ao criar papel');
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !roleName.trim()) return;
    try {
      await updateRole.mutateAsync({
        id: editingId,
        name: roleName.trim(),
        permissions,
      });
      toast.success('Papel atualizado');
      resetForm();
    } catch {
      toast.error('Erro ao atualizar papel');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRole.mutateAsync(deleteId);
      toast.success('Papel excluido');
      setDeleteId(null);
    } catch {
      toast.error('Erro ao excluir papel');
    }
  };

  const startEdit = (role: any) => {
    setEditingId(role.id);
    setRoleName(role.name);
    setPermissions(role.permissions || { ...DEFAULT_PERMISSIONS });
    setShowCreate(false);
  };

  const togglePermission = (key: keyof CustomRolePermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isEditing = showCreate || editingId;

  if (!workspaceId) {
    return (
      <div className="text-center py-8 text-muted-foreground font-density-cell">
        Selecione um workspace para gerenciar papeis
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-density-cell font-semibold text-foreground">
            Papeis Personalizados
          </h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo papel
          </button>
        )}
      </div>

      {isEditing && (
        <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
          <div>
            <label className="font-density-tiny text-muted-foreground block mb-1">
              Nome do papel
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Ex: Gerente de projeto"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="font-density-tiny text-muted-foreground block mb-2">
              Permissoes
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PERMISSION_LABELS) as Array<keyof CustomRolePermissions>).map(
                (key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={() => togglePermission(key)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-density-cell text-foreground">
                      {PERMISSION_LABELS[key]}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-2">
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={!roleName.trim() || createRole.isPending || updateRole.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createRole.isPending || updateRole.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {editingId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 && !isEditing ? (
        <div className="text-center py-12 text-muted-foreground font-density-cell">
          Nenhum papel personalizado criado
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
            >
              <div>
                <p className="font-density-cell font-medium text-foreground">{role.name}</p>
                <p className="font-density-tiny text-muted-foreground">
                  {Object.entries(role.permissions || {})
                    .filter(([, v]) => v)
                    .map(
                      ([k]) =>
                        PERMISSION_LABELS[k as keyof CustomRolePermissions] || k
                    )
                    .join(', ') || 'Sem permissoes'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(role)}
                  className="p-1.5 rounded-md hover:bg-muted/30 text-muted-foreground transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(role.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir papel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Usuarios com este papel perderao as permissoes
              associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomRolesPanel;
