import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSupabaseData';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard, Plus, Star, Clock, FolderOpen } from 'lucide-react';

// Simulated visual preview for a board: colored bars mimicking a table
const BoardPreview: React.FC<{ boardName: string }> = ({ boardName }) => {
  // Deterministic colors based on board name hash
  const colors = ['#5F3FFF', '#00C875', '#FDAB3D', '#FF642E', '#579BFC', '#A25DDC', '#FF5AC4', '#E2445C'];
  const hash = boardName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rowColors = [
    colors[hash % colors.length],
    colors[(hash + 2) % colors.length],
    colors[(hash + 4) % colors.length],
    colors[(hash + 1) % colors.length],
  ];
  const widths = ['65%', '80%', '45%', '70%'];

  return (
    <div className="w-full h-14 bg-muted/60 rounded-md px-2 py-1.5 flex flex-col gap-1 overflow-hidden">
      {rowColors.map((color, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
          <div className="h-1.5 rounded-full bg-current opacity-20 flex-1" style={{ maxWidth: widths[i], backgroundColor: color, opacity: 0.35 }} />
        </div>
      ))}
    </div>
  );
};

const RECENT_BOARDS_KEY = 'lfpro-recent-boards';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getRecentBoardIds = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_BOARDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { boards, workspaces, favorites, loading } = useApp();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const userName = profile?.name || user?.email?.split('@')[0] || 'usuario';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Favorite boards
  const favoriteBoardIds = favorites.map((f: any) => f.board_id);
  const favoriteBoards = boards.filter(b => favoriteBoardIds.includes(b.id));

  // Recent boards (from localStorage or fallback to last 5)
  const recentIds = getRecentBoardIds();
  const recentBoards = recentIds.length > 0
    ? recentIds
        .map(id => boards.find(b => b.id === id))
        .filter(Boolean)
        .slice(0, 5)
    : boards.slice(-5).reverse();

  const getWorkspace = (workspaceId: string) =>
    workspaces.find((ws: any) => ws.id === workspaceId);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header greeting */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aqui esta um resumo dos seus boards.
          </p>
        </div>

        {/* Boards Favoritos */}
        {favoriteBoards.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-500" />
              <h2 className="text-sm font-semibold text-foreground">Boards Favoritos</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {favoriteBoards.map((board: any) => {
                const ws = getWorkspace(board.workspace_id);
                return (
                  <Card
                    key={board.id}
                    className="min-w-[200px] max-w-[240px] cursor-pointer hover:border-primary/50 transition-colors flex-shrink-0"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-foreground truncate">{board.name}</p>
                      {ws && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {ws.icon || '📁'} {ws.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Boards Recentes */}
        {recentBoards.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Boards Recentes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBoards.map((board: any) => {
                const ws = getWorkspace(board.workspace_id);
                return (
                  <Card
                    key={board.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors hover:shadow-md"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    <CardContent className="p-4">
                      {/* Visual preview */}
                      <BoardPreview boardName={board.name} />
                      <div className="mt-3">
                        <p className="text-sm font-medium text-foreground truncate">{board.name}</p>
                        {ws && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {ws.icon || '📁'} {ws.name}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state when no boards */}
        {boards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <LayoutDashboard className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              Nenhum board encontrado. Crie um workspace e board para comecar!
            </p>
          </div>
        )}

        {/* Acesso Rapido */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Acesso Rapido</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Trigger sidebar new board flow - dispatch custom event
                window.dispatchEvent(new CustomEvent('lfpro-create-board'));
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar novo board
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('lfpro-create-workspace'));
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar novo workspace
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
