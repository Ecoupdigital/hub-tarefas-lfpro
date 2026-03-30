import React, { useState, useMemo } from 'react';
import { Lock, Link2, ArrowRight, ArrowLeft, X, Plus, Search, AlertTriangle } from 'lucide-react';
import { useDependencies, useCreateDependency, useDeleteDependency, DependencyType, DependencyWithItem } from '@/hooks/useDependencies';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

interface DependencyManagerProps {
  itemId: string;
  itemName: string;
  onNavigateToItem?: (itemId: string) => void;
}

const DependencyManager: React.FC<DependencyManagerProps> = ({ itemId, itemName, onNavigateToItem }) => {
  const { activeBoard } = useApp();
  const { data: deps, isLoading } = useDependencies(itemId);
  const createDep = useCreateDependency();
  const deleteDep = useDeleteDependency();

  const [adding, setAdding] = useState(false);
  const [addType, setAddType] = useState<DependencyType>('blocks');
  const [searchText, setSearchText] = useState('');

  // All items in the board for search
  const allItems = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.groups.flatMap(g =>
      g.items.map(item => ({ id: item.id, name: item.name, groupTitle: g.title }))
    ).filter(i => i.id !== itemId);
  }, [activeBoard, itemId]);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return allItems.slice(0, 10);
    const q = searchText.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allItems, searchText]);

  // Check if this item is blocked
  const isBlocked = (deps?.blockedBy.length ?? 0) > 0;

  const handleAdd = async (targetId: string, targetName: string) => {
    try {
      if (addType === 'blocks') {
        await createDep.mutateAsync({ sourceItemId: itemId, targetItemId: targetId, type: 'blocks' });
      } else if (addType === 'blocked_by') {
        // "Blocked by": the target item blocks this item → target is source, this item is target
        await createDep.mutateAsync({ sourceItemId: targetId, targetItemId: itemId, type: 'blocks' });
      } else if (addType === 'depends_on') {
        await createDep.mutateAsync({ sourceItemId: itemId, targetItemId: targetId, type: 'depends_on' });
      } else {
        await createDep.mutateAsync({ sourceItemId: itemId, targetItemId: targetId, type: 'related' });
      }
      toast.success(`Dependencia adicionada: ${targetName}`);
      setAdding(false);
      setSearchText('');
    } catch {
      // Error toasts are handled by the mutation's onError callback
    }
  };

  const handleDelete = async (depId: string) => {
    try {
      await deleteDep.mutateAsync(depId);
      toast.success('Dependencia removida');
    } catch {
      toast.error('Erro ao remover dependencia');
    }
  };

  const handleNavigate = (depItemId: string) => {
    if (onNavigateToItem) {
      onNavigateToItem(depItemId);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-4">
        <h3 className="font-density-cell font-semibold text-foreground mb-2">Dependencias</h3>
        <div className="font-density-cell text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const totalDeps = (deps?.blocking.length ?? 0) + (deps?.blockedBy.length ?? 0) + (deps?.related.length ?? 0);

  const renderDepItem = (dep: DependencyWithItem, icon: React.ReactNode) => (
    <div key={dep.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 group/dep">
      {icon}
      <button
        onClick={() => handleNavigate(dep.item_id)}
        className="font-density-cell text-foreground flex-1 truncate hover:text-primary hover:underline transition-colors text-left"
      >
        {dep.item_name}
      </button>
      <button
        onClick={() => handleDelete(dep.id)}
        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/dep:opacity-100 transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="font-density-cell font-semibold text-foreground">
            Dependencias ({totalDeps})
          </h3>
          {isBlocked && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-density-badge font-medium">
              <Lock className="w-2.5 h-2.5" /> Bloqueado
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 font-density-tiny text-primary hover:underline"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>

      {/* Blocked alert */}
      {isBlocked && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span className="font-density-tiny text-amber-700 dark:text-amber-400">
            Este item esta bloqueado por {deps!.blockedBy.length} item(s). Resolva as dependencias antes de concluir.
          </span>
        </div>
      )}

      {/* Add dependency form */}
      {adding && (
        <div className="bg-muted/50 rounded-lg p-2 mb-2 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {([
              { key: 'blocks' as DependencyType, label: 'Bloqueia' },
              { key: 'depends_on' as DependencyType, label: 'Depende de' },
              { key: 'blocked_by' as DependencyType, label: 'Bloqueado por' },
              { key: 'related' as DependencyType, label: 'Relacionado' },
            ]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setAddType(opt.key)}
                className={`px-2 py-1 rounded font-density-tiny font-medium transition-colors ${
                  addType === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-background rounded-md px-2 py-1 border border-border">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar item no board..."
              className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-0.5">
            {filteredItems.length === 0 ? (
              <p className="font-density-tiny text-muted-foreground px-1 py-2">Nenhum item encontrado</p>
            ) : (
              filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAdd(item.id, item.name)}
                  disabled={createDep.isPending}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded font-density-cell hover:bg-muted transition-colors text-left"
                >
                  <span className="text-foreground truncate flex-1">{item.name}</span>
                  <span className="font-density-badge text-muted-foreground flex-shrink-0">{item.groupTitle}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Blocking section */}
      {(deps?.blocking.length ?? 0) > 0 && (
        <div className="mb-2">
          <p className="font-density-tiny text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Bloqueando ({deps!.blocking.length})
          </p>
          {deps!.blocking.map(dep =>
            renderDepItem(dep, <ArrowRight className="w-3 h-3 text-red-500 flex-shrink-0" />)
          )}
        </div>
      )}

      {/* Blocked by section */}
      {(deps?.blockedBy.length ?? 0) > 0 && (
        <div className="mb-2">
          <p className="font-density-tiny text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Bloqueado por ({deps!.blockedBy.length})
          </p>
          {deps!.blockedBy.map(dep =>
            renderDepItem(dep, <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />)
          )}
        </div>
      )}

      {/* Related section */}
      {(deps?.related.length ?? 0) > 0 && (
        <div className="mb-2">
          <p className="font-density-tiny text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Relacionado a ({deps!.related.length})
          </p>
          {deps!.related.map(dep =>
            renderDepItem(dep, <Link2 className="w-3 h-3 text-primary flex-shrink-0" />)
          )}
        </div>
      )}

      {totalDeps === 0 && !adding && (
        <p className="font-density-tiny text-muted-foreground">Nenhuma dependencia adicionada.</p>
      )}
    </div>
  );
};

export default DependencyManager;
