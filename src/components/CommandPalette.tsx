import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, LayoutDashboard, FileText, Plus, Settings, Zap } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SearchResult {
  result_type: string;
  result_id: string;
  result_name: string;
  result_board_id: string | null;
  result_board_name: string | null;
  result_workspace_id: string | null;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setActiveBoardId, setSelectedItem, activeBoard, items } = useApp();

  // Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Custom event: open from TopNavBar or other components
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('lfpro-command-palette', handler);
    return () => window.removeEventListener('lfpro-command-palette', handler);
  }, []);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced search — 150ms per AC 6
  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_all', {
        _query: searchQuery,
      });

      if (error) {
        console.error('search_all error:', error);
        setResults([]);
      } else {
        setResults((data as SearchResult[]) ?? []);
      }
    } catch (err) {
      console.error('search_all exception:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchAll(value);
      }, 150);
    },
    [searchAll],
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelectBoard = useCallback((boardId: string) => {
    setOpen(false);
    setActiveBoardId(boardId);
    navigate(`/board/${boardId}`);
  }, [setOpen, setActiveBoardId, navigate]);

  const handleSelectItem = useCallback((result: SearchResult) => {
    setOpen(false);
    if (result.result_board_id) {
      setActiveBoardId(result.result_board_id);
      navigate(`/board/${result.result_board_id}`);
      // Open the item detail panel after navigation settles
      setTimeout(() => {
        const found = items.find((i) => i.id === result.result_id);
        if (found) {
          setSelectedItem(found);
        }
      }, 400);
    }
  }, [setOpen, setActiveBoardId, navigate, items, setSelectedItem]);

  const handleSelect = useCallback((item: SearchResult) => {
    switch (item.result_type) {
      case 'board':
        handleSelectBoard(item.result_id);
        break;
      case 'item':
        handleSelectItem(item);
        break;
      default:
        setOpen(false);
        break;
    }
  }, [handleSelectBoard, handleSelectItem]);

  // Quick actions — always visible regardless of search query
  const quickActions: QuickAction[] = [
    {
      id: 'create-board',
      label: 'Criar novo board',
      icon: <Plus className="h-4 w-4 shrink-0 text-green-500" />,
      action: () => {
        setOpen(false);
        window.dispatchEvent(new CustomEvent('lfpro-create-board'));
      },
    },
    {
      id: 'create-item',
      label: activeBoard
        ? `Criar item em "${activeBoard.name}"`
        : 'Criar novo item (abra um board primeiro)',
      icon: <FileText className="h-4 w-4 shrink-0 text-blue-500" />,
      action: () => {
        if (!activeBoard) return;
        setOpen(false);
        window.dispatchEvent(new CustomEvent('lfpro-create-item'));
      },
    },
    {
      id: 'settings',
      label: 'Ir para Configurações',
      icon: <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />,
      action: () => {
        setOpen(false);
        navigate('/settings');
      },
    },
  ];

  // Group results by type
  const boards = results.filter((r) => r.result_type === 'board');
  const itemResults = results.filter((r) => r.result_type === 'item');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command
          className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          shouldFilter={false}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Buscar boards, itens ou executar ações..."
              value={query}
              onValueChange={handleQueryChange}
              autoFocus
              className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono font-density-tiny font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <Command.Loading>
                <div className="px-4 py-6 text-center font-density-cell text-muted-foreground">
                  Buscando...
                </div>
              </Command.Loading>
            )}

            {!loading && query.trim() !== '' && results.length === 0 && (
              <Command.Empty className="px-4 py-6 text-center font-density-cell text-muted-foreground">
                Nenhum resultado encontrado.
              </Command.Empty>
            )}

            {/* Boards group */}
            {boards.length > 0 && (
              <Command.Group
                heading="Boards"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {boards.map((item) => (
                  <Command.Item
                    key={`board-${item.result_id}`}
                    value={`board-${item.result_id}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 font-density-cell text-foreground cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.result_name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Items group */}
            {itemResults.length > 0 && (
              <Command.Group
                heading="Itens"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {itemResults.map((item) => (
                  <Command.Item
                    key={`item-${item.result_id}`}
                    value={`item-${item.result_id}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 font-density-cell text-foreground cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.result_name}</span>
                      {item.result_board_name && (
                        <span className="truncate font-density-cell text-muted-foreground">
                          {item.result_board_name}
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick actions — always shown */}
            <Command.Group
              heading="Ações Rápidas"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {quickActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={`action-${action.id}-${action.label}`}
                  onSelect={action.action}
                  disabled={action.id === 'create-item' && !activeBoard}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 font-density-cell text-foreground cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
                >
                  <Zap className="h-4 w-4 shrink-0 text-yellow-500" />
                  <div className="flex items-center gap-2 min-w-0">
                    {action.icon}
                    <span className="truncate">{action.label}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Empty state when no query */}
            {!loading && query.trim() === '' && (
              <div className="px-4 py-3 text-center font-density-cell text-muted-foreground">
                Digite para buscar boards e itens
              </div>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="font-density-cell text-muted-foreground">
              Busca global
            </span>
            <div className="flex items-center gap-1 font-density-cell text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono font-density-tiny">↑↓</kbd>
              <span>navegar</span>
              <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono font-density-tiny">↵</kbd>
              <span>abrir</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
