import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useApp, BoardView } from '@/context/AppContext';
import { useToggleFavorite, useRenameBoard } from '@/hooks/useCrudMutations';
import { useProfiles } from '@/hooks/useSupabaseData';
import { useBoardViews, useCreateBoardView, useDeleteBoardView } from '@/hooks/useBoardViews';
import { exportBoardToCsv } from '@/utils/exportCsv';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Carregar IntegrationsPanel via lazy loading (AC 8)
const IntegrationsPanel = lazy(() => import('@/components/board/IntegrationsPanel'));
import {
  Search, Filter, ArrowUpDown, UserCircle2, Settings, Table2,
  Kanban, CalendarDays, GanttChart, BarChart3, LayoutGrid, Plus, Star, X, Download, Upload, EyeOff, Eye, ChevronRight, ChevronDown, Save, Bookmark, Zap, Palette, Users, Webhook, FileText, Share2, Maximize, Shield, ClipboardList, ChevronsDownUp, ChevronsUpDown
} from 'lucide-react';
import ViewSelector from './ViewSelector';
import GroupBySelector from './GroupBySelector';
import SavingIndicator from './SavingIndicator';
import FilterBuilder from './FilterBuilder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AutomationList from '@/components/automations/AutomationList';
import ConditionalColorRules from './ConditionalColorRules';
import MemberManager from '@/components/workspace/MemberManager';
import WebhookManager from '@/components/workspace/WebhookManager';
import FormBuilder from '@/components/forms/FormBuilder';
import ShareBoardDialog from '@/components/board/ShareBoardDialog';
import ImportModal from '@/components/import/ImportModal';
import BoardPermissionsPanel from '@/components/board/BoardPermissionsPanel';
import AuditLogModal from '@/components/board/AuditLogModal';
import { toast } from 'sonner';
import { useCreateTemplate } from '@/hooks/useTemplates';
import { useColumns as useDbColumns, useGroups as useDbGroups } from '@/hooks/useSupabaseData';

