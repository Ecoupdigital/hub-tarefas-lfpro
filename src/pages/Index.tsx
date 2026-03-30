import React, { useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import TopNavBar from '@/components/TopNavBar';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import BoardHeader from '@/components/board/BoardHeader';
import BoardTable from '@/components/board/BoardTable';
import BoardKanban from '@/components/board/BoardKanban';
import Home from '@/pages/Home';
import { useApp, useTab } from '@/context/AppContext';
import { SelectionProvider } from '@/context/SelectionContext';
import { UndoRedoProvider, useUndoRedoContext } from '@/context/UndoRedoContext';
import { useIsMobile } from '@/hooks/use-mobile';
import UndoRedoKeyboardHandler from '@/components/UndoRedoKeyboardHandler';
import ZenMode from '@/components/board/ZenMode';
import TabBridge from '@/components/board/TabBridge';
import TabBar from '@/components/board/TabBar';
import { useBoardViews } from '@/hooks/useBoardViews';
import PermissionGate from '@/components/shared/PermissionGate';

// Limpa historico de undo/redo quando o board ativo muda (AC 4)
const BoardChangeHandler: React.FC = () => {
  const { activeBoardId } = useApp();
  const { clearHistory } = useUndoRedoContext();
  useEffect(() => {
    clearHistory();
  }, [activeBoardId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// Aplica a default view quando o board ativo muda
const DefaultViewApplier: React.FC = () => {
  const { activeBoardId, setActiveView, setSort, setHiddenColumns, setAdvancedFilter } = useApp();
  const { data: savedViews = [] } = useBoardViews(activeBoardId);
  const lastAppliedBoardRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeBoardId || activeBoardId === lastAppliedBoardRef.current) return;
    if (savedViews.length === 0) return;

    const defaultView = savedViews.find((v: any) => v.is_default);
    if (!defaultView) {
      lastAppliedBoardRef.current = activeBoardId;
      return;
    }

    lastAppliedBoardRef.current = activeBoardId;
    const config = defaultView.config as any;
    if (config.activeView) setActiveView(config.activeView);
    if (config.sort !== undefined) setSort(config.sort);
    if (config.hiddenColumns) setHiddenColumns(config.hiddenColumns);
    if (config.advancedFilter) setAdvancedFilter(config.advancedFilter);
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
  }, [activeBoardId, savedViews]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// Lazy-loaded heavy view components
const BoardCalendar = React.lazy(() => import('@/components/board/BoardCalendar'));
const BoardTimeline = React.lazy(() => import('@/components/board/BoardTimeline'));
const BoardDashboard = React.lazy(() => import('@/components/board/BoardDashboard'));
const WorkspaceOverview = React.lazy(() => import('@/components/workspace/WorkspaceOverview'));
const BoardCards = React.lazy(() => import('@/components/board/BoardCards'));
const MyWork = React.lazy(() => import('@/pages/MyWork'));
const TeamWork = React.lazy(() => import('@/pages/TeamWork'));

// Lazy-loaded modal/panel components (only rendered on demand)
const ItemDetailPanel = React.lazy(() => import('@/components/board/ItemDetailPanel'));
const CommandPalette = React.lazy(() => import('@/components/CommandPalette'));
const GlobalSearch = React.lazy(() => import('@/components/GlobalSearch'));

const LAST_BOARD_KEY = 'lfpro-last-board-id';

const ViewFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const SidebarFallback = () => (
  <div className="w-14 border-r border-border flex items-center justify-center">
    <span className="text-xs text-muted-foreground rotate-90 whitespace-nowrap">Sidebar indisponível</span>
  </div>
);

const Index = () => {
  const { selectedItem, activeView, activeBoard, activeBoardId, setActiveBoardId, setActiveWorkspaceId, boards, loading, zenMode, setZenMode } = useApp();
  const { ensureTab, activeTab, tabs: allTabs, closeTab: closeTabFn, switchTab: switchTabFn, hasMultipleTabs: multiTabs, activeTabId: curTabId } = useTab();
  const isMobile = useIsMobile();
  const { boardId, workspaceId } = useParams<{ boardId?: string; workspaceId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMyWorkPage = location.pathname === '/my-work';
  const isTeamWorkPage = location.pathname === '/team-work';

  // URL → Context sync: only reacts to URL param changes (boardId from router)
  useEffect(() => {
    if (isMyWorkPage || isTeamWorkPage) return;

    if (workspaceId) {
      setActiveWorkspaceId(workspaceId);
      setActiveBoardId(null);
    } else if (boardId) {
      // URL changed (sidebar click or direct navigation) → ensure tab exists
      ensureTab(boardId);
      localStorage.setItem(LAST_BOARD_KEY, boardId);
    }
  }, [boardId, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Context → URL sync: when context has board but URL doesn't (onboarding, restore)
  useEffect(() => {
    if (isMyWorkPage || isTeamWorkPage) return;
    if (boardId || workspaceId) return; // URL already has a target
    if (activeBoardId) {
      localStorage.setItem(LAST_BOARD_KEY, activeBoardId);
      navigate(`/board/${activeBoardId}`, { replace: true });
    } else if (!loading) {
      const lastBoardId = localStorage.getItem(LAST_BOARD_KEY);
      if (lastBoardId && boards.some(b => b.id === lastBoardId)) {
        navigate(`/board/${lastBoardId}`, { replace: true });
      }
    }
  }, [activeBoardId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab switch → URL update (when tab changes via TabBar/keyboard, not URL)
  useEffect(() => {
    if (!activeTab || isMyWorkPage || isTeamWorkPage) return;
    if (activeTab.boardId !== boardId) {
      navigate(`/board/${activeTab.boardId}`, { replace: true });
    }
  }, [activeTab?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Zen mode + Tab navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Zen mode
    if (e.key === 'Escape' && zenMode) {
      setZenMode(false);
      return;
    }
    if (e.key === 'F11' || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f')) {
      e.preventDefault();
      if (activeBoard) {
        setZenMode(prev => !prev);
      }
      return;
    }

    // Tab shortcuts (only when multiple tabs)
    if (!multiTabs) return;

    // Ctrl+W — close active tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      if (curTabId) closeTabFn(curTabId);
      return;
    }

    // Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault();
      const currentIdx = allTabs.findIndex(t => t.id === curTabId);
      if (currentIdx === -1) return;
      const direction = e.shiftKey ? -1 : 1;
      const nextIdx = (currentIdx + direction + allTabs.length) % allTabs.length;
      const nextTab = allTabs[nextIdx];
      switchTabFn(nextTab.id);
      navigate(`/board/${nextTab.boardId}`, { replace: true });
      return;
    }
  }, [zenMode, activeBoard, multiTabs, curTabId, allTabs, closeTabFn, switchTabFn, navigate, setZenMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen for zen mode toggle from BoardHeader
  useEffect(() => {
    const handler = () => setZenMode(true);
    window.addEventListener('lfpro-zen-mode', handler);
    return () => window.removeEventListener('lfpro-zen-mode', handler);
  }, []);

  const renderView = () => {
    // My Work page
    if (isMyWorkPage) {
      return (
        <Suspense fallback={<ViewFallback />}>
          <MyWork />
        </Suspense>
      );
    }
    // Team Work page (admin only)
    if (isTeamWorkPage) {
      return (
        <PermissionGate requiredRole="admin" fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
          </div>
        }>
          <Suspense fallback={<ViewFallback />}>
            <TeamWork />
          </Suspense>
        </PermissionGate>
      );
    }
    // Workspace overview mode
    if (workspaceId && !activeBoardId) {
      return (
        <Suspense fallback={<ViewFallback />}>
          <WorkspaceOverview />
        </Suspense>
      );
    }
    if (!activeBoard) {
      // Board selected but data still loading — show spinner, not Home
      if (activeBoardId) return <ViewFallback />;
      return <Home />;
    }
    switch (activeView) {
      case 'kanban':
        return <BoardKanban />;
      case 'calendar':
        return (
          <Suspense fallback={<ViewFallback />}>
            <BoardCalendar />
          </Suspense>
        );
      case 'timeline':
        return (
          <Suspense fallback={<ViewFallback />}>
            <BoardTimeline />
          </Suspense>
        );
      case 'dashboard':
        return (
          <Suspense fallback={<ViewFallback />}>
            <BoardDashboard />
          </Suspense>
        );
      case 'cards':
        return (
          <Suspense fallback={<ViewFallback />}>
            <BoardCards />
          </Suspense>
        );
      default:
        return <BoardTable />;
    }
  };

  // Zen mode overlay
  if (zenMode && activeBoard) {
    return (
      <UndoRedoProvider>
        <SelectionProvider>
          <ZenMode
            boardName={activeBoard.name}
            activeView={activeView}
            onExit={() => setZenMode(false)}
          >
            {renderView()}
          </ZenMode>
        </SelectionProvider>
      </UndoRedoProvider>
    );
  }

  return (
    <UndoRedoProvider>
      <SelectionProvider>
        <TabBridge />
        <BoardChangeHandler />
        <DefaultViewApplier />
        <UndoRedoKeyboardHandler />
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
          <TopNavBar />
          <div className="flex flex-1 overflow-hidden">
            <ErrorBoundary fallback={<SidebarFallback />}>
              <AppSidebar />
            </ErrorBoundary>
            <div className="flex-1 flex flex-col min-w-0">
              {!isMyWorkPage && !isTeamWorkPage && <TabBar />}
              {!isMyWorkPage && !isTeamWorkPage && <BoardHeader />}
              <ErrorBoundary key={activeBoardId ?? 'no-board'}>
                <div className="flex-1 overflow-hidden px-3 sm:px-6 pt-4 pb-4 flex">
                  {renderView()}
                </div>
              </ErrorBoundary>
            </div>
            {selectedItem && activeBoard && (
              <Suspense fallback={<ViewFallback />}>
                {isMobile ? (
                  <div className="fixed inset-0 z-50 bg-card">
                    <ItemDetailPanel />
                  </div>
                ) : (
                  <ItemDetailPanel />
                )}
              </Suspense>
            )}
          </div>
        </div>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
        <Suspense fallback={null}>
          <GlobalSearch />
        </Suspense>
      </SelectionProvider>
    </UndoRedoProvider>
  );
};

export default Index;
