import React, { useState } from 'react';
import { Link2, X, Search, ExternalLink } from 'lucide-react';
import {
  useItemConnections,
  useAddConnection,
  useRemoveConnection,
  useConnectedItems,
  useTargetBoardItems,
} from '@/hooks/useItemConnections';
import { useApp } from '@/context/AppContext';

interface ConnectBoardsCellProps {
  value: any;
  onChange: (val: any) => void;
  itemId: string;
  columnId: string;
  settings?: {
    target_board_id?: string;
  };
}

const ConnectBoardsCell: React.FC<ConnectBoardsCellProps> = ({
  itemId,
  columnId,
  settings,
}) => {
  const { setActiveBoardId } = useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const targetBoardId = settings?.target_board_id;

  const { data: connections = [] } = useItemConnections(itemId, columnId);
  const connectedItemIds = connections.map((c) => c.connected_item_id);
  const { data: connectedItems = [] } = useConnectedItems(connectedItemIds);
  const { data: targetItems = [] } = useTargetBoardItems(targetBoardId, search);

  const addConnection = useAddConnection();
  const removeConnection = useRemoveConnection();

  const handleAdd = (connectedItemId: string) => {
    if (connections.some((c) => c.connected_item_id === connectedItemId)) return;
    addConnection.mutate({ itemId, connectedItemId, columnId });
  };

  const handleRemove = (connectionId: string) => {
    removeConnection.mutate({ id: connectionId, itemId, columnId });
  };

  const handleNavigate = (boardId: string) => {
    setActiveBoardId(boardId);
    setOpen(false);
  };

  const availableItems = targetItems.filter(
    (ti) => !connectedItemIds.includes(ti.id)
  );

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-full flex items-center justify-center gap-0.5 px-1 overflow-hidden"
      >
        {connectedItems.length > 0 ? (
          <div className="flex items-center gap-0.5 overflow-hidden">
            {connectedItems.slice(0, 2).map((item) => (
              <span
                key={item.id}
                className="px-1.5 py-0 rounded bg-primary/10 text-primary font-density-badge font-medium truncate max-w-[60px]"
              >
                {item.name}
              </span>
            ))}
            {connectedItems.length > 2 && (
              <span className="font-density-badge text-muted-foreground">
                +{connectedItems.length - 2}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/40 font-density-cell flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            —
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[260px] max-w-[320px] animate-fade-in">
            {/* Connected items */}
            {connectedItems.length > 0 && (
              <div className="mb-2">
                <span className="font-density-badge text-muted-foreground font-medium px-1">
                  Itens conectados
                </span>
                <div className="mt-1 space-y-0.5">
                  {connectedItems.map((item) => {
                    const conn = connections.find(
                      (c) => c.connected_item_id === item.id
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-1 px-1 py-1 rounded hover:bg-muted group/chip"
                      >
                        <span className="flex-1 font-density-cell text-foreground truncate">
                          {item.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(item.board_id);
                          }}
                          className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover/chip:opacity-100 transition-all"
                          title="Ir para o board"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        {conn && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(conn.id);
                            }}
                            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover/chip:opacity-100 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search and add */}
            {targetBoardId ? (
              <>
                <div className="flex items-center gap-1 px-1 py-1 mb-1 border-t border-border">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar itens..."
                    autoFocus
                    className="flex-1 bg-transparent font-density-cell text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto">
                  {availableItems.length > 0 ? (
                    availableItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAdd(item.id)}
                        className="flex items-center w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <span className="font-density-cell text-foreground truncate">
                          {item.name}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-center py-2 font-density-cell text-muted-foreground">
                      {search ? 'Nenhum item encontrado' : 'Nenhum item disponivel'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-center py-2 font-density-cell text-muted-foreground">
                Configure o board de destino nas configuracoes da coluna
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ConnectBoardsCell;