const BoardHeader: React.FC = () => {
  const {
    activeBoard, activeView, setActiveView,
    searchQuery, setSearchQuery, addFilter, removeFilter, clearFilters,
    sort, setSort, addItemToGroup, isFavorite, hiddenColumns, toggleHiddenColumn, setHiddenColumns,
    workspaces, advancedFilter, setAdvancedFilter, activeFilterCount, users, collapseAllGroups,
  } = useApp();
  const toggleFavorite = useToggleFavorite();
  const renameBoard = useRenameBoard();
  const { data: profiles = [] } = useProfiles();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  // Verificar se o usuario atual e admin de algum workspace
  React.useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin'])
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
      })
      .catch(() => setIsAdmin(false));
  }, [user?.id]);

  // Saved views
  const { data: savedViews = [] } = useBoardViews(activeBoard?.id ?? null);
  const createView = useCreateBoardView();
  const deleteView = useDeleteBoardView();
  const [savingView, setSavingView] = useState(false);
  const [viewName, setViewName] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [colorRulesOpen, setColorRulesOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIcon, setTemplateIcon] = useState('📋');

  const createTemplate = useCreateTemplate();
  const { data: rawColumnsForTemplate = [] } = useDbColumns(activeBoard?.id ?? null);
  const { data: rawGroupsForTemplate = [] } = useDbGroups(activeBoard?.id ?? null);

  const handleSaveAsTemplate = () => {
    if (!activeBoard) return;
    setTemplateName(activeBoard.name);
    setTemplateDescription(activeBoard.description || '');
    setTemplateIcon('📋');
    setSaveTemplateOpen(true);
  };

  const handleConfirmSaveTemplate = () => {
    if (!activeBoard || !templateName.trim()) return;
    const columns = (rawColumnsForTemplate as { title: string; column_type: string; settings?: Record<string, unknown> }[]).map(c => ({
      title: c.title,
      type: c.column_type,
      settings: JSON.parse(JSON.stringify(c.settings || {})),
    }));
    // Incluir até 3 itens de exemplo por grupo para enriquecer o template
    const groups = (rawGroupsForTemplate as { id: string; title: string; color?: string }[]).map(g => {
      const boardGroup = activeBoard.groups.find(ag => ag.id === g.id);
      const groupItems = (boardGroup?.items ?? []) as { name: string }[];
      return {
        title: g.title,
        color: g.color || '#579BFC',
        items: groupItems.slice(0, 3).map(it => ({ name: it.name })),
      };
    });
    createTemplate.mutate(
      {
        name: templateName.trim(),
        description: templateDescription.trim() || `Template baseado em ${activeBoard.name}`,
        category: 'Customizado',
        icon: templateIcon,
        config: { columns, groups },
        workspaceId: activeBoard.workspaceId,
      },
      {
        onSuccess: () => {
          toast.success('Template salvo! Disponivel apenas neste workspace.');
          setSaveTemplateOpen(false);
        },
        onError: () => {
          toast.error('Erro ao salvar template');
        },
      }
    );
  };

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, setSearchQuery]);

  useEffect(() => { if (!searchQuery) setLocalSearch(''); }, [searchQuery]);

  if (!activeBoard) return null;

  const views: { key: BoardView; icon: React.ReactNode; label: string }[] = [
    { key: 'table', icon: <Table2 className="w-3.5 h-3.5" />, label: 'Tabela' },
    { key: 'kanban', icon: <Kanban className="w-3.5 h-3.5" />, label: 'Kanban' },
    { key: 'calendar', icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Calendário' },
    { key: 'timeline', icon: <GanttChart className="w-3.5 h-3.5" />, label: 'Timeline' },
    { key: 'dashboard', icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Dashboard' },
    { key: 'cards', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Cards' },
  ];

  const statusColumns = activeBoard.columns.filter(c => c.type === 'status');
  const favorite = isFavorite(activeBoard.id);

  const handleNewItem = () => {
    if (!newItemName.trim()) return;
    const firstGroup = activeBoard.groups[0];
    if (firstGroup) {
      addItemToGroup(firstGroup.id, newItemName.trim());
      setNewItemName('');
      setAddingItem(false);
    }
  };

  const handleExportCsv = () => {
    exportBoardToCsv(activeBoard.name, activeBoard.groups, activeBoard.columns);
  };

  const VALID_VIEW_TYPES = ['table', 'kanban', 'calendar', 'timeline', 'dashboard'] as const;

  const handleSaveView = () => {
    if (!viewName.trim() || !activeBoard) return;
    const safeViewType = VALID_VIEW_TYPES.includes(activeView as any) ? activeView : 'table';
    createView.mutate({
      boardId: activeBoard.id,
      name: viewName.trim(),
      viewType: safeViewType,
      config: { activeView, sort, hiddenColumns, advancedFilter },
    }, {
      onSuccess: () => {
        setViewName('');
        setSavingView(false);
      },
    });
  };

  const handleApplyView = (view: any) => {
    const config = view.config as any;
    if (config.activeView) setActiveView(config.activeView);
    if (config.sort !== undefined) setSort(config.sort);
    if (config.hiddenColumns) setHiddenColumns(config.hiddenColumns);
    if (config.advancedFilter) setAdvancedFilter(config.advancedFilter);
    // Migrate legacy simple filters to advancedFilter rules
    if (config.filters && Array.isArray(config.filters) && config.filters.length > 0 && !config.advancedFilter) {
      setAdvancedFilter({
        combinator: 'and',
        rules: config.filters.map((f: any) => ({
          id: Math.random().toString(36).slice(2, 10),
          columnId: f.columnId,
          operator: 'contains' as const,
          value: f.value,
        })),
      });
    }
  };

  const workspace = workspaces.find(ws => ws.id === activeBoard.workspaceId);

  return (
    <div className={`bg-board-header border-b border-border px-5 py-2 ${isMobile ? 'pl-14' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {/* Task 2.5: Board title with dropdown chevron */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 rounded hover:bg-muted px-1 py-0.5 transition-colors group">
              <h1 className="monday-h4 font-heading text-foreground truncate">{activeBoard.name}</h1>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => { setRenameName(activeBoard.name); setRenameOpen(true); }}><Settings className="w-3.5 h-3.5 mr-2" /> Renomear board</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}><FileText className="w-3.5 h-3.5 mr-2" /> Descricao do board</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPermissionsOpen(true)}><Shield className="w-3.5 h-3.5 mr-2" /> Configuracoes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={() => toggleFavorite.mutate(activeBoard.id)}
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`p-1 rounded hover:bg-muted transition-colors ${favorite ? 'text-yellow-500' : 'text-muted-foreground'}`}>
          <Star className="w-4 h-4" fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <SavingIndicator />

        {/* Separator */}
        <div className="h-5 w-px bg-border mx-1" />

        {/* View tabs inline with title */}
        <div className="flex items-center">
          {views.map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              className={`relative flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                activeView === v.key
                  ? 'text-foreground after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-t'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {v.icon} {!isMobile && v.label}
            </button>
          ))}
          {!isMobile && <div className="ml-1"><ViewSelector /></div>}
        </div>

        {/* Actions right */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setAutomationsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border font-density-cell text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-[70ms]">
            <Zap className="w-3.5 h-3.5" />
            {!isMobile && <span>Automatizar</span>}
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] px-1 font-density-badge leading-none rounded-full">6</Badge>
          </button>
          <button
            onClick={() => setMembersOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border font-density-cell text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-[70ms]">
            <Users className="w-3.5 h-3.5" />
            {!isMobile && <span>Convidar</span>}
          </button>

          {/* Settings dropdown (moved here) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors" aria-label="Configuracoes do board"><Settings className="w-4 h-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setSavingView(true)}><Save className="w-3.5 h-3.5 mr-2" /> Salvar view</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCsv}><Download className="w-3.5 h-3.5 mr-2" /> Exportar CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)}><Upload className="w-3.5 h-3.5 mr-2" /> Importar dados</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAutomationsOpen(true)}><Zap className="w-3.5 h-3.5 mr-2" /> Automacoes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setColorRulesOpen(true)}><Palette className="w-3.5 h-3.5 mr-2" /> Regras de cor</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMembersOpen(true)}><Users className="w-3.5 h-3.5 mr-2" /> Membros e permissoes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setWebhooksOpen(true)}><Webhook className="w-3.5 h-3.5 mr-2" /> Webhooks</DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setIntegrationsOpen(true)}>
                  <Webhook className="w-3.5 h-3.5 mr-2" /> Integracoes (Slack / Cal)
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFormsOpen(true)}><FileText className="w-3.5 h-3.5 mr-2" /> Formularios</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShareOpen(true)}><Share2 className="w-3.5 h-3.5 mr-2" /> Compartilhar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPermissionsOpen(true)}><Shield className="w-3.5 h-3.5 mr-2" /> Permissoes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveAsTemplate} disabled={createTemplate.isPending}>
                <Bookmark className="w-3.5 h-3.5 mr-2" /> Salvar como Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('lfpro-zen-mode'))}><Maximize className="w-3.5 h-3.5 mr-2" /> Modo foco</DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAuditLogOpen(true)}>
                    <ClipboardList className="w-3.5 h-3.5 mr-2" /> Log de Auditoria
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2 — Toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap border-t border-border pt-2 -mx-5 px-5">
        {/* Task 2.3: Split button "Criar projeto" */}
        {addingItem ? (
          <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-0.5">
            <Input value={newItemName} onChange={e => setNewItemName(e.target.value)}
              placeholder="Nome do item..." className="h-6 w-40 border-0 bg-transparent text-xs focus-visible:ring-0 px-1" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleNewItem(); if (e.key === 'Escape') { setNewItemName(''); setAddingItem(false); } }} />
            <button onClick={() => { setNewItemName(''); setAddingItem(false); }} aria-label="Cancelar adicao de item"><X className="w-3 h-3 text-muted-foreground" /></button>
          </div>
        ) : (
          <div className="flex items-center">
            <button onClick={() => setAddingItem(true)}
              className="flex items-center gap-1 pl-3 pr-2.5 py-1.5 rounded-l font-density-cell bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors duration-[70ms]">
              <Plus className="w-3.5 h-3.5" /> {!isMobile && 'Criar projeto'}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center px-1.5 py-1.5 rounded-r bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors duration-[70ms] border-l border-primary-foreground/20"
                  aria-label="Mais opcoes de criacao">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => setAddingItem(true)}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> Novo item
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <Upload className="w-3.5 h-3.5 mr-2" /> Importar itens
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('lfpro-create-group'))}>
                  <LayoutGrid className="w-3.5 h-3.5 mr-2" /> Novo grupo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {!isMobile && <div className="h-5 w-px bg-border mx-1" />}

        {/* Task 2.4: Search — shows text on desktop */}
        {searchOpen ? (
          <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-0.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <Input value={localSearch} onChange={e => setLocalSearch(e.target.value)}
              placeholder="Buscar itens..." className="h-6 w-40 border-0 bg-transparent text-xs focus-visible:ring-0 px-1" autoFocus />
            <button onClick={() => { setSearchOpen(false); setLocalSearch(''); setSearchQuery(''); }} aria-label="Fechar busca"><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)}
            aria-label="Buscar itens"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded font-density-cell text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-[70ms]">
            <Search className="w-3.5 h-3.5" /> {!isMobile && 'Buscar'}
          </button>
        )}

        {/* Task 2.4: Filter — shows text on desktop */}
        {!isMobile && (
          <Popover>
            <PopoverTrigger asChild>
              <button aria-label="Filtrar itens" className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded font-density-cell transition-colors duration-[70ms] ${
                activeFilterCount > 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
                <span className="relative">
                  <Filter className="w-3.5 h-3.5" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full text-[9px] w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                Filtrar
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1 h-4 min-w-[16px] px-1 font-density-badge leading-none rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-3" align="start">
              <FilterBuilder
                columns={activeBoard.columns}
                filterGroup={advancedFilter}
                onChange={setAdvancedFilter}
                users={users}
              />

              {/* Quick status filters */}
              {statusColumns.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <p className="font-density-tiny text-muted-foreground uppercase font-medium">Filtro rapido por status</p>
                  {statusColumns.map(col => {
                    const labels = col.settings.labels || {};
                    return (
                      <div key={col.id} className="space-y-1">
                        <p className="font-density-tiny text-muted-foreground">{col.title}</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(labels).map(([key, label]) => {
                            const active = advancedFilter.rules.some(r => r.columnId === col.id && String(r.value) === key);
                            return (
                              <button key={key}
                                onClick={() => active ? removeFilter(col.id) : addFilter({ columnId: col.id, value: key })}
                                className={`px-2 py-0.5 rounded font-density-tiny font-medium transition-colors ${active ? 'ring-2 ring-primary' : ''}`}
                                style={{ backgroundColor: label.color, color: '#fff' }}>
                                {label.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="font-density-tiny text-destructive hover:underline mt-2 block">
                  Limpar todos os filtros
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Task 2.4: Sort — shows text on desktop */}
        {!isMobile && (
          <Popover>
            <PopoverTrigger asChild>
              <button aria-label="Ordenar itens" className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-density-cell transition-colors duration-[70ms] ${
                sort ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
                <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3" align="start">
              <div className="space-y-1">
                <p className="font-density-cell font-medium text-foreground mb-2">Ordenar por</p>
                <button onClick={() => setSort(sort?.columnId === 'name' && sort.direction === 'asc' ? { columnId: 'name', direction: 'desc' } : { columnId: 'name', direction: 'asc' })}
                  className={`w-full text-left px-2 py-1 rounded font-density-cell transition-colors ${sort?.columnId === 'name' ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}>
                  Nome {sort?.columnId === 'name' && (sort.direction === 'asc' ? '↑' : '↓')}
                </button>
                {activeBoard.columns.map(col => (
                  <button key={col.id}
                    onClick={() => setSort(sort?.columnId === col.id && sort.direction === 'asc' ? { columnId: col.id, direction: 'desc' } : { columnId: col.id, direction: 'asc' })}
                    className={`w-full text-left px-2 py-1 rounded font-density-cell transition-colors ${sort?.columnId === col.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}>
                    {col.title} {sort?.columnId === col.id && (sort.direction === 'asc' ? '↑' : '↓')}
                  </button>
                ))}
                {sort && <button onClick={() => setSort(null)} className="font-density-tiny text-destructive hover:underline mt-1">Limpar ordenacao</button>}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Task 2.4: Person filter — shows text on desktop */}
        {!isMobile && (
          <Popover>
            <PopoverTrigger asChild>
              <button aria-label="Filtrar por pessoa" className="flex items-center gap-1 px-2.5 py-1.5 rounded font-density-cell text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-[70ms]">
                <UserCircle2 className="w-3.5 h-3.5" /> Pessoa
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <p className="font-density-cell font-medium text-foreground mb-2">Filtrar por pessoa</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {profiles.map(p => {
                  const peopleCols = activeBoard.columns.filter(c => c.type === 'people');
                  const isActive = peopleCols.some(c => advancedFilter.rules.some(r => r.columnId === c.id && String(r.value) === p.id));
                  return (
                    <button key={p.id}
                      onClick={() => {
                        const peopleCol = peopleCols[0];
                        if (!peopleCol) return;
                        isActive ? removeFilter(peopleCol.id) : addFilter({ columnId: peopleCol.id, value: p.id });
                      }}
                      className={`flex items-center w-full gap-2 px-2 py-1.5 rounded-md font-density-cell transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}>
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-density-badge font-bold">
                        {p.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Task 2.4: Hide/Show columns — shows text on desktop */}
        {!isMobile && (
          <Popover>
            <PopoverTrigger asChild>
              <button aria-label="Ocultar ou mostrar colunas" className={`flex items-center gap-1 px-2.5 py-1.5 rounded font-density-cell transition-colors duration-[70ms] ${
                hiddenColumns.length > 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
                <EyeOff className="w-3.5 h-3.5" /> Ocultar {hiddenColumns.length > 0 && `(${hiddenColumns.length})`}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3" align="start">
              <p className="font-density-cell font-medium text-foreground mb-2">Ocultar/mostrar colunas</p>
              <div className="space-y-1">
                {rawColumnsForTemplate.map(col => {
                  const hidden = hiddenColumns.includes(col.id);
                  return (
                    <button key={col.id} onClick={() => toggleHiddenColumn(col.id)}
                      className={`flex items-center w-full gap-2 px-2 py-1 rounded font-density-cell transition-colors ${hidden ? 'text-muted-foreground' : 'text-foreground'} hover:bg-muted`}>
                      {hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {col.title}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Task 2.4: Group By — shows text on desktop */}
        {!isMobile && (
          <GroupBySelector
            groupByColumnId={null}
            onGroupByChange={() => {}}
          />
        )}

        {/* Colapsar / expandir todos os grupos */}
        {!isMobile && activeBoard && (
          <button
            onClick={() => {
              const anyExpanded = activeBoard.groups.some(g => !g.isCollapsed);
              collapseAllGroups(anyExpanded);
            }}
            title={activeBoard.groups.some(g => !g.isCollapsed) ? 'Colapsar todos os grupos' : 'Expandir todos os grupos'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded font-density-cell text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-[70ms]"
          >
            {activeBoard.groups.some(g => !g.isCollapsed)
              ? <ChevronsDownUp className="w-3.5 h-3.5" />
              : <ChevronsUpDown className="w-3.5 h-3.5" />
            }
            <span>Colapsar</span>
          </button>
        )}
      </div>

      {/* Save view inline dialog */}
      {savingView && (
        <div className="flex items-center gap-2 mt-2">
          <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={viewName}
            onChange={e => setViewName(e.target.value)}
            placeholder="Nome da view..."
            className="h-7 w-48 text-xs"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveView();
              if (e.key === 'Escape') { setViewName(''); setSavingView(false); }
            }}
          />
          <button
            onClick={handleSaveView}
            disabled={!viewName.trim() || createView.isPending}
            className="px-2.5 py-1 rounded font-density-cell bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors duration-[70ms] disabled:opacity-50"
          >
            Salvar
          </button>
          <button onClick={() => { setViewName(''); setSavingView(false); }}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Saved view chips */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="font-density-tiny text-muted-foreground mr-1">Views salvas:</span>
          {savedViews.map((sv: any) => (
            <button
              key={sv.id}
              onClick={() => handleApplyView(sv)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted font-density-tiny text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Bookmark className="w-2.5 h-2.5" />
              {sv.name}
              <span
                role="button"
                onClick={e => { e.stopPropagation(); deleteView.mutate(sv.id); }}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active indicators */}
      {(searchQuery || activeFilterCount > 0 || sort) && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted font-density-tiny text-foreground">
              Busca: "{searchQuery}"
              <button onClick={() => { setSearchQuery(''); setLocalSearch(''); setSearchOpen(false); }} className="min-w-6 min-h-6 p-1 inline-flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {advancedFilter.rules.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 font-density-tiny text-primary font-medium">
              {advancedFilter.rules.length} filtro{advancedFilter.rules.length > 1 ? 's' : ''} ativo{advancedFilter.rules.length > 1 ? 's' : ''}
              {advancedFilter.rules.length > 1 && ` (${advancedFilter.combinator === 'and' ? 'E' : 'OU'})`}
              <button onClick={clearFilters} className="min-w-6 min-h-6 p-1 inline-flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {sort && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted font-density-tiny text-foreground">
              Ordenado: {sort.columnId === 'name' ? 'Nome' : activeBoard.columns.find(c => c.id === sort.columnId)?.title} {sort.direction === 'asc' ? '↑' : '↓'}
              <button onClick={() => setSort(null)} className="min-w-6 min-h-6 p-1 inline-flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        boardId={activeBoard.id}
        groups={activeBoard.groups.map(g => ({ id: g.id, title: g.title }))}
        columns={activeBoard.columns}
      />

      {/* Color Rules Dialog */}
      <ConditionalColorRules open={colorRulesOpen} onOpenChange={setColorRulesOpen} />

      {/* Member Manager */}
      <MemberManager open={membersOpen} onOpenChange={setMembersOpen} boardId={activeBoard.id} />

      {/* Webhook Manager */}
      {workspace && <WebhookManager workspaceId={workspace.id} open={webhooksOpen} onOpenChange={setWebhooksOpen} />}

      {/* Forms Dialog */}
      <FormBuilder open={formsOpen} onOpenChange={setFormsOpen} />

      {/* Share Dialog */}
      <ShareBoardDialog open={shareOpen} onOpenChange={setShareOpen} boardId={activeBoard.id} />

      {/* Board Permissions */}
      <BoardPermissionsPanel open={permissionsOpen} onOpenChange={setPermissionsOpen} boardId={activeBoard.id} />

      {/* Audit Log Modal (apenas para admins) */}
      {isAdmin && (
        <AuditLogModal
          open={auditLogOpen}
          onOpenChange={setAuditLogOpen}
          boardId={activeBoard.id}
          columns={activeBoard.columns.map(c => ({ id: c.id, title: c.title, type: c.type }))}
        />
      )}

      {/* Integrations Panel — apenas para admins, carregado via lazy() (AC 1, 8) */}
      {isAdmin && workspace && integrationsOpen && (
        <Suspense fallback={null}>
          <IntegrationsPanel
            open={integrationsOpen}
            onOpenChange={setIntegrationsOpen}
            boardId={activeBoard.id}
            workspaceId={workspace.id}
          />
        </Suspense>
      )}

      {/* Automations Sheet */}
      <Sheet open={automationsOpen} onOpenChange={setAutomationsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Automacoes
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100%-3rem)] overflow-hidden">
            <AutomationList />
          </div>
        </SheetContent>
      </Sheet>

      {/* Rename Board Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear board</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            placeholder="Nome do board..."
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && renameName.trim()) {
                renameBoard.mutate({ id: activeBoard.id, name: renameName.trim() }, {
                  onSuccess: () => { toast.success('Board renomeado'); setRenameOpen(false); },
                  onError: () => toast.error('Erro ao renomear board'),
                });
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button
              disabled={!renameName.trim() || renameBoard.isPending}
              onClick={() => {
                renameBoard.mutate({ id: activeBoard.id, name: renameName.trim() }, {
                  onSuccess: () => { toast.success('Board renomeado'); setRenameOpen(false); },
                  onError: () => toast.error('Erro ao renomear board'),
                });
              }}
            >
              {renameBoard.isPending ? 'Salvando...' : 'Renomear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="monday-h4 flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Salvar como Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div>
                <Label className="monday-text2">Icone</Label>
                <Input
                  value={templateIcon}
                  onChange={e => setTemplateIcon(e.target.value)}
                  className="w-16 text-center text-lg"
                  maxLength={4}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="tpl-name" className="monday-text2">Nome do Template</Label>
                <Input
                  id="tpl-name"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Ex: Gestao de Projetos"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tpl-desc" className="monday-text2">Descricao (opcional)</Label>
              <Input
                id="tpl-desc"
                value={templateDescription}
                onChange={e => setTemplateDescription(e.target.value)}
                placeholder="Descreva para que serve este template..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Este template ficara visivel apenas no workspace atual.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSaveTemplate}
              disabled={!templateName.trim() || createTemplate.isPending}
            >
              {createTemplate.isPending ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardHeader;
