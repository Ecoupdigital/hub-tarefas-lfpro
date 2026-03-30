import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, LayoutGrid, Trash2 } from 'lucide-react';
import { defaultTemplates, BoardTemplate } from '@/data/boardTemplates';
import { useWorkspaceTemplates, useDeleteTemplate } from '@/hooks/useTemplates';
import { toast } from 'sonner';

const CATEGORIES = [
  'Todas',
  'Geral',
  'Gerenciamento',
  'Marketing',
  'Vendas',
  'RH',
  'Desenvolvimento',
  'Customizado',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: BoardTemplate) => void;
  workspaceId: string | null;
}

const TemplateCenter: React.FC<Props> = ({ open, onOpenChange, onSelectTemplate, workspaceId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const { data: dbTemplates = [] } = useWorkspaceTemplates(workspaceId);
  const deleteTemplate = useDeleteTemplate();

  // Merge local templates + DB templates
  const allTemplates = useMemo(() => {
    const dbMapped: BoardTemplate[] = dbTemplates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      category: t.category || 'Customizado',
      icon: t.icon || '📋',
      groups: t.config?.groups || [],
      columns: t.config?.columns || [],
      _isDb: true,
    }));

    return [...defaultTemplates, ...dbMapped];
  }, [dbTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      const matchesSearch =
        !searchTerm.trim() ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        activeCategory === 'Todas' || t.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allTemplates, searchTerm, activeCategory]);

  // Determine which categories actually have templates
  const categoriesWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    allTemplates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [allTemplates]);

  const handleSelect = (template: BoardTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const handleDeleteDbTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate.mutate(id, {
      onSuccess: () => toast.success('Template removido'),
      onError: () => toast.error('Erro ao remover template'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Centro de Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: categories */}
          <div className="w-48 border-r p-4 flex-shrink-0">
            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => {
                const count =
                  cat === 'Todas'
                    ? allTemplates.length
                    : categoriesWithCount[cat] || 0;
                if (cat !== 'Todas' && count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                      activeCategory === cat
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {cat}
                    <span className="ml-1 text-xs opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search bar */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar templates..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => {
                  const isDb = (template as any)._isDb;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelect(template)}
                      className="text-left p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent/30 transition-all group relative"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{template.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {template.description}
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {template.category}
                            </Badge>
                            {template.columns.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {template.columns.length} coluna{template.columns.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {template.groups.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {template.groups.length} grupo{template.groups.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Use template button */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {isDb && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteDbTemplate(template.id, e)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(template);
                          }}
                        >
                          Usar
                        </Button>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum template encontrado</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateCenter;
