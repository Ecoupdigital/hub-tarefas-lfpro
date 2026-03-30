import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Clock, FileText, Layout, MessageSquare, X, ArrowRight, Users, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

const RECENT_SEARCHES_KEY = 'lfpro-recent-searches';
const MAX_RECENT = 8;

interface SearchResult {
  type: 'board' | 'item' | 'comment';
  id: string;
  title: string;
  subtitle?: string;
  board_id?: string;
}

type TabType = 'all' | 'boards' | 'updates' | 'files' | 'people';

const TAB_LABELS: { key: TabType; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'boards', label: 'Boards' },
  { key: 'updates', label: 'Atualizacoes' },
  { key: 'files', label: 'Arquivos' },
  { key: 'people', label: 'Pessoas' },
];

const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const navigate = useNavigate();
  const { setActiveBoardId, setSelectedItem, items } = useApp();

  // Load recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Custom event: open from TopNavBar search button
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('lfpro-global-search', handler);
    return () => window.removeEventListener('lfpro-global-search', handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_all', {
          _query: searchTerm.trim(),
        });

        if (error) throw error;

        const mapped: SearchResult[] = (data ?? []).map((r: any) => ({
          type: r.result_type || r.type || 'item',
          id: r.id,
          title: r.title || r.name || '',
          subtitle: r.subtitle || r.description || '',
          board_id: r.board_id,
        }));

        setResults(mapped);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    setOpen(false);

    if (result.type === 'board') {
      navigate(`/board/${result.id}`);
    } else if (result.board_id) {
      navigate(`/board/${result.board_id}`);
      // Try to select the item after navigation
      setTimeout(() => {
        const item = items.find((i: any) => i.id === result.id);
        if (item) {
          setSelectedItem(item);
        }
      }, 500);
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = results.length > 0 ? results : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(list.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(list.length, 1)) % Math.max(list.length, 1));
    } else if (e.key === 'Enter' && list[selectedIndex]) {
      e.preventDefault();
      handleSelect(list[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'board':
        return <Layout className="w-4 h-4 text-primary" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'board':
        return 'Board';
      case 'item':
        return 'Item';
      case 'comment':
        return 'Comentario';
      default:
        return type;
    }
  };

  // Flat index for keyboard navigation
  let flatIndex = 0;

  // Filter results by active tab
  const filteredResults = (() => {
    if (activeTab === 'all') return results;
    if (activeTab === 'boards') return results.filter(r => r.type === 'board');
    if (activeTab === 'updates') return results.filter(r => r.type === 'comment');
    if (activeTab === 'people') return [];
    return results;
  })();

  const filteredBoards = filteredResults.filter((r) => r.type === 'board');
  const filteredItems = filteredResults.filter((r) => r.type === 'item');
  const filteredComments = filteredResults.filter((r) => r.type === 'comment');

  const filteredSections: { title: string; items: SearchResult[] }[] = [];
  if (filteredBoards.length > 0) filteredSections.push({ title: 'Boards', items: filteredBoards });
  if (filteredItems.length > 0) filteredSections.push({ title: 'Itens', items: filteredItems });
  if (filteredComments.length > 0) filteredSections.push({ title: 'Comentarios', items: filteredComments });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0 gap-0 overflow-hidden [&>button]:hidden flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar boards, itens, comentarios..."
            className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-4 border-b flex-shrink-0 overflow-x-auto">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results area */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-2">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* No query - show recent searches */}
            {!query.trim() && !loading && (
              <div className="px-2">
                {recentSearches.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Buscas recentes
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => handleRecentClick(term)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{term}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {recentSearches.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Use <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Ctrl+Shift+F</kbd> para buscar em todo o workspace
                  </p>
                )}
              </div>
            )}

            {/* Results grouped by type */}
            {!loading && query.trim() && filteredSections.length > 0 && (
              <div className="space-y-3">
                {filteredSections.map((section) => (
                  <div key={section.title}>
                    <p className="px-2 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((result) => {
                        const idx = flatIndex++;
                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleSelect(result)}
                            className={`flex items-center gap-3 w-full px-2 py-2 rounded-md text-left transition-colors ${
                              idx === selectedIndex
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {getIcon(result.type)}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase flex-shrink-0 bg-muted px-1.5 py-0.5 rounded">
                              {getTypeLabel(result.type)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {!loading && query.trim() && filteredResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum resultado para "{query}"
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted">↑↓</kbd> navegar
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> selecionar
            </span>
          </div>
          {results.length > 0 && (
            <span>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
