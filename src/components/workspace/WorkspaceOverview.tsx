import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Plus, Users, Settings, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CreateBoardModal from '@/components/modals/CreateBoardModal';

const WorkspaceOverview: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace, boards } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [createBoardOpen, setCreateBoardOpen] = useState(false);

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Workspace nao encontrado</p>
      </div>
    );
  }

  const workspaceBoards = boards.filter(
    (b: any) => b.workspace_id === activeWorkspace.id && b.state === 'active'
  );

  const filteredBoards = searchQuery.trim()
    ? workspaceBoards.filter((b: any) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : workspaceBoards;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Workspace header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: activeWorkspace.color + '20' }}
            >
              {activeWorkspace.icon || '📁'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{activeWorkspace.name}</h1>
              <p className="font-density-cell text-muted-foreground">
                {workspaceBoards.length} board{workspaceBoards.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Search and actions */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar boards..."
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setCreateBoardOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-density-cell font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Board
          </button>
        </div>

        {/* Board grid */}
        {filteredBoards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBoards.map((board: any) => (
              <Card
                key={board.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className="font-medium text-foreground truncate mb-1">{board.name}</p>
                  {board.description && (
                    <p className="font-density-cell text-muted-foreground line-clamp-2">
                      {board.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add board card */}
            <Card
              className="cursor-pointer border-dashed hover:border-primary/50 transition-colors"
              onClick={() => setCreateBoardOpen(true)}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center min-h-[120px] text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-6 h-6 mb-2" />
                <span className="font-density-cell font-medium">Criar Board</span>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-density-cell mb-4">
              {searchQuery
                ? 'Nenhum board encontrado com essa busca'
                : 'Este workspace ainda nao tem boards'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setCreateBoardOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-density-cell font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar primeiro board
              </button>
            )}
          </div>
        )}
      </div>

      <CreateBoardModal
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        workspaceId={activeWorkspace.id}
      />
    </div>
  );
};

export default WorkspaceOverview;
