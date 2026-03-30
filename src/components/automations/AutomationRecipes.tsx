import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Zap, Bell, CalendarDays, Users, Layers, ArrowLeftRight, Clock, Plug, FolderOpen, BarChart3, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAutomationRecipes, type AutomationRecipe } from '@/hooks/useAutomationRecipes';

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  notifications: { label: 'Notificacoes', icon: <Bell className="w-4 h-4" /> },
  status: { label: 'Status', icon: <Zap className="w-4 h-4" /> },
  dates: { label: 'Datas', icon: <CalendarDays className="w-4 h-4" /> },
  people: { label: 'Pessoas', icon: <Users className="w-4 h-4" /> },
  subitems: { label: 'Subitens', icon: <Layers className="w-4 h-4" /> },
  cross_board: { label: 'Cross-Board', icon: <ArrowLeftRight className="w-4 h-4" /> },
  recurring: { label: 'Recorrente', icon: <Clock className="w-4 h-4" /> },
  integrations: { label: 'Integracoes', icon: <Plug className="w-4 h-4" /> },
  organization: { label: 'Organizacao', icon: <FolderOpen className="w-4 h-4" /> },
  progress: { label: 'Progresso', icon: <BarChart3 className="w-4 h-4" /> },
  cleanup: { label: 'Limpeza', icon: <Trash2 className="w-4 h-4" /> },
};

interface AutomationRecipesProps {
  onSelectRecipe: (recipe: AutomationRecipe) => void;
}

const AutomationRecipes: React.FC<AutomationRecipesProps> = ({ onSelectRecipe }) => {
  const { data: recipes = [], isLoading } = useAutomationRecipes();
  const [search, setSearch] = useState('');

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [recipes, search]);

  const groupedRecipes = useMemo(() => {
    const groups = new Map<string, AutomationRecipe[]>();
    filteredRecipes.forEach((recipe) => {
      const existing = groups.get(recipe.category) || [];
      existing.push(recipe);
      groups.set(recipe.category, existing);
    });
    return groups;
  }, [filteredRecipes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="font-density-cell text-muted-foreground">Carregando receitas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="font-density-cell font-medium text-foreground">
          Receitas de automacao
        </span>
        <span className="font-density-badge text-muted-foreground">
          ({recipes.length})
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar receitas..."
          className="h-8 text-xs pl-8"
        />
      </div>

      {/* Recipes grid grouped by category */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {groupedRecipes.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="font-density-cell text-muted-foreground">
              Nenhuma receita encontrada
            </p>
          </div>
        ) : (
          Array.from(groupedRecipes.entries()).map(([category, categoryRecipes]) => {
            const meta = CATEGORY_META[category] || {
              label: category,
              icon: <Zap className="w-4 h-4" />,
            };
            return (
              <div key={category}>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <span className="text-muted-foreground">{meta.icon}</span>
                  <span className="font-density-cell font-semibold text-foreground">
                    {meta.label}
                  </span>
                  <span className="font-density-badge text-muted-foreground">
                    ({categoryRecipes.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => onSelectRecipe(recipe)}
                      className="text-left rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">
                          {recipe.icon || '⚡'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-density-cell font-medium text-foreground group-hover:text-primary truncate transition-colors">
                            {recipe.name}
                          </p>
                          <p className="font-density-badge text-muted-foreground line-clamp-2 mt-0.5">
                            {recipe.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AutomationRecipes;
